package websocket

import (
	"context"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/ganeshkantimahanthi/messaging-platform/internal/message"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/models"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/presence"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/cache"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/config"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/database"
	"github.com/gofiber/websocket/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Manager struct {
	connections     sync.Map // connectionID -> *Client
	userConnections sync.Map // userID -> []connectionID
	db              *database.Database
	cache           *cache.Cache
	messageService  *message.Service
	presenceService *presence.Service
	cfg             *config.Config
	register        chan *Client
	unregister      chan *Client
	broadcast       chan *BroadcastMessage
}

type Client struct {
	ID            string
	UserID        string
	Conn          *websocket.Conn
	Manager       *Manager
	Send          chan []byte
	LastHeartbeat time.Time
}

type BroadcastMessage struct {
	UserID  string
	Message interface{}
}

type WSMessage struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

func NewManager(db *database.Database, cache *cache.Cache, msgService *message.Service, presService *presence.Service, cfg *config.Config) *Manager {
	return &Manager{
		db:              db,
		cache:           cache,
		messageService:  msgService,
		presenceService: presService,
		cfg:             cfg,
		register:        make(chan *Client),
		unregister:      make(chan *Client),
		broadcast:       make(chan *BroadcastMessage, 256),
	}
}

func (m *Manager) Run() {
	for {
		select {
		case client := <-m.register:
			m.registerClient(client)
		case client := <-m.unregister:
			m.unregisterClient(client)
		case broadcast := <-m.broadcast:
			m.broadcastToUser(broadcast)
		}
	}
}

func (m *Manager) registerClient(client *Client) {
	// Store connection
	m.connections.Store(client.ID, client)

	// Update user connections
	connections, _ := m.userConnections.LoadOrStore(client.UserID, []string{})
	connList := append(connections.([]string), client.ID)
	m.userConnections.Store(client.UserID, connList)

	// Save to database
	ctx := context.Background()
	m.db.DB.Collection("active_connections").InsertOne(ctx, &models.ActiveConnection{
		UserID:         mustObjectID(client.UserID),
		ConnectionID:   client.ID,
		DeviceType:     "web",
		ConnectedAt:    time.Now(),
		LastHeartbeat:  time.Now(),
		ExpiresAt:      time.Now().Add(m.cfg.WSConnectionTimeout),
		ServerInstance: m.cfg.ServerID,
	})

	// Set user online
	m.presenceService.SetOnline(ctx, client.UserID, client.ID)

	log.Printf("Client registered: %s (User: %s)", client.ID, client.UserID)

	// Send queued messages
	go m.sendQueuedMessages(client)
}

func (m *Manager) unregisterClient(client *Client) {
	// Remove connection
	m.connections.Delete(client.ID)

	// Update user connections
	if connections, ok := m.userConnections.Load(client.UserID); ok {
		connList := connections.([]string)
		newList := make([]string, 0, len(connList))
		for _, id := range connList {
			if id != client.ID {
				newList = append(newList, id)
			}
		}

		if len(newList) == 0 {
			m.userConnections.Delete(client.UserID)
			// Set user offline
			ctx := context.Background()
			m.presenceService.SetOffline(ctx, client.UserID)
		} else {
			m.userConnections.Store(client.UserID, newList)
		}
	}

	// Remove from database
	ctx := context.Background()
	m.db.DB.Collection("active_connections").DeleteOne(ctx, bson.M{"connection_id": client.ID})

	close(client.Send)
	log.Printf("Client unregistered: %s (User: %s)", client.ID, client.UserID)
}

func (m *Manager) broadcastToUser(broadcast *BroadcastMessage) {
	if connections, ok := m.userConnections.Load(broadcast.UserID); ok {
		data, err := json.Marshal(broadcast.Message)
		if err != nil {
			return
		}

		for _, connID := range connections.([]string) {
			if client, ok := m.connections.Load(connID); ok {
				select {
				case client.(*Client).Send <- data:
				default:
					// Client buffer full, unregister
					go m.unregisterClient(client.(*Client))
				}
			}
		}
	}
}

func (m *Manager) SendToUser(userID string, message interface{}) error {
	m.broadcast <- &BroadcastMessage{
		UserID:  userID,
		Message: message,
	}
	return nil
}

func (m *Manager) sendQueuedMessages(client *Client) {
	ctx := context.Background()
	messages, err := m.messageService.GetQueuedMessages(ctx, client.UserID, 100)
	if err != nil {
		log.Printf("Error getting queued messages: %v", err)
		return
	}

	for _, msg := range messages {
		data, _ := json.Marshal(map[string]interface{}{
			"type":    "queued_message",
			"message": msg,
		})
		select {
		case client.Send <- data:
		default:
			// Can't send, re-queue
			log.Printf("Failed to send queued message to client %s", client.ID)
		}
	}

	log.Printf("Sent %d queued messages to user %s", len(messages), client.UserID)
}

func (m *Manager) Shutdown() {
	m.connections.Range(func(key, value interface{}) bool {
		client := value.(*Client)
		client.Conn.Close()
		return true
	})
}

func (c *Client) ReadPump() {
	defer func() {
		c.Manager.unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadDeadline(time.Now().Add(c.Manager.cfg.WSConnectionTimeout))
	c.Conn.SetPongHandler(func(string) error {
		c.LastHeartbeat = time.Now()
		c.Conn.SetReadDeadline(time.Now().Add(c.Manager.cfg.WSConnectionTimeout))

		// Update heartbeat in database
		ctx := context.Background()
		c.Manager.db.DB.Collection("active_connections").UpdateOne(
			ctx,
			bson.M{"connection_id": c.ID},
			bson.M{
				"$set": bson.M{
					"last_heartbeat": time.Now(),
					"expires_at":     time.Now().Add(c.Manager.cfg.WSConnectionTimeout),
				},
			},
		)
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		c.handleMessage(message)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(c.Manager.cfg.WSHeartbeatInterval)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) handleMessage(data []byte) {
	var msg WSMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("Error unmarshaling message: %v", err)
		return
	}

	ctx := context.Background()

	switch msg.Type {
	case "send_message":
		c.handleSendMessage(ctx, msg.Data)
	case "typing":
		c.handleTyping(msg.Data)
	case "read_receipt":
		c.handleReadReceipt(ctx, msg.Data)
	default:
		log.Printf("Unknown message type: %s", msg.Type)
	}
}

func (c *Client) handleSendMessage(ctx context.Context, data json.RawMessage) {
	var req struct {
		RecipientID    string `json:"recipient_id"`
		ConversationID string `json:"conversation_id,omitempty"`
		Content        string `json:"content"`
		Type           string `json:"type"`
		TempID         string `json:"temp_id,omitempty"` // Client-side temporary ID
	}

	if err := json.Unmarshal(data, &req); err != nil {
		// Send error ACK
		if req.TempID != "" {
			c.sendErrorAck(req.TempID, "Invalid message format")
		}
		return
	}

	// Get or create conversation
	var conversation *models.Conversation
	var err error

	if req.ConversationID != "" {
		convID, _ := primitive.ObjectIDFromHex(req.ConversationID)
		var conv models.Conversation
		err = c.Manager.db.DB.Collection("conversations").FindOne(ctx, bson.M{"_id": convID}).Decode(&conv)
		if err == nil {
			conversation = &conv
		}
	}

	if conversation == nil {
		conversation, err = c.Manager.messageService.GetOrCreateConversation(ctx, []string{c.UserID, req.RecipientID})
		if err != nil {
			// Send error ACK
			if req.TempID != "" {
				c.sendErrorAck(req.TempID, "Failed to create conversation")
			}
			return
		}
	}

	// Create message
	senderID := mustObjectID(c.UserID)
	recipientID := mustObjectID(req.RecipientID)

	message := &models.Message{
		ConversationID: conversation.ID,
		SenderID:       senderID,
		Content:        req.Content,
		Type:           req.Type,
		DeliveryStatus: []models.DeliveryStatus{
			{UserID: recipientID, Status: "sent", Timestamp: time.Now()},
		},
	}

	if err := c.Manager.messageService.CreateMessage(ctx, message); err != nil {
		// Send error ACK
		if req.TempID != "" {
			c.sendErrorAck(req.TempID, "Failed to save message")
		}
		return
	}

	// Send to recipient (full message)
	c.Manager.SendToUser(req.RecipientID, map[string]interface{}{
		"type":    "new_message",
		"message": message,
	})

	// Update delivery status to "delivered" if recipient is online
	if connections, ok := c.Manager.userConnections.Load(req.RecipientID); ok && len(connections.([]string)) > 0 {
		// Recipient is online, update to delivered
		c.Manager.messageService.UpdateStatus(ctx, message.ID.Hex(), req.RecipientID, "delivered")

		// Notify sender about delivery
		c.Manager.SendToUser(c.UserID, map[string]interface{}{
			"type":       "status_update",
			"message_id": message.ID.Hex(),
			"status":     "delivered",
		})
	}

	// Send lightweight ACK to sender (no full message echo)
	ack, _ := json.Marshal(map[string]interface{}{
		"type":      "message_ack",
		"temp_id":   req.TempID,
		"server_id": message.ID.Hex(),
		"timestamp": message.Timestamp,
		"status":    "sent",
	})
	c.Send <- ack
}

// sendErrorAck sends a lightweight error acknowledgment to the client
func (c *Client) sendErrorAck(tempID string, errorMsg string) {
	ack, _ := json.Marshal(map[string]interface{}{
		"type":    "message_ack",
		"temp_id": tempID,
		"error":   errorMsg,
	})
	c.Send <- ack
}

func (c *Client) handleTyping(data json.RawMessage) {
	var req struct {
		RecipientID string `json:"recipient_id"`
		IsTyping    bool   `json:"is_typing"`
	}

	if err := json.Unmarshal(data, &req); err != nil {
		return
	}

	// Broadcast typing indicator
	c.Manager.SendToUser(req.RecipientID, map[string]interface{}{
		"type":      "typing",
		"user_id":   c.UserID,
		"is_typing": req.IsTyping,
	})
}

func (c *Client) handleReadReceipt(ctx context.Context, data json.RawMessage) {
	var req struct {
		MessageID string `json:"message_id"`
	}

	if err := json.Unmarshal(data, &req); err != nil {
		return
	}

	// Update message status to read
	c.Manager.messageService.UpdateStatus(ctx, req.MessageID, c.UserID, "read")

	// Notify sender about read status
	msgID, _ := primitive.ObjectIDFromHex(req.MessageID)
	var message models.Message
	if err := c.Manager.db.DB.Collection("messages").FindOne(ctx, bson.M{"_id": msgID}).Decode(&message); err == nil {
		c.Manager.SendToUser(message.SenderID.Hex(), map[string]interface{}{
			"type":       "status_update",
			"message_id": req.MessageID,
			"status":     "read",
		})
	}
}

func mustObjectID(id string) primitive.ObjectID {
	objID, _ := primitive.ObjectIDFromHex(id)
	return objID
}
