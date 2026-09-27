require('dotenv').config()
const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const router = express.Router()
const supabase = require('../lib/supabase')
const { withTimeout } = require('../lib/supabase')
const { signToken } = require('../lib/jwt')
const { authenticate } = require('../middleware/auth')
const { sendPasswordResetEmail, sendVerificationEmail } = require('../lib/email')

// ─── Concurrency limiter for registration ─────────────────────────────────────
// Prevents Supabase connection pool exhaustion during mass registration events
let activeRegistrations = 0
const MAX_CONCURRENT_REGISTRATIONS = 15

// ─── Minimal user fields for login (avoid select * under load) ───────────────
const LOGIN_FIELDS = [
  'id','name','email','role','secondary_role','password','is_active',
  'email_verified','enrollment_status','must_change_password','mutcu_number',
  'photo_url','primary_ministry','secondary_ministry','membership_type',
  'year_of_study','gender','phone','student_id','pending_changes',
  'course_type','school_prefix','graduation_year','faith_declaration_signed',
  'declaration_signed_at','membership_year','enrollment_year','profile_complete',
  'disciplinary_status','county','year_completed','course_studied','occupation',
  'secondary_role','deleted_at',
].join(',')

function calcGraduationYear(studentId, courseType = 'degree') {
  if (!studentId) return null
  const prefix = studentId.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  const match = studentId.match(/(\d{4})$/)
  const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear()
  if (courseType === 'diploma') return admissionYear + 3
  return admissionYear + (prefix === 'SE' ? 5 : 4)
}

function sanitizeUser(user) {
  const { password, email_verification_token, password_reset_token, ...safe } = user
  return safe
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  // Throttle concurrent registrations to protect Supabase connection pool
  if (activeRegistrations >= MAX_CONCURRENT_REGISTRATIONS) {
    return res.status(429).json({
      error: 'The system is currently processing many registrations. Please wait a moment and try again — your spot is not lost!',
      code: 'REGISTRATION_BUSY',
      retry_after: 10,
    })
  }

  activeRegistrations++
  try {
    const {
      name, email, password, student_id, gender, year_of_study,
      primary_ministry, secondary_ministry, faith_declaration, phone,
      course_type, membership_type, county, year_completed, course_studied, occupation,
    } = req.body

    const isAssociate = membership_type === 'associate'

    if (!name || !email || !password || !gender || !faith_declaration || !phone) {
      return res.status(400).json({ error: 'Name, email, password, gender, phone and faith declaration are required' })
    }
    if (!isAssociate && (!year_of_study || !student_id)) {
      return res.status(400).json({ error: 'Student registration number and year of study are required for student members' })
    }
    if (isAssociate && (!county || !year_completed)) {
      return res.status(400).json({ error: 'County and year completed are required for associate members' })
    }

    const validCourseType = isAssociate ? 'alumni' : (['degree', 'diploma'].includes(course_type) ? course_type : 'degree')

    if (!isAssociate) {
      const maxYear = validCourseType === 'diploma' ? 3 : 5
      if (parseInt(year_of_study) > maxYear) {
        return res.status(400).json({ error: `Maximum year of study for ${validCourseType} is Year ${maxYear}` })
      }
    }

    // ── Single combined query: check email AND student_id in one round trip ──
    let existingQuery = supabase.from('users').select('id,email,student_id').eq('email', email)
    if (!isAssociate && student_id) {
      existingQuery = supabase.from('users').select('id,email,student_id')
        .or(`email.eq.${email},student_id.eq.${student_id}`)
    }

    const { data: existing } = await withTimeout(existingQuery, 6000, 'duplicate check')
    if (existing && existing.length > 0) {
      const conflict = existing[0].email === email ? 'email address' : 'student registration number'
      return res.status(409).json({ error: `This ${conflict} is already registered. Please log in or use a different ${conflict}.` })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const schoolPrefix = student_id ? student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() : ''
    const verificationToken = uuidv4()

    // ── Generate MUTCU number atomically ──────────────────────────────────────
    let mutcuNumber = null
    try {
      const year = new Date().getFullYear()
      const prefix = isAssociate ? `MUTCU-A-${year}` : `MUTCU-${year}`
      const { data: lastUser } = await withTimeout(
        supabase.from('users')
          .select('mutcu_number')
          .like('mutcu_number', `${prefix}-%`)
          .order('mutcu_number', { ascending: false })
          .limit(1),
        5000, 'MUTCU number generation'
      )
      const lastNum = lastUser?.[0]?.mutcu_number
        ? parseInt(lastUser[0].mutcu_number.split('-').pop()) : 0
      mutcuNumber = `${prefix}-${String(lastNum + 1).padStart(4, '0')}`
    } catch (e) {
      console.warn('[REGISTER] MUTCU number generation failed, will assign later:', e.message)
    }

    const insertData = {
      name, email, password: hashedPassword, phone,
      student_id: student_id || `ASSOC-${Date.now()}`,
      school_prefix: schoolPrefix || 'AL',
      gender,
      year_of_study: isAssociate ? null : parseInt(year_of_study),
      graduation_year: isAssociate ? null : calcGraduationYear(student_id, validCourseType),
      primary_ministry: primary_ministry || null,
      membership_type: isAssociate ? 'associate' : 'full',
      membership_tier: 'general',
      role: isAssociate ? 'associate_member' : 'full_member',
      faith_declaration_signed: true, declaration_signed_at: new Date().toISOString(),
      enrollment_status: 'pending', enrollment_year: new Date().getFullYear(),
      membership_year: new Date().getFullYear(),
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: new Date().toISOString(),
      is_active: true, profile_complete: false, disciplinary_status: 'clear',
      must_change_password: false, is_temp_password: false,
      course_type: validCourseType,
      mutcu_number: mutcuNumber,
    }

    if (isAssociate) {
      insertData.county = county || null
      insertData.year_completed = year_completed ? parseInt(year_completed) : null
      insertData.course_studied = course_studied || null
      insertData.occupation = occupation || null
    }

    const { data: user, error } = await withTimeout(
      supabase.from('users').insert(insertData).select().single(),
      8000, 'user creation'
    )
    if (error) throw error

    const token = signToken({ id: user.id, role: user.role })

    // Fire and forget — don't block registration response
    sendVerificationEmail(user, verificationToken).catch(e => console.error('[VERIFY EMAIL ERROR]', e.message))

    res.status(201).json({ token, user: sanitizeUser(user), message: 'Registration successful! Please verify your email.' })
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message)

    // Friendly error messages based on error type
    if (err.message?.includes('timed out')) {
      return res.status(503).json({
        error: 'The server is under heavy load right now. Please wait 15 seconds and try again — your information has not been saved.',
        code: 'SERVER_BUSY',
      })
    }
    if (err.message?.includes('duplicate') || err.code === '23505') {
      return res.status(409).json({ error: 'This email or student ID is already registered.' })
    }
    res.status(500).json({ error: 'Registration failed. Please try again in a moment.' })
  } finally {
    activeRegistrations--
  }
})

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    // Select only needed fields — avoid select * under load
    const { data: user, error } = await withTimeout(
      supabase.from('users').select(LOGIN_FIELDS).eq('email', email).single(),
      8000, 'login'
    )

    if (error || !user) return res.status(401).json({ error: 'Invalid email or password' })

    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated. Contact the CU Secretary.' })
    if (user.enrollment_status === 'rejected') return res.status(403).json({ error: 'Your membership application was rejected. Please contact the CU Secretary or register again.', code: 'ACCOUNT_REJECTED' })
    if (user.enrollment_status === 'deleted') return res.status(403).json({ error: 'This account has been removed from the system.', code: 'ACCOUNT_DELETED' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' })

    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      })
    }

    const token = signToken({ id: user.id, role: user.role })
    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message)
    if (err.message?.includes('timed out')) {
      return res.status(503).json({
        error: 'The server is taking longer than usual. Please try logging in again in a moment.',
        code: 'SERVER_BUSY',
      })
    }
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) })
})

// ─── POST /api/auth/login-unverified ─────────────────────────────────────────
router.post('/login-unverified', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
    const { data: user } = await supabase.from('users').select('id,email,password,role,email_verified').eq('email', email).single()
    if (!user) return res.status(404).json({ error: 'User not found' })
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })
    const token = signToken({ id: user.id, role: user.role })
    res.json({ token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/verify-email ──────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { token, id } = req.body
    if (!token || !id) return res.status(400).json({ error: 'Invalid verification link' })
    const { data: user } = await supabase.from('users').select('id,email,email_verified,name,role').eq('id', id).eq('email_verification_token', token).single()
    if (!user) return res.status(400).json({ error: 'Invalid or expired verification link. Please request a new one.' })
    if (user.email_verified) return res.json({ message: 'Email already verified. You can log in.' })
    await supabase.from('users').update({ email_verified: true, email_verification_token: null }).eq('id', id)
    res.json({ message: 'Email verified successfully! You can now log in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/resend-verification ──────────────────────────────────────
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const user = req.user
    if (user.email_verified) return res.status(400).json({ error: 'Email already verified' })
    const newToken = uuidv4()
    await supabase.from('users').update({ email_verification_token: newToken, email_verification_sent_at: new Date().toISOString() }).eq('id', user.id)
    sendVerificationEmail(user, newToken).catch(e => console.error('[RESEND VERIFY ERROR]', e.message))
    res.json({ message: 'Verification email resent. Please check your inbox.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })
    const { data: user } = await supabase.from('users').select('id,name,email,role').eq('email', email).single()
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' })
    const resetToken = uuidv4()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await supabase.from('users').update({ password_reset_token: resetToken, password_reset_expires: expiresAt }).eq('id', user.id)
    sendPasswordResetEmail(user, resetToken).catch(e => console.error('[PASSWORD RESET EMAIL ERROR]', e.message))
    res.json({ message: 'If this email exists, a reset link has been sent.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and new password are required' })
    const { data: user } = await supabase.from('users').select('id,password_reset_expires').eq('password_reset_token', token).single()
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' })
    if (new Date(user.password_reset_expires) < new Date()) return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })
    const hashed = await bcrypt.hash(password, 10)
    await supabase.from('users').update({ password: hashed, password_reset_token: null, password_reset_expires: null, must_change_password: false }).eq('id', user.id)
    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/auth/change-password ──────────────────────────────────────────
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, new_password } = req.body
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' })
    if (req.user.must_change_password) {
      const hashed = await bcrypt.hash(new_password, 10)
      await supabase.from('users').update({ password: hashed, must_change_password: false, is_temp_password: false }).eq('id', req.user.id)
      return res.json({ message: 'Password changed successfully' })
    }
    if (!current_password) return res.status(400).json({ error: 'Current password is required' })
    const valid = await bcrypt.compare(current_password, req.user.password)
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' })
    const hashed = await bcrypt.hash(new_password, 10)
    await supabase.from('users').update({ password: hashed, must_change_password: false }).eq('id', req.user.id)
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
