package database

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Database struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(ctx context.Context, uri, dbName string) (*Database, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(uri)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		return nil, err
	}

	// Ping the database
	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	return &Database{
		Client: client,
		DB:     client.Database(dbName),
	}, nil
}

func (d *Database) Disconnect(ctx context.Context) error {
	return d.Client.Disconnect(ctx)
}

func InitializeIndexes(ctx context.Context, db *Database) error {
	// Users indexes
	usersCollection := db.DB.Collection("users")
	_, err := usersCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "username", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true),
		},
		{
			Keys:    bson.D{{Key: "phone", Value: 1}},
			Options: options.Index().SetUnique(true).SetSparse(true),
		},
		{
			Keys: bson.D{{Key: "presence.status", Value: 1}, {Key: "presence.last_seen", Value: -1}},
		},
	})
	if err != nil {
		return err
	}

	// Conversations indexes
	conversationsCollection := db.DB.Collection("conversations")
	_, err = conversationsCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "participants", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "updated_at", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "participants", Value: 1}, {Key: "updated_at", Value: -1}},
		},
	})
	if err != nil {
		return err
	}

	// Messages indexes
	messagesCollection := db.DB.Collection("messages")
	_, err = messagesCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "conversation_id", Value: 1}, {Key: "timestamp", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "sender_id", Value: 1}, {Key: "timestamp", Value: -1}},
		},
		{
			Keys: bson.D{{Key: "conversation_id", Value: 1}, {Key: "status", Value: 1}},
		},
	})
	if err != nil {
		return err
	}

	// Message queue indexes
	messageQueueCollection := db.DB.Collection("message_queue")
	_, err = messageQueueCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "status", Value: 1}, {Key: "priority", Value: 1}},
		},
		{
			Keys:    bson.D{{Key: "created_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(2592000), // 30 days
		},
	})
	if err != nil {
		return err
	}

	// Contacts indexes
	contactsCollection := db.DB.Collection("contacts")
	_, err = contactsCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "contact_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "user_id", Value: 1}, {Key: "blocked", Value: 1}},
		},
	})
	if err != nil {
		return err
	}

	// Active connections indexes
	activeConnectionsCollection := db.DB.Collection("active_connections")
	_, err = activeConnectionsCollection.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "user_id", Value: 1}},
		},
		{
			Keys:    bson.D{{Key: "connection_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "expires_at", Value: 1}},
			Options: options.Index().SetExpireAfterSeconds(0),
		},
		{
			Keys: bson.D{{Key: "last_heartbeat", Value: 1}},
		},
	})
	if err != nil {
		return err
	}

	return nil
}
