// run-migration.js — run from smartlearningplus-backend directory
// Usage: node scripts/run-migration.js
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(path.join(__dirname, "../sql/add_user_extra_slots.sql"), "utf8");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  console.log("Running migration: add_user_extra_slots...");
  await pool.query(sql);
  console.log("✅ Migration completed successfully!");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
