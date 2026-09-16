-- ============================================================
-- MUTCU Spiritual Calendar — September to December 2026
-- Run this in Supabase SQL Editor
-- ============================================================

-- Clear existing 2026 events to avoid duplicates
DELETE FROM spiritual_calendar WHERE EXTRACT(YEAR FROM event_date) = 2026;

-- Insert all events
INSERT INTO spiritual_calendar (title, event_date, event_time, event_type, description, speaker, venue, is_published, spiritual_year)
VALUES

-- ── SUNDAY SERVICES ──────────────────────────────────────────
('Academic Excellence', '2026-09-06', '09:00', 'sunday_service', 'Sunday Service — Orientation Department', 'Orientation Department', 'Main Hall', true, '2026/2027'),
('Bible Study Sunday', '2026-09-13', '09:00', 'sunday_service', 'Sunday Service — Bible Study Department', 'Bible Study Dept', 'Main Hall', true, '2026/2027'),
('God''s Redemption Plan', '2026-09-20', '09:00', 'sunday_service', 'Sunday Service', 'Issa Thuo', 'Main Hall', true, '2026/2027'),
('Giving', '2026-09-27', '09:00', 'sunday_service', 'Sunday Service — Exec 2024/2025', 'Exec 2024/2025', 'Main Hall', true, '2026/2027'),
('Hermeneutics', '2026-10-04', '09:00', 'sunday_service', 'Sunday Service', 'Samuel Namano', 'Main Hall', true, '2026/2027'),
('Leadership', '2026-10-11', '09:00', 'sunday_service', 'Sunday Service', 'Daphne Kimani', 'Main Hall', true, '2026/2027'),
('Mental Health', '2026-10-18', '09:00', 'sunday_service', 'Sunday Service', 'Becky Wanjiru', 'Main Hall', true, '2026/2027'),
('The Life and Character of Peter', '2026-10-25', '09:00', 'sunday_service', 'Sunday Service', 'Samson Muturi', 'Main Hall', true, '2026/2027'),
('Christian Maturity', '2026-11-01', '09:00', 'sunday_service', 'Sunday Service', 'Dr. John Ndia', 'Main Hall', true, '2026/2027'),
('Holy Communion', '2026-11-08', '09:00', 'sunday_service', 'Sunday Service', 'Dr. Githaiga', 'Main Hall', true, '2026/2027'),
('Family Genesis', '2026-11-15', '09:00', 'sunday_service', 'Sunday Service', 'Nancy Oginde', 'Main Hall', true, '2026/2027'),
('Stewardship', '2026-11-22', '09:00', 'sunday_service', 'Sunday Service', 'Anne Kimathi', 'Main Hall', true, '2026/2027'),
('Newmatology', '2026-11-29', '09:00', 'sunday_service', 'Sunday Service', 'Simon Kande', 'Main Hall', true, '2026/2027'),
('Purity', '2026-12-06', '09:00', 'sunday_service', 'Sunday Service', 'James Njuguna', 'Main Hall', true, '2026/2027'),
('The Man Jesus', '2026-12-13', '09:00', 'sunday_service', 'Sunday Service', 'Rachel Mwangi', 'Main Hall', true, '2026/2027'),

-- ── FRIDAY SERVICES ──────────────────────────────────────────
('Bible Study Exposition', '2026-09-11', '18:00', 'friday_service', 'Friday Service — CMF/STEM', 'CMF/STEM', 'Main Hall', true, '2026/2027'),
('God''s Redemptive Plan', '2026-09-18', '18:00', 'friday_service', 'Friday Service', 'Issa Thuo', 'Main Hall', true, '2026/2027'),
('Prayer Kesha', '2026-09-25', '18:00', 'kesha', 'All-night Prayer — Prayer Department', 'Prayer Department', 'Main Hall', true, '2026/2027'),
('Worship Experience', '2026-10-02', '18:00', 'friday_service', 'Friday Service — Music Ministry', 'Music Ministry', 'Main Hall', true, '2026/2027'),
('Creative Night', '2026-10-09', '18:00', 'friday_service', 'Friday Service — Creative Ministry', 'Creative Ministry', 'Main Hall', true, '2026/2027'),
('Living a Balanced Life', '2026-10-16', '18:00', 'friday_service', 'Friday Service', 'Prof Humphrey Kirimi', 'Main Hall', true, '2026/2027'),
('Prayer Service', '2026-10-23', '18:00', 'friday_service', 'Friday Service — Prayer Department', 'Prayer Department', 'Main Hall', true, '2026/2027'),
('Law and Grace', '2026-10-30', '18:00', 'friday_service', 'Friday Service', 'Jimmy Kidavasi', 'Main Hall', true, '2026/2027'),
('Integrity', '2026-11-06', '18:00', 'friday_service', 'Friday Service', 'Dr Thuita', 'Main Hall', true, '2026/2027'),
('Creative Experience', '2026-11-13', '18:00', 'friday_service', 'Friday Service — Creative Ministry', 'Creative Ministry', 'Main Hall', true, '2026/2027'),
('Praise Fest', '2026-11-20', '18:00', 'friday_service', 'Friday Service — Music Ministry', 'Music Ministry', 'Main Hall', true, '2026/2027'),
('Newmatology', '2026-11-27', '18:00', 'friday_service', 'Friday Service', 'Simon Kande', 'Main Hall', true, '2026/2027'),
('Prayer Service', '2026-12-04', '18:00', 'friday_service', 'Friday Service — Prayer Department', 'Prayer Department', 'Main Hall', true, '2026/2027'),
('Christmas Cantata', '2026-12-11', '18:00', 'special_event', 'Christmas Cantata — Creative Ministry', 'Creative Ministry', 'Main Hall', true, '2026/2027'),

-- ── SPECIAL ACTIVITIES ────────────────────────────────────────
('Church Prayer Stretch & Bible Study Pastor''s Training', '2026-09-12', '08:00', 'special_event', 'Special Activity', NULL, 'TBA', true, '2026/2027'),
('Prayer Walk & Evangelism Training', '2026-09-19', '07:00', 'outreach', 'Prayer Walk and Evangelism Training', NULL, 'Campus', true, '2026/2027'),
('Spacks Ministry', '2026-09-22', '14:00', 'special_event', 'Spacks Ministry Event', NULL, 'TBA', true, '2026/2027'),
('Leaders Retreat', '2026-09-26', '08:00', 'special_event', 'Leaders Retreat', NULL, 'TBA', true, '2026/2027'),
('Accountability Training', '2026-09-27', '14:00', 'special_event', 'Accountability Training', NULL, 'TBA', true, '2026/2027'),
('CREAM Hangout', '2026-10-03', '14:00', 'special_event', 'Creative Arts Ministry Hangout', NULL, 'TBA', true, '2026/2027'),
('Apologetics Forum', '2026-10-04', '14:00', 'special_event', 'Apologetics Forum', NULL, 'TBA', true, '2026/2027'),
('Music Training', '2026-10-17', '14:00', 'special_event', 'Music Ministry Training', NULL, 'TBA', true, '2026/2027'),
('Mbuzi Forum', '2026-10-19', '14:00', 'special_event', 'Mbuzi Forum', NULL, 'TBA', true, '2026/2027'),
('Ladies Retreat', '2026-10-20', '08:00', 'special_event', 'Ladies Retreat', NULL, 'TBA', true, '2026/2027'),
('Play', '2026-10-28', '18:00', 'special_event', 'Drama Ministry Play', 'Creative Ministry', 'Main Hall', true, '2026/2027'),
('Leaders Training', '2026-11-07', '08:00', 'special_event', 'Leaders Training', NULL, 'TBA', true, '2026/2027'),
('Prayer Retreat', '2026-11-14', '08:00', 'special_event', 'Prayer Ministry Retreat', 'Prayer Department', 'TBA', true, '2026/2027'),
('Leaders Prayer Stretch & Ladies Initiative', '2026-11-21', '08:00', 'special_event', 'Leaders Prayer Stretch and Ladies Initiative', NULL, 'TBA', true, '2026/2027');

-- Verify
SELECT COUNT(*) as total_events, event_type, COUNT(*) as count
FROM spiritual_calendar
WHERE EXTRACT(YEAR FROM event_date) = 2026
GROUP BY event_type
ORDER BY event_type;