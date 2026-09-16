-- ============================================================
-- MUTCU Budget Seed — JAN-APR 2025 (Semester Two, 2024-2025)
-- Run this directly in Supabase SQL Editor
-- Official MUTCU Approved Budget — Total: KES 264,604
-- ============================================================

-- Step 1: Ensure the 2024/2025 financial year exists
INSERT INTO financial_years (label, start_date, end_date, is_active, is_closed, notes)
VALUES ('2024/2025', '2024-09-01', '2025-08-31', false, false, 'Academic year 2024/2025 — Semester Two budget (Jan-Apr 2025)')
ON CONFLICT (label) DO NOTHING;

-- Step 2: Insert all budget rows
INSERT INTO budgets (spiritual_year, ministry, category, allocated_amount, notes, updated_at)
VALUES
  ('2024/2025', 'General / Administration', 'General', 60010,
   'Admin: speakers appreciation (9 Sundays 1800, 2 Fridays 3000), airtime (1160), ream papers (3900), ink (150), glue (40), leaders appreciation/certificates (4290), support 2 people x 4 months (8000), cabinet repairs (2000), RSEC meetings (3800), B/S leaders summit (700), banner (2000), box file (200), envelopes (35), petty cash vouchers (105), petty cash (2000), miscellaneous (10000)',
   NOW()),

  ('2024/2025', 'Hospitality Ministry', 'Welfare', 2000,
   'Ladies Fellowship welfare support',
   NOW()),

  ('2024/2025', 'Hospitality Ministry', 'Events', 36070,
   'Hospitality and Carry the Love: milk (4725), bread (3780), blueband (300), kahawa (1400), sugar 12kg (1140), tea leaves (150), chocolate (1960), mandazis (35), gas refill x2 (1350), water 3@380 (240), cling film (480), foil (240), serviettes (1920), menengai (1120), washing sponge (320), bucket (1500), cooking oil 7L (1920), cooking fat (200), wheat flour (100), butternut (2200), lemon (360), salt (360), rice 9kg (420), maize flour, cabbage (960), skuma (2400), eggs (800), ndengu (160), onions 12kg (320), tomatoes 16kg (220), potatoes 16 tins (800), carrots (150), capsicum (1500), coriander, ginger, garlic, soy sauce (400), pilau masala, transport, sieve, sufuria lid, water glass, charcoal (400), holy communion cups',
   NOW()),

  ('2024/2025', 'Hospitality Ministry', 'General', 7675,
   'Associates Sunday: rice 7.5kg (1360), minji 7.5kg (1200), wheat flour (750), dhania (40), onions 7kg (300), tomatoes 5kg (120), hoho (520), cabbage (210), potatoes 4 tins (1140), carrots 3kg (60), pineapples (75), water 4@380 (250), ginger (700), garlic (50), cooking oil (300), charcoal (280), soda (40)',
   NOW()),

  ('2024/2025', 'Welfare Committee', 'Welfare', 15000,
   'Welfare support for members in need',
   NOW()),

  ('2024/2025', 'Welfare Committee', 'Events', 2015,
   'Sports Day: biscuits 7 cartons@245 (1715), glucose (300)',
   NOW()),

  ('2024/2025', 'Prayer Ministry', 'General', 4195,
   'Prayer docket: speaker appreciation (3000), airtime 4 months (400), livestreaming (150), eggs (150), milk (300), bread 3@65 (195)',
   NOW()),

  ('2024/2025', 'Creative Arts Ministry', 'Events', 13400,
   'Creative docket: manilla papers 9@30 (270), mark pens (900), banner (2000), dance training appreciation (1000), tea (140), creative experience decoration x2 (1500), film production appreciation (5000), food for 5 days — breakfast bread+milk+eggs (1400), supper 3 days rice+ndengu+cabbage+potatoes (750), supper 2 days maize flour+kales+eggs+meat+onions+tomatoes (1040)',
   NOW()),

  ('2024/2025', 'Creative Arts Ministry', 'General', 800,
   'Airtime for Creative Arts Ministry',
   NOW()),

  ('2024/2025', 'Music Ministry', 'Events', 29900,
   'MULEWO: minister (15000), batteries (800), photography (1000), transport (6000), food (2000), visitor breakfast coffee only (1000), livestreaming (300), seats (3000). Sub-total 29100 + airtime 800 = 29900',
   NOW()),

  ('2024/2025', 'Bible Study & Training Ministry', 'Training', 6100,
   'BEST-P: appreciation (6000), airtime (100)',
   NOW()),

  ('2024/2025', 'Bible Study & Training Ministry', 'Events', 2050,
   'Bereans: biscuits 6 cartons@235 (1410), sweets 8 packs@80 (640)',
   NOW()),

  ('2024/2025', 'Discipleship Ministry', 'General', 6545,
   'Discipleship: appreciation 1 speaker (1000), biscuits 3 cartons@235 (705), juice 3 litres (440), airtime 4 months@350 (1400), baptism pool (3000)',
   NOW()),

  ('2024/2025', 'Discipleship Ministry', 'Events', 7635,
   'Years Fellowships: Anza FYT sweets 4 packs@80 (320), Endelea 1 appreciation (1000) + biscuits 1 carton (235) + sweets 1 pack (80) = 1315, Endelea 2 appreciation (1000), Vuka FYT appreciation 5 speakers (5000). Total: 7635',
   NOW()),

  ('2024/2025', 'Discipleship Ministry', 'Training', 10795,
   'Elders Weekend: Friday — appreciation (3000), livestreaming (300), eggs (150), bread 3@65 (195), milk (150) = 3795. Saturday — support (5000). Sunday — appreciation (2000). Total: 10795',
   NOW()),

  ('2024/2025', 'Missions & Evangelism Ministry', 'Outreach', 21390,
   'Prison visit: soap 10 bars (1100), tissue 20 pieces (600). Hospital missions: sweets and biscuits (1000). Juvenile visit: sugar 12kg (1920), coffee 4@80 (320), ream paper (580), grossy paper (560). Integral Mission annual mission ground previsit 2 people (2400), mission training lunch (250), mission support airtime (150). PREVA week: sugar 4kg (640), coffee (80), mandazis (750), power street worship (600), biscuits (235), mission awareness seminar milk (75) + bread 2@65 (130). Total: 21390',
   NOW()),

  ('2024/2025', 'Technical & Media Ministry', 'Equipment', 6634,
   'Digital budget: airtime (9800 total for year), HDMI cable (3500), camera battery (2500), remote battery (634)',
   NOW()),

  ('2024/2025', 'Technical & Media Ministry', 'General', 6850,
   'Sound ministry: extension cables 2@600 (1200), jack to jack (1200), masking tape, power cable (900), microphone batteries (1100), drum sticks 2 pairs (2000), speaker crews (450)',
   NOW()),

  ('2024/2025', 'Technical & Media Ministry', 'Welfare', 1040,
   'Ushering ministry: soap and detergent, ushering refreshments',
   NOW()),

  ('2024/2025', 'Technical & Media Ministry', 'Training', 15500,
   'Technical others: repairs (15000), training lunch (500)',
   NOW())

ON CONFLICT (spiritual_year, ministry, category)
DO UPDATE SET
  allocated_amount = EXCLUDED.allocated_amount,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Verify the seed
SELECT
  ministry,
  category,
  allocated_amount
FROM budgets
WHERE spiritual_year = '2024/2025'
ORDER BY ministry, category;

-- Show total
SELECT
  COUNT(*) as total_rows,
  SUM(allocated_amount) as total_budget_kes
FROM budgets
WHERE spiritual_year = '2024/2025';