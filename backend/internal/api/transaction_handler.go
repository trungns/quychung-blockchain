package api

import (
	"context"
	"log"
	"net/http"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quychung/backend/internal/database"
	"github.com/quychung/backend/internal/middleware"
	"github.com/quychung/backend/internal/models"
	"github.com/quychung/backend/internal/services"
)

// TransactionHandler handles transaction-related endpoints
type TransactionHandler struct {
	blockchainService *services.BlockchainService
}

// NewTransactionHandler creates a new transaction handler
func NewTransactionHandler(blockchainService *services.BlockchainService) *TransactionHandler {
	return &TransactionHandler{
		blockchainService: blockchainService,
	}
}

// CreateTransaction creates a new transaction (income or expense)
func (h *TransactionHandler) CreateTransaction(c *gin.Context) {
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

	var req models.CreateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate transaction type
	if req.Type != models.TransactionTypeIncome && req.Type != models.TransactionTypeExpense {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid transaction type"})
		return
	}

	// Get treasury
	var treasury models.Treasury
	if err := database.DB.First(&treasury, "id = ?", treasuryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Treasury not found"})
		return
	}

	// Create transaction
	transaction := models.Transaction{
		ID:          uuid.New(),
		TreasuryID:  uuid.MustParse(treasuryID),
		Type:        req.Type,
		AmountToken: req.AmountToken,
		Note:        req.Note,
		CreatedBy:   userID,
	}

	tx := database.DB.Begin()

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	// Log to blockchain
	chainLog := models.ChainLog{
		ID:            uuid.New(),
		TransactionID: transaction.ID,
		Status:        "pending",
	}

	if err := tx.Create(&chainLog).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chain log"})
		return
	}

	tx.Commit()

	// Send transaction to blockchain (async)
	go func() {
		log.Printf("DEBUG: Starting blockchain logging for transaction %s", transaction.ID)

		// Check if blockchain service is available
		if h.blockchainService == nil {
			log.Printf("ERROR: Blockchain service is NIL for transaction %s", transaction.ID)
			database.DB.Model(&chainLog).Updates(map[string]interface{}{
				"status": "failed",
			})
			return
		}

		log.Printf("DEBUG: Blockchain service is available")

		ctx := context.Background()
		treasuryAddr := common.HexToAddress(treasury.ChainAddress)

		log.Printf("DEBUG: Calling blockchain service - Treasury: %s, Amount: %.2f, Type: %s",
			treasuryAddr.Hex(), transaction.AmountToken, transaction.Type)

		txHash, detailHash, err := h.blockchainService.LogTransaction(ctx, treasuryAddr, &transaction)
		if err != nil {
			log.Printf("ERROR: Failed to log transaction %s to blockchain: %v", transaction.ID, err)
			database.DB.Model(&chainLog).Updates(map[string]interface{}{
				"status": "failed",
			})
			return
		}

		// Update chain log
		database.DB.Model(&chainLog).Updates(map[string]interface{}{
			"tx_hash":     txHash,
			"detail_hash": detailHash,
			"status":      "confirmed",
		})

		log.Printf("SUCCESS: Transaction %s logged to blockchain with tx_hash: %s", transaction.ID, txHash)
	}()

	// Load relations
	database.DB.Preload("Creator").Preload("ChainLog").First(&transaction, transaction.ID)

	c.JSON(http.StatusCreated, transaction)
}

// GetTransactions gets all transactions for a treasury
func (h *TransactionHandler) GetTransactions(c *gin.Context) {
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

	var transactions []models.Transaction
	if err := database.DB.Preload("Creator").Preload("ChainLog").
		Where("treasury_id = ?", treasuryID).
		Order("created_at DESC").
		Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}
