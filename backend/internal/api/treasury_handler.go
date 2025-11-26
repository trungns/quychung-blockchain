package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quychung/backend/internal/database"
	"github.com/quychung/backend/internal/middleware"
	"github.com/quychung/backend/internal/models"
	"github.com/quychung/backend/internal/services"
)

// TreasuryHandler handles treasury-related endpoints
type TreasuryHandler struct {
	blockchainService *services.BlockchainService
}

// NewTreasuryHandler creates a new treasury handler
func NewTreasuryHandler(blockchainService *services.BlockchainService) *TreasuryHandler {
	return &TreasuryHandler{
		blockchainService: blockchainService,
	}
}

// CreateTreasury creates a new treasury
func (h *TreasuryHandler) CreateTreasury(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreateTreasuryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate treasury address
	chainAddress, err := h.blockchainService.GenerateTreasuryAddress()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate treasury address"})
		return
	}

	// Create treasury
	treasury := models.Treasury{
		ID:           uuid.New(),
		Name:         req.Name,
		Description:  req.Description,
		CreatedBy:    userID,
		ChainAddress: chainAddress,
	}

	tx := database.DB.Begin()

	if err := tx.Create(&treasury).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create treasury"})
		return
	}

	// Add creator as admin member
	member := models.Member{
		ID:         uuid.New(),
		TreasuryID: treasury.ID,
		UserID:     userID,
		Role:       "admin",
	}

	if err := tx.Create(&member).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	tx.Commit()

	// Load relations
	database.DB.Preload("Creator").Preload("Members.User").First(&treasury, treasury.ID)

	c.JSON(http.StatusCreated, treasury)
}

// GetTreasuries gets all treasuries for the current user
func (h *TreasuryHandler) GetTreasuries(c *gin.Context) {
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var members []models.Member
	if err := database.DB.Where("user_id = ?", userID).Find(&members).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get treasuries"})
		return
	}

	// Initialize as empty slice to return [] instead of null
	treasuries := make([]models.Treasury, 0)

	// If user has no memberships, return empty array
	if len(members) == 0 {
		c.JSON(http.StatusOK, treasuries)
		return
	}

	treasuryIDs := make([]uuid.UUID, len(members))
	for i, member := range members {
		treasuryIDs[i] = member.TreasuryID
	}

	if err := database.DB.Preload("Creator").Preload("Members.User").
		Where("id IN ?", treasuryIDs).Find(&treasuries).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load treasuries"})
		return
	}

	c.JSON(http.StatusOK, treasuries)
}

// GetTreasury gets a single treasury by ID
func (h *TreasuryHandler) GetTreasury(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this treasury"})
		return
	}

	var treasury models.Treasury
	if err := database.DB.Preload("Creator").Preload("Members.User").
		First(&treasury, "id = ?", treasuryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Treasury not found"})
		return
	}

	c.JSON(http.StatusOK, treasury)
}

// AddMember adds a member to a treasury
func (h *TreasuryHandler) AddMember(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is admin
	var adminMember models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?", treasuryID, userID, "admin").
		First(&adminMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can add members"})
		return
	}

	var req models.AddMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Find user by email
	var newUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&newUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already a member
	var existingMember models.Member
	if database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, newUser.ID).
		First(&existingMember).Error == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "User is already a member"})
		return
	}

	// Add member
	role := req.Role
	if role == "" {
		role = "member"
	}

	member := models.Member{
		ID:         uuid.New(),
		TreasuryID: uuid.MustParse(treasuryID),
		UserID:     newUser.ID,
		Role:       role,
	}

	if err := database.DB.Create(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add member"})
		return
	}

	// Load user info
	database.DB.Preload("User").First(&member, member.ID)

	c.JSON(http.StatusCreated, member)
}

// UpdateMemberRole updates a member's role (Admin only)
func (h *TreasuryHandler) UpdateMemberRole(c *gin.Context) {
	treasuryID := c.Param("id")
	memberID := c.Param("memberId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if requester is admin
	var requesterMember models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?", treasuryID, userID, "admin").
		First(&requesterMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can update member roles"})
		return
	}

	// Get the member to update
	var member models.Member
	if err := database.DB.Where("id = ? AND treasury_id = ?", memberID, treasuryID).
		First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	// Parse request
	var req models.UpdateMemberRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update role
	if err := database.DB.Model(&member).Update("role", req.Role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update role"})
		return
	}

	// Reload member with user info
	database.DB.Preload("User").First(&member, member.ID)

	c.JSON(http.StatusOK, member)
}

// RemoveMember removes a member from treasury (Admin only)
func (h *TreasuryHandler) RemoveMember(c *gin.Context) {
	treasuryID := c.Param("id")
	memberID := c.Param("memberId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if requester is admin
	var requesterMember models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?", treasuryID, userID, "admin").
		First(&requesterMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admin can remove members"})
		return
	}

	// Get the member to remove
	var member models.Member
	if err := database.DB.Where("id = ? AND treasury_id = ?", memberID, treasuryID).
		First(&member).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Member not found"})
		return
	}

	// Cannot remove yourself if you're the last admin
	if member.UserID == userID {
		var adminCount int64
		database.DB.Model(&models.Member{}).
			Where("treasury_id = ? AND role = ?", treasuryID, "admin").
			Count(&adminCount)

		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last admin"})
			return
		}
	}

	// Delete member
	if err := database.DB.Delete(&member).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove member"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Member removed successfully"})
}

// GetBalance gets the balance of a treasury
func (h *TreasuryHandler) GetBalance(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this treasury"})
		return
	}

	// Calculate balance - use confirmed_amount for CONFIRMED transactions
	// Note: Only CONFIRMED transactions are counted (blockchain status is separate)
	var totalIncome, totalExpense float64

	database.DB.Model(&models.Transaction{}).
		Where("treasury_id = ? AND type = ? AND status = ?", treasuryID, models.TransactionTypeIncome, models.TransactionStatusConfirmed).
		Select("COALESCE(SUM(COALESCE(confirmed_amount, amount_token)), 0)").
		Scan(&totalIncome)

	database.DB.Model(&models.Transaction{}).
		Where("treasury_id = ? AND type = ? AND status = ?", treasuryID, models.TransactionTypeExpense, models.TransactionStatusConfirmed).
		Select("COALESCE(SUM(COALESCE(confirmed_amount, amount_token)), 0)").
		Scan(&totalExpense)

	balance := models.TreasuryBalance{
		TreasuryID:   uuid.MustParse(treasuryID),
		TotalIncome:  totalIncome,
		TotalExpense: totalExpense,
		Balance:      totalIncome - totalExpense,
	}

	c.JSON(http.StatusOK, balance)
}

// GetBankAccount gets bank account info for a treasury
func (h *TreasuryHandler) GetBankAccount(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is a member
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ?", treasuryID, userID).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not a member of this treasury"})
		return
	}

	var bankAccount models.TreasuryBankAccount
	if err := database.DB.Where("treasury_id = ?", treasuryID).First(&bankAccount).Error; err != nil {
		// Return 404 if bank account not configured yet
		c.JSON(http.StatusNotFound, gin.H{"error": "Bank account not configured"})
		return
	}

	c.JSON(http.StatusOK, bankAccount)
}

// UpdateBankAccount updates or creates bank account info for a treasury
func (h *TreasuryHandler) UpdateBankAccount(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is admin
	var adminMember models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?", treasuryID, userID, "admin").
		First(&adminMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can update bank account"})
		return
	}

	var req models.UpdateBankAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if bank account exists
	var bankAccount models.TreasuryBankAccount
	err = database.DB.Where("treasury_id = ?", treasuryID).First(&bankAccount).Error

	if err != nil {
		// Create new bank account
		bankAccount = models.TreasuryBankAccount{
			ID:            uuid.New(),
			TreasuryID:    uuid.MustParse(treasuryID),
			BankName:      req.BankName,
			AccountNumber: req.AccountNumber,
			AccountName:   req.AccountName,
			QRCodeURL:     req.QRCodeURL,
		}

		if err := database.DB.Create(&bankAccount).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create bank account"})
			return
		}

		c.JSON(http.StatusCreated, bankAccount)
		return
	}

	// Update existing bank account
	bankAccount.BankName = req.BankName
	bankAccount.AccountNumber = req.AccountNumber
	bankAccount.AccountName = req.AccountName
	bankAccount.QRCodeURL = req.QRCodeURL

	if err := database.DB.Save(&bankAccount).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update bank account"})
		return
	}

	c.JSON(http.StatusOK, bankAccount)
}

// DeleteBankAccount deletes bank account info for a treasury
func (h *TreasuryHandler) DeleteBankAccount(c *gin.Context) {
	treasuryID := c.Param("id")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is admin
	var adminMember models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?", treasuryID, userID, "admin").
		First(&adminMember).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only admins can delete bank account"})
		return
	}

	// Delete bank account
	if err := database.DB.Where("treasury_id = ?", treasuryID).Delete(&models.TreasuryBankAccount{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete bank account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Bank account deleted successfully"})
}
