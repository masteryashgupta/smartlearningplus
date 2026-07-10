import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { computeStats } from "../lib/timetable.js";
import { signUrls } from "../lib/b2.js";

const router = Router();

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
  res.json(rows[0]);
});

router.delete("/holidays/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from holidays where id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ---- Users ----
router.get("/users", requireAuth("admin"), async (req, res) => {
  const { rows } = await q(
    `select u.id, u.name, u.email, u.batch, u.section, u.telegram_username, u.telegram_id,
            u.is_active, u.created_at,
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
  const { name, batch, section, is_active } = req.body;
  const { rows } = await q(
    `update users set name = coalesce($1,name), batch = coalesce($2,batch),
       section = coalesce($3,section), is_active = coalesce($4,is_active) where id = $5 returning *`,
    [name, batch, section, is_active, req.params.id]
  );
  res.json(rows[0]);
});

router.delete("/users/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from users where id = $1", [req.params.id]);
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
router.get("/whitelist", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q("select * from whitelisted_emails order by email asc");
    res.json(rows);
  } catch (err) {
    console.error("Fetch whitelist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/whitelist", requireAuth("admin"), async (req, res) => {
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
    res.json({ ok: true, email: email });
  } catch (err) {
    console.error("Add to whitelist error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/whitelist/:id", requireAuth("admin"), async (req, res) => {
  try {
    await q("delete from whitelisted_emails where id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete whitelist error:", err);
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
router.get("/materials/pending", requireAuth("admin"), async (req, res) => {
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
router.get("/materials/pending/count", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q("select count(*) from community_materials where status = 'pending'");
    res.json({ count: Number(rows[0].count) });
  } catch (err) {
    console.error("[materials-pending-count] Error:", err);
    res.status(500).json({ error: "Failed to fetch counts" });
  }
});

// Approve a contribution
router.post("/materials/:id/approve", requireAuth("admin"), async (req, res) => {
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
    res.json({ ok: true, message: "Material approved successfully", material: rows[0] });
  } catch (err) {
    console.error("[materials-approve] Error:", err);
    res.status(500).json({ error: "Database error during approval" });
  }
});

// Reject a contribution with reason
router.post("/materials/:id/reject", requireAuth("admin"), async (req, res) => {
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
    res.json({ ok: true, message: "Material rejected successfully", material: rows[0] });
  } catch (err) {
    console.error("[materials-reject] Error:", err);
    res.status(500).json({ error: "Database error during rejection" });
  }
});

// Fetch ALL approved materials (for admin management view)
router.get("/materials/approved", requireAuth("admin"), async (req, res) => {
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
router.post("/materials/:id/toggle-hidden", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q(
      `update community_materials
       set is_hidden = NOT is_hidden
       where id = $1 returning id, is_hidden`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Material not found" });
    res.json({ ok: true, is_hidden: rows[0].is_hidden });
  } catch (err) {
    console.error("[materials-toggle-hidden] Error:", err);
    res.status(500).json({ error: "Database error toggling hidden state" });
  }
});

// Permanently delete a material (any status)
router.delete("/materials/:id", requireAuth("admin"), async (req, res) => {
  try {
    const { rowCount } = await q(
      `delete from community_materials where id = $1`,
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: "Material not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("[materials-delete] Error:", err);
    res.status(500).json({ error: "Database error during delete" });
  }
});

export default router;
