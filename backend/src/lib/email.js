const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"${process.env.MAIL_FROM_NAME || 'MUTCU DMS'}" <${process.env.MAIL_FROM || process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

async function sendVerificationEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/verify-email?token=${token}&id=${user.id}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify Your MUTCU DMS Email',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#04003D;padding:2rem;text-align:center;">
          <h1 style="color:#FF9700;margin:0;font-size:1.5rem;">MUTCU DMS</h1>
          <p style="color:rgba(255,255,255,0.6);margin:0.25rem 0 0;font-size:0.8rem;">Murang'a University of Technology Christian Union</p>
        </div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Welcome, ${user.name}!</h2>
          <p style="color:#444;line-height:1.7;">Please verify your email address to activate your MUTCU DMS account.</p>
          ${user.temp_password ? `<div style="background:#F5F7FA;border-radius:8px;padding:1rem;margin:1rem 0;text-align:center;"><p style="margin:0;font-size:0.75rem;color:#718096;">Temporary Password</p><p style="margin:0.25rem 0 0;font-size:1.25rem;font-weight:700;color:#04003D;font-family:monospace;">${user.temp_password}</p></div>` : ''}
          <a href="${url}" style="display:inline-block;background:#FF9700;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;margin:1rem 0;">Verify Email Address</a>
          <p style="font-size:0.75rem;color:#718096;">Link expires in 24 hours. If you did not register, ignore this email.</p>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
      </div>
    `,
  });
}

async function sendApprovalEmail(user) {
  await sendEmail({
    to: user.email,
    subject: 'MUTCU Membership Approved!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <div style="background:#04003D;padding:2rem;text-align:center;">
          <h1 style="color:#FF9700;margin:0;">MUTCU DMS</h1>
        </div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Membership Approved, ${user.name}!</h2>
          <p style="color:#444;line-height:1.7;">Your MUTCU membership has been approved by the CU Secretary.</p>
          ${user.mutcu_number ? `<div style="background:rgba(255,151,0,0.1);border-radius:8px;padding:1rem;text-align:center;margin:1rem 0;"><p style="margin:0;font-size:0.72rem;color:#718096;">Your MUTCU Number</p><p style="margin:0.25rem 0 0;font-size:1.25rem;font-weight:700;color:#FF9700;font-family:monospace;">${user.mutcu_number}</p></div>` : ''}
          <a href="${process.env.FRONTEND_URL}/dashboard" style="display:inline-block;background:#04003D;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;">Access Dashboard</a>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness · portal.mutcu.org</div>
      </div>
    `,
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset Your MUTCU DMS Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:#04003D;padding:2rem;text-align:center;"><h1 style="color:#FF9700;margin:0;">MUTCU DMS</h1></div>
        <div style="padding:2rem;">
          <h2 style="color:#04003D;">Password Reset</h2>
          <p style="color:#444;">Click below to reset your password. Link expires in 1 hour.</p>
          <a href="${url}" style="display:inline-block;background:#FF9700;color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;">Reset Password</a>
        </div>
        <div style="background:#F5F7FA;padding:1rem;text-align:center;font-size:0.72rem;color:#718096;">Inspire Love, Hope & Godliness</div>
      </div>
    `,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendApprovalEmail, sendPasswordResetEmail };
