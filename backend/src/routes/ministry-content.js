const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// Ministry secretary roles — each ministry has its own secretary role
const MINISTRY_SECRETARY_ROLES = [
  'music_secretary', 'creative_arts_secretary', 'technical_media_secretary',
  'hospitality_secretary', 'prayer_secretary', 'missions_secretary',
  'bible_study_secretary', 'discipleship_secretary', 'welfare_secretary',
  'cu_secretary', 'ec_admin', 'super_admin',
];

// Map role to ministry name
const ROLE_TO_MINISTRY = {
  music_secretary: 'Music Ministry',
  creative_arts_secretary: 'Creative Arts Ministry',
  technical_media_secretary: 'Technical & Media Ministry',
  hospitality_secretary: 'Hospitality Ministry',
  prayer_secretary: 'Prayer Ministry',
  missions_secretary: 'Missions & Evangelism Ministry',
  bible_study_secretary: 'Bible Study & Training Ministry',
  discipleship_secretary: 'Discipleship Ministry',
  welfare_secretary: 'Welfare Ministry',
};

function getMinistryForRole(role) {
  return ROLE_TO_MINISTRY[role] || null;
}

function canManageMinistry(user, ministryName) {
  if (['super_admin', 'ec_admin', 'cu_secretary'].includes(user.role)) return true;
  const userMinistry = getMinistryForRole(user.role);
  return userMinistry === ministryName;
}

// GET /api/ministry-content — get content for a ministry
router.get('/', authenticate, async (req, res) => {
  try {
    const { ministry, type } = req.query;
    let query = supabase.from('ministry_content').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (ministry) query = query.eq('ministry_name', ministry);
    if (type) query = query.eq('content_type', type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ content: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/ministry-content/my — content for the user's ministries
router.get('/my', authenticate, async (req, res) => {
  try {
    const user = req.user;
    const ministries = [];
    if (user.primary_ministry) ministries.push(user.primary_ministry);
    if (user.secondary_ministry) ministries.push(user.secondary_ministry);
    if (ministries.length === 0) return res.json({ content: [] });

    const { data, error } = await supabase.from('ministry_content')
      .select('*').eq('is_active', true).in('ministry_name', ministries).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ content: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/ministry-content — create content (ministry secretary or admin)
router.post('/', authenticate, requireRole(...MINISTRY_SECRETARY_ROLES), async (req, res) => {
  try {
    const { ministry_name, content_type, title, body, meeting_day, meeting_time, meeting_venue } = req.body;
    if (!ministry_name || !content_type || !title) {
      return res.status(400).json({ error: 'ministry_name, content_type, and title are required' });
    }
    if (!canManageMinistry(req.user, ministry_name)) {
      return res.status(403).json({ error: 'You can only manage content for your assigned ministry' });
    }
    const { data, error } = await supabase.from('ministry_content').insert({
      ministry_name, content_type, title, body: body || null,
      meeting_day: meeting_day || null, meeting_time: meeting_time || null,
      meeting_venue: meeting_venue || null,
      created_by: req.user.id, is_active: true,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ content: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/ministry-content/:id — update content
router.put('/:id', authenticate, requireRole(...MINISTRY_SECRETARY_ROLES), async (req, res) => {
  try {
    const { data: existing } = await supabase.from('ministry_content').select('ministry_name').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Content not found' });
    if (!canManageMinistry(req.user, existing.ministry_name)) {
      return res.status(403).json({ error: 'You can only manage content for your assigned ministry' });
    }
    const { title, body, meeting_day, meeting_time, meeting_venue, is_active } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (body !== undefined) updates.body = body;
    if (meeting_day !== undefined) updates.meeting_day = meeting_day;
    if (meeting_time !== undefined) updates.meeting_time = meeting_time;
    if (meeting_venue !== undefined) updates.meeting_venue = meeting_venue;
    if (is_active !== undefined) updates.is_active = is_active;
    const { data, error } = await supabase.from('ministry_content').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ content: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/ministry-content/:id
router.delete('/:id', authenticate, requireRole(...MINISTRY_SECRETARY_ROLES), async (req, res) => {
  try {
    const { data: existing } = await supabase.from('ministry_content').select('ministry_name').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Content not found' });
    if (!canManageMinistry(req.user, existing.ministry_name)) {
      return res.status(403).json({ error: 'You can only manage content for your assigned ministry' });
    }
    await supabase.from('ministry_content').update({ is_active: false }).eq('id', req.params.id);
    res.json({ message: 'Content removed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;