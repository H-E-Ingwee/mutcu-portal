-- ============================================================
-- MUTCU DMS Schema v9 — Financial Year Management
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── FINANCIAL YEARS TABLE ───────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label VARCHAR(20) NOT NULL UNIQUE,   -- e.g. "2026/2027"
  start_date DATE NOT NULL,            -- e.g. 2026-09-01
  end_date DATE NOT NULL,              -- e.g. 2027-08-31
  is_active BOOLEAN DEFAULT false,     -- only one active at a time
  is_closed BOOLEAN DEFAULT false,     -- locked after audit
  notes TEXT,
  created_by UUID REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE financial_years ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'financial_years' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON financial_years FOR ALL USING (true);
  END IF;
END $$;

-- Ensure only one active year at a time (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_years_one_active
  ON financial_years (is_active) WHERE is_active = true;

-- ─── SEED: Create 2026/2027 as the first active year ─────────
INSERT INTO financial_years (label, start_date, end_date, is_active, notes)
VALUES ('2026/2027', '2026-09-01', '2027-08-31', true, 'First digital financial year — MUTCU DMS launch')
ON CONFLICT (label) DO NOTHING;

-- ─── INDEX ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_financial_years_active ON financial_years(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_years_label ON financial_years(label);