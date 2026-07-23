const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { authenticate } = require('../middleware/auth')
const { sendEmail, sendMemberMessageNotification } = require('../lib/email')

const FRONTEND = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()
const FROM_NAME  = process.env.MAIL_FROM_NAME  || 'MUTCU DMS'
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@mutcu.org'

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

    // Build branded HTML reply
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Re: ${original_subject}</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#04003D 0%,#0a0060 100%);padding:28px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#FF9700;letter-spacing:1px;">MUTCU DMS</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Murang'a University of Technology Christian Union</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">Reply from ${sender.name} 💬</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
              Dear <strong>${to_name}</strong>, you have received a reply to your message.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;border-radius:8px;margin-bottom:20px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Regarding</p>
                <p style="margin:4px 0 0;font-size:13px;color:#04003D;font-weight:600;">${original_subject}</p>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF0;border-left:4px solid #FF9700;border-radius:0 8px 8px 0;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Message</p>
                <p style="margin:0;font-size:14px;color:#2D3748;line-height:1.8;white-space:pre-wrap;">${reply}</p>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FFF4;border:1px solid #C6F6D5;border-radius:8px;margin-bottom:8px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0;font-size:12px;color:#276749;line-height:1.6;">
                  💡 You can reply directly to this email to continue the conversation with ${sender.name}.
                </p>
              </td></tr>
            </table>

            <p style="margin:16px 0 0;font-size:12px;color:#718096;">
              &mdash; <strong>${sender.name}</strong> (${(sender.role || '').replace(/_/g, ' ')})<br>
              MUTCU Digital Management System
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#F5F7FA;padding:16px 32px;text-align:center;border-top:1px solid #E8ECF0;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">
              <em>Inspire Love, Hope &amp; Godliness</em> &nbsp;&middot;&nbsp;
              <a href="${FRONTEND}" style="color:#FF9700;text-decoration:none;">portal.mutcu.org</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Send reply email (fire and forget) — replyTo is the admin's email so member can reply back
    sendEmail({
      to: to_email,
      subject: `Re: ${original_subject}`,
      html,
      replyTo: sender.email,
    }).then(() => {
      if (message_id) {
        supabase.from('messages').update({
          status: 'replied',
          read_by: sender.id,
          read_at: new Date().toISOString(),
        }).eq('id', message_id).catch(() => {})
      }
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
    await supabase.from('messages').update({
      status: 'read',
      read_by: req.user.id,
      read_at: new Date().toISOString(),
    }).eq('id', req.params.id)
    res.json({ message: 'Marked as read' })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router