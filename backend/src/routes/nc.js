const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkEligibility } = require('../lib/eligibility');

// NC action roles: NC Chairperson and Secretary can act; others view only
// EC Admin and Super Admin can always act
const NC_VIEW_ROLES = ['nc_member', 'nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'];
const NC_ACTION_ROLES = ['nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'];

function canAct(user) {
  return NC_ACTION_ROLES.includes(user.role);
}

// GET /api/nc/dashboard
router.get('/dashboard', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ cycle: null });

    const { data: positions } = await supabase.from('positions').select('*').eq('is_active', true).order('display_order');

    const positionsWithStats = await Promise.all((positions || []).map(async (pos) => {
      const { count: recCount } = await supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('position_id', pos.id);
      const { data: uniqueCandidates } = await supabase.from('recommendations').select('candidate_id').eq('cycle_id', cycle.id).eq('position_id', pos.id);
      const unique = new Set((uniqueCandidates || []).map(r => r.candidate_id)).size;
      const { count: approvedCount } = await supabase.from('vetting_decisions').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('position_id', pos.id).eq('decision', 'approved');
      const { count: vettedCount } = await supabase.from('vetting_decisions').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('position_id', pos.id);
      return { ...pos, recommendation_count: recCount || 0, unique_candidates: unique, approved_count: approvedCount || 0, vetted_count: vettedCount || 0 };
    }));

    const { count: suggestionCount } = await supabase.from('free_text_suggestions').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('nc_action', 'pending');
    const { count: objectionCount } = await supabase.from('objections').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).is('nc_decision', null);
    const { count: publishedCount } = await supabase.from('nominees').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('status', 'active');

    // Get NC members with roles
    const { data: ncMembers } = await supabase.from('nc_members')
      .select('*, user:user_id(id,name,photo_url,email,mutcu_number)')
      .eq('cycle_id', cycle.id).eq('is_active', true);

    // Get by-nominations
    const { data: byNominations } = await supabase.from('by_nominations')
      .select('*, position:position_id(title), vacated_by_user:vacated_by(name)')
      .eq('cycle_id', cycle.id)
      .neq('status', 'completed');

    res.json({
      cycle,
      positions: positionsWithStats,
      suggestionCount: suggestionCount || 0,
      objectionCount: objectionCount || 0,
      publishedCount: publishedCount || 0,
      ncMembers: ncMembers || [],
      byNominations: byNominations || [],
      userCanAct: canAct(req.user),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/position/:positionId
router.get('/position/:positionId', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.status(404).json({ error: 'No active cycle' });

    const { data: position } = await supabase.from('positions').select('*').eq('id', req.params.positionId).single();
    const { data: recommendations } = await supabase.from('recommendations')
      .select('*, recommender:recommender_id(name), candidate:candidate_id(id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed,course_type,school_prefix)')
      .eq('cycle_id', cycle.id).eq('position_id', req.params.positionId);

    const candidateMap = {};
    for (const rec of recommendations || []) {
      const cid = rec.candidate_id;
      if (!candidateMap[cid]) {
        const eligibility = await checkEligibility(rec.candidate, position, cycle.id);
        candidateMap[cid] = { ...rec.candidate, recommendations: [], recommendation_count: 0, eligibility };
      }
      candidateMap[cid].recommendations.push({ note: rec.prayerful_note, recommender: rec.recommender?.name });
      candidateMap[cid].recommendation_count++;
    }

    const candidates = Object.values(candidateMap).sort((a, b) => b.recommendation_count - a.recommendation_count);
    const { data: decisions } = await supabase.from('vetting_decisions').select('*').eq('cycle_id', cycle.id).eq('position_id', req.params.positionId);

    // Get objection counts per candidate (nominee_id links to vetting_decisions candidate)
    // nominees table: candidate_id field links to users
    const { data: nominees } = await supabase.from('nominees')
      .select('id, candidate_id').eq('cycle_id', cycle.id).eq('position_id', req.params.positionId);
    const nomineeIdMap = {}; // candidate_id -> nominee_id
    (nominees || []).forEach(n => { nomineeIdMap[n.candidate_id] = n.id; });

    const { data: objections } = await supabase.from('objections')
      .select('nominee_id').eq('cycle_id', cycle.id);
    const objectionCounts = {}; // nominee_id -> count
    (objections || []).forEach(o => { objectionCounts[o.nominee_id] = (objectionCounts[o.nominee_id] || 0) + 1; });

    // Attach objection count to each candidate
    const candidatesWithObjCount = candidates.map(c => ({
      ...c,
      objection_count: objectionCounts[nomineeIdMap[c.id]] || 0,
    }));

    // Vetting progress for dashboard: count vetted vs total
    const vettedCount = (decisions || []).length;
    const totalCandidates = candidates.length;

    res.json({ cycle, position, candidates: candidatesWithObjCount, decisions: decisions || [], userCanAct: canAct(req.user), vettedCount, totalCandidates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/vet — NC Chair, Secretary, EC Admin, Super Admin only
router.post('/vet', authenticate, requireRole(...NC_ACTION_ROLES), async (req, res) => {
  try {
    const { cycle_id, position_id, candidate_id, decision, reason } = req.body;
    const { data, error } = await supabase.from('vetting_decisions').upsert({
      cycle_id, position_id, candidate_id,
      nc_member_id: req.user.id,
      decision, reason: reason || null,
      decided_at: new Date().toISOString(),
    }, { onConflict: 'cycle_id,position_id,candidate_id' }).select().single();
    if (error) throw error;
    res.json({ decision: data, message: 'Vetting decision saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/bulk-reject-ineligible — reject all ineligible candidates for a position
router.post('/bulk-reject-ineligible', authenticate, requireRole(...NC_ACTION_ROLES), async (req, res) => {
  try {
    const { cycle_id, position_id } = req.body;
    if (!cycle_id || !position_id) return res.status(400).json({ error: 'cycle_id and position_id required' });

    const { data: position } = await supabase.from('positions').select('*').eq('id', position_id).single();
    const { data: cycle } = await supabase.from('nomination_cycles').select('*').eq('id', cycle_id).single();
    const { data: recommendations } = await supabase.from('recommendations')
      .select('*, candidate:candidate_id(id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed,course_type,school_prefix)')
      .eq('cycle_id', cycle_id).eq('position_id', position_id);

    const candidateMap = {};
    for (const rec of recommendations || []) {
      const cid = rec.candidate_id;
      if (!candidateMap[cid]) {
        const eligibility = await checkEligibility(rec.candidate, position, cycle_id);
        candidateMap[cid] = { ...rec.candidate, eligibility };
      }
    }

    let rejectedCount = 0;
    for (const [candidateId, candidate] of Object.entries(candidateMap)) {
      if (!candidate.eligibility?.eligible) {
        const failedChecks = (candidate.eligibility?.checks || []).filter(c => !c.passed).map(c => c.label).join(', ');
        await supabase.from('vetting_decisions').upsert({
          cycle_id, position_id, candidate_id: candidateId,
          nc_member_id: req.user.id,
          decision: 'rejected',
          reason: `Auto-rejected: failed eligibility — ${failedChecks}`,
          decided_at: new Date().toISOString(),
        }, { onConflict: 'cycle_id,position_id,candidate_id' });
        rejectedCount++;
      }
    }

    res.json({ message: `${rejectedCount} ineligible candidate(s) rejected`, rejectedCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/publish-summary — pre-publish check: what will be published
router.get('/publish-summary', authenticate, requireRole('nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { cycle_id } = req.query;
    if (!cycle_id) return res.status(400).json({ error: 'cycle_id required' });

    const { data: positions } = await supabase.from('positions').select('*').eq('is_active', true).order('display_order');
    const summary = [];

    for (const pos of positions || []) {
      const { data: approved } = await supabase.from('vetting_decisions')
        .select('*, candidate:candidate_id(name,mutcu_number)')
        .eq('cycle_id', cycle_id).eq('position_id', pos.id).eq('decision', 'approved');
      const { count: totalCandidates } = await supabase.from('vetting_decisions')
        .select('*', { count: 'exact', head: true }).eq('cycle_id', cycle_id).eq('position_id', pos.id);
      summary.push({
        position: pos,
        approved_count: (approved || []).length,
        total_vetted: totalCandidates || 0,
        approved_candidates: (approved || []).map(d => ({ name: d.candidate?.name, mutcu_number: d.candidate?.mutcu_number })),
        has_gap: (approved || []).length === 0,
      });
    }

    const totalApproved = summary.reduce((s, p) => s + p.approved_count, 0);
    const positionsWithGaps = summary.filter(p => p.has_gap).map(p => p.position.title);

    res.json({ summary, totalApproved, positionsWithGaps, totalPositions: positions?.length || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/publish — NC Chair, NC Secretary, EC Admin, Super Admin
router.post('/publish', authenticate, requireRole('nc_chair', 'nc_secretary', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { cycle_id } = req.body;
    if (!cycle_id) return res.status(400).json({ error: 'cycle_id is required' });

    // Verify cycle exists and is in vetting stage
    const { data: cycle } = await supabase.from('nomination_cycles').select('status,title').eq('id', cycle_id).single();
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (!['vetting', 'nominees_published'].includes(cycle.status)) {
      return res.status(400).json({ error: `Cannot publish from status: ${cycle.status}. Cycle must be in vetting stage.` });
    }

    // Get all approved vetting decisions
    const { data: approved, error: fetchErr } = await supabase
      .from('vetting_decisions').select('*').eq('cycle_id', cycle_id).eq('decision', 'approved');
    if (fetchErr) throw fetchErr;

    if (!approved || approved.length === 0) {
      return res.status(400).json({ error: 'No approved candidates found. Please approve at least one candidate before publishing.' });
    }

    // Clear existing nominees for this cycle first (clean republish)
    await supabase.from('nominees').delete().eq('cycle_id', cycle_id);

    // Insert all approved candidates as nominees
    const now = new Date().toISOString();
    const nomineeRows = approved.map(d => ({
      cycle_id,
      position_id: d.position_id,
      candidate_id: d.candidate_id,
      status: 'active',
      published_at: now,
      published_by: req.user.id,
    }));

    const { error: insertErr } = await supabase.from('nominees').insert(nomineeRows);
    if (insertErr) {
      console.error('[PUBLISH ERROR] nominees insert:', insertErr);
      throw insertErr;
    }

    // Advance cycle status to nominees_published
    const { error: cycleErr } = await supabase.from('nomination_cycles')
      .update({ status: 'nominees_published' }).eq('id', cycle_id);
    if (cycleErr) throw cycleErr;

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'nc.nominees_published',
      entity_type: 'nomination_cycle',
      entity_id: cycle_id,
      description: `${approved.length} nominees published for cycle "${cycle.title}" by ${req.user.name}`,
    }).then(() => {}).catch(() => {});

    console.log(`[PUBLISH] ${approved.length} nominees published for cycle ${cycle_id} by ${req.user.name}`);
    res.json({ message: `${approved.length} nominees published successfully`, count: approved.length });
  } catch (err) {
    console.error('[PUBLISH ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nc/objections
router.get('/objections', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ objections: [] });
    const { data } = await supabase.from('objections')
      .select('*, nominee:nominee_id(*, candidate:candidate_id(name), position:position_id(title))')
      .eq('cycle_id', cycle.id).order('created_at', { ascending: false });
    res.json({ objections: data || [], userCanAct: canAct(req.user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/objections/:id/resolve — NC Chair, Secretary, EC Admin, Super Admin
router.post('/objections/:id/resolve', authenticate, requireRole(...NC_ACTION_ROLES), async (req, res) => {
  try {
    const { nc_decision, nc_decision_reason } = req.body;
    const { data: obj } = await supabase.from('objections').update({
      nc_decision, nc_decision_reason, decided_by: req.user.id, decided_at: new Date().toISOString()
    }).eq('id', req.params.id).select().single();
    if (nc_decision === 'upheld') await supabase.from('nominees').update({ status: 'substituted' }).eq('id', obj.nominee_id);
    res.json({ message: 'Objection resolved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/suggestions — anonymous (suggester name hidden)
router.get('/suggestions', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ suggestions: [] });
    const { data } = await supabase.from('free_text_suggestions')
      .select('id,cycle_id,position_id,suggested_name,description,why_recommend,nc_action,nc_notes,created_at, position:position_id(title)')
      // NOTE: suggester_id intentionally excluded for anonymity
      .eq('cycle_id', cycle.id).order('created_at', { ascending: false });
    res.json({ suggestions: data || [], userCanAct: canAct(req.user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/suggestions/:id/action — NC Chair, Secretary, EC Admin, Super Admin
router.post('/suggestions/:id/action', authenticate, requireRole(...NC_ACTION_ROLES), async (req, res) => {
  try {
    const { action, nc_notes } = req.body;
    await supabase.from('free_text_suggestions').update({ nc_action: action, nc_notes }).eq('id', req.params.id);
    res.json({ message: 'Suggestion updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/ai-summary — Gemini AI vetting summary
router.post('/ai-summary', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { candidate, position, recommendations, eligibility } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Gemini AI not configured' });

    const prompt = `You are assisting the Nomination College (NC) of a Christian Union at a Kenyan university (MUTCU — Murang'a University of Technology Christian Union).
Provide a concise, objective vetting summary for the following candidate.

Position: ${position?.title}
Candidate: ${candidate?.name}
Year of Study: ${candidate?.year_of_study} (${candidate?.course_type || 'degree'})
Ministry: ${candidate?.primary_ministry || 'General Member'}
Gender: ${candidate?.gender}
Disciplinary Status: ${candidate?.disciplinary_status}
Faith Declaration Signed: ${candidate?.faith_declaration_signed ? 'Yes' : 'No'}

Eligibility Checks:
${(eligibility?.checks || []).map(c => '- ' + c.label + ': ' + (c.passed ? 'PASS' : 'FAIL') + ' — ' + c.message).join('\n')}

Prayerful recommendations received: ${recommendations?.length || 0}
Sample notes from recommenders:
${(recommendations || []).slice(0, 3).map(r => '- "' + (r.note || 'No note provided') + '"').join('\n')}

Write a 3-4 sentence neutral summary suitable for NC records. Focus on eligibility status, recommendation strength, and any concerns. Do not make the final decision — that is for the NC to make prayerfully.`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const result = await response.json();
    const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate summary.';

    if (candidate?.id && position?.id) {
      const { data: cycle } = await supabase.from('nomination_cycles')
        .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
      if (cycle) {
        await supabase.from('vetting_decisions')
          .update({ ai_summary: summary })
          .eq('cycle_id', cycle.id)
          .eq('position_id', position.id)
          .eq('candidate_id', candidate.id);
      }
    }

    res.json({ summary });
  } catch (err) {
    console.error('[GEMINI ERROR]', err.message);
    res.status(500).json({ error: 'AI summary failed: ' + err.message });
  }
});

// GET /api/nc/report — vetting report data for PDF
router.get('/report', authenticate, requireRole(...NC_VIEW_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.status(404).json({ error: 'No active cycle' });

    const { data: positions } = await supabase.from('positions').select('*').eq('is_active', true).order('display_order');
    const reportData = [];

    for (const pos of positions || []) {
      const { data: decisions } = await supabase.from('vetting_decisions')
        .select('*, candidate:candidate_id(id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,disciplinary_status,faith_declaration_signed,course_type), nc_member:nc_member_id(name)')
        .eq('cycle_id', cycle.id).eq('position_id', pos.id);
      const { data: recs } = await supabase.from('recommendations')
        .select('candidate_id').eq('cycle_id', cycle.id).eq('position_id', pos.id);
      const recCounts = {};
      (recs || []).forEach(r => { recCounts[r.candidate_id] = (recCounts[r.candidate_id] || 0) + 1; });
      reportData.push({
        position: pos,
        decisions: (decisions || []).map(d => ({ ...d, recommendation_count: recCounts[d.candidate_id] || 0 })).sort((a, b) => b.recommendation_count - a.recommendation_count),
      });
    }

    const { data: ncMembers } = await supabase.from('nc_members')
      .select('*, user:user_id(name,role)')
      .eq('cycle_id', cycle.id).eq('is_active', true);

    res.json({ cycle, positions: reportData, ncMembers: ncMembers || [], generatedAt: new Date().toISOString(), generatedBy: req.user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/dissolve/:cycleId — Dissolve NC (21 days after AGM)
router.post('/dissolve/:cycleId', authenticate, requireRole('nc_chair', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { cycleId } = req.params;
    const { data: cycle } = await supabase.from('nomination_cycles').select('status,agm_date').eq('id', cycleId).single();
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (cycle.status !== 'commissioned') {
      return res.status(400).json({ error: 'NC can only be dissolved after commissioning' });
    }

    // Get NC members and reset their roles to full_member
    const { data: ncMembers } = await supabase.from('nc_members')
      .select('user_id').eq('cycle_id', cycleId).eq('is_active', true);

    for (const member of ncMembers || []) {
      await supabase.from('users').update({ role: 'full_member' }).eq('id', member.user_id);
    }

    // Mark NC members as inactive
    await supabase.from('nc_members').update({ is_active: false }).eq('cycle_id', cycleId);

    // Update cycle dissolution date
    await supabase.from('nomination_cycles').update({
      nc_dissolution_date: new Date().toISOString().split('T')[0],
    }).eq('id', cycleId);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'nc.dissolved',
      entity_type: 'nomination_cycle',
      entity_id: cycleId,
      description: `Nomination College dissolved for cycle ${cycleId}. ${ncMembers?.length || 0} members returned to full_member role.`,
    }).then(() => {}).catch(() => {});

    res.json({ message: `Nomination College dissolved. ${ncMembers?.length || 0} members returned to full member status.` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── By-Nominations ────────────────────────────────────────────────────────────

// GET /api/nc/by-nominations
router.get('/by-nominations', authenticate, requireRole(...NC_VIEW_ROLES, 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ byNominations: [] });
    const { data } = await supabase.from('by_nominations')
      .select('*, position:position_id(title), vacated_by_user:vacated_by(name,mutcu_number), nominee:nominee_id(name,photo_url,mutcu_number)')
      .eq('cycle_id', cycle.id).order('created_at', { ascending: false });
    res.json({ byNominations: data || [], userCanAct: canAct(req.user) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/by-nominations — open a by-nomination
router.post('/by-nominations', authenticate, requireRole('nc_chair', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { position_id, reason, vacated_by, cycle_id } = req.body;
    if (!position_id || !reason) return res.status(400).json({ error: 'position_id and reason are required' });

    // Set objection deadline: 3 days from now (Art. 18.2)
    const objectionDeadline = new Date();
    objectionDeadline.setDate(objectionDeadline.getDate() + 3);

    const { data, error } = await supabase.from('by_nominations').insert({
      cycle_id, position_id, reason,
      vacated_by: vacated_by || null,
      status: 'open',
      objection_deadline: objectionDeadline.toISOString().split('T')[0],
      created_by: req.user.id,
    }).select().single();

    if (error) throw error;
    res.status(201).json({ byNomination: data, message: 'By-Nomination process opened' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/nc/by-nominations/:id — update by-nomination (set nominee, complete)
router.put('/by-nominations/:id', authenticate, requireRole('nc_chair', 'ec_admin', 'super_admin'), async (req, res) => {
  try {
    const { nominee_id, status, by_nc_members } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (nominee_id !== undefined) updates.nominee_id = nominee_id;
    if (status !== undefined) updates.status = status;
    if (by_nc_members !== undefined) updates.by_nc_members = by_nc_members;
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    const { data, error } = await supabase.from('by_nominations').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;

    // If completed with a nominee, create appointment
    if (status === 'completed' && nominee_id) {
      const { data: byNom } = await supabase.from('by_nominations').select('position_id,cycle_id').eq('id', req.params.id).single();
      if (byNom) {
        const { data: cycle } = await supabase.from('nomination_cycles').select('spiritual_year').eq('id', byNom.cycle_id).single();
        const { count } = await supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('position_id', byNom.position_id).eq('user_id', nominee_id);
        await supabase.from('appointments').insert({
          cycle_id: byNom.cycle_id, position_id: byNom.position_id, user_id: nominee_id,
          term_number: (count || 0) + 1, spiritual_year: cycle?.spiritual_year,
          commissioned_at: new Date().toISOString(), is_current: true,
          notes: 'Appointed via By-Nomination process',
        });
      }
    }

    res.json({ byNomination: data, message: 'By-Nomination updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;