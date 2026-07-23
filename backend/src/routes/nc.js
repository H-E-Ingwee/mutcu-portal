const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkEligibility } = require('../lib/eligibility');

const NC_ROLES = ['nc_member','ec_admin','super_admin'];

// GET /api/nc/dashboard
router.get('/dashboard', authenticate, requireRole(...NC_ROLES), async (req, res) => {
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
      return { ...pos, recommendation_count: recCount || 0, unique_candidates: unique, approved_count: approvedCount || 0 };
    }));

    const { count: suggestionCount } = await supabase.from('free_text_suggestions').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('nc_action', 'pending');
    const { count: objectionCount } = await supabase.from('objections').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).is('nc_decision', null);
    const { count: publishedCount } = await supabase.from('nominees').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id).eq('status', 'active');

    res.json({ cycle, positions: positionsWithStats, suggestionCount: suggestionCount || 0, objectionCount: objectionCount || 0, publishedCount: publishedCount || 0 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/position/:positionId
router.get('/position/:positionId', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.status(404).json({ error: 'No active cycle' });

    const { data: position } = await supabase.from('positions').select('*').eq('id', req.params.positionId).single();
    const { data: recommendations } = await supabase.from('recommendations')
      .select('*, recommender:recommender_id(name), candidate:candidate_id(id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed)')
      .eq('cycle_id', cycle.id).eq('position_id', req.params.positionId);

    const candidateMap = {};
    for (const rec of recommendations || []) {
      const cid = rec.candidate_id;
      if (!candidateMap[cid]) {
        const eligibility = await checkEligibility(rec.candidate, position);
        candidateMap[cid] = { ...rec.candidate, recommendations: [], recommendation_count: 0, eligibility };
      }
      candidateMap[cid].recommendations.push({ note: rec.prayerful_note, recommender: rec.recommender?.name });
      candidateMap[cid].recommendation_count++;
    }

    const candidates = Object.values(candidateMap).sort((a, b) => b.recommendation_count - a.recommendation_count);
    const { data: decisions } = await supabase.from('vetting_decisions').select('*').eq('cycle_id', cycle.id).eq('position_id', req.params.positionId);

    res.json({ cycle, position, candidates, decisions: decisions || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/vet
router.post('/vet', authenticate, requireRole(...NC_ROLES), async (req, res) => {
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

// POST /api/nc/publish
router.post('/publish', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { cycle_id } = req.body;
    const { data: approved } = await supabase.from('vetting_decisions').select('*').eq('cycle_id', cycle_id).eq('decision', 'approved');
    for (const d of approved || []) {
      await supabase.from('nominees').upsert({
        cycle_id, position_id: d.position_id, candidate_id: d.candidate_id,
        status: 'active', published_at: new Date().toISOString(), published_by: req.user.id,
      }, { onConflict: 'cycle_id,position_id,candidate_id' });
    }
    await supabase.from('nomination_cycles').update({ status: 'nominees_published' }).eq('id', cycle_id);
    res.json({ message: 'Nominees published successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/objections
router.get('/objections', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ objections: [] });
    const { data } = await supabase.from('objections')
      .select('*, nominee:nominee_id(*, candidate:candidate_id(name), position:position_id(title))')
      .eq('cycle_id', cycle.id).order('created_at', { ascending: false });
    res.json({ objections: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/objections/:id/resolve
router.post('/objections/:id/resolve', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { nc_decision, nc_decision_reason } = req.body;
    const { data: obj } = await supabase.from('objections').update({
      nc_decision, nc_decision_reason, decided_by: req.user.id, decided_at: new Date().toISOString()
    }).eq('id', req.params.id).select().single();
    if (nc_decision === 'upheld') await supabase.from('nominees').update({ status: 'substituted' }).eq('id', obj.nominee_id);
    res.json({ message: 'Objection resolved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/nc/suggestions
router.get('/suggestions', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ suggestions: [] });
    const { data } = await supabase.from('free_text_suggestions')
      .select('*, position:position_id(title), suggester:suggester_id(name)')
      .eq('cycle_id', cycle.id).order('created_at', { ascending: false });
    res.json({ suggestions: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/suggestions/:id/action
router.post('/suggestions/:id/action', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { action, nc_notes } = req.body;
    await supabase.from('free_text_suggestions').update({ nc_action: action, nc_notes }).eq('id', req.params.id);
    res.json({ message: 'Suggestion updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/nc/ai-summary — Gemini AI vetting summary for a candidate
router.post('/ai-summary', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { candidate, position, recommendations, eligibility } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: 'Gemini AI not configured' });

    const prompt = `You are assisting the Nomination College (NC) of a Christian Union at a Kenyan university.
Provide a concise, objective vetting summary for the following candidate.

Position: ${position?.title}
Candidate: ${candidate?.name}
Year of Study: ${candidate?.year_of_study}
Ministry: ${candidate?.primary_ministry || 'General Member'}
Gender: ${candidate?.gender}
Disciplinary Status: ${candidate?.disciplinary_status}
Faith Declaration Signed: ${candidate?.faith_declaration_signed ? 'Yes' : 'No'}

Eligibility Checks:
${(eligibility?.checks || []).map(c => '- ' + c.label + ': ' + (c.passed ? 'PASS' : 'FAIL') + ' — ' + c.message).join('\n')}

Recommendations received: ${recommendations?.length || 0}
Sample prayerful notes from recommenders:
${(recommendations || []).slice(0, 3).map(r => '- "' + (r.note || 'No note provided') + '" — ' + r.recommender).join('\n')}

Write a 3-4 sentence neutral summary suitable for NC records. Focus on eligibility status, recommendation strength, and any concerns. Do not make the final decision — that is for the NC.`;

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey,
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

    // Save summary to vetting decision if exists
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

// GET /api/nc/report — generate vetting report data for PDF
router.get('/report', authenticate, requireRole(...NC_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.status(404).json({ error: 'No active cycle' });

    const { data: positions } = await supabase.from('positions').select('*').eq('is_active', true).order('display_order');
    const reportData = [];

    for (const pos of positions || []) {
      const { data: decisions } = await supabase.from('vetting_decisions')
        .select('*, candidate:candidate_id(id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,disciplinary_status,faith_declaration_signed), nc_member:nc_member_id(name)')
        .eq('cycle_id', cycle.id).eq('position_id', pos.id);

      const { data: recs } = await supabase.from('recommendations')
        .select('candidate_id').eq('cycle_id', cycle.id).eq('position_id', pos.id);

      const recCounts = {};
      (recs || []).forEach(r => { recCounts[r.candidate_id] = (recCounts[r.candidate_id] || 0) + 1; });

      reportData.push({
        position: pos,
        decisions: (decisions || []).map(d => ({
          ...d,
          recommendation_count: recCounts[d.candidate_id] || 0,
        })).sort((a, b) => b.recommendation_count - a.recommendation_count),
      });
    }

    const { data: ncMembers } = await supabase.from('nc_members')
      .select('*, user:user_id(name, role)')
      .eq('cycle_id', cycle.id).eq('is_active', true);

    res.json({
      cycle,
      positions: reportData,
      ncMembers: ncMembers || [],
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.name,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;