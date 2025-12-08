package message

import (
	"github.com/ganeshkantimahanthi/messaging-platform/internal/models"
	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Handler struct {
	service   *Service
	wsManager WSManager
}

type WSManager interface {
	SendToUser(userID string, message interface{}) error
}

func NewHandler(service *Service, wsManager WSManager) *Handler {
	return &Handler{
		service:   service,
		wsManager: wsManager,
	}
}

type SendMessageRequest struct {
	RecipientID string `json:"recipient_id"`
	Content     string `json:"content"`
	Type        string `json:"type"`
}

func (h *Handler) Send(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	// Get or create conversation
	conversation, err := h.service.GetOrCreateConversation(c.Context(), []string{userID, req.RecipientID})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Create message
	senderID, _ := primitive.ObjectIDFromHex(userID)
	recipientID, _ := primitive.ObjectIDFromHex(req.RecipientID)

	message := &models.Message{
		ConversationID: conversation.ID,
		SenderID:       senderID,
		Content:        req.Content,
		Type:           req.Type,
		DeliveryStatus: []models.DeliveryStatus{
			{UserID: recipientID, Status: "sent"},
		},
	}

	if err := h.service.CreateMessage(c.Context(), message); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Try to send via WebSocket
	_ = h.wsManager.SendToUser(req.RecipientID, map[string]interface{}{
		"type":    "new_message",
		"message": message,
	})

	return c.Status(fiber.StatusCreated).JSON(message)
}

func (h *Handler) GetConversations(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	conversations, err := h.service.GetConversations(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(conversations)
}

func (h *Handler) GetMessages(c *fiber.Ctx) error {
	conversationID := c.Params("id")
	limit := int64(50)
	skip := int64(0)

	messages, err := h.service.GetMessages(c.Context(), conversationID, limit, skip)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(messages)
}

type UpdateStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) UpdateStatus(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	messageID := c.Params("id")

	var req UpdateStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if err := h.service.UpdateStatus(c.Context(), messageID, userID, req.Status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"message": "status updated successfully"})
}
