const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// GET /api/advisory — get advisory board members
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('advisory_board').select('*').eq('is_active', true).order('role');
    if (error) throw error;
    res.json({ members: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/advisory — add advisory board member (admin, must be within 3 weeks of commissioning)
router.post('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, email, phone, role, spiritual_year, notes, user_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { data, error } = await supabase.from('advisory_board').insert({
      name, email: email || null, phone: phone || null,
      role: role || 'member', spiritual_year: spiritual_year || null,
      notes: notes || null, user_id: user_id || null,
      appointed_by: req.user.id, is_active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ member: data, message: 'Advisory Board member added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/advisory/:id — update member
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, email, phone, role, spiritual_year, notes, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (role !== undefined) updates.role = role;
    if (spiritual_year !== undefined) updates.spiritual_year = spiritual_year;
    if (notes !== undefined) updates.notes = notes;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await supabase.from('advisory_board').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ member: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/advisory/:id
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await supabase.from('advisory_board').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Advisory Board member removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;