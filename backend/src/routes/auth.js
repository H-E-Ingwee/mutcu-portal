const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const supabase = require('../lib/supabase');
const { signToken } = require('../lib/jwt');
const { authenticate } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/email');

// ── Helper: generate MUTCU number ──────────────────────────────────────────
async function generateMutcuNumber() {
  const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear();
  const { data } = await supabase
    .from('users')
    .select('mutcu_number')
    .like('mutcu_number', `MUTCU-${year}-%`)
    .order('mutcu_number', { ascending: false })
    .limit(1);
  
  let seq = 1;
  if (data && data.length > 0) {
    const last = data[0].mutcu_number;
    seq = parseInt(last.split('-')[2]) + 1;
  }
  return `MUTCU-${year}-${String(seq).padStart(4, '0')}`;
}

// ── Helper: calc graduation year ───────────────────────────────────────────
function calcGraduationYear(studentId) {
  if (!studentId) return null;
  const prefix = studentId.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase();
  const match = studentId.match(/(\d{4})$/);
  const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear();
  const duration = prefix === 'SE' ? 5 : 4;
  return admissionYear + duration;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, student_id, gender, year_of_study, primary_ministry, faith_declaration } = req.body;

    if (!name || !email || !password || !gender || !year_of_study || !faith_declaration) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Check existing
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationToken = uuidv4();
    const schoolPrefix = student_id ? student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() : '';

    const { data: user, error } = await supabase.from('users').insert({
      name, email,
      password: hashedPassword,
      student_id: student_id || null,
      school_prefix: schoolPrefix,
      gender,
      year_of_study: parseInt(year_of_study),
      graduation_year: calcGraduationYear(student_id),
      primary_ministry: primary_ministry || null,
      faith_declaration_signed: true,
      declaration_signed_at: new Date().toISOString(),
      enrollment_status: 'pending',
      enrollment_year: new Date().getFullYear(),
      membership_year: new Date().getFullYear(),
      membership_type: 'full',
      membership_tier: 'general',
      role: 'full_member',
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: new Date().toISOString(),
      is_active: true,
      profile_complete: false,
      disciplinary_status: 'clear',
    }).select().single();

    if (error) throw error;

    await sendVerificationEmail(user, verificationToken);

    const token = signToken({ id: user.id, role: user.role });
    res.status(201).json({ token, user: sanitizeUser(user), message: 'Registration successful. Please verify your email.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase.from('users').select('*').eq('email', email).single();
    if (error || !user) return res.status(401).json({ error: 'No account found with this email' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect password' });

    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });

    const token = signToken({ id: user.id, role: user.role });

    // Audit log
    await supabase.from('audit_logs').insert({ actor_id: user.id, action: 'auth.login', description: 'User signed in' });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token, id } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email_verified) return res.json({ message: 'Email already verified' });
    if (user.email_verification_token !== token) return res.status(400).json({ error: 'Invalid verification link' });

    // Check expiry (24 hours)
    const sentAt = new Date(user.email_verification_sent_at);
    const hours = (Date.now() - sentAt.getTime()) / 3600000;
    if (hours > 24) return res.status(400).json({ error: 'Verification link expired. Please request a new one.' });

    await supabase.from('users').update({ email_verified: true, email_verification_token: null }).eq('id', id);
    res.json({ message: 'Email verified successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authenticate, async (req, res) => {
  try {
    const token = uuidv4();
    await supabase.from('users').update({ email_verification_token: token, email_verification_sent_at: new Date().toISOString() }).eq('id', req.user.id);
    await sendVerificationEmail(req.user, token);
    res.json({ message: 'Verification email resent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const token = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString();
    await supabase.from('users').update({ password_reset_token: token, password_reset_expires: expires }).eq('id', user.id);
    await sendPasswordResetEmail(user, token);
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    const { data: user } = await supabase.from('users').select('*').eq('password_reset_token', token).single();
    if (!user) return res.status(400).json({ error: 'Invalid reset token' });
    if (new Date(user.password_reset_expires) < new Date()) return res.status(400).json({ error: 'Reset token expired' });

    const hashed = await bcrypt.hash(password, 12);
    await supabase.from('users').update({ password: hashed, password_reset_token: null, password_reset_expires: null, must_change_password: false }).eq('id', user.id);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { current_password, password } = req.body;
    const { data: user } = await supabase.from('users').select('password').eq('id', req.user.id).single();
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(password, 12);
    await supabase.from('users').update({ password: hashed, must_change_password: false, is_temp_password: false }).eq('id', req.user.id);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function sanitizeUser(user) {
  const { password, email_verification_token, password_reset_token, ...safe } = user;
  return safe;
}

module.exports = router;
