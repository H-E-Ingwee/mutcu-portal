-- ============================================================
-- MUTCU DMS Schema v13 — Associate Member Fields
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add county field for associate members
ALTER TABLE users ADD COLUMN IF NOT EXISTS county VARCHAR(100);

-- Add year_completed for associates (year they finished at MUT)
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_completed INTEGER;

-- Index
CREATE INDEX IF NOT EXISTS idx_users_county ON users(county) WHERE county IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_membership_type ON users(membership_type);