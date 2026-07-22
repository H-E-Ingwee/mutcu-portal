const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole, requireApproved } = require('../middleware/auth');
const { sendApprovalEmail, sendVerificationEmail } = require('../lib/email');

// GET /api/members — list all members (secretary+)
router.get('/', authenticate, requireRole('super_admin','ec_admin','cu_secretary','ministry_secretary'), async (req, res) => {
  try {
    const { search, ministry, year, type, status, page = 1, limit = 30 } = req.query;
    let query = supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,mutcu_number.ilike.%${search}%,student_id.ilike.%${search}%`);
    if (ministry) query = query.eq('primary_ministry', ministry);
    if (year) query = query.eq('year_of_study', parseInt(year));
    if (type) query = query.eq('membership_type', type);
    if (status) query = query.eq('enrollment_status', status);

    const from = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(from, from + parseInt(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ members: data.map(sanitize), total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/pending
router.get('/pending', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('enrollment_status', 'pending').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ members: data.map(sanitize) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: sanitize(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members — enroll new member (secretary+)
router.post('/', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { name, email, student_id, gender, year_of_study, membership_type, primary_ministry, faith_declaration_signed } = req.body;
    
    const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const tempPassword = Math.random().toString(36).slice(-10);
    const hashed = await bcrypt.hash(tempPassword, 12);
    const schoolPrefix = student_id ? student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase() : '';
    const match = student_id ? student_id.match(/(\d{4})$/) : null;
    const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear();
    const graduationYear = admissionYear + (schoolPrefix === 'SE' ? 5 : 4);

    // Generate MUTCU number
    const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear();
    const { data: lastUser } = await supabase.from('users').select('mutcu_number').like('mutcu_number', `MUTCU-${year}-%`).order('mutcu_number', { ascending: false }).limit(1);
    let seq = 1;
    if (lastUser && lastUser.length > 0) seq = parseInt(lastUser[0].mutcu_number.split('-')[2]) + 1;
    const mutcuNumber = `MUTCU-${year}-${String(seq).padStart(4, '0')}`;

    const verificationToken = uuidv4();
    const { data: user, error } = await supabase.from('users').insert({
      name, email, password: hashed,
      student_id: student_id || null,
      school_prefix: schoolPrefix,
      gender, year_of_study: parseInt(year_of_study),
      graduation_year: graduationYear,
      membership_type: membership_type || 'full',
      membership_tier: 'general',
      primary_ministry: primary_ministry || null,
      faith_declaration_signed: !!faith_declaration_signed,
      declaration_signed_at: faith_declaration_signed ? new Date().toISOString() : null,
      enrollment_status: 'active',
      enrollment_year: new Date().getFullYear(),
      membership_year: new Date().getFullYear(),
      role: 'full_member',
      mutcu_number: mutcuNumber,
      email_verified: false,
      email_verification_token: verificationToken,
      email_verification_sent_at: new Date().toISOString(),
      is_active: true,
      profile_complete: true,
      disciplinary_status: 'clear',
      must_change_password: true,
      is_temp_password: true,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
    }).select().single();

    if (error) throw error;

    // Send welcome email with temp password
    await sendVerificationEmail({ ...user, temp_password: tempPassword }, verificationToken);

    res.status(201).json({ member: sanitize(user), message: `Member enrolled. MUTCU number: ${mutcuNumber}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/members/:id — update member
router.put('/:id', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const allowed = ['name','student_id','gender','year_of_study','membership_type','enrollment_status','primary_ministry','disciplinary_status','is_finalist','sgc_executive_role','photo_url','photo_public_id'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    if (updates.student_id) {
      const prefix = updates.student_id.replace(/[^A-Za-z]/g, '').substring(0, 2).toUpperCase();
      const match = updates.student_id.match(/(\d{4})$/);
      const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear();
      updates.school_prefix = prefix;
      updates.graduation_year = admissionYear + (prefix === 'SE' ? 5 : 4);
    }

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ member: sanitize(data) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:id/approve
router.post('/:id/approve', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data: member } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (!member) return res.status(404).json({ error: 'Member not found' });

    let mutcuNumber = member.mutcu_number;
    if (!mutcuNumber) {
      const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear();
      const { data: lastUser } = await supabase.from('users').select('mutcu_number').like('mutcu_number', `MUTCU-${year}-%`).order('mutcu_number', { ascending: false }).limit(1);
      let seq = 1;
      if (lastUser && lastUser.length > 0) seq = parseInt(lastUser[0].mutcu_number.split('-')[2]) + 1;
      mutcuNumber = `MUTCU-${year}-${String(seq).padStart(4, '0')}`;
    }

    const { data: updated, error } = await supabase.from('users').update({
      enrollment_status: 'active',
      mutcu_number: mutcuNumber,
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      is_active: true,
    }).eq('id', req.params.id).select().single();

    if (error) throw error;
    await sendApprovalEmail({ ...updated, mutcu_number: mutcuNumber });
    res.json({ member: sanitize(updated), message: `Approved. MUTCU number: ${mutcuNumber}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/members/:id/reject
router.post('/:id/reject', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    await supabase.from('users').update({ enrollment_status: 'rejected', rejection_reason: req.body.reason || '' }).eq('id', req.params.id);
    res.json({ message: 'Registration rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/members/public/:mutcuNumber — public profile
router.get('/public/:mutcuNumber', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('name,mutcu_number,photo_url,primary_ministry,membership_type,membership_tier,membership_year,enrollment_status').eq('mutcu_number', req.params.mutcuNumber).single();
    if (error || !data) return res.status(404).json({ error: 'Member not found' });
    if (data.enrollment_status !== 'active') return res.status(404).json({ error: 'Member not found' });
    res.json({ member: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/members/import — bulk CSV import
router.post('/import', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    // Simple CSV import - expects JSON array from frontend
    const { members: membersData } = req.body
    if (!membersData || !Array.isArray(membersData)) return res.status(400).json({ error: 'Invalid data format' })
    
    let count = 0; const errors = []
    for (const row of membersData) {
      if (!row.name || !row.email) { errors.push(`Missing name or email`); continue }
      const { data: existing } = await supabase.from('users').select('id').eq('email', row.email).single()
      if (existing) { errors.push(`${row.email} already exists`); continue }
      
      const tempPassword = Math.random().toString(36).slice(-10)
      const hashed = await bcrypt.hash(tempPassword, 12)
      const prefix = (row.student_id||'').replace(/[^A-Za-z]/g,'').substring(0,2).toUpperCase()
      const match = (row.student_id||'').match(/(\d{4})$/)
      const admissionYear = match ? parseInt(match[1]) : new Date().getFullYear()
      const year = process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear()
      const { data: lastUser } = await supabase.from('users').select('mutcu_number').like('mutcu_number', `MUTCU-${year}-%`).order('mutcu_number', { ascending: false }).limit(1)
      let seq = 1; if (lastUser && lastUser.length > 0) seq = parseInt(lastUser[0].mutcu_number.split('-')[2]) + 1
      const mutcuNumber = `MUTCU-${year}-${String(seq).padStart(4,'0')}`
      
      const { error } = await supabase.from('users').insert({
        name: row.name, email: row.email, password: hashed,
        student_id: row.student_id||null, school_prefix: prefix,
        gender: row.gender||null, year_of_study: row.year_of_study ? parseInt(row.year_of_study) : null,
        graduation_year: admissionYear + (prefix==='SE'?5:4),
        membership_type: row.membership_type||'full', membership_tier: 'general',
        primary_ministry: row.primary_ministry||null,
        faith_declaration_signed: true, declaration_signed_at: new Date().toISOString(),
        enrollment_status: 'active', enrollment_year: new Date().getFullYear(),
        membership_year: new Date().getFullYear(), role: 'full_member',
        mutcu_number: mutcuNumber, email_verified: false,
        is_active: true, profile_complete: true, disciplinary_status: 'clear',
        must_change_password: true, is_temp_password: true,
        approved_by: req.user.id, approved_at: new Date().toISOString(),
      })
      if (error) { errors.push(`${row.email}: ${error.message}`); continue }
      count++
    }
    
    let msg = `Imported ${count} members successfully.`
    if (errors.length) msg += ` Errors: ${errors.slice(0,3).join('; ')}`
    res.json({ message: msg, count, errors: errors.slice(0,5) })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

function sanitize(user) {
  if (!user) return null;
  const { password, email_verification_token, password_reset_token, ...safe } = user;
  return safe;
}

module.exports = router;
