package api

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/quychung/backend/internal/database"
)

// ReportHandler handles report endpoints
type ReportHandler struct{}

// NewReportHandler creates a new report handler
func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// MonthlyIncomeByMember represents monthly income report by member
type MonthlyIncomeByMember struct {
	UserID    uuid.UUID `json:"user_id"`
	UserName  string    `json:"user_name"`
	UserEmail string    `json:"user_email"`
	Month     string    `json:"month"` // Format: YYYY-MM
	Total     float64   `json:"total"`
	Count     int       `json:"count"`
}

// MonthlyExpenseReport represents monthly expense report
type MonthlyExpenseReport struct {
	Month string  `json:"month"` // Format: YYYY-MM
	Total float64 `json:"total"`
	Count int     `json:"count"`
}

// GetMonthlyIncomeByMember returns income grouped by member and month
func (h *ReportHandler) GetMonthlyIncomeByMember(c *gin.Context) {
	treasuryID := c.Param("id")

	// Parse optional year parameter
	year := time.Now().Year()
	if yearParam := c.Query("year"); yearParam != "" {
		if y, err := strconv.Atoi(yearParam); err == nil {
			year = y
		}
	}

	// Initialize as empty slice (not nil) so JSON returns [] instead of null
	results := make([]MonthlyIncomeByMember, 0)

	query := `
		SELECT
			u.id as user_id,
			u.name as user_name,
			u.email as user_email,
			TO_CHAR(t.created_at, 'YYYY-MM') as month,
			SUM(t.amount_token) as total,
			COUNT(*) as count
		FROM transactions t
		JOIN users u ON t.created_by = u.id
		WHERE t.treasury_id = $1
			AND t.type = 'INCOME'
			AND EXTRACT(YEAR FROM t.created_at) = $2
		GROUP BY u.id, u.name, u.email, TO_CHAR(t.created_at, 'YYYY-MM')
		ORDER BY month DESC, user_name ASC
	`

	if err := database.DB.Raw(query, treasuryID, year).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get report"})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetMonthlyExpense returns expense grouped by month
func (h *ReportHandler) GetMonthlyExpense(c *gin.Context) {
	treasuryID := c.Param("id")

	// Parse optional year parameter
	year := time.Now().Year()
	if yearParam := c.Query("year"); yearParam != "" {
		if y, err := strconv.Atoi(yearParam); err == nil {
			year = y
		}
	}

	// Initialize as empty slice (not nil) so JSON returns [] instead of null
	results := make([]MonthlyExpenseReport, 0)

	query := `
		SELECT
			TO_CHAR(created_at, 'YYYY-MM') as month,
			SUM(amount_token) as total,
			COUNT(*) as count
		FROM transactions
		WHERE treasury_id = $1
			AND type = 'EXPENSE'
			AND EXTRACT(YEAR FROM created_at) = $2
		GROUP BY TO_CHAR(created_at, 'YYYY-MM')
		ORDER BY month DESC
	`

	if err := database.DB.Raw(query, treasuryID, year).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get report"})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetYearlySummary returns yearly summary
func (h *ReportHandler) GetYearlySummary(c *gin.Context) {
	treasuryID := c.Param("id")

	type YearlySummary struct {
		Year         int     `json:"year"`
		TotalIncome  float64 `json:"total_income"`
		TotalExpense float64 `json:"total_expense"`
		Balance      float64 `json:"balance"`
		IncomeCount  int     `json:"income_count"`
		ExpenseCount int     `json:"expense_count"`
	}

	// Initialize as empty slice (not nil) so JSON returns [] instead of null
	results := make([]YearlySummary, 0)

	query := `
		SELECT
			EXTRACT(YEAR FROM created_at)::int as year,
			COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_token ELSE 0 END), 0) as total_income,
			COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount_token ELSE 0 END), 0) as total_expense,
			COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount_token ELSE -amount_token END), 0) as balance,
			COUNT(CASE WHEN type = 'INCOME' THEN 1 END) as income_count,
			COUNT(CASE WHEN type = 'EXPENSE' THEN 1 END) as expense_count
		FROM transactions
		WHERE treasury_id = $1
		GROUP BY EXTRACT(YEAR FROM created_at)
		ORDER BY year DESC
	`

	if err := database.DB.Raw(query, treasuryID).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get report"})
		return
	}

	c.JSON(http.StatusOK, results)
}

// GetTopContributors returns top contributors by income
func (h *ReportHandler) GetTopContributors(c *gin.Context) {
	treasuryID := c.Param("id")
	limit := 10
	if limitParam := c.Query("limit"); limitParam != "" {
		if l, err := strconv.Atoi(limitParam); err == nil {
			limit = l
		}
	}

	type Contributor struct {
		UserID      uuid.UUID `json:"user_id"`
		UserName    string    `json:"user_name"`
		UserEmail   string    `json:"user_email"`
		UserAvatar  string    `json:"user_avatar"`
		TotalIncome float64   `json:"total_income"`
		Count       int       `json:"count"`
	}

	// Initialize as empty slice (not nil) so JSON returns [] instead of null
	results := make([]Contributor, 0)

	query := `
		SELECT
			u.id as user_id,
			u.name as user_name,
			u.email as user_email,
			u.avatar_url as user_avatar,
			SUM(t.amount_token) as total_income,
			COUNT(*) as count
		FROM transactions t
		JOIN users u ON t.created_by = u.id
		WHERE t.treasury_id = $1 AND t.type = 'INCOME'
		GROUP BY u.id, u.name, u.email, u.avatar_url
		ORDER BY total_income DESC
		LIMIT $2
	`

	if err := database.DB.Raw(query, treasuryID, limit).Scan(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get report"})
		return
	}

	c.JSON(http.StatusOK, results)
}
