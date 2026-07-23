const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate } = require('../middleware/auth')
const { sendEmail, sendMemberMessageNotification } = require('../lib/email')

// POST /api/messages — send message to admin/secretary
router.post('/', authenticate, async (req, res) => {
  try {
    const { subject, body } = req.body
    if (!subject || !body) return res.status(400).json({ error: 'Subject and message are required' })

    const sender = req.user

    // Save to DB
    const { data: msg, error } = await supabase.from('messages').insert({
      sender_id: sender.id, subject, body, status: 'unread',
    }).select().single()
    if (error) throw error

    // Respond immediately
    res.status(201).json({ message: 'Message sent successfully', id: msg.id })

    // Get admin emails and notify (fire and forget)
    supabase.from('users').select('email, name')
      .in('role', ['super_admin', 'ec_admin', 'cu_secretary'])
      .eq('is_active', true)
      .then(({ data: admins }) => {
        if (!admins || admins.length === 0) return
        sendMemberMessageNotification({
          senderName: sender.name,
          senderEmail: sender.email,
          mutcuNumber: sender.mutcu_number,
          subject,
          body,
          adminEmails: admins.map(a => a.email),
        }).catch(e => console.error('Message notification failed:', e.message))
      })

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/messages/reply — admin replies to a message
router.post('/reply', authenticate, async (req, res) => {
  try {
    const { message_id, reply, to_email, to_name, original_subject } = req.body
    if (!reply || !to_email) return res.status(400).json({ error: 'Reply and recipient email required' })

    const sender = req.user

    // Respond immediately
    res.json({ message: 'Reply sent successfully' })

    // Send reply email (fire and forget)
    sendEmail({
      to: to_email,
      replyTo: sender.email,
      subject: `Re: ${original_subject}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <div style="background:#04003D;padding:1.5rem;text-align:center;">
            <h2 style="color:#FF9700;margin:0;">MUTCU DMS</h2>
            <p style="color:rgba(255,255,255,0.6);margin:0.25rem 0 0;font-size:0.8rem;">Reply from ${sender.name}</p>
          </div>
          <div style="padding:1.5rem;">
            <p style="color:#444;">Dear ${to_name},</p>
            <div style="background:#F5F7FA;border-radius:8px;padding:1rem;margin:1rem 0;white-space:pre-wrap;color:#333;line-height:1.6;">${reply}</div>
            <p style="color:#718096;font-size:0.75rem;">— ${sender.name} (${(sender.role||'').replace(/_/g,' ')})<br>MUTCU Digital Management System</p>
            <div style="margin-top:1rem;padding:0.75rem;background:#EBF8FF;border-radius:8px;font-size:0.75rem;color:#2C5282;">
              💡 You can reply directly to this email to continue the conversation.
            </div>
          </div>
          <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
        </div>
      `,
    }).then(() => {
      if (message_id) supabase.from('messages').update({ status: 'replied' }).eq('id', message_id).catch(() => {})
    }).catch(e => console.error('Reply email failed:', e.message))

  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
