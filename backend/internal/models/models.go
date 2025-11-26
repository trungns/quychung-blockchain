package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Email     string    `gorm:"type:varchar(255);unique;not null" json:"email"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	AvatarURL string    `gorm:"type:text" json:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Treasury represents a fund/treasury
type Treasury struct {
	ID           uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	Name         string    `gorm:"type:varchar(255);not null" json:"name"`
	Description  string    `gorm:"type:text" json:"description,omitempty"`
	CreatedBy    uuid.UUID `gorm:"type:uuid;not null" json:"created_by"`
	ChainAddress string    `gorm:"type:varchar(42)" json:"chain_address,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	// Relations
	Creator User     `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Members []Member `gorm:"foreignKey:TreasuryID" json:"members,omitempty"`
}

// Member represents membership in a treasury
type Member struct {
	ID         uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	TreasuryID uuid.UUID `gorm:"type:uuid;not null" json:"treasury_id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Role       string    `gorm:"type:varchar(50);default:'member'" json:"role"`
	JoinedAt   time.Time `json:"joined_at"`

	// Relations
	User     User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Treasury Treasury `gorm:"foreignKey:TreasuryID" json:"treasury,omitempty"`
}

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypeIncome  TransactionType = "INCOME"
	TransactionTypeExpense TransactionType = "EXPENSE"
)

// TransactionStatus represents the status of a transaction
type TransactionStatus string

const (
	TransactionStatusPending   TransactionStatus = "pending"   // Chờ thủ quỹ xác nhận
	TransactionStatusConfirmed TransactionStatus = "confirmed" // Đã ghi vào sổ, tính balance
	TransactionStatusRejected  TransactionStatus = "rejected"  // Bị từ chối
	TransactionStatusDeleted   TransactionStatus = "deleted"   // Đã xóa
)

// BlockchainStatus represents the status of blockchain logging
type BlockchainStatus string

const (
	BlockchainStatusNone    BlockchainStatus = "none"    // Chưa ghi blockchain
	BlockchainStatusPending BlockchainStatus = "pending" // Đang ghi lên blockchain
	BlockchainStatusSuccess BlockchainStatus = "success" // Đã ghi thành công
	BlockchainStatusFailed  BlockchainStatus = "failed"  // Ghi thất bại (có thể retry)
)

// Transaction represents a financial transaction
type Transaction struct {
	ID              uuid.UUID         `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	TreasuryID      uuid.UUID         `gorm:"type:uuid;not null" json:"treasury_id"`
	Type            TransactionType   `gorm:"type:varchar(20);not null" json:"type"`
	AmountToken     float64           `gorm:"type:decimal(20,8);not null" json:"amount_token"`
	Note            string            `gorm:"type:text" json:"note,omitempty"`
	CreatedBy       uuid.UUID         `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt       time.Time         `json:"created_at"`
	Status          TransactionStatus `gorm:"type:varchar(20);default:'pending'" json:"status"`
	ConfirmedAmount *float64          `gorm:"type:decimal(20,8)" json:"confirmed_amount,omitempty"`
	ConfirmedBy     *uuid.UUID        `gorm:"type:uuid" json:"confirmed_by,omitempty"`
	ConfirmedAt     *time.Time        `json:"confirmed_at,omitempty"`
	RejectReason    string            `gorm:"type:text" json:"reject_reason,omitempty"`

	// Relations
	Treasury  Treasury  `gorm:"foreignKey:TreasuryID" json:"treasury,omitempty"`
	Creator   User      `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	Confirmer *User     `gorm:"foreignKey:ConfirmedBy" json:"confirmer,omitempty"`
	ChainLog  *ChainLog `gorm:"foreignKey:TransactionID" json:"chain_log,omitempty"`
}

// ChainLog represents blockchain transaction log
type ChainLog struct {
	ID            uuid.UUID        `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	TransactionID uuid.UUID        `gorm:"type:uuid;not null;unique" json:"transaction_id"`
	TxHash        string           `gorm:"type:varchar(66)" json:"tx_hash,omitempty"`
	DetailHash    string           `gorm:"type:varchar(66)" json:"detail_hash,omitempty"`
	BlockNumber   int64            `gorm:"type:bigint" json:"block_number,omitempty"`
	Status        BlockchainStatus `gorm:"type:varchar(20);default:'none'" json:"status"`
	ErrorDetail   string           `gorm:"type:text" json:"error_detail,omitempty"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`

	// Relations
	Transaction Transaction `gorm:"foreignKey:TransactionID" json:"transaction,omitempty"`
}

// TreasuryBalance represents the calculated balance of a treasury
type TreasuryBalance struct {
	TreasuryID   uuid.UUID `json:"treasury_id"`
	TotalIncome  float64   `json:"total_income"`
	TotalExpense float64   `json:"total_expense"`
	Balance      float64   `json:"balance"`
}

// CreateTreasuryRequest represents request to create a treasury
type CreateTreasuryRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

// AddMemberRequest represents request to add a member to treasury
type AddMemberRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role"`
}

// CreateTransactionRequest represents request to create a transaction
type CreateTransactionRequest struct {
	Type        TransactionType `json:"type" binding:"required"`
	AmountToken float64         `json:"amount_token" binding:"required,gt=0"`
	Note        string          `json:"note"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

// GoogleUserInfo represents user info from Google OAuth
type GoogleUserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

// TreasuryBankAccount represents bank account info for a treasury
type TreasuryBankAccount struct {
	ID            uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
	TreasuryID    uuid.UUID `gorm:"type:uuid;not null;unique" json:"treasury_id"`
	BankName      string    `gorm:"type:varchar(255);not null" json:"bank_name"`
	AccountNumber string    `gorm:"type:varchar(50);not null" json:"account_number"`
	AccountName   string    `gorm:"type:varchar(255);not null" json:"account_name"`
	QRCodeURL     string    `gorm:"type:text" json:"qr_code_url,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	Treasury Treasury `gorm:"foreignKey:TreasuryID" json:"treasury,omitempty"`
}

// UpdateBankAccountRequest represents request to update bank account
type UpdateBankAccountRequest struct {
	BankName      string `json:"bank_name" binding:"required"`
	AccountNumber string `json:"account_number" binding:"required"`
	AccountName   string `json:"account_name" binding:"required"`
	QRCodeURL     string `json:"qr_code_url"`
}

// ConfirmTransactionRequest represents request to confirm a transaction
type ConfirmTransactionRequest struct {
	ConfirmedAmount float64 `json:"confirmed_amount" binding:"required,gt=0"`
	Note            string  `json:"note"`
}

// RejectTransactionRequest represents request to reject a transaction
type RejectTransactionRequest struct {
	Reason string `json:"reason" binding:"required"`
}

// UpdateTransactionRequest represents request to update a pending/rejected transaction
type UpdateTransactionRequest struct {
	AmountToken float64 `json:"amount_token" binding:"required,gt=0"`
	Note        string  `json:"note"`
}

// UpdateMemberRoleRequest represents request to update a member's role
type UpdateMemberRoleRequest struct {
	Role string `json:"role" binding:"required,oneof=admin treasurer member"`
}
