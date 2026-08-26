import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { signToken } from "../auth.js";

const router = Router();

// ---- Public: Subscribe to General Email Notifications ----
router.post("/subscribe", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  const cleanEmail = email.trim().toLowerCase();

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { rows } = await q(
      "insert into notification_subscribers (email) values ($1) on conflict (email) do nothing returning *",
      [cleanEmail]
    );
    if (rows.length === 0) {
      return res.json({ ok: true, message: "You are already subscribed!" });
    }
    res.json({ ok: true, message: "Subscribed successfully!" });
  } catch (err) {
    console.error("[subscribe] Error subscribing email:", err);
    res.status(500).json({ error: "Failed to subscribe. Please try again." });
  }
});

// ---- Admin Login ----
router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  try {
    const { rows } = await q("select * from admins where lower(email) = $1", [email.toLowerCase().trim()]);
    const admin = rows[0];
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, admin.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken({ role: "admin", id: admin.id, name: admin.name });
    res.json({ token, name: admin.name });
  } catch (err) {
    console.error("[admin/login] Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
