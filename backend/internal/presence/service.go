package presence

import (
	"context"
	"fmt"
	"time"

	"github.com/ganeshkantimahanthi/messaging-platform/internal/models"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/cache"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Service struct {
	db    *database.Database
	cache *cache.Cache
}

func NewService(db *database.Database, cache *cache.Cache) *Service {
	return &Service{
		db:    db,
		cache: cache,
	}
}

type PresenceInfo struct {
	UserID      string    `json:"user_id"`
	Status      string    `json:"status"`
	LastSeen    time.Time `json:"last_seen"`
	Connections []string  `json:"connections"`
}

func (s *Service) SetOnline(ctx context.Context, userID, connectionID string) error {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	// Update database
	_, err = s.db.DB.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"presence.status":       "online",
				"presence.websocket_id": connectionID,
				"updated_at":            time.Now(),
			},
		},
	)
	if err != nil {
		return err
	}

	// Update cache
	cacheKey := fmt.Sprintf("presence:%s", userID)
	presence := &PresenceInfo{
		UserID:      userID,
		Status:      "online",
		LastSeen:    time.Now(),
		Connections: []string{connectionID},
	}
	s.cache.Set(cacheKey, presence)

	return nil
}

func (s *Service) SetOffline(ctx context.Context, userID string) error {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}

	now := time.Now()

	// Update database
	_, err = s.db.DB.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{
			"$set": bson.M{
				"presence.status":       "offline",
				"presence.last_seen":    now,
				"presence.websocket_id": "",
				"updated_at":            now,
			},
		},
	)
	if err != nil {
		return err
	}

	// Update cache
	cacheKey := fmt.Sprintf("presence:%s", userID)
	presence := &PresenceInfo{
		UserID:      userID,
		Status:      "offline",
		LastSeen:    now,
		Connections: []string{},
	}
	s.cache.SetWithTTL(cacheKey, presence, 1*time.Minute)

	return nil
}

func (s *Service) GetPresence(ctx context.Context, userID string) (*PresenceInfo, error) {
	// Check cache first
	cacheKey := fmt.Sprintf("presence:%s", userID)
	if cached, ok := s.cache.Get(cacheKey); ok {
		return cached.(*PresenceInfo), nil
	}

	// Query database
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = s.db.DB.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		return nil, err
	}

	presence := &PresenceInfo{
		UserID:   userID,
		Status:   user.Presence.Status,
		LastSeen: user.Presence.LastSeen,
	}

	// Cache the result
	s.cache.SetWithTTL(cacheKey, presence, 1*time.Minute)

	return presence, nil
}

func (s *Service) GetMultiplePresence(ctx context.Context, userIDs []string) (map[string]*PresenceInfo, error) {
	result := make(map[string]*PresenceInfo)

	// Convert string IDs to ObjectIDs
	ids := make([]primitive.ObjectID, 0, len(userIDs))
	for _, userID := range userIDs {
		id, err := primitive.ObjectIDFromHex(userID)
		if err != nil {
			continue
		}
		ids = append(ids, id)

		// Check cache
		cacheKey := fmt.Sprintf("presence:%s", userID)
		if cached, ok := s.cache.Get(cacheKey); ok {
			result[userID] = cached.(*PresenceInfo)
		}
	}

	// Query database for uncached users
	if len(result) < len(userIDs) {
		cursor, err := s.db.DB.Collection("users").Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
		if err != nil {
			return result, err
		}
		defer cursor.Close(ctx)

		for cursor.Next(ctx) {
			var user models.User
			if err := cursor.Decode(&user); err != nil {
				continue
			}

			userID := user.ID.Hex()
			if _, exists := result[userID]; !exists {
				presence := &PresenceInfo{
					UserID:   userID,
					Status:   user.Presence.Status,
					LastSeen: user.Presence.LastSeen,
				}
				result[userID] = presence

				// Cache it
				cacheKey := fmt.Sprintf("presence:%s", userID)
				s.cache.SetWithTTL(cacheKey, presence, 1*time.Minute)
			}
		}
	}

	return result, nil
}

func (s *Service) IsOnline(ctx context.Context, userID string) (bool, error) {
	presence, err := s.GetPresence(ctx, userID)
	if err != nil {
		return false, err
	}
	return presence.Status == "online", nil
}
