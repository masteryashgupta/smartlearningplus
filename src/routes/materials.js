import { Router } from "express";
import multer from "multer";
import sanitizeHtml from "sanitize-html";
import { fileTypeFromBuffer } from "file-type";
import { q } from "../db.js";
import { requireAuth } from "../auth.js";
import { uploadToB2 } from "../lib/b2.js";

const router = Router();

// Multer setup using memory storage for direct streaming upload to B2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB overall max file limit (Multer catches this)
  }
});

// Soft check for duplicate titles within the same subject
router.get("/check-title", requireAuth("student"), async (req, res) => {
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

// Fetch a student's own contribution history
router.get("/my-uploads", requireAuth("student"), async (req, res) => {
  try {
    const { rows } = await q(
      `select cm.*, s.name as subject_name, s.code as subject_code
       from community_materials cm
       join subjects s on s.id = cm.subject_id
       where cm.uploaded_by = $1
       order by cm.created_at desc`,
      [req.auth.id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[my-uploads] Error:", err);
    res.status(500).json({ error: "Failed to load upload history" });
  }
});

// Fetch approved materials for a subject (public)
router.get("/approved/:subject_code", async (req, res) => {
  try {
    const { rows } = await q(
      `select cm.id, cm.title, cm.section, cm.content_type, cm.file_url, cm.text_content, cm.uploader_name, cm.created_at
       from community_materials cm
       join subjects s on s.id = cm.subject_id
       where lower(s.code) = lower($1) and cm.status = 'approved'
       order by cm.created_at desc`,
      [req.params.subject_code]
    );
    res.json(rows);
  } catch (err) {
    console.error("[approved] Error:", err);
    res.status(500).json({ error: "Failed to fetch community materials" });
  }
});

// Handle new study material upload / submission
router.post("/upload", requireAuth("student"), upload.single("file"), async (req, res) => {
  const { title, subject_id, section, content_type, text_content } = req.body;

  // Basic validation
  if (!title || !subject_id || !section || !content_type) {
    return res.status(400).json({ error: "title, subject_id, section and content_type are required" });
  }
  if (!["pdf", "image", "text", "html"].includes(content_type)) {
    return res.status(400).json({ error: "Invalid content_type" });
  }

  try {
    // 1. Rate Limiting Check (Max 5 pending uploads per user per day)
    const { rows: countRows } = await q(
      "select count(*) from community_materials where uploaded_by = $1 and status = 'pending' and created_at > now() - interval '1 day'",
      [req.auth.id]
    );
    if (Number(countRows[0].count) >= 5) {
      return res.status(429).json({ error: "Daily upload limit reached. You can have a maximum of 5 pending submissions." });
    }

    // 2. Fetch subject to make sure it exists
    const { rows: subRows } = await q("select * from subjects where id = $1", [subject_id]);
    if (subRows.length === 0) {
      return res.status(400).json({ error: "Selected subject does not exist" });
    }
    const subject = subRows[0];

    let fileUrl = null;
    let sanitizedText = null;

    // 3. Handle File Uploads (PDF / Image)
    if (["pdf", "image"].includes(content_type)) {
      if (!req.file) {
        return res.status(400).json({ error: "No file was uploaded." });
      }

      // Size checks
      const fileSize = req.file.size;
      if (content_type === "pdf" && fileSize > 10 * 1024 * 1024) {
        return res.status(400).json({ error: "PDF files cannot exceed 10MB." });
      }
      if (content_type === "image" && fileSize > 2 * 1024 * 1024) {
        return res.status(400).json({ error: "Image files cannot exceed 2MB." });
      }

      // MIME type checks (Server-side validation)
      const fileTypeResult = await fileTypeFromBuffer(req.file.buffer);
      if (!fileTypeResult) {
        return res.status(400).json({ error: "Could not identify file format." });
      }
      const mime = fileTypeResult.mime;

      if (content_type === "pdf" && mime !== "application/pdf") {
        return res.status(400).json({ error: "Uploaded file is not a valid PDF." });
      }
      if (content_type === "image" && !["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(mime)) {
        return res.status(400).json({ error: "Uploaded file is not a supported image (PNG/JPEG/WEBP only)." });
      }

      // Upload to Backblaze B2
      const extension = fileTypeResult.ext;
      const b2FileName = `contributions/${subject.code}/${content_type}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
      
      fileUrl = await uploadToB2(req.file.buffer, b2FileName, mime);
    }

    // 4. Handle Text/HTML Submissions with Sanitization
    if (["text", "html"].includes(content_type)) {
      if (!text_content || !text_content.trim()) {
        return res.status(400).json({ error: "Content body cannot be empty." });
      }

      // Extra Hardening: Pre-check for malicious style vectors containing url() or expression()
      const lowerContent = text_content.toLowerCase();
      if (lowerContent.includes("url(") || lowerContent.includes("expression(")) {
        return res.status(400).json({ error: "Inline styles containing 'url()' or 'expression()' are restricted for security reasons." });
      }

      // Clean submitted content using sanitize-html
      sanitizedText = sanitizeHtml(text_content, {
        allowedTags: [
          "p", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "em", "b", "i", 
          "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th", 
          "blockquote", "code", "pre", "img", "a", "br", "hr", "span", "div"
        ],
        allowedAttributes: {
          a: ["href", "name", "target", "rel"],
          img: ["src", "alt", "title", "width", "height"],
          span: ["style"],
          div: ["style"],
          p: ["style"]
        },
        transformTags: {
          a: (tagName, attribs) => {
            return {
              tagName: "a",
              attribs: {
                ...attribs,
                target: "_blank",
                rel: "noopener noreferrer"
              }
            };
          }
        },
        allowedStyles: {
          '*': {
            'color': [/^.*$/],
            'background-color': [/^.*$/],
            'text-align': [/^.*$/],
            'font-size': [/^.*$/],
            'font-weight': [/^.*$/],
            'padding': [/^.*$/],
            'margin': [/^.*$/],
            'border': [/^.*$/]
          }
        }
      });
    }

    // 5. Save to database
    await q(
      `insert into community_materials (title, subject_id, section, content_type, uploader_name, file_url, text_content, uploaded_by, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        title.trim(),
        subject_id,
        section.trim(),
        content_type,
        req.auth.name,
        fileUrl,
        sanitizedText,
        req.auth.id
      ]
    );

    res.json({ ok: true, message: "Submission uploaded successfully. Waiting for admin approval." });
  } catch (err) {
    console.error("[upload] Error uploading material:", err);
    res.status(500).json({ error: "Failed to process upload due to server error." });
  }
});

export default router;
