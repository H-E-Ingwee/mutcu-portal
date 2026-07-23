-- MUTCU DMS Schema v4 — Run in Supabase SQL Editor
-- Adds: disciplinary_cases table, finalist auto-detection trigger

-- ── Disciplinary Cases ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disciplinary_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  case_number VARCHAR(30) UNIQUE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'minor', -- 'minor' | 'moderate' | 'serious' | 'critical'
  status VARCHAR(20) DEFAULT 'open',    -- 'open' | 'under_review' | 'resolved' | 'dismissed'
  outcome VARCHAR(20),                  -- 'warning' | 'suspension' | 'cleared' | 'dismissed'
  outcome_notes TEXT,
  reported_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disciplinary_cases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disciplinary_cases' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON disciplinary_cases FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disciplinary_user_id ON disciplinary_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_cases(status);

-- ── Auto-generate case numbers ────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS disciplinary_case_seq START 1;

CREATE OR REPLACE FUNCTION generate_case_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.case_number IS NULL THEN
    NEW.case_number := 'DC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('disciplinary_case_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_case_number ON disciplinary_cases;
CREATE TRIGGER set_case_number
  BEFORE INSERT ON disciplinary_cases
  FOR EACH ROW EXECUTE FUNCTION generate_case_number();

-- ── Finalist auto-detection function ─────────────────────────────────────────
-- Run this to auto-update finalist status based on year_of_study and graduation_year
CREATE OR REPLACE FUNCTION update_finalist_status()
RETURNS void AS $$
BEGIN
  -- Mark as finalist: year_of_study >= 4 OR graduation_year <= current year + 1
  UPDATE users
  SET is_finalist = TRUE
  WHERE enrollment_status = 'active'
    AND is_active = TRUE
    AND (
      year_of_study >= 4
      OR (graduation_year IS NOT NULL AND graduation_year <= EXTRACT(YEAR FROM NOW()) + 1)
    )
    AND is_finalist = FALSE;

  -- Clear finalist: year_of_study < 4 AND graduation_year > current year + 1
  UPDATE users
  SET is_finalist = FALSE
  WHERE enrollment_status = 'active'
    AND is_active = TRUE
    AND year_of_study < 4
    AND (graduation_year IS NULL OR graduation_year > EXTRACT(YEAR FROM NOW()) + 1)
    AND is_finalist = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Run it immediately to sync current data
SELECT update_finalist_status();