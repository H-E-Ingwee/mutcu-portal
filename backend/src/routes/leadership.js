const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

const ADMIN = ['super_admin', 'ec_admin']

// GET /api/leadership/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('appointments')
      .select('*, user:user_id(name,photo_url,primary_ministry), position:position_id(title,display_order)')
      .order('commissioned_at', { ascending: false })
    res.json({ history: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/leadership/current
router.get('/current', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('appointments')
      .select('*, user:user_id(name,photo_url,primary_ministry,mutcu_number), position:position_id(title,display_order)')
      .eq('is_current', true)
      .order('position(display_order)')
    res.json({ ec: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/leadership/manual — manually add a leadership history entry (admin)
router.post('/manual', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { user_id, position_id, spiritual_year, term_number, commissioned_at, is_current, notes, member_name, photo_url } = req.body
    if (!position_id || !spiritual_year) {
      return res.status(400).json({ error: 'position_id and spiritual_year are required' })
    }
    // If setting as current, unset previous current for this position
    if (is_current) {
      await supabase.from('appointments').update({ is_current: false }).eq('position_id', position_id).eq('is_current', true)
    }
    // Build notes: include member_name if no user_id
    const finalNotes = notes || (member_name && !user_id ? member_name : null)
    const insertData = {
      user_id: user_id || null,
      position_id,
      spiritual_year,
      term_number: term_number || 1,
      commissioned_at: commissioned_at || new Date().toISOString(),
      is_current: !!is_current,
      is_manual: true,
      notes: finalNotes,
      added_by: req.user.id,
    }
    // Store photo_url if provided and no user_id (historical entry)
    if (photo_url && !user_id) insertData.photo_url = photo_url
    const { data, error } = await supabase.from('appointments').insert(insertData)
      .select('*, user:user_id(name,photo_url), position:position_id(title)').single()
    if (error) throw error
    res.status(201).json({ appointment: data, message: 'Leadership history entry added' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/leadership/:id — update a leadership entry (admin)
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    
    const { data, error } = await supabase.from('appointments').update(updates).eq('id', req.params.id).select('*, user:user_id(name,photo_url), position:position_id(title)').single()
    if (error) throw error
    res.json({ appointment: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/leadership/:id — delete a manual entry (admin)
router.delete('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data: appt } = await supabase.from('appointments').select('is_manual').eq('id', req.params.id).single()
    if (!appt) return res.status(404).json({ error: 'Entry not found' })
    await supabase.from('appointments').delete().eq('id', req.params.id)
    res.json({ message: 'Leadership entry deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
