const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// GET /api/positions — active positions (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('positions')
      .select('*').eq('is_active', true).order('display_order');
    if (error) throw error;
    res.json({ positions: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/positions/all — all positions including inactive (admin)
router.get('/all', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('positions').select('*').order('display_order');
    if (error) throw error;
    res.json({ positions: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/positions — create position (admin)
router.post('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { title, description, gender_constraint, max_terms, chair_max_one_term, display_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Position title is required' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase.from('positions').insert({
      title, slug, description: description || null,
      gender_constraint: gender_constraint || null,
      max_terms: max_terms || 2,
      chair_max_one_term: !!chair_max_one_term,
      display_order: display_order || 99,
      is_active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ position: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/positions/:id — update position (admin)
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { title, description, gender_constraint, max_terms, chair_max_one_term, display_order, is_active } = req.body;
    const updates = {};
    if (title !== undefined) {
      updates.title = title;
      updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updates.description = description;
    if (gender_constraint !== undefined) updates.gender_constraint = gender_constraint || null;
    if (max_terms !== undefined) updates.max_terms = parseInt(max_terms);
    if (chair_max_one_term !== undefined) updates.chair_max_one_term = !!chair_max_one_term;
    if (display_order !== undefined) updates.display_order = parseInt(display_order);
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await supabase.from('positions').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ position: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/positions/:id — soft delete (admin)
router.delete('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    await supabase.from('positions').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Position deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;