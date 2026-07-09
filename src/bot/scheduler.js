import cron from "node-cron";
import { bot } from "./bot.js";
import { q } from "../db.js";
import { dateStr, todayInIST, getSlotsForDate } from "../lib/timetable.js";
import { sendWholeDayPrompt, sendTodayList } from "./handlers.js";

// Everything below runs on Asia/Kolkata regardless of server timezone.
const TZ = "Asia/Kolkata";

async function activeStudents() {
  const { rows } = await q("select * from users where telegram_id is not null and is_active = true");
  return rows;
}

// 8:30 AM daily — "bunking the whole day?" prompt
function scheduleMorningDigest() {
  cron.schedule(
    "30 8 * * *",
    async () => {
      if (!bot) return;
      const date = dateStr(todayInIST());
      const students = await activeStudents();
      for (const user of students) {
        const slots = await getSlotsForDate(date, user.batch);
        if (slots.length === 0 || slots.every((s) => s.is_holiday)) continue; // no classes / holiday, skip
        try {
          await sendWholeDayPrompt(user.telegram_id, user, date);
        } catch (err) {
          console.error(`morning digest failed for ${user.telegram_id}:`, err.message);
        }
      }
    },
    { timezone: TZ }
  );
}

// Every 10 minutes — check for classes that just ended and prompt attendance
function schedulePostClassReminders() {
  cron.schedule(
    "*/10 * * * *",
    async () => {
      if (!bot) return;
      const now = todayInIST();
      const date = dateStr(now);
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      const students = await activeStudents();
      for (const user of students) {
        const slots = await getSlotsForDate(date, user.batch);
        for (const slot of slots) {
          if (slot.is_holiday) continue;
          const [eh, em] = slot.end_time.split(":").map(Number);
          const endMinutes = eh * 60 + em;
          // class ended within the last 10-minute window
          if (endMinutes > nowMinutes || endMinutes <= nowMinutes - 10) continue;

          // already marked?
          const { rows: existing } = await q(
            "select 1 from attendance where user_id=$1 and slot_id=$2 and date=$3",
            [user.id, slot.id, date]
          );
          if (existing.length > 0) continue;

          const label = slot.label || slot.subject_name;
          try {
            await bot.sendMessage(user.telegram_id, `Class ended: *${label}*\nMark your attendance:`, {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [
                    { text: "✅ Present", callback_data: `m:${slot.id}:${date}:present` },
                    { text: "❌ Absent", callback_data: `m:${slot.id}:${date}:absent` },
                    { text: "🚫 Cancelled", callback_data: `m:${slot.id}:${date}:cancelled` },
                  ],
                ],
              },
            });
          } catch (err) {
            console.error(`post-class reminder failed for ${user.telegram_id}:`, err.message);
          }
        }
      }
    },
    { timezone: TZ }
  );
}

export function startScheduler() {
  if (!bot) {
    console.warn("⚠️  Scheduler not started — bot not configured.");
    return;
  }
  scheduleMorningDigest();
  schedulePostClassReminders();
  console.log("✅ Scheduler running (morning digest 8:30 IST, post-class checks every 10 min)");
}
