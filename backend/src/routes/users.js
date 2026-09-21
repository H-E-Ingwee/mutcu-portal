const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { sendEmail } = require('../lib/email');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  const { password, email_verification_token, password_reset_token, ...safe } = req.user;
  res.json({ user: safe });
});

// PUT /api/users/profile — self-editable fields
router.put('/profile', authenticate, async (req, res) => {
  try {
    const directFields = ['phone', 'primary_ministry', 'secondary_ministry', 'photo_url', 'photo_public_id', 'county', 'occupation', 'course_studied'];
    const updates = {};
    directFields.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const pendingFields = ['year_of_study', 'student_id', 'course_type'];
    const pendingChanges = {};
    pendingFields.forEach(k => { if (req.body[k] !== undefined) pendingChanges[k] = req.body[k]; });

    const isAdmin = ['super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role);
    if (isAdmin) {
      pendingFields.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    } else if (Object.keys(pendingChanges).length > 0) {
      // Fetch current values to show diff
      const { data: current } = await supabase.from('users').select('year_of_study,student_id,course_type').eq('id', req.user.id).single();
      updates.pending_changes = JSON.stringify({
        ...pendingChanges,
        _current: current || {},
        requested_at: new Date().toISOString(),
      });
    }

    if (!req.user.profile_complete) updates.profile_complete = true;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    const { password, email_verification_token, password_reset_token, ...safe } = data;

    const hasPending = Object.keys(pendingChanges).length > 0 && !isAdmin;
    res.json({
      user: safe,
      message: hasPending
        ? 'Profile updated. Changes to sensitive fields are pending secretary approval.'
        : 'Profile updated successfully',
      pendingApproval: hasPending ? Object.keys(pendingChanges) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/pending-changes — secretary sees all members with pending changes
router.get('/pending-changes', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('users')
      .select('id,name,email,mutcu_number,photo_url,primary_ministry,year_of_study,student_id,pending_changes,updated_at')
      .not('pending_changes', 'is', null)
      .eq('enrollment_status', 'active')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    // Parse pending_changes JSON
    const members = (data || []).map(m => ({
      ...m,
      pending_changes: typeof m.pending_changes === 'string' ? JSON.parse(m.pending_changes) : m.pending_changes,
    }));

    res.json({ members, total: members.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/approve-changes — secretary approves pending profile changes
router.post('/:id/approve-changes', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('pending_changes,name,email').eq('id', req.params.id).single();
    if (!user?.pending_changes) return res.status(400).json({ error: 'No pending changes' });

    const changes = typeof user.pending_changes === 'string' ? JSON.parse(user.pending_changes) : user.pending_changes;
    const { requested_at, _current, ...fieldsToApply } = changes;

    const { data, error } = await supabase.from('users')
      .update({ ...fieldsToApply, pending_changes: null, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;

    // Notify member
    sendEmail({
      to: user.email,
      subject: 'MUTCU — Profile Changes Approved',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#04003D,#0a0060);padding:24px 32px">
          <h2 style="color:#FF9700;margin:0">MUTCU DMS — Profile Update Approved</h2>
        </div>
        <div style="padding:24px 32px;background:#fff">
          <p>Dear ${user.name},</p>
          <p>Your profile changes have been reviewed and approved by the Secretary. Your profile has been updated.</p>
          <p style="color:#6B7280;font-size:12px">If you did not request these changes, please contact the Secretary immediately.</p>
        </div>
      </div>`,
    }).catch(() => {});

    const { password, email_verification_token, password_reset_token, ...safe } = data;
    res.json({ user: safe, message: 'Profile changes approved and applied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reject-changes — secretary rejects pending changes
router.post('/:id/reject-changes', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    const { reason } = req.body;
    const { data: user } = await supabase.from('users').select('name,email').eq('id', req.params.id).single();
    await supabase.from('users').update({ pending_changes: null }).eq('id', req.params.id);

    // Notify member
    if (user) {
      sendEmail({
        to: user.email,
        subject: 'MUTCU — Profile Change Request',
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#04003D,#0a0060);padding:24px 32px">
            <h2 style="color:#FF9700;margin:0">MUTCU DMS — Profile Update</h2>
          </div>
          <div style="padding:24px 32px;background:#fff">
            <p>Dear ${user.name},</p>
            <p>Your profile change request has been reviewed. ${reason ? `Reason: ${reason}` : 'Please contact the Secretary for more information.'}</p>
          </div>
        </div>`,
      }).catch(() => {});
    }

    res.json({ message: 'Pending changes rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/users/:id — soft delete account (secretary/admin only)
router.delete('/:id', authenticate, requireRole('super_admin', 'ec_admin', 'cu_secretary'), async (req, res) => {
  try {
    const { reason } = req.body;
    const { data: user } = await supabase.from('users').select('id,name,email,role').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Prevent deleting admins unless super_admin
    if (['super_admin', 'ec_admin'].includes(user.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete admin accounts' });
    }

    // Soft delete — anonymize PII, keep record for audit
    const updatePayload = {
      enrollment_status: 'deleted',
      is_active: false,
      email: `deleted_${user.id}@mutcu.deleted`,
      phone: null,
      photo_url: null,
      photo_public_id: null,
      pending_changes: null,
      updated_at: new Date().toISOString(),
    }

    // Try with schema_v7 columns first, fall back if they don't exist
    let { error: deleteError } = await supabase.from('users').update({
      ...updatePayload,
      deleted_at: new Date().toISOString(),
      deletion_reason: reason || 'Deleted by admin',
    }).eq('id', req.params.id)

    if (deleteError) {
      // Fallback: update without schema_v7 columns
      const { error: fallbackError } = await supabase.from('users').update(updatePayload).eq('id', req.params.id)
      if (fallbackError) throw fallbackError
    }

    // Audit log — use then/catch pattern for Supabase v2 compatibility
    supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'user.deleted',
      entity_type: 'user',
      entity_id: req.params.id,
      description: `Account for ${user.name} deleted by ${req.user.name}. Reason: ${reason || 'Not specified'}. Original email: ${user.email}`,
    }).then(() => {}).catch(() => {})

    res.json({ message: `Account for ${user.name} has been deleted successfully` });
  } catch (err) {
    console.error('[USER DELETE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

 // POST /api/users/request-email-change — step 1: send verification to current email
router.post('/request-email-change', authenticate, async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store token
    await supabase.from('email_change_tokens').insert({
      user_id: req.user.id,
      current_email: req.user.email,
      token,
      step: 'verify_current',
      expires_at: expiresAt.toISOString(),
    });

    const verifyUrl = `${process.env.FRONTEND_URL}/profile/verify-email-change?token=${token}&step=verify`

    await sendEmail({
      to: req.user.email,
      subject: 'MUTCU — Verify Email Change Request',
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#04003D,#0a0060);padding:24px 32px">
          <h2 style="color:#FF9700;margin:0">MUTCU DMS — Email Change Request</h2>
        </div>
        <div style="padding:24px 32px;background:#fff">
          <p>Dear ${req.user.name},</p>
          <p>We received a request to change your email address. Click the button below to verify this request:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${verifyUrl}" style="background:#FF9700;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Verify Email Change</a>
          </div>
          <p style="color:#6B7280;font-size:12px">This link expires in 30 minutes. If you did not request this, please ignore this email.</p>
        </div>
      </div>`,
    });

    res.json({ message: 'Verification email sent to your current email address. Please check your inbox.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/verify-email-change — step 2: verify token + set new email
router.post('/verify-email-change', authenticate, async (req, res) => {
  try {
    const { token, new_email } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const { data: record } = await supabase.from('email_change_tokens')
      .select('*').eq('token', token).eq('user_id', req.user.id).is('used_at', null).single();

    if (!record) return res.status(400).json({ error: 'Invalid or expired token' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Token has expired. Please request a new one.' });

    if (!new_email) {
      // Step 1 verified — token is valid, ask for new email
      return res.json({ verified: true, message: 'Current email verified. Please provide your new email address.' });
    }

    // Validate new email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(new_email)) return res.status(400).json({ error: 'Invalid email address' });

    // Check if email already in use
    const { data: existing } = await supabase.from('users').select('id').eq('email', new_email).single();
    if (existing) return res.status(400).json({ error: 'This email address is already in use' });

    // Update email
    const { error } = await supabase.from('users').update({
      email: new_email,
      updated_at: new Date().toISOString(),
    }).eq('id', req.user.id);
    if (error) throw error;

    // Mark token as used
    await supabase.from('email_change_tokens').update({ used_at: new Date().toISOString(), new_email }).eq('id', record.id);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'user.email_changed',
      entity_type: 'user',
      entity_id: req.user.id,
      description: `Email changed from ${record.current_email} to ${new_email}`,
    }).catch(() => {});

    res.json({ message: 'Email address updated successfully. Please log in again with your new email.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;