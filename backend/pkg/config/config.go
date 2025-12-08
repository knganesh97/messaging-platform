package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	// Server
	Port        string
	ServerID    string
	Environment string

	// MongoDB
	MongoDBURI      string
	MongoDBDatabase string

	// JWT
	JWTSecret string
	JWTExpiry time.Duration

	// CORS
	CORSOrigins string

	// WebSocket
	WSHeartbeatInterval time.Duration
	WSConnectionTimeout time.Duration
	WSMaxMessageSize    int64

	// Cache
	CacheTTL             time.Duration
	CacheCleanupInterval time.Duration
}

func Load() (*Config, error) {
	// Load .env file if it exists (ignore errors in production)
	_ = godotenv.Load()

	jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "24h"))
	wsHeartbeat, _ := time.ParseDuration(getEnv("WS_HEARTBEAT_INTERVAL", "30s"))
	wsTimeout, _ := time.ParseDuration(getEnv("WS_CONNECTION_TIMEOUT", "5m"))
	cacheTTL, _ := time.ParseDuration(getEnv("CACHE_TTL", "5m"))
	cacheCleanup, _ := time.ParseDuration(getEnv("CACHE_CLEANUP_INTERVAL", "10m"))

	return &Config{
		Port:                 getEnv("PORT", "8080"),
		ServerID:             getEnv("SERVER_ID", "server-1"),
		Environment:          getEnv("ENVIRONMENT", "development"),
		MongoDBURI:           getEnv("MONGODB_URI", "mongodb://localhost:27017"),
		MongoDBDatabase:      getEnv("MONGODB_DATABASE", "messaging_platform"),
		JWTSecret:            getEnv("JWT_SECRET", "change-this-secret"),
		JWTExpiry:            jwtExpiry,
		CORSOrigins:          getEnv("CORS_ORIGINS", "http://localhost:5173"),
		WSHeartbeatInterval:  wsHeartbeat,
		WSConnectionTimeout:  wsTimeout,
		WSMaxMessageSize:     1048576, // 1MB
		CacheTTL:             cacheTTL,
		CacheCleanupInterval: cacheCleanup,
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
