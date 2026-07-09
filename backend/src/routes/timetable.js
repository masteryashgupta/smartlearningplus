import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { getSlotsForDay } from "../lib/timetable.js";

const router = Router();

// Full weekly timetable (used by dashboard "My Timetable" view)
router.get("/", requireAuth(), async (req, res) => {
  const batch = req.auth.role === "student" ? req.auth.batch : req.query.batch || "ALL";
  const days = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const week = {};
  for (const d of days) {
    if (batch === "ALL") {
      // admin view: show every slot regardless of batch restriction
      const { rows } = await q(
        `select ts.*, s.name as subject_name, s.code as subject_code, s.type as subject_type, s.color
         from timetable_slots ts join subjects s on s.id = ts.subject_id
         where ts.day_of_week = $1 and ts.is_active = true
         order by ts.slot_number asc`,
        [d]
      );
      week[d] = rows;
    } else {
      week[d] = await getSlotsForDay(d, batch);
    }
  }
  res.json({ week, subjects: (await q("select * from subjects order by name")).rows });
});

// ---- Admin: manage subjects ----
router.post("/subjects", requireAuth("admin"), async (req, res) => {
  const { code, name, type, color } = req.body;
  if (!name) return res.status(400).json({ error: "Subject name required" });
  const { rows } = await q(
    `insert into subjects (code, name, type, color) values ($1,$2,$3,$4) returning *`,
    [code || null, name, type || "theory", color || "#6D5EF5"]
  );
  res.json(rows[0]);
});

router.put("/subjects/:id", requireAuth("admin"), async (req, res) => {
  const { code, name, type, color } = req.body;
  const { rows } = await q(
    `update subjects set code=$1, name=$2, type=$3, color=$4 where id=$5 returning *`,
    [code, name, type, color, req.params.id]
  );
  res.json(rows[0]);
});

router.delete("/subjects/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from subjects where id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ---- Admin: manage timetable slots ----
router.post("/slots", requireAuth("admin"), async (req, res) => {
  const { day_of_week, slot_number, start_time, end_time, subject_id, batch, label } = req.body;
  const { rows } = await q(
    `insert into timetable_slots (day_of_week, slot_number, start_time, end_time, subject_id, batch, label)
     values ($1,$2,$3,$4,$5,$6,$7) returning *`,
    [day_of_week, slot_number, start_time, end_time, subject_id, batch || "ALL", label || null]
  );
  res.json(rows[0]);
});

router.put("/slots/:id", requireAuth("admin"), async (req, res) => {
  const { day_of_week, slot_number, start_time, end_time, subject_id, batch, label, is_active } = req.body;
  const { rows } = await q(
    `update timetable_slots set day_of_week=$1, slot_number=$2, start_time=$3, end_time=$4,
       subject_id=$5, batch=$6, label=$7, is_active=$8 where id=$9 returning *`,
    [day_of_week, slot_number, start_time, end_time, subject_id, batch, label, is_active ?? true, req.params.id]
  );
  res.json(rows[0]);
});

router.delete("/slots/:id", requireAuth("admin"), async (req, res) => {
  await q("delete from timetable_slots where id = $1", [req.params.id]);
  res.json({ ok: true });
});

export default router;
