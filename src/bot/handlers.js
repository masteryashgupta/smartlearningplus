import { bot } from "./bot.js";
import { q } from "../db.js";
import { getUserDayView, dateStr, todayInIST, computeStats } from "../lib/timetable.js";
import crypto from "crypto";

// tiny in-memory state machine for the /start registration flow
const pendingRegistration = new Map(); // telegram_id -> { step, name }

const HELP_TEXT = `*Attendance Bot — Guide*

I track your daily attendance for every class & lab in your timetable.

*How marking works*
• Every morning at 8:30 I'll ask if you want to mark the *whole day* absent (bunking) — one tap and you're done.
• After each class/lab ends, I'll ping you to mark that one class Present / Absent / Cancelled.
• Changed your mind? Fix any day's attendance anytime from the web dashboard.

*Commands*
/today – see today's classes & mark them
/status – your attendance % per subject
/week – this week's attendance summary
/dashboard – get your personal web dashboard link
/help – show this guide again

Just tap the buttons on my messages — no typing needed for marking attendance 🙂`;

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [["/today", "/status"], ["/week", "/dashboard"], ["/help"]],
      resize_keyboard: true,
    },
  };
}

async function getUser(telegramId) {
  const { rows } = await q("select * from users where telegram_id = $1", [telegramId]);
  return rows[0] || null;
}

async function issueDashboardLink(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await q("update users set dashboard_token = $1 where id = $2", [token, userId]);
  let base = process.env.FRONTEND_URL || "https://smartlearningplus.me";
  if (base.includes(",")) {
    const urls = base.split(",").map((u) => u.trim());
    const prodUrl = urls.find((u) => !u.includes("localhost"));
    base = prodUrl || urls[0];
  }
  return `${base}/index.html#/?token=${token}`;
}

function statusEmoji(s) {
  return s === "present" ? "✅" : s === "absent" ? "❌" : s === "cancelled" ? "🚫" : "🏖️";
}

function dayMarkKeyboard(slot, date) {
  const base = `m:${slot.id}:${date}`;
  return {
    inline_keyboard: [
      [
        { text: "✅ Present", callback_data: `${base}:present` },
        { text: "❌ Absent", callback_data: `${base}:absent` },
        { text: "🚫 Cancelled", callback_data: `${base}:cancelled` },
      ],
    ],
  };
}

async function sendTodayList(chatId, user) {
  const date = dateStr(todayInIST());
  const view = await getUserDayView(user.id, user.batch, date);
  if (view.length === 0) {
    return bot.sendMessage(chatId, "No classes scheduled today 🎉", mainKeyboard());
  }

  await bot.sendMessage(chatId, `*Today's classes (${date})*`, { parse_mode: "Markdown" });
  for (const slot of view) {
    const label = slot.label || slot.subject_name;
    const time = `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`;
    if (slot.is_holiday) {
      await bot.sendMessage(chatId, `🏖️ ${time}  ${label}  — cancelled/holiday${slot.holiday_reason ? ` (${slot.holiday_reason})` : ""}`);
      continue;
    }
    const marked = slot.attendance;
    const text = `${time}  *${label}*${marked ? `\n${statusEmoji(marked.status)} marked ${marked.status}` : "\n_not marked yet_"}`;
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: dayMarkKeyboard(slot, date) });
  }
}

async function sendWholeDayPrompt(chatId, user, date) {
  await bot.sendMessage(
    chatId,
    `Good morning ☀️ It's ${date}. Bunking today entirely?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "🚫 Mark WHOLE DAY absent", callback_data: `d:${date}:absent` },
          ],
          [{ text: "📋 Show me today's classes instead", callback_data: `showday:${date}` }],
        ],
      },
    }
  );
}

async function sendStatus(chatId, user) {
  const stats = await computeStats(user.id);
  if (stats.perSubject.length === 0) {
    return bot.sendMessage(chatId, "No attendance marked yet. Use /today to get started!", mainKeyboard());
  }
  let msg = `*Your attendance* (threshold ${process.env.ATTENDANCE_THRESHOLD || 75}%)\n\n`;
  for (const s of stats.perSubject) {
    const flag = s.safe ? "🟢" : "🔴";
    msg += `${flag} *${s.name}*: ${s.percentage}% (${s.present}/${s.total})\n`;
    msg += s.safe
      ? `   You can skip ${s.canSkip} more and stay safe\n`
      : `   Attend next ${s.needToAttend} to get back above threshold\n`;
  }
  msg += `\n*Overall*: ${stats.overall.percentage}% (${stats.overall.present}/${stats.overall.total})`;
  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown", ...mainKeyboard() });
}

async function sendWeek(chatId, user) {
  const { rows } = await q(
    `select a.date, count(*) filter (where status='present') as present,
            count(*) filter (where status='absent') as absent
     from attendance a
     where a.user_id = $1 and a.date >= (current_date - interval '7 days')
     group by a.date order by a.date asc`,
    [user.id]
  );
  if (rows.length === 0) return bot.sendMessage(chatId, "No attendance marked in the last 7 days.");
  let msg = "*Last 7 days*\n\n";
  for (const r of rows) {
    msg += `${r.date.toISOString ? r.date.toISOString().slice(0, 10) : r.date}  ✅${r.present}  ❌${r.absent}\n`;
  }
  await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
}

export function registerHandlers() {
  if (!bot) return;

  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const parts = text.split(" ");

    if (parts.length > 1) {
      const connectToken = parts[1];
      try {
        const { rows } = await q("select * from users where telegram_connect_token = $1", [connectToken]);
        const user = rows[0];

        if (user) {
          const existingUserWithTg = await getUser(chatId);
          if (existingUserWithTg) {
            await q("update users set telegram_id = null, telegram_username = null where id = $1", [existingUserWithTg.id]);
          }

          await q(
            "update users set telegram_id = $1, telegram_username = $2, telegram_connect_token = null where id = $3",
            [chatId, msg.chat.username || null, user.id]
          );

          await bot.sendMessage(
            chatId,
            `Successfully connected! Welcome, ${user.name} (Batch ${user.batch}).\n\nI will now notify you here and track your attendance.`,
            mainKeyboard()
          );
          return;
        } else {
          await bot.sendMessage(
            chatId,
            "This connection link is invalid or has already been used. Please get a new one from your website dashboard."
          );
          return;
        }
      } catch (err) {
        console.error("Error linking telegram account:", err);
        await bot.sendMessage(chatId, "Something went wrong while connecting your account. Please try again.");
        return;
      }
    }

    const existing = await getUser(chatId);
    if (existing) {
      return bot.sendMessage(chatId, `Welcome back, ${existing.name}! 👋`, mainKeyboard());
    }
    await bot.sendMessage(
      chatId,
      "Welcome! To track your attendance, please register on our website first:\nhttps://smartlearningplus.me\n\nOnce registered, you can link your Telegram account directly from your dashboard! 🤖"
    );
  });

  bot.onText(/^\/help/, (msg) => bot.sendMessage(msg.chat.id, HELP_TEXT, { parse_mode: "Markdown", ...mainKeyboard() }));

  bot.onText(/^\/today/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, "Please /start first to register.");
    await sendTodayList(msg.chat.id, user);
  });

  bot.onText(/^\/status/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, "Please /start first to register.");
    await sendStatus(msg.chat.id, user);
  });

  bot.onText(/^\/week/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, "Please /start first to register.");
    await sendWeek(msg.chat.id, user);
  });

  bot.onText(/^\/dashboard/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, "Please /start first to register.");
    const link = await issueDashboardLink(user.id);
    await bot.sendMessage(msg.chat.id, `Your personal dashboard (link expires when you request a new one):\n${link}`);
  });

  // Fallback: any other text
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (text.startsWith("/")) return; // handled above

    // registration flow
    const reg = pendingRegistration.get(chatId);
    if (reg) {
      if (reg.step === "name") {
        reg.name = text;
        reg.step = "batch";
        pendingRegistration.set(chatId, reg);
        return bot.sendMessage(chatId, `Nice to meet you, ${text}! Which lab batch are you in?`, {
          reply_markup: { inline_keyboard: [[{ text: "G1", callback_data: `reg:G1` }, { text: "G2", callback_data: `reg:G2` }]] },
        });
      }
      return; // waiting on batch button
    }

    // not registered and typed something random
    const user = await getUser(chatId);
    if (!user) {
      return bot.sendMessage(chatId, "Hey! Send /start to register first.");
    }

    // Registered user typing free text — show the guide + quick menu
    await bot.sendMessage(chatId, "I respond best to buttons and commands. Here's what I can do:", mainKeyboard());
    await bot.sendMessage(chatId, HELP_TEXT, { parse_mode: "Markdown" });
  });

  bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    try {
      if (data.startsWith("reg:")) {
        const batch = data.split(":")[1];
        const reg = pendingRegistration.get(chatId);
        if (!reg) return bot.answerCallbackQuery(query.id, { text: "Session expired, send /start again." });
        await q(
          `insert into users (telegram_id, telegram_username, name, batch) values ($1,$2,$3,$4)
           on conflict (telegram_id) do update set name=$3, batch=$4`,
          [chatId, query.from.username || null, reg.name, batch]
        );
        pendingRegistration.delete(chatId);
        await bot.answerCallbackQuery(query.id, { text: "You're all set!" });
        await bot.sendMessage(chatId, `All set, ${reg.name}! You're in batch ${batch}.\n\nI'll remind you every morning and after each class. Try /today now.`, mainKeyboard());
        return;
      }

      if (data.startsWith("m:")) {
        const [, slotId, date, status] = data.split(":");
        const user = await getUser(chatId);
        if (!user) return bot.answerCallbackQuery(query.id, { text: "Please /start first." });
        await q(
          `insert into attendance (user_id, slot_id, date, status, source) values ($1,$2,$3,$4,'bot')
           on conflict (user_id, slot_id, date) do update set status=$4, source='bot', updated_at=now()`,
          [user.id, slotId, date, status]
        );
        await bot.answerCallbackQuery(query.id, { text: `Marked ${status} ✔️` });
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [[{ text: `${statusEmoji(status)} Marked ${status}`, callback_data: "noop" }]] },
          { chat_id: chatId, message_id: query.message.message_id }
        );
        return;
      }

      if (data.startsWith("d:")) {
        const [, date, status] = data.split(":");
        const user = await getUser(chatId);
        if (!user) return bot.answerCallbackQuery(query.id, { text: "Please /start first." });
        const view = await getUserDayView(user.id, user.batch, date);
        const markable = view.filter((s) => !s.is_holiday);
        for (const slot of markable) {
          await q(
            `insert into attendance (user_id, slot_id, date, status, source) values ($1,$2,$3,$4,'bot')
             on conflict (user_id, slot_id, date) do update set status=$4, source='bot', updated_at=now()`,
            [user.id, slot.id, date, status]
          );
        }
        await bot.answerCallbackQuery(query.id, { text: `Whole day marked ${status}` });
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id });
        await bot.sendMessage(chatId, `Marked all ${markable.length} classes as ${status} for ${date}. Have a good day! 🫡`);
        return;
      }

      if (data.startsWith("showday:")) {
        const user = await getUser(chatId);
        if (!user) return bot.answerCallbackQuery(query.id, { text: "Please /start first." });
        await bot.answerCallbackQuery(query.id);
        await sendTodayList(chatId, user);
        return;
      }

      await bot.answerCallbackQuery(query.id);
    } catch (err) {
      console.error("callback_query error:", err);
      await bot.answerCallbackQuery(query.id, { text: "Something went wrong, try again." });
    }
  });
}

export { sendWholeDayPrompt, sendTodayList };
