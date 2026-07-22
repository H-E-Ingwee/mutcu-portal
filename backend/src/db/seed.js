require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
)

async function seed() {
  console.log('Seeding MUTCU DMS database...')

  // Create super admin
  const hashedPassword = await bcrypt.hash('MutcuAdmin@2026!', 12)
  
  const { data: existing } = await supabase.from('users').select('id').eq('email', 'admin@mutcu.org').single()
  
  if (!existing) {
    const { data, error } = await supabase.from('users').insert({
      name: 'MUTCU Administrator',
      email: 'admin@mutcu.org',
      password: hashedPassword,
      role: 'super_admin',
      mutcu_number: 'MUTCU-2026-0001',
      enrollment_year: 2026,
      enrollment_status: 'active',
      membership_type: 'full',
      membership_tier: 'ministry',
      faith_declaration_signed: true,
      declaration_signed_at: new Date().toISOString(),
      email_verified: true,
      profile_complete: true,
      is_active: true,
      disciplinary_status: 'clear',
      must_change_password: false,
      is_temp_password: false,
      gender: 'male',
      year_of_study: 3,
      membership_year: 2026,
    }).select().single()

    if (error) {
      console.error('Error creating admin:', error.message)
    } else {
      console.log('✅ Super Admin created: admin@mutcu.org')
      console.log('   Password: MutcuAdmin@2026! (change immediately!)')
    }
  } else {
    console.log('✅ Super Admin already exists')
  }

  console.log('✅ Seeding complete!')
}

seed().catch(console.error)
