-- MUTCU DMS Schema v5 — Run in Supabase SQL Editor
-- Major update: diploma/degree, multi-ministry, NC formation, faith renewal,
-- by-nominations, patron role, interim EC, advisory board, treasurer module,
-- constitution viewer, leadership history manual entry, notification improvements

-- ── 1. Users table additions ──────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_type VARCHAR(20) DEFAULT 'degree'; -- 'degree' | 'diploma'
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_ministry VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS faith_declaration_renewed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pending_changes JSONB; -- stores requested changes awaiting approval
ALTER TABLE users ADD COLUMN IF NOT EXISTS patron_notes TEXT; -- notes from patron

-- ── 2. Nomination Cycles additions ───────────────────────────────────────────
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS nc_formation_date DATE;
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS nomination_sunday DATE; -- the Sunday nominations open
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS nomination_close_time TIME DEFAULT '17:00:00'; -- 5pm close
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS nc_dissolution_date DATE; -- 21 days after AGM
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS data_deletion_date DATE; -- 2 weeks after AGM
ALTER TABLE nomination_cycles ADD COLUMN IF NOT EXISTS chairperson_gender VARCHAR(10); -- 'male' | 'female' — determines VP gender constraints

-- ── 3. NC Members additions ───────────────────────────────────────────────────
-- nc_role: 'chairperson' | 'secretary' | 'member'
-- Already has nc_role column — just update the allowed values

-- ── 4. Recommendations — add anonymous suggestion flag ────────────────────────
-- free_text_suggestions already has suggester_id — we need to hide it from NC view
ALTER TABLE free_text_suggestions ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT TRUE;

-- ── 5. Leadership History — manual entry support ──────────────────────────────
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT FALSE;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id);

-- ── 6. Advisory Board table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS advisory_board (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- can be non-member (staff)
  email VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'member', -- 'chairperson' | 'member'
  spiritual_year VARCHAR(20),
  appointed_by UUID REFERENCES users(id),
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE advisory_board ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'advisory_board' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON advisory_board FOR ALL USING (true);
  END IF;
END $$;

-- ── 7. Patron table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patrons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  department VARCHAR(100),
  role VARCHAR(30) DEFAULT 'patron', -- 'patron' | 'assistant_patron'
  is_active BOOLEAN DEFAULT TRUE,
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  appointed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE patrons ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'patrons' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON patrons FOR ALL USING (true);
  END IF;
END $$;

-- ── 8. Interim EC table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS interim_ec (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position_title VARCHAR(100) NOT NULL,
  spiritual_year VARCHAR(20) NOT NULL,
  session VARCHAR(20) DEFAULT 'may_august', -- 'may_august'
  appointed_by UUID REFERENCES users(id),
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interim_ec ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'interim_ec' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON interim_ec FOR ALL USING (true);
  END IF;
END $$;

-- ── 9. Treasurer Module — Requisitions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_number VARCHAR(30) UNIQUE,
  title VARCHAR(200) NOT NULL,
  ministry VARCHAR(100),
  purpose TEXT,
  requested_by UUID REFERENCES users(id) ON DELETE CASCADE,
  ministry_chairperson_id UUID REFERENCES users(id), -- EC member who endorses
  items JSONB NOT NULL DEFAULT '[]', -- [{description, quantity, unit_cost, total}]
  total_requested DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_approved DECIMAL(12,2),
  status VARCHAR(30) DEFAULT 'pending',
  -- Status flow: pending → endorsed → under_review → approved/partially_approved/rejected → disbursed
  endorsed_by UUID REFERENCES users(id),   -- Ministry Chairperson (EC member)
  reviewed_by UUID REFERENCES users(id),   -- CU Treasurer (cu_secretary)
  approved_by UUID REFERENCES users(id),   -- Chairperson of Union (ec_admin)
  endorsement_note TEXT,
  review_notes TEXT,
  approval_notes TEXT,
  endorsed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  spiritual_year VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE requisitions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisitions' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON requisitions FOR ALL USING (true);
  END IF;
END $$;

-- Auto-generate requisition numbers
CREATE SEQUENCE IF NOT EXISTS requisition_seq START 1;
CREATE OR REPLACE FUNCTION generate_requisition_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requisition_number IS NULL THEN
    NEW.requisition_number := 'REQ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('requisition_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_requisition_number ON requisitions;
CREATE TRIGGER set_requisition_number
  BEFORE INSERT ON requisitions
  FOR EACH ROW EXECUTE FUNCTION generate_requisition_number();

-- ── 10. By-Nominations table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS by_nominations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cycle_id UUID REFERENCES nomination_cycles(id) ON DELETE CASCADE,
  position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL, -- 'resignation' | 'termination' | 'vacancy'
  vacated_by UUID REFERENCES users(id), -- the member who left
  status VARCHAR(30) DEFAULT 'open', -- 'open' | 'in_progress' | 'completed' | 'cancelled'
  by_nc_members JSONB DEFAULT '[]', -- array of user_ids forming the by-NC (5 members)
  nominee_id UUID REFERENCES users(id),
  objection_deadline DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE by_nominations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'by_nominations' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON by_nominations FOR ALL USING (true);
  END IF;
END $$;

-- ── 11. Ministry Announcements (ministry-specific content) ────────────────────
CREATE TABLE IF NOT EXISTS ministry_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ministry_name VARCHAR(100) NOT NULL,
  content_type VARCHAR(50) NOT NULL, -- 'meeting_schedule' | 'announcement' | 'activity'
  title VARCHAR(200) NOT NULL,
  body TEXT,
  meeting_day VARCHAR(20), -- 'Monday' | 'Tuesday' etc.
  meeting_time TIME,
  meeting_venue VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ministry_content ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministry_content' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON ministry_content FOR ALL USING (true);
  END IF;
END $$;

-- ── 12. Update mutcu_notifications for push support ───────────────────────────
ALTER TABLE mutcu_notifications ADD COLUMN IF NOT EXISTS push_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE mutcu_notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';
-- category: 'general' | 'approval' | 'nomination' | 'announcement' | 'disciplinary' | 'ministry'

-- ── 13. Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_requisitions_status ON requisitions(status);
CREATE INDEX IF NOT EXISTS idx_requisitions_requested_by ON requisitions(requested_by);
CREATE INDEX IF NOT EXISTS idx_by_nominations_cycle ON by_nominations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_ministry_content_ministry ON ministry_content(ministry_name);
CREATE INDEX IF NOT EXISTS idx_advisory_board_active ON advisory_board(is_active);
CREATE INDEX IF NOT EXISTS idx_interim_ec_year ON interim_ec(spiritual_year);

-- ── 14. Update faith declaration text in system_settings ─────────────────────
INSERT INTO system_settings (key, value, label, category) VALUES
  ('faith_declaration_text', 'I ______, in joining this Union, I declare my faith in Jesus Christ as my Savior, my Lord and God and it is my desire by the grace of God to live a life consistent with this declaration. I am also determined to give active support to The Christian Union as it seeks to fulfill its aims.', 'Faith Declaration Text (Constitutional)', 'membership'),
  ('nc_max_members', '12', 'Maximum NC Members (Constitutional)', 'nominations'),
  ('nc_formation_days_before', '14', 'NC Formation Days Before Nomination Day', 'nominations'),
  ('nominations_min_weeks_before_agm', '3', 'Minimum Weeks Before AGM for Nominations', 'nominations'),
  ('nominees_published_weeks_before_agm', '2', 'Weeks Before AGM to Publish Nominees', 'nominations'),
  ('nc_dissolution_days_after_agm', '21', 'Days After AGM to Dissolve NC', 'nominations'),
  ('nomination_data_deletion_days', '14', 'Days After AGM to Delete Nomination Data', 'nominations')
ON CONFLICT (key) DO NOTHING;