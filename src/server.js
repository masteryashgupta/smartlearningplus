import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
dotenv.config();

import { q } from "./db.js";
import authRoutes from "./routes/auth.js";
import timetableRoutes from "./routes/timetable.js";
import attendanceRoutes from "./routes/attendance.js";
import adminRoutes from "./routes/admin.js";
import { registerHandlers } from "./bot/handlers.js";
import { startScheduler } from "./bot/scheduler.js";
import { setupWebhook } from "./bot/bot.js";

const app = express();
app.use(helmet());
app.disable("x-powered-by");

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 login/register/forgot requests per window
  message: { error: "Too many auth attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/", generalLimiter);
app.use("/api/auth/student/login", authLimiter);
app.use("/api/auth/admin/login", authLimiter);
app.use("/api/auth/student/register", authLimiter);
app.use("/api/auth/forgot-password", authLimiter);


const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (
        !process.env.FRONTEND_URL ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// Global middleware to disable API response caching
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);

async function bootstrapAdmin() {
  // Ensure whitelisted_emails table exists
  await q(`
    create table if not exists whitelisted_emails (
      id uuid primary key default gen_random_uuid(),
      email text unique not null,
      created_at timestamptz default now()
    )
  `);

  const { rows } = await q("select count(*) from admins");
  if (Number(rows[0].count) > 0) return;
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.warn("⚠️  No admin exists and ADMIN_EMAIL/ADMIN_PASSWORD not set in .env — set them and restart.");
    return;
  }
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await q("insert into admins (name, email, password_hash) values ($1,$2,$3)", [
    ADMIN_NAME || "Admin",
    ADMIN_EMAIL.toLowerCase(),
    hash,
  ]);
  console.log(`✅ Bootstrapped admin account: ${ADMIN_EMAIL}`);
}

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await bootstrapAdmin();
    registerHandlers();
    await setupWebhook(app);
    startScheduler();
    app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
  } catch (error) {
    console.error("❌ Fatal error during backend startup:", error);
    process.exit(1);
  }
})();
