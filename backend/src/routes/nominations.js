const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireApproved, requireRole } = require('../middleware/auth');
const { checkEligibility, canNominate, isFinalist, isFirstYear } = require('../lib/eligibility');

// GET /api/nominations/cycle — get active cycle
router.get('/cycle', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('nomination_cycles')
      .select('*')
      .not('status', 'in', '("draft","commissioned","cancelled")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    res.json({ cycle: data || null });
  } catch (err) {
    res.json({ cycle: null });
  }
});

// GET /api/nominations/eligible/:positionId — eligible members for a position
// Optimized: pre-filter in DB, then check eligibility in memory (no per-member DB calls for basic checks)
router.get('/eligible/:positionId', authenticate, requireApproved, async (req, res) => {
  try {
    const { search } = req.query;
    const { data: position } = await supabase.from('positions').select('*').eq('id', req.params.positionId).single();
    if (!position) return res.status(404).json({ error: 'Position not found' });

    // Get active cycle for gender constraint resolution
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id,chairperson_gender')
      .not('status', 'in', '("draft","commissioned","cancelled")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Pre-filter in DB: only active full members who are not first-year
    // This dramatically reduces the number of members we need to check
    let query = supabase.from('users')
      .select('id,name,photo_url,year_of_study,gender,primary_ministry,secondary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed,course_type,school_prefix')
      .eq('enrollment_status', 'active')
      .eq('membership_type', 'full')
      .eq('disciplinary_status', 'clear')
      .eq('sgc_executive_role', false)
      .eq('faith_declaration_signed', true)
      .gte('year_of_study', 2); // Not first year

    // Apply gender constraint pre-filter if known
    let requiredGender = position.gender_constraint;
    if (!requiredGender && cycle?.chairperson_gender) {
      const slug = (position.slug || '').toLowerCase();
      if (slug.includes('1st') || slug.includes('first')) {
        requiredGender = cycle.chairperson_gender === 'male' ? 'female' : 'male';
      } else if (slug.includes('2nd') || slug.includes('second')) {
        requiredGender = cycle.chairperson_gender === 'male' ? 'male' : 'female';
      }
    }
    if (requiredGender) query = query.eq('gender', requiredGender);

    // Apply search filter in DB
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,primary_ministry.ilike.%${search}%,mutcu_number.ilike.%${search}%`);
    }

    const { data: members } = await query.order('name', { ascending: true });

    // Now check term limits (requires DB call per member — only for remaining candidates)
    const maxTerms = position.chair_max_one_term ? 1 : (position.max_terms || 2);
    const eligible = [];

    for (const member of members || []) {
      // Skip finalists
      const courseType = member.course_type || 'degree';
      const prefix = (member.school_prefix || '').toUpperCase();
      const maxYear = courseType === 'diploma' ? 3 : (prefix === 'SE' ? 5 : 4);
      if ((member.year_of_study || 0) >= maxYear || member.is_finalist) continue;

      // Check term limit (DB call — but only for pre-filtered candidates)
      const { count } = await supabase.from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('position_id', position.id)
        .eq('user_id', member.id);
      if ((count || 0) >= maxTerms) continue;

      eligible.push({
        id: member.id,
        name: member.name,
        photo: member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=04003D&color=FF9700&size=200&bold=true`,
        year_of_study: member.year_of_study,
        course_type: member.course_type,
        gender: member.gender,
        ministry: member.primary_ministry || 'General Member',
        secondary_ministry: member.secondary_ministry,
        mutcu_number: member.mutcu_number,
      });
    }

    res.json({ members: eligible, total: eligible.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/recommend — submit prayerful recommendation
router.post('/recommend', authenticate, requireApproved, async (req, res) => {
  try {
    const { cycle_id, position_id, candidate_id, prayerful_note } = req.body;
    const user = req.user;

    // Check if user can nominate (constitutional check)
    const nominateCheck = canNominate(user);
    if (!nominateCheck.allowed) {
      return res.status(403).json({ error: nominateCheck.reason });
    }

    // Check duplicate — one recommendation per recommender per position (Art. 17.2.iii)
    const { data: existing } = await supabase.from('recommendations')
      .select('id').eq('cycle_id', cycle_id).eq('position_id', position_id).eq('recommender_id', user.id).single();
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a prayerful recommendation for this position. Only one recommendation per position is allowed.' });
    }

    // Validate candidate eligibility
    const { data: candidate } = await supabase.from('users')
      .select('id,name,year_of_study,gender,primary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed,course_type,school_prefix')
      .eq('id', candidate_id).single();

    if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

    // First-years cannot be nominated
    if (isFirstYear(candidate)) {
      return res.status(400).json({ error: 'First-year students cannot be nominated for EC positions (Art. 12.4.b)' });
    }

    // Finalists cannot be nominated (they serve in NC)
    if (isFinalist(candidate)) {
      return res.status(400).json({ error: 'Finalist students cannot be nominated for EC positions — they serve in the Nomination College (Art. 12.4.b)' });
    }

    const { data, error } = await supabase.from('recommendations').insert({
      cycle_id, position_id, candidate_id,
      recommender_id: user.id,
      prayerful_note: prayerful_note || null,
    }).select().single();

    if (error) throw error;
    res.status(201).json({ recommendation: data, message: 'Prayerful recommendation submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/suggest — anonymous free-text suggestion
router.post('/suggest', authenticate, requireApproved, async (req, res) => {
  try {
    const { cycle_id, position_id, suggested_name, description, why_recommend } = req.body;
    const user = req.user;

    // Check if user can nominate
    const nominateCheck = canNominate(user);
    if (!nominateCheck.allowed) {
      return res.status(403).json({ error: nominateCheck.reason });
    }

    // Check duplicate — one suggestion per suggester per position
    const { data: existing } = await supabase.from('free_text_suggestions')
      .select('id').eq('cycle_id', cycle_id).eq('position_id', position_id).eq('suggester_id', user.id).single();
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted a suggestion for this position. Only one suggestion per position is allowed.' });
    }

    const { data, error } = await supabase.from('free_text_suggestions').insert({
      cycle_id, position_id,
      suggester_id: user.id,
      suggested_name, description, why_recommend,
      nc_action: 'pending',
      is_anonymous: true, // Always anonymous — suggester identity hidden from NC
    }).select().single();

    if (error) throw error;
    res.status(201).json({ suggestion: data, message: 'Your suggestion has been submitted anonymously to the Nomination College' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nominations/nominees — published nominees
router.get('/nominees', authenticate, async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();

    if (!cycle || !['nominees_published', 'objection_period', 'pre_agm', 'commissioned'].includes(cycle.status)) {
      return res.json({ nominees: [], cycle: cycle || null, published: false });
    }

    const { data: nominees } = await supabase.from('nominees')
      .select('*, candidate:candidate_id(id,name,photo_url,year_of_study,primary_ministry,gender,course_type), position:position_id(id,title,display_order)')
      .eq('cycle_id', cycle.id)
      .eq('status', 'active')
      .order('position_id');

    res.json({ nominees: nominees || [], cycle, published: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nominations/my-recommendations — includes both recommendations and suggestions
router.get('/my-recommendations', authenticate, async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ recommendations: [], suggestions: [], recommended_positions: [], suggested_positions: [] });

    const [recsRes, suggsRes] = await Promise.all([
      supabase.from('recommendations')
        .select('*, position:position_id(id,title), candidate:candidate_id(name,photo_url,mutcu_number)')
        .eq('cycle_id', cycle.id)
        .eq('recommender_id', req.user.id),
      supabase.from('free_text_suggestions')
        .select('*, position:position_id(id,title)')
        .eq('cycle_id', cycle.id)
        .eq('suggester_id', req.user.id),
    ]);

    const recommendations = recsRes.data || [];
    const suggestions = suggsRes.data || [];

    // Position IDs where user has already acted (either recommended or suggested)
    const recommended_positions = recommendations.map(r => r.position_id);
    const suggested_positions = suggestions.map(s => s.position_id);

    res.json({ recommendations, suggestions, recommended_positions, suggested_positions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/objections — submit objection
router.post('/objections', authenticate, requireApproved, async (req, res) => {
  try {
    const { nominee_id, grounds } = req.body;
    const user = req.user;

    // Only full members can object (not first-years per Art. 8.3.I.b)
    if (user.membership_type !== 'full') {
      return res.status(403).json({ error: 'Only full members may submit objections' });
    }
    if (isFirstYear(user)) {
      return res.status(403).json({ error: 'First-year students cannot participate in the objection process' });
    }
    if (!grounds || grounds.length < 50) {
      return res.status(400).json({ error: 'Grounds must be at least 50 characters and must be substantive' });
    }

    const { data: nominee } = await supabase.from('nominees').select('cycle_id').eq('id', nominee_id).single();
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' });

    const { data, error } = await supabase.from('objections').insert({
      cycle_id: nominee.cycle_id,
      nominee_id,
      objector_id: user.id,
      grounds,
    }).select().single();

    if (error) throw error;
    res.status(201).json({ objection: data, message: 'Objection submitted to the Nomination College' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/nominations/data/:cycleId — delete nomination data (NC Chair, super_admin)
router.delete('/data/:cycleId', authenticate, requireRole('super_admin', 'nc_chair'), async (req, res) => {
  try {
    const { cycleId } = req.params;
    const { data: cycle } = await supabase.from('nomination_cycles').select('status,agm_date').eq('id', cycleId).single();
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' });
    if (!['commissioned', 'cancelled'].includes(cycle.status)) {
      return res.status(400).json({ error: 'Can only delete data from commissioned or cancelled cycles' });
    }

    // Delete in order (foreign key constraints)
    await supabase.from('objections').delete().eq('cycle_id', cycleId);
    await supabase.from('nominees').delete().eq('cycle_id', cycleId);
    await supabase.from('vetting_decisions').delete().eq('cycle_id', cycleId);
    await supabase.from('free_text_suggestions').delete().eq('cycle_id', cycleId);
    await supabase.from('recommendations').delete().eq('cycle_id', cycleId);
    await supabase.from('nc_members').delete().eq('cycle_id', cycleId);

    // Audit log
    await supabase.from('audit_logs').insert({
      actor_id: req.user.id,
      action: 'nominations.data_deleted',
      entity_type: 'nomination_cycle',
      entity_id: cycleId,
      description: `Nomination data deleted for cycle ${cycleId} by ${req.user.name}`,
    }).then(() => {}).catch(() => {});

    res.json({ message: 'Nomination data deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;