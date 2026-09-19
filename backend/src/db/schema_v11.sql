-- ============================================================
-- MUTCU DMS Schema v11 — Attendance Tracking
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES spiritual_calendar(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  session_date DATE NOT NULL,
  session_type VARCHAR(50) DEFAULT 'sunday_service',
  spiritual_year VARCHAR(20),
  opened_by UUID REFERENCES users(id),
  closed_by UUID REFERENCES users(id),
  is_open BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_by UUID REFERENCES users(id),
  method VARCHAR(20) DEFAULT 'manual',
  UNIQUE(session_id, user_id)
);

ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_sessions' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON attendance_sessions FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'attendance_records' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON attendance_records FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(user_id);