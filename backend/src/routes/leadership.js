const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate } = require('../middleware/auth')

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

module.exports = router
