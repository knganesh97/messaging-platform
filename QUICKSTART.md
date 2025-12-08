# Messaging Platform

## Quick Start

1. **Clone the repository**
2. **Run setup script**:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```
3. **Start the application**:
   ```bash
   make docker-up
   ```
4. **Open browser**: http://localhost:5173

## Project Structure

```
messaging-platform/
├── backend/              # Go backend service
│   ├── cmd/
│   │   └── server/      # Main application entry
│   ├── internal/        # Internal packages
│   │   ├── auth/        # Authentication
│   │   ├── user/        # User management
│   │   ├── message/     # Messaging logic
│   │   ├── websocket/   # WebSocket manager
│   │   ├── presence/    # Presence tracking
│   │   ├── middleware/  # HTTP middleware
│   │   └── models/      # Data models
│   └── pkg/             # Shared packages
│       ├── config/      # Configuration
│       ├── database/    # Database connection
│       └── cache/       # In-memory cache
├── frontend/            # React + Vite frontend
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── hooks/       # Custom hooks
│   │   └── services/    # API services
│   └── public/          # Static assets
├── scripts/             # Utility scripts
│   └── mongo-init.js   # MongoDB initialization
├── docker-compose.yml   # Docker configuration
├── Makefile            # Build automation
└── README.md           # Documentation
```

## Technology Stack

- **Backend**: Go + Fiber + MongoDB
- **Frontend**: React + Vite + React Router
- **Database**: MongoDB 7.0 with replica set
- **Real-time**: WebSocket (gorilla/websocket)
- **Authentication**: JWT + bcrypt

## Development

See [README.md](README.md) for detailed documentation.

### Available Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev           # Run in development mode
make docker-up     # Start with Docker
make test-backend  # Run tests
```

## Features

✅ User authentication (register/login)
✅ Real-time messaging via WebSocket
✅ Offline message queue
✅ Online presence tracking
✅ Message delivery status
✅ Contact management
✅ Conversation history

## License

MIT
