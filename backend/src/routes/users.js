const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate } = require('../middleware/auth');

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  const { password, email_verification_token, password_reset_token, ...safe } = req.user;
  res.json({ user: safe });
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const allowed = ['phone','primary_ministry','photo_url','photo_public_id'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    
    // Secretary-only fields
    if (['super_admin','ec_admin','cu_secretary'].includes(req.user.role)) {
      ['student_id','gender','year_of_study'].forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    }

    if (!req.user.profile_complete) updates.profile_complete = true;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('users').update(updates).eq('id', req.user.id).select().single();
    if (error) throw error;
    const { password, email_verification_token, password_reset_token, ...safe } = data;
    res.json({ user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
