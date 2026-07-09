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

export async function setupWebhook(app) {
  if (!bot || !useWebhook) return;
  const publicUrl = process.env.PUBLIC_URL;
  const path = `/telegram/webhook/${token}`;
  await bot.setWebHook(`${publicUrl}${path}`);
  app.use(path, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
  console.log("✅ Telegram webhook set:", publicUrl + path);
}
