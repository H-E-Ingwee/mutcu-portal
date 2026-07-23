const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];

// Default settings fallback (used when table doesn't exist yet)
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
}

// GET /api/settings — get all settings (admin)
router.get('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('system_settings').select('*').order('category').order('key');
    if (error) {
      console.warn('[SETTINGS] Table not found, returning defaults. Run schema_v3.sql in Supabase.')
      return res.json({ settings: DEFAULT_SETTINGS, grouped: {}, raw: [], usingDefaults: true });
    }
    const grouped = {};
    const flat = { ...DEFAULT_SETTINGS };
    for (const s of data || []) {
      flat[s.key] = s.value;
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    res.json({ settings: flat, grouped, raw: data || [] });
  } catch (err) {
    res.json({ settings: DEFAULT_SETTINGS, grouped: {}, raw: [], usingDefaults: true });
  }
});

// GET /api/settings/public — public settings (no auth)
router.get('/public', async (req, res) => {
  try {
    const publicKeys = ['app_name', 'org_name', 'org_short_name', 'org_motto', 'founding_year', 'portal_url'];
    const settings = {};
    publicKeys.forEach(k => { if (DEFAULT_SETTINGS[k]) settings[k] = DEFAULT_SETTINGS[k]; });
    const { data, error } = await supabase.from('system_settings').select('key,value').in('key', publicKeys);
    if (!error) for (const s of data || []) settings[s.key] = s.value;
    res.json({ settings });
  } catch (err) {
    const settings = {};
    ['app_name','org_name','org_short_name','org_motto','founding_year','portal_url']
      .forEach(k => { settings[k] = DEFAULT_SETTINGS[k]; });
    res.json({ settings });
  }
});

// PUT /api/settings — bulk update settings (admin)
router.put('/', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'settings object required' });
    }

    // Check table exists
    const { error: tableCheck } = await supabase.from('system_settings').select('key').limit(1);
    if (tableCheck) {
      return res.status(503).json({
        error: 'Settings table not initialized. Please run schema_v3.sql in Supabase SQL Editor first.',
      });
    }

    const updates = [];
    const errors = [];

    for (const [key, value] of Object.entries(settings)) {
      // Try update first (row should exist from seed data)
      const { error: updateError } = await supabase.from('system_settings')
        .update({
          value: String(value),
          updated_by: req.user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key);

      if (updateError) {
        // Row doesn't exist — insert it
        const { error: insertError } = await supabase.from('system_settings').insert({
          key,
          value: String(value),
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          category: 'general',
          updated_by: req.user.id,
          updated_at: new Date().toISOString(),
        });
        if (insertError) errors.push(`${key}: ${insertError.message}`);
        else updates.push(key);
      } else {
        updates.push(key);
      }
    }

    // Audit log
    if (updates.length > 0) {
      await supabase.from('audit_logs').insert({
        actor_id: req.user.id,
        action: 'settings.update',
        description: `Updated settings: ${updates.join(', ')}`,
      }).catch(() => {});
    }

    res.json({
      message: `${updates.length} settings updated`,
      updated: updates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/:key — update single setting (admin)
router.put('/:key', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { value } = req.body;
    const key = req.params.key;

    // Try update first
    const { data: updated, error: updateError } = await supabase.from('system_settings')
      .update({
        value: String(value),
        updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select().single();

    if (updateError) {
      // Insert if not found
      const { data: inserted, error: insertError } = await supabase.from('system_settings').insert({
        key,
        value: String(value),
        label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        category: 'general',
        updated_by: req.user.id,
        updated_at: new Date().toISOString(),
      }).select().single();
      if (insertError) throw insertError;
      return res.json({ setting: inserted });
    }

    res.json({ setting: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;