const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate } = require('../middleware/auth')
const { sendEmail } = require('../lib/email')

// POST /api/messages — send message to admin/secretary
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, body } = req.body
    if (!subject || !body) return res.status(400).json({ error: 'Subject and message are required' })

    const sender = req.user

    const { data: msg, error } = await supabase.from('messages').insert({
      sender_id: sender.id, subject, body, status: 'unread',
    }).select().single()
    if (error) throw error

    // Notify admins
    const { data: admins } = await supabase.from('users')
      .select('email, name').in('role', ['super_admin', 'ec_admin', 'cu_secretary']).eq('is_active', true)

    for (const admin of admins || []) {
      await sendEmail({
        to: admin.email,
        subject: `[MUTCU DMS Message] ${subject}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
            <div style="background:#04003D;padding:1.5rem;text-align:center;"><h2 style="color:#FF9700;margin:0;">MUTCU DMS — New Message</h2></div>
            <div style="padding:1.5rem;">
              <p style="color:#444;"><strong>From:</strong> ${sender.name} (${sender.email})</p>
              <p style="color:#444;"><strong>MUTCU No:</strong> ${sender.mutcu_number || 'N/A'}</p>
              <p style="color:#444;"><strong>Subject:</strong> ${subject}</p>
              <div style="background:#F5F7FA;border-radius:8px;padding:1rem;margin-top:1rem;white-space:pre-wrap;color:#333;">${body}</div>
              <p style="color:#718096;font-size:0.75rem;margin-top:1rem;">Login to MUTCU DMS to reply: https://portal.mutcu.org</p>
            </div>
            <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
          </div>
        `,
      }).catch(() => {})
    }

    res.status(201).json({ message: 'Message sent successfully', id: msg.id })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// POST /api/messages/reply — admin replies to a message
router.post('/reply', authenticate, async (req, res) => {
  try {
    const { message_id, reply, to_email, to_name, original_subject } = req.body
    if (!reply || !to_email) return res.status(400).json({ error: 'Reply and recipient email required' })

    const sender = req.user

    await sendEmail({
      to: to_email,
      subject: `Re: ${original_subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:#04003D;padding:1.5rem;text-align:center;">
            <h2 style="color:#FF9700;margin:0;">MUTCU DMS</h2>
            <p style="color:rgba(255,255,255,0.6);margin:0.25rem 0 0;font-size:0.8rem;">Reply from ${sender.name}</p>
          </div>
          <div style="padding:1.5rem;">
            <p style="color:#444;">Dear ${to_name},</p>
            <div style="background:#F5F7FA;border-radius:8px;padding:1rem;margin:1rem 0;white-space:pre-wrap;color:#333;">${reply}</div>
            <p style="color:#718096;font-size:0.75rem;">— ${sender.name} (${(sender.role||'').replace(/_/g,' ')})<br>MUTCU Digital Management System</p>
          </div>
          <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
        </div>
      `,
    })

    if (message_id) {
      await supabase.from('messages').update({ status: 'replied' }).eq('id', message_id)
    }

    res.json({ message: 'Reply sent successfully' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// GET /api/messages — get all messages (admin only)
router.get('/', authenticate, async (req, res) => {
  try {
    if (!['super_admin','ec_admin','cu_secretary'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }
    const { data } = await supabase.from('messages')
      .select('*, sender:sender_id(name,email,mutcu_number,photo_url)')
      .order('created_at', { ascending: false })
    res.json({ messages: data || [] })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// PUT /api/messages/:id/read
router.put('/:id/read', authenticate, async (req, res) => {
  try {
    await supabase.from('messages').update({ status: 'read', read_by: req.user.id, read_at: new Date().toISOString() }).eq('id', req.params.id)
    res.json({ message: 'Marked as read' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
