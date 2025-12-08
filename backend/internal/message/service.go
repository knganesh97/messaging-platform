package message

import (
	"context"
	"errors"
	"time"

	"github.com/ganeshkantimahanthi/messaging-platform/internal/models"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service struct {
	db *database.Database
}

func NewService(db *database.Database) *Service {
	return &Service{db: db}
}

func (s *Service) CreateMessage(ctx context.Context, msg *models.Message) error {
	msg.Timestamp = time.Now()
	msg.Status = "sent"

	result, err := s.db.DB.Collection("messages").InsertOne(ctx, msg)
	if err != nil {
		return err
	}

	msg.ID = result.InsertedID.(primitive.ObjectID)

	// Update conversation's last message
	_ = s.updateConversationLastMessage(ctx, msg)

	return nil
}

func (s *Service) GetMessages(ctx context.Context, conversationID string, limit int64, skip int64) ([]*models.Message, error) {
	convID, err := primitive.ObjectIDFromHex(conversationID)
	if err != nil {
		return nil, errors.New("invalid conversation ID")
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(limit).
		SetSkip(skip)

	cursor, err := s.db.DB.Collection("messages").Find(
		ctx,
		bson.M{"conversation_id": convID, "deleted": bson.M{"$ne": true}},
		opts,
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messages []*models.Message
	for cursor.Next(ctx) {
		var msg models.Message
		if err := cursor.Decode(&msg); err != nil {
			continue
		}
		messages = append(messages, &msg)
	}

	// Reverse to get chronological order
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	return messages, nil
}

func (s *Service) UpdateStatus(ctx context.Context, messageID, userID, status string) error {
	msgID, err := primitive.ObjectIDFromHex(messageID)
	if err != nil {
		return errors.New("invalid message ID")
	}

	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	_, err = s.db.DB.Collection("messages").UpdateOne(
		ctx,
		bson.M{
			"_id":                     msgID,
			"delivery_status.user_id": uid,
		},
		bson.M{
			"$set": bson.M{
				"delivery_status.$.status":    status,
				"delivery_status.$.timestamp": time.Now(),
			},
		},
	)

	return err
}

func (s *Service) GetOrCreateConversation(ctx context.Context, userIDs []string) (*models.Conversation, error) {
	// Convert string IDs to ObjectIDs
	participants := make([]primitive.ObjectID, 0, len(userIDs))
	for _, id := range userIDs {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return nil, err
		}
		participants = append(participants, objID)
	}

	// Check if conversation exists
	filter := bson.M{
		"type":         "direct",
		"participants": bson.M{"$all": participants, "$size": len(participants)},
	}

	var conversation models.Conversation
	err := s.db.DB.Collection("conversations").FindOne(ctx, filter).Decode(&conversation)
	if err == nil {
		return &conversation, nil
	}

	if err != mongo.ErrNoDocuments {
		return nil, err
	}

	// Create new conversation
	conversation = models.Conversation{
		Type:         "direct",
		Participants: participants,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	result, err := s.db.DB.Collection("conversations").InsertOne(ctx, &conversation)
	if err != nil {
		return nil, err
	}

	conversation.ID = result.InsertedID.(primitive.ObjectID)
	return &conversation, nil
}

func (s *Service) GetConversations(ctx context.Context, userID string) ([]*models.Conversation, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	opts := options.Find().SetSort(bson.D{{Key: "updated_at", Value: -1}})
	cursor, err := s.db.DB.Collection("conversations").Find(
		ctx,
		bson.M{"participants": uid},
		opts,
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var conversations []*models.Conversation
	for cursor.Next(ctx) {
		var conv models.Conversation
		if err := cursor.Decode(&conv); err != nil {
			continue
		}
		conversations = append(conversations, &conv)
	}

	return conversations, nil
}

func (s *Service) QueueOfflineMessage(ctx context.Context, userID string, messageID primitive.ObjectID, conversationID primitive.ObjectID) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	queue := &models.MessageQueue{
		UserID:         uid,
		MessageID:      messageID,
		ConversationID: conversationID,
		Priority:       1,
		Status:         "pending",
		CreatedAt:      time.Now(),
		RetryCount:     0,
	}

	_, err = s.db.DB.Collection("message_queue").InsertOne(ctx, queue)
	return err
}

func (s *Service) GetQueuedMessages(ctx context.Context, userID string, limit int64) ([]*models.Message, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	// Get queued message IDs
	opts := options.Find().
		SetSort(bson.D{{Key: "priority", Value: 1}, {Key: "created_at", Value: 1}}).
		SetLimit(limit)

	cursor, err := s.db.DB.Collection("message_queue").Find(
		ctx,
		bson.M{"user_id": uid, "status": "pending"},
		opts,
	)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var messageIDs []primitive.ObjectID
	var queueIDs []primitive.ObjectID
	for cursor.Next(ctx) {
		var queue models.MessageQueue
		if err := cursor.Decode(&queue); err != nil {
			continue
		}
		messageIDs = append(messageIDs, queue.MessageID)
		queueIDs = append(queueIDs, queue.ID)
	}

	if len(messageIDs) == 0 {
		return []*models.Message{}, nil
	}

	// Get actual messages
	msgCursor, err := s.db.DB.Collection("messages").Find(ctx, bson.M{"_id": bson.M{"$in": messageIDs}})
	if err != nil {
		return nil, err
	}
	defer msgCursor.Close(ctx)

	var messages []*models.Message
	for msgCursor.Next(ctx) {
		var msg models.Message
		if err := msgCursor.Decode(&msg); err != nil {
			continue
		}
		messages = append(messages, &msg)
	}

	// Remove from queue
	_, _ = s.db.DB.Collection("message_queue").DeleteMany(ctx, bson.M{"_id": bson.M{"$in": queueIDs}})

	return messages, nil
}

func (s *Service) updateConversationLastMessage(ctx context.Context, msg *models.Message) error {
	lastMsg := &models.LastMessage{
		Content:   msg.Content,
		SenderID:  msg.SenderID,
		Timestamp: msg.Timestamp,
		Type:      msg.Type,
	}

	_, err := s.db.DB.Collection("conversations").UpdateOne(
		ctx,
		bson.M{"_id": msg.ConversationID},
		bson.M{
			"$set": bson.M{
				"last_message": lastMsg,
				"updated_at":   time.Now(),
			},
		},
	)

	return err
}
