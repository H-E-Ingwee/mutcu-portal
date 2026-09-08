-- Schema v6: Fix nominees table unique constraint for publish to work
-- Run this in Supabase SQL Editor

-- Add unique constraint to nominees table so upsert works correctly
ALTER TABLE nominees
  ADD CONSTRAINT nominees_cycle_position_candidate_unique
  UNIQUE (cycle_id, position_id, candidate_id);

-- Verify constraint was added
SELECT conname, contype FROM pg_constraint WHERE conname = 'nominees_cycle_position_candidate_unique';
