const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];
const SECRETARY = ['super_admin', 'ec_admin', 'cu_secretary'];

// GET /api/ministries — public list (active only)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ministries')
      .select('*').eq('is_active', true).order('display_order');
    if (error) throw error;
    res.json({ ministries: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ministries/all — all ministries including inactive (admin)
router.get('/all', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('ministries')
      .select('*').order('display_order');
    if (error) throw error;
    res.json({ ministries: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ministries/:id/members — members of a specific ministry
router.get('/:id/members', authenticate, requireRole(...SECRETARY, 'ministry_secretary'), async (req, res) => {
  try {
    const user = req.user;
    // Ministry secretaries can only see their own ministry
    if (user.role === 'ministry_secretary') {
      const { data: mm } = await supabase.from('ministry_members')
        .select('ministry_id').eq('user_id', user.id).eq('ministry_role', 'secretary').single();
      if (!mm || mm.ministry_id !== req.params.id) {
        return res.status(403).json({ error: 'Access denied to this ministry' });
      }
    }
    const { data, error } = await supabase.from('ministry_members')
      .select('*, user:user_id(id,name,email,photo_url,mutcu_number,year_of_study,enrollment_status,primary_ministry)')
      .eq('ministry_id', req.params.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    res.json({ members: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ministries — create ministry (admin)
router.post('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, description, display_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Ministry name is required' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await supabase.from('ministries').insert({
      name, slug, description: description || null,
      display_order: display_order || 99, is_active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ ministry: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/ministries/:id — update ministry (admin)
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { name, description, display_order, is_active } = req.body;
    const updates = {};
    if (name !== undefined) {
      updates.name = name;
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    if (description !== undefined) updates.description = description;
    if (display_order !== undefined) updates.display_order = parseInt(display_order);
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await supabase.from('ministries').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ ministry: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ministries/:id — soft delete (admin)
router.delete('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    await supabase.from('ministries').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Ministry deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ministries/:id/assign — assign member to ministry (secretary+)
router.post('/:id/assign', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { user_id, ministry_role } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const { data: existing } = await supabase.from('ministry_members')
      .select('id').eq('user_id', user_id).eq('ministry_id', req.params.id).single();
    let data, error;
    if (existing) {
      const result = await supabase.from('ministry_members')
        .update({ is_active: true, ministry_role: ministry_role || 'member', assigned_by: req.user.id, assigned_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      data = result.data; error = result.error;
    } else {
      const result = await supabase.from('ministry_members').insert({
        user_id, ministry_id: req.params.id,
        ministry_role: ministry_role || 'member',
        assigned_by: req.user.id, is_active: true,
      }).select().single();
      data = result.data; error = result.error;
    }
    if (error) throw error;
    // If assigning as secretary, update user role to ministry_secretary
    if (ministry_role === 'secretary') {
      await supabase.from('users').update({ role: 'ministry_secretary' }).eq('id', user_id);
    }
    res.json({ assignment: data, message: 'Member assigned to ministry' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ministries/:id/assign/:userId — remove from ministry
router.delete('/:id/assign/:userId', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    await supabase.from('ministry_members')
      .update({ is_active: false }).eq('user_id', req.params.userId).eq('ministry_id', req.params.id);
    res.json({ message: 'Member removed from ministry' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ministries/my — ministry secretary's own ministry
router.get('/my', authenticate, requireRole('ministry_secretary', ...SECRETARY), async (req, res) => {
  try {
    const user = req.user;
    if (['super_admin', 'ec_admin', 'cu_secretary'].includes(user.role)) {
      // Return all ministries for full secretaries
      const { data } = await supabase.from('ministries').select('*').eq('is_active', true).order('display_order');
      return res.json({ ministries: data || [], isMinistrySecretary: false });
    }
    // Ministry secretary — find their assigned ministry
    const { data: assignment } = await supabase.from('ministry_members')
      .select('*, ministry:ministry_id(*)')
      .eq('user_id', user.id).eq('ministry_role', 'secretary').eq('is_active', true).single();
    if (!assignment) return res.status(404).json({ error: 'No ministry assignment found' });
    res.json({ ministry: assignment.ministry, isMinistrySecretary: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;