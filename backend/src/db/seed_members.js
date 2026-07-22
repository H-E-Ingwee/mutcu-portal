require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
)

const members = [
  // Eligible members (Year 2+) - mix of male/female across all ministries
  { name: 'Brian Ingwee', email: 'brian@mutcu.test', student_id: 'SC200/0396/2022', gender: 'male', year: 3, ministry: 'Technical & Media Ministry', is_finalist: false },
  { name: 'Esther Wanjiku', email: 'esther@mutcu.test', student_id: 'SC200/0102/2022', gender: 'female', year: 3, ministry: 'Prayer Ministry', is_finalist: false },
  { name: 'David Kamau', email: 'david@mutcu.test', student_id: 'SB200/0234/2023', gender: 'male', year: 2, ministry: 'Music Ministry', is_finalist: false },
  { name: 'Grace Muthoni', email: 'grace@mutcu.test', student_id: 'SH200/0345/2022', gender: 'female', year: 3, ministry: 'Discipleship Ministry', is_finalist: false },
  { name: 'Samuel Ochieng', email: 'samuel@mutcu.test', student_id: 'SE200/0123/2021', gender: 'male', year: 4, ministry: 'Missions & Evangelism Ministry', is_finalist: true },
  { name: 'Faith Njeri', email: 'faith@mutcu.test', student_id: 'SC200/0456/2022', gender: 'female', year: 3, ministry: 'Bible Study & Training Ministry', is_finalist: false },
  { name: 'Peter Mwangi', email: 'peter@mutcu.test', student_id: 'SA200/0567/2023', gender: 'male', year: 2, ministry: 'Creative Arts Ministry', is_finalist: false },
  { name: 'Ruth Akinyi', email: 'ruth@mutcu.test', student_id: 'SS200/0678/2022', gender: 'female', year: 3, ministry: 'Hospitality Ministry', is_finalist: false },
  { name: 'John Kariuki', email: 'john@mutcu.test', student_id: 'SB200/0789/2022', gender: 'male', year: 3, ministry: 'Welfare Ministry', is_finalist: false },
  { name: 'Mary Wambui', email: 'mary@mutcu.test', student_id: 'SC200/0890/2023', gender: 'female', year: 2, ministry: 'Prayer Ministry', is_finalist: false },
  { name: 'Daniel Otieno', email: 'daniel@mutcu.test', student_id: 'SE200/0901/2022', gender: 'male', year: 3, ministry: 'Technical & Media Ministry', is_finalist: false },
  { name: 'Lydia Chebet', email: 'lydia@mutcu.test', student_id: 'SH200/0012/2022', gender: 'female', year: 3, ministry: 'Music Ministry', is_finalist: false },
  { name: 'Joseph Mutua', email: 'joseph@mutcu.test', student_id: 'SC200/0113/2023', gender: 'male', year: 2, ministry: 'Missions & Evangelism Ministry', is_finalist: false },
  { name: 'Naomi Wanjiru', email: 'naomi@mutcu.test', student_id: 'SB200/0224/2022', gender: 'female', year: 3, ministry: 'Discipleship Ministry', is_finalist: false },
  { name: 'Emmanuel Kipchoge', email: 'emmanuel@mutcu.test', student_id: 'SA200/0335/2022', gender: 'male', year: 3, ministry: 'Bible Study & Training Ministry', is_finalist: false },
  { name: 'Deborah Auma', email: 'deborah@mutcu.test', student_id: 'SS200/0446/2023', gender: 'female', year: 2, ministry: 'Creative Arts Ministry', is_finalist: false },
  { name: 'Michael Njoroge', email: 'michael@mutcu.test', student_id: 'SC200/0557/2022', gender: 'male', year: 3, ministry: 'Hospitality Ministry', is_finalist: false },
  { name: 'Priscilla Moraa', email: 'priscilla@mutcu.test', student_id: 'SH200/0668/2022', gender: 'female', year: 3, ministry: 'Welfare Ministry', is_finalist: false },
  // Year 1 (not eligible)
  { name: 'Kevin Omondi', email: 'kevin@mutcu.test', student_id: 'SC200/0779/2025', gender: 'male', year: 1, ministry: 'Prayer Ministry', is_finalist: false },
  { name: 'Sharon Wangari', email: 'sharon@mutcu.test', student_id: 'SB200/0880/2025', gender: 'female', year: 1, ministry: 'Music Ministry', is_finalist: false },
]

// NC Board members (finalists who will serve on NC)
const ncBoard = [
  { name: 'Alice Kamau', email: 'alice.nc@mutcu.test', student_id: 'SC200/0001/2021', gender: 'female', year: 4, ministry: 'Prayer Ministry', is_finalist: true },
  { name: 'James Odhiambo', email: 'james.nc@mutcu.test', student_id: 'SB200/0002/2021', gender: 'male', year: 4, ministry: 'Music Ministry', is_finalist: true },
  { name: 'Mercy Wanjiku', email: 'mercy.nc@mutcu.test', student_id: 'SH200/0003/2021', gender: 'female', year: 4, ministry: 'Discipleship Ministry', is_finalist: true },
  { name: 'Paul Kiprotich', email: 'paul.nc@mutcu.test', student_id: 'SE200/0004/2020', gender: 'male', year: 4, ministry: 'Missions & Evangelism Ministry', is_finalist: true },
  { name: 'Judith Achieng', email: 'judith.nc@mutcu.test', student_id: 'SC200/0005/2021', gender: 'female', year: 4, ministry: 'Bible Study & Training Ministry', is_finalist: true },
]

async function seedMembers() {
  console.log('Seeding test members...\n')
  const hashedPassword = await bcrypt.hash('password123', 12)
  const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear()

  // Get current max sequence
  const { data: lastUser } = await supabase.from('users')
    .select('mutcu_number').like('mutcu_number', `MUTCU-${year}-%`)
    .order('mutcu_number', { ascending: false }).limit(1)
  let seq = lastUser && lastUser.length > 0 ? parseInt(lastUser[0].mutcu_number.split('-')[2]) + 1 : 2

  const allMembers = [...members, ...ncBoard]
  let created = 0

  for (const m of allMembers) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', m.email).single()
    if (existing) { console.log(`  SKIP: ${m.email} already exists`); continue }

    const prefix = m.student_id.replace(/[^A-Za-z]/g,'').substring(0,2).toUpperCase()
    const match = m.student_id.match(/(\d{4})$/)
    const admissionYear = match ? parseInt(match[1]) : 2022
    const graduationYear = admissionYear + (prefix === 'SE' ? 5 : 4)
    const mutcuNumber = `MUTCU-${year}-${String(seq).padStart(4,'0')}`

    const { error } = await supabase.from('users').insert({
      name: m.name, email: m.email, password: hashedPassword,
      student_id: m.student_id, school_prefix: prefix,
      gender: m.gender, year_of_study: m.year,
      graduation_year: graduationYear,
      membership_type: 'full', membership_tier: 'ministry',
      primary_ministry: m.ministry,
      faith_declaration_signed: true,
      declaration_signed_at: new Date().toISOString(),
      enrollment_status: 'active',
      enrollment_year: parseInt(year),
      membership_year: parseInt(year),
      role: 'full_member',
      mutcu_number: mutcuNumber,
      email_verified: true,
      profile_complete: true,
      is_active: true,
      disciplinary_status: 'clear',
      must_change_password: false,
      is_temp_password: false,
      approved_at: new Date().toISOString(),
      is_finalist: m.is_finalist,
    })

    if (error) {
      console.log(`  ERROR: ${m.name} — ${error.message}`)
    } else {
      const tag = m.is_finalist ? '[FINALIST/NC]' : m.year === 1 ? '[Year 1 - not eligible]' : '[Eligible]'
      console.log(`  ✅ ${mutcuNumber} — ${m.name} (${m.gender}, Yr${m.year}) ${tag}`)
      seq++
      created++
    }
  }

  console.log(`\n✅ Created ${created} members`)
  console.log('\n📋 NC BOARD (use these for NC appointment):')
  ncBoard.forEach(m => console.log(`   ${m.email} — ${m.name} (${m.gender})`))
  console.log('\n🔑 All passwords: password123')
  console.log('\n📌 To appoint NC: Admin → Cycles → Appoint NC → select from the NC board members above')
}

seedMembers().catch(console.error)
