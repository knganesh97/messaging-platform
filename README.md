# Messaging Platform MVP

A real-time messaging application similar to WhatsApp, built with Go (backend), React + Vite (frontend), and MongoDB (database).

## 🚀 Features

- **User Authentication**: JWT-based authentication with bcrypt password hashing
- **Real-time Messaging**: WebSocket-based bidirectional communication
- **Offline Message Queue**: Messages are queued and delivered when users reconnect
- **Online Presence**: Track user online/offline status with in-memory caching
- **Direct Messaging**: One-to-one conversations
- **Message Delivery Status**: Track sent, delivered, and read receipts
- **Contact Management**: Add and manage contacts
- **Conversation History**: Persistent message storage with pagination

## 🏗️ Architecture

### Backend (Go)
- **Framework**: Fiber (high-performance HTTP framework)
- **WebSocket**: gorilla/websocket for real-time communication
- **Database**: MongoDB with replica set support
- **Caching**: In-memory cache for presence and connection management
- **Authentication**: JWT tokens with configurable expiry

### Frontend (React + Vite)
- **UI Framework**: React 18 with hooks
- **Build Tool**: Vite (10-100x faster than traditional bundlers)
- **Routing**: React Router v6
- **State Management**: Context API
- **WebSocket Client**: Native WebSocket API with auto-reconnection

### Database (MongoDB)
- **Collections**: users, conversations, messages, message_queue, contacts, active_connections
- **Indexes**: Optimized for conversation and message queries
- **TTL Indexes**: Auto-cleanup of stale connections and old queue items
- **Replica Set**: Required for change streams (future scalability)

## 📋 Prerequisites

- Go 1.21 or higher
- Node.js 20 or higher
- MongoDB 7.0 or higher
- Docker & Docker Compose (optional)

## 🛠️ Installation

### Option 1: Local Development

#### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` with your configuration**:
   ```env
   PORT=8080
   MONGODB_URI=mongodb://localhost:27017
   MONGODB_DATABASE=messaging_platform
   JWT_SECRET=your-secret-key-change-this
   CORS_ORIGINS=http://localhost:5173
   ```

4. **Install dependencies**:
   ```bash
   go mod tidy
   ```

5. **Run the server**:
   ```bash
   go run cmd/server/main.go
   ```

#### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open browser**: Navigate to http://localhost:5173

### Option 2: Docker Compose

1. **Create `.env` file in root directory**:
   ```bash
   JWT_SECRET=your-secret-key-here
   ```

2. **Start all services**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8080
   - MongoDB: mongodb://localhost:27017

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "securepassword"
}
```

### User Management

#### Get Current User
```http
GET /api/users/me
Authorization: Bearer <token>
```

#### Search Users
```http
GET /api/users/search?q=john
Authorization: Bearer <token>
```

### Contacts

#### Get Contacts
```http
GET /api/contacts
Authorization: Bearer <token>
```

#### Add Contact
```http
POST /api/contacts
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": "507f1f77bcf86cd799439011"
}
```

### Messages

#### Get Conversations
```http
GET /api/messages/conversations
Authorization: Bearer <token>
```

#### Get Messages
```http
GET /api/messages/conversations/:id
Authorization: Bearer <token>
```

#### Send Message (REST)
```http
POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_id": "507f1f77bcf86cd799439011",
  "content": "Hello!",
  "type": "text"
}
```

### WebSocket

#### Connect
```
ws://localhost:8080/ws?token=<jwt_token>
```

#### Message Format
```json
{
  "type": "send_message",
  "data": {
    "recipient_id": "507f1f77bcf86cd799439011",
    "content": "Hello!",
    "type": "text"
  }
}
```

#### Message Types
- `send_message`: Send a new message
- `typing`: Send typing indicator
- `read_receipt`: Mark message as read
- `new_message`: Receive new message
- `queued_message`: Receive offline queued message
- `message_sent`: ACK for sent message

## 🗄️ Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  username: string,
  email: string,
  phone: string,
  password_hash: string,
  profile_picture: string,
  status_message: string,
  presence: {
    status: "online" | "offline" | "away",
    last_seen: ISODate,
    websocket_id: string
  },
  settings: {
    read_receipts: boolean,
    last_seen_privacy: "everyone" | "contacts" | "none"
  },
  created_at: ISODate,
  updated_at: ISODate
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  conversation_id: ObjectId,
  sender_id: ObjectId,
  content: string,
  type: "text" | "image" | "file",
  timestamp: ISODate,
  status: "sent" | "delivered" | "read",
  delivery_status: [
    {
      user_id: ObjectId,
      status: string,
      timestamp: ISODate
    }
  ]
}
```

## 🔧 Configuration

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `8080` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DATABASE` | Database name | `messaging_platform` |
| `JWT_SECRET` | Secret key for JWT | `change-this-secret` |
| `JWT_EXPIRY` | JWT token expiry | `24h` |
| `CORS_ORIGINS` | Allowed CORS origins | `http://localhost:5173` |
| `WS_HEARTBEAT_INTERVAL` | WebSocket ping interval | `30s` |
| `WS_CONNECTION_TIMEOUT` | WebSocket timeout | `5m` |
| `CACHE_TTL` | In-memory cache TTL | `5m` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8080/api` |
| `VITE_WS_URL` | WebSocket URL | `ws://localhost:8080/ws` |

## 🧪 Testing

### Create Test Users

```bash
# User 1
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"password123"}'

# User 2
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","email":"bob@test.com","password":"password123"}'
```

### Add Contacts

```bash
# Alice adds Bob (replace tokens and IDs)
curl -X POST http://localhost:8080/api/contacts \
  -H "Authorization: Bearer <alice_token>" \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"<bob_id>"}'
```

## 🚀 Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Set `ENVIRONMENT=production`
- [ ] Enable MongoDB authentication
- [ ] Use HTTPS/WSS in production
- [ ] Configure proper CORS origins
- [ ] Set up MongoDB replica set
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Use environment-specific `.env` files

### Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Run in production mode
docker-compose -f docker-compose.prod.yml up -d
```

## 📈 Future Enhancements

### Post-MVP Features
- [ ] OAuth2 authentication (Google, GitHub)
- [ ] Group messaging
- [ ] File/image sharing with media storage
- [ ] Voice/video calls (WebRTC)
- [ ] Message search and full-text indexing
- [ ] Push notifications for offline users
- [ ] Message encryption (E2E)
- [ ] User blocking and reporting
- [ ] Message reactions and replies
- [ ] Profile customization

### Scalability
- [ ] Migrate to PostgreSQL + Redis for higher scale
- [ ] Horizontal scaling with load balancer
- [ ] Message sharding by conversation
- [ ] CDN for static assets and media
- [ ] Microservices architecture
- [ ] Message queue (RabbitMQ/Kafka)
- [ ] Distributed caching (Redis Cluster)

## 🐛 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand({ping: 1})"

# Initialize replica set manually
mongosh --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})'
```

### WebSocket Connection Fails
- Ensure backend is running on correct port
- Check CORS configuration
- Verify JWT token is valid
- Check browser console for errors

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process
kill -9 <PID>
```

## 📄 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using Go, React, and MongoDB**