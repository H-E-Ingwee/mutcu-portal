const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')
const { sendCycleAnnouncementEmail } = require('../lib/email')

const ADMIN = ['super_admin','ec_admin']

const CYCLE_STATUSES = ['setup','prayer_period','nominations_open','vetting','nominees_published','objection_period','pre_agm','commissioned']

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const [totalRes, activeRes, pendingRes, ministryRes, cycleRes, logsRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status','active'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('enrollment_status','pending'),
      supabase.from('ministries').select('*', { count: 'exact', head: true }).eq('is_active',true),
      supabase.from('nomination_cycles').select('*').not('status','in','("draft","commissioned","cancelled")').order('created_at',{ascending:false}).limit(1).single(),
      supabase.from('audit_logs').select('*, actor:actor_id(name)').order('created_at',{ascending:false}).limit(10),
    ])
    const { data: ec } = await supabase.from('appointments').select('*, user:user_id(name,photo_url), position:position_id(title)').eq('is_current',true)
    res.json({
      stats: { total_members: totalRes.count||0, active_members: activeRes.count||0, pending_members: pendingRes.count||0, ministry_count: ministryRes.count||0 },
      activeCycle: cycleRes.data||null, currentEC: ec||[], recentLogs: logsRes.data||[],
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/admin/cycles/:id/advance-status — advance cycle to next stage
router.post('/cycles/:id/advance-status', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data: cycle } = await supabase.from('nomination_cycles').select('status').eq('id', req.params.id).single()
    if (!cycle) return res.status(404).json({ error: 'Cycle not found' })
    const currentIdx = CYCLE_STATUSES.indexOf(cycle.status)
    if (currentIdx === -1 || currentIdx >= CYCLE_STATUSES.length - 1) {
      return res.status(400).json({ error: 'Cannot advance from current status' })
    }
    const nextStatus = CYCLE_STATUSES[currentIdx + 1]
    

// POST /api/admin/cycles/:id/set-status — set specific status
router.post('/cycles/:id/set-status', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { status } = req.body
    if (!CYCLE_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' })
    const { data, error } = await supabase.from('nomination_cycles').update({ status, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ cycle: data, message: `Status set to: ${status.replace(/_/g,' ')}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/audit-log
router.get('/audit-log', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { from, to, page=1, limit=50 } = req.query
    let query = supabase.from('audit_logs').select('*, actor:actor_id(name)', { count: 'exact' }).order('created_at',{ascending:false})
    if (from) query = query.gte('created_at', from)
    if (to) query = query.lte('created_at', to+'T23:59:59')
    const offset = (parseInt(page)-1)*parseInt(limit)
    query = query.range(offset, offset+parseInt(limit)-1)
    const { data, error, count } = await query
    if (error) throw error
    res.json({ logs: data||[], total: count||0 })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/cycles
router.get('/cycles', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('nomination_cycles').select('*').order('created_at',{ascending:false})
    if (error) throw error
    res.json({ cycles: data||[] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/admin/cycles
router.post('/cycles', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('nomination_cycles').insert({ ...req.body, created_by: req.user.id, status: 'setup' }).select().single()
    if (error) throw error
    res.status(201).json({ cycle: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/admin/cycles/:id
router.put('/cycles/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data, error } = await supabase.from('nomination_cycles').update({ ...req.body, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ cycle: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/admin/cycles/:id/nc
router.post('/cycles/:id/nc', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { user_id, nc_role } = req.body
    const cycleId = req.params.id
    const { data: existing } = await supabase.from('nc_members').select('id').eq('cycle_id', cycleId).eq('user_id', user_id).single()
    let data, error
    if (existing) {
      const result = await supabase.from('nc_members').update({ nc_role: nc_role||'member', appointed_by: req.user.id, appointed_at: new Date().toISOString() }).eq('id', existing.id).select().single()
      data = result.data; error = result.error
    } else {
      const result = await supabase.from('nc_members').insert({ cycle_id: cycleId, user_id, nc_role: nc_role||'member', appointed_by: req.user.id, appointed_at: new Date().toISOString(), is_active: true }).select().single()
      data = result.data; error = result.error
    }
    if (error) throw error
    await supabase.from('users').update({ role: 'nc_member' }).eq('id', user_id)
    res.json({ nc_member: data, message: 'NC member appointed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/cycles/:id/nc
router.get('/cycles/:id/nc', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data } = await supabase.from('nc_members').select('*, user:user_id(id,name,photo_url,email,student_id,mutcu_number)').eq('cycle_id', req.params.id).eq('is_active', true)
    res.json({ nc_members: data||[] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/admin/cycles/:cycleId/nc/:ncId
router.delete('/cycles/:cycleId/nc/:ncId', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    await supabase.from('nc_members').delete().eq('id', req.params.ncId)
    res.json({ message: 'NC member removed' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/admin/cycles/:id/commission
router.post('/cycles/:id/commission', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const cycleId = req.params.id
    const { data: cycle } = await supabase.from('nomination_cycles').select('spiritual_year').eq('id', cycleId).single()
    const { data: nominees } = await supabase.from('nominees').select('*').eq('cycle_id', cycleId).eq('status','active')
    await supabase.from('appointments').update({ is_current: false }).neq('cycle_id', cycleId)
    for (const nominee of nominees||[]) {
      const { count } = await supabase.from('appointments').select('*',{count:'exact',head:true}).eq('position_id',nominee.position_id).eq('user_id',nominee.candidate_id)
      await supabase.from('appointments').insert({ cycle_id: cycleId, position_id: nominee.position_id, user_id: nominee.candidate_id, term_number: (count||0)+1, spiritual_year: cycle?.spiritual_year, commissioned_at: new Date().toISOString(), is_current: true })
    }
    await supabase.from('nomination_cycles').update({ status: 'commissioned' }).eq('id', cycleId)
    res.json({ message: 'New EC commissioned successfully' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/roles
router.get('/roles', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { data } = await supabase.from('users').select('id,name,email,role,enrollment_status').neq('role','full_member').order('name')
    res.json({ users: data||[] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/admin/roles/:userId
router.put('/roles/:userId', authenticate, requireRole('super_admin'), async (req, res) => {
  try {
    const { role } = req.body
    const validRoles = ['super_admin','ec_admin','cu_secretary','ministry_secretary','nc_member','full_member','special_member','associate_member']
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' })
    const { data, error } = await supabase.from('users').update({ role }).eq('id', req.params.userId).select('id,name,email,role').single()
    if (error) throw error
    res.json({ user: data, message: `Role updated to ${role}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/finalists
router.get('/finalists', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data } = await supabase.from('users').select('id,name,email,student_id,mutcu_number,year_of_study,photo_url,gender').eq('enrollment_status','active').or('is_finalist.eq.true,year_of_study.gte.4').order('name')
    res.json({ finalists: data||[] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/admin/members/bulk-approve
router.post('/members/bulk-approve', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { member_ids } = req.body
    if (!member_ids || !Array.isArray(member_ids)) return res.status(400).json({ error: 'member_ids array required' })
    const year = parseInt(process.env.MUTCU_FOUNDING_YEAR || new Date().getFullYear())
    let approved = 0
    for (const id of member_ids) {
      const { data: member } = await supabase.from('users').select('mutcu_number').eq('id', id).single()
      let mutcuNumber = member?.mutcu_number
      if (!mutcuNumber) {
        const { data: lastUser } = await supabase.from('users').select('mutcu_number').like('mutcu_number', `MUTCU-${year}-%`).order('mutcu_number', { ascending: false }).limit(1)
        let seq = lastUser && lastUser.length > 0 ? parseInt(lastUser[0].mutcu_number.split('-')[2]) + 1 : 2
        mutcuNumber = `MUTCU-${year}-${String(seq).padStart(4,'0')}`
      }
      await supabase.from('users').update({ enrollment_status: 'active', mutcu_number: mutcuNumber, approved_by: req.user.id, approved_at: new Date().toISOString(), is_active: true, email_verified: true }).eq('id', id)
      approved++
    }
    res.json({ message: `${approved} members approved successfully`, count: approved })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/export/members
router.get('/export/members', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { data } = await supabase.from('users').select('name,email,mutcu_number,student_id,gender,year_of_study,membership_type,primary_ministry,enrollment_status,created_at').order('name')
    const headers = ['Name','Email','MUTCU Number','Student ID','Gender','Year','Membership Type','Ministry','Status','Registered']
    const rows = (data||[]).map(m => [m.name,m.email,m.mutcu_number||'',m.student_id||'',m.gender||'',m.year_of_study||'',m.membership_type,m.primary_ministry||'General',m.enrollment_status,m.created_at?.split('T')[0]||''])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="mutcu-members.csv"')
    res.send(csv)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/admin/settings
router.get('/settings', authenticate, requireRole(...ADMIN), async (req, res) => {
  res.json({
    settings: {
      app_name: process.env.APP_NAME || 'MUTCU DMS',
      founding_year: process.env.MUTCU_FOUNDING_YEAR || '2026',
      frontend_url: process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app',
      reply_email: process.env.MAIL_REPLY_TO || 'ingwebrian@gmail.com',
    }
  })
})

module.exports = router
