import { Resend } from "resend";

let _resend = null;

function getClient() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) {
    console.warn("[mailer] RESEND_API_KEY not set — emails will not be sent");
    return null;
  }
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

/**
 * Send a password-reset email via Resend (HTTPS API — works on Railway).
 * @param {string} to  Recipient email
 * @param {string} resetUrl  Full reset link
 * @param {string} name  Recipient's name
 */
export async function sendResetEmail(to, resetUrl, name) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] Skipping email — Resend client not configured");
    return;
  }

  const fromAddress = process.env.RESEND_FROM || "Attendance OS <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #fafaf8; border-radius: 16px; overflow: hidden; border: 1px solid #e5e2db;">
      <div style="background: linear-gradient(135deg, #4f46e5, #6d5ef5); padding: 32px 32px 28px;">
        <div style="color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Attendance OS</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Password Reset Request</div>
      </div>
      <div style="padding: 32px;">
        <p style="color: #1b2430; font-size: 15px; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          We received a request to reset your Attendance OS password.<br/>
          Click the button below — this link expires in <strong>1 hour</strong>.
        </p>
        <a href="${resetUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6d5ef5); color: #fff; text-decoration: none;
                  padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">
          Reset Password →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.6;">
          If you didn't request this, you can safely ignore this email.<br/>
          <a href="${resetUrl}" style="color: #6d5ef5; word-break: break-all;">${resetUrl}</a>
        </p>
      </div>
      <div style="border-top: 1px solid #e5e2db; padding: 16px 32px; background: #f8f7f5;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Smart Learning+ · Attendance OS</p>
      </div>
    </div>
  `;

  const { data, error } = await client.emails.send({
    from: fromAddress,
    to,
    subject: "Reset your Attendance OS password",
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[mailer] Reset email sent to ${to} — id: ${data?.id}`);
}

/**
 * Send an email verification link via Resend.
 * @param {string} to  Recipient email
 * @param {string} verifyUrl  Full verification link (e.g. https://smartlearningplus.me/index.html#/verify-email?token=xxx)
 * @param {string} name  Recipient's name
 */
export async function sendVerificationEmail(to, verifyUrl, name) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] Skipping email — Resend client not configured");
    return;
  }

  const fromAddress = process.env.RESEND_FROM || "Attendance OS <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #fafaf8; border-radius: 16px; overflow: hidden; border: 1px solid #e5e2db;">
      <div style="background: linear-gradient(135deg, #4f46e5, #6d5ef5); padding: 32px 32px 28px;">
        <div style="color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Smart Learning+</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Confirm your email address</div>
      </div>
      <div style="padding: 32px;">
        <p style="color: #1b2430; font-size: 15px; margin: 0 0 12px;">Welcome <strong>${name}</strong>!</p>
        <p style="color: #15803d; font-size: 15px; font-weight: bold; margin: 0 0 12px;">🎉 Your registration has been approved!</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Thanks for signing up to Smart Learning+ Attendance OS. Please click the button below to verify your email address and activate your account.
        </p>
        <a href="${verifyUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6d5ef5); color: #fff; text-decoration: none;
                  padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 700; letter-spacing: -0.2px;">
          Verify Email Address →
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.6;">
          If you did not register for this account, you can safely ignore this email.<br/>
          <a href="${verifyUrl}" style="color: #6d5ef5; word-break: break-all;">${verifyUrl}</a>
        </p>
      </div>
      <div style="border-top: 1px solid #e5e2db; padding: 16px 32px; background: #f8f7f5;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Smart Learning+ · Attendance OS</p>
      </div>
    </div>
  `;

  const { data, error } = await client.emails.send({
    from: fromAddress,
    to,
    subject: "Verify your Smart Learning+ email address",
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[mailer] Verification email sent to ${to} — id: ${data?.id}`);
}

/**
 * Send a rejection email via Resend.
 * @param {string} to  Recipient email
 * @param {string} name  Recipient's name
 */
export async function sendRejectionEmail(to, name) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] Skipping email — Resend client not configured");
    return;
  }

  const fromAddress = process.env.RESEND_FROM || "Attendance OS <onboarding@resend.dev>";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 520px; margin: 0 auto; background: #fafaf8; border-radius: 16px; overflow: hidden; border: 1px solid #e5e2db;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 32px 28px;">
        <div style="color: white; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Smart Learning+</div>
        <div style="color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px;">Registration Update</div>
      </div>
      <div style="padding: 32px;">
        <p style="color: #1b2430; font-size: 15px; margin: 0 0 12px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          Thank you for your interest in Smart Learning+.<br/><br/>
          Unfortunately, your registration request has not been approved at this time. Access to the platform is currently limited and requires manual admin approval.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 24px 0 0; line-height: 1.6;">
          If you believe this is a mistake, please contact the administrator.
        </p>
      </div>
      <div style="border-top: 1px solid #e5e2db; padding: 16px 32px; background: #f8f7f5;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">Smart Learning+ · Attendance OS</p>
      </div>
    </div>
  `;

  const { data, error } = await client.emails.send({
    from: fromAddress,
    to,
    subject: "Update on your Smart Learning+ registration",
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[mailer] Rejection email sent to ${to} — id: ${data?.id}`);
}
