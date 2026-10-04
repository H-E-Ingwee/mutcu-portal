const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')
const { sendApprovalEmail, sendVerificationEmail, sendRejectionEmail } = require('../lib/email')

const MINISTRY_ROLE_MAP = {
  music_secretary: 'Music Ministry', creative_arts_secretary: 'Creative Arts Ministry',
  technical_media_secretary: 'Technical & Media Ministry', hospitality_secretary: 'Hospitality Ministry',
  prayer_secretary: 'Prayer Ministry', missions_secretary: 'Missions & Evangelism Ministry',
  bible_study_secretary: 'Bible Study & Training Ministry', discipleship_secretary: 'Discipleship Ministry',
  welfare_secretary: 'Welfare Ministry', ministry_secretary: null,
  music_coordinator: 'Music Ministry', creative_arts_coordinator: 'Creative Arts Ministry',
  tech_media_coordinator: 'Technical & Media Ministry', prayer_coordinator: 'Prayer Ministry',
  missions_coordinator: 'Missions & Evangelism Ministry', bible_study_coordinator: 'Bible Study & Training Ministry',
  discipleship_coordinator: 'Discipleship Ministry',
  interim_music_coordinator: 'Music Ministry', interim_creative_arts_coordinator: 'Creative Arts Ministry',
  interim_tech_media_coordinator: 'Technical & Media Ministry', interim_prayer_coordinator: 'Prayer Ministry',
  interim_missions_coordinator: 'Missions & Evangelism Ministry', interim_bible_study_coordinator: 'Bible Study & Training Ministry',
}

const ALL_SECRETARY_ROLES = ['super_admin','ec_admin','cu_secretary','ministry_secretary',
  'music_secretary','creative_arts_secretary','technical_media_secretary','hospitality_secretary',
  'prayer_secretary','missions_secretary','bible_study_secretary','discipleship_secretary','welfare_secretary',
  'music_coordinator','creative_arts_coordinator','tech_media_coordinator','prayer_coordinator',
  'missions_coordinator','bible_study_coordinator','discipleship_coordinator',
  'cu_treasurer','vice_secretary','1st_vp','2nd_vp',
  'interim_chair','interim_secretary','interim_treasurer',
  'interim_music_coordinator','interim_creative_arts_coordinator','interim_tech_media_coordinator',
  'interim_prayer_coordinator','interim_missions_coordinator','interim_bible_study_coordinator']

function sanitize(user) {
  if (!user) return null
  const { password, email_verification_token, password_reset_token, ...safe } = user
  return safe
}

function calcGradYear(studentId, prefix) {
  const match = (studentId || '').match(/(\d{4})$/)
  const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear()
  return admissionYear + (prefix === 'SE' ? 5 : 4)
}

async function generateMutcuNumber(isAssociate = false) {
  const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear()
  const prefix = isAssociate ? `MUTCU-A-${year}-` : `MUTCU-${year}-`
  const { data: lastUser } = await supabase.from('users')
    .select('mutcu_number').like('mutcu_number', `${prefix}%`)
    .order('mutcu_number', { ascending: false }).limit(1)
  let seq = 1
  if (lastUser && lastUser.length > 0 && lastUser[0].mutcu_number) {
    const parts = lastUser[0].mutcu_number.split('-')
    seq = parseInt(parts[parts.length - 1]) + 1
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
}

// ─── GET /api/members ─────────────────────────────────────────────────────────
router.get('/', authenticate, requireRole(...ALL_SECRETARY_ROLES), async (req, res) => {
  try {
    const { search, ministry, year, type, status, gender, role, page = 1, limit = 30 } = req.query
    const ministryForRole = MINISTRY_ROLE_MAP[req.user.role]

    const where = {
      deleted_at: null,
      ...(ministryForRole ? {
        OR: [{ primary_ministry: ministryForRole }, { secondary_ministry: ministryForRole }]
      } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { mutcu_number: { contains: search, mode: 'insensitive' } },
          { student_id: { contains: search, mode: 'insensitive' } },
        ]
      } : {}),
      ...(ministry ? { primary_ministry: ministry } : {}),
      ...(year ? { year_of_study: parseInt(year) } : {}),
      ...(type ? { membership_type: type } : {}),
      ...(status ? { enrollment_status: status } : {}),
      ...(gender ? { gender } : {}),
      ...(role ? { role } : {}),
    }

    let query = supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (where.deleted_at === null) query = query.is('deleted_at', null)
    if (where.OR && where.OR[0]?.primary_ministry) {
      const min = where.OR[0].primary_ministry
      query = query.or(`primary_ministry.eq.${min},secondary_ministry.eq.${min}`)
    }
    if (where.OR && where.OR.some(o => o.name)) {
      const s = req.query.search
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,mutcu_number.ilike.%${s}%,student_id.ilike.%${s}%`)
    }
    if (req.query.ministry) query = query.eq('primary_ministry', req.query.ministry)
    if (req.query.year) query = query.eq('year_of_study', parseInt(req.query.year))
    if (req.query.type) query = query.eq('membership_type', req.query.type)
    if (req.query.status) query = query.eq('enrollment_status', req.query.status)
    if (req.query.gender) query = query.eq('gender', req.query.gender)
    if (req.query.role) query = query.eq('role', req.query.role)
    const from = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(from, from + parseInt(limit) - 1)
    const { data, error: listErr, count } = await query
    if (listErr) throw listErr
    res.json({ members: (data || []).map(sanitize), total: count || 0, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/pending ─────────────────────────────────────────────────
router.get('/pending', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data } = await supabase.from('users').select('*').eq('enrollment_status', 'pending').order('created_at', { ascending: false })
    res.json({ members: (data || []).map(sanitize) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/public/:mutcuNumber ─────────────────────────────────────
router.get('/public/:mutcuNumber', async (req, res) => {
  try {
    const { data: member } = await supabase.from('users').select('name,mutcu_number,photo_url,primary_ministry,membership_type,membership_year,enrollment_status').eq('mutcu_number', req.params.mutcuNumber).single()
    if (!member || member.enrollment_status !== 'active') return res.status(404).json({ error: 'Member not found' })
    res.json({ member })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data: member } = await supabase.from('users').select('*').eq('id', req.params.id).single()
    if (!member) return res.status(404).json({ error: 'Member not found' })
    res.json({ member: sanitize(member) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/members — enroll new member ────────────────────────────────────
router.post('/', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { name, email, student_id, gender, year_of_study, membership_type, primary_ministry, faith_declaration_signed } = req.body
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const tempPassword = Math.random().toString(36).slice(-10)
    const hashed = await bcrypt.hash(tempPassword, 12)
    const schoolPrefix = (student_id || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
    const mutcuNumber = await generateMutcuNumber(membership_type === 'associate')
    const verificationToken = uuidv4()

    const { data: user, error: enrollErr } = await supabase.from('users').insert({
      name, email, password: hashed,
      student_id: student_id || null, school_prefix: schoolPrefix,
      gender, year_of_study: year_of_study ? parseInt(year_of_study) : null,
      graduation_year: calcGradYear(student_id, schoolPrefix),
      membership_type: membership_type || 'full', membership_tier: 'general',
      primary_ministry: primary_ministry || null,
      faith_declaration_signed: !!faith_declaration_signed,
      declaration_signed_at: faith_declaration_signed ? new Date().toISOString() : null,
      enrollment_status: 'active', enrollment_year: new Date().getFullYear(),
      membership_year: new Date().getFullYear(), role: 'full_member',
      mutcu_number: mutcuNumber, email_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: new Date().toISOString(),
      is_active: true, profile_complete: true, disciplinary_status: 'clear',
      must_change_password: true, is_temp_password: true,
    }).select().single()
    if (enrollErr) throw enrollErr

    sendVerificationEmail({ ...user, temp_password: tempPassword }, verificationToken)
      .catch(e => console.error('[WELCOME EMAIL ERROR]', e.message))

    res.status(201).json({ member: sanitize(user), message: `Member enrolled. MUTCU number: ${mutcuNumber}` })
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email or student ID already registered' })
    res.status(500).json({ error: err.message })
  }
})

// ─── PUT /api/members/:id ─────────────────────────────────────────────────────
router.put('/:id', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const allowed = ['name','student_id','gender','year_of_study','membership_type','enrollment_status',
      'primary_ministry','secondary_ministry','disciplinary_status','is_finalist','sgc_executive_role','photo_url']
    const data = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k] })

    if (data.student_id) {
      const prefix = data.student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
      data.school_prefix = prefix
      data.graduation_year = calcGradYear(data.student_id, prefix)
    }
    if (data.year_of_study) data.year_of_study = parseInt(data.year_of_study)

    const { data: member, error: putErr } = await supabase.from('users').update(data).eq('id', req.params.id).select().single()
    if (putErr) throw putErr
    res.json({ member: sanitize(member) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/members/:id/approve ───────────────────────────────────────────
router.post('/:id/approve', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data: member } = await supabase.from('users').select('*').eq('id', req.params.id).single()
    if (!member) return res.status(404).json({ error: 'Member not found' })

    let mutcuNumber = member.mutcu_number
    if (!mutcuNumber) {
      mutcuNumber = await generateMutcuNumber(member.membership_type === 'associate')
    }

    const { data: updated } = await supabase.from('users').update({ enrollment_status: 'active', mutcu_number: mutcuNumber, is_active: true }).eq('id', req.params.id).select().single()

    sendApprovalEmail({ ...updated, mutcu_number: mutcuNumber })
      .catch(e => console.error('[APPROVAL EMAIL ERROR]', e.message))

    res.json({ member: sanitize(updated), message: `Approved. MUTCU number: ${mutcuNumber}` })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/members/:id/reject ────────────────────────────────────────────
router.post('/:id/reject', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data: member } = await supabase.from('users').select('name,email').eq('id', req.params.id).single()
    await supabase.from('users').update({ enrollment_status: 'rejected' }).eq('id', req.params.id)
    res.json({ message: 'Registration rejected' })
    if (member) sendRejectionEmail(member, req.body.reason || '').catch(() => {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/members/import — bulk CSV import ───────────────────────────────
router.post('/import', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { members: membersData } = req.body
    if (!membersData || !Array.isArray(membersData)) return res.status(400).json({ error: 'Invalid data format' })

    let count = 0
    const errors = []

    for (const row of membersData) {
      if (!row.name || !row.email) { errors.push('Missing name or email'); continue }
      const { data: existing } = await supabase.from('users').select('id').eq('email', row.email).single()
      if (existing) { errors.push(`${row.email} already exists`); continue }

      const tempPassword = Math.random().toString(36).slice(-10)
      const hashed = await bcrypt.hash(tempPassword, 12)
      const prefix = (row.student_id || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
      const mutcuNumber = await generateMutcuNumber(false)

      try {
        const { error: impErr } = await supabase.from('users').insert({
          name: row.name, email: row.email, password: hashed,
          student_id: row.student_id || null, school_prefix: prefix,
          gender: row.gender || null,
          year_of_study: row.year_of_study ? parseInt(row.year_of_study) : null,
          graduation_year: calcGradYear(row.student_id, prefix),
          membership_type: row.membership_type || 'full', membership_tier: 'general',
          primary_ministry: row.primary_ministry || null,
          faith_declaration_signed: true, declaration_signed_at: new Date().toISOString(),
          enrollment_status: 'active', enrollment_year: new Date().getFullYear(),
          membership_year: new Date().getFullYear(), role: 'full_member',
          mutcu_number: mutcuNumber, email_verified: false,
          is_active: true, profile_complete: true, disciplinary_status: 'clear',
          must_change_password: true, is_temp_password: true,
        })
        if (impErr) throw impErr
        count++
      } catch (e) {
        errors.push(`${row.email}: ${e.message}`)
      }
    }

    let msg = `Imported ${count} members successfully.`
    if (errors.length) msg += ` Errors: ${errors.slice(0, 3).join('; ')}`
    res.json({ message: msg, count, errors: errors.slice(0, 5) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
