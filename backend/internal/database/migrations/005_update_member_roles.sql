-- Migration: Update member roles to support admin/treasurer/member
-- Purpose: Enable role-based access control for transaction workflow
-- Date: 2025-11-25

-- Update role column to have better default and constraint
ALTER TABLE members
ALTER COLUMN role SET DEFAULT 'member';

-- Add check constraint for valid role values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_members_role'
    ) THEN
        ALTER TABLE members
        ADD CONSTRAINT chk_members_role
        CHECK (role IN ('admin', 'treasurer', 'member'));
    END IF;
END $$;

-- Add index for role queries
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- Update existing 'admin' roles to remain as 'admin'
-- No changes needed as they are already set correctly

-- Add comments
COMMENT ON COLUMN members.role IS 'Member role: admin (full access), treasurer (confirm transactions), member (create transactions)';
