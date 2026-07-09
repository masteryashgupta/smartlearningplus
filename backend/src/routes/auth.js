import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { q } from "../db.js";
import { signToken, requireAuth } from "../auth.js";
import { bot } from "../bot/bot.js";

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

  const session = signToken({ role: "student", id: user.id, name: user.name, batch: user.batch });
  res.json({ token: session, user: { id: user.id, name: user.name, batch: user.batch } });
});

// ---- Student registration (website) ----
router.post("/student/register", async (req, res) => {
  const { name, email, password, batch } = req.body;
  if (!name || !email || !password || !batch) {
    return res.status(400).json({ error: "All fields (name, email, password, batch) are required" });
  }
  if (!["G1", "G2"].includes(batch)) {
    return res.status(400).json({ error: "Invalid batch. Must be G1 or G2." });
  }

  try {
    // Check if email already exists
    const checkEmail = await q("select * from users where email = $1", [email.toLowerCase().trim()]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const connectToken = crypto.randomBytes(16).toString("hex");

    const { rows } = await q(
      `insert into users (name, email, password_hash, batch, telegram_connect_token)
       values ($1, $2, $3, $4, $5) returning *`,
      [name.trim(), email.toLowerCase().trim(), hash, batch, connectToken]
    );
    const user = rows[0];

    const sessionToken = signToken({ role: "student", id: user.id, name: user.name, batch: user.batch });
    res.status(201).json({ token: sessionToken, user: { id: user.id, name: user.name, batch: user.batch } });
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

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionToken = signToken({ role: "student", id: user.id, name: user.name, batch: user.batch });
    res.json({ token: sessionToken, user: { id: user.id, name: user.name, batch: user.batch } });
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

// Utility used by the bot to (re)generate a fresh one-time token
export async function issueDashboardToken(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await q("update users set dashboard_token = $1 where id = $2", [token, userId]);
  return token;
}

export default router;
