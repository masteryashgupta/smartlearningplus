import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { q } from "../db.js";
import { signToken, requireAuth } from "../auth.js";
import { bot } from "../bot/bot.js";
import { sendResetEmail, sendVerificationEmail } from "../lib/mailer.js";

const router = Router();

// ---- Admin login (website only) ----
router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const { rows } = await q("select * from admins where email = $1", [email.toLowerCase()]);
  const admin = rows[0];
  if (!admin) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ role: "admin", id: admin.id, name: admin.name });
  res.json({ token, name: admin.name });
});

// ---- Student login via dashboard_token issued by the bot ----
// Flow: student runs /dashboard in Telegram -> bot sends a one-time link
// containing this token -> frontend calls this endpoint to exchange it
// for a normal JWT session.
router.post("/student/exchange", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token required" });

  const { rows } = await q("select * from users where dashboard_token = $1", [token]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: "Invalid or expired link. Send /dashboard to the bot again." });
  if (!user.is_active) {
    return res.status(403).json({ error: "Your account is deactivated. Please contact the administrator." });
  }

  // Auto-verify email on telegram login as they're authenticated via Telegram bot
  if (user.email_verified === false) {
    await q("update users set email_verified = true where id = $1", [user.id]);
  }

  const session = signToken({ role: "student", id: user.id, name: user.name, batch: user.batch, is_moderator: user.is_moderator });
  res.json({ token: session, user: { id: user.id, name: user.name, batch: user.batch, is_moderator: user.is_moderator } });
});

// ---- Student registration (website) ----
router.post("/student/register", async (req, res) => {
  const { name, email, password, batch } = req.body;
  if (!name || !email || !password || !batch) {
    return res.status(400).json({ error: "All fields (name, email, password, batch) are required" });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    
    // Check if email already registered as user
    const checkUser = await q("select * from users where email = $1", [cleanEmail]);
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    // Check if there is already a pending request
    const checkPending = await q("select * from registration_requests where email = $1 and status = 'pending'", [cleanEmail]);
    if (checkPending.rows.length > 0) {
      return res.status(400).json({ error: "You already have a pending registration request. Please wait for admin approval." });
    }

    const hash = await bcrypt.hash(password, 10);
    
    await q(
      `insert into registration_requests (name, email, password_hash, batch) values ($1, $2, $3, $4)`,
      [name.trim(), cleanEmail, hash, batch]
    );

    // Send Telegram notification to admin
    try {
      if (bot) {
        const msg = `🚨 *New Registration Request*\n\n*Name:* ${name.trim()}\n*Email:* ${cleanEmail}\n*Batch:* ${batch}\n\nPlease review this request in the Admin Panel.`;
        
        // 1. Send to ADMIN_TELEGRAM_ID from env
        const envAdminId = process.env.ADMIN_TELEGRAM_ID?.trim();
        const htmlMsg = `🚨 <b>New Registration Request</b>\n\n<b>Name:</b> ${name.trim()}\n<b>Email:</b> ${cleanEmail}\n<b>Batch:</b> ${batch}\n\nPlease review this request in the Admin Panel.`;
        if (envAdminId) {
          bot.sendMessage(envAdminId, htmlMsg, { parse_mode: "HTML" }).catch(err => {
            console.error(`Failed to send telegram message to env admin ${envAdminId}:`, err);
          });
        }

        // 2. Fallback or addition: send to any DB admins with telegram_id
        const adminRes = await q("select telegram_id from admins where telegram_id is not null");
        for (const admin of adminRes.rows) {
          if (admin.telegram_id && String(admin.telegram_id) !== String(envAdminId)) {
            bot.sendMessage(admin.telegram_id, htmlMsg, { parse_mode: "HTML" }).catch(err => {
              console.error(`Failed to send telegram message to admin ${admin.telegram_id}:`, err);
            });
          }
        }
      }
    } catch (err) {
      console.error("Failed to notify admins via telegram:", err);
    }

    res.status(201).json({ ok: true, message: "Registration request submitted! Please wait up to 24 hours for admin approval." });
  } catch (err) {
    console.error("Student registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Student login (website) ----
router.post("/student/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const { rows } = await q("select * from users where email = $1", [email.toLowerCase().trim()]);
    const user = rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: "Your account is deactivated. Please contact the administrator." });
    }
    if (user.email_verified === false) {
      return res.status(401).json({ error: "Please verify your email address. Check your inbox for the verification link." });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionToken = signToken({ role: "student", id: user.id, name: user.name, batch: user.batch, is_moderator: user.is_moderator });
    res.json({ token: sessionToken, user: { id: user.id, name: user.name, batch: user.batch, is_moderator: user.is_moderator } });
  } catch (err) {
    console.error("Student login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Student profile / connection details ----
router.get("/student/profile", requireAuth("student"), async (req, res) => {
  try {
    const { rows } = await q("select * from users where id = $1", [req.auth.id]);
    let user = rows[0];
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate token if not exists and they aren't linked yet
    if (!user.telegram_connect_token && !user.telegram_id) {
      const connectToken = crypto.randomBytes(16).toString("hex");
      const updated = await q(
        "update users set telegram_connect_token = $1 where id = $2 returning *",
        [connectToken, req.auth.id]
      );
      user = updated.rows[0];
    }

    let botUsername = "";
    if (bot) {
      try {
        const me = await bot.getMe();
        botUsername = me.username;
      } catch (e) {
        console.error("Error getting bot info:", e);
      }
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      batch: user.batch,
      section: user.section,
      telegram_id: user.telegram_id ? String(user.telegram_id) : null,
      telegram_username: user.telegram_username,
      telegram_connect_token: user.telegram_connect_token,
      bot_username: botUsername,
      is_moderator: user.is_moderator,
    });
  } catch (err) {
    console.error("Error fetching student profile:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Disconnect Telegram ----
router.post("/student/disconnect-telegram", requireAuth("student"), async (req, res) => {
  try {
    const connectToken = crypto.randomBytes(16).toString("hex");
    await q(
      "update users set telegram_id = null, telegram_username = null, telegram_connect_token = $1 where id = $2",
      [connectToken, req.auth.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error disconnecting Telegram:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Forgot password (student or admin) ----
router.post("/forgot-password", async (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!role || !["student", "admin"].includes(role))
    return res.status(400).json({ error: "Role must be 'student' or 'admin'" });

  // Always respond with success to prevent email enumeration
  const successMsg = { ok: true, message: "If that email is registered, a reset link has been sent." };

  try {
    const table = role === "admin" ? "admins" : "users";
    const { rows } = await q(`select * from ${table} where email = $1`, [email.toLowerCase().trim()]);
    const user = rows[0];

    if (!user) return res.json(successMsg); // silent — don't reveal if email exists

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await q(
      `update ${table} set reset_token = $1, reset_token_expires = $2 where id = $3`,
      [token, expires, user.id]
    );

    let frontendBase = process.env.FRONTEND_URL || "https://smartlearningplus.me";
    if (frontendBase.includes(",")) {
      const urls = frontendBase.split(",").map((u) => u.trim());
      const prodUrl = urls.find((u) => !u.includes("localhost"));
      frontendBase = prodUrl || urls[0];
    }
    const resetUrl = `${frontendBase}/index.html#/reset-password?token=${token}&role=${role}`;

    try {
      await sendResetEmail(user.email, resetUrl, user.name);
    } catch (mailErr) {
      console.error("[forgot-password] Email send failed:", mailErr.message);
      // Still return success; admin can check logs
    }

    res.json(successMsg);
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Reset password (student or admin) ----
router.post("/reset-password", async (req, res) => {
  const { token, newPassword, role } = req.body;
  if (!token || !newPassword || !role)
    return res.status(400).json({ error: "token, newPassword, and role are required" });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  if (!["student", "admin"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  try {
    const table = role === "admin" ? "admins" : "users";
    const { rows } = await q(
      `select * from ${table} where reset_token = $1 and reset_token_expires > now()`,
      [token]
    );
    const user = rows[0];

    if (!user) return res.status(400).json({ error: "Reset link is invalid or has expired. Please request a new one." });

    const hash = await bcrypt.hash(newPassword, 10);
    await q(
      `update ${table} set password_hash = $1, reset_token = null, reset_token_expires = null where id = $2`,
      [hash, user.id]
    );

    res.json({ ok: true, message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ---- Verify Email ----
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Token is required" });

  try {
    const { rows } = await q("select * from users where verification_token = $1", [token]);
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired verification token." });
    }

    await q("update users set email_verified = true, verification_token = null where id = $1", [user.id]);
    res.json({ ok: true, message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Utility used by the bot to (re)generate a fresh one-time token
export async function issueDashboardToken(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await q("update users set dashboard_token = $1 where id = $2", [token, userId]);
  return token;
}

export default router;
