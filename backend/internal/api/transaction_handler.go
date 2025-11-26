package api

import (
	"context"
	"log"
	"net/http"
	"time"

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

	// Create transaction with PENDING status
	// NOTE: Blockchain logging happens ONLY after treasurer confirms (status -> confirmed)
	transaction := models.Transaction{
		ID:          uuid.New(),
		TreasuryID:  uuid.MustParse(treasuryID),
		Type:        req.Type,
		AmountToken: req.AmountToken,
		Note:        req.Note,
		CreatedBy:   userID,
		Status:      models.TransactionStatusPending, // Start as PENDING
	}

	if err := database.DB.Create(&transaction).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

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

	// Get status filter from query params (default: exclude deleted)
	statusFilter := c.Query("status")

	// Initialize as empty slice to return [] instead of null
	transactions := make([]models.Transaction, 0)
	query := database.DB.Preload("Creator").Preload("Confirmer").Preload("ChainLog").
		Where("treasury_id = ?", treasuryID)

	// Apply status filter
	if statusFilter == "all" {
		// Show all including deleted
	} else if statusFilter != "" {
		// Show specific status(es) - comma separated
		query = query.Where("status IN (?)", statusFilter)
	} else {
		// Default: exclude deleted
		query = query.Where("status != ?", models.TransactionStatusDeleted)
	}

	if err := query.Order("created_at DESC").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}

// ConfirmTransaction confirms a pending transaction (Treasurer/Admin only)
func (h *TransactionHandler) ConfirmTransaction(c *gin.Context) {
	treasuryID := c.Param("id")
	transactionID := c.Param("txId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is treasurer or admin
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role IN ?",
		treasuryID, userID, []string{"admin", "treasurer"}).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only treasurers and admins can confirm transactions"})
		return
	}

	var req models.ConfirmTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get transaction
	var transaction models.Transaction
	if err := database.DB.Where("id = ? AND treasury_id = ?", transactionID, treasuryID).
		First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Check if transaction is pending
	if transaction.Status != models.TransactionStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending transactions can be confirmed"})
		return
	}

	// Get treasury for blockchain logging
	var treasury models.Treasury
	if err := database.DB.First(&treasury, "id = ?", treasuryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Treasury not found"})
		return
	}

	// Update transaction to CONFIRMED status
	now := time.Now()
	updates := map[string]interface{}{
		"status":           models.TransactionStatusConfirmed,
		"confirmed_amount": req.ConfirmedAmount,
		"confirmed_by":     userID,
		"confirmed_at":     now,
	}

	// Update note if provided
	if req.Note != "" {
		updates["note"] = req.Note
	}

	tx := database.DB.Begin()

	if err := tx.Model(&transaction).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm transaction"})
		return
	}

	// Create chain log with "none" status - will be updated when blockchain logging happens
	chainLog := models.ChainLog{
		ID:            uuid.New(),
		TransactionID: transaction.ID,
		Status:        models.BlockchainStatusNone,
	}
	if err := tx.Create(&chainLog).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create chain log"})
		return
	}

	tx.Commit()

	// IMPORTANT: Transaction is now CONFIRMED (already counted in balance/reports)
	// Blockchain logging is separate and async - just for verification

	// Try to log to blockchain (async, non-blocking)
	go h.logTransactionToBlockchain(&transaction, &chainLog, &treasury, req.ConfirmedAmount)

	// Reload transaction with relations
	database.DB.Preload("Creator").Preload("Confirmer").Preload("ChainLog").
		First(&transaction, transaction.ID)

	c.JSON(http.StatusOK, transaction)
}

// RejectTransaction rejects a pending transaction (Treasurer/Admin only)
func (h *TransactionHandler) RejectTransaction(c *gin.Context) {
	treasuryID := c.Param("id")
	transactionID := c.Param("txId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is treasurer or admin
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role IN ?",
		treasuryID, userID, []string{"admin", "treasurer"}).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only treasurers and admins can reject transactions"})
		return
	}

	var req models.RejectTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get transaction
	var transaction models.Transaction
	if err := database.DB.Where("id = ? AND treasury_id = ?", transactionID, treasuryID).
		First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Check if transaction is pending
	if transaction.Status != models.TransactionStatusPending {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending transactions can be rejected"})
		return
	}

	// Update transaction to REJECTED status
	if err := database.DB.Model(&transaction).Updates(map[string]interface{}{
		"status":        models.TransactionStatusRejected,
		"reject_reason": req.Reason,
	}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to reject transaction"})
		return
	}

	// Reload with relations
	database.DB.Preload("Creator").First(&transaction, transaction.ID)

	c.JSON(http.StatusOK, transaction)
}

// UpdateTransaction updates a pending or rejected transaction (Creator only)
func (h *TransactionHandler) UpdateTransaction(c *gin.Context) {
	treasuryID := c.Param("id")
	transactionID := c.Param("txId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.UpdateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get transaction
	var transaction models.Transaction
	if err := database.DB.Where("id = ? AND treasury_id = ?", transactionID, treasuryID).
		First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Check if user is the creator
	if transaction.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the creator can update this transaction"})
		return
	}

	// Check if transaction can be edited (only PENDING or REJECTED)
	if transaction.Status != models.TransactionStatusPending &&
	   transaction.Status != models.TransactionStatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only pending or rejected transactions can be updated"})
		return
	}

	// Update transaction and reset to PENDING if was REJECTED
	updates := map[string]interface{}{
		"amount_token": req.AmountToken,
		"note":         req.Note,
	}

	// If transaction was rejected, reset to pending
	if transaction.Status == models.TransactionStatusRejected {
		updates["status"] = models.TransactionStatusPending
		updates["reject_reason"] = ""
	}

	if err := database.DB.Model(&transaction).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update transaction"})
		return
	}

	// Reload with relations
	database.DB.Preload("Creator").First(&transaction, transaction.ID)

	c.JSON(http.StatusOK, transaction)
}

// DeleteTransaction soft deletes a transaction (Creator or Admin only)
func (h *TransactionHandler) DeleteTransaction(c *gin.Context) {
	treasuryID := c.Param("id")
	transactionID := c.Param("txId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Get transaction
	var transaction models.Transaction
	if err := database.DB.Where("id = ? AND treasury_id = ?", transactionID, treasuryID).
		First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Check permission: creator or admin
	isCreator := transaction.CreatedBy == userID
	var isAdmin bool
	var adminMember models.Member
	if database.DB.Where("treasury_id = ? AND user_id = ? AND role = ?",
		treasuryID, userID, "admin").First(&adminMember).Error == nil {
		isAdmin = true
	}

	if !isCreator && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only the creator or admin can delete this transaction"})
		return
	}

	// Cannot delete CONFIRMED transactions (already counted in balance/reports)
	if transaction.Status == models.TransactionStatusConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete confirmed transactions"})
		return
	}

	// Soft delete by changing status to DELETED
	if err := database.DB.Model(&transaction).Update("status", models.TransactionStatusDeleted).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Transaction deleted successfully"})
}

// logTransactionToBlockchain logs a transaction to blockchain (async helper)
func (h *TransactionHandler) logTransactionToBlockchain(
	transaction *models.Transaction,
	chainLog *models.ChainLog,
	treasury *models.Treasury,
	confirmedAmount float64,
) {
	log.Printf("BLOCKCHAIN: Starting async blockchain logging for transaction %s", transaction.ID)

	if h.blockchainService == nil {
		log.Printf("BLOCKCHAIN ERROR: Service is nil")
		database.DB.Model(chainLog).Updates(map[string]interface{}{
			"status":       models.BlockchainStatusFailed,
			"error_detail": "Blockchain service not available",
		})
		return
	}

	// Update status to pending
	database.DB.Model(chainLog).Update("status", models.BlockchainStatusPending)

	ctx := context.Background()
	treasuryAddr := common.HexToAddress(treasury.ChainAddress)

	// Use confirmed amount for blockchain
	transaction.AmountToken = confirmedAmount

	log.Printf("BLOCKCHAIN: Logging to chain - Treasury: %s, Amount: %.2f",
		treasuryAddr.Hex(), confirmedAmount)

	txHash, detailHash, err := h.blockchainService.LogTransaction(ctx, treasuryAddr, transaction)
	if err != nil {
		log.Printf("BLOCKCHAIN ERROR: Failed - %v", err)
		database.DB.Model(chainLog).Updates(map[string]interface{}{
			"status":       models.BlockchainStatusFailed,
			"error_detail": err.Error(),
		})
		return
	}

	log.Printf("BLOCKCHAIN SUCCESS: TX Hash: %s", txHash)
	database.DB.Model(chainLog).Updates(map[string]interface{}{
		"tx_hash":      txHash,
		"detail_hash":  detailHash,
		"status":       models.BlockchainStatusSuccess,
		"error_detail": "",
	})
}

// RetryBlockchainLog retries blockchain logging for a confirmed transaction (Admin/Treasurer only)
func (h *TransactionHandler) RetryBlockchainLog(c *gin.Context) {
	treasuryID := c.Param("id")
	transactionID := c.Param("txId")
	userID, err := middleware.GetUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Check if user is treasurer or admin
	var member models.Member
	if err := database.DB.Where("treasury_id = ? AND user_id = ? AND role IN ?",
		treasuryID, userID, []string{"admin", "treasurer"}).First(&member).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only treasurers and admins can retry blockchain logging"})
		return
	}

	// Get transaction
	var transaction models.Transaction
	if err := database.DB.Preload("ChainLog").
		Where("id = ? AND treasury_id = ?", transactionID, treasuryID).
		First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaction not found"})
		return
	}

	// Only allow retry for CONFIRMED transactions
	if transaction.Status != models.TransactionStatusConfirmed {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Only confirmed transactions can retry blockchain logging"})
		return
	}

	// Check if chain log exists
	if transaction.ChainLog == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Chain log not found"})
		return
	}

	// Only retry if status is 'none' or 'failed'
	if transaction.ChainLog.Status != models.BlockchainStatusNone &&
		transaction.ChainLog.Status != models.BlockchainStatusFailed {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Can only retry blockchain logging for transactions with 'none' or 'failed' status",
		})
		return
	}

	// Get treasury
	var treasury models.Treasury
	if err := database.DB.First(&treasury, "id = ?", treasuryID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Treasury not found"})
		return
	}

	// Retry blockchain logging (async)
	confirmedAmount := transaction.AmountToken
	if transaction.ConfirmedAmount != nil {
		confirmedAmount = *transaction.ConfirmedAmount
	}

	go h.logTransactionToBlockchain(&transaction, transaction.ChainLog, &treasury, confirmedAmount)

	c.JSON(http.StatusOK, gin.H{
		"message": "Blockchain logging retry initiated",
		"status":  "pending",
	})
}
