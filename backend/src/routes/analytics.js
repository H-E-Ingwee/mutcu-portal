const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const ADMIN_ROLES = ['super_admin', 'ec_admin', 'cu_secretary', 'cu_treasurer'];

// GET /api/analytics — main dashboard data
router.get('/', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const [totalRes, activeRes, ministryRes, yearRes, genderRes, schoolRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status', 'active').is('deleted_at', null),
      supabase.from('users').select('primary_ministry').eq('enrollment_status', 'active').not('primary_ministry', 'is', null).is('deleted_at', null),
      supabase.from('users').select('year_of_study').eq('enrollment_status', 'active').not('year_of_study', 'is', null).is('deleted_at', null),
      supabase.from('users').select('gender').eq('enrollment_status', 'active').not('gender', 'is', null).is('deleted_at', null),
      supabase.from('users').select('school_prefix').eq('enrollment_status', 'active').not('school_prefix', 'is', null).is('deleted_at', null),
    ]);

    const ministryCount = {};
    (ministryRes.data || []).forEach(u => { ministryCount[u.primary_ministry] = (ministryCount[u.primary_ministry] || 0) + 1; });
    const ministryData = Object.entries(ministryCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const yearCount = {};
    (yearRes.data || []).forEach(u => { yearCount[u.year_of_study] = (yearCount[u.year_of_study] || 0) + 1; });
    const yearData = Object.entries(yearCount).map(([year, count]) => ({ year: parseInt(year), count })).sort((a, b) => a.year - b.year);

    const genderCount = { male: 0, female: 0 };
    (genderRes.data || []).forEach(u => { if (u.gender) genderCount[u.gender] = (genderCount[u.gender] || 0) + 1; });

    const schoolCount = {};
    (schoolRes.data || []).forEach(u => { if (u.school_prefix) schoolCount[u.school_prefix] = (schoolCount[u.school_prefix] || 0) + 1; });
    const schoolData = Object.entries(schoolCount).map(([school, count]) => ({ school, count })).sort((a, b) => b.count - a.count);

    let nominationStats = null;
    const { data: cycle } = await supabase.from('nomination_cycles').select('*').not('status', 'in', '"draft","commissioned","cancelled"').order('created_at', { ascending: false }).limit(1).single();
    if (cycle) {
      const { count: eligible } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status', 'active').eq('membership_type', 'full');
      const { data: recommenders } = await supabase.from('recommendations').select('recommender_id').eq('cycle_id', cycle.id);
      const uniqueRecommenders = new Set((recommenders || []).map(r => r.recommender_id)).size;
      const { count: totalRecs } = await supabase.from('recommendations').select('*', { count: 'exact', head: true }).eq('cycle_id', cycle.id);
      nominationStats = {
        cycle: cycle.title, eligible: eligible || 0,
        participated: uniqueRecommenders,
        rate: eligible ? Math.round(uniqueRecommenders / eligible * 100 * 10) / 10 : 0,
        total_recs: totalRecs || 0,
      };
    }

    const { data: appointments } = await supabase.from('appointments').select('*, user:user_id(name,photo_url), position:position_id(title)').eq('is_current', true);

    // Pending changes count
    const { count: pendingChangesCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).not('pending_changes', 'is', null).eq('enrollment_status', 'active');

    res.json({
      stats: { total: totalRes.count || 0, active: activeRes.count || 0, pendingChanges: pendingChangesCount || 0 },
      ministryData, yearData, genderData: genderCount, schoolData,
      nominationStats, currentEC: appointments || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Report Export Endpoints ──────────────────────────────────────────────────

// GET /api/analytics/export/members — full members CSV
router.get('/export/members', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { ministry, year, type, status = 'active' } = req.query;
    let query = supabase.from('users')
      .select('name,email,mutcu_number,student_id,gender,year_of_study,course_type,primary_ministry,secondary_ministry,membership_type,enrollment_status,phone,school_prefix,created_at')
      .is('deleted_at', null)
      .order('name');

    if (status) query = query.eq('enrollment_status', status);
    if (ministry) query = query.eq('primary_ministry', ministry);
    if (year) query = query.eq('year_of_study', parseInt(year));
    if (type) query = query.eq('membership_type', type);

    const { data, error } = await query;
    if (error) throw error;

    const headers = ['Name', 'Email', 'MUTCU Number', 'Student ID', 'Gender', 'Year of Study', 'Course Type', 'Primary Ministry', 'Secondary Ministry', 'Membership Type', 'Status', 'Phone', 'School', 'Joined'];
    const rows = (data || []).map(m => [
      m.name, m.email, m.mutcu_number || '', m.student_id || '',
      m.gender || '', m.year_of_study || '', m.course_type || '',
      m.primary_ministry || 'General', m.secondary_ministry || '',
      m.membership_type || '', m.enrollment_status || '',
      m.phone || '', m.school_prefix || '',
      m.created_at ? new Date(m.created_at).toLocaleDateString('en-GB') : '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Members-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/ministry — ministry distribution CSV
router.get('/export/ministry', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase.from('users')
      .select('name,mutcu_number,primary_ministry,secondary_ministry,year_of_study,gender,enrollment_status')
      .eq('enrollment_status', 'active').is('deleted_at', null).order('primary_ministry').order('name');
    if (error) throw error;

    const headers = ['Name', 'MUTCU Number', 'Primary Ministry', 'Secondary Ministry', 'Year of Study', 'Gender'];
    const rows = (data || []).map(m => [m.name, m.mutcu_number || '', m.primary_ministry || 'General', m.secondary_ministry || '', m.year_of_study || '', m.gender || '']);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Ministry-Report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/academic — academic distribution CSV
router.get('/export/academic', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase.from('users')
      .select('name,mutcu_number,year_of_study,course_type,school_prefix,gender,primary_ministry,enrollment_status')
      .eq('enrollment_status', 'active').is('deleted_at', null).order('year_of_study').order('name');
    if (error) throw error;

    const headers = ['Name', 'MUTCU Number', 'Year of Study', 'Course Type', 'School', 'Gender', 'Ministry'];
    const rows = (data || []).map(m => [m.name, m.mutcu_number || '', m.year_of_study || '', m.course_type || '', m.school_prefix || '', m.gender || '', m.primary_ministry || 'General']);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Academic-Report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/nominations — nominations report CSV
router.get('/export/nominations', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles').select('*').not('status', 'in', '"draft","cancelled"').order('created_at', { ascending: false }).limit(1).single();
    if (!cycle) return res.status(404).json({ error: 'No active nomination cycle found' });

    const { data: recs } = await supabase.from('recommendations')
      .select('*, recommender:recommender_id(name,mutcu_number), candidate:candidate_id(name,mutcu_number), position:position_id(title)')
      .eq('cycle_id', cycle.id).order('position_id');

    const headers = ['Cycle', 'Position', 'Candidate Name', 'Candidate MUTCU#', 'Recommended By', 'Recommender MUTCU#', 'Date'];
    const rows = (recs || []).map(r => [
      cycle.title, r.position?.title || '', r.candidate?.name || '', r.candidate?.mutcu_number || '',
      r.recommender?.name || '', r.recommender?.mutcu_number || '',
      r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB') : '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Nominations-${cycle.title.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/leadership — leadership history CSV
router.get('/export/leadership', authenticate, requireRole(...ADMIN_ROLES), async (req, res) => {
  try {
    const { data, error } = await supabase.from('appointments')
      .select('*, user:user_id(name,email,mutcu_number), position:position_id(title)')
      .order('spiritual_year', { ascending: false }).order('term_number');
    if (error) throw error;

    const headers = ['Name', 'MUTCU Number', 'Email', 'Position', 'Spiritual Year', 'Term Number', 'Commissioned', 'Current'];
    const rows = (data || []).map(a => [
      a.user?.name || '', a.user?.mutcu_number || '', a.user?.email || '',
      a.position?.title || '', a.spiritual_year || '', a.term_number || '',
      a.commissioned_at ? new Date(a.commissioned_at).toLocaleDateString('en-GB') : '',
      a.is_current ? 'Yes' : 'No',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Leadership-History-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/export/disciplinary — disciplinary cases CSV
router.get('/export/disciplinary', authenticate, requireRole('super_admin', 'ec_admin'), async (req, res) => {
  try {
    const { data, error } = await supabase.from('disciplinary_cases')
      .select('*, member:member_id(name,mutcu_number,primary_ministry)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const headers = ['Case Number', 'Member Name', 'MUTCU Number', 'Ministry', 'Severity', 'Status', 'Outcome', 'Date Opened'];
    const rows = (data || []).map(c => [
      c.case_number || '', c.member?.name || '', c.member?.mutcu_number || '',
      c.member?.primary_ministry || '', c.severity || '', c.status || '',
      c.outcome || '', c.created_at ? new Date(c.created_at).toLocaleDateString('en-GB') : '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="MUTCU-Disciplinary-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;