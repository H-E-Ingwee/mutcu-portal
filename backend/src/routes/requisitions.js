const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

// Constitutional role structure:
// - Ministry Secretary/Coordinator submits requisition
// - Ministry Chairperson (EC coordinator for that ministry) endorses
// - CU Treasurer (cu_treasurer) reviews and sets approved amounts
// - Chairperson of Union (ec_admin) gives final approval/signature
// - CU Treasurer (cu_treasurer) disburses funds

const ALL_MINISTRY_ROLES = [
  'music_secretary', 'creative_arts_secretary', 'technical_media_secretary',
  'hospitality_secretary', 'prayer_secretary', 'missions_secretary',
  'bible_study_secretary', 'discipleship_secretary', 'welfare_secretary',
  'ministry_secretary', 'music_coordinator', 'creative_arts_coordinator',
  'tech_media_coordinator', 'prayer_coordinator', 'missions_coordinator',
  'bible_study_coordinator', 'discipleship_coordinator',
  'interim_music_coordinator', 'interim_creative_arts_coordinator',
  'interim_tech_media_coordinator', 'interim_prayer_coordinator',
  'interim_missions_coordinator', 'interim_bible_study_coordinator',
];

const TREASURER_ROLES = ['cu_treasurer', 'super_admin'];
const APPROVAL_ROLES = ['ec_admin', 'super_admin']; // Chairperson of Union
const CAN_SUBMIT = [...ALL_MINISTRY_ROLES, 'cu_treasurer', 'ec_admin', 'super_admin', 'cu_secretary', '1st_vp', '2nd_vp', 'vice_secretary', 'interim_chair', 'interim_secretary', 'interim_treasurer'];
const CAN_VIEW_ALL = ['cu_treasurer', 'ec_admin', 'super_admin', 'cu_secretary'];

// GET /api/requisitions/stats/summary
router.get('/stats/summary', authenticate, requireRole(...CAN_VIEW_ALL), async (req, res) => {
  try {
    const { spiritual_year } = req.query;
    let query = supabase.from('requisitions').select('status,total_requested,total_approved,ministry');
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year);
    const { data } = await query;
    const summary = { total_submitted: 0, total_requested: 0, total_approved: 0, total_disbursed: 0, by_status: {}, by_ministry: {} };
    for (const r of data || []) {
      summary.total_submitted++;
      summary.total_requested += parseFloat(r.total_requested) || 0;
      if (r.total_approved) summary.total_approved += parseFloat(r.total_approved) || 0;
      if (r.status === 'disbursed') summary.total_disbursed += parseFloat(r.total_approved || r.total_requested) || 0;
      summary.by_status[r.status] = (summary.by_status[r.status] || 0) + 1;
      if (r.ministry) summary.by_ministry[r.ministry] = (summary.by_ministry[r.ministry] || 0) + (parseFloat(r.total_requested) || 0);
    }
    res.json({ summary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/requisitions
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, ministry, spiritual_year, page = 1, limit = 30 } = req.query;
    const user = req.user;
    let query = supabase.from('requisitions')
      .select('*, requester:requested_by(name,email,mutcu_number,photo_url,role,primary_ministry), reviewer:reviewed_by(name,role), approver:approved_by(name,role), endorser:endorsed_by(name,role)', { count: 'exact' })
      .order('created_at', { ascending: false });
    if (!CAN_VIEW_ALL.includes(user.role)) query = query.eq('requested_by', user.id);
    if (status) query = query.eq('status', status);
    if (ministry) query = query.eq('ministry', ministry);
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year);
    const from = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(from, from + parseInt(limit) - 1);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ requisitions: data || [], total: count || 0, page: parseInt(page) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/requisitions/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('requisitions')
      .select('*, requester:requested_by(name,email,mutcu_number,photo_url,role,primary_ministry), reviewer:reviewed_by(name,role), approver:approved_by(name,role), endorser:endorsed_by(name,role)')
      .eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Requisition not found' });
    if (!CAN_VIEW_ALL.includes(req.user.role) && data.requested_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    res.json({ requisition: { ...data, items } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/requisitions — submit
router.post('/', authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!CAN_SUBMIT.includes(user.role)) {
      return res.status(403).json({ error: 'Only ministry secretaries, coordinators, and administrators can submit requisitions' });
    }
    const { title, ministry, items, spiritual_year, purpose, ministry_chairperson_id } = req.body;
    if (!title || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Title and at least one item are required' });
    }
    const processedItems = items.map(item => ({
      description: item.description || '',
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'pieces',
      unit_cost: parseFloat(item.unit_cost) || 0,
      total: parseFloat(item.quantity || 1) * parseFloat(item.unit_cost || 0),
    }));
    const totalRequested = processedItems.reduce((sum, item) => sum + item.total, 0);
    const { data, error } = await supabase.from('requisitions').insert({
      title, ministry: ministry || user.primary_ministry || null,
      items: JSON.stringify(processedItems),
      total_requested: totalRequested,
      requested_by: user.id,
      ministry_chairperson_id: ministry_chairperson_id || null,
      status: 'pending',
      spiritual_year: spiritual_year || null,
      purpose: purpose || null,
    }).select().single();
    if (error) throw error;

    // Notify CU Treasurer and EC Admin
    const { data: admins } = await supabase.from('users')
      .select('id').in('role', ['cu_treasurer', 'ec_admin', 'super_admin']).eq('is_active', true);
    for (const admin of admins || []) {
      await supabase.from('mutcu_notifications').insert({
        user_id: admin.id,
        title: 'New Requisition Submitted',
        body: `${user.name} submitted "${title}" (${data.requisition_number}) — KES ${totalRequested.toLocaleString()}`,
        type: 'info', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    // Notify ministry chairperson if specified
    if (ministry_chairperson_id) {
      await supabase.from('mutcu_notifications').insert({
        user_id: ministry_chairperson_id,
        title: 'Requisition Awaiting Your Endorsement',
        body: `${user.name} submitted "${title}" (${data.requisition_number}) requiring your endorsement.`,
        type: 'action', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    res.status(201).json({ requisition: data, message: `Requisition ${data.requisition_number} submitted successfully` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/requisitions/:id/endorse — Ministry Chairperson (EC coordinator) endorses
// Secretary (cu_secretary) CANNOT endorse — only EC coordinators/VPs
router.put('/:id/endorse', authenticate, async (req, res) => {
  try {
    const endorserRoles = ['ec_admin', 'super_admin', '1st_vp', '2nd_vp',
      'music_coordinator', 'creative_arts_coordinator', 'tech_media_coordinator',
      'prayer_coordinator', 'missions_coordinator', 'bible_study_coordinator',
      'discipleship_coordinator', 'interim_chair'];
    if (!endorserRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Only EC members (Ministry Coordinators, VPs, or Chairperson) can endorse requisitions. The CU Secretary cannot endorse.' });
    }
    const { endorsement_note } = req.body;
    const { data: req_data } = await supabase.from('requisitions').select('*, requester:requested_by(name)').eq('id', req.params.id).single();
    if (!req_data) return res.status(404).json({ error: 'Requisition not found' });

    const { data, error } = await supabase.from('requisitions').update({
      status: 'endorsed',
      endorsed_by: req.user.id,
      endorsed_at: new Date().toISOString(),
      endorsement_note: endorsement_note || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).select().single();
    if (error) throw error;

    // Notify CU Treasurer
    const { data: treasurers } = await supabase.from('users').select('id').eq('role', 'cu_treasurer').eq('is_active', true);
    for (const t of treasurers || []) {
      await supabase.from('mutcu_notifications').insert({
        user_id: t.id,
        title: 'Requisition Endorsed — Ready for Review',
        body: `"${req_data.title}" (${req_data.requisition_number}) endorsed by ${req.user.name}. Ready for your review.`,
        type: 'action', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    res.json({ requisition: data, message: 'Requisition endorsed successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/requisitions/:id/review — CU Treasurer reviews and sets approved amounts
router.put('/:id/review', authenticate, requireRole(...TREASURER_ROLES), async (req, res) => {
  try {
    const { total_approved, review_notes, status, items_approved } = req.body;
    const validStatuses = ['under_review', 'approved', 'partially_approved', 'rejected'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const updates = {
      status,
      total_approved: total_approved !== undefined ? parseFloat(total_approved) : null,
      review_notes: review_notes || null,
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (items_approved) updates.items = JSON.stringify(items_approved);
    const { data, error } = await supabase.from('requisitions').update(updates).eq('id', req.params.id).select('*, requester:requested_by(id,name)').single();
    if (error) throw error;

    // If approved by treasurer, also notify Chairperson for final signature
    if (['approved', 'partially_approved'].includes(status)) {
      const { data: chairs } = await supabase.from('users').select('id').in('role', ['ec_admin', 'super_admin']).eq('is_active', true);
      for (const c of chairs || []) {
        await supabase.from('mutcu_notifications').insert({
          user_id: c.id,
          title: 'Requisition Ready for Your Approval',
          body: `"${data.title}" (${data.requisition_number}) reviewed by Treasurer. Awaiting your final approval and signature.`,
          type: 'action', category: 'general', link: '/treasurer/requisitions',
        }).then(() => {}).catch(() => {});
      }
    }

    // Notify requester
    if (data.requester?.id) {
      const statusMsg = { approved: 'approved ✅', partially_approved: 'partially approved ⚠️', rejected: 'rejected ❌', under_review: 'under review 🔍' };
      await supabase.from('mutcu_notifications').insert({
        user_id: data.requester.id,
        title: `Requisition ${statusMsg[status] || status}`,
        body: `Your requisition "${data.title}" (${data.requisition_number}) has been ${statusMsg[status] || status} by the Treasurer.${review_notes ? ' Note: ' + review_notes : ''}`,
        type: status === 'approved' ? 'success' : status === 'rejected' ? 'warning' : 'info',
        category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    res.json({ requisition: data, message: `Requisition ${status}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/requisitions/:id/approve — Chairperson of Union (ec_admin) final approval
router.put('/:id/approve', authenticate, requireRole(...APPROVAL_ROLES), async (req, res) => {
  try {
    const { approval_notes } = req.body;
    const { data, error } = await supabase.from('requisitions').update({
      status: 'approved',
      approved_by: req.user.id,
      approved_at: new Date().toISOString(),
      approval_notes: approval_notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).select('*, requester:requested_by(id,name)').single();
    if (error) throw error;

    // Notify Treasurer to disburse
    const { data: treasurers } = await supabase.from('users').select('id').eq('role', 'cu_treasurer').eq('is_active', true);
    for (const t of treasurers || []) {
      await supabase.from('mutcu_notifications').insert({
        user_id: t.id,
        title: 'Requisition Approved — Ready to Disburse',
        body: `"${data.title}" (${data.requisition_number}) approved by Chairperson. Please disburse funds.`,
        type: 'action', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }

    if (data.requester?.id) {
      await supabase.from('mutcu_notifications').insert({
        user_id: data.requester.id,
        title: 'Requisition Approved by Chairperson ✅',
        body: `Your requisition "${data.title}" (${data.requisition_number}) has been approved and signed by the Chairperson of the Union.`,
        type: 'success', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    res.json({ requisition: data, message: 'Requisition approved and signed by Chairperson' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/requisitions/:id/disburse — ONLY CU Treasurer disburses
router.put('/:id/disburse', authenticate, requireRole(...TREASURER_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase.from('requisitions').update({
      status: 'disbursed',
      disbursed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).select('*, requester:requested_by(id,name)').single();
    if (error) throw error;
    if (data.requester?.id) {
      await supabase.from('mutcu_notifications').insert({
        user_id: data.requester.id,
        title: 'Funds Disbursed 💰',
        body: `Funds for "${data.title}" (${data.requisition_number}) — KES ${parseFloat(data.total_approved || data.total_requested).toLocaleString()} have been disbursed by the Treasurer.`,
        type: 'success', category: 'general', link: '/treasurer/requisitions',
      }).then(() => {}).catch(() => {});
    }
    res.json({ requisition: data, message: 'Requisition marked as disbursed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/requisitions/:id/print
router.get('/:id/print', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('requisitions')
      .select('*, requester:requested_by(name,email,mutcu_number,role,primary_ministry,phone), reviewer:reviewed_by(name,role), approver:approved_by(name,role), endorser:endorsed_by(name,role)')
      .eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Requisition not found' });
    if (!CAN_VIEW_ALL.includes(req.user.role) && data.requested_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
    res.json({
      requisition: { ...data, items },
      printData: {
        org_name: "Murang'a University of Technology Christian Union",
        org_motto: 'Inspire Love, Hope & Godliness',
        document_title: 'OFFICIAL REQUISITION FORM',
        generated_at: new Date().toISOString(),
        generated_by: req.user.name,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;