package user

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

func (s *Service) GetByID(ctx context.Context, userID string) (*models.User, error) {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	var user models.User
	err = s.db.DB.Collection("users").FindOne(ctx, bson.M{"_id": id}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	user.PasswordHash = ""
	return &user, nil
}

func (s *Service) Update(ctx context.Context, userID string, updates map[string]interface{}) error {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	updates["updated_at"] = time.Now()
	delete(updates, "password_hash")
	delete(updates, "_id")

	_, err = s.db.DB.Collection("users").UpdateOne(
		ctx,
		bson.M{"_id": id},
		bson.M{"$set": updates},
	)
	return err
}

func (s *Service) Search(ctx context.Context, query string, limit int64) ([]*models.User, error) {
	filter := bson.M{
		"$or": []bson.M{
			{"username": bson.M{"$regex": query, "$options": "i"}},
			{"email": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	opts := options.Find().SetLimit(limit)
	cursor, err := s.db.DB.Collection("users").Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*models.User
	for cursor.Next(ctx) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		user.PasswordHash = ""
		users = append(users, &user)
	}

	return users, nil
}

func (s *Service) GetContacts(ctx context.Context, userID string) ([]*models.User, error) {
	id, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, errors.New("invalid user ID")
	}

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.D{{Key: "user_id", Value: id}, {Key: "blocked", Value: false}}}},
		{{Key: "$lookup", Value: bson.D{
			{Key: "from", Value: "users"},
			{Key: "localField", Value: "contact_id"},
			{Key: "foreignField", Value: "_id"},
			{Key: "as", Value: "contact"},
		}}},
		{{Key: "$unwind", Value: "$contact"}},
		{{Key: "$replaceRoot", Value: bson.D{{Key: "newRoot", Value: "$contact"}}}},
	}

	cursor, err := s.db.DB.Collection("contacts").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var users []*models.User
	for cursor.Next(ctx) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		user.PasswordHash = ""
		users = append(users, &user)
	}

	return users, nil
}

func (s *Service) AddContact(ctx context.Context, userID, contactID string) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	cid, err := primitive.ObjectIDFromHex(contactID)
	if err != nil {
		return errors.New("invalid contact ID")
	}

	contact := &models.Contact{
		UserID:    uid,
		ContactID: cid,
		Blocked:   false,
		AddedAt:   time.Now(),
	}

	_, err = s.db.DB.Collection("contacts").InsertOne(ctx, contact)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return errors.New("contact already exists")
		}
		return err
	}

	return nil
}

func (s *Service) RemoveContact(ctx context.Context, userID, contactID string) error {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return errors.New("invalid user ID")
	}

	cid, err := primitive.ObjectIDFromHex(contactID)
	if err != nil {
		return errors.New("invalid contact ID")
	}

	_, err = s.db.DB.Collection("contacts").DeleteOne(ctx, bson.M{
		"user_id":    uid,
		"contact_id": cid,
	})

	return err
}
