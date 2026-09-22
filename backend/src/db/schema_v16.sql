-- ============================================================
-- MUTCU DMS Schema v16 — Dual Roles & Hard Delete Support
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add secondary_role column for dual-role support
--    Allows a member to hold e.g. music_coordinator + nc_chair simultaneously
--    so they keep ministry access while serving on the NC
ALTER TABLE users ADD COLUMN IF NOT EXISTS secondary_role VARCHAR(50) DEFAULT NULL;

-- Index for secondary role queries
CREATE INDEX IF NOT EXISTS idx_users_secondary_role ON users(secondary_role) WHERE secondary_role IS NOT NULL;

-- 2. Add deleted_at soft-delete timestamp (if not already present)
--    Used to mark deleted members without removing their audit trail
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for deleted_at queries
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Ensure enrollment_status has 'deleted' as a valid value
--    (Supabase uses text columns so no enum change needed, but document it)
-- Valid enrollment_status values: pending, active, rejected, deleted, suspended

-- 4. Add audit_logs table if not exists (for hard delete tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- 5. Comment documenting dual role usage
COMMENT ON COLUMN users.secondary_role IS 
  'Secondary role for dual-role members (e.g. EC coordinator who is also NC Chair). 
   Limited to NC roles (nc_chair, nc_secretary, nc_member) and Interim EC roles.
   The requireRole() middleware checks both role and secondary_role.';

COMMENT ON COLUMN users.deleted_at IS
  'Timestamp when account was hard-deleted (soft delete marker). 
   Hard-deleted accounts have enrollment_status=deleted and are excluded from all analytics.';
