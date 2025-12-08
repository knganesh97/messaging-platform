package websocket

import (
	"log"

	"github.com/gofiber/websocket/v2"
	"github.com/google/uuid"
)

type Handler struct {
	manager *Manager
}

func NewHandler(manager *Manager) *Handler {
	return &Handler{manager: manager}
}

func (h *Handler) HandleWebSocket(c *websocket.Conn) {
	userID := c.Locals("userID").(string)

	client := &Client{
		ID:      uuid.New().String(),
		UserID:  userID,
		Conn:    c,
		Manager: h.manager,
		Send:    make(chan []byte, 256),
	}

	h.manager.register <- client

	// Start pumps
	go client.WritePump()
	client.ReadPump()

	log.Printf("WebSocket connection closed for user: %s", userID)
}
