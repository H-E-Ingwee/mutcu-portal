const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

const ADMIN = ['super_admin', 'ec_admin']

// ─── Helper: safe column check ────────────────────────────────
// Builds update payload using only columns that exist in the table
function buildAppointmentPayload(body, includeExtended = false) {
  const { user_id, position_id, spiritual_year, term_number, commissioned_at, is_current, notes, member_name, photo_url } = body
  const payload = {}

  if (position_id !== undefined) payload.position_id = position_id
  if (user_id !== undefined) payload.user_id = user_id || null
  if (spiritual_year !== undefined) payload.spiritual_year = spiritual_year
  if (term_number !== undefined) payload.term_number = parseInt(term_number) || 1
  if (commissioned_at !== undefined) payload.commissioned_at = commissioned_at || new Date().toISOString()
  if (is_current !== undefined) payload.is_current = !!is_current

  // Extended columns — added via schema migration
  // These are added safely; if columns don't exist, Supabase will return an error
  // which we catch and retry without them
  if (includeExtended) {
    const finalNotes = notes || (member_name && !user_id ? member_name : null)
    if (finalNotes !== undefined) payload.notes = finalNotes
    if (photo_url && !user_id) payload.photo_url = photo_url
  }

  return payload
}

// ─── Safe insert/update with column fallback ──────────────────
async function safeUpsert(operation, payload, id = null) {
  let query
  if (operation === 'insert') {
    query = supabase.from('appointments').insert(payload).select('*, user:user_id(name,photo_url), position:position_id(title)').single()
  } else {
    query = supabase.from('appointments').update(payload).eq('id', id).select('*, user:user_id(name,photo_url), position:position_id(title)').single()
  }

  const { data, error } = await query

  // If error mentions unknown column, retry without extended columns
  if (error && (error.message?.includes('notes') || error.message?.includes('photo_url') || error.message?.includes('is_manual') || error.message?.includes('added_by'))) {
    const safePayload = { ...payload }
    delete safePayload.notes
    delete safePayload.photo_url
    delete safePayload.is_manual
    delete safePayload.added_by

    let retryQuery
    if (operation === 'insert') {
      retryQuery = supabase.from('appointments').insert(safePayload).select('*, user:user_id(name,photo_url), position:position_id(title)').single()
    } else {
      retryQuery = supabase.from('appointments').update(safePayload).eq('id', id).select('*, user:user_id(name,photo_url), position:position_id(title)').single()
    }
    return retryQuery
  }

  return { data, error }
}

// GET /api/leadership/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('appointments')
      .select('*, user:user_id(name,photo_url,primary_ministry), position:position_id(title,display_order)')
      .order('spiritual_year', { ascending: false })
      .order('commissioned_at', { ascending: false })
    // Sort within each year by position display_order
    const sorted = (data || []).sort((a, b) => {
      if (a.spiritual_year !== b.spiritual_year) return (b.spiritual_year || '').localeCompare(a.spiritual_year || '')
      return (a.position?.display_order || 99) - (b.position?.display_order || 99)
    })
    res.json({ history: sorted })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/leadership/current
router.get('/current', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('appointments')
      .select('*, user:user_id(name,photo_url,primary_ministry,mutcu_number), position:position_id(title,display_order)')
      .eq('is_current', true)
      .order('position(display_order)', { ascending: true })
    // Sort by position display_order in JS as fallback
    const sorted = (data || []).sort((a, b) => (a.position?.display_order || 99) - (b.position?.display_order || 99))
    res.json({ ec: sorted })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/leadership/manual — manually add a leadership history entry (admin)
router.post('/manual', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { position_id, spiritual_year, is_current, user_id } = req.body
    if (!position_id || !spiritual_year) {
      return res.status(400).json({ error: 'position_id and spiritual_year are required' })
    }

    // If setting as current, unset previous current for this position
    if (is_current) {
      await supabase.from('appointments').update({ is_current: false })
        .eq('position_id', position_id).eq('is_current', true)
    }

    const payload = buildAppointmentPayload(req.body, true)

    const { data, error } = await safeUpsert('insert', payload)
    if (error) throw error

    res.status(201).json({ appointment: data, message: 'Leadership history entry added' })
  } catch (err) {
    console.error('[LEADERSHIP POST ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/leadership/:id — update a leadership entry (admin)
router.put('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { position_id, is_current } = req.body

    // If setting as current, unset previous current for this position
    if (is_current && position_id) {
      await supabase.from('appointments').update({ is_current: false })
        .eq('position_id', position_id).eq('is_current', true).neq('id', req.params.id)
    }

    const payload = buildAppointmentPayload(req.body, true)

    // Remove undefined values
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    const { data, error } = await safeUpsert('update', payload, req.params.id)
    if (error) throw error

    res.json({ appointment: data })
  } catch (err) {
    console.error('[LEADERSHIP PUT ERROR]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/leadership/:id — delete a leadership entry (admin)
router.delete('/:id', authenticate, requireRole(...ADMIN), async (req, res) => {
  try {
    const { data: appt } = await supabase.from('appointments').select('id').eq('id', req.params.id).single()
    if (!appt) return res.status(404).json({ error: 'Entry not found' })
    await supabase.from('appointments').delete().eq('id', req.params.id)
    res.json({ message: 'Leadership entry deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router