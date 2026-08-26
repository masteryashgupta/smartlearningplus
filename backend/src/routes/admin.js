import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { sendAnnouncementEmail } from "../lib/mailer.js";

const router = Router();

// Helper to log moderator/admin activities
async function logModeratorActivity(req, action, details) {
  try {
    const adminId = req.auth?.id || null;
    const adminName = req.auth?.name || "Admin";
    await q(
      "insert into moderator_logs (moderator_id, moderator_name, action, details) values ($1, $2, $3, $4)",
      [adminId, adminName, action, details]
    );
  } catch (err) {
    console.error("Failed to log activity:", err.message || err);
  }
}

// ---- Overview Stats ----
router.get("/overview", requireAuth("moderator"), async (req, res) => {
  try {
    const [
      subscribersRes,
      pastesRes,
      announcementRes
    ] = await Promise.all([
      q("select count(*) from notification_subscribers"),
      q("select count(*) from pastes"),
      q("select * from announcement_singleton where id = 'global'")
    ]);

    res.json({
      subscribersCount: Number(subscribersRes.rows[0]?.count || 0),
      pastesCount: Number(pastesRes.rows[0]?.count || 0),
      announcement: announcementRes.rows[0] || null
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Notification Subscribers Management ----
router.get("/subscribers", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from notification_subscribers order by created_at desc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch subscribers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subscribers/add", requireAuth("admin"), async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }
  const cleanEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const { rows } = await q(
      "insert into notification_subscribers (email) values ($1) on conflict (email) do nothing returning *",
      [cleanEmail]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: "Email is already subscribed" });
    }
    await logModeratorActivity(req, "subscriber_add", `Manually added "${cleanEmail}" to subscribers`);
    res.json({ ok: true, subscriber: rows[0] });
  } catch (err) {
    console.error("Add subscriber error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/subscribers/:id", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q("delete from notification_subscribers where id = $1 returning email", [req.params.id]);
    if (rows.length > 0) {
      await logModeratorActivity(req, "subscriber_remove", `Removed "${rows[0].email}" from subscribers`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete subscriber error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Broadcaster / Emailer ----
router.post("/broadcast", requireAuth("admin"), async (req, res) => {
  const { subject, message, subscriberIds, customEmails, buttonText, buttonLink } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message content is required" });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: "Email subject is required" });
  }

  try {
    let targetEmails = [];

    if (subscriberIds && Array.isArray(subscriberIds) && subscriberIds.length > 0) {
      const { rows } = await q(
        "select email from notification_subscribers where id = any($1)",
        [subscriberIds]
      );
      targetEmails = rows.map((r) => r.email);
    } else {
      // Default to all subscribers
      const { rows } = await q("select email from notification_subscribers");
      targetEmails = rows.map((r) => r.email);
    }

    // Include any additional custom comma-separated emails
    if (customEmails && typeof customEmails === "string") {
      const parsedCustom = customEmails
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
      targetEmails = [...new Set([...targetEmails, ...parsedCustom])];
    }

    if (targetEmails.length === 0) {
      return res.status(400).json({ error: "No recipients found to send broadcast" });
    }

    // Execute email dispatch in background
    const runEmailer = async () => {
      let sentCount = 0;
      let failCount = 0;

      for (const email of targetEmails) {
        try {
          await sendAnnouncementEmail(
            email,
            "Subscriber",
            subject.trim(),
            message.trim(),
            buttonText || "Visit Smart Learning+",
            buttonLink || process.env.FRONTEND_URL || "https://smartlearningplus.me"
          );
          sentCount++;
        } catch (err) {
          console.error(`[emailer] Failed sending to ${email}:`, err.message || err);
          failCount++;
        }
      }

      console.log(`[emailer] Broadcast finished: ${sentCount} sent, ${failCount} failed.`);
    };

    runEmailer();

    await logModeratorActivity(
      req,
      "broadcast_send",
      `Sent email broadcast "${subject.trim()}" to ${targetEmails.length} recipients`
    );

    res.json({ ok: true, sentCount: targetEmails.length });
  } catch (err) {
    console.error("Broadcast route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- QuickPaste Management ----
router.get("/pastes", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select id, slug, char_count, created_at, expires_at from pastes order by created_at desc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch pastes error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/pastes/:id", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q("delete from pastes where id = $1 returning slug", [req.params.id]);
    if (rows.length > 0) {
      await logModeratorActivity(req, "paste_delete", `Deleted paste "/${rows[0].slug}"`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete paste error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Moderator Audit Logs ----
router.get("/moderator-logs", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from moderator_logs order by created_at desc limit 200");
    res.json(rows);
  } catch (err) {
    console.error("Fetch moderator logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- System Health Check ----
router.get("/health", requireAuth("moderator"), async (req, res) => {
  const health = {
    database: { status: "offline", latencyMs: null },
    resendMailer: { status: "offline", type: "Resend API" },
    timestamp: new Date().toISOString()
  };

  // 1. PostgreSQL DB Check
  const start = Date.now();
  try {
    await q("select 1");
    health.database.status = "online";
    health.database.latencyMs = Date.now() - start;
  } catch (e) {
    health.database.status = "offline";
    health.database.error = e.message;
  }

  // 2. Resend Mailer Check
  if (process.env.RESEND_API_KEY) {
    health.resendMailer.status = "online";
  } else {
    health.resendMailer.status = "not configured";
  }

  res.json(health);
});

// ---- Security Settings: Change Admin Password ----
router.post("/settings/password", requireAuth("admin"), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  try {
    const { rows } = await q("select * from admins where id = $1", [req.auth.id]);
    const admin = rows[0];
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const ok = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Incorrect current password" });

    const hash = await bcrypt.hash(newPassword, 10);
    await q("update admins set password_hash = $1 where id = $2", [hash, req.auth.id]);

    await logModeratorActivity(req, "password_change", "Admin changed security password");
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
