const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// GET /api/settings — get all settings (admin)
router.get('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').order('category').order('key');
    if (error) throw error;
    // Convert to key-value map grouped by category
    const grouped = {};
    const flat = {};
    for (const s of data || []) {
      flat[s.key] = s.value;
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    res.json({ settings: flat, grouped, raw: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/settings/public — public settings (no auth — for frontend branding)
router.get('/public', async (req, res) => {
  try {
    const publicKeys = ['app_name', 'org_name', 'org_short_name', 'org_motto', 'founding_year', 'portal_url'];
    const { data } = await supabase.from('system_settings').select('key,value').in('key', publicKeys);
    const settings = {};
    for (const s of data || []) settings[s.key] = s.value;
    res.json({ settings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/settings — bulk update settings (admin)
router.put('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { settings } = req.body; // { key: value, ... }
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }
    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase.from('system_settings')
        .update({ value: String(value), updated_by: req.user.id, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (!error) updates.push(key);
    }
    // Log to audit
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id, action: 'settings.update',
      description: `Updated settings: ${updates.join(', ')}`,
    }).catch(() => {});
    res.json({ message: `${updates.length} settings updated`, updated: updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/settings/:key — update single setting (admin)
router.put('/:key', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { value } = req.body;
    const { data, error } = await supabase.from('system_settings')
      .update({ value: String(value), updated_by: req.user.id, updated_at: new Date().toISOString() })
      .eq('key', req.params.key).select().single();
    if (error) throw error;
    res.json({ setting: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;