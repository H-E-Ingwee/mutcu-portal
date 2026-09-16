/**
 * MUTCU Budget Seed — JAN-APR 2025 (Semester Two, 2024-2025)
 * Run: node src/db/seed_budget_2025.js
 * This seeds the budget data from the official MUTCU approved budget document.
 */
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const SPIRITUAL_YEAR = '2024/2025'

// Full budget data extracted from MUTCU BUDGET JAN-APR 2025 PDF
const BUDGET_ROWS = [
  // ── ADMIN / GENERAL ──────────────────────────────────────────
  { ministry: 'General / Administration', category: 'General',   allocated_amount: 60010, notes: 'Admin budget: speakers appreciation, airtime, stationery, support, cabinet repairs, RSEC meetings, B/S leaders summit, banner, petty cash, miscellaneous' },

  // ── 1ST VICE CHAIR — LADIES FELLOWSHIP ───────────────────────
  { ministry: 'Hospitality Ministry',     category: 'Welfare',   allocated_amount: 2000,  notes: 'Ladies Fellowship welfare' },

  // ── HOSPITALITY + CARRY THE LOVE ─────────────────────────────
  { ministry: 'Hospitality Ministry',     category: 'Events',    allocated_amount: 36070, notes: 'Hospitality & Carry the Love budget: milk, bread, blueband, kahawa, sugar, tea, mandazis, gas, water, cooking supplies, holy communion cups' },

  // ── ASSOCIATES SUNDAY ────────────────────────────────────────
  { ministry: 'Hospitality Ministry',     category: 'Events',    allocated_amount: 7675,  notes: 'Associates Sunday food: rice, minji, wheat flour, vegetables, fruits, water, charcoal, soda' },

  // ── 2ND VICE CHAIR — WELFARE ─────────────────────────────────
  { ministry: 'Welfare Committee',        category: 'Welfare',   allocated_amount: 15000, notes: 'Welfare support for members' },
  { ministry: 'Welfare Committee',        category: 'Events',    allocated_amount: 2015,  notes: 'Sports Day: biscuits (7 cartons@245), glucose' },

  // ── PRAYER DOCKET ────────────────────────────────────────────
  { ministry: 'Prayer Ministry',          category: 'General',   allocated_amount: 4195,  notes: "Prayer docket: speaker's appreciation (3000), airtime (400), livestreaming (150), eggs (150), milk (300), bread (195)" },

  // ── CREATIVE ARTS (CREAM) ─────────────────────────────────────
  { ministry: 'Creative Arts Ministry',   category: 'Events',    allocated_amount: 13400, notes: 'Creative docket: manilla papers, mark pens, banner, dance training appreciation, tea, creative experience decoration, film production appreciation, food for 5 days (breakfast + supper)' },
  { ministry: 'Creative Arts Ministry',   category: 'General',   allocated_amount: 800,   notes: 'Airtime' },

  // ── MUSIC — MULEWO ───────────────────────────────────────────
  { ministry: 'Music Ministry',           category: 'Events',    allocated_amount: 29900, notes: 'MULEWO: minister (15000), batteries (800), photography (1000), transport (6000), food (2000), visitor breakfast (1000), livestreaming (300), seats (3000)' },

  // ── BIBLE STUDY & TRAINING ───────────────────────────────────
  { ministry: 'Bible Study & Training Ministry', category: 'Training', allocated_amount: 6100, notes: 'BEST-P: appreciation (6000), airtime (100)' },
  { ministry: 'Bible Study & Training Ministry', category: 'Events',   allocated_amount: 2050, notes: 'Bereans: biscuits (6 cartons@235=1410), sweets (8 packs@80=640)' },

  // ── DISCIPLESHIP ─────────────────────────────────────────────
  { ministry: 'Discipleship Ministry',    category: 'General',   allocated_amount: 6545,  notes: 'Discipleship: appreciation (1000), biscuits (705), juice (440), airtime (1400), baptism pool (3000)' },

  // ── YEARS FELLOWSHIPS ────────────────────────────────────────
  { ministry: 'Discipleship Ministry',    category: 'Events',    allocated_amount: 7635,  notes: "Years' Fellowships: Anza FYT (sweets 320), Endelea 1 (appreciation 1000, biscuits 235, sweets 80), Endelea 2 (appreciation 1000), Vuka FYT (appreciation 5000)" },

  // ── ELDERS WEEKEND ───────────────────────────────────────────
  { ministry: 'Discipleship Ministry',    category: 'Events',    allocated_amount: 10795, notes: "Elders' Weekend: Friday (appreciation 3000, livestreaming 300, eggs 150, bread 195, milk 150), Saturday support (5000), Sunday appreciation (2000)" },

  // ── MISSIONS & EVANGELISM ────────────────────────────────────
  { ministry: 'Missions & Evangelism Ministry', category: 'Outreach', allocated_amount: 21390, notes: 'Prison visit (soap 1100, tissue 600), Hospital missions (sweets & biscuits 1000), Juvenile visit (sugar, coffee, ream paper, grossy paper), Evangelism, Integral Mission annual mission (2400), mission training lunch (250), mission support airtime (150), PREVA week (sugar, coffee, mandazis, power, biscuits, mission awareness seminar)' },

  // ── TECHNICAL & MEDIA ────────────────────────────────────────
  { ministry: 'Technical & Media Ministry', category: 'Equipment', allocated_amount: 6634,  notes: 'Digital budget: airtime (9800 total), HDMI cable (3500), camera battery (2500), remote battery (634)' },
  { ministry: 'Technical & Media Ministry', category: 'Equipment', allocated_amount: 6850,  notes: 'Sound ministry: extension cables (1200), jack to jack (1200), masking tape, power cable (900), microphone batteries (1100), drum sticks (2000), speaker crews (450)' },
  { ministry: 'Technical & Media Ministry', category: 'General',   allocated_amount: 1040,  notes: 'Ushering ministry: soap and detergent, ushering refreshments' },
  { ministry: 'Technical & Media Ministry', category: 'Equipment', allocated_amount: 15500, notes: 'Others: repairs (15000), training lunch (500)' },
]

async function seedBudget() {
  console.log(`\n🌱 Seeding MUTCU Budget for ${SPIRITUAL_YEAR}...\n`)

  // First ensure the financial year exists
  const { data: existingYear } = await supabase
    .from('financial_years')
    .select('id')
    .eq('label', SPIRITUAL_YEAR)
    .single()

  if (!existingYear) {
    const { error: yearErr } = await supabase.from('financial_years').insert({
      label: SPIRITUAL_YEAR,
      start_date: '2024-09-01',
      end_date: '2025-08-31',
      is_active: false,
      is_closed: false,
      notes: 'Academic year 2024/2025',
    })
    if (yearErr) {
      console.log('⚠️  Financial year may already exist:', yearErr.message)
    } else {
      console.log(`✅ Created financial year: ${SPIRITUAL_YEAR}`)
    }
  } else {
    console.log(`ℹ️  Financial year ${SPIRITUAL_YEAR} already exists`)
  }

  // Insert budget rows
  let inserted = 0
  let skipped = 0

  for (const row of BUDGET_ROWS) {
    const { error } = await supabase.from('budgets').upsert({
      spiritual_year: SPIRITUAL_YEAR,
      ministry: row.ministry,
      category: row.category,
      allocated_amount: row.allocated_amount,
      notes: row.notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'spiritual_year,ministry,category' })

    if (error) {
      console.log(`❌ Failed: ${row.ministry} / ${row.category} — ${error.message}`)
      skipped++
    } else {
      console.log(`✅ ${row.ministry} / ${row.category}: KES ${row.allocated_amount.toLocaleString()}`)
      inserted++
    }
  }

  const total = BUDGET_ROWS.reduce((s, r) => s + r.allocated_amount, 0)
  console.log(`\n📊 Budget Seed Complete`)
  console.log(`   Inserted/Updated: ${inserted}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total Budget: KES ${total.toLocaleString()}`)
  console.log(`   Spiritual Year: ${SPIRITUAL_YEAR}`)
  console.log(`\n💡 Note: The official document total is KES 264,604`)
  console.log(`   Some line items were consolidated by ministry for the budget manager.\n`)
}

seedBudget().catch(console.error).finally(() => process.exit(0))