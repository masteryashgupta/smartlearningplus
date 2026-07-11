import { bot } from "./bot.js";
import { q } from "../db.js";
import { getUserDayView, dateStr, todayInIST, computeStats } from "../lib/timetable.js";
import crypto from "crypto";
import { askRAG, isRateLimited } from "../ai-assistant/rag-service.js";

async function sendLongMessage(chatId, text, options = {}) {
  const limit = 4000;
  if (text.length <= limit) {
    return bot.sendMessage(chatId, text, options);
  }
  let offset = 0;
  while (offset < text.length) {
    const chunk = text.slice(offset, offset + limit);
    await bot.sendMessage(chatId, chunk, options);
    offset += limit;
  }
}

// tiny in-memory state machine for the /start registration flow
const pendingRegistration = new Map(); // telegram_id -> { step, name }

// State machine for contact-admin flow (for unregistered users)
// Map: telegram_id -> { step: "awaiting_message", senderName }
const pendingContactAdmin = new Map();

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
/contact – send a message to the admin
/help – show this guide again

Just tap the buttons on my messages — no typing needed for marking attendance 🙂`;

const UNREGISTERED_TEXT = `👋 *Welcome to Smart Learning+!*

This bot is primarily for registered students of Smart Learning+ to track their attendance.

*To use full features:*
1️⃣ Register on the website first
2️⃣ Connect your Telegram from your dashboard

🌐 *Website:* https://smartlearningplus.me

*Don't have access?* You can still send a message to the admin using /contact`;

function mainKeyboard() {
  return {
    reply_markup: {
      keyboard: [["/today", "/status"], ["/week", "/dashboard"], ["/contact", "/help"]],
      resize_keyboard: true,
    },
  };
}

function unregisteredKeyboard() {
  return {
    reply_markup: {
      keyboard: [["/contact"], ["/help"]],
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

/**
 * Forward a contact message from an unregistered/any user to the admin Telegram ID.
 */
async function forwardToAdmin(chatId, fromUser, text) {
  const envAdminId = process.env.ADMIN_TELEGRAM_ID?.trim();
  if (!envAdminId || !bot) return false;

  const displayName = fromUser.first_name
    ? `${fromUser.first_name}${fromUser.last_name ? " " + fromUser.last_name : ""}`
    : "Unknown";
  const username = fromUser.username ? `@${fromUser.username}` : "No username";

  const adminMsg = `📬 <b>New Message via Website Contact Button</b>\n\n<b>From:</b> ${displayName}\n<b>Username:</b> ${username}\n<b>Telegram ID:</b> <code>${chatId}</code>\n\n<b>Message:</b>\n${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}`;

  try {
    await bot.sendMessage(envAdminId, adminMsg, { parse_mode: "HTML" });
    return true;
  } catch (err) {
    console.error("[contact-admin] Failed to forward message to admin:", err.message || err);
    return false;
  }
}

export function registerHandlers() {
  if (!bot) return;

  // ── /start ──────────────────────────────────────────────────────────
  bot.onText(/^\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    const parts = text.split(" ");

    if (parts.length > 1) {
      const connectToken = parts[1];
      // Special deep link for "contact admin" from website
      if (connectToken === "contact_admin") {
        pendingContactAdmin.set(chatId, { step: "awaiting_message", senderName: msg.from.first_name || "Visitor" });
        await bot.sendMessage(
          chatId,
          `👋 Hi ${msg.from.first_name || "there"}!\n\nType your message below and I'll forward it to the admin. Please include your name and query clearly.`,
          {
            reply_markup: {
              keyboard: [["❌ Cancel"]],
              resize_keyboard: true,
              one_time_keyboard: true,
            },
          }
        );
        return;
      }

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
            `✅ *Successfully connected!* Welcome, ${user.name} (Batch ${user.batch}).\n\nYou now have full access to attendance tracking and smart alerts.`,
            { parse_mode: "Markdown", ...mainKeyboard() }
          );
          return;
        } else {
          await bot.sendMessage(
            chatId,
            "⚠️ This connection link is invalid or has already been used. Please get a new one from your website dashboard."
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

    await bot.sendMessage(chatId, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
  });

  // ── /help ────────────────────────────────────────────────────────────
  bot.onText(/^\/help/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) {
      return bot.sendMessage(msg.chat.id, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
    }
    bot.sendMessage(msg.chat.id, HELP_TEXT, { parse_mode: "Markdown", ...mainKeyboard() });
  });

  // ── /contact ─────────────────────────────────────────────────────────
  bot.onText(/^\/contact/, async (msg) => {
    const chatId = msg.chat.id;
    pendingContactAdmin.set(chatId, { step: "awaiting_message", senderName: msg.from.first_name || "User" });
    await bot.sendMessage(
      chatId,
      `📬 *Send a message to Admin*\n\nType your message below (include your name and query). I'll forward it directly.\n\nType /cancel to abort.`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          keyboard: [["❌ Cancel"]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  // ── /cancel ──────────────────────────────────────────────────────────
  bot.onText(/^\/cancel/, async (msg) => {
    const chatId = msg.chat.id;
    const inContact = pendingContactAdmin.has(chatId);
    pendingContactAdmin.delete(chatId);
    pendingRegistration.delete(chatId);
    const user = await getUser(chatId);
    const keyboard = user ? mainKeyboard() : unregisteredKeyboard();
    bot.sendMessage(chatId, inContact ? "Message cancelled." : "Nothing to cancel.", keyboard);
  });

  // ── /today ────────────────────────────────────────────────────────────
  bot.onText(/^\/today/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
    await sendTodayList(msg.chat.id, user);
  });

  // ── /status ───────────────────────────────────────────────────────────
  bot.onText(/^\/status/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
    await sendStatus(msg.chat.id, user);
  });

  // ── /week ─────────────────────────────────────────────────────────────
  bot.onText(/^\/week/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
    await sendWeek(msg.chat.id, user);
  });

  // ── /dashboard ────────────────────────────────────────────────────────
  bot.onText(/^\/dashboard/, async (msg) => {
    const user = await getUser(msg.chat.id);
    if (!user) return bot.sendMessage(msg.chat.id, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });
    const link = await issueDashboardLink(user.id);
    await bot.sendMessage(msg.chat.id, `🔗 Your personal dashboard link:\n${link}\n\n_(Link expires when you request a new one)_`, { parse_mode: "Markdown" });
  });

  // ── /ask ──────────────────────────────────────────────────────────────
  bot.onText(/^\/ask\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const question = match[1].trim();

    const user = await getUser(chatId);
    if (!user) return bot.sendMessage(chatId, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });

    const rateLimitKey = `tg-${chatId}`;
    if (isRateLimited(rateLimitKey)) {
      return bot.sendMessage(chatId, "Rate limit reached. Max 20 questions per hour.");
    }

    const typingMsg = await bot.sendMessage(chatId, "Thinking... 🤖");
    try {
      const result = await askRAG(question);
      let formattedText = result.answer;
      formattedText = formattedText.replace(/^### (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^## (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^# (.*$)/gim, "*$1*");

      if (result.sources && result.sources.length > 0) {
        formattedText += "\n\n*Sources:*";
        for (const s of result.sources) {
          formattedText += `\n• ${s.subject_code} · ${s.topic} (${s.source_type === 'pyq' ? `NK PYQ ${s.year}` : 'Syllabus'})`;
        }
      }
      formattedText += `\n\n_Answered by ${result.served_by.toUpperCase()}_`;

      await bot.deleteMessage(chatId, typingMsg.message_id);
      await sendLongMessage(chatId, formattedText, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(err);
      if (typingMsg) await bot.deleteMessage(chatId, typingMsg.message_id);
      await bot.sendMessage(chatId, "Sorry, I ran into an error. Please try again.");
    }
  });

  // ── /pyq ──────────────────────────────────────────────────────────────
  bot.onText(/^\/pyq\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const subjectRaw = match[1].trim().toUpperCase();

    const user = await getUser(chatId);
    if (!user) return bot.sendMessage(chatId, UNREGISTERED_TEXT, { parse_mode: "Markdown", ...unregisteredKeyboard() });

    const rateLimitKey = `tg-${chatId}`;
    if (isRateLimited(rateLimitKey)) {
      return bot.sendMessage(chatId, "Rate limit reached. Max 20 questions per hour.");
    }

    let subjectCode = subjectRaw;
    if (subjectRaw === "AOA" || subjectRaw === "ALGORITHMS") subjectCode = "AOA";
    if (subjectRaw === "CD" || subjectRaw === "COMPILER") subjectCode = "CD";
    if (subjectRaw === "CG" || subjectRaw === "CGM" || subjectRaw === "GRAPHICS") subjectCode = "CGM";
    if (subjectRaw === "ITC" || subjectRaw === "INFORMATION") subjectCode = "ITC";
    if (subjectRaw === "OS" || subjectRaw === "OPERATING") subjectCode = "OS";

    const question = `What are the most repeated PYQ topics for ${subjectCode}?`;
    const typingMsg = await bot.sendMessage(chatId, "Analyzing exam patterns... 📊");
    try {
      const result = await askRAG(question, subjectCode, "pyq-pattern");
      let formattedText = result.answer;
      formattedText = formattedText.replace(/^### (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^## (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^# (.*$)/gim, "*$1*");

      await bot.deleteMessage(chatId, typingMsg.message_id);
      await sendLongMessage(chatId, formattedText, { parse_mode: "Markdown" });
    } catch (err) {
      console.error(err);
      if (typingMsg) await bot.deleteMessage(chatId, typingMsg.message_id);
      await bot.sendMessage(chatId, "Failed to analyze PYQ patterns. Please try again.");
    }
  });

  // ── Fallback: any other text ──────────────────────────────────────────
  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();
    if (text.startsWith("/")) return; // handled above

    // ── Contact Admin flow (highest priority) ─────────────────────────
    const contactState = pendingContactAdmin.get(chatId);
    if (contactState && contactState.step === "awaiting_message") {
      if (text === "❌ Cancel") {
        pendingContactAdmin.delete(chatId);
        const user = await getUser(chatId);
        return bot.sendMessage(chatId, "Message cancelled.", user ? mainKeyboard() : unregisteredKeyboard());
      }

      pendingContactAdmin.delete(chatId);
      const sent = await forwardToAdmin(chatId, msg.from, text);
      const user = await getUser(chatId);
      const keyboard = user ? mainKeyboard() : unregisteredKeyboard();

      if (sent) {
        await bot.sendMessage(
          chatId,
          `✅ *Your message has been sent to the admin!*\n\nThey will get back to you as soon as possible.`,
          { parse_mode: "Markdown", ...keyboard }
        );
      } else {
        await bot.sendMessage(
          chatId,
          "⚠️ Couldn't forward your message right now. Please try again later.",
          keyboard
        );
      }
      return;
    }

    // ── Registration flow ─────────────────────────────────────────────
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

    // ── Registered user: route to AI Study Assistant ──────────────────
    const user = await getUser(chatId);
    if (!user) {
      return bot.sendMessage(
        chatId,
        UNREGISTERED_TEXT,
        { parse_mode: "Markdown", ...unregisteredKeyboard() }
      );
    }

    const rateLimitKey = `tg-${chatId}`;
    if (isRateLimited(rateLimitKey)) {
      return bot.sendMessage(chatId, "Rate limit reached. Max 20 questions per hour.");
    }

    const typingMsg = await bot.sendMessage(chatId, "Thinking... 🤖");
    try {
      const result = await askRAG(text);
      let formattedText = result.answer;
      formattedText = formattedText.replace(/^### (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^## (.*$)/gim, "*$1*");
      formattedText = formattedText.replace(/^# (.*$)/gim, "*$1*");

      if (result.sources && result.sources.length > 0) {
        formattedText += "\n\n*Sources:*";
        for (const s of result.sources) {
          formattedText += `\n• ${s.subject_code} · ${s.topic} (${s.source_type === 'pyq' ? `NK PYQ ${s.year}` : 'Syllabus'})`;
        }
      }
      formattedText += `\n\n_Answered by ${result.served_by.toUpperCase()}_`;

      await bot.deleteMessage(chatId, typingMsg.message_id);
      await sendLongMessage(chatId, formattedText, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Bot AI error:", err);
      if (typingMsg) await bot.deleteMessage(chatId, typingMsg.message_id);
      await bot.sendMessage(chatId, "Sorry, I ran into an error. Please try again in a moment.");
    }
  });

  // ── Callback queries ──────────────────────────────────────────────────
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
