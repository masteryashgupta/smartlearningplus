import { Router } from "express";
import { askRAG, isRateLimited } from "./rag-service.js";

const router = Router();

router.post("/", async (req, res) => {
  const { question, subject_code, mode } = req.body;
  
  if (!question || !question.trim()) {
    return res.status(400).json({ error: "question is required" });
  }

  // Rate limiting key: use user ID if logged in, otherwise IP
  const rateLimitKey = req.auth ? req.auth.id : req.ip;
  if (isRateLimited(rateLimitKey)) {
    return res.status(429).json({ error: "Rate limit reached. Max 20 queries per hour." });
  }

  try {
    const result = await askRAG(question, subject_code, mode);
    res.json(result);
  } catch (err) {
    console.error("RAG Query Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate response. Please try again." });
  }
});

export { router as askRouter };
