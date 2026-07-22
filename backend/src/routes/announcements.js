const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

// GET /api/announcements
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('announcements')
      .select('*, author:author_id(name,photo_url,role)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(20)
    res.json({ announcements: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/announcements (admin/ec only)
router.post('/', authenticate, requireRole('super_admin','ec_admin','cu_secretary'), async (req, res) => {
  try {
    const { title, body, is_pinned } = req.body
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' })
    const { data, error } = await supabase.from('announcements').insert({
      title, body, author_id: req.user.id, is_published: true, is_pinned: !!is_pinned,
    }).select().single()
    if (error) throw error
    res.status(201).json({ announcement: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, requireRole('super_admin','ec_admin'), async (req, res) => {
  try {
    await supabase.from('announcements').delete().eq('id', req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
