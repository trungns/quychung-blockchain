package api

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/quychung/backend/internal/services"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler() *AuthHandler {
	return &AuthHandler{
		authService: services.NewAuthService(),
	}
}

// GetAuthURL returns Google OAuth URL
func (h *AuthHandler) GetAuthURL(c *gin.Context) {
	// Generate random state
	b := make([]byte, 16)
	rand.Read(b)
	state := base64.URLEncoding.EncodeToString(b)

	url := h.authService.GetAuthURL(state)

	c.JSON(http.StatusOK, gin.H{
		"url":   url,
		"state": state,
	})
}

// GoogleCallback handles Google OAuth callback
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing authorization code"})
		return
	}

	// Exchange code for user info
	userInfo, err := h.authService.ExchangeCode(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange code"})
		return
	}

	// Authenticate user
	authResponse, err := h.authService.AuthenticateUser(userInfo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to authenticate user"})
		return
	}

	c.JSON(http.StatusOK, authResponse)
}

// GoogleLogin handles direct Google login with JWT credential
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	var req struct {
		Code string `json:"code" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// Verify Google JWT credential
	userInfo, err := h.authService.VerifyGoogleJWT(c.Request.Context(), req.Code)
	if err != nil {
		// Log detailed error for debugging
		c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to verify Google credential",
			"detail": err.Error(),
		})
		return
	}

	// Authenticate user
	authResponse, err := h.authService.AuthenticateUser(userInfo)
	if err != nil {
		// Log detailed error for debugging
		c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to authenticate user",
			"detail": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, authResponse)
}
