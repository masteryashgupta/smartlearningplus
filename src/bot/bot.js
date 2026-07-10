import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn("⚠️  TELEGRAM_BOT_TOKEN not set — bot will not start.");
}

const useWebhook = process.env.USE_WEBHOOK === "true";

export const bot = token
  ? new TelegramBot(token, useWebhook ? {} : { polling: true })
  : null;

if (bot && !useWebhook) {
  bot.on("polling_error", (error) => {
    console.error("⚠️ Telegram polling error:", error.message || error);
    if (error.message && (error.message.includes("401") || error.message.includes("Unauthorized"))) {
      console.warn("⚠️ Telegram Bot Token is unauthorized. Stopping polling to prevent spam.");
      bot.stopPolling().catch((err) => console.error("Failed to stop polling:", err.message));
    }
  });
}

export async function setupWebhook(app) {
  if (!bot || !useWebhook) return;
  const publicUrl = process.env.PUBLIC_URL;
  if (!publicUrl) {
    console.warn("⚠️ PUBLIC_URL not set — webhook cannot be established.");
    return;
  }
  const path = `/telegram/webhook/${token}`;
  try {
    await bot.setWebHook(`${publicUrl}${path}`);
    app.use(path, (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });
    console.log("✅ Telegram webhook set:", publicUrl + path);
  } catch (err) {
    console.error("❌ Failed to set Telegram webhook:", err.message || err);
  }
}
