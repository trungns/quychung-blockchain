-- Add error_detail column to chain_logs table for storing blockchain errors
ALTER TABLE chain_logs ADD COLUMN IF NOT EXISTS error_detail TEXT;
