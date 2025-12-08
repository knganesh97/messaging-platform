package auth

import (
	"context"
	"errors"
	"time"

	"github.com/ganeshkantimahanthi/messaging-platform/internal/models"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/config"
	"github.com/ganeshkantimahanthi/messaging-platform/pkg/database"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	db  *database.Database
	cfg *config.Config
}

func NewService(db *database.Database, cfg *config.Config) *Service {
	return &Service{db: db, cfg: cfg}
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (s *Service) Register(ctx context.Context, req *RegisterRequest) (*AuthResponse, error) {
	// Validate input
	if req.Username == "" || req.Password == "" {
		return nil, errors.New("username and password are required")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &models.User{
		Username:     req.Username,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		Presence: models.Presence{
			Status:   "offline",
			LastSeen: time.Now(),
		},
		Settings: models.UserSettings{
			ReadReceipts:    true,
			LastSeenPrivacy: "everyone",
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := s.db.DB.Collection("users").InsertOne(ctx, user)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			return nil, errors.New("username already exists")
		}
		return nil, err
	}

	user.ID = result.InsertedID.(primitive.ObjectID)

	// Generate token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, err
	}

	// Remove password hash from response
	user.PasswordHash = ""

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *Service) Login(ctx context.Context, req *LoginRequest) (*AuthResponse, error) {
	// Find user
	var user models.User
	err := s.db.DB.Collection("users").FindOne(ctx, bson.M{"username": req.Username}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, errors.New("invalid username or password")
		}
		return nil, err
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	// Generate token
	token, err := s.generateToken(&user)
	if err != nil {
		return nil, err
	}

	// Remove password hash from response
	user.PasswordHash = ""

	return &AuthResponse{
		Token: token,
		User:  &user,
	}, nil
}

func (s *Service) generateToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"user_id":  user.ID.Hex(),
		"username": user.Username,
		"exp":      time.Now().Add(s.cfg.JWTExpiry).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}
