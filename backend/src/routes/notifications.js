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

// POST /api/notifications/send — send notification to a specific user (internal use)
router.post('/send', authenticate, async (req, res) => {
  try {
    const { user_id, title, body, type, category, link } = req.body
    if (!user_id || !title) return res.status(400).json({ error: 'user_id and title required' })
    const { data, error } = await supabase.from('mutcu_notifications').insert({
      user_id, title, body: body || null, type: type || 'info',
      category: category || 'general', link: link || null,
    }).select().single()
    if (error) throw error
    res.status(201).json({ notification: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/notifications/broadcast — send to multiple users
router.post('/broadcast', authenticate, async (req, res) => {
  try {
    const { user_ids, title, body, type, category, link } = req.body
    if (!user_ids || !Array.isArray(user_ids) || !title) {
      return res.status(400).json({ error: 'user_ids array and title required' })
    }
    const notifications = user_ids.map(uid => ({
      user_id: uid, title, body: body || null,
      type: type || 'info', category: category || 'general', link: link || null,
    }))
    // Insert in batches
    for (let i = 0; i < notifications.length; i += 100) {
      await supabase.from('mutcu_notifications').insert(notifications.slice(i, i + 100)).catch(() => {})
    }
    res.json({ message: `Notifications sent to ${user_ids.length} users` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
