-- ============================================================
-- MUTCU DMS — Library Feature Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- ─── Library Books ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  cover_url       TEXT,
  drive_link      TEXT NOT NULL,
  is_featured     BOOLEAN DEFAULT false,
  view_count      INTEGER DEFAULT 0,
  added_by        TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── Library Articles ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_articles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  abstract    TEXT,
  link        TEXT NOT NULL,
  date        TEXT,
  read_time   TEXT,
  is_featured BOOLEAN DEFAULT false,
  view_count  INTEGER DEFAULT 0,
  added_by    TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── Bookmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_bookmarks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  book_id     UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_library_books_category ON library_books(category);
CREATE INDEX IF NOT EXISTS idx_library_bookmarks_user ON library_bookmarks(user_id);

-- ─── Seed: 35 Real Books with Google Drive Links ──────────────
INSERT INTO library_books (title, author, category, description, drive_link, is_featured) VALUES
('A Promise Kept', 'Robin Lee Hatcher', 'Relationships', 'A story of faith, marriage, and keeping ones word.', 'https://drive.google.com/open?id=1trZUZ2RbKoHEJeXNvkBAJP6o-AUBqL86', true),
('The Assignment Vol 1: The Dream & The Destiny', 'Mike Murdock', 'Purpose', 'Understanding your divine assignment and the path to your destiny.', 'https://drive.google.com/open?id=1PfPPsRm8bI3jHlZuuJWgtv2n3hG-fAe9', true),
('Becoming a Prayer Warrior', 'Elizabeth Alves', 'Faith', 'A comprehensive guide to effective, fervent prayer.', 'https://drive.google.com/open?id=17-gJ2MuyyPUTDip28eoHCVCEbxrE05DE', true),
('Sex Is Not the Problem (Lust Is)', 'Joshua Harris', 'Relationships', 'Practical wisdom for maintaining purity and overcoming lust.', 'https://drive.google.com/open?id=1JUVJ65VVo-av0kImNuLS2tEzmiMfrTkt', true),
('The Great Digital Commission', 'Unknown', 'Purpose', 'Leveraging digital platforms for the spread of the Gospel.', 'https://drive.google.com/open?id=1-wyJ2CXNf5WSsuxXHCiCRGGML7E7CQ2r', false),
('In Pursuit of Purpose', 'Myles Munroe', 'Purpose', 'Discovering the secret to a meaningful and fulfilled life.', 'https://drive.google.com/open?id=1PtkJc-VPXEZoThONNX1_jeAEEHl0ZdDa', true),
('Understanding Spiritual Gifts', 'Kay Arthur', 'Faith', 'An inductive study on discovering and using your spiritual gifts.', 'https://drive.google.com/open?id=1hHcLy6zIS09j9UkPcO4zo1G2TleqjJUs', false),
('The Sex Trap', 'Mike Murdock', 'Relationships', 'Wisdom for navigating the complexities of relationships and purity.', 'https://drive.google.com/open?id=1hLoVFzVm_2S8DyXZ4aPpclsSXCKINuFb', false),
('The Purpose-Driven Life', 'Rick Warren', 'Purpose', 'What on earth am I here for? A 40-day spiritual journey.', 'https://drive.google.com/open?id=1irc7DKqg5857nzimBchQxfZV4UVdSN5r', true),
('The Normal Christian Life', 'Watchman Nee', 'Faith', 'An exposition on the basics of Christian living and spiritual growth.', 'https://drive.google.com/open?id=1tBSBDiIKCZBunQeViywNNH3MLRIBWscH', false),
('Running with the Giants', 'John C. Maxwell', 'Leadership', 'Leadership lessons from the great heroes of faith in the Bible.', 'https://drive.google.com/open?id=1KQeQ14XfhRKxccPFtt3tFNWumH8S1yTr', true),
('Relationships 101', 'John C. Maxwell', 'Relationships', 'What every leader needs to know about building healthy relationships.', 'https://drive.google.com/open?id=1uEpHqp1vgZHmOF-z46S3WpGRE6CsC5LC', false),
('Everyone Communicates, Few Connect', 'John C. Maxwell', 'Leadership', 'Mastering the art of connecting with others for greater influence.', 'https://drive.google.com/open?id=1jgG4HdCK7g9VfIuvXrlosJA3mDYEhpmv', false),
('Grace Is Greater', 'Kyle Idleman', 'Faith', 'Discovering that Gods grace is greater than your past and mistakes.', 'https://drive.google.com/open?id=1bSyheukdeNtLaFHaMtLyLeJ7dlS1Q17P', true),
('Chasing Contentment', 'Erik Raymond', 'Faith', 'Finding true peace and contentment in the Gospel.', 'https://drive.google.com/open?id=17y7tVeUv_R00L4wPsgWgQM_Hn2WjFNn0', false),
('The Power of Christian Contentment', 'Andrew Davis', 'Faith', 'How to maintain a satisfied soul in a world of constant wanting.', 'https://drive.google.com/open?id=1rLoQI6rynfwmJeJvw4OLpntjc9bmJPr-', false),
('Jesus CEO', 'Laurie Beth Jones', 'Leadership', 'Using ancient wisdom for visionary and effective leadership.', 'https://drive.google.com/open?id=13sPBTYTLifJyzVUX1hF1CzHpjhDfJnpo', false),
('Relationship VS Fellowship', 'Unknown', 'Relationships', 'Understanding the difference between our standing and our walk with God.', 'https://drive.google.com/open?id=11hJddeFmd-0tkOnoCJiubQwTlOcACZSY', false),
('GloboChrist', 'Carl Raschke', 'Purpose', 'The Great Commission in a postmodern and globalized world.', 'https://drive.google.com/open?id=1eQYlpnkDybgqkAwmrSMvShM7zapH7A88', false),
('Exploring The Riches Of Redemption', 'Unknown', 'Faith', 'Diving deep into the benefits and realities of our redemption in Christ.', 'https://drive.google.com/open?id=1W7oP8YDaJSvTbD0a2TXe0qSkvhALzFv-', false),
('All of Grace', 'Charles Spurgeon', 'Faith', 'An earnest word with those who are seeking salvation by the Lord Jesus Christ.', 'https://drive.google.com/open?id=1j7xOz9OWT902QpwoQb3ceG9Uy4K1KEZG', false),
('Anxious for Nothing', 'Max Lucado', 'Faith', 'Gods cure for the cares of your soul based on Philippians 4.', 'https://drive.google.com/open?id=1N1cUI6qcjFg61aC5YQUXCbNsdXjJcORo', false),
('The Power of Your Potential', 'John C. Maxwell', 'Leadership', 'How to break through your limits and reach your full potential.', 'https://drive.google.com/open?id=1cYPYSPQWzzexqy0My5H0sMUU41YJvlpt', false),
('Living the Cross Centered Life', 'C.J. Mahaney', 'Faith', 'Keeping the main thing — the Gospel — the main thing in your daily life.', 'https://drive.google.com/open?id=1bFQQO91wsJy7aeKj0vXAUjOnaehdjQjZ', false),
('The Proverbs 31 Woman', 'Mike Murdock', 'Relationships', 'A study on the characteristics of the virtuous woman.', 'https://drive.google.com/open?id=17QjHHomc4FnRzDtoxeFeOXZtmFksxO8F', false),
('Finding Your Purpose in Life', 'Mike Murdock', 'Purpose', 'Simple keys to identifying and fulfilling your divine purpose.', 'https://drive.google.com/open?id=1G5bVIeo6Y3ZC4Yv1MOzcgWbeV69mdgeG', false),
('How Successful People Think', 'John C. Maxwell', 'Leadership', 'Changing your thinking to change your life and leadership.', 'https://drive.google.com/open?id=1_iLyCpr3eD8djvQcXa7SjTjhVcm89CwS', false),
('Grace: The DNA of God', 'Tony Cooke', 'Faith', 'Understanding the core nature of Gods amazing grace.', 'https://drive.google.com/open?id=1doWsSI_73OgqO_KhvuBFWkKqrux3G9EH', false),
('Good Leaders Ask Great Questions', 'John C. Maxwell', 'Leadership', 'Your foundation for successful leadership starts with asking.', 'https://drive.google.com/open?id=1w-4dpI0KG5hXzE3un2VsP2K5s1WyR3SN', false),
('New Creation Realities', 'E.W. Kenyon', 'Faith', 'A revelation of the believers identification with Christ.', 'https://drive.google.com/open?id=195E9vlgYKAlshyEACYkYaRcVspvYbKbA', false),
('Redemption Accomplished and Applied', 'John Murray', 'Faith', 'A theological look at the work of Christ and its application to us.', 'https://drive.google.com/open?id=1cMdkZPqM2yJffQIvuXqOjq7NyKCmwwgG', false),
('Healing the Scars of Emotional Abuse', 'Gregory L. Jantz', 'Relationships', 'Finding hope and healing from the wounds of the past.', 'https://drive.google.com/open?id=1jEVJwANEwjPDbb2_2QkR2srs1c9QBLgQ', false),
('The New Man Seminar Workbook', 'Unknown', 'Faith', 'A study guide on the nature and lifestyle of the new creation in Christ.', 'https://drive.google.com/open?id=1JH0Zu_Y6Y81OTfsHiiQEe4OSkCWLYEVJ', false),
('The Reality Of Sonship', 'Curry R. Blake', 'Faith', 'Living in the full authority and reality of being a child of God.', 'https://drive.google.com/open?id=1zHY7DhV82-VC1mn2-9U5vXCBZReWIN2L', false),
('What is the Great Commission?', 'R.C. Sproul', 'Purpose', 'A brief overview of the mandate given by Christ to the Church.', 'https://drive.google.com/open?id=1-PROrcHteH4Qq2QGlSojuT9C8YL7Q1sJ', false)
ON CONFLICT DO NOTHING;

-- ─── Seed: 2 Articles ─────────────────────────────────────────
INSERT INTO library_articles (title, author, abstract, link, date, read_time, is_featured) VALUES
('The Joy of the Lord is Your Strength', 'John Piper', 'An exposition on Nehemiah 8 and how finding joy in God is the fuel for Christian living.', 'https://www.desiringgod.org/messages/the-joy-of-the-lord-is-your-strength', 'Oct 12, 2025', '5 min read', true),
('Christian Leadership in the 21st Century', 'Albert Mohler', 'Challenges and opportunities for young leaders navigating a secularizing culture.', 'https://albertmohler.com/christian-leadership', 'Nov 05, 2025', '8 min read', true)
ON CONFLICT DO NOTHING;