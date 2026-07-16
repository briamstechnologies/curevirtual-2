// FILE: services/emailService.js
// Approval notification emails for Doctor/Pharmacy registration workflow
// Uses the same Gmail/SMTP transporter pattern from lib/emailService.js

const nodemailer = require('nodemailer');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@curevirtual.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://curevirtual-2.vercel.app';

// Reuse the shared nodemailer transporter configuration
let transporter = null;
try {
  const defaultPort = parseInt(process.env.EMAIL_PORT || '465');
  const defaultSecure = process.env.EMAIL_SECURE === 'true' || defaultPort === 465;

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    family: 4,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
} catch (err) {
  console.error('❌ Approval email transporter init failed:', err.message);
}

/**
 * Send approval email to a Doctor or Pharmacy user.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {'DOCTOR'|'PHARMACY'} params.role
 */
async function sendApprovalEmail({ email, name, role }) {
  if (!transporter) throw new Error('Email transporter not configured');

  const roleLabels = {
    'DOCTOR': 'Doctor',
    'PHARMACY': 'Pharmacy',
    'LABORATORY': 'Laboratory'
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>CureVirtual Account Approved</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:24px;overflow:hidden;border:1px solid rgba(99,179,237,0.2);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#10b981,#8b5cf6);padding:48px 40px;text-align:center;">
              <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-1px;margin:0;text-transform:uppercase;">
                CURE<span style="color:#d1fae5;">VIRTUAL</span>
              </h1>
              <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:8px 0 0;text-transform:uppercase;letter-spacing:3px;">
                Telehealth Platform
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <div style="text-align:center;margin-bottom:32px;">
                <div style="display:inline-block;background:rgba(16,185,129,0.1);border:2px solid #10b981;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;">
                  🎉
                </div>
              </div>
              <h2 style="color:#f1f5f9;font-size:24px;font-weight:800;margin:0 0 16px;text-align:center;">
                Congratulations, ${name}!
              </h2>
              <p style="color:#94a3b8;font-size:15px;line-height:1.7;text-align:center;margin:0 0 24px;">
                Your <strong style="color:#10b981;">${roleLabel}</strong> account has been verified and
                approved by the CureVirtual admin team. You can now log in and access your full dashboard.
              </p>
              <!-- CTA -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/login"
                   style="background:linear-gradient(135deg,#3b82f6,#10b981);color:#fff;font-size:14px;
                          font-weight:800;text-decoration:none;padding:16px 40px;border-radius:12px;
                          display:inline-block;text-transform:uppercase;letter-spacing:2px;">
                  Login to Dashboard →
                </a>
              </div>
              <p style="color:#64748b;font-size:13px;text-align:center;margin:24px 0 0;">
                Welcome to the CureVirtual family. We're thrilled to have you on board.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(99,179,237,0.1);text-align:center;">
              <p style="color:#475569;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:2px;">
                © ${new Date().getFullYear()} CureVirtual — Your Health, Our Priority
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"CureVirtual" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Your CureVirtual account has been approved! 🎉',
    html,
  });

  console.log(`✅ Approval email sent to ${email}`);
}

/**
 * Send rejection email to a Doctor or Pharmacy user.
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.name
 * @param {'DOCTOR'|'PHARMACY'} params.role
 * @param {string|null} params.rejectionReason
 */
async function sendRejectionEmail({ email, name, role, rejectionReason }) {
  if (!transporter) throw new Error('Email transporter not configured');

  const roleLabels = {
    'DOCTOR': 'Doctor',
    'PHARMACY': 'Pharmacy',
    'LABORATORY': 'Laboratory'
  };
  const roleLabel = roleLabels[role] || 'User';
  const reasonHtml = rejectionReason
    ? `<div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.3);border-radius:12px;padding:16px;margin:24px 0;">
         <p style="color:#fca5a5;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Reason:</p>
         <p style="color:#f1f5f9;font-size:14px;margin:0;">${rejectionReason}</p>
       </div>`
    : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><title>CureVirtual Registration Update</title></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:24px;overflow:hidden;border:1px solid rgba(99,179,237,0.2);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:48px 40px;text-align:center;">
              <h1 style="color:#fff;font-size:28px;font-weight:900;letter-spacing:-1px;margin:0;text-transform:uppercase;">
                CURE<span style="color:#d1fae5;">VIRTUAL</span>
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:48px 40px;">
              <h2 style="color:#f1f5f9;font-size:22px;font-weight:800;margin:0 0 16px;text-align:center;">
                Hello, ${name}
              </h2>
              <p style="color:#94a3b8;font-size:15px;line-height:1.7;text-align:center;margin:0 0 8px;">
                Thank you for applying as a <strong style="color:#a78bfa;">${roleLabel}</strong> on CureVirtual.
              </p>
              <p style="color:#94a3b8;font-size:15px;line-height:1.7;text-align:center;margin:0 0 24px;">
                After reviewing your registration, we were unable to approve your account at this time.
              </p>
              ${reasonHtml}
              <p style="color:#94a3b8;font-size:14px;line-height:1.7;text-align:center;margin:0 0 32px;">
                You may re-apply with updated or corrected documentation. If you believe this is an error,
                please contact our support team.
              </p>
              <!-- CTA -->
              <div style="text-align:center;margin:32px 0;">
                <a href="${FRONTEND_URL}/register"
                   style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;font-size:14px;
                          font-weight:800;text-decoration:none;padding:16px 40px;border-radius:12px;
                          display:inline-block;text-transform:uppercase;letter-spacing:2px;">
                  Re-apply →
                </a>
              </div>
              <p style="color:#475569;font-size:13px;text-align:center;margin:16px 0 0;">
                Need help? Contact us at
                <a href="mailto:${FROM_EMAIL}" style="color:#3b82f6;">${FROM_EMAIL}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(99,179,237,0.1);text-align:center;">
              <p style="color:#475569;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:2px;">
                © ${new Date().getFullYear()} CureVirtual — Your Health, Our Priority
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"CureVirtual" <${FROM_EMAIL}>`,
    to: email,
    subject: 'Update on your CureVirtual registration',
    html,
  });

  console.log(`✅ Rejection email sent to ${email}`);
}

module.exports = { sendApprovalEmail, sendRejectionEmail };
