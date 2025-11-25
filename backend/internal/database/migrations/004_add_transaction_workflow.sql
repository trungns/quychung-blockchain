-- Migration: Add transaction workflow with status tracking
-- Purpose: Support pending/confirmed/rejected/completed/deleted workflow
-- Date: 2025-11-25

-- Add new columns for transaction workflow
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS confirmed_amount DECIMAL(20,8),
ADD COLUMN IF NOT EXISTS confirmed_by UUID,
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reject_reason TEXT;

-- Add index for status queries (faster filtering)
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_confirmed_by ON transactions(confirmed_by);

-- Add foreign key for confirmer (treasurer who confirmed)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_transactions_confirmer'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_confirmer
        FOREIGN KEY (confirmed_by) REFERENCES users(id);
    END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_transactions_status'
    ) THEN
        ALTER TABLE transactions
        ADD CONSTRAINT chk_transactions_status
        CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected', 'deleted'));
    END IF;
END $$;

-- Update existing transactions to have 'completed' status
-- (transactions without chain_log are pending, with chain_log are completed)
UPDATE transactions
SET status = CASE
    WHEN EXISTS (
        SELECT 1 FROM chain_logs
        WHERE chain_logs.transaction_id = transactions.id
        AND chain_logs.status = 'success'
    ) THEN 'completed'
    ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

-- Add comments
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, confirmed, completed, rejected, deleted';
COMMENT ON COLUMN transactions.confirmed_amount IS 'Actual amount confirmed by treasurer (may differ from amount_token)';
COMMENT ON COLUMN transactions.confirmed_by IS 'User ID of treasurer who confirmed the transaction';
COMMENT ON COLUMN transactions.confirmed_at IS 'Timestamp when transaction was confirmed';
COMMENT ON COLUMN transactions.reject_reason IS 'Reason for rejection (if status is rejected)';
