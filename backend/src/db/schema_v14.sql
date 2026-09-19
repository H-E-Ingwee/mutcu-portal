-- ============================================================
-- MUTCU DMS Schema v14 — Targeted Announcements + Audit Log
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add target_gender to announcements (null = all, 'male' = gents only, 'female' = ladies only)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS target_gender VARCHAR(10);

-- Audit log for role changes (extends existing audit_logs)
-- The existing audit_logs table handles this — just ensure the action field is used:
-- action: 'role.changed' with description containing old_role and new_role

-- Disciplinary proceedings table (extends existing disciplinary_cases)
CREATE TABLE IF NOT EXISTS disciplinary_proceedings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID REFERENCES disciplinary_cases(id) ON DELETE CASCADE,
  proceeding_type VARCHAR(50) NOT NULL, -- 'notice', 'hearing', 'decision', 'appeal', 'note'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  conducted_by UUID REFERENCES users(id),
  proceeding_date DATE DEFAULT CURRENT_DATE,
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disciplinary_proceedings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disciplinary_proceedings' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON disciplinary_proceedings FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_disciplinary_proceedings_case ON disciplinary_proceedings(case_id);
CREATE INDEX IF NOT EXISTS idx_announcements_gender ON announcements(target_gender) WHERE target_gender IS NOT NULL;