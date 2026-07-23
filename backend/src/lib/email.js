const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  auth: {
    user: 'resend',
    pass: process.env.MAIL_PASS,
  },
})

transporter.verify((error) => {
  if (error) console.error('Email error:', error.message)
  else console.log('Email ready: Resend → noreply@mutcu.org')
})

const FROM = '"MUTCU DMS" <noreply@mutcu.org>'
const REPLY_TO = process.env.MAIL_REPLY_TO || 'ingwebrian@gmail.com'

// ── Base email template ────────────────────────────────────────────────────
function baseTemplate(content, footerNote = '') {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MUTCU DMS</title>
</head>
<body style="margin:0;padding:0;background:#F5F7FA;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F7FA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#04003D 0%,#0a0060 100%);padding:32px 40px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,151,0,0.15);border-radius:12px;padding:8px 20px;margin-bottom:12px;">
            <span style="color:#FF9700;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">MUTCU Digital Management System</span>
          </div>
          <div style="color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;margin-bottom:4px;">MUTCU DMS</div>
          <div style="color:rgba(255,255,255,0.5);font-size:12px;">Murang'a University of Technology Christian Union</div>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td style="padding:40px;">
          ${content}
        </td>
      </tr>

      <!-- Divider -->
      <tr>
        <td style="padding:0 40px;">
          <div style="height:1px;background:linear-gradient(to right,transparent,#E2E8F0,transparent);"></div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 40px;text-align:center;">
          <p style="margin:0 0 8px;color:#718096;font-size:12px;font-style:italic;">"Inspire Love, Hope & Godliness"</p>
          <p style="margin:0;color:#A0AEC0;font-size:11px;">
            <a href="https://portal.mutcu.org" style="color:#FF9700;text-decoration:none;">portal.mutcu.org</a>
            &nbsp;·&nbsp; noreply@mutcu.org
          </p>
          ${footerNote ? `<p style="margin:8px 0 0;color:#CBD5E0;font-size:10px;">${footerNote}</p>` : ''}
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
  `
}

// ── Button helper ──────────────────────────────────────────────────────────
function btn(text, url, color = '#FF9700') {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:24px auto;">
      <tr>
        <td style="background:${color};border-radius:10px;padding:14px 32px;text-align:center;">
          <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">${text}</a>
        </td>
      </tr>
    </table>
  `
}

// ── Info row helper ────────────────────────────────────────────────────────
function infoRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #F7FAFC;">
        <span style="color:#718096;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">${label}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #F7FAFC;text-align:right;">
        <span style="color:#1A202C;font-size:14px;font-weight:700;">${value}</span>
      </td>
    </tr>
  `
}

async function sendEmail({ to, subject, html, replyTo }) {
  const info = await transporter.sendMail({
    from: FROM,
    replyTo: replyTo || REPLY_TO,
    to, subject, html,
  })
  console.log('Email sent:', info.messageId, '→', to)
  return info
}

// ── Verification Email ─────────────────────────────────────────────────────
async function sendVerificationEmail(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()
  const url = `${frontendUrl}/verify-email?token=${token}&id=${user.id}`

  const content = `
    <h2 style="margin:0 0 8px;color:#04003D;font-size:22px;font-weight:800;">Welcome to MUTCU DMS! 🎉</h2>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.7;">
      Hello <strong>${user.name}</strong>, your registration is almost complete. 
      Please verify your email address to activate your account and join the MUTCU family.
    </p>

    ${user.temp_password ? `
    <div style="background:#FFF8F0;border:1px solid #FED7AA;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#C05621;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Your Temporary Password</p>
      <p style="margin:0;color:#04003D;font-size:20px;font-weight:800;font-family:monospace;letter-spacing:2px;">${user.temp_password}</p>
      <p style="margin:6px 0 0;color:#718096;font-size:11px;">You will be asked to change this on first login.</p>
    </div>
    ` : ''}

    ${btn('Verify My Email Address', url)}

    <div style="background:#F7FAFC;border-radius:10px;padding:16px 20px;margin-top:8px;">
      <p style="margin:0 0 4px;color:#4A5568;font-size:12px;font-weight:600;">Or copy this link:</p>
      <p style="margin:0;word-break:break-all;"><a href="${url}" style="color:#FF9700;font-size:12px;">${url}</a></p>
    </div>

    <p style="margin:20px 0 0;color:#A0AEC0;font-size:12px;text-align:center;">
      This link expires in 48 hours. If you did not register, please ignore this email.
    </p>
  `

  await sendEmail({
    to: user.email,
    subject: '✅ Verify Your MUTCU DMS Email Address',
    html: baseTemplate(content, 'This is an automated message from MUTCU DMS. Please do not reply directly to this email.'),
  })
}

// ── Approval Email ─────────────────────────────────────────────────────────
async function sendApprovalEmail(user) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()

  const content = `
    <h2 style="margin:0 0 8px;color:#04003D;font-size:22px;font-weight:800;">Membership Approved! 🙌</h2>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.7;">
      Dear <strong>${user.name}</strong>, welcome to the MUTCU family! Your membership application 
      has been reviewed and approved by the CU Secretary.
    </p>

    ${user.mutcu_number ? `
    <div style="background:linear-gradient(135deg,#04003D,#0a0060);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Your MUTCU Membership Number</p>
      <p style="margin:0;color:#FF9700;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:3px;">${user.mutcu_number}</p>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:11px;">This number is permanent and uniquely identifies you as a MUTCU member.</p>
    </div>
    ` : ''}

    <div style="margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#4A5568;font-size:14px;font-weight:600;">You can now:</p>
      <table cellpadding="0" cellspacing="0" width="100%">
        ${['Download your digital member card','Participate in nomination cycles','Access ministry resources','Connect with fellow members'].map(item => `
        <tr>
          <td style="padding:6px 0;">
            <span style="display:inline-block;width:20px;height:20px;background:#30D5C8;border-radius:50%;text-align:center;line-height:20px;color:#fff;font-size:11px;font-weight:700;margin-right:10px;">✓</span>
            <span style="color:#4A5568;font-size:14px;">${item}</span>
          </td>
        </tr>`).join('')}
      </table>
    </div>

    ${btn('Access Your Dashboard', `${frontendUrl}/dashboard`, '#04003D')}
  `

  await sendEmail({
    to: user.email,
    subject: '🎉 MUTCU Membership Approved — Welcome to the Family!',
    html: baseTemplate(content),
  })
}

// ── Password Reset Email ───────────────────────────────────────────────────
async function sendPasswordResetEmail(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()
  const url = `${frontendUrl}/reset-password?token=${token}`
  console.log('Sending reset email to:', user.email, 'URL:', url)

  const content = `
    <h2 style="margin:0 0 8px;color:#04003D;font-size:22px;font-weight:800;">Password Reset Request 🔐</h2>
    <p style="margin:0 0 24px;color:#4A5568;font-size:15px;line-height:1.7;">
      Hello <strong>${user.name}</strong>, we received a request to reset your MUTCU DMS password. 
      Click the button below to set a new password.
    </p>

    ${btn('Reset My Password', url, '#FF9700')}

    <div style="background:#F7FAFC;border-radius:10px;padding:16px 20px;margin-top:8px;">
      <p style="margin:0 0 4px;color:#4A5568;font-size:12px;font-weight:600;">Or copy this link:</p>
      <p style="margin:0;word-break:break-all;"><a href="${url}" style="color:#FF9700;font-size:12px;">${url}</a></p>
    </div>

    <div style="background:#FFF5F5;border:1px solid #FED7D7;border-radius:10px;padding:14px 20px;margin-top:20px;">
      <p style="margin:0;color:#C53030;font-size:13px;">
        ⚠️ This link expires in <strong>1 hour</strong>. 
        If you did not request a password reset, please ignore this email — your account is safe.
      </p>
    </div>
  `

  await sendEmail({
    to: user.email,
    subject: '🔐 Reset Your MUTCU DMS Password',
    html: baseTemplate(content, 'This is an automated security email. If you did not request this, please ignore it.'),
  })
}

// ── Member Message Notification ────────────────────────────────────────────
async function sendMemberMessageNotification({ senderName, senderEmail, mutcuNumber, subject, body, adminEmails }) {
  const content = `
    <div style="background:#EBF8FF;border-left:4px solid #3182CE;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#2C5282;font-size:13px;font-weight:600;">📬 New message from a MUTCU member</p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      ${infoRow('From', senderName)}
      ${infoRow('Email', senderEmail)}
      ${infoRow('MUTCU Number', mutcuNumber || 'Not assigned')}
      ${infoRow('Subject', subject)}
    </table>

    <div style="background:#F7FAFC;border-radius:10px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 8px;color:#718096;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
      <p style="margin:0;color:#1A202C;font-size:14px;line-height:1.8;white-space:pre-wrap;">${body}</p>
    </div>

    <div style="background:#F0FFF4;border:1px solid #9AE6B4;border-radius:10px;padding:14px 20px;">
      <p style="margin:0;color:#276749;font-size:13px;">
        💡 <strong>To reply:</strong> Simply reply to this email — your response will go directly to 
        <strong>${senderName}</strong> at <a href="mailto:${senderEmail}" style="color:#276749;">${senderEmail}</a>
      </p>
    </div>
  `

  for (const adminEmail of adminEmails) {
    await sendEmail({
      to: adminEmail,
      replyTo: senderEmail,
      subject: `📬 [MUTCU DMS] ${subject} — from ${senderName}`,
      html: baseTemplate(content),
    }).catch(e => console.error('Admin notification failed to', adminEmail, ':', e.message))
  }
}

module.exports = { sendEmail, sendVerificationEmail, sendApprovalEmail, sendPasswordResetEmail, sendMemberMessageNotification }
