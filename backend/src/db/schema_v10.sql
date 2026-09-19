-- ============================================================
-- MUTCU DMS Schema v10 — Appointments Extended Columns
-- Run this in Supabase SQL Editor
-- Adds notes, photo_url, is_manual, added_by to appointments
-- ============================================================

-- Add notes column (for historical entries without a user_id)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add photo_url column (for historical entries without a registered user)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add is_manual flag (true = manually added by admin, not from nomination cycle)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;

-- Add added_by (who manually added this entry)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id);

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'appointments'
ORDER BY ordinal_position;