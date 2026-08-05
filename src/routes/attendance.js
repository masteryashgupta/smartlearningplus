import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { getUserDayView, computeStats, dateStr, todayInIST } from "../lib/timetable.js";

const router = Router();

// Today's / any day's class list merged with this student's marks
router.get("/day/:date", requireAuth("student"), async (req, res) => {
  const view = await getUserDayView(req.auth.id, req.auth.batch, req.params.date);
  res.json(view);
});

// Mark or edit a single class — allowed for ANY date, any time (dashboard rule)
router.post("/mark", requireAuth("student"), async (req, res) => {
  const { slot_id, date, status, source } = req.body;
  if (!slot_id || !date || !status) return res.status(400).json({ error: "slot_id, date and status are required" });
  if (!["present", "absent", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const { rows } = await q(
    `insert into attendance (user_id, slot_id, date, status, source)
     values ($1,$2,$3,$4,$5)
     on conflict (user_id, slot_id, date)
     do update set status = $4, source = $5, updated_at = now()
     returning *`,
    [req.auth.id, slot_id, date, status, source || "dashboard"]
  );
  res.json(rows[0]);
});

// Mark the WHOLE day (all of today's applicable slots) as absent/present in one go
router.post("/mark-day", requireAuth("student"), async (req, res) => {
  const { date, status, source } = req.body;
  const view = await getUserDayView(req.auth.id, req.auth.batch, date);
  const markable = view.filter((s) => !s.is_holiday);

  const results = [];
  for (const slot of markable) {
    const { rows } = await q(
      `insert into attendance (user_id, slot_id, date, status, source)
       values ($1,$2,$3,$4,$5)
       on conflict (user_id, slot_id, date)
       do update set status = $4, source = $5, updated_at = now()
       returning *`,
      [req.auth.id, slot.id, date, status || "absent", source || "dashboard"]
    );
    results.push(rows[0]);
  }
  res.json({ marked: results.length, results });
});

// Attendance stats, per subject + overall, with the 75%-safety calculator
router.get("/stats", requireAuth("student"), async (req, res) => {
  res.json(await computeStats(req.auth.id));
});

// Calendar heatmap data: date -> {present, absent, total}
router.get("/heatmap", requireAuth("student"), async (req, res) => {
  const { rows } = await q(
    `select date,
        count(*) filter (where status='present') as present,
        count(*) filter (where status='absent') as absent,
        count(*) as total
     from attendance where user_id = $1 group by date order by date asc`,
    [req.auth.id]
  );
  res.json(rows);
});

// Simple friends leaderboard (opt-in by nature — all students see all students)
router.get("/leaderboard", requireAuth("student"), async (req, res) => {
  const { rows } = await q(
    `select u.id, u.name, u.batch,
        count(*) filter (where a.status='present') as present,
        count(*) filter (where a.status in ('present','absent')) as total,
        (select count(*) from community_materials where uploaded_by = u.id and status = 'approved') as approved_contributions
     from users u
     left join attendance a on a.user_id = u.id
     where u.is_active = true
     group by u.id, u.name, u.batch
     order by (case when count(*) filter (where a.status in ('present','absent')) = 0 then 0
                    else count(*) filter (where a.status='present')::float /
                         nullif(count(*) filter (where a.status in ('present','absent')),0) end) desc`
  );
  res.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      batch: r.batch,
      percentage: r.total > 0 ? Math.round((r.present / r.total) * 1000) / 10 : null,
      total: Number(r.total),
      contributions: Number(r.approved_contributions),
    }))
  );
});

// Get stats of any user (for leaderboard detailed view)
router.get("/users/:id/stats", requireAuth("student"), async (req, res) => {
  try {
    const stats = await computeStats(req.params.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to load user stats" });
  }
});

// ── User Extra Slots ─────────────────────────────────────────────────────────
// Students can add their own one-off classes/labs for a specific date.
// These are personal only — no other student sees them.

// Create a new extra slot
router.post("/extra", requireAuth("student"), async (req, res) => {
  const { date, subject_id, type, slot_label, batch } = req.body;
  if (!date || !subject_id || !type || !slot_label) {
    return res.status(400).json({ error: "date, subject_id, type and slot_label are required" });
  }
  if (!["class", "lab"].includes(type)) {
    return res.status(400).json({ error: "type must be 'class' or 'lab'" });
  }
  if (type === "lab" && !["G1", "G2"].includes(batch)) {
    return res.status(400).json({ error: "batch (G1 or G2) is required for labs" });
  }

  const { rows } = await q(
    `insert into user_extra_slots (user_id, date, subject_id, type, slot_label, batch, status)
     values ($1,$2,$3,$4,$5,$6,'present') returning *`,
    [req.auth.id, date, subject_id, type, slot_label, type === "lab" ? batch : null]
  );
  res.json(rows[0]);
});

// List extra slots for the logged-in user on a given date
router.get("/extra/:date", requireAuth("student"), async (req, res) => {
  const { rows } = await q(
    `select ues.*, s.name as subject_name, s.code as subject_code, s.type as subject_type, s.color
     from user_extra_slots ues
     left join subjects s on s.id = ues.subject_id
     where ues.user_id = $1 and ues.date = $2
     order by ues.created_at asc`,
    [req.auth.id, req.params.date]
  );
  res.json(rows);
});

// Update the status of an extra slot
router.patch("/extra/:id", requireAuth("student"), async (req, res) => {
  const { status } = req.body;
  if (!["present", "absent", "cancelled"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const { rows } = await q(
    `update user_extra_slots set status = $1 where id = $2 and user_id = $3 returning *`,
    [status, req.params.id, req.auth.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

// Delete an extra slot
router.delete("/extra/:id", requireAuth("student"), async (req, res) => {
  const { rowCount } = await q(
    `delete from user_extra_slots where id = $1 and user_id = $2`,
    [req.params.id, req.auth.id]
  );
  if (rowCount === 0) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
