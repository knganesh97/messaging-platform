package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	Username       string             `json:"username" bson:"username"`
	Email          string             `json:"email,omitempty" bson:"email,omitempty"`
	Phone          string             `json:"phone,omitempty" bson:"phone,omitempty"`
	PasswordHash   string             `json:"-" bson:"password_hash"`
	ProfilePicture string             `json:"profile_picture,omitempty" bson:"profile_picture,omitempty"`
	StatusMessage  string             `json:"status_message,omitempty" bson:"status_message,omitempty"`
	Presence       Presence           `json:"presence" bson:"presence"`
	Settings       UserSettings       `json:"settings" bson:"settings"`
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt      time.Time          `json:"updated_at" bson:"updated_at"`
}

type Presence struct {
	Status      string    `json:"status" bson:"status"` // online, offline, away
	LastSeen    time.Time `json:"last_seen" bson:"last_seen"`
	WebSocketID string    `json:"websocket_id,omitempty" bson:"websocket_id,omitempty"`
	DeviceID    string    `json:"device_id,omitempty" bson:"device_id,omitempty"`
}

type UserSettings struct {
	ReadReceipts    bool   `json:"read_receipts" bson:"read_receipts"`
	LastSeenPrivacy string `json:"last_seen_privacy" bson:"last_seen_privacy"` // everyone, contacts, none
}

type Conversation struct {
	ID           primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	Type         string               `json:"type" bson:"type"` // direct, group
	Participants []primitive.ObjectID `json:"participants" bson:"participants"`
	CreatedBy    primitive.ObjectID   `json:"created_by,omitempty" bson:"created_by,omitempty"`
	Name         string               `json:"name,omitempty" bson:"name,omitempty"`
	Description  string               `json:"description,omitempty" bson:"description,omitempty"`
	GroupPicture string               `json:"group_picture,omitempty" bson:"group_picture,omitempty"`
	Admins       []primitive.ObjectID `json:"admins,omitempty" bson:"admins,omitempty"`
	LastMessage  *LastMessage         `json:"last_message,omitempty" bson:"last_message,omitempty"`
	CreatedAt    time.Time            `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time            `json:"updated_at" bson:"updated_at"`
}

type LastMessage struct {
	Content   string             `json:"content" bson:"content"`
	SenderID  primitive.ObjectID `json:"sender_id" bson:"sender_id"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
	Type      string             `json:"type" bson:"type"`
}

type Message struct {
	ID             primitive.ObjectID   `json:"id" bson:"_id,omitempty"`
	ConversationID primitive.ObjectID   `json:"conversation_id" bson:"conversation_id"`
	SenderID       primitive.ObjectID   `json:"sender_id" bson:"sender_id"`
	Content        string               `json:"content" bson:"content"`
	Type           string               `json:"type" bson:"type"` // text, image, file, audio, video
	Media          *Media               `json:"media,omitempty" bson:"media,omitempty"`
	Timestamp      time.Time            `json:"timestamp" bson:"timestamp"`
	Status         string               `json:"status" bson:"status"` // sent, delivered, read
	DeliveryStatus []DeliveryStatus     `json:"delivery_status,omitempty" bson:"delivery_status,omitempty"`
	RepliedTo      primitive.ObjectID   `json:"replied_to,omitempty" bson:"replied_to,omitempty"`
	Forwarded      bool                 `json:"forwarded,omitempty" bson:"forwarded,omitempty"`
	Deleted        bool                 `json:"deleted,omitempty" bson:"deleted,omitempty"`
	DeletedFor     []primitive.ObjectID `json:"deleted_for,omitempty" bson:"deleted_for,omitempty"`
}

type Media struct {
	URL       string `json:"url" bson:"url"`
	Thumbnail string `json:"thumbnail,omitempty" bson:"thumbnail,omitempty"`
	Size      int64  `json:"size" bson:"size"`
	MimeType  string `json:"mime_type" bson:"mime_type"`
}

type DeliveryStatus struct {
	UserID    primitive.ObjectID `json:"user_id" bson:"user_id"`
	Status    string             `json:"status" bson:"status"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
}

type MessageQueue struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"user_id" bson:"user_id"`
	MessageID      primitive.ObjectID `json:"message_id" bson:"message_id"`
	ConversationID primitive.ObjectID `json:"conversation_id" bson:"conversation_id"`
	Priority       int                `json:"priority" bson:"priority"`
	CreatedAt      time.Time          `json:"created_at" bson:"created_at"`
	RetryCount     int                `json:"retry_count" bson:"retry_count"`
	LastRetry      time.Time          `json:"last_retry,omitempty" bson:"last_retry,omitempty"`
	Status         string             `json:"status" bson:"status"` // pending, processing, delivered, failed
}

type Contact struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"user_id" bson:"user_id"`
	ContactID   primitive.ObjectID `json:"contact_id" bson:"contact_id"`
	DisplayName string             `json:"display_name,omitempty" bson:"display_name,omitempty"`
	Blocked     bool               `json:"blocked" bson:"blocked"`
	AddedAt     time.Time          `json:"added_at" bson:"added_at"`
}

type ActiveConnection struct {
	ID             primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID         primitive.ObjectID `json:"user_id" bson:"user_id"`
	ConnectionID   string             `json:"connection_id" bson:"connection_id"`
	DeviceID       string             `json:"device_id,omitempty" bson:"device_id,omitempty"`
	DeviceType     string             `json:"device_type,omitempty" bson:"device_type,omitempty"`
	ConnectedAt    time.Time          `json:"connected_at" bson:"connected_at"`
	LastHeartbeat  time.Time          `json:"last_heartbeat" bson:"last_heartbeat"`
	ServerInstance string             `json:"server_instance,omitempty" bson:"server_instance,omitempty"`
	ExpiresAt      time.Time          `json:"expires_at" bson:"expires_at"`
}
