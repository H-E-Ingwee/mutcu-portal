const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireApproved } = require('../middleware/auth');
const { checkEligibility } = require('../lib/eligibility');

// GET /api/nominations/cycle — get active cycle
router.get('/cycle', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase.from('nomination_cycles')
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
router.get('/eligible/:positionId', authenticate, requireApproved, async (req, res) => {
  try {
    const { data: position } = await supabase.from('positions').select('*').eq('id', req.params.positionId).single();
    if (!position) return res.status(404).json({ error: 'Position not found' });

    const { data: members } = await supabase.from('users')
      .select('id,name,photo_url,year_of_study,gender,primary_ministry,mutcu_number,membership_type,is_finalist,disciplinary_status,sgc_executive_role,faith_declaration_signed')
      .eq('enrollment_status', 'active')
      .eq('membership_type', 'full');

    const eligible = [];
    for (const member of members || []) {
      const result = await checkEligibility(member, position);
      if (result.eligible) {
        eligible.push({
          id: member.id,
          name: member.name,
          photo: member.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=04003D&color=FF9700&size=200&bold=true`,
          year_of_study: member.year_of_study,
          gender: member.gender,
          ministry: member.primary_ministry || 'General Member',
          mutcu_number: member.mutcu_number,
        });
      }
    }

    res.json({ members: eligible });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/recommend — submit recommendation
router.post('/recommend', authenticate, requireApproved, async (req, res) => {
  try {
    const { cycle_id, position_id, candidate_id, prayerful_note } = req.body;
    const user = req.user;

    // NC and admins cannot recommend
    if (['nc_member','ec_admin','super_admin','cu_secretary'].includes(user.role)) {
      return res.status(403).json({ error: 'NC members and administrators cannot submit recommendations' });
    }

    if (user.membership_type !== 'full') {
      return res.status(403).json({ error: 'Only full members may submit recommendations' });
    }

    // Check duplicate
    const { data: existing } = await supabase.from('recommendations')
      .select('id').eq('cycle_id', cycle_id).eq('position_id', position_id).eq('recommender_id', user.id).single();
    if (existing) return res.status(400).json({ error: 'You have already recommended for this position' });

    const { data, error } = await supabase.from('recommendations').insert({
      cycle_id, position_id, candidate_id,
      recommender_id: user.id,
      prayerful_note: prayerful_note || null,
    }).select().single();

    if (error) throw error;
    res.status(201).json({ recommendation: data, message: 'Recommendation submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/suggest — free-text suggestion
router.post('/suggest', authenticate, requireApproved, async (req, res) => {
  try {
    const { cycle_id, position_id, suggested_name, description, why_recommend } = req.body;
    const { data, error } = await supabase.from('free_text_suggestions').insert({
      cycle_id, position_id,
      suggester_id: req.user.id,
      suggested_name, description, why_recommend,
      nc_action: 'pending',
    }).select().single();
    if (error) throw error;
    res.status(201).json({ suggestion: data, message: 'Suggestion submitted to the Nomination College' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nominations/nominees — published nominees
router.get('/nominees', authenticate, async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();

    if (!cycle || !['nominees_published','objection_period','pre_agm','commissioned'].includes(cycle.status)) {
      return res.json({ nominees: [], cycle: cycle || null, published: false });
    }

    const { data: nominees } = await supabase.from('nominees')
      .select('*, candidate:candidate_id(id,name,photo_url,year_of_study,primary_ministry,gender), position:position_id(id,title,display_order)')
      .eq('cycle_id', cycle.id)
      .eq('status', 'active')
      .order('position_id');

    res.json({ nominees: nominees || [], cycle, published: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/nominations/my-recommendations
router.get('/my-recommendations', authenticate, async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles')
      .select('id').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.json({ recommendations: [] });

    const { data } = await supabase.from('recommendations')
      .select('*, position:position_id(title)')
      .eq('cycle_id', cycle.id)
      .eq('recommender_id', req.user.id);
    res.json({ recommendations: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/nominations/objections — submit objection
router.post('/objections', authenticate, requireApproved, async (req, res) => {
  try {
    const { nominee_id, grounds } = req.body;
    if (!grounds || grounds.length < 50) return res.status(400).json({ error: 'Grounds must be at least 50 characters' });

    const { data: nominee } = await supabase.from('nominees').select('cycle_id').eq('id', nominee_id).single();
    if (!nominee) return res.status(404).json({ error: 'Nominee not found' });

    const { data, error } = await supabase.from('objections').insert({
      cycle_id: nominee.cycle_id,
      nominee_id,
      objector_id: req.user.id,
      grounds,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ objection: data, message: 'Objection submitted to the Nomination College' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
