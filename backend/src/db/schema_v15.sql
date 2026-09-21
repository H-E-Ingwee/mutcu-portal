-- ============================================================
-- MUTCU DMS Schema v15 — Enhanced Associate Member Fields
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add course/programme studied at MUT
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_studied VARCHAR(200);

-- Add current occupation
ALTER TABLE users ADD COLUMN IF NOT EXISTS occupation VARCHAR(200);

-- Index for associate queries
CREATE INDEX IF NOT EXISTS idx_users_occupation ON users(occupation) WHERE occupation IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_course_studied ON users(course_studied) WHERE course_studied IS NOT NULL;