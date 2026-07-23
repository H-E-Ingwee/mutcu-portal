// Email temporarily disabled - logging only
// Will be re-enabled once SMTP is configured correctly

async function sendEmail({ to, subject }) {
  console.log(`[EMAIL PAUSED] Would send to: ${to} | Subject: ${subject}`)
  return { messageId: 'paused' }
}

async function sendVerificationEmail(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()
  const url = `${frontendUrl}/verify-email?token=${token}&id=${user.id}`
  console.log(`[EMAIL PAUSED] Verification for ${user.email}: ${url}`)
}

async function sendApprovalEmail(user) {
  console.log(`[EMAIL PAUSED] Approval for ${user.email} - MUTCU: ${user.mutcu_number}`)
}

async function sendPasswordResetEmail(user, token) {
  const frontendUrl = (process.env.FRONTEND_URL || 'https://mutcu-portal.vercel.app').trim()
  const url = `${frontendUrl}/reset-password?token=${token}`
  console.log(`[EMAIL PAUSED] Reset for ${user.email}: ${url}`)
}

async function sendMemberMessageNotification({ senderName, senderEmail, subject }) {
  console.log(`[EMAIL PAUSED] Message from ${senderName} (${senderEmail}): ${subject}`)
}

module.exports = { sendEmail, sendVerificationEmail, sendApprovalEmail, sendPasswordResetEmail, sendMemberMessageNotification }
