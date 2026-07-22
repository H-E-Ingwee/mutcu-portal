-- MUTCU DMS Database Schema for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'full_member',
  -- MUTCU Identity
  mutcu_number VARCHAR(30) UNIQUE,
  enrollment_year INTEGER,
  enrollment_status VARCHAR(20) DEFAULT 'pending',
  -- Student Info
  student_id VARCHAR(50),
  school_prefix VARCHAR(10),
  phone VARCHAR(20),
  gender VARCHAR(10),
  year_of_study INTEGER,
  is_finalist BOOLEAN DEFAULT FALSE,
  graduation_year INTEGER,
  is_deferred BOOLEAN DEFAULT FALSE,
  -- Membership
  membership_type VARCHAR(20) DEFAULT 'full',
  membership_tier VARCHAR(20) DEFAULT 'general',
  primary_ministry_id UUID,
  primary_ministry VARCHAR(100),
  membership_year INTEGER,
  -- Faith
  faith_declaration_signed BOOLEAN DEFAULT FALSE,
  declaration_signed_at TIMESTAMPTZ,
  -- Status
  sgc_executive_role BOOLEAN DEFAULT FALSE,
  disciplinary_status VARCHAR(20) DEFAULT 'clear',
  is_active BOOLEAN DEFAULT TRUE,
  profile_complete BOOLEAN DEFAULT FALSE,
  -- Photo
  photo_url TEXT,
  photo_public_id VARCHAR(255),
  -- Auth
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_sent_at TIMESTAMPTZ,
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMPTZ,
  must_change_password BOOLEAN DEFAULT FALSE,
  is_temp_password BOOLEAN DEFAULT FALSE,
  -- Approval
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ministries ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ministries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Ministry Members ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ministry_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  ministry_id UUID REFERENCES ministries(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, ministry_id)
);

-- ── Positions ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  gender_constraint VARCHAR(10),
  max_terms INTEGER DEFAULT 2,
  chair_max_one_term BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Nomination Cycles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nomination_cycles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  spiritual_year VARCHAR(20) NOT NULL,
  cycle_type VARCHAR(20) DEFAULT 'annual',
  prayer_start_date DATE,
  nomination_open_date DATE,
  nomination_close_date DATE,
  nc_formation_deadline DATE,
  vetting_deadline DATE,
  publication_date DATE,
  objection_deadline DATE,
  agm_date DATE,
  status VARCHAR(30) DEFAULT 'setup',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NC Members ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nc_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nc_role VARCHAR(20) DEFAULT 'member',
  appointed_by UUID REFERENCES users(id),
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ── Recommendations ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  recommender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prayerful_note TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, position_id, recommender_id)
);

-- ── Free Text Suggestions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS free_text_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  suggester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  suggested_name VARCHAR(100) NOT NULL,
  description TEXT,
  why_recommend TEXT,
  nc_action VARCHAR(20) DEFAULT 'pending',
  linked_user_id UUID REFERENCES users(id),
  nc_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vetting Decisions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vetting_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  nc_member_id UUID REFERENCES users(id),
  decision VARCHAR(20) NOT NULL,
  reason TEXT,
  ai_summary TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, position_id, candidate_id)
);

-- ── Nominees ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nominees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES users(id)
);

-- ── Objections ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  nominee_id UUID REFERENCES nominees(id) ON DELETE CASCADE,
  objector_id UUID REFERENCES users(id) ON DELETE CASCADE,
  grounds TEXT NOT NULL,
  nc_decision VARCHAR(30),
  nc_decision_reason TEXT,
  decided_by UUID REFERENCES users(id),
  decided_at TIMESTAMPTZ,
  is_sealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Appointments ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id),
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  term_number INTEGER DEFAULT 1,
  spiritual_year VARCHAR(20),
  commissioned_at TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: Ministries ───────────────────────────────────────────────────────
INSERT INTO ministries (name, slug, display_order) VALUES
  ('Prayer Ministry', 'prayer', 1),
  ('Music Ministry', 'music', 2),
  ('Missions & Evangelism Ministry', 'missions', 3),
  ('Bible Study & Training Ministry', 'bible-study', 4),
  ('Discipleship Ministry', 'discipleship', 5),
  ('Technical & Media Ministry', 'tech-media', 6),
  ('Creative Arts Ministry', 'creative-arts', 7),
  ('Hospitality Ministry', 'hospitality', 8),
  ('Welfare Ministry', 'welfare', 9)
ON CONFLICT (slug) DO NOTHING;

-- ── Seed: Positions ────────────────────────────────────────────────────────
INSERT INTO positions (title, slug, gender_constraint, max_terms, chair_max_one_term, display_order) VALUES
  ('Chairperson', 'chairperson', NULL, 1, TRUE, 1),
  ('1st Vice Chairperson', '1st-vice-chairperson', 'female', 2, FALSE, 2),
  ('2nd Vice Chairperson', '2nd-vice-chairperson', 'male', 2, FALSE, 3),
  ('Secretary', 'secretary', NULL, 2, FALSE, 4),
  ('Vice Secretary', 'vice-secretary', NULL, 2, FALSE, 5),
  ('Treasurer', 'treasurer', NULL, 2, FALSE, 6),
  ('Prayer Coordinator', 'prayer-coordinator', NULL, 2, FALSE, 7),
  ('Music Coordinator', 'music-coordinator', NULL, 2, FALSE, 8),
  ('Missions & Evangelism Coordinator', 'missions-coordinator', NULL, 2, FALSE, 9),
  ('Bible Study & Training Coordinator', 'bible-study-coordinator', NULL, 2, FALSE, 10),
  ('Discipleship Coordinator', 'discipleship-coordinator', NULL, 2, FALSE, 11),
  ('Technical & Media Coordinator', 'tech-media-coordinator', NULL, 2, FALSE, 12),
  ('Creative Arts Coordinator', 'creative-arts-coordinator', NULL, 2, FALSE, 13)
ON CONFLICT (slug) DO NOTHING;

-- ── Row Level Security (RLS) ───────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nomination_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our backend uses service key)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ministries FOR ALL USING (true);
CREATE POLICY "Service role full access" ON positions FOR ALL USING (true);
CREATE POLICY "Service role full access" ON nomination_cycles FOR ALL USING (true);
CREATE POLICY "Service role full access" ON recommendations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON nominees FOR ALL USING (true);
CREATE POLICY "Service role full access" ON appointments FOR ALL USING (true);
