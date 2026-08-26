import { q } from "../src/db.js";

async function run() {
  try {
    const { rows } = await q(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables in public schema:", rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error getting tables:", err);
  } finally {
    process.exit(0);
  }
}

run();
