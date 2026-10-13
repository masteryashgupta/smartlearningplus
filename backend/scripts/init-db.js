import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.ilbprtrmksbpbfmivpzx:i9qbrcebMPyw4LaV@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres";

console.log("Connecting to database pooler...");

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    const client = await pool.connect();
    console.log(" Connected to PostgreSQL successfully!");
    client.release();

    // 1. Run schema.sql
    console.log("\n📄 Running sql/schema.sql...");
    const schemaSql = fs.readFileSync(path.join(__dirname, "../sql/schema.sql"), "utf8");
    await pool.query(schemaSql);
    console.log("✅ schema.sql executed successfully!");

    // 2. Run add_user_extra_slots.sql
    console.log("\n📄 Running sql/add_user_extra_slots.sql...");
    const extraSlotsSql = fs.readFileSync(
      path.join(__dirname, "../sql/add_user_extra_slots.sql"),
      "utf8"
    );
    await pool.query(extraSlotsSql);
    console.log("✅ add_user_extra_slots.sql executed successfully!");

    // 3. List tables to verify
    console.log("\n🔍 Verifying created tables:");
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log(res.rows.map((r) => `  - ${r.table_name}`).join("\n"));

    console.log("\n All base tables created successfully!");
  } catch (err) {
    console.error("❌ Database initialization error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
