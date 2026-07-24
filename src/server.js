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
import materialsRoutes from "./routes/materials.js";
import { askRouter } from "./ai-assistant/routes.js";
import announcementRoutes from "./routes/announcement.js";
import { registerHandlers } from "./bot/handlers.js";
import { startScheduler } from "./bot/scheduler.js";
import { setupWebhook, getBotStatus } from "./bot/bot.js";

const app = express();
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

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


const allowedOrigins = [
  "https://smartlearningplus.me",
  "https://www.smartlearningplus.me",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

if (process.env.FRONTEND_URL) {
  process.env.FRONTEND_URL.split(",").forEach((url) => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      // Always check against the explicit allowlist — never open-wildcard.
      // allowedOrigins is pre-seeded with hardcoded production URLs so it
      // remains safe even if FRONTEND_URL is missing from the environment.
      if (allowedOrigins.includes(origin)) {
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

app.get("/", async (req, res) => {
  let dbStatusText = "Connected";
  let dbStatusDot = "active";
  let dbStatusColor = "var(--success)";
  try {
    await q("SELECT NOW()");
  } catch (err) {
    dbStatusText = "Disconnected";
    dbStatusDot = "inactive";
    dbStatusColor = "var(--danger)";
  }

  const botState = getBotStatus();
  let botStatusText = botState;
  let botStatusDot = "active";
  let botStatusColor = "var(--success)";

  if (botState === "Not Configured" || botState === "Disabled") {
    botStatusDot = "inactive";
    botStatusColor = "var(--text-muted)";
  } else if (botState.includes("Failed") || botState === "Unauthorized") {
    botStatusDot = "inactive";
    botStatusColor = "var(--danger)";
  } else if (botState.includes("Missing")) {
    botStatusDot = "warning";
    botStatusColor = "var(--warning)";
  }

  const seconds = process.uptime();
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const uptimeText = `${d > 0 ? `${d}d ` : ""}${h}h ${m}m ${s}s`;

  const nodeVersion = process.version;
  const memoryUsage = `${Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100} MB`;
  const serverTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const envText = process.env.NODE_ENV || "production";

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Smart Learning Plus — Backend Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-main: #0b0f19;
            --bg-card: #151c2c;
            --border: rgba(255, 255, 255, 0.08);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --primary: #6366f1;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-color: var(--bg-main);
            color: var(--text-main);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            background-image: radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 400px),
                              radial-gradient(circle at bottom left, rgba(168, 85, 247, 0.06), transparent 400px);
        }
        .container {
            width: 100%;
            max-width: 680px;
        }
        .header {
            text-align: center;
            margin-bottom: 2.5rem;
            animation: fadeIn 0.8s ease-out;
        }
        .logo-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            border-radius: 16px;
            margin-bottom: 1rem;
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
        }
        .logo-svg {
            width: 32px;
            height: 32px;
            fill: white;
        }
        h1 {
            font-size: 2rem;
            font-weight: 700;
            letter-spacing: -0.025em;
            margin-bottom: 0.5rem;
            background: linear-gradient(to right, #f8fafc, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: var(--text-muted);
            font-size: 0.95rem;
            font-family: monospace;
        }
        .status-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.25rem;
            margin-bottom: 2rem;
        }
        @media(min-width: 520px) {
            .status-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        .card {
            background-color: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .card:hover {
            transform: translateY(-2px);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
        .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
        }
        .card-title {
            font-size: 0.875rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            font-size: 1.125rem;
        }
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
        }
        .status-dot.active {
            background-color: var(--success);
            box-shadow: 0 0 12px var(--success);
            animation: pulse 2s infinite;
        }
        .status-dot.inactive {
            background-color: var(--danger);
            box-shadow: 0 0 12px var(--danger);
        }
        .status-dot.warning {
            background-color: var(--warning);
            box-shadow: 0 0 12px var(--warning);
            animation: pulse 2s infinite;
        }
        .metrics-card {
            grid-column: span 1;
        }
        @media(min-width: 520px) {
            .metrics-card {
                grid-column: span 2;
            }
        }
        .metrics-list {
            display: grid;
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }
        @media(min-width: 480px) {
            .metrics-list {
                grid-template-columns: repeat(2, 1fr);
            }
        }
        .metric-item {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        .metric-label {
            font-size: 0.75rem;
            color: var(--text-muted);
            font-weight: 500;
        }
        .metric-value {
            font-size: 0.95rem;
            font-weight: 600;
            font-family: monospace;
        }
        .footer {
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: 1.5rem;
        }
        .footer a {
            color: var(--primary);
            text-decoration: none;
            transition: color 0.2s;
        }
        .footer a:hover {
            color: #818cf8;
        }
        @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-container">
                <svg class="logo-svg" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
            </div>
            <h1>Smart Learning Plus</h1>
            <div class="subtitle">System Status Dashboard</div>
        </div>

        <div class="status-grid">
            <div class="card">
                <div class="card-header">
                    <span class="card-title">Server API</span>
                </div>
                <div class="status-badge" style="color: var(--success)">
                    <span class="status-dot active"></span>
                    Online
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">PostgreSQL DB</span>
                </div>
                <div class="status-badge" style="color: ${dbStatusColor}">
                    <span class="status-dot ${dbStatusDot}"></span>
                    ${dbStatusText}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Telegram Bot</span>
                </div>
                <div class="status-badge" style="color: ${botStatusColor}">
                    <span class="status-dot ${botStatusDot}"></span>
                    ${botStatusText}
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <span class="card-title">Environment</span>
                </div>
                <div class="status-badge" style="color: #a855f7">
                    <span class="status-dot active" style="background-color:#a855f7; box-shadow:0 0 12px #a855f7;"></span>
                    ${envText}
                </div>
            </div>

            <div class="card metrics-card">
                <div class="card-header">
                    <span class="card-title">System Metrics</span>
                </div>
                <div class="metrics-list">
                    <div class="metric-item">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value">${uptimeText}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Node version</span>
                        <span class="metric-value">${nodeVersion}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Memory Usage</span>
                        <span class="metric-value">${memoryUsage}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Server Time (IST)</span>
                        <span class="metric-value">${serverTime}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>API Endpoint: <a href="/api">/api</a> | Health JSON: <a href="/health">/health</a></p>
        </div>
    </div>
</body>
</html>`);
});


app.use("/api/auth", authRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/ask", askRouter);
app.use("/api/announcement", announcementRoutes);

async function migrateDatabase() {
  console.log("🔄 Running database migrations...");
  try {
    // Ensure whitelisted_emails table exists
    await q(`
      create table if not exists whitelisted_emails (
        id uuid primary key default gen_random_uuid(),
        email text unique not null,
        created_at timestamptz default now()
      )
    `);

    // Ensure notification_subscribers table exists
    await q(`
      create table if not exists notification_subscribers (
        id uuid primary key default gen_random_uuid(),
        email text unique not null,
        created_at timestamptz default now()
      )
    `);

    // Ensure community_materials table exists
    await q(`
      create table if not exists community_materials (
        id uuid primary key default gen_random_uuid(),
        title text not null,
        subject_id uuid references subjects(id) on delete cascade,
        section text not null,
        content_type text not null check (content_type in ('pdf', 'image', 'text', 'html')),
        uploader_name text,
        file_url text,
        text_content text,
        uploaded_by uuid references users(id) on delete set null,
        status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
        rejection_reason text,
        reviewed_by uuid references admins(id) on delete set null,
        reviewed_at timestamptz,
        created_at timestamptz default now()
      )
    `);

    // Add is_hidden column for admin moderation of approved materials (safe migration)
    await q(`
      alter table community_materials
      add column if not exists is_hidden boolean not null default false
    `);

    // Add is_moderator column for users
    await q(`
      alter table users
      add column if not exists is_moderator boolean not null default false
    `);

    // Drop reviewed_by constraint to allow users (moderators) to review
    await q(`
      alter table community_materials
      drop constraint if exists community_materials_reviewed_by_fkey
    `);

    // Create moderator logs table to record moderator activities
    await q(`
      create table if not exists moderator_logs (
        id uuid primary key default gen_random_uuid(),
        moderator_id uuid references users(id) on delete set null,
        moderator_name text not null,
        action text not null,
        details text,
        created_at timestamptz default now()
      )
    `);

    // Ensure pgvector extension is enabled
    try {
      await q("create extension if not exists vector");
    } catch (e) {
      console.warn("⚠️ Could not create vector extension (might already exist or permission issue):", e.message);
    }

    // Ensure study_chunks table exists
    await q(`
      create table if not exists study_chunks (
        id uuid primary key default gen_random_uuid(),
        subject text,
        subject_code text,
        topic text,
        source_type text,
        year text,
        content text,
        embedding vector(768),
        content_hash text unique,
        created_at timestamptz default now()
      )
    `);

    // Create index on study_chunks (use try/catch since index might already exist and CREATE INDEX IF NOT EXISTS is supported in PG 9.5+)
    try {
      await q("create index if not exists study_chunks_embedding_idx on study_chunks using ivfflat (embedding vector_cosine_ops)");
    } catch (e) {
      console.warn("⚠️ Could not create vector index:", e.message);
    }

    // Update subject names to match timetable formatting (code - lecturer)
    await q(`
      UPDATE subjects SET name = 'HCI - PT' WHERE code = 'HCI' AND name != 'HCI - PT';
      UPDATE subjects SET name = 'CGM - CU' WHERE code = 'CGM' AND name != 'CGM - CU';
      UPDATE subjects SET name = 'AOA - MS' WHERE code = 'AOA' AND name != 'AOA - MS';
      UPDATE subjects SET name = 'CD - YP' WHERE code = 'CD' AND name != 'CD - YP';
      UPDATE subjects SET name = 'ITC - DR. YZU' WHERE code = 'ITC' AND name != 'ITC - DR. YZU';
      UPDATE subjects SET name = 'OS - AS' WHERE code = 'OS' AND name != 'OS - AS';
    `);
    // Create announcement singleton table (one row, always updated in-place)
    await q(`
      CREATE TABLE IF NOT EXISTS announcement_singleton (
        id text PRIMARY KEY,
        text text NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        updated_at timestamptz DEFAULT now(),
        updated_by text
      )
    `);
    await q(`
      ALTER TABLE announcement_singleton 
      ADD COLUMN IF NOT EXISTS scroll_speed integer NOT NULL DEFAULT 45,
      ADD COLUMN IF NOT EXISTS gap integer NOT NULL DEFAULT 20
    `);

    console.log("✅ Database migrations completed successfully.");
  } catch (err) {
    console.error("❌ Database migrations failed:", err);
  }
}

async function bootstrapAdmin() {
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
    await migrateDatabase();
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
