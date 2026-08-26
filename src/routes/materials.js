import { Router } from "express";
import multer from "multer";
import sanitizeHtml from "sanitize-html";
import { fileTypeFromBuffer } from "file-type";
import { q } from "../db.js";
import { uploadToB2, signUrls } from "../lib/b2.js";

const router = Router();

// Multer setup using memory storage for direct streaming upload to B2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB overall max file limit
  }
});

// Fetch all subjects for study materials & notes navigation
router.get("/subjects", async (req, res) => {
  try {
    const { rows } = await q(
      "select id, code, name, type, color from subjects order by name asc"
    );
    res.json(rows);
  } catch (err) {
    console.error("[materials/subjects] Error:", err);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

// Soft check for duplicate titles within the same subject
router.get("/check-title", async (req, res) => {
  const { title, subject_id } = req.query;
  if (!title || !subject_id) {
    return res.status(400).json({ error: "Title and subject_id are required" });
  }

  try {
    const { rows } = await q(
      "select count(*) from community_materials where lower(title) = lower($1) and subject_id = $2 and status != 'rejected'",
      [title.trim(), subject_id]
    );
    res.json({ exists: Number(rows[0].count) > 0 });
  } catch (err) {
    console.error("[check-title] Error:", err);
    res.status(500).json({ error: "Database error during duplicate check" });
  }
});

// Fetch approved materials for a subject (public)
router.get("/approved/:subject_code", async (req, res) => {
  try {
    const { rows } = await q(
      `select cm.id, cm.title, cm.section, cm.content_type, cm.file_url, cm.text_content, cm.uploader_name, cm.created_at
       from community_materials cm
       join subjects s on s.id = cm.subject_id
       where lower(s.code) = lower($1) and cm.status = 'approved' and cm.is_hidden = false
       order by cm.created_at desc`,
      [req.params.subject_code]
    );
    res.json(await signUrls(rows));
  } catch (err) {
    console.error("[approved] Error:", err);
    res.status(500).json({ error: "Failed to fetch community materials" });
  }
});

// Public submission of community study materials (pending admin approval)
router.post("/upload", upload.single("file"), async (req, res) => {
  const { title, subject_id, section, content_type, text_content, uploader_name } = req.body;

  // Basic validation
  if (!title || !subject_id || !section || !content_type) {
    return res.status(400).json({ error: "Title, subject, section, and content type are required" });
  }
  if (!["pdf", "image", "text", "html"].includes(content_type)) {
    return res.status(400).json({ error: "Invalid content_type" });
  }

  try {
    // 1. Fetch subject to make sure it exists
    const { rows: subRows } = await q("select * from subjects where id = $1", [subject_id]);
    if (subRows.length === 0) {
      return res.status(400).json({ error: "Selected subject does not exist" });
    }

    const cleanUploaderName = (uploader_name && uploader_name.trim()) ? uploader_name.trim() : "Community Member";
    let fileUrl = null;
    let sanitizedText = null;

    // 2. Process based on content_type
    if (content_type === "pdf") {
      if (!req.file) {
        return res.status(400).json({ error: "PDF file is required" });
      }
      if (req.file.size > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "PDF file size must not exceed 100MB" });
      }

      const detected = await fileTypeFromBuffer(req.file.buffer);
      if (!detected || detected.mime !== "application/pdf") {
        return res.status(400).json({ error: "Uploaded file is not a valid PDF document" });
      }

      fileUrl = await uploadToB2(req.file.buffer, req.file.originalname, "application/pdf");
    } else if (content_type === "image") {
      if (!req.file) {
        return res.status(400).json({ error: "Image file is required" });
      }
      if (req.file.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: "Image file size must not exceed 20MB" });
      }

      const detected = await fileTypeFromBuffer(req.file.buffer);
      const allowedImageMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!detected || !allowedImageMimes.includes(detected.mime)) {
        return res.status(400).json({ error: "Uploaded file is not a valid image (JPEG, PNG, WebP, GIF)" });
      }

      fileUrl = await uploadToB2(req.file.buffer, req.file.originalname, detected.mime);
    } else if (content_type === "text") {
      if (!text_content || !text_content.trim()) {
        return res.status(400).json({ error: "Text content is required" });
      }
      if (text_content.length > 50000) {
        return res.status(400).json({ error: "Text content exceeds maximum character limit of 50,000" });
      }
      sanitizedText = text_content.trim();
    } else if (content_type === "html") {
      if (!text_content || !text_content.trim()) {
        return res.status(400).json({ error: "HTML content is required" });
      }
      if (text_content.length > 100000) {
        return res.status(400).json({ error: "HTML content exceeds maximum character limit of 100,000" });
      }

      sanitizedText = sanitizeHtml(text_content, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(["h1", "h2", "h3", "img", "pre", "code", "table", "tbody", "thead", "tr", "th", "td"]),
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          "*": ["style", "class"],
          img: ["src", "alt", "title", "width", "height"],
          a: ["href", "target", "rel"]
        }
      });
    }

    // 3. Insert into database with status='pending'
    const { rows: inserted } = await q(
      `insert into community_materials (
        title, subject_id, section, content_type, uploader_name, file_url, text_content, status
      ) values ($1, $2, $3, $4, $5, $6, $7, 'pending')
      returning id, title, status, created_at`,
      [
        title.trim(),
        subject_id,
        section.trim(),
        content_type,
        cleanUploaderName,
        fileUrl,
        sanitizedText
      ]
    );

    res.status(201).json({
      ok: true,
      message: "Material submitted successfully! It will be reviewed by an administrator before appearing publicly.",
      material: inserted[0]
    });
  } catch (err) {
    console.error("[upload] Processing error:", err);
    res.status(500).json({ error: "Failed to upload study material. Please try again." });
  }
});

export default router;
