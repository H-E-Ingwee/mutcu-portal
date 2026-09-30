-- ============================================================
-- MUTCU DMS Schema v18 — Prisma Compatibility Fixes
-- Safe version: uses IF EXISTS to avoid errors on missing tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── Create the updated_at trigger function ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── nomination_cycles — CRITICAL: Prisma needs this ─────────────────────────
ALTER TABLE nomination_cycles 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_nomination_cycles_updated_at ON nomination_cycles;
CREATE TRIGGER update_nomination_cycles_updated_at
  BEFORE UPDATE ON nomination_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── users ────────────────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── positions ────────────────────────────────────────────────────────────────
ALTER TABLE positions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── vetting_decisions ────────────────────────────────────────────────────────
ALTER TABLE vetting_decisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── requisitions (only if table exists) ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'requisitions') THEN
    ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── disciplinary_cases (only if table exists) ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'disciplinary_cases') THEN
    ALTER TABLE disciplinary_cases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── budget_items (only if table exists) ─────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'budget_items') THEN
    ALTER TABLE budget_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── announcements (only if table exists) ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'announcements') THEN
    ALTER TABLE announcements ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── spiritual_calendar (only if table exists) ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'spiritual_calendar') THEN
    ALTER TABLE spiritual_calendar ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── ministry_content (only if table exists) ──────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ministry_content') THEN
    ALTER TABLE ministry_content ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── settings (only if table exists) ─────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── mutcu_counters (only if table exists) ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mutcu_counters') THEN
    ALTER TABLE mutcu_counters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- ─── Verify the critical fix worked ──────────────────────────────────────────
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name IN ('nomination_cycles', 'users', 'positions', 'vetting_decisions')
AND column_name = 'updated_at'
ORDER BY table_name;
