import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { computeStats } from "../lib/timetable.js";
import { signUrls, checkB2Health } from "../lib/b2.js";
import { getBotStatus, bot } from "../bot/bot.js";
import crypto from "crypto";
import { sendVerificationEmail, sendRejectionEmail, sendAnnouncementEmail } from "../lib/mailer.js";

const router = Router();

export async function logModeratorActivity(req, action, details) {
  const actorName = req.auth ? (req.auth.name || (req.auth.role === "admin" ? "Admin" : "Moderator")) : "System";
  
  // Log to database only if it's a student moderator
  if (req.auth && req.auth.role === "student") {
    try {
      await q(
        "insert into moderator_logs (moderator_id, moderator_name, action, details) values ($1, $2, $3, $4)",
        [req.auth.id, actorName, action, details]
      );
    } catch (err) {
      console.error("Failed to log moderator activity:", err);
    }
  }

  // Always notify via Telegram
  try {
    const envAdminId = process.env.ADMIN_TELEGRAM_ID?.trim();
    if (envAdminId && bot) {
      const htmlMsg = `🛡️ <b>Platform Activity</b>\n\n<b>By:</b> ${actorName}\n<b>Action:</b> ${action}\n<b>Details:</b> ${details}`;
      bot.sendMessage(envAdminId, htmlMsg, { parse_mode: "HTML" }).catch(err => {
        console.error(`Failed to broadcast admin activity to env admin ${envAdminId}:`, err);
      });
    }
  } catch (err) {
    console.error("Telegram notification error:", err);
  }
}

// ---- Holidays ----
// slot_id = null -> whole day off for everyone
router.get("/holidays", requireAuth("admin"), async (req, res) => {
  const { rows } = await q(
    `select h.*, ts.label, s.name as subject_name from holidays h
     left join timetable_slots ts on ts.id = h.slot_id
     left join subjects s on s.id = ts.subject_id
     order by h.date desc`
  );
  res.json(rows);
});

router.post("/holidays", requireAuth("admin"), async (req, res) => {
  const { date, slot_id, reason } = req.body;
  if (!date) return res.status(400).json({ error: "date is required" });
  const { rows } = await q(
    `insert into holidays (date, slot_id, reason, created_by) values ($1,$2,$3,$4)
     on conflict (date, slot_id) do update set reason = $3 returning *`,
    [date, slot_id || null, reason || null, req.auth.id]
  );
  await logModeratorActivity(req, "holiday_add", `Added/updated holiday on ${date}`);
  res.json(rows[0]);
});

router.delete("/holidays/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from holidays where id = $1", [req.params.id]);
  await logModeratorActivity(req, "holiday_remove", `Deleted holiday ${req.params.id}`);
  res.json({ ok: true });
});

// ---- Users ----
router.get("/users", requireAuth("admin"), async (req, res) => {
  const { rows } = await q(
    `select u.id, u.name, u.email, u.batch, u.section, u.telegram_username, u.telegram_id,
            u.is_active, u.is_moderator, u.created_at,
            count(*) filter (where a.status='present') as present,
            count(*) filter (where a.status in ('present','absent')) as total
     from users u
     left join attendance a on a.user_id = u.id
     group by u.id order by u.created_at desc`
  );
  res.json(
    rows.map((r) => ({
      ...r,
      percentage: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : null,
    }))
  );
});

router.put("/users/:id", requireAuth("admin"), async (req, res) => {
  const { name, batch, section, is_active, is_moderator } = req.body;
  const { rows } = await q(
    `update users set name = coalesce($1,name), batch = coalesce($2,batch),
       section = coalesce($3,section), is_active = coalesce($4,is_active),
       is_moderator = coalesce($5,is_moderator) where id = $6 returning *`,
    [name, batch, section, is_active, is_moderator, req.params.id]
  );
  await logModeratorActivity(req, "user_edit", `Edited user profile: ${rows[0]?.email || req.params.id}`);
  res.json(rows[0]);
});

router.delete("/users/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from users where id = $1", [req.params.id]);
  await logModeratorActivity(req, "user_delete", `Deleted user ${req.params.id}`);
  res.json({ ok: true });
});

// ---- User Stats ----
router.get("/users/:id/stats", requireAuth("admin"), async (req, res) => {
  try {
    const stats = await computeStats(req.params.id);
    res.json(stats);
  } catch (err) {
    console.error("Error fetching user stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Whitelist ----
router.get("/whitelist", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from whitelisted_emails order by email asc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch whitelist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/whitelist", requireAuth("moderator"), async (req, res) => {
  let { email } = req.body;
  if (!email) return res.status(400).json({ error: "email is required" });
  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }
  try {
    const { rows } = await q(
      "insert into whitelisted_emails (email) values ($1) on conflict (email) do nothing returning *",
      [email]
    );
    if (rows.length > 0) {
      await logModeratorActivity(req, "whitelist_add", `Added "${email}" to the whitelist`);
    }
    res.json({ ok: true, email: email });
  } catch (err) {
    console.error("Add to whitelist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/whitelist/:id", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("delete from whitelisted_emails where id = $1 returning email", [req.params.id]);
    if (rows.length > 0) {
      await logModeratorActivity(req, "whitelist_remove", `Removed "${rows[0].email}" from the whitelist`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete whitelist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Subscribers ----
router.get("/subscribers", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from notification_subscribers order by created_at desc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch subscribers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/subscribers/:id", requireAuth("moderator"), async (req, res) => {
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

// ---- Registration Requests ----
router.get("/registrations", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from registration_requests where status = 'pending' order by created_at desc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch registrations error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/registrations/:id/approve", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select * from registration_requests where id = $1", [req.params.id]);
    const reqData = rows[0];
    if (!reqData) return res.status(404).json({ error: "Request not found" });
    if (reqData.status !== 'pending') return res.status(400).json({ error: "Request already processed" });

    // 1. Add to whitelist
    await q("insert into whitelisted_emails (email) values ($1) on conflict (email) do nothing", [reqData.email]);

    // 2. Insert into users
    const connectToken = crypto.randomBytes(16).toString("hex");
    const verifyToken = crypto.randomBytes(32).toString("hex");

    const userRes = await q(
      `insert into users (name, email, password_hash, batch, telegram_connect_token, email_verified, verification_token)
       values ($1, $2, $3, $4, $5, false, $6) returning *`,
      [reqData.name, reqData.email, reqData.password_hash, reqData.batch, connectToken, verifyToken]
    );
    const user = userRes.rows[0];

    // 3. Mark request as approved
    await q("update registration_requests set status = 'approved' where id = $1", [reqData.id]);

    // 4. Send verification email
    let frontendBase = process.env.FRONTEND_URL || "https://smartlearningplus.me";
    if (frontendBase.includes(",")) {
      const urls = frontendBase.split(",").map((u) => u.trim());
      const prodUrl = urls.find((u) => !u.includes("localhost"));
      frontendBase = prodUrl || urls[0];
    }
    const verifyUrl = `${frontendBase}/index.html#/verify-email?token=${verifyToken}`;
    try {
      await sendVerificationEmail(user.email, verifyUrl, user.name);
    } catch (mailErr) {
      console.error("[approve] Verification email send failed:", mailErr.message);
    }

    await logModeratorActivity(req, "registration_approve", `Approved registration for "${user.email}"`);
    res.json({ ok: true, message: "Request approved and user created" });
  } catch (err) {
    console.error("Approve registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/registrations/:id/reject", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("update registration_requests set status = 'rejected' where id = $1 returning *", [req.params.id]);
    if (rows.length > 0) {
      const user = rows[0];
      await logModeratorActivity(req, "registration_reject", `Rejected registration for "${user.email}"`);
      
      try {
        await sendRejectionEmail(user.email, user.name);
      } catch (mailErr) {
        console.error("[reject] Rejection email send failed:", mailErr.message);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Reject registration error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Overview for admin dashboard ----
router.get("/overview", requireAuth("admin"), async (req, res) => {
  const usersCount = await q("select count(*) from users where is_active = true");
  const todayMarks = await q(
    `select status, count(*) from attendance where date = current_date group by status`
  );
  const lowAttendance = await q(
    `select u.name, u.batch,
        count(*) filter (where a.status='present') as present,
        count(*) filter (where a.status in ('present','absent')) as total
     from users u join attendance a on a.user_id = u.id
     group by u.id, u.name, u.batch
     having count(*) filter (where a.status in ('present','absent')) > 0
     order by (count(*) filter (where a.status='present')::float /
               nullif(count(*) filter (where a.status in ('present','absent')),0)) asc
     limit 5`
  );
  res.json({
    activeUsers: Number(usersCount.rows[0].count),
    todayMarks: todayMarks.rows,
    lowAttendance: lowAttendance.rows.map((r) => ({
      ...r,
      percentage: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : 0,
    })),
  });
});

// ---- Change Admin Password ----
router.post("/change-password", requireAuth("admin"), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "New password must be at least 8 characters" });

  try {
    const { rows } = await q("select * from admins where id = $1", [req.auth.id]);
    const admin = rows[0];
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const ok = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await q("update admins set password_hash = $1 where id = $2", [hash, req.auth.id]);
    res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
  }
});

// Fetch pending study materials list
router.get("/materials/pending", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q(
      `select cm.*, s.name as subject_name, s.code as subject_code
       from community_materials cm
       join subjects s on s.id = cm.subject_id
       where cm.status = 'pending'
       order by cm.created_at asc`
    );
    res.json(await signUrls(rows));
  } catch (err) {
    console.error("[materials-pending] Error:", err);
    res.status(500).json({ error: "Failed to load pending materials" });
  }
});

// Fetch pending materials counter badge
router.get("/materials/pending/count", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q("select count(*) from community_materials where status = 'pending'");
    res.json({ count: Number(rows[0].count) });
  } catch (err) {
    console.error("[materials-pending-count] Error:", err);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Approve a contribution
router.post("/materials/:id/approve", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q(
      `update community_materials 
       set status = 'approved', reviewed_by = $1, reviewed_at = now()
       where id = $2 returning *`,
      [req.auth.id, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }
    await logModeratorActivity(req, "approve_material", `Approved material "${rows[0].title}"`);
    res.json({ ok: true, message: "Material approved successfully", material: rows[0] });
  } catch (err) {
    console.error("[materials-approve] Error:", err);
    res.status(500).json({ error: "Database error during approval" });
  }
});

// Reject a contribution with reason
router.post("/materials/:id/reject", requireAuth("moderator"), async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: "Rejection reason is required" });
  }

  try {
    const { rows } = await q(
      `update community_materials 
       set status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now()
       where id = $3 returning *`,
      [reason.trim(), req.auth.id, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Material not found" });
    }
    await logModeratorActivity(req, "reject_material", `Rejected material "${rows[0].title}". Reason: "${reason.trim()}"`);
    res.json({ ok: true, message: "Material rejected successfully", material: rows[0] });
  } catch (err) {
    console.error("[materials-reject] Error:", err);
    res.status(500).json({ error: "Database error during rejection" });
  }
});

// Fetch ALL approved materials (for admin management view)
router.get("/materials/approved", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q(
      `select cm.*, s.name as subject_name, s.code as subject_code
       from community_materials cm
       join subjects s on s.id = cm.subject_id
       where cm.status = 'approved'
       order by cm.created_at desc`
    );
    res.json(await signUrls(rows));
  } catch (err) {
    console.error("[materials-approved] Error:", err);
    res.status(500).json({ error: "Failed to load approved materials" });
  }
});

// Toggle hide/unhide an approved material
router.post("/materials/:id/toggle-hidden", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q(
      `update community_materials
       set is_hidden = NOT is_hidden
       where id = $1 returning id, is_hidden`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Material not found" });
    const verb = rows[0].is_hidden ? "Hid" : "Unhid";
    await logModeratorActivity(req, "toggle_hidden_material", `${verb} material "${rows[0].title}"`);
    res.json({ ok: true, is_hidden: rows[0].is_hidden });
  } catch (err) {
    console.error("[materials-toggle-hidden] Error:", err);
    res.status(500).json({ error: "Database error toggling hidden state" });
  }
});

// Permanently delete a material (any status)
router.delete("/materials/:id", requireAuth("moderator"), async (req, res) => {
  try {
    const { rows } = await q(
      `delete from community_materials where id = $1 returning title`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Material not found" });
    await logModeratorActivity(req, "delete_material", `Deleted material "${rows[0].title}"`);
    res.json({ ok: true });
  } catch (err) {
    console.error("[materials-delete] Error:", err);
    res.status(500).json({ error: "Database error during delete" });
  }
});

// System health checks (database, Telegram bot, Backblaze B2, Resend mailer)
router.get("/health", requireAuth("admin"), async (req, res) => {
  const health = {
    database: { status: "offline", latency: null, error: null },
    telegram: { status: "offline", type: null },
    b2: { status: "offline", error: null },
    resend: { status: "offline", error: null },
    server: { status: "online", uptime: process.uptime(), memory: process.memoryUsage() }
  };

  // 1. Database Check
  try {
    const start = Date.now();
    await q("SELECT 1");
    health.database.status = "online";
    health.database.latency = `${Date.now() - start}ms`;
  } catch (err) {
    health.database.error = err.message || "Failed to query db";
  }

  // 2. Telegram Bot Check
  try {
    const status = getBotStatus();
    health.telegram.status = (status.startsWith("Active") || status.startsWith("Polling") || status.startsWith("Webhook")) ? "online" : "offline";
    health.telegram.type = status;
  } catch (err) {
    health.telegram.type = "Error";
  }

  // 3. Backblaze B2 Check
  try {
    const b2res = await checkB2Health();
    health.b2.status = b2res.status;
    if (b2res.error) health.b2.error = b2res.error;
  } catch (err) {
    health.b2.error = err.message || "Error running B2 health";
  }

  // 4. Resend Mailer Check
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    health.resend.status = "offline";
    health.resend.error = "RESEND_API_KEY not configured";
  } else {
    health.resend.status = "online";
    health.resend.error = null;
  }

  res.json(health);
});

// ---- Moderator Logs ----
router.get("/moderator-logs", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q(
      `select ml.*, u.email as moderator_email
       from moderator_logs ml
       left join users u on u.id = ml.moderator_id
       order by ml.created_at desc`
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch moderator logs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatTelegramMessage(name, message) {
  // Escape HTML tags to prevent broken XML formatting errors on Telegram API
  let escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold **text** -> <b>text</b>
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  // Italic *text* or _text_ -> <i>text</i>
  escaped = escaped.replace(/\*(.*?)\*/g, "<i>$1</i>");
  escaped = escaped.replace(/_(.*?)_/g, "<i>$1</i>");

  // Links [text](url) -> <a href="$2">$1</a>
  escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');

  // Bullet points: lines starting with "- " or "* " -> "• "
  const lines = escaped.split(/\r?\n/);
  const formattedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return `• ${trimmed.substring(2)}`;
    }
    return line;
  });

  const body = formattedLines.join("\n");

  return `📢 <b>Smart Learning+ Announcement</b>

Hi <b>${name}</b>,

${body}`;
}

// ---- Broadcast Announcement to All Users ----
router.post("/broadcast", requireAuth("admin"), async (req, res) => {
  const { subject, message, channels, userIds, subscriberIds, buttonText, buttonLink } = req.body;
  if (!message) return res.status(400).json({ error: "Message content is required" });
  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    return res.status(400).json({ error: "At least one channel (email or telegram) is required" });
  }

  try {
    let users = [];
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const { rows } = await q(
        "select id, name, email, telegram_id from users where is_active = true and id = any($1)",
        [userIds]
      );
      users = rows;
    } else if (!subscriberIds || subscriberIds.length === 0) {
      // If neither is explicitly provided, default to all active users
      const { rows } = await q("select id, name, email, telegram_id from users where is_active = true");
      users = rows;
    }

    let subscribers = [];
    if (channels.includes("email") && subscriberIds && Array.isArray(subscriberIds) && subscriberIds.length > 0) {
      const { rows } = await q(
        "select id, email from notification_subscribers where id = any($1)",
        [subscriberIds]
      );
      subscribers = rows;
    }

    const totalRecipients = users.length + subscribers.length;
    
    // Run broadcast in background
    const runBroadcast = async () => {
      let emailSuccessCount = 0;
      let tgSuccessCount = 0;
 
      for (const user of users) {
        // Send email
        if (channels.includes("email") && user.email) {
          try {
            await sendAnnouncementEmail(user.email, user.name, subject, message, buttonText, buttonLink);
            emailSuccessCount++;
          } catch (err) {
            console.error(`[broadcast] Failed email to ${user.email}:`, err.message || err);
          }
        }

        // Send Telegram
        if (channels.includes("telegram") && user.telegram_id && bot) {
          try {
            const formattedTgMsg = formatTelegramMessage(user.name, message);
            
            let telegramLink = buttonLink || process.env.FRONTEND_URL || "https://smartlearningplus.me";
            if (!buttonLink && telegramLink.includes(",")) {
              const urls = telegramLink.split(",").map((u) => u.trim());
              const prodUrl = urls.find((u) => !u.includes("localhost"));
              telegramLink = prodUrl || urls[0];
            }

            const inlineKeyboard = {
              inline_keyboard: [
                [
                  {
                    text: buttonText || "Go to Dashboard",
                    url: telegramLink
                  }
                ]
              ]
            };

            await bot.sendMessage(user.telegram_id, formattedTgMsg, {
              parse_mode: "HTML",
              reply_markup: inlineKeyboard
            });
            tgSuccessCount++;
          } catch (err) {
            console.error(`[broadcast] Failed Telegram to ${user.telegram_id}:`, err.message || err);
          }
        }
      }

      // Send to subscribers
      for (const sub of subscribers) {
        if (channels.includes("email") && sub.email) {
          try {
            await sendAnnouncementEmail(sub.email, "Subscriber", subject, message, buttonText, buttonLink);
            emailSuccessCount++;
          } catch (err) {
            console.error(`[broadcast] Failed email to subscriber ${sub.email}:`, err.message || err);
          }
        }
      }
      
      console.log(`[broadcast] Completed. Emails sent: ${emailSuccessCount}, Telegrams sent: ${tgSuccessCount}`);
    };

    runBroadcast();
    await logModeratorActivity(
      req, 
      "broadcast_send", 
      `Sent broadcast announcement to ${totalRecipients} recipients (Users: ${users.length}, Subscribers: ${subscribers.length}) via [${channels.join(", ")}]`
    );

    res.json({ ok: true, sentCount: totalRecipients });
  } catch (err) {
    console.error("Broadcast route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
