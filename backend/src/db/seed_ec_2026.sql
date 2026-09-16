-- ============================================================
-- MUTCU EC Leadership Update — 2025/2026 Executive Council
-- Run this in Supabase SQL Editor
-- Table: positions (not ec_positions), appointments
-- ============================================================

-- Step 1: Verify positions exist (they should from schema.sql seed)
SELECT title, slug, id FROM positions ORDER BY display_order;

-- Step 2: Update roles for EC members found in users table
-- (Run this after EC members have registered in the system)
UPDATE users SET role = 'ec_admin'
  WHERE name ILIKE '%Purdri%' OR name ILIKE '%Kihika%';

UPDATE users SET role = '1st_vp'
  WHERE (name ILIKE '%Purity%' AND name ILIKE '%Njeri%');

UPDATE users SET role = '2nd_vp'
  WHERE (name ILIKE '%David%' AND name ILIKE '%Kimani%');

UPDATE users SET role = 'cu_secretary'
  WHERE (name ILIKE '%Faith%' AND name ILIKE '%Wavinya%');

UPDATE users SET role = 'vice_secretary'
  WHERE (name ILIKE '%Natasha%' AND name ILIKE '%Amani%');

UPDATE users SET role = 'cu_treasurer'
  WHERE (name ILIKE '%Mercy%' AND name ILIKE '%Mwaura%');

UPDATE users SET role = 'bible_study_coordinator'
  WHERE (name ILIKE '%Caleb%' AND name ILIKE '%Esere%');

UPDATE users SET role = 'prayer_coordinator'
  WHERE (name ILIKE '%Martha%' AND name ILIKE '%Thuku%');

UPDATE users SET role = 'missions_coordinator'
  WHERE (name ILIKE '%Mercy%' AND name ILIKE '%Mutuku%');

UPDATE users SET role = 'music_coordinator'
  WHERE (name ILIKE '%Peter%' AND name ILIKE '%Vaati%');

UPDATE users SET role = 'tech_media_coordinator'
  WHERE (name ILIKE '%John%' AND name ILIKE '%Mwanthi%');

UPDATE users SET role = 'creative_arts_coordinator'
  WHERE (name ILIKE '%Esther%' AND name ILIKE '%Karimeri%');

-- Step 3: Mark all current appointments as not current
UPDATE appointments SET is_current = false WHERE is_current = true;

-- Step 4: Insert current EC appointments using DO block
DO $$
DECLARE
  pos_id UUID;
  user_id_var UUID;
  cycle_id_var UUID;
BEGIN
  -- Get latest cycle (or NULL if none)
  SELECT id INTO cycle_id_var FROM nomination_cycles
    WHERE spiritual_year = '2025/2026' ORDER BY created_at DESC LIMIT 1;

  -- Chairperson — Purdri Kihika
  SELECT id INTO pos_id FROM positions WHERE slug = 'chairperson';
  SELECT id INTO user_id_var FROM users
    WHERE (name ILIKE '%Purdri%' OR name ILIKE '%Kihika%') AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- 1st Vice Chairperson — Purity Njeri
  SELECT id INTO pos_id FROM positions WHERE slug = '1st-vice-chairperson';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Purity%' AND name ILIKE '%Njeri%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- 2nd Vice Chairperson — David Kimani
  SELECT id INTO pos_id FROM positions WHERE slug = '2nd-vice-chairperson';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%David%' AND name ILIKE '%Kimani%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Secretary — Faith Wavinya
  SELECT id INTO pos_id FROM positions WHERE slug = 'secretary';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Faith%' AND name ILIKE '%Wavinya%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Vice Secretary — Natasha Amani
  SELECT id INTO pos_id FROM positions WHERE slug = 'vice-secretary';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Natasha%' AND name ILIKE '%Amani%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Treasurer — Mercy Mwaura
  SELECT id INTO pos_id FROM positions WHERE slug = 'treasurer';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Mercy%' AND name ILIKE '%Mwaura%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Prayer Coordinator — Martha Thuku
  SELECT id INTO pos_id FROM positions WHERE slug = 'prayer-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Martha%' AND name ILIKE '%Thuku%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Music Coordinator — Peter Vaati
  SELECT id INTO pos_id FROM positions WHERE slug = 'music-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Peter%' AND name ILIKE '%Vaati%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Missions Coordinator — Mercy Mutuku
  SELECT id INTO pos_id FROM positions WHERE slug = 'missions-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Mercy%' AND name ILIKE '%Mutuku%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Bible Study Coordinator — Caleb Esere
  SELECT id INTO pos_id FROM positions WHERE slug = 'bible-study-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Caleb%' AND name ILIKE '%Esere%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Technical Coordinator — John Mwanthi
  SELECT id INTO pos_id FROM positions WHERE slug = 'tech-media-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%John%' AND name ILIKE '%Mwanthi%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

  -- Creative Arts Coordinator — Esther Karimeri
  SELECT id INTO pos_id FROM positions WHERE slug = 'creative-arts-coordinator';
  SELECT id INTO user_id_var FROM users
    WHERE name ILIKE '%Esther%' AND name ILIKE '%Karimeri%' AND deleted_at IS NULL LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true
      WHERE position_id = pos_id AND user_id = user_id_var AND spiritual_year = '2025/2026';
  END IF;

END $$;

-- Step 5: Verify current EC
SELECT
  p.title as position,
  u.name as member_name,
  u.role,
  a.spiritual_year,
  a.is_current
FROM appointments a
JOIN positions p ON p.id = a.position_id
JOIN users u ON u.id = a.user_id
WHERE a.is_current = true
ORDER BY p.display_order;