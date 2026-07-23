const nodemailer = require('nodemailer')

// Gmail OAuth2 transporter
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: process.env.GMAIL_USER,
      clientId: process.env.GMAIL_CLIENT_ID,
      clientSecret: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    },
  })
}

const transporter = createTransporter()

transporter.verify((error) => {
  if (error) {
    console.error('Gmail OAuth2 error:', error.message)
  } else {
    console.log('Gmail OAuth2 ready:', process.env.GMAIL_USER)
  }
})

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'MUTCU DMS'}" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    })
    console.log('Email sent:', info.messageId, '→', to)
    return info
  } catch (err) {
    console.error('Email send error:', err.message)
    throw err
  }
}

async function sendVerificationEmail(user, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app'
  const url = `${frontendUrl}/verify-email?token=${token}&id=${user.id}`
  await sendEmail({
    to: user.email,
    subject: 'Verify Your MUTCU DMS Email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#04003D;padding:2rem;text-align:center;">
          <h1 style="color:#FF9700;margin:0;">MUTCU DMS</h1>
          <p style="color:rgba(255,255,255,0.6);margin:0.25rem 0 0;font-size:0.8rem;">Murang'a University of Technology Christian Union</p>
        </div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Welcome, ${user.name}!</h2>
          <p style="color:#444;line-height:1.7;">Please verify your email address to activate your MUTCU DMS account.</p>
          ${user.temp_password ? `<div style="background:#F5F7FA;border-radius:8px;padding:1rem;margin:1rem 0;text-align:center;"><p style="margin:0;font-size:0.75rem;color:#718096;">Temporary Password</p><p style="margin:0.25rem 0 0;font-size:1.25rem;font-weight:700;color:#04003D;font-family:monospace;">${user.temp_password}</p></div>` : ''}
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${url}" style="display:inline-block;background:#FF9700;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;">Verify Email Address</a>
          </div>
          <p style="font-size:0.75rem;color:#718096;">Or copy this link:<br><a href="${url}" style="color:#04003D;word-break:break-all;">${url}</a></p>
          <p style="font-size:0.75rem;color:#718096;">Link expires in 48 hours.</p>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
      </div>
    `,
  })
}

async function sendApprovalEmail(user) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app'
  await sendEmail({
    to: user.email,
    subject: 'MUTCU Membership Approved!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#04003D;padding:2rem;text-align:center;"><h1 style="color:#FF9700;margin:0;">MUTCU DMS</h1></div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Membership Approved, ${user.name}!</h2>
          <p style="color:#444;line-height:1.7;">Your MUTCU membership has been approved by the CU Secretary.</p>
          ${user.mutcu_number ? `<div style="background:rgba(255,151,0,0.1);border-radius:8px;padding:1rem;text-align:center;margin:1rem 0;"><p style="margin:0;font-size:0.72rem;color:#718096;">Your MUTCU Number</p><p style="margin:0.25rem 0 0;font-size:1.25rem;font-weight:700;color:#FF9700;font-family:monospace;">${user.mutcu_number}</p></div>` : ''}
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${frontendUrl}/dashboard" style="display:inline-block;background:#04003D;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;">Access Dashboard</a>
          </div>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
      </div>
    `,
  })
}

async function sendPasswordResetEmail(user, token) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app'
  const url = `${frontendUrl}/reset-password?token=${token}`
  console.log('Reset URL:', url)
  await sendEmail({
    to: user.email,
    subject: 'Reset Your MUTCU DMS Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#04003D;padding:2rem;text-align:center;"><h1 style="color:#FF9700;margin:0;">MUTCU DMS</h1></div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Password Reset Request</h2>
          <p style="color:#444;">Hello ${user.name},</p>
          <p style="color:#444;line-height:1.7;">Click the button below to reset your MUTCU DMS password:</p>
          <div style="text-align:center;margin:1.5rem 0;">
            <a href="${url}" style="display:inline-block;background:#FF9700;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;">Reset My Password</a>
          </div>
          <p style="font-size:0.78rem;color:#718096;">This link expires in <strong>1 hour</strong>.</p>
          <p style="font-size:0.75rem;color:#718096;">Or copy:<br><a href="${url}" style="color:#04003D;word-break:break-all;">${url}</a></p>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
      </div>
    `,
  })
}

module.exports = { sendEmail, sendVerificationEmail, sendApprovalEmail, sendPasswordResetEmail }
