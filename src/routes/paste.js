import express from "express";
import rateLimit from "express-rate-limit";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";

const router = express.Router();

// Stricter rate limit for paste creation (10 pastes per IP per hour)
const pasteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: "Too many pastes created from this IP. Try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Word lists for memorable slug generation
const ADJECTIVES = [
  "swift", "golden", "quiet", "brave", "silver", "amber", "calm", "dark",
  "bright", "clear", "cool", "crisp", "deep", "dusk", "early", "elder",
  "epic", "fair", "firm", "free", "fresh", "grand", "great", "happy",
  "hard", "high", "just", "keen", "kind", "large", "late", "lean",
  "light", "long", "loud", "low", "lucky", "mild", "misty", "neat",
  "new", "nice", "noble", "north", "odd", "old", "open", "pale",
  "plain", "prime", "proud", "pure", "quick", "rare", "real", "rich",
  "ripe", "rough", "round", "royal", "safe", "sharp", "slim", "slow",
  "smart", "soft", "solid", "south", "stark", "still", "stone", "strong",
  "sunny", "super", "tall", "tame", "thin", "tight", "tiny", "true",
  "urban", "vast", "warm", "west", "white", "whole", "wide", "wild",
  "wise", "bold", "jade", "jade", "iron", "blue", "rose", "snow",
  "star", "lost", "near", "peak", "cool", "lunar", "solar", "ocean",
  "cosmic", "frozen", "glowing", "hidden", "inland", "icy", "nimble",
  "fuzzy", "dusty", "cloudy", "stormy", "breezy", "leafy", "mossy",
  "sandy", "rocky", "silky", "crispy", "bumpy", "hollow", "shiny",
  "secret", "simple", "steady", "sturdy", "subtle", "sunny", "vivid",
  "lively", "lovely", "sleepy", "speedy", "witty", "zesty", "zippy",
  "ancient", "cosmic", "gentle", "humble", "mighty", "serene", "velvet",
  "copper", "crimson", "frosty", "scarlet", "indigo", "emerald", "violet",
];

const NOUNS = [
  "tiger", "falcon", "maple", "ocean", "river", "stone", "forest", "canyon",
  "eagle", "hawk", "wolf", "bear", "deer", "fox", "lion", "raven",
  "comet", "spark", "flame", "storm", "cloud", "moon", "star", "dawn",
  "dusk", "ridge", "peak", "brook", "creek", "field", "grove", "hill",
  "isle", "lake", "marsh", "mesa", "moor", "plain", "pond", "reef",
  "vale", "bay", "cape", "cave", "cove", "delta", "dune", "falls",
  "fjord", "glade", "haven", "inlet", "knoll", "ledge", "loch", "path",
  "cliff", "shore", "slope", "trail", "woods", "arbor", "atoll", "basin",
  "basin", "bluff", "brush", "butte", "crown", "depot", "ember", "ferry",
  "flare", "flint", "frost", "gully", "haven", "heath", "hedge", "knot",
  "lark", "lava", "leaf", "light", "loft", "loom", "lure", "maze",
  "mead", "mist", "moss", "nest", "nook", "opal", "orb", "pine",
  "pulse", "quill", "realm", "rune", "rush", "sage", "seed", "shard",
  "shrub", "silt", "slate", "spire", "sprig", "surge", "swift", "thorn",
  "tide", "timber", "tower", "trace", "trek", "vale", "vapor", "vine",
  "vista", "void", "wake", "wave", "wind", "wisp", "yarrow", "zenith",
];

/** Expiry presets → ISO timestamp or null */
function resolveExpiry(expiryOption) {
  const now = new Date();
  switch (expiryOption) {
    case "2h":  return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    case "6h":  return new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
    case "12h": return new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();
    case "1d":  return new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
    case "3d":  return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    case "7d":  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    default:    return null; // permanent
  }
}

/**
 * Generate a memorable slug: adjective-noun-number (e.g. "swift-tiger-07")
 */
function generateSlug() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return `${adj}-${noun}-${num}`;
}

/**
 * POST /api/paste
 * Create a new paste. Returns { slug, url }.
 * Body: { content: string, expiry?: "2h"|"6h"|"12h"|"1d"|"3d"|"7d"|"30d"|"permanent" }
 */
router.post("/", pasteLimiter, async (req, res) => {
  try {
    const { content, expiry = "permanent" } = req.body;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Content is required." });
    }

    const trimmed = content.trimEnd();
    if (trimmed.length === 0) {
      return res.status(400).json({ error: "Content cannot be empty." });
    }

    if (trimmed.length > 200000) {
      return res.status(400).json({
        error: "Content too large. Maximum is 200,000 characters.",
      });
    }

    const expiresAt = resolveExpiry(expiry);

    // Try to find a unique slug (retry up to 10 times on collision)
    let slug = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = generateSlug();
      const { rows } = await q("SELECT 1 FROM pastes WHERE slug = $1", [candidate]);
      if (rows.length === 0) {
        slug = candidate;
        break;
      }
    }

    if (!slug) {
      return res.status(500).json({ error: "Could not generate a unique link. Please try again." });
    }

    await q(
      "INSERT INTO pastes (slug, content, char_count, expires_at) VALUES ($1, $2, $3, $4)",
      [slug, trimmed, trimmed.length, expiresAt]
    );

    return res.status(201).json({ slug, url: `/${slug}`, expires_at: expiresAt });
  } catch (err) {
    console.error("❌ POST /api/paste error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/paste/:slug
 * Fetch paste content by its slug.
 */
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    if (!/^[a-z]+-[a-z]+-\d{2}$/.test(slug)) {
      return res.status(404).json({ error: "Paste not found." });
    }

    const { rows } = await q(
      "SELECT slug, content, char_count, created_at, expires_at FROM pastes WHERE slug = $1",
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Paste not found." });
    }

    const paste = rows[0];

    // Check expiry
    if (paste.expires_at && new Date(paste.expires_at) < new Date()) {
      // Auto-delete expired paste
      await q("DELETE FROM pastes WHERE slug = $1", [slug]);
      return res.status(404).json({ error: "This paste has expired and been deleted." });
    }

    return res.json(paste);
  } catch (err) {
    console.error("❌ GET /api/paste/:slug error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/paste  (admin only)
 * List all pastes for admin management.
 */
router.get("/", requireAuth("admin"), async (req, res) => {
  try {
    const { rows } = await q(
      `SELECT slug, char_count, created_at, expires_at,
              CASE WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN true ELSE false END as is_expired
       FROM pastes
       ORDER BY created_at DESC
       LIMIT 200`
    );
    return res.json(rows);
  } catch (err) {
    console.error("❌ GET /api/paste (admin list) error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * DELETE /api/paste/:slug  (admin only)
 * Hard delete a paste by slug.
 */
router.delete("/:slug", requireAuth("admin"), async (req, res) => {
  try {
    const { slug } = req.params;
    const { rowCount } = await q("DELETE FROM pastes WHERE slug = $1", [slug]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Paste not found." });
    }
    return res.json({ ok: true, message: `Paste '${slug}' deleted.` });
  } catch (err) {
    console.error("❌ DELETE /api/paste/:slug error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
