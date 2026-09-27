-- ============================================================
-- MUTCU DMS Schema v17 — Performance & Reliability Fixes
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Atomic MUTCU number counter table
--    Prevents duplicate MUTCU numbers during mass registration
CREATE TABLE IF NOT EXISTS mutcu_counters (
  key TEXT PRIMARY KEY,
  value INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial counters for current year
INSERT INTO mutcu_counters (key, value)
SELECT 'member_' || EXTRACT(YEAR FROM NOW())::TEXT, 
       COALESCE((
         SELECT MAX(CAST(SPLIT_PART(mutcu_number, '-', 3) AS INT))
         FROM users 
         WHERE mutcu_number ~ '^MUTCU-[0-9]+-[0-9]+$'
         AND mutcu_number NOT LIKE 'MUTCU-A-%'
       ), 0)
ON CONFLICT (key) DO NOTHING;

INSERT INTO mutcu_counters (key, value)
SELECT 'associate_' || EXTRACT(YEAR FROM NOW())::TEXT,
       COALESCE((
         SELECT MAX(CAST(SPLIT_PART(mutcu_number, '-', 4) AS INT))
         FROM users 
         WHERE mutcu_number ~ '^MUTCU-A-[0-9]+-[0-9]+$'
       ), 0)
ON CONFLICT (key) DO NOTHING;

-- 2. Atomic increment function — thread-safe, no race conditions
CREATE OR REPLACE FUNCTION increment_mutcu_counter(counter_key TEXT)
RETURNS INT AS $$
  UPDATE mutcu_counters 
  SET value = value + 1, updated_at = NOW()
  WHERE key = counter_key
  RETURNING value;
$$ LANGUAGE sql;

-- 3. Indexes to speed up common queries under load
-- Speed up email lookup during login/registration
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

-- Speed up student_id duplicate check
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id) WHERE student_id IS NOT NULL;

-- Speed up MUTCU number generation query
CREATE INDEX IF NOT EXISTS idx_users_mutcu_number ON users(mutcu_number) WHERE mutcu_number IS NOT NULL;

-- Speed up enrollment_status filter (used in analytics + member lists)
CREATE INDEX IF NOT EXISTS idx_users_enrollment_status ON users(enrollment_status);

-- Speed up role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Speed up active member queries
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- 4. Verify the counter table is populated
SELECT key, value FROM mutcu_counters ORDER BY key;
