const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN = ['super_admin', 'ec_admin'];
const SECRETARY = ['super_admin', 'ec_admin', 'cu_secretary'];

// GET /api/disciplinary — list all cases (admin/secretary)
router.get('/', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { status, severity, page = 1, limit = 30 } = req.query;
    let query = supabase.from('disciplinary_cases')
      .select('*, user:user_id(id,name,email,mutcu_number,photo_url,primary_ministry), reporter:reported_by(name), reviewer:reviewed_by(name)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    const from = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(from, from + parseInt(limit) - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ cases: data || [], total: count || 0, page: parseInt(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/disciplinary/member/:userId — cases for a specific member
router.get('/member/:userId', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { data, error } = await supabase.from('disciplinary_cases')
      .select('*, reporter:reported_by(name), reviewer:reviewed_by(name)')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ cases: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/disciplinary/:id — single case
router.get('/:id', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { data, error } = await supabase.from('disciplinary_cases')
      .select('*, user:user_id(id,name,email,mutcu_number,photo_url,primary_ministry,year_of_study), reporter:reported_by(name), reviewer:reviewed_by(name)')
      .eq('id', req.params.id).single();
    if (error) throw error;
    res.json({ case: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disciplinary — open new case
router.post('/', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { user_id, title, description, severity } = req.body;
    if (!user_id || !title || !description) {
      return res.status(400).json({ error: 'user_id, title and description are required' });
    }
    const { data, error } = await supabase.from('disciplinary_cases').insert({
      user_id,
      title,
      description,
      severity: severity || 'minor',
      status: 'open',
      reported_by: req.user.id,
      opened_at: new Date().toISOString(),
    }).select('*, user:user_id(name,email,mutcu_number)').single();
    if (error) throw error;

    // Update member disciplinary status
    await supabase.from('users').update({ disciplinary_status: 'under_review' }).eq('id', user_id);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'disciplinary.open',
      entity_type: 'disciplinary_case',
      entity_id: data.id,
      description: 'Opened disciplinary case: ' + title + ' for ' + data.user?.name,
    }).then(function() {}).catch(function() {});

    res.status(201).json({ case: data, message: 'Disciplinary case opened. Case number: ' + data.case_number });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/disciplinary/:id — update case
router.put('/:id', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { title, description, severity, status, outcome, outcome_notes } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (severity !== undefined) updates.severity = severity;
    if (status !== undefined) updates.status = status;
    if (outcome !== undefined) updates.outcome = outcome;
    if (outcome_notes !== undefined) updates.outcome_notes = outcome_notes;
    if (status === 'resolved' || status === 'dismissed') {
      updates.resolved_at = new Date().toISOString();
      updates.reviewed_by = req.user.id;
    }
    const { data, error } = await supabase.from('disciplinary_cases')
      .update(updates).eq('id', req.params.id)
      .select('*, user:user_id(id,name)').single();
    if (error) throw error;

    // Sync member disciplinary_status based on outcome
    if (outcome && data.user?.id) {
      let memberStatus = 'under_review';
      if (outcome === 'cleared' || outcome === 'dismissed') memberStatus = 'clear';
      else if (outcome === 'suspension') memberStatus = 'suspended';
      else if (outcome === 'warning') memberStatus = 'under_review';
      await supabase.from('users').update({ disciplinary_status: memberStatus }).eq('id', data.user.id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'disciplinary.update',
      entity_type: 'disciplinary_case',
      entity_id: req.params.id,
      description: 'Updated case ' + req.params.id + ' — status: ' + (status || 'unchanged'),
    }).then(function() {}).catch(function() {});

    res.json({ case: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disciplinary/:id/resolve — resolve a case
router.post('/:id/resolve', authenticate, requireRole(...SECRETARY), async (req, res) => {
  try {
    const { outcome, outcome_notes } = req.body;
    if (!outcome) return res.status(400).json({ error: 'outcome is required' });

    const { data, error } = await supabase.from('disciplinary_cases')
      .update({
        status: 'resolved',
        outcome,
        outcome_notes: outcome_notes || null,
        reviewed_by: req.user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .select('*, user:user_id(id,name,email)').single();
    if (error) throw error;

    // Sync member disciplinary_status
    if (data.user?.id) {
      let memberStatus = 'under_review';
      if (outcome === 'cleared' || outcome === 'dismissed') memberStatus = 'clear';
      else if (outcome === 'suspension') memberStatus = 'suspended';
      await supabase.from('users').update({ disciplinary_status: memberStatus }).eq('id', data.user.id);
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'disciplinary.resolve',
      entity_type: 'disciplinary_case',
      entity_id: req.params.id,
      description: 'Resolved case — outcome: ' + outcome,
    }).then(function() {}).catch(function() {});

    res.json({ case: data, message: 'Case resolved with outcome: ' + outcome });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/disciplinary/:id — delete case (super_admin only)
router.delete('/:id', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    await supabase.from('disciplinary_cases').delete().eq('id', req.params.id);
    res.json({ message: 'Case deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/disciplinary/sync-finalists — auto-update finalist status
router.post('/sync-finalists', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    // Mark finalists: year_of_study >= 4 OR graduation_year <= currentYear + 1
    const { data: toMark } = await supabase.from('users')
      .select('id, name, year_of_study, graduation_year')
      .eq('enrollment_status', 'active')
      .eq('is_active', true)
      .eq('is_finalist', false)
      .or(`year_of_study.gte.4,graduation_year.lte.${currentYear + 1}`);

    let marked = 0;
    for (const u of toMark || []) {
      await supabase.from('users').update({ is_finalist: true }).eq('id', u.id);
      marked++;
    }

    // Clear finalists: year_of_study < 4 AND graduation_year > currentYear + 1
    const { data: toClear } = await supabase.from('users')
      .select('id, name, year_of_study, graduation_year')
      .eq('enrollment_status', 'active')
      .eq('is_active', true)
      .eq('is_finalist', true)
      .lt('year_of_study', 4)
      .gt('graduation_year', currentYear + 1);

    let cleared = 0;
    for (const u of toClear || []) {
      await supabase.from('users').update({ is_finalist: false }).eq('id', u.id);
      cleared++;
    }

    res.json({
      message: 'Finalist status synced',
      marked,
      cleared,
      summary: marked + ' members marked as finalists, ' + cleared + ' cleared',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;