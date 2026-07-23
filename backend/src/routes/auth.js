require('dotenv').config()
const express = require('express')
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const router = express.Router()
const supabase = require('../lib/supabase')
const { signToken } = require('../lib/jwt')
const { authenticate } = require('../middleware/auth')
const { sendPasswordResetEmail } = require('../lib/email')

function calcGraduationYear(studentId) {
  if (!studentId) return null
  const prefix = studentId.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase()
  const match = studentId.match(/(\d{4})$/)
  const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear()
  return admissionYear + (prefix === 'SE' ? 5 : 4)
}

function sanitizeUser(user) {
  const { password, email_verification_token, password_reset_token, ...safe } = user
  return safe
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, student_id, gender, year_of_study, primary_ministry, faith_declaration, phone } = req.body
    if (!name || !email || !password || !gender || !year_of_study || !faith_declaration) {
      return res.status(400).json({ error: 'All required fields must be provided' })
    }

    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single()
    if (existing) return res.status(400).json({ error: 'Email already registered' })

    const hashedPassword = await bcrypt.hash(password, 10)
    const schoolPrefix = student_id ? student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() : ''

    const { data: user, error } = await supabase.from('users').insert({
      name, email, password: hashedPassword, phone: phone || null,
      student_id: student_id || null, school_prefix: schoolPrefix,
      gender, year_of_study: parseInt(year_of_study),
      graduation_year: calcGraduationYear(student_id),
      primary_ministry: primary_ministry || null,
      membership_type: 'full', membership_tier: 'general', role: 'full_member',
      faith_declaration_signed: true, declaration_signed_at: new Date().toISOString(),
      enrollment_status: 'pending', enrollment_year: new Date().getFullYear(),
      membership_year: new Date().getFullYear(),
      email_verified: true,
      is_active: true, profile_complete: false, disciplinary_status: 'clear',
      must_change_password: false, is_temp_password: false,
    }).select().single()

    if (error) throw error

    const token = signToken({ id: user.id, role: user.role })
    res.status(201).json({ token, user: sanitizeUser(user), message: 'Registration successful! Welcome to MUTCU DMS.' })
  } catch (err) {
    console.error('Register error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' })

    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single()
    if (error || !user) return res.status(401).json({ error: 'No account found with this email' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Incorrect password' })
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' })

    const token = signToken({ id: user.id, role: user.role })

    // Fire and forget audit log
    supabase.from('audit_logs').insert({
      actor_id: user.id, action: 'auth.login', description: 'User signed in'
    }).then(() => {}).catch(() => {})

    res.json({ token, user: sanitizeUser(user) })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) })
})

// POST /api/auth/verify-email (paused)
router.post('/verify-email', async (req, res) => {
  res.json({ message: 'Email verification is currently paused.' })
})

// POST /api/auth/resend-verification (paused)
router.post('/resend-verification', authenticate, async (req, res) => {
  res.json({ message: 'Email verification is currently paused.' })
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const { data: user } = await supabase.from('users').select('*').eq('email', email).single()

    // Always respond the same way — don't reveal if email exists
    res.json({ message: 'If this email exists, a reset link has been sent to your inbox.' })

    if (!user) return // stop here silently

    const token = uuidv4()
    const expires = new Date(Date.now() + 3600000).toISOString() // 1 hour
    await supabase.from('users').update({
      password_reset_token: token,
      password_reset_expires: expires,
    }).eq('id', user.id)

    // Fire and forget — send reset email via Brevo
    sendPasswordResetEmail(user, token).catch(err =>
      console.error('[PASSWORD RESET EMAIL ERROR]', err.message)
    )
  } catch (err) {
    console.error('Forgot password error:', err.message)
    res.status(500).json({ error: 'Failed to process request.' })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' })

    const { data: user } = await supabase.from('users').select('*').eq('password_reset_token', token).single()
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset link' })
    if (new Date(user.password_reset_expires) < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired. Please request a new one.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    await supabase.from('users').update({
      password: hashed,
      password_reset_token: null,
      password_reset_expires: null,
      must_change_password: false,
    }).eq('id', user.id)

    res.json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, password } = req.body
    const { data: user } = await supabase.from('users').select('password').eq('id', req.user.id).single()
    const valid = await bcrypt.compare(current_password, user.password)
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' })
    const hashed = await bcrypt.hash(password, 10)
    await supabase.from('users').update({
      password: hashed,
      must_change_password: false,
      is_temp_password: false,
    }).eq('id', req.user.id)
    res.json({ message: 'Password changed successfully' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router