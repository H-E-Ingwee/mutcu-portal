-- MUTCU DMS Schema v3 — Run in Supabase SQL Editor
-- Adds: system_settings, spiritual_calendar, mutcu_notifications, ministry_role column
-- Safe to run multiple times (uses IF NOT EXISTS and ON CONFLICT)

-- ── System Settings ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  label VARCHAR(200),
  category VARCHAR(50) DEFAULT 'general',
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_settings' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON system_settings FOR ALL USING (true);
  END IF;
END $$;

-- Seed default settings (safe — skips if key already exists)
INSERT INTO system_settings (key, value, label, category) VALUES
  ('app_name',                  'MUTCU DMS',                                         'Application Name',                'identity'),
  ('org_name',                  'Murang''a University of Technology Christian Union', 'Full Organization Name',          'identity'),
  ('org_short_name',            'MUTCU',                                             'Short Name',                      'identity'),
  ('org_motto',                 'Inspire Love, Hope & Godliness',                    'Motto',                           'identity'),
  ('founding_year',             '2026',                                              'Founding Year',                   'identity'),
  ('contact_email',             'admin@mutcu.org',                                   'Contact Email',                   'identity'),
  ('portal_url',                'https://portal.mutcu.org',                          'Portal URL',                      'identity'),
  ('mail_from_name',            'MUTCU DMS',                                         'Email From Name',                 'email'),
  ('mail_reply_to',             'admin@mutcu.org',                                   'Reply-To Email',                  'email'),
  ('notify_on_approval',        'true',                                              'Email on Member Approval',        'notifications'),
  ('notify_on_rejection',       'true',                                              'Email on Member Rejection',       'notifications'),
  ('notify_nominations_open',   'true',                                              'Email when Nominations Open',     'notifications'),
  ('notify_nominees_published', 'true',                                              'Email when Nominees Published',   'notifications'),
  ('notify_objection_period',   'true',                                              'Email when Objection Period Opens','notifications'),
  ('allow_self_registration',   'true',                                              'Allow Self-Registration',         'membership'),
  ('require_email_verification','true',                                              'Require Email Verification',      'membership'),
  ('default_membership_type',   'full',                                              'Default Membership Type',         'membership')
ON CONFLICT (key) DO NOTHING;

-- ── Spiritual Year Calendar ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spiritual_calendar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spiritual_year VARCHAR(20) NOT NULL,
  title VARCHAR(200) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  is_recurring BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE spiritual_calendar ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'spiritual_calendar' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON spiritual_calendar FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spiritual_calendar_year ON spiritual_calendar(spiritual_year);
CREATE INDEX IF NOT EXISTS idx_spiritual_calendar_date ON spiritual_calendar(event_date);

-- ── Notifications ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mutcu_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  type VARCHAR(50) DEFAULT 'info',
  link VARCHAR(500),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mutcu_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mutcu_notifications' AND policyname = 'Service role full access'
  ) THEN
    CREATE POLICY "Service role full access" ON mutcu_notifications FOR ALL USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON mutcu_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON mutcu_notifications(read_at);

-- ── Ministry Members — add ministry_role column ───────────────────────────────
ALTER TABLE ministry_members ADD COLUMN IF NOT EXISTS ministry_role VARCHAR(30) DEFAULT 'member';