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

-- ============================================================
-- Nomination Race Condition Prevention
-- ============================================================

-- Unique constraint: one recommendation per recommender per position per cycle
-- This is the DB-level safety net — even if two requests slip past the code check,
-- the DB will reject the second one with error code 23505
ALTER TABLE recommendations 
  DROP CONSTRAINT IF EXISTS recommendations_unique_recommender_position;
ALTER TABLE recommendations
  ADD CONSTRAINT recommendations_unique_recommender_position 
  UNIQUE (cycle_id, position_id, recommender_id);

-- Unique constraint: one suggestion per suggester per position per cycle
ALTER TABLE free_text_suggestions
  DROP CONSTRAINT IF EXISTS suggestions_unique_suggester_position;
ALTER TABLE free_text_suggestions
  ADD CONSTRAINT suggestions_unique_suggester_position
  UNIQUE (cycle_id, position_id, suggester_id);

-- Index: speed up "has this member already recommended this position?" check
CREATE INDEX IF NOT EXISTS idx_recommendations_recommender_position 
  ON recommendations(cycle_id, position_id, recommender_id);

-- Index: speed up NC panel candidate lookup
CREATE INDEX IF NOT EXISTS idx_recommendations_cycle_position 
  ON recommendations(cycle_id, position_id);

-- Index: speed up candidate recommendation count
CREATE INDEX IF NOT EXISTS idx_recommendations_candidate 
  ON recommendations(cycle_id, candidate_id);

-- Index: speed up objection lookups
CREATE INDEX IF NOT EXISTS idx_objections_cycle 
  ON objections(cycle_id);

-- Index: speed up nominee lookups
CREATE INDEX IF NOT EXISTS idx_nominees_cycle_status 
  ON nominees(cycle_id, status);
