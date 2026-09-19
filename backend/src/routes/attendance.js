const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

const CAN_MANAGE = ['super_admin', 'ec_admin', 'cu_secretary', 'prayer_coordinator', 'music_coordinator',
  'missions_coordinator', 'bible_study_coordinator', 'discipleship_coordinator',
  'tech_media_coordinator', 'creative_arts_coordinator', '1st_vp', '2nd_vp']

// GET /api/attendance/sessions — list sessions
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const { spiritual_year, limit = 20, page = 1 } = req.query
    let query = supabase.from('attendance_sessions')
      .select('*, opener:opened_by(name)', { count: 'exact' })
      .order('session_date', { ascending: false })
    if (spiritual_year) query = query.eq('spiritual_year', spiritual_year)
    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ sessions: data || [], total: count || 0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/attendance/sessions — create session
router.post('/sessions', authenticate, requireRole(...CAN_MANAGE), async (req, res) => {
  try {
    const { title, session_date, session_type, spiritual_year, event_id, notes } = req.body
    if (!title || !session_date) return res.status(400).json({ error: 'title and session_date required' })
    const { data, error } = await supabase.from('attendance_sessions').insert({
      title, session_date, session_type: session_type || 'sunday_service',
      spiritual_year, event_id: event_id || null, notes,
      opened_by: req.user.id, is_open: true,
    }).select('*, opener:opened_by(name)').single()
    if (error) throw error
    res.status(201).json({ session: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/attendance/sessions/:id/close — close session
router.put('/sessions/:id/close', authenticate, requireRole(...CAN_MANAGE), async (req, res) => {
  try {
    const { data, error } = await supabase.from('attendance_sessions')
      .update({ is_open: false, closed_by: req.user.id, closed_at: new Date().toISOString() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ session: data, message: 'Session closed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/attendance/sessions/:id
router.delete('/sessions/:id', authenticate, requireRole('super_admin', 'ec_admin'), async (req, res) => {
  try {
    await supabase.from('attendance_records').delete().eq('session_id', req.params.id)
    await supabase.from('attendance_sessions').delete().eq('id', req.params.id)
    res.json({ message: 'Session deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/attendance/sessions/:id/records — get attendance for a session
router.get('/sessions/:id/records', authenticate, async (req, res) => {
  try {
    const { data: session } = await supabase.from('attendance_sessions').select('*').eq('id', req.params.id).single()
    const { data: records } = await supabase.from('attendance_records')
      .select('*, member:user_id(id,name,photo_url,mutcu_number,primary_ministry,year_of_study)')
      .eq('session_id', req.params.id).order('checked_in_at')
    const { count: totalMembers } = await supabase.from('users')
      .select('*', { count: 'exact', head: true }).eq('enrollment_status', 'active')
    res.json({ session, records: records || [], total_members: totalMembers || 0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/attendance/sessions/:id/checkin — check in a member
router.post('/sessions/:id/checkin', authenticate, requireRole(...CAN_MANAGE), async (req, res) => {
  try {
    const { user_id } = req.body
    if (!user_id) return res.status(400).json({ error: 'user_id required' })
    const { data: session } = await supabase.from('attendance_sessions').select('is_open').eq('id', req.params.id).single()
    if (!session?.is_open) return res.status(400).json({ error: 'Session is closed' })
    const { data, error } = await supabase.from('attendance_records').upsert({
      session_id: req.params.id, user_id,
      checked_in_at: new Date().toISOString(),
      checked_in_by: req.user.id, method: 'manual',
    }, { onConflict: 'session_id,user_id' })
      .select('*, member:user_id(name,photo_url,mutcu_number)').single()
    if (error) throw error
    res.json({ record: data, message: 'Checked in successfully' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/attendance/sessions/:id/self-checkin — member checks themselves in
router.post('/sessions/:id/self-checkin', authenticate, async (req, res) => {
  try {
    const { data: session } = await supabase.from('attendance_sessions').select('is_open').eq('id', req.params.id).single()
    if (!session?.is_open) return res.status(400).json({ error: 'Check-in is closed for this session' })
    const { data, error } = await supabase.from('attendance_records').upsert({
      session_id: req.params.id, user_id: req.user.id,
      checked_in_at: new Date().toISOString(),
      checked_in_by: req.user.id, method: 'self',
    }, { onConflict: 'session_id,user_id' })
      .select('*, member:user_id(name,photo_url,mutcu_number)').single()
    if (error) throw error
    res.json({ record: data, message: 'You have been checked in!' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/attendance/sessions/:id/records/:userId — remove check-in
router.delete('/sessions/:id/records/:userId', authenticate, requireRole(...CAN_MANAGE), async (req, res) => {
  try {
    await supabase.from('attendance_records').delete()
      .eq('session_id', req.params.id).eq('user_id', req.params.userId)
    res.json({ message: 'Check-in removed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/attendance/member/:userId — attendance history for a member
router.get('/member/:userId', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('attendance_records')
      .select('*, session:session_id(title,session_date,session_type)')
      .eq('user_id', req.params.userId)
      .order('checked_in_at', { ascending: false })
      .limit(50)
    res.json({ records: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/attendance/stats — overall attendance stats
router.get('/stats', authenticate, requireRole(...CAN_MANAGE), async (req, res) => {
  try {
    const { spiritual_year } = req.query
    let sessionsQ = supabase.from('attendance_sessions').select('id,title,session_date,session_type')
    if (spiritual_year) sessionsQ = sessionsQ.eq('spiritual_year', spiritual_year)
    const { data: sessions } = await sessionsQ.order('session_date', { ascending: false }).limit(10)

    const stats = await Promise.all((sessions || []).map(async s => {
      const { count } = await supabase.from('attendance_records')
        .select('*', { count: 'exact', head: true }).eq('session_id', s.id)
      return { ...s, attendance_count: count || 0 }
    }))

    res.json({ stats })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router