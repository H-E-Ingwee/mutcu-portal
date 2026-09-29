const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const router = express.Router()
const prisma = require('../lib/prisma')
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
  const counterKey = isAssociate ? `associate_${year}` : `member_${year}`
  const counter = await prisma.mutcuCounter.upsert({
    where: { key: counterKey },
    update: { value: { increment: 1 } },
    create: { key: counterKey, value: 1 },
    select: { value: true }
  })
  const prefix = isAssociate ? `MUTCU-A-${year}` : `MUTCU-${year}`
  return `${prefix}-${String(counter.value).padStart(4, '0')}`
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

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [members, total] = await Promise.all([
      prisma.user.findMany({ where, orderBy: { created_at: 'desc' }, skip, take: parseInt(limit) }),
      prisma.user.count({ where })
    ])

    res.json({ members: members.map(sanitize), total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/pending ─────────────────────────────────────────────────
router.get('/pending', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const members = await prisma.user.findMany({
      where: { enrollment_status: 'pending' },
      orderBy: { created_at: 'desc' }
    })
    res.json({ members: members.map(sanitize) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/public/:mutcuNumber ─────────────────────────────────────
router.get('/public/:mutcuNumber', async (req, res) => {
  try {
    const member = await prisma.user.findUnique({
      where: { mutcu_number: req.params.mutcuNumber },
      select: { name: true, mutcu_number: true, photo_url: true, primary_ministry: true, membership_type: true, membership_year: true, enrollment_status: true }
    })
    if (!member || member.enrollment_status !== 'active') return res.status(404).json({ error: 'Member not found' })
    res.json({ member })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── GET /api/members/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const member = await prisma.user.findUnique({ where: { id: req.params.id } })
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
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const tempPassword = Math.random().toString(36).slice(-10)
    const hashed = await bcrypt.hash(tempPassword, 12)
    const schoolPrefix = (student_id || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
    const mutcuNumber = await generateMutcuNumber(membership_type === 'associate')
    const verificationToken = uuidv4()

    const user = await prisma.user.create({
      data: {
        name, email, password: hashed,
        student_id: student_id || null,
        school_prefix: schoolPrefix,
        gender, year_of_study: year_of_study ? parseInt(year_of_study) : null,
        graduation_year: calcGradYear(student_id, schoolPrefix),
        membership_type: membership_type || 'full', membership_tier: 'general',
        primary_ministry: primary_ministry || null,
        faith_declaration_signed: !!faith_declaration_signed,
        declaration_signed_at: faith_declaration_signed ? new Date() : null,
        enrollment_status: 'active', enrollment_year: new Date().getFullYear(),
        membership_year: new Date().getFullYear(), role: 'full_member',
        mutcu_number: mutcuNumber, email_verified: false,
        email_verification_token: verificationToken,
        email_verification_sent_at: new Date(),
        is_active: true, profile_complete: true, disciplinary_status: 'clear',
        must_change_password: true, is_temp_password: true,
      }
    })

    sendVerificationEmail({ ...user, temp_password: tempPassword }, verificationToken)
      .catch(e => console.error('[WELCOME EMAIL ERROR]', e.message))

    res.status(201).json({ member: sanitize(user), message: `Member enrolled. MUTCU number: ${mutcuNumber}` })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email or student ID already registered' })
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

    const member = await prisma.user.update({ where: { id: req.params.id }, data })
    res.json({ member: sanitize(member) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/members/:id/approve ───────────────────────────────────────────
router.post('/:id/approve', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const member = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!member) return res.status(404).json({ error: 'Member not found' })

    let mutcuNumber = member.mutcu_number
    if (!mutcuNumber) {
      mutcuNumber = await generateMutcuNumber(member.membership_type === 'associate')
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { enrollment_status: 'active', mutcu_number: mutcuNumber, is_active: true }
    })

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
    const member = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { name: true, email: true }
    })
    await prisma.user.update({
      where: { id: req.params.id },
      data: { enrollment_status: 'rejected' }
    })
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
      const existing = await prisma.user.findUnique({ where: { email: row.email }, select: { id: true } })
      if (existing) { errors.push(`${row.email} already exists`); continue }

      const tempPassword = Math.random().toString(36).slice(-10)
      const hashed = await bcrypt.hash(tempPassword, 12)
      const prefix = (row.student_id || '').replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
      const mutcuNumber = await generateMutcuNumber(false)

      try {
        await prisma.user.create({
          data: {
            name: row.name, email: row.email, password: hashed,
            student_id: row.student_id || null, school_prefix: prefix,
            gender: row.gender || null,
            year_of_study: row.year_of_study ? parseInt(row.year_of_study) : null,
            graduation_year: calcGradYear(row.student_id, prefix),
            membership_type: row.membership_type || 'full', membership_tier: 'general',
            primary_ministry: row.primary_ministry || null,
            faith_declaration_signed: true, declaration_signed_at: new Date(),
            enrollment_status: 'active', enrollment_year: new Date().getFullYear(),
            membership_year: new Date().getFullYear(), role: 'full_member',
            mutcu_number: mutcuNumber, email_verified: false,
            is_active: true, profile_complete: true, disciplinary_status: 'clear',
            must_change_password: true, is_temp_password: true,
          }
        })
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
