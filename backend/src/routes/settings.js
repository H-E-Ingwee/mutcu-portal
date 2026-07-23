const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

const DEFAULT_SETTINGS = {
  app_name:                   process.env.APP_NAME || 'MUTCU DMS',
  org_name:                   "Murang'a University of Technology Christian Union",
  org_short_name:             'MUTCU',
  org_motto:                  'Inspire Love, Hope & Godliness',
  founding_year:              process.env.MUTCU_FOUNDING_YEAR || '2026',
  contact_email:              process.env.MAIL_REPLY_TO || 'admin@mutcu.org',
  portal_url:                 process.env.FRONTEND_URL || 'https://portal.mutcu.org',
  mail_from_name:             process.env.MAIL_FROM_NAME || 'MUTCU DMS',
  mail_reply_to:              process.env.MAIL_REPLY_TO || 'admin@mutcu.org',
  notify_on_approval:         'true',
  notify_on_rejection:        'true',
  notify_nominations_open:    'true',
  notify_nominees_published:  'true',
  notify_objection_period:    'true',
  allow_self_registration:    'true',
  require_email_verification: 'true',
  default_membership_type:    'full',
};

// GET /api/settings
router.get('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').order('category').order('key');
    if (error) {
      console.warn('[SETTINGS] Table not found, returning defaults:', error.message);
      return res.json({ settings: DEFAULT_SETTINGS, grouped: {}, raw: [], usingDefaults: true });
    }
    const grouped = {};
    const flat = Object.assign({}, DEFAULT_SETTINGS);
    for (const s of data || []) {
      flat[s.key] = s.value;
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    res.json({ settings: flat, grouped, raw: data || [] });
  } catch (err) {
    console.error('[SETTINGS GET ERROR]', err.message);
    res.json({ settings: DEFAULT_SETTINGS, grouped: {}, raw: [], usingDefaults: true });
  }
});

// GET /api/settings/public
router.get('/public', async (req, res) => {
  try {
    const publicKeys = ['app_name', 'org_name', 'org_short_name', 'org_motto', 'founding_year', 'portal_url'];
    const settings = {};
    publicKeys.forEach(function(k) { if (DEFAULT_SETTINGS[k]) settings[k] = DEFAULT_SETTINGS[k]; });
    const { data, error } = await supabase.from('system_settings').select('key,value').in('key', publicKeys);
    if (!error) {
      for (const s of data || []) settings[s.key] = s.value;
    }
    res.json({ settings: settings });
  } catch (err) {
    const settings = {};
    ['app_name','org_name','org_short_name','org_motto','founding_year','portal_url'].forEach(function(k) {
      settings[k] = DEFAULT_SETTINGS[k];
    });
    res.json({ settings: settings });
  }
});

// PUT /api/settings (bulk update)
router.put('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const body = req.body;
    const settings = body.settings;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }
    const tableCheck = await supabase.from('system_settings').select('key').limit(1);
    if (tableCheck.error) {
      return res.status(503).json({
        error: 'Settings table not initialized. Run schema_v3.sql in Supabase SQL Editor first.',
        detail: tableCheck.error.message,
      });
    }
    const updates = [];
    const errors = [];
    const keys = Object.keys(settings);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = String(settings[key]);
      const updateResult = await supabase.from('system_settings')
        .update({ value: value, updated_by: req.user.id, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (updateResult.error) {
        const insertResult = await supabase.from('system_settings').insert({
          key: key,
          value: value,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
          category: 'general',
          updated_by: req.user.id,
          updated_at: new Date().toISOString(),
        });
        if (insertResult.error) {
          errors.push(key + ': ' + insertResult.error.message);
        } else {
          updates.push(key);
        }
      } else {
        updates.push(key);
      }
    }
    
    res.json({
      message: updates.length + ' settings updated',
      updated: updates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('[SETTINGS PUT ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/:key (single update)
router.put('/:key', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const key = req.params.key;
    const value = String(req.body.value);
    const updateResult = await supabase.from('system_settings')
      .update({ value: value, updated_by: req.user.id, updated_at: new Date().toISOString() })
      .eq('key', key)
      .select()
      .single();
    if (updateResult.error) {
      const insertResult = await supabase.from('system_settings').insert({
        key: key,
        value: value,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }),
        category: 'general',
        updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      }).select().single();
      if (insertResult.error) throw insertResult.error;
      return res.json({ setting: insertResult.data });
    }
    res.json({ setting: updateResult.data });
  } catch (err) {
    console.error('[SETTINGS PUT KEY ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;