import { Router } from "express";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

// Sanitize text: trim, max 300 chars, strip HTML tags
function sanitizeText(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .trim()
    .slice(0, 300);
}

// Ensure the singleton table row exists
async function ensureSingleton() {
  await q(
    `INSERT INTO announcement_singleton (id, text, is_active, updated_at)
     VALUES ('singleton', '', true, NOW())
     ON CONFLICT (id) DO NOTHING`
  );
}

// GET /api/announcement/public — no auth required
router.get("/public", async (req, res) => {
  try {
    await ensureSingleton();
    const { rows } = await q(
      "SELECT text, is_active, updated_at FROM announcement_singleton WHERE id = 'singleton'"
    );
    if (rows.length === 0) {
      return res.json({ text: "", isActive: false, updatedAt: null });
    }
    const row = rows[0];
    res.json({
      text: row.text || "",
      isActive: row.is_active,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error("[announcement] GET /public error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/announcement — admin only, returns full doc for prefilling form
router.get("/", requireAuth("admin"), async (req, res) => {
  try {
    await ensureSingleton();
    const { rows } = await q(
      "SELECT text, is_active, updated_at, updated_by FROM announcement_singleton WHERE id = 'singleton'"
    );
    if (rows.length === 0) {
      return res.json({ text: "", isActive: true, updatedAt: null, updatedBy: null });
    }
    const row = rows[0];
    res.json({
      text: row.text || "",
      isActive: row.is_active,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
    });
  } catch (err) {
    console.error("[announcement] GET / error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/announcement — admin only, upserts the singleton
router.put("/", requireAuth("admin"), async (req, res) => {
  try {
    const { text, isActive } = req.body;
    const cleanText = sanitizeText(text);
    const active = isActive !== undefined ? Boolean(isActive) : true;
    const updatedBy = req.auth?.name || req.auth?.id || "admin";

    await q(
      `INSERT INTO announcement_singleton (id, text, is_active, updated_at, updated_by)
       VALUES ('singleton', $1, $2, NOW(), $3)
       ON CONFLICT (id) DO UPDATE
         SET text = $1, is_active = $2, updated_at = NOW(), updated_by = $3`,
      [cleanText, active, updatedBy]
    );

    res.json({ ok: true, text: cleanText, isActive: active });
  } catch (err) {
    console.error("[announcement] PUT / error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
