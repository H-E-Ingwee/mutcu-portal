const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate, requireRole } = require('../middleware/auth')

const CAN_POST = ['super_admin', 'ec_admin', 'cu_secretary', 'cu_treasurer', 'vice_secretary', '1st_vp', '2nd_vp',
  'prayer_coordinator', 'music_coordinator', 'missions_coordinator', 'bible_study_coordinator',
  'discipleship_coordinator', 'tech_media_coordinator', 'creative_arts_coordinator',
  'interim_chair', 'interim_secretary', 'interim_treasurer']

// GET /api/announcements — filter by member's gender for targeted announcements
router.get('/', authenticate, async (req, res) => {
  try {
    const memberGender = req.user?.gender
    let query = supabase.from('announcements')
      .select('*, author:author_id(name,photo_url,role)')
      .eq('is_published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(30)

    // Show: announcements with no gender target OR matching member's gender
    if (memberGender) {
      query = query.or(`target_gender.is.null,target_gender.eq.${memberGender}`)
    } else {
      query = query.is('target_gender', null)
    }

    const { data } = await query
    res.json({ announcements: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/announcements
router.post('/', authenticate, requireRole(...CAN_POST), async (req, res) => {
  try {
    const { title, body, is_pinned, notify_all } = req.body
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' })

    const { data, error } = await supabase.from('announcements').insert({
      title, body, author_id: req.user.id, is_published: true, is_pinned: !!is_pinned,
    }).select().single()
    if (error) throw error

    // Send notifications to all active members if notify_all is true
    if (notify_all !== false) {
      const { data: members } = await supabase.from('users')
        .select('id').eq('enrollment_status', 'active').eq('is_active', true)
      const notifications = (members || []).map(m => ({
        user_id: m.id,
        title: `📢 New Announcement: ${title}`,
        body: body.substring(0, 120) + (body.length > 120 ? '...' : ''),
        type: 'info',
        category: 'announcement',
        link: '/announcements',
      }))
      // Insert in batches of 100
      for (let i = 0; i < notifications.length; i += 100) {
        await supabase.from('mutcu_notifications').insert(notifications.slice(i, i + 100)).catch(() => {})
      }
    }

    res.status(201).json({ announcement: data, message: 'Announcement posted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/announcements/:id — edit announcement
router.put('/:id', authenticate, requireRole(...CAN_POST), async (req, res) => {
  try {
    const { title, body, is_pinned, is_published } = req.body
    const updates = { updated_at: new Date().toISOString() }
    if (title !== undefined) updates.title = title
    if (body !== undefined) updates.body = body
    if (is_pinned !== undefined) updates.is_pinned = is_pinned
    if (is_published !== undefined) updates.is_published = is_published

    // Only author or admin can edit
    const { data: existing } = await supabase.from('announcements').select('author_id').eq('id', req.params.id).single()
    if (!existing) return res.status(404).json({ error: 'Announcement not found' })
    if (existing.author_id !== req.user.id && !['super_admin', 'ec_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only edit your own announcements' })
    }

    const { data, error } = await supabase.from('announcements').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ announcement: data })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// DELETE /api/announcements/:id
router.delete('/:id', authenticate, requireRole(...CAN_POST), async (req, res) => {
  try {
    const { data: existing } = await supabase.from('announcements').select('author_id').eq('id', req.params.id).single()
    if (!existing) return res.status(404).json({ error: 'Announcement not found' })
    if (existing.author_id !== req.user.id && !['super_admin', 'ec_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'You can only delete your own announcements' })
    }
    await supabase.from('announcements').delete().eq('id', req.params.id)
    res.json({ message: 'Announcement deleted' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/announcements/gender-update — VP sends update to all ladies or all gents
router.post('/gender-update', authenticate, async (req, res) => {
  try {
    const { title, body, target_gender } = req.body
    if (!title || !body || !target_gender) return res.status(400).json({ error: 'title, body and target_gender required' })

    // Only 1st VP (ladies) and 2nd VP (gents) can send gender-targeted updates
    if (target_gender === 'female' && req.user.role !== '1st_vp' && !['ec_admin','super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only 1st VP can send updates to ladies' })
    }
    if (target_gender === 'male' && req.user.role !== '2nd_vp' && !['ec_admin','super_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only 2nd VP can send updates to gents' })
    }

    // Save as a targeted announcement
    const { data, error } = await supabase.from('announcements').insert({
      title, body,
      author_id: req.user.id,
      is_published: true,
      target_gender,
    }).select().single()
    if (error) throw error

    res.status(201).json({ announcement: data, message: `Update sent to all ${target_gender === 'female' ? 'ladies' : 'gents'}` })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router