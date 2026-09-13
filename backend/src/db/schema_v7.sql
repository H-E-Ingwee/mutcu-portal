-- Schema v7: Account deletion + email change support
-- Run in Supabase SQL Editor

-- Add soft delete support to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Email change verification tokens
CREATE TABLE IF NOT EXISTS email_change_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  current_email VARCHAR(255) NOT NULL,
  new_email VARCHAR(255),
  token VARCHAR(255) UNIQUE NOT NULL,
  step VARCHAR(20) DEFAULT 'verify_current', -- verify_current | set_new
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_change_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON email_change_tokens FOR ALL USING (true);

-- Ensure nominees unique constraint exists (from schema_v6)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nominees_cycle_position_candidate_unique'
  ) THEN
    ALTER TABLE nominees ADD CONSTRAINT nominees_cycle_position_candidate_unique
      UNIQUE (cycle_id, position_id, candidate_id);
  END IF;
END $$;

-- Index for pending changes queries
CREATE INDEX IF NOT EXISTS idx_users_pending_changes ON users((pending_changes IS NOT NULL)) WHERE pending_changes IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;