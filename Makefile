.PHONY: help install dev build clean docker-up docker-down test

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## Install all dependencies
	@echo "Installing backend dependencies..."
	cd backend && go mod tidy
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "✓ All dependencies installed"

setup: ## Setup environment files
	@echo "Setting up environment files..."
	@if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi
	@if [ ! -f frontend/.env ]; then cp frontend/.env.example frontend/.env; fi
	@echo "✓ Environment files created"

dev-backend: ## Run backend in development mode
	cd backend && go run cmd/server/main.go

dev-frontend: ## Run frontend in development mode
	cd frontend && npm run dev

dev: ## Run both backend and frontend in development mode
	@echo "Starting backend and frontend..."
	@make -j2 dev-backend dev-frontend

build-backend: ## Build backend binary
	cd backend && go build -o bin/server cmd/server/main.go

build-frontend: ## Build frontend for production
	cd frontend && npm run build

build: build-backend build-frontend ## Build both backend and frontend

docker-up: ## Start all services with Docker Compose
	docker-compose up --build

docker-down: ## Stop all Docker services
	docker-compose down

docker-clean: ## Remove all Docker volumes and images
	docker-compose down -v
	docker system prune -f

mongo-init: ## Initialize MongoDB replica set (for local development)
	mongosh --eval 'rs.initiate({_id: "rs0", members: [{_id: 0, host: "localhost:27017"}]})'

test-backend: ## Run backend tests
	cd backend && go test ./...

clean: ## Clean build artifacts
	rm -rf backend/bin
	rm -rf frontend/dist
	rm -rf frontend/node_modules/.vite

create-user: ## Create a test user (Usage: make create-user USER=alice EMAIL=alice@test.com PASS=password)
	@curl -X POST http://localhost:8080/api/auth/register \
		-H "Content-Type: application/json" \
		-d '{"username":"$(USER)","email":"$(EMAIL)","password":"$(PASS)"}'

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-mongodb: ## Show MongoDB logs
	docker-compose logs -f mongodb

restart: ## Restart all services
	docker-compose restart

status: ## Show status of all services
	docker-compose ps
