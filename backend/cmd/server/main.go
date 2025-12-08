package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ganeshkantimahanthi/messaging-platform/internal/auth"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/message"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/middleware"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/presence"
	"github.com/ganeshkantimahanthi/messaging-platform/internal/user"
	internalWebsocket "github.com/ganeshkantimahanthi/messaging-platform/internal/websocket"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/cache"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/config"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/database"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/websocket/v2"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Initialize database
	ctx := context.Background()
	db, err := database.Connect(ctx, cfg.MongoDBURI, cfg.MongoDBDatabase)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Disconnect(ctx)

	// Initialize indexes
	if err := database.InitializeIndexes(ctx, db); err != nil {
		log.Printf("Warning: Failed to initialize indexes: %v", err)
	}

	// Initialize cache
	appCache := cache.New(cfg.CacheTTL, cfg.CacheCleanupInterval)

	// Initialize services
	authService := auth.NewService(db, cfg)
	userService := user.NewService(db)
	presenceService := presence.NewService(db, appCache)
	messageService := message.NewService(db)

	// Initialize WebSocket manager
	wsManager := internalWebsocket.NewManager(db, appCache, messageService, presenceService, cfg)
	go wsManager.Run()

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowCredentials: true,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// API routes
	api := app.Group("/api")

	// Auth routes
	authRoutes := api.Group("/auth")
	authRoutes.Post("/register", auth.NewHandler(authService).Register)
	authRoutes.Post("/login", auth.NewHandler(authService).Login)

	// Protected routes
	protected := api.Group("", middleware.AuthMiddleware(cfg.JWTSecret))

	// User routes
	userHandler := user.NewHandler(userService)
	userRoutes := protected.Group("/users")
	userRoutes.Get("/me", userHandler.GetMe)
	userRoutes.Put("/me", userHandler.UpdateMe)
	userRoutes.Get("/search", userHandler.Search)
	userRoutes.Get("/:id", userHandler.GetByID)

	// Contact routes
	contactRoutes := protected.Group("/contacts")
	contactRoutes.Get("/", userHandler.GetContacts)
	contactRoutes.Post("/", userHandler.AddContact)
	contactRoutes.Delete("/:id", userHandler.RemoveContact)

	// Message routes
	messageHandler := message.NewHandler(messageService, wsManager)
	messageRoutes := protected.Group("/messages")
	messageRoutes.Post("/", messageHandler.Send)
	messageRoutes.Get("/conversations", messageHandler.GetConversations)
	messageRoutes.Get("/conversations/:id", messageHandler.GetMessages)
	messageRoutes.Put("/:id/status", messageHandler.UpdateStatus)

	// WebSocket route
	app.Get("/ws", middleware.WSAuthMiddleware(cfg.JWTSecret), websocket.New(internalWebsocket.NewHandler(wsManager).HandleWebSocket))

	// Start server
	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt, syscall.SIGTERM)
	<-quit

	log.Println("Server shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	wsManager.Shutdown()
	if err := app.ShutdownWithContext(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
