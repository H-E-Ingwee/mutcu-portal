-- ============================================================
-- MUTCU Spiritual Calendar — September to December 2026
-- Run this in Supabase SQL Editor
-- ============================================================

-- Clear existing 2026 events to avoid duplicates
DELETE FROM spiritual_calendar WHERE EXTRACT(YEAR FROM event_date) = 2026;

-- Insert all events (matching actual schema: title, event_type, event_date, end_date, description, is_recurring, is_published, spiritual_year)
INSERT INTO spiritual_calendar (title, event_type, event_date, description, is_published, spiritual_year)
VALUES

-- ── SUNDAY SERVICES ──────────────────────────────────────────
('Academic Excellence', 'sunday_service', '2026-09-06', 'Sunday Service — Speaker: Orientation Department', true, '2026/2027'),
('Bible Study Sunday', 'sunday_service', '2026-09-13', 'Sunday Service — Speaker: Bible Study Dept', true, '2026/2027'),
('God''s Redemption Plan', 'sunday_service', '2026-09-20', 'Sunday Service — Speaker: Issa Thuo', true, '2026/2027'),
('Giving', 'sunday_service', '2026-09-27', 'Sunday Service — Speaker: Exec 2024/2025', true, '2026/2027'),
('Hermeneutics', 'sunday_service', '2026-10-04', 'Sunday Service — Speaker: Samuel Namano', true, '2026/2027'),
('Leadership', 'sunday_service', '2026-10-11', 'Sunday Service — Speaker: Daphne Kimani', true, '2026/2027'),
('Mental Health', 'sunday_service', '2026-10-18', 'Sunday Service — Speaker: Becky Wanjiru', true, '2026/2027'),
('The Life and Character of Peter', 'sunday_service', '2026-10-25', 'Sunday Service — Speaker: Samson Muturi', true, '2026/2027'),
('Christian Maturity', 'sunday_service', '2026-11-01', 'Sunday Service — Speaker: Dr. John Ndia', true, '2026/2027'),
('Holy Communion', 'sunday_service', '2026-11-08', 'Sunday Service — Speaker: Dr. Githaiga', true, '2026/2027'),
('Family Genesis', 'sunday_service', '2026-11-15', 'Sunday Service — Speaker: Nancy Oginde', true, '2026/2027'),
('Stewardship', 'sunday_service', '2026-11-22', 'Sunday Service — Speaker: Anne Kimathi', true, '2026/2027'),
('Newmatology', 'sunday_service', '2026-11-29', 'Sunday Service — Speaker: Simon Kande', true, '2026/2027'),
('Purity', 'sunday_service', '2026-12-06', 'Sunday Service — Speaker: James Njuguna', true, '2026/2027'),
('The Man Jesus', 'sunday_service', '2026-12-13', 'Sunday Service — Speaker: Rachel Mwangi', true, '2026/2027'),

-- ── FRIDAY SERVICES ──────────────────────────────────────────
('Bible Study Exposition', 'friday_service', '2026-09-11', 'Friday Service — CMF/STEM', true, '2026/2027'),
('God''s Redemptive Plan', 'friday_service', '2026-09-18', 'Friday Service — Speaker: Issa Thuo', true, '2026/2027'),
('Prayer Kesha', 'prayer', '2026-09-25', 'All-night Prayer — Prayer Department', true, '2026/2027'),
('Worship Experience', 'friday_service', '2026-10-02', 'Friday Service — Music Ministry', true, '2026/2027'),
('Creative Night', 'friday_service', '2026-10-09', 'Friday Service — Creative Ministry', true, '2026/2027'),
('Living a Balanced Life', 'friday_service', '2026-10-16', 'Friday Service — Speaker: Prof Humphrey Kirimi', true, '2026/2027'),
('Prayer Service', 'friday_service', '2026-10-23', 'Friday Service — Prayer Department', true, '2026/2027'),
('Law and Grace', 'friday_service', '2026-10-30', 'Friday Service — Speaker: Jimmy Kidavasi', true, '2026/2027'),
('Integrity', 'friday_service', '2026-11-06', 'Friday Service — Speaker: Dr Thuita', true, '2026/2027'),
('Creative Experience', 'friday_service', '2026-11-13', 'Friday Service — Creative Ministry', true, '2026/2027'),
('Praise Fest', 'friday_service', '2026-11-20', 'Friday Service — Music Ministry', true, '2026/2027'),
('Newmatology', 'friday_service', '2026-11-27', 'Friday Service — Speaker: Simon Kande', true, '2026/2027'),
('Prayer Service', 'friday_service', '2026-12-04', 'Friday Service — Prayer Department', true, '2026/2027'),
('Christmas Cantata', 'special_event', '2026-12-11', 'Christmas Cantata — Creative Ministry', true, '2026/2027'),

-- ── SPECIAL ACTIVITIES ────────────────────────────────────────
('Church Prayer Stretch & Bible Study Pastors Training', 'special_event', '2026-09-12', 'Special Activity', true, '2026/2027'),
('Prayer Walk & Evangelism Training', 'outreach', '2026-09-19', 'Prayer Walk and Evangelism Training', true, '2026/2027'),
('Spacks Ministry', 'special_event', '2026-09-22', 'Spacks Ministry Event', true, '2026/2027'),
('Leaders Retreat', 'special_event', '2026-09-26', 'Leaders Retreat', true, '2026/2027'),
('Accountability Training', 'special_event', '2026-09-27', 'Accountability Training', true, '2026/2027'),
('CREAM Hangout', 'special_event', '2026-10-03', 'Creative Arts Ministry Hangout', true, '2026/2027'),
('Apologetics Forum', 'special_event', '2026-10-04', 'Apologetics Forum', true, '2026/2027'),
('Music Training', 'special_event', '2026-10-17', 'Music Ministry Training', true, '2026/2027'),
('Mbuzi Forum', 'special_event', '2026-10-19', 'Mbuzi Forum', true, '2026/2027'),
('Ladies Retreat', 'special_event', '2026-10-20', 'Ladies Retreat', true, '2026/2027'),
('Play', 'special_event', '2026-10-28', 'Drama Ministry Play — Creative Ministry', true, '2026/2027'),
('Leaders Training', 'special_event', '2026-11-07', 'Leaders Training', true, '2026/2027'),
('Prayer Retreat', 'prayer', '2026-11-14', 'Prayer Ministry Retreat', true, '2026/2027'),
('Leaders Prayer Stretch & Ladies Initiative', 'special_event', '2026-11-21', 'Leaders Prayer Stretch and Ladies Initiative', true, '2026/2027');

-- Verify
SELECT event_type, COUNT(*) as count FROM spiritual_calendar
WHERE EXTRACT(YEAR FROM event_date) = 2026
GROUP BY event_type ORDER BY event_type;

SELECT COUNT(*) as total_events FROM spiritual_calendar
WHERE EXTRACT(YEAR FROM event_date) = 2026;