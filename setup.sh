#!/bin/bash

# Messaging Platform Setup Script

set -e

echo "🚀 Setting up Messaging Platform..."
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Go
if ! command -v go &> /dev/null; then
    echo "❌ Go is not installed. Please install Go 1.21 or higher."
    exit 1
fi
echo "✓ Go $(go version | awk '{print $3}')"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 20 or higher."
    exit 1
fi
echo "✓ Node.js $(node --version)"

# Check MongoDB
if ! command -v mongosh &> /dev/null; then
    echo "⚠️  MongoDB Shell (mongosh) is not installed. You'll need it for local development."
else
    echo "✓ MongoDB Shell $(mongosh --version | head -n 1)"
fi

echo ""
echo "📦 Installing dependencies..."

# Backend dependencies
echo "Installing backend dependencies..."
cd backend
go mod tidy
cd ..

# Frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "⚙️  Setting up configuration files..."

# Backend .env
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env"
else
    echo "⚠️  backend/.env already exists, skipping..."
fi

# Frontend .env
if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "✓ Created frontend/.env"
else
    echo "⚠️  frontend/.env already exists, skipping..."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start MongoDB (if not using Docker):"
echo "     $ mongod --replSet rs0"
echo ""
echo "  2. Initialize MongoDB replica set (first time only):"
echo "     $ make mongo-init"
echo ""
echo "  3. Start the application:"
echo "     $ make dev"
echo ""
echo "  Or use Docker Compose:"
echo "     $ make docker-up"
echo ""
echo "📚 Documentation: See README.md for more details"
echo ""
