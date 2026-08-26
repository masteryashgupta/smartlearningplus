import express from "express";
import { q } from "../db.js";

const router = express.Router();

/**
 * Helper to generate a 6-character random alphanumeric code
 */
function generateId() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

// Auto-create wheels table if it doesn't exist
(async () => {
  try {
    await q(`
      CREATE TABLE IF NOT EXISTS wheels (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) DEFAULT 'Spin the Wheel',
        config JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.error("❌ Failed to create wheels table:", err);
  }
})();

/**
 * POST /api/wheel
 * Save or update a wheel configuration
 * Body: { title, entries, colors, speed, sound, logo }
 */
router.post("/", async (req, res) => {
  try {
    const { title = "Spin the Wheel", entries, config } = req.body;
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "At least one entry is required." });
    }

    let wheelId = generateId();
    let unique = false;
    for (let i = 0; i < 10; i++) {
      const { rows } = await q("SELECT 1 FROM wheels WHERE id = $1", [wheelId]);
      if (rows.length === 0) {
        unique = true;
        break;
      }
      wheelId = generateId();
    }

    if (!unique) {
      return res.status(500).json({ error: "Failed to generate unique link." });
    }

    const fullConfig = { title, entries, ...(config || {}) };

    await q(
      "INSERT INTO wheels (id, title, config) VALUES ($1, $2, $3)",
      [wheelId, title.trim(), JSON.stringify(fullConfig)]
    );

    return res.status(201).json({ id: wheelId, url: `/wheel/${wheelId}` });
  } catch (err) {
    console.error("❌ POST /api/wheel error:", err);
    return res.status(500).json({ error: "Failed to save wheel configuration." });
  }
});

/**
 * GET /api/wheel/:id
 * Retrieve a saved wheel configuration
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = id?.trim().toLowerCase();

    const { rows } = await q("SELECT id, title, config, created_at FROM wheels WHERE LOWER(id) = $1", [cleanId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Wheel configuration not found." });
    }

    return res.json(rows[0]);
  } catch (err) {
    console.error("❌ GET /api/wheel/:id error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
