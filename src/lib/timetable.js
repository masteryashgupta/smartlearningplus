import { q } from "../db.js";

// day_of_week: 0=Sun..6=Sat, matches JS Date#getDay()
export function todayInIST() {
  // Server may not be in IST — always compute "today" in Asia/Kolkata
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  return now;
}

export function dateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// All slots for a given weekday that apply to a user's batch, in order.
export async function getSlotsForDay(dayOfWeek, batch) {
  const { rows } = await q(
    `select ts.*, s.name as subject_name, s.code as subject_code, s.type as subject_type, s.color
     from timetable_slots ts
     join subjects s on s.id = ts.subject_id
     where ts.day_of_week = $1
       and ts.is_active = true
       and (ts.batch = 'ALL' or ts.batch = $2)
     order by ts.slot_number asc`,
    [dayOfWeek, batch]
  );
  return rows;
}

// Slots for a specific calendar date, with holiday info merged in.
export async function getSlotsForDate(date, batch) {
  const d = new Date(date + "T00:00:00");
  const dow = d.getDay();
  const slots = await getSlotsForDay(dow, batch);

  const { rows: holidayRows } = await q(
    `select slot_id, reason from holidays where date = $1`,
    [date]
  );
  const wholeDayHoliday = holidayRows.find((h) => h.slot_id === null);
  const cancelledSlotIds = new Set(
    holidayRows.filter((h) => h.slot_id !== null).map((h) => h.slot_id)
  );

  return slots.map((s) => ({
    ...s,
    is_holiday: !!wholeDayHoliday || cancelledSlotIds.has(s.id),
    holiday_reason:
      wholeDayHoliday?.reason ||
      holidayRows.find((h) => h.slot_id === s.id)?.reason ||
      null,
  }));
}

// Merge a user's marked attendance onto the day's slots.
export async function getUserDayView(userId, batch, date) {
  const slots = await getSlotsForDate(date, batch);
  if (slots.length === 0) return slots;

  const { rows: marks } = await q(
    `select slot_id, status, source, marked_at from attendance
     where user_id = $1 and date = $2`,
    [userId, date]
  );
  const markMap = new Map(marks.map((m) => [m.slot_id, m]));

  return slots.map((s) => ({
    ...s,
    attendance: markMap.get(s.id) || null,
  }));
}

// Per-subject and overall stats for a user across all recorded history.
export async function computeStats(userId) {
  const { rows } = await q(
    `select s.id as subject_id, s.name as subject_name, s.code, s.type, s.color,
            count(*) filter (where a.status = 'present') as present,
            count(*) filter (where a.status = 'absent') as absent,
            count(*) filter (where a.status in ('present','absent')) as total
     from attendance a
     join timetable_slots ts on ts.id = a.slot_id
     join subjects s on s.id = ts.subject_id
     where a.user_id = $1
     group by s.id, s.name, s.code, s.type, s.color
     order by s.name asc`,
    [userId]
  );

  const threshold = Number(process.env.ATTENDANCE_THRESHOLD || 75);

  const perSubject = rows.map((r) => {
    const present = Number(r.present);
    const total = Number(r.total);
    const pct = total > 0 ? (present / total) * 100 : 100;

    // How many more classes can be missed and stay >= threshold:
    // (present) / (total + skip) >= threshold/100  =>  skip <= present*100/threshold - total
    let canSkip = 0;
    if (total > 0) {
      canSkip = Math.max(0, Math.floor((present * 100) / threshold - total));
    }
    // How many consecutive presents needed to climb back to threshold:
    // (present+need) / (total+need) >= threshold/100
    let needToAttend = 0;
    if (total > 0 && pct < threshold) {
      const denom = 100 - threshold;
      if (denom <= 0) {
        needToAttend = 999; // impossible to reach 100% if any missed
      } else {
        needToAttend = Math.max(
          0,
          Math.ceil((threshold * total - 100 * present) / denom)
        );
      }
    }

    return {
      subject_id: r.subject_id,
      name: r.subject_name,
      code: r.code,
      type: r.type,
      color: r.color,
      present,
      absent: Number(r.absent),
      total,
      percentage: Math.round(pct * 10) / 10,
      safe: pct >= threshold,
      canSkip,
      needToAttend,
    };
  });

  const totalPresent = perSubject.reduce((a, s) => a + s.present, 0);
  const totalClasses = perSubject.reduce((a, s) => a + s.total, 0);
  const overallPct =
    totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 1000) / 10 : 100;

  return { perSubject, overall: { present: totalPresent, total: totalClasses, percentage: overallPct } };
}
