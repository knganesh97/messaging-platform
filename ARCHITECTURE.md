# Messaging Platform Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          React Frontend (Vite)                           │   │
│  │  • Authentication UI (Login/Register)                    │   │
│  │  • Chat Interface (Conversations & Messages)             │   │
│  │  • WebSocket Client (Real-time communication)            │   │
│  │  • Context API (State management)                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                    HTTP/WebSocket
                              │
┌─────────────────────────────────────────────────────────────────┐
│                       Backend Layer (Go)                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Fiber HTTP Server                           │   │
│  │  • REST API Endpoints                                    │   │
│  │  • WebSocket Upgrade Handler                             │   │
│  │  • JWT Authentication Middleware                         │   │
│  │  • CORS Configuration                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Business Logic Services                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ Auth Service │  │ User Service │  │Msg Service   │  │   │
│  │  │ • Register   │  │ • Profile    │  │• Send        │  │   │
│  │  │ • Login      │  │ • Contacts   │  │• Receive     │  │   │
│  │  │ • JWT Gen    │  │ • Search     │  │• Queue       │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐                     │   │
│  │  │Presence Svc  │  │ WebSocket    │                     │   │
│  │  │• Online/Off  │  │ Manager      │                     │   │
│  │  │• Last Seen   │  │• Connections │                     │   │
│  │  │• Cache       │  │• Heartbeat   │                     │   │
│  │  └──────────────┘  └──────────────┘                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Infrastructure Components                     │   │
│  │  ┌──────────────┐  ┌──────────────┐                     │   │
│  │  │ In-Memory    │  │   Database   │                     │   │
│  │  │   Cache      │  │   Client     │                     │   │
│  │  │ • Presence   │  │ • MongoDB    │                     │   │
│  │  │ • Connections│  │   Driver     │                     │   │
│  │  └──────────────┘  └──────────────┘                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                         MongoDB Wire Protocol
                              │
┌─────────────────────────────────────────────────────────────────┐
│                      Database Layer                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            MongoDB 7.0 (Replica Set)                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │ users        │  │conversations │  │  messages    │  │   │
│  │  │ • profile    │  │ • participants│  │ • content    │  │   │
│  │  │ • presence   │  │ • last_msg   │  │ • status     │  │   │
│  │  │ • settings   │  │ • metadata   │  │ • delivery   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │                                                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │message_queue │  │  contacts    │  │active_conn   │  │   │
│  │  │ • offline msg│  │ • user_id    │  │• websocket_id│  │   │
│  │  │ • priority   │  │ • contact_id │  │• heartbeat   │  │   │
│  │  │ • retry      │  │ • blocked    │  │• TTL index   │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication Flow
```
Client                Backend                MongoDB
  │                     │                      │
  │──Register/Login───>│                      │
  │                     │──Query User──────>  │
  │                     │<─User Data────────  │
  │                     │──Hash Password───>  │
  │                     │──Generate JWT─────> │
  │<──Token + User─────│                      │
  │                     │                      │
```

### 2. Real-time Message Flow
```
Sender              WebSocket Manager         Receiver          MongoDB
  │                        │                      │                │
  │──Send Message────────>│                      │                │
  │                        │──Store Message──────────────────────>│
  │                        │                      │                │
  │                        │──Check Recipient────────────────────>│
  │                        │<─Online Status──────────────────────│
  │                        │                      │                │
  │                        │──Broadcast────────>│                │
  │<──ACK (sent)──────────│                      │                │
  │                        │                      │──Display──>   │
  │                        │<──ACK (delivered)────│                │
  │<──Receipt─────────────│                      │                │
```

### 3. Offline Message Queue Flow
```
Sender              WebSocket Manager         MongoDB
  │                        │                      │
  │──Send Message────────>│                      │
  │                        │──Store Message──────────────────────>│
  │                        │──Check Recipient────────────────────>│
  │                        │<─Offline Status─────────────────────│
  │                        │──Queue Message──────────────────────>│
  │<──ACK (queued)────────│                      │
  │                        │                      │
  
Recipient connects...
  
Recipient           WebSocket Manager         MongoDB
  │                        │                      │
  │──Connect─────────────>│                      │
  │                        │──Get Queued Msgs────────────────────>│
  │                        │<─Messages───────────────────────────│
  │<──Queued Messages─────│                      │
  │                        │──Remove from Queue──────────────────>│
```

## Component Responsibilities

### Frontend (React + Vite)

**AuthContext**
- Manages user authentication state
- Handles login/register/logout
- Stores JWT token in localStorage
- Provides auth state to components

**useWebSocket Hook**
- Establishes WebSocket connection
- Auto-reconnection on disconnect
- Message type routing
- Sends chat messages, typing indicators, read receipts

**API Service**
- REST API calls to backend
- Token injection via interceptors
- User, contact, and message operations

**Pages**
- Login: Authentication UI
- Chat: Main messaging interface with contacts and conversations

### Backend (Go + Fiber)

**Auth Service**
- User registration with bcrypt password hashing
- Login with JWT generation
- Token validation middleware

**User Service**
- Profile management (CRUD)
- User search functionality
- Contact management (add/remove/list)

**Message Service**
- Create and store messages
- Retrieve conversation history with pagination
- Update message delivery status
- Manage offline message queue

**WebSocket Manager**
- Connection lifecycle management
- Heartbeat mechanism (30s ping/pong)
- Connection pool (sync.Map)
- User-to-connection mapping
- Message routing and broadcasting
- Offline message delivery on reconnect

**Presence Service**
- Track online/offline status
- Last seen timestamps
- In-memory cache with TTL
- Database synchronization

### Database (MongoDB)

**Collections**
- `users`: User accounts and presence
- `conversations`: Chat threads with participants
- `messages`: Message content and metadata
- `message_queue`: Offline message queue with priority
- `contacts`: User relationships
- `active_connections`: WebSocket connection tracking

**Indexes**
- Compound indexes for conversation_id + timestamp
- Unique indexes for usernames and emails
- TTL indexes for connection cleanup (5 min)
- TTL indexes for old queue items (30 days)

## Key Design Decisions

### 1. MongoDB Over PostgreSQL + Redis (MVP Phase)
**Rationale**: Single database simplifies MVP development
- Embedded presence object in users
- Document model fits chat data well
- TTL indexes for auto-cleanup
- Change streams for future scalability

**Trade-offs**:
- ❌ Slightly higher latency for presence checks (~100ms vs <1ms Redis)
- ✅ Simpler architecture, fewer moving parts
- ✅ Good enough for <10k concurrent users
- ✅ Easy migration path to PostgreSQL + Redis later

### 2. In-Memory Cache for Presence
**Rationale**: Balance between performance and complexity
- Presence data cached with 5min TTL
- Reduces database queries for online status
- Acceptable 10-30s staleness for MVP

### 3. WebSocket for Real-time
**Rationale**: Low latency, full-duplex communication
- Native WebSocket (not Socket.io) for simplicity
- Heartbeat every 30s to detect disconnections
- Auto-reconnection on frontend with exponential backoff

### 4. Repository Pattern (Future-Ready)
**Implementation**: Not initially used, but architecture supports it
- Services depend on database interface (not concrete MongoDB)
- Easy to swap MongoDB for PostgreSQL later
- Business logic isolated from storage layer

### 5. JWT Authentication
**Rationale**: Stateless, scalable authentication
- 24h token expiry (configurable)
- No session storage needed
- Easy to scale horizontally

## Scalability Considerations

### Current Limitations (MVP)
- Single server instance
- In-memory cache doesn't sync across servers
- WebSocket connections tied to single server
- No load balancing

### Migration Path to Scale

**Phase 1 (10k-50k users)**: Current architecture sufficient

**Phase 2 (50k-100k users)**: Add Redis
```
• Move presence to Redis with SETEX
• Redis Pub/Sub for cross-server messaging
• Sticky sessions for WebSocket
```

**Phase 3 (100k+ users)**: Migrate to PostgreSQL + Redis
```
• PostgreSQL for transactional data
• Redis for caching and presence
• Message queue (RabbitMQ/Kafka)
• Load balancer with sticky sessions
• Horizontal scaling of backend
```

**Phase 4 (1M+ users)**: Microservices
```
• Separate auth, messaging, presence services
• Database sharding by user ID
• CDN for media delivery
• Distributed tracing
• Service mesh (Istio)
```

## Security Measures

1. **Authentication**: JWT with HS256, bcrypt for passwords
2. **Authorization**: Middleware validates tokens on all protected routes
3. **CORS**: Configured to allow only frontend origin
4. **Input Validation**: All API inputs validated before processing
5. **SQL Injection**: Parameterized MongoDB queries
6. **Rate Limiting**: (TODO: Implement in production)
7. **HTTPS/WSS**: Required in production
8. **Message Encryption**: (TODO: E2E encryption post-MVP)

## Monitoring & Observability (Future)

- Prometheus metrics for Go backend
- Grafana dashboards for visualization
- MongoDB Atlas monitoring
- Application logs with structured logging
- Distributed tracing with Jaeger
- Error tracking with Sentry

## Deployment Architecture

### Development
```
localhost:5173  ←→  localhost:8080  ←→  localhost:27017
 (Frontend)          (Backend)           (MongoDB)
```

### Production (Docker Compose)
```
docker-network
├── frontend:5173
├── backend:8080
└── mongodb:27017 (replica set)
```

### Production (Kubernetes) - Future
```
Ingress Controller
      │
      ├──> Frontend Pods (3 replicas)
      │
      └──> Backend Pods (5 replicas)
             │
             └──> MongoDB StatefulSet (3 nodes)
```

---

**Note**: This architecture is designed for MVP speed while maintaining a clear migration path to handle scale. Key architectural decisions prioritize simplicity without sacrificing future scalability.
