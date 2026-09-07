const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  const { password, email_verification_token, password_reset_token, ...safe } = req.user;
  res.json({ user: safe });
});

// PUT /api/users/profile — self-editable fields
router.put('/profile', authenticate, async (req, res) => {
  try {
    // Fields members can edit directly (no approval needed)
    const directFields = ['phone', 'primary_ministry', 'secondary_ministry', 'photo_url', 'photo_public_id'];
    const updates = {};
    directFields.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    // Fields that require secretary/admin approval — store as pending_changes
    const pendingFields = ['email', 'year_of_study', 'student_id', 'course_type'];
    const pendingChanges = {};
    pendingFields.forEach(k => { if (req.body[k] !== undefined) pendingChanges[k] = req.body[k]; });

    // Admins/secretaries can update directly
    const isAdmin = ['super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role);
    if (isAdmin) {
      pendingFields.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    } else if (Object.keys(pendingChanges).length > 0) {
      // Store pending changes for approval
      updates.pending_changes = JSON.stringify({
        ...pendingChanges,
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
        ? 'Profile updated. Changes to sensitive fields (email, year of study, student ID) are pending secretary approval.'
        : 'Profile updated successfully',
      pendingApproval: hasPending ? Object.keys(pendingChanges) : [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/approve-changes — secretary approves pending profile changes
router.post('/:id/approve-changes', authenticate, async (req, res) => {
  try {
    if (!['super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { data: user } = await supabase.from('users').select('pending_changes').eq('id', req.params.id).single();
    if (!user?.pending_changes) return res.status(400).json({ error: 'No pending changes' });

    const changes = typeof user.pending_changes === 'string' ? JSON.parse(user.pending_changes) : user.pending_changes;
    const { requested_at, ...fieldsToApply } = changes;

    const { data, error } = await supabase.from('users')
      .update({ ...fieldsToApply, pending_changes: null, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single();
    if (error) throw error;

    const { password, email_verification_token, password_reset_token, ...safe } = data;
    res.json({ user: safe, message: 'Profile changes approved and applied' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/users/:id/reject-changes — secretary rejects pending changes
router.post('/:id/reject-changes', authenticate, async (req, res) => {
  try {
    if (!['super_admin', 'ec_admin', 'cu_secretary'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    await supabase.from('users').update({ pending_changes: null }).eq('id', req.params.id);
    res.json({ message: 'Pending changes rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
