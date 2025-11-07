package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/quychung/backend/internal/database"
	"github.com/quychung/backend/internal/middleware"
	"github.com/quychung/backend/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// AuthService handles authentication logic
type AuthService struct {
	oauth2Config *oauth2.Config
}

// NewAuthService creates a new auth service
func NewAuthService() *AuthService {
	return &AuthService{
		oauth2Config: &oauth2.Config{
			ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
			ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
			RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
	}
}

// GetAuthURL returns Google OAuth URL
func (s *AuthService) GetAuthURL(state string) string {
	return s.oauth2Config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

// ExchangeCode exchanges authorization code for tokens and user info
func (s *AuthService) ExchangeCode(ctx context.Context, code string) (*models.GoogleUserInfo, error) {
	token, err := s.oauth2Config.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange token: %w", err)
	}

	// Get user info
	client := s.oauth2Config.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read user info: %w", err)
	}

	var userInfo models.GoogleUserInfo
	if err := json.Unmarshal(data, &userInfo); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	return &userInfo, nil
}

// VerifyGoogleJWT verifies Google's JWT credential token and returns user info
func (s *AuthService) VerifyGoogleJWT(ctx context.Context, credential string) (*models.GoogleUserInfo, error) {
	// Verify the JWT token with Google's tokeninfo endpoint
	resp, err := http.Get(fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", credential))
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		data, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token verification failed: %s", string(data))
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read token info: %w", err)
	}

	var tokenInfo struct {
		Email         string `json:"email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
		EmailVerified string `json:"email_verified"`
		Audience      string `json:"aud"`
	}

	if err := json.Unmarshal(data, &tokenInfo); err != nil {
		return nil, fmt.Errorf("failed to parse token info: %w", err)
	}

	// Verify the audience (client ID)
	if tokenInfo.Audience != os.Getenv("GOOGLE_CLIENT_ID") {
		return nil, fmt.Errorf("invalid token audience")
	}

	// Check if email is verified
	if tokenInfo.EmailVerified != "true" {
		return nil, fmt.Errorf("email not verified")
	}

	return &models.GoogleUserInfo{
		Email:   tokenInfo.Email,
		Name:    tokenInfo.Name,
		Picture: tokenInfo.Picture,
	}, nil
}

// AuthenticateUser finds or creates user and generates JWT token
func (s *AuthService) AuthenticateUser(userInfo *models.GoogleUserInfo) (*models.AuthResponse, error) {
	var user models.User

	// Find or create user
	result := database.DB.Where("email = ?", userInfo.Email).First(&user)
	if result.Error != nil {
		// Create new user
		user = models.User{
			ID:        uuid.New(),
			Email:     userInfo.Email,
			Name:      userInfo.Name,
			AvatarURL: userInfo.Picture,
		}

		if err := database.DB.Create(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to create user: %w", err)
		}
	} else {
		// Update existing user info
		user.Name = userInfo.Name
		user.AvatarURL = userInfo.Picture
		database.DB.Save(&user)
	}

	// Generate JWT token
	token, err := s.GenerateToken(user.ID, user.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &models.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

// GenerateToken creates a JWT token for a user
func (s *AuthService) GenerateToken(userID uuid.UUID, email string) (string, error) {
	claims := middleware.Claims{
		UserID: userID,
		Email:  email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour * 30)), // 30 days
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}
