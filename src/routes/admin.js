import { Router } from "express";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";

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
    `select u.id, u.name, u.batch, u.section, u.telegram_username, u.telegram_id,
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
  const { name, batch, is_active } = req.body;
  const { rows } = await q(
    `update users set name = coalesce($1,name), batch = coalesce($2,batch),
       is_active = coalesce($3,is_active) where id = $4 returning *`,
    [name, batch, is_active, req.params.id]
  );
  res.json(rows[0]);
});

router.delete("/users/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from users where id = $1", [req.params.id]);
  res.json({ ok: true });
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
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
