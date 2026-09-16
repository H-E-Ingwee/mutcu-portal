-- ============================================================
-- MUTCU EC Leadership Update — 2025/2026 Executive Council
-- Run this in Supabase SQL Editor
-- Updates appointments table with current EC names and roles
-- ============================================================

-- Step 1: Get or create positions (ensure they exist)
INSERT INTO ec_positions (title, short_title, display_order, gender_constraint, max_terms, is_active)
VALUES
  ('Chairperson', 'Chair', 1, NULL, 1, true),
  ('1st Vice Chairperson', '1st VP', 2, 'female', 2, true),
  ('2nd Vice Chairperson', '2nd VP', 3, 'male', 2, true),
  ('CU Secretary', 'Secretary', 4, NULL, 2, true),
  ('Vice Secretary', 'Vice Sec', 5, NULL, 2, true),
  ('CU Treasurer', 'Treasurer', 6, NULL, 2, true),
  ('Bible Study & Training Coordinator', 'BS&T Coord', 7, NULL, 2, true),
  ('Prayer Ministry Coordinator', 'Prayer Coord', 8, NULL, 2, true),
  ('Missions & Evangelism Coordinator', 'Missions Coord', 9, NULL, 2, true),
  ('Music Ministry Coordinator', 'Music Coord', 10, NULL, 2, true),
  ('Technical & Media Coordinator', 'Tech Coord', 11, NULL, 2, true),
  ('Creative Arts Coordinator', 'Creative Coord', 12, NULL, 2, true)
ON CONFLICT (title) DO UPDATE SET
  display_order = EXCLUDED.display_order,
  is_active = true;

-- Step 2: Mark all current appointments as not current (will re-set below)
UPDATE appointments SET is_current = false WHERE is_current = true;

-- Step 3: Get position IDs and insert current EC
-- We use a DO block to handle the inserts with position lookups

DO $$
DECLARE
  pos_id UUID;
  user_id_var UUID;
  cycle_id_var UUID;
BEGIN
  -- Get or create a cycle for 2025/2026
  SELECT id INTO cycle_id_var FROM nomination_cycles WHERE spiritual_year = '2025/2026' LIMIT 1;

  -- Insert Chairperson — Purdri Kihika
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Chairperson' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Purdri%' OR name ILIKE '%Kihika%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert 1st VP — Purity Njeri
  SELECT id INTO pos_id FROM ec_positions WHERE title = '1st Vice Chairperson' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Purity%' OR name ILIKE '%Njeri%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert 2nd VP — David Kimani
  SELECT id INTO pos_id FROM ec_positions WHERE title = '2nd Vice Chairperson' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%David%Kimani%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Secretary — Faith Wavinya
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'CU Secretary' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Faith%' OR name ILIKE '%Wavinya%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Vice Secretary — Natasha Amani
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Vice Secretary' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Natasha%' OR name ILIKE '%Amani%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Treasurer — Mercy Mwaura
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'CU Treasurer' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Mercy%Mwaura%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert BS&T Coordinator — Caleb Esere
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Bible Study & Training Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Caleb%' OR name ILIKE '%Esere%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Prayer Coordinator — Martha Thuku
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Prayer Ministry Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Martha%' OR name ILIKE '%Thuku%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Missions Coordinator — Mercy Mutuku
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Missions & Evangelism Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Mercy%Mutuku%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Music Coordinator — Peter Vaati
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Music Ministry Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Peter%' OR name ILIKE '%Vaati%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Technical Coordinator — John Mwanthi
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Technical & Media Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%John%Mwanthi%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

  -- Insert Creative Arts Coordinator — Esther Karimeri
  SELECT id INTO pos_id FROM ec_positions WHERE title = 'Creative Arts Coordinator' LIMIT 1;
  SELECT id INTO user_id_var FROM users WHERE name ILIKE '%Esther%' OR name ILIKE '%Karimeri%' LIMIT 1;
  IF pos_id IS NOT NULL AND user_id_var IS NOT NULL THEN
    UPDATE appointments SET is_current = false WHERE position_id = pos_id;
    INSERT INTO appointments (position_id, user_id, cycle_id, spiritual_year, term_number, commissioned_at, is_current)
    VALUES (pos_id, user_id_var, cycle_id_var, '2025/2026', 1, NOW(), true)
    ON CONFLICT DO NOTHING;
    UPDATE appointments SET is_current = true WHERE position_id = pos_id AND user_id = user_id_var;
  END IF;

END $$;

-- Step 4: Also update roles for EC members found in users table
UPDATE users SET role = 'ec_admin' WHERE name ILIKE '%Purdri%' OR name ILIKE '%Kihika%';
UPDATE users SET role = '1st_vp' WHERE name ILIKE '%Purity%Njeri%';
UPDATE users SET role = '2nd_vp' WHERE name ILIKE '%David%Kimani%';
UPDATE users SET role = 'cu_secretary' WHERE name ILIKE '%Faith%Wavinya%';
UPDATE users SET role = 'vice_secretary' WHERE name ILIKE '%Natasha%Amani%';
UPDATE users SET role = 'cu_treasurer' WHERE name ILIKE '%Mercy%Mwaura%';
UPDATE users SET role = 'bible_study_coordinator' WHERE name ILIKE '%Caleb%Esere%';
UPDATE users SET role = 'prayer_coordinator' WHERE name ILIKE '%Martha%Thuku%';
UPDATE users SET role = 'missions_coordinator' WHERE name ILIKE '%Mercy%Mutuku%';
UPDATE users SET role = 'music_coordinator' WHERE name ILIKE '%Peter%Vaati%';
UPDATE users SET role = 'tech_media_coordinator' WHERE name ILIKE '%John%Mwanthi%';
UPDATE users SET role = 'creative_arts_coordinator' WHERE name ILIKE '%Esther%Karimeri%';

-- Step 5: Verify current EC
SELECT
  p.title as position,
  u.name as member_name,
  u.role,
  a.spiritual_year,
  a.is_current
FROM appointments a
JOIN ec_positions p ON p.id = a.position_id
JOIN users u ON u.id = a.user_id
WHERE a.is_current = true
ORDER BY p.display_order;