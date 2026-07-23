const nodemailer = require('nodemailer')

// ─── Transporter ────────────────────────────────────────────────────────────
// Uses Brevo (formerly Sendinblue) SMTP relay — works on Render, free 300/day
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 465,
  secure: true, // SSL — required on Render (port 587/STARTTLS is blocked)
  auth: {
    user: process.env.BREVO_SMTP_USER, // e.g. 7xxxxx@smtp-brevo.com
    pass: process.env.BREVO_SMTP_PASS, // Brevo SMTP key
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
})

const FROM_NAME  = process.env.MAIL_FROM_NAME  || 'MUTCU DMS'
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@mutcu.org'
const REPLY_TO   = process.env.MAIL_REPLY_TO   || FROM_EMAIL
const FRONTEND   = (process.env.FRONTEND_URL   || 'https://mutcu-portal.vercel.app').trim()

// ─── Shared HTML wrapper ─────────────────────────────────────────────────────
function htmlWrap(title, bodyHtml, footerNote = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#04003D 0%,#0a0060 100%);padding:28px 32px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#FF9700;letter-spacing:1px;font-family:Arial,sans-serif;">MUTCU DMS</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;letter-spacing:2px;text-transform:uppercase;">Murang'a University of Technology Christian Union</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${bodyHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F5F7FA;padding:16px 32px;text-align:center;border-top:1px solid #E8ECF0;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;">
              <em>Inspire Love, Hope &amp; Godliness</em> &nbsp;&middot;&nbsp;
              <a href="${FRONTEND}" style="color:#FF9700;text-decoration:none;">portal.mutcu.org</a>
            </p>
            ${footerNote ? `<p style="margin:8px 0 0;font-size:10px;color:#C4C9D4;">${footerNote}</p>` : ''}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Generic send helper ─────────────────────────────────────────────────────
async function sendEmail({ to, subject, html, replyTo }) {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn(`[EMAIL SKIPPED — no SMTP config] To: ${to} | Subject: ${subject}`)
    return { messageId: 'skipped-no-config' }
  }

  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      replyTo: replyTo || REPLY_TO,
      to,
      subject,
      html,
    })
    console.log(`[EMAIL SENT] To: ${to} | Subject: ${subject} | ID: ${info.messageId}`)
    return info
  } catch (err) {
    console.error(`[EMAIL ERROR] To: ${to} | Subject: ${subject} | Error: ${err.message}`)
    throw err
  }
}

// ─── 1. Welcome / Verification email (secretary-enrolled member) ─────────────
async function sendVerificationEmail(user, token) {
  const html = htmlWrap(
    'Welcome to MUTCU DMS',
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">Welcome, ${user.name}! 🎉</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
      You have been enrolled as a member of the <strong>Murang'a University of Technology Christian Union</strong>.
      Your account is ready &mdash; use the temporary password below to sign in.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Your Login Details</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Email:</strong> ${user.email}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Temporary Password:</strong>
          <code style="background:#fff;padding:2px 8px;border-radius:4px;font-size:13px;border:1px solid #E2E8F0;">${user.temp_password || '(see admin)'}</code>
        </p>
        ${user.mutcu_number ? `<p style="margin:4px 0 0;font-size:13px;color:#04003D;"><strong>MUTCU Number:</strong> <span style="color:#FF9700;font-weight:700;">${user.mutcu_number}</span></p>` : ''}
      </td></tr>
    </table>

    <p style="margin:0 0 20px;font-size:13px;color:#4A5568;line-height:1.6;">
      You will be prompted to change your password on first login. Please keep your credentials safe.
    </p>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${FRONTEND}/login" style="display:inline-block;background:#FF9700;color:#ffffff;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
        Sign In to MUTCU DMS &rarr;
      </a>
    </div>
    `,
    'This email was sent because you were enrolled by the CU Secretary. If this was a mistake, please contact admin.'
  )

  return sendEmail({
    to: user.email,
    subject: 'Welcome to MUTCU DMS — Your Account is Ready',
    html,
  })
}

// ─── 2. Approval email (self-registered member approved) ────────────────────
async function sendApprovalEmail(user) {
  const html = htmlWrap(
    'Membership Approved',
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">Your Membership is Approved! ✅</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
      Dear <strong>${user.name}</strong>, your MUTCU membership application has been reviewed and approved.
      You are now an active member of the Christian Union.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FFF4;border:1px solid #C6F6D5;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#276749;text-transform:uppercase;letter-spacing:1px;">Membership Details</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Name:</strong> ${user.name}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>MUTCU Number:</strong> <span style="color:#FF9700;font-weight:700;">${user.mutcu_number}</span></p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Membership Type:</strong> ${user.membership_type || 'Full'} Member</p>
        ${user.primary_ministry ? `<p style="margin:0;font-size:13px;color:#04003D;"><strong>Ministry:</strong> ${user.primary_ministry}</p>` : ''}
      </td></tr>
    </table>

    <p style="margin:0 0 20px;font-size:13px;color:#4A5568;line-height:1.6;">
      You can now access all member features including nominations, your digital member card, and ministry activities.
    </p>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${FRONTEND}/dashboard" style="display:inline-block;background:#FF9700;color:#ffffff;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        Go to My Dashboard &rarr;
      </a>
    </div>
    `,
    'Welcome to the MUTCU family!'
  )

  return sendEmail({
    to: user.email,
    subject: `MUTCU Membership Approved — Welcome, ${user.name}!`,
    html,
  })
}

// ─── 3. Password reset email ─────────────────────────────────────────────────
async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${FRONTEND}/reset-password?token=${token}`

  const html = htmlWrap(
    'Reset Your Password',
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">Password Reset Request 🔐</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
      Hi <strong>${user.name}</strong>, we received a request to reset your MUTCU DMS password.
      Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${resetUrl}" style="display:inline-block;background:#04003D;color:#FF9700;font-weight:700;font-size:14px;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.5px;">
        Reset My Password &rarr;
      </a>
    </div>

    <p style="margin:0 0 8px;font-size:12px;color:#718096;line-height:1.6;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="margin:0;font-size:11px;color:#FF9700;word-break:break-all;">${resetUrl}</p>
    `,
    'If you did not request a password reset, you can safely ignore this email. Your password will not change.'
  )

  return sendEmail({
    to: user.email,
    subject: 'MUTCU DMS — Password Reset Link',
    html,
  })
}

// ─── 4. Member message notification (to admins) ──────────────────────────────
async function sendMemberMessageNotification({ senderName, senderEmail, mutcuNumber, subject, body, adminEmails }) {
  if (!adminEmails || adminEmails.length === 0) return

  const html = htmlWrap(
    'New Member Message',
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">New Message from a Member 📩</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
      A member has sent a message through the MUTCU portal.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;border-radius:8px;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Sender Details</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Name:</strong> ${senderName}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#04003D;"><strong>Email:</strong> <a href="mailto:${senderEmail}" style="color:#FF9700;">${senderEmail}</a></p>
        ${mutcuNumber ? `<p style="margin:0;font-size:13px;color:#04003D;"><strong>MUTCU No:</strong> ${mutcuNumber}</p>` : ''}
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBF0;border-left:4px solid #FF9700;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Subject</p>
        <p style="margin:0 0 12px;font-size:14px;color:#04003D;font-weight:700;">${subject}</p>
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;">Message</p>
        <p style="margin:0;font-size:13px;color:#4A5568;line-height:1.7;white-space:pre-wrap;">${body}</p>
      </td></tr>
    </table>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${FRONTEND}/admin/messages" style="display:inline-block;background:#FF9700;color:#ffffff;font-weight:700;font-size:13px;padding:11px 28px;border-radius:8px;text-decoration:none;">
        View &amp; Reply in Admin Panel &rarr;
      </a>
    </div>
    `,
    `Reply directly to this email to respond to ${senderName}.`
  )

  return sendEmail({
    to: adminEmails.join(', '),
    subject: `[MUTCU Portal] New Message: ${subject}`,
    html,
    replyTo: senderEmail,
  })
}

// ─── 5. Rejection email ──────────────────────────────────────────────────────
async function sendRejectionEmail(user, reason) {
  const html = htmlWrap(
    'Membership Application Update',
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">Membership Application Update</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">
      Dear <strong>${user.name}</strong>, thank you for applying to join MUTCU.
      After review, we are unable to approve your application at this time.
    </p>

    ${reason ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:8px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C53030;text-transform:uppercase;letter-spacing:1px;">Reason</p>
        <p style="margin:0;font-size:13px;color:#4A5568;line-height:1.6;">${reason}</p>
      </td></tr>
    </table>
    ` : ''}

    <p style="margin:0 0 20px;font-size:13px;color:#4A5568;line-height:1.6;">
      If you believe this is an error or would like to discuss further, please contact the CU Secretary directly.
    </p>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="mailto:${REPLY_TO}" style="display:inline-block;background:#04003D;color:#FF9700;font-weight:700;font-size:13px;padding:11px 28px;border-radius:8px;text-decoration:none;">
        Contact the Secretary &rarr;
      </a>
    </div>
    `,
    'This is an automated message from MUTCU DMS.'
  )

  return sendEmail({
    to: user.email,
    subject: 'MUTCU Membership Application — Update',
    html,
  })
}

// ─── 6. Nomination cycle announcement (bulk) ─────────────────────────────────
async function sendCycleAnnouncementEmail({ recipientEmails, cycleTitle, spiritualYear, status, closeDate }) {
  const statusMessages = {
    nominations_open: {
      subject: `Nominations Now Open — ${spiritualYear}`,
      heading: 'Nominations Are Now Open! 🗳️',
      body: `The nomination period for the <strong>${cycleTitle}</strong> has officially opened.
             As a full member, you are invited to prayerfully recommend candidates for EC positions.
             ${closeDate ? `<br><br>Nominations close on <strong>${new Date(closeDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</strong>.` : ''}`,
      cta: 'Submit Your Recommendations',
      ctaUrl: `${FRONTEND}/nominations`,
    },
    nominees_published: {
      subject: `Nominees Published — ${spiritualYear}`,
      heading: 'Nominees Have Been Published 📋',
      body: `The Nomination College has completed vetting for the <strong>${cycleTitle}</strong>.
             The list of approved nominees is now available for your review.`,
      cta: 'View Nominees',
      ctaUrl: `${FRONTEND}/nominations/nominees`,
    },
    objection_period: {
      subject: `Objection Period Open — ${spiritualYear}`,
      heading: 'Objection Period is Now Open ⚖️',
      body: `The objection period for the <strong>${cycleTitle}</strong> is now open.
             If you have substantive grounds to object to any nominee, you may submit your objection through the portal.
             ${closeDate ? `<br><br>Objections close on <strong>${new Date(closeDate).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</strong>.` : ''}`,
      cta: 'View Nominees & Submit Objection',
      ctaUrl: `${FRONTEND}/nominations/nominees`,
    },
  }

  const msg = statusMessages[status]
  if (!msg || !recipientEmails || recipientEmails.length === 0) return

  const html = htmlWrap(
    msg.heading,
    `
    <h2 style="margin:0 0 8px;font-size:20px;color:#04003D;font-weight:800;">${msg.heading}</h2>
    <p style="margin:0 0 20px;font-size:14px;color:#4A5568;line-height:1.6;">${msg.body}</p>
    <div style="text-align:center;margin-bottom:8px;">
      <a href="${msg.ctaUrl}" style="display:inline-block;background:#FF9700;color:#ffffff;font-weight:700;font-size:14px;padding:12px 32px;border-radius:8px;text-decoration:none;">
        ${msg.cta} &rarr;
      </a>
    </div>
    `
  )

  // Send in batches of 50 to stay within rate limits
  const BATCH = 50
  for (let i = 0; i < recipientEmails.length; i += BATCH) {
    const batch = recipientEmails.slice(i, i + BATCH)
    await sendEmail({ to: batch.join(', '), subject: msg.subject, html })
  }
}

// ─── Verify SMTP connection on startup ──────────────────────────────────────
async function verifyConnection() {
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn('[EMAIL] BREVO_SMTP_USER / BREVO_SMTP_PASS not set — email sending disabled')
    return false
  }
  try {
    await transporter.verify()
    console.log('[EMAIL] ✅ Brevo SMTP connection verified — email is ready')
    return true
  } catch (err) {
    console.error('[EMAIL] ❌ SMTP connection failed:', err.message)
    return false
  }
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendApprovalEmail,
  sendPasswordResetEmail,
  sendRejectionEmail,
  sendMemberMessageNotification,
  sendCycleAnnouncementEmail,
  verifyConnection,
}