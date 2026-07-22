const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')
const { sendEmail } = require('../lib/email')

// GET /api/notifications — get user notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const { data } = await supabase.from('mutcu_notifications')
      .select('*').eq('user_id', req.user.id)
      .order('created_at', { ascending: false }).limit(20)
    res.json({ notifications: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const { count } = await supabase.from('mutcu_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id).is('read_at', null)
    res.json({ count: count || 0 })
  } catch (err) { res.json({ count: 0 }) }
})

// POST /api/notifications/:id/read
router.post('/:id/read', authenticate, async (req, res) => {
  try {
    await supabase.from('mutcu_notifications').update({ read_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.user.id)
    res.json({ message: 'Marked as read' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req, res) => {
  try {
    await supabase.from('mutcu_notifications').update({ read_at: new Date().toISOString() })
      .eq('user_id', req.user.id).is('read_at', null)
    res.json({ message: 'All marked as read' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
