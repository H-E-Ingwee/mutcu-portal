const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, requireRole('super_admin','ec_admin'), async (req, res) => {
  try {
    const [totalRes, activeRes, ministryRes, yearRes, genderRes, schoolRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status', 'active'),
      supabase.from('users').select('primary_ministry').eq('enrollment_status', 'active').not('primary_ministry', 'is', null),
      supabase.from('users').select('year_of_study').eq('enrollment_status', 'active').not('year_of_study', 'is', null),
      supabase.from('users').select('gender').eq('enrollment_status', 'active').not('gender', 'is', null),
      supabase.from('users').select('school_prefix').eq('enrollment_status', 'active').not('school_prefix', 'is', null),
    ]);

    // Ministry distribution
    const ministryCount = {};
    (ministryRes.data || []).forEach(u => { ministryCount[u.primary_ministry] = (ministryCount[u.primary_ministry] || 0) + 1; });
    const ministryData = Object.entries(ministryCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    // Year distribution
    const yearCount = {};
    (yearRes.data || []).forEach(u => { yearCount[u.year_of_study] = (yearCount[u.year_of_study] || 0) + 1; });
    const yearData = Object.entries(yearCount).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => a.year - b.year);

    // Gender distribution
    const genderCount = { male: 0, female: 0 };
    (genderRes.data || []).forEach(u => { if (u.gender) genderCount[u.gender] = (genderCount[u.gender] || 0) + 1; });

    // School distribution
    const schoolCount = {};
    (schoolRes.data || []).forEach(u => { if (u.school_prefix) schoolCount[u.school_prefix] = (schoolCount[u.school_prefix] || 0) + 1; });
    const schoolData = Object.entries(schoolCount).map(([school, count]) => ({ school, count })).sort((a, b) => b.count - a.count);

    // Nomination stats
    let nominationStats = null;
    const { data: cycle } = await supabase.from('nomination_cycles').select('*').not('status', 'in', '("draft","commissioned","cancelled")').order('created_at', { ascending: false }).limit(1).single();
    if (cycle) {
      const { count: eligible } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status', 'active').eq('membership_type', 'full');
      const { data: recommenders } = await supabase.from('recommendations').select('recommender_id').eq('cycle_id', cycle.id);
      const uniqueRecommenders = new Set((recommenders || []).map(r => r.recommender_id)).size;
      const { count: totalRecs } = await supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id);
      nominationStats = {
        cycle: cycle.title,
        eligible: eligible || 0,
        participated: uniqueRecommenders,
        rate: eligible ? Math.round(uniqueRecommenders / eligible * 100 * 10) / 10 : 0,
        total_recs: totalRecs || 0,
      };
    }

    // Leadership history
    const { data: appointments } = await supabase.from('appointments').select('*, user:user_id(name,photo_url), position:position_id(title)').eq('is_current', true);

    res.json({
      stats: { total: totalRes.count || 0, active: activeRes.count || 0 },
      ministryData, yearData, genderData: genderCount, schoolData,
      nominationStats, currentEC: appointments || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
