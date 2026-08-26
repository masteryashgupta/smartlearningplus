import { Router } from "express";
import { q } from "../db.js";

const router = Router();

// Fetch all theory subjects for study materials & notes navigation
router.get("/subjects", async (req, res) => {
  try {
    const { rows } = await q(
      "select id, code, name, type, color from subjects where type = 'theory' order by name asc"
    );
    res.json(rows);
  } catch (err) {
    console.error("[materials/subjects] Error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

export default router;
