-- Migration: Add treasury_bank_accounts table
-- Purpose: Store bank account information for each treasury
-- Author: Claude Code
-- Date: 2025-11-25

-- Create treasury_bank_accounts table
CREATE TABLE IF NOT EXISTS treasury_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treasury_id UUID NOT NULL UNIQUE REFERENCES treasuries(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for faster lookups (use IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_treasury_bank_accounts_treasury_id ON treasury_bank_accounts(treasury_id);

-- Add comment
COMMENT ON TABLE treasury_bank_accounts IS 'Bank account information for treasuries to receive payments';
COMMENT ON COLUMN treasury_bank_accounts.treasury_id IS 'One-to-one relationship with treasury';
COMMENT ON COLUMN treasury_bank_accounts.qr_code_url IS 'URL template for VietQR code generation';
