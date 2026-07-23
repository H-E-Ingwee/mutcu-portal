const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// GET /api/calendar — get all published events (authenticated members)
router.get('/', authenticate, async (req, res) => {
  try {
    const { year, type } = req.query;
    let query = supabase.from('spiritual_calendar')
      .select('*').eq('is_published', true).order('event_date', { ascending: true });
    if (year) query = query.eq('spiritual_year', year);
    if (type) query = query.eq('event_type', type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ events: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/calendar/all — all events including unpublished (admin)
router.get('/all', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { year } = req.query;
    let query = supabase.from('spiritual_calendar').select('*').order('event_date', { ascending: true });
    if (year) query = query.eq('spiritual_year', year);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ events: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/calendar/years — distinct spiritual years
router.get('/years', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('spiritual_calendar')
      .select('spiritual_year').order('spiritual_year', { ascending: false });
    const years = [...new Set((data || []).map(e => e.spiritual_year))];
    res.json({ years });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/calendar — create event (admin)
router.post('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { spiritual_year, title, event_type, event_date, end_date, description, is_recurring, is_published } = req.body;
    if (!title || !event_date || !spiritual_year || !event_type) {
      return res.status(400).json({ error: 'title, event_date, spiritual_year and event_type are required' });
    }
    const { data, error } = await supabase.from('spiritual_calendar').insert({
      spiritual_year, title, event_type, event_date,
      end_date: end_date || null,
      description: description || null,
      is_recurring: !!is_recurring,
      is_published: is_published !== false,
      created_by: req.user.id,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ event: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/calendar/:id — update event (admin)
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { spiritual_year, title, event_type, event_date, end_date, description, is_recurring, is_published } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (spiritual_year !== undefined) updates.spiritual_year = spiritual_year;
    if (title !== undefined) updates.title = title;
    if (event_type !== undefined) updates.event_type = event_type;
    if (event_date !== undefined) updates.event_date = event_date;
    if (end_date !== undefined) updates.end_date = end_date || null;
    if (description !== undefined) updates.description = description;
    if (is_recurring !== undefined) updates.is_recurring = !!is_recurring;
    if (is_published !== undefined) updates.is_published = !!is_published;
    const { data, error } = await supabase.from('spiritual_calendar')
      .update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ event: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/calendar/:id — delete event (admin)
router.delete('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    await supabase.from('spiritual_calendar').delete().eq('id', req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;