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

function getFrontendUrl() {
  let frontendBase = process.env.FRONTEND_URL || "https://smartlearningplus.me";
  if (frontendBase.includes(",")) {
    const urls = frontendBase.split(",").map((u) => u.trim());
    const prodUrl = urls.find((u) => !u.includes("localhost"));
    frontendBase = prodUrl || urls[0];
  }
  return frontendBase;
}

/**
 * Parses a simple subset of Markdown (bold, italic, links, lists, paragraphs) into safe HTML.
 */
export function parseMarkdown(text) {
  if (!text) return "";
  
  // Escape HTML to prevent injection
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic *text* or _text_
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Links [text](url)
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color: #4f46e5; text-decoration: underline; font-weight: 600;">$1</a>');

  // Parse lines to handle bullet points and paragraphs
  const lines = html.split(/\r?\n/);
  let result = [];
  let inList = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const content = trimmed.substring(2);
      if (!inList) {
        inList = true;
        result.push('<ul style="margin: 8px 0 16px; padding-left: 20px; color: #334155; font-size: 14.5px; line-height: 1.6;">');
      }
      result.push(`<li style="margin-bottom: 6px;">${content}</li>`);
    } else {
      if (inList) {
        inList = false;
        result.push('</ul>');
      }
      if (trimmed === "") {
        result.push("<br/>");
      } else {
        result.push(`<p style="margin: 0 0 12px; color: #334155; font-size: 14.5px; line-height: 1.65;">${line}</p>`);
      }
    }
  }
  if (inList) {
    result.push('</ul>');
  }

  return result.join("\n");
}

/**
 * Standard, beautiful email layout wrapper with premium design, custom links, and headers/footers.
 */
function getEmailLayout(title, subtitle, contentHtml, name, buttonText = "", buttonUrl = "", headerColor = "linear-gradient(135deg, #4f46e5, #06b6d4)") {
  const frontendUrl = getFrontendUrl();
  const actualButtonUrl = buttonUrl || frontendUrl;
  
  const buttonSection = buttonText ? `
    <div style="margin: 28px 0; text-align: left;">
      <a href="${actualButtonUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6d5ef5); color: #ffffff !important; text-decoration: none;
                padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: -0.2px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
        ${buttonText} &rarr;
      </a>
    </div>
  ` : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fafaf8; border-radius: 16px; overflow: hidden; border: 1px solid #e5e2db; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
      <!-- Header -->
      <div style="background: ${headerColor}; padding: 32px 32px 28px;">
        <div style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0;">Smart Learning+</div>
        <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-top: 4px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">${subtitle || "Notification"}</div>
      </div>
      
      <!-- Body -->
      <div style="padding: 32px; background: #ffffff;">
        <p style="color: #1b2430; font-size: 16px; font-weight: 700; margin: 0 0 16px;">Hi ${name || "User"},</p>
        <div style="color: #334155; font-size: 14.5px; line-height: 1.65; margin: 0; font-family: inherit;">
          ${contentHtml}
        </div>
        ${buttonSection}
      </div>

      <!-- Footer -->
      <div style="border-top: 1px solid #e5e2db; padding: 24px 32px; background: #f8f7f5; text-align: left;">
        <div style="margin-bottom: 12px;">
          <a href="${frontendUrl}" style="color: #4f46e5; text-decoration: none; font-size: 12px; font-weight: 700; display: inline-block;">
            Smart Learning+ Platform &rarr;
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 11px; margin: 0 0 6px; line-height: 1.5;">
          Smart Learning+ · Attendance OS
        </p>
        <p style="color: #cbd5e1; font-size: 10px; margin: 0; line-height: 1.4;">
          This email was sent to you as a registered member of Smart Learning+. 
          For any assistance, please reach out to the platform administration.
        </p>
      </div>
    </div>
  `;
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

  const fromAddress = process.env.RESEND_FROM || "Smart Learning+ <onboarding@resend.dev>";

  const contentHtml = `
    <p style="margin: 0 0 16px;">We received a request to reset your Attendance OS password.</p>
    <p style="margin: 0 0 16px;">Please click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
  `;

  const html = getEmailLayout(
    "Smart Learning+",
    "Password Reset Request",
    contentHtml,
    name,
    "Reset Password",
    resetUrl
  );

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
 * @param {string} verifyUrl  Full verification link
 * @param {string} name  Recipient's name
 */
export async function sendVerificationEmail(to, verifyUrl, name) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] Skipping email — Resend client not configured");
    return;
  }

  const fromAddress = process.env.RESEND_FROM || "Smart Learning+ <onboarding@resend.dev>";

  const contentHtml = `
    <p style="color: #15803d; font-size: 16px; font-weight: bold; margin: 0 0 16px;">🎉 Your registration has been approved!</p>
    <p style="margin: 0 0 16px;">Thanks for signing up for Smart Learning+ Attendance OS. Click the button below to verify your email address and activate your account.</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you did not register for this account, you can safely ignore this email.</p>
  `;

  const html = getEmailLayout(
    "Smart Learning+",
    "Confirm your email address",
    contentHtml,
    name,
    "Verify Email Address",
    verifyUrl
  );

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

  const fromAddress = process.env.RESEND_FROM || "Smart Learning+ <onboarding@resend.dev>";

  const contentHtml = `
    <p style="margin: 0 0 16px;">Thank you for your interest in Smart Learning+.</p>
    <p style="margin: 0 0 16px;">Unfortunately, your registration request has not been approved at this time. Access to the platform is currently limited and requires manual administrator approval.</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">If you believe this is a mistake, please contact the administrator.</p>
  `;

  const html = getEmailLayout(
    "Smart Learning+",
    "Registration Update",
    contentHtml,
    name,
    "",
    "",
    "linear-gradient(135deg, #ef4444, #dc2626)"
  );

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

/**
 * Send an announcement email via Resend.
 * @param {string} to  Recipient email
 * @param {string} name  Recipient's name
 * @param {string} subject  Email subject
 * @param {string} message  Email message content (plain text or markdown format)
 */
export async function sendAnnouncementEmail(to, name, subject, message, buttonText, buttonLink) {
  const client = getClient();
  if (!client) {
    console.warn("[mailer] Skipping email — Resend client not configured");
    return;
  }

  const fromAddress = process.env.RESEND_FROM || "Smart Learning+ <onboarding@resend.dev>";

  const contentHtml = parseMarkdown(message);
  const frontendUrl = getFrontendUrl();

  const html = getEmailLayout(
    "Smart Learning+",
    "Announcement",
    contentHtml,
    name,
    buttonText || "Go to Dashboard",
    buttonLink || frontendUrl
  );

  const { data, error } = await client.emails.send({
    from: fromAddress,
    to,
    subject: subject || "Announcement from Smart Learning+",
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }

  console.log(`[mailer] Announcement email sent to ${to} — id: ${data?.id}`);
}
