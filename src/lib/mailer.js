import nodemailer from "nodemailer";

// Lazily create transporter so the app still starts even if SMTP vars are missing
let _transport = null;

function getTransport() {
  if (_transport) return _transport;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[mailer] SMTP_USER / SMTP_PASS not set — emails will not be sent");
    return null;
  }

  _transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transport;
}

/**
 * Send a password-reset email.
 * @param {string} to  Recipient email
 * @param {string} resetUrl  Full reset link (e.g. https://smartlearningplus.me/index.html#/reset-password?token=xxx)
 * @param {string} name  Recipient's name
 */
export async function sendResetEmail(to, resetUrl, name) {
  const transport = getTransport();
  if (!transport) {
    console.warn("[mailer] Skipping email — transporter not configured");
    return;
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #fafaf8; border-radius: 16px; overflow: hidden; border: 1px solid #e5e2db;">
      <div style="background: linear-gradient(135deg, #4f46e5, #6d5ef5); padding: 32px 32px 28px;">
        <div style="color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Attendance OS</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Password Reset Request</div>
      </div>
      <div style="padding: 32px;">
        <p style="color: #1b2430; font-size: 15px; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your Attendance OS password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6d5ef5); color: #fff; text-decoration: none;
                  padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">
          Reset Password →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email — your password won't change.<br/>
          Link: <a href="${resetUrl}" style="color: #6d5ef5;">${resetUrl}</a>
        </p>
      </div>
      <div style="border-top: 1px solid #e5e2db; padding: 16px 32px; background: #f8f7f5;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Smart Learning+ · Attendance OS</p>
      </div>
    </div>
  `;

  await transport.sendMail({
    from: `"Attendance OS" <${process.env.SMTP_USER}>`,
    to,
    subject: "Reset your Attendance OS password",
    html,
  });
}
