// MongoDB initialization script
db = db.getSiblingDB('messaging_platform');

// Create collections
db.createCollection('users');
db.createCollection('conversations');
db.createCollection('messages');
db.createCollection('message_queue');
db.createCollection('contacts');
db.createCollection('active_connections');

print('Collections created successfully');

// Create indexes
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "phone": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "presence.status": 1, "presence.last_seen": -1 });

db.conversations.createIndex({ "participants": 1 });
db.conversations.createIndex({ "updated_at": -1 });
db.conversations.createIndex({ "participants": 1, "updated_at": -1 });

db.messages.createIndex({ "conversation_id": 1, "timestamp": -1 });
db.messages.createIndex({ "sender_id": 1, "timestamp": -1 });
db.messages.createIndex({ "conversation_id": 1, "status": 1 });

db.message_queue.createIndex({ "user_id": 1, "status": 1, "priority": 1 });
db.message_queue.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 });

db.contacts.createIndex({ "user_id": 1, "contact_id": 1 }, { unique: true });
db.contacts.createIndex({ "user_id": 1, "blocked": 1 });

db.active_connections.createIndex({ "user_id": 1 });
db.active_connections.createIndex({ "connection_id": 1 }, { unique: true });
db.active_connections.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.active_connections.createIndex({ "last_heartbeat": 1 });

print('Indexes created successfully');
