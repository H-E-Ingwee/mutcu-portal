const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// GET /api/patron — get all patrons
router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('patrons').select('*').eq('is_active', true).order('role');
    if (error) throw error;
    res.json({ patrons: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/patron — add patron (admin)
router.post('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, email, phone, department, role } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const { data, error } = await supabase.from('patrons').insert({
      name, email: email || null, phone: phone || null,
      department: department || null, role: role || 'patron',
      appointed_by: req.user.id, is_active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ patron: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/patron/:id — update patron
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, email, phone, department, role, is_active, notes } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (department !== undefined) updates.department = department;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;
    if (notes !== undefined) updates.notes = notes;
    const { data, error } = await supabase.from('patrons').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ patron: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/patron/:id — deactivate patron
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await supabase.from('patrons').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Patron deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;