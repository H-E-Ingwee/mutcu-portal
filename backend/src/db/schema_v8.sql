-- ============================================================
-- MUTCU DMS Schema v8 — Treasurer Financial Management Module
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── 1. BUDGETS TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spiritual_year VARCHAR(20) NOT NULL,
  ministry VARCHAR(100) NOT NULL,
  category VARCHAR(100) DEFAULT 'General',
  allocated_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(spiritual_year, ministry, category)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budgets' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON budgets FOR ALL USING (true);
  END IF;
END $$;

-- ─── 2. INCOME ENTRIES TABLE ─────────────────────────────────
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  income_number VARCHAR(30) UNIQUE,
  source VARCHAR(200) NOT NULL,           -- e.g. "Sunday Offering", "MULEWO Fundraiser", "RMC Collection"
  category VARCHAR(100) DEFAULT 'General', -- Offering, Fundraising, Donation, Grant, Other
  amount DECIMAL(12,2) NOT NULL,
  date DATE NOT NULL,
  spiritual_year VARCHAR(20),
  notes TEXT,
  received_by VARCHAR(200),               -- Name of person who received/counted
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'income_entries' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON income_entries FOR ALL USING (true);
  END IF;
END $$;

-- Auto-generate income numbers
CREATE SEQUENCE IF NOT EXISTS income_seq START 1;
CREATE OR REPLACE FUNCTION generate_income_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.income_number IS NULL THEN
    NEW.income_number := 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('income_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_income_number ON income_entries;
CREATE TRIGGER set_income_number
  BEFORE INSERT ON income_entries
  FOR EACH ROW EXECUTE FUNCTION generate_income_number();

-- ─── 3. DISBURSEMENT RECEIPTS TABLE ──────────────────────────
CREATE TABLE IF NOT EXISTS disbursement_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number VARCHAR(30) UNIQUE,
  requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
  amount_disbursed DECIMAL(12,2) NOT NULL,
  disbursed_to VARCHAR(200),              -- Name of recipient
  disbursement_method VARCHAR(50) DEFAULT 'Cash', -- Cash, M-Pesa, Bank Transfer
  reference_number VARCHAR(100),          -- M-Pesa code, cheque number, etc.
  notes TEXT,
  disbursed_by UUID REFERENCES users(id),
  disbursed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE disbursement_receipts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disbursement_receipts' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON disbursement_receipts FOR ALL USING (true);
  END IF;
END $$;

-- Auto-generate receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'RCP-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('receipt_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_receipt_number ON disbursement_receipts;
CREATE TRIGGER set_receipt_number
  BEFORE INSERT ON disbursement_receipts
  FOR EACH ROW EXECUTE FUNCTION generate_receipt_number();

-- ─── 4. REQUISITION COMMENTS TABLE ───────────────────────────
CREATE TABLE IF NOT EXISTS requisition_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,      -- Internal = treasurer/admin only; false = visible to requester
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE requisition_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'requisition_comments' AND policyname = 'Service role full access') THEN
    CREATE POLICY "Service role full access" ON requisition_comments FOR ALL USING (true);
  END IF;
END $$;

-- ─── 5. INDEXES ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(spiritual_year);
CREATE INDEX IF NOT EXISTS idx_budgets_ministry ON budgets(ministry);
CREATE INDEX IF NOT EXISTS idx_income_year ON income_entries(spiritual_year);
CREATE INDEX IF NOT EXISTS idx_income_date ON income_entries(date);
CREATE INDEX IF NOT EXISTS idx_receipts_requisition ON disbursement_receipts(requisition_id);
CREATE INDEX IF NOT EXISTS idx_req_comments_req ON requisition_comments(requisition_id);

-- ─── 6. ADD DISBURSEMENT FIELDS TO REQUISITIONS ───────────────
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS disbursed_to VARCHAR(200);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS disbursement_method VARCHAR(50) DEFAULT 'Cash';
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS disbursement_reference VARCHAR(100);
ALTER TABLE requisitions ADD COLUMN IF NOT EXISTS disbursement_notes TEXT;