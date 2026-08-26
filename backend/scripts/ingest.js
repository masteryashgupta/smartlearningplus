import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PDFParse } from "pdf-parse";
import dotenv from "dotenv";
import { q } from "../src/db.js";
import { getEmbedding, callAI } from "../src/ai-assistant/ai.js";

dotenv.config();

const SUBJECTS = {
  aoa: { name: "Analysis of Algorithms", code: "AOA", driveId: "1nOb5ejvxXNuN9yV90tma9MOaJsRxQHDL" },
  cd: { name: "Compiler Design", code: "CD", driveId: "1_y7RNVCJ44odpC0rjMAcgwBxlyG3JULm" },
  cg: { name: "Computer Graphics", code: "CGM", driveId: "1HhOCfF5YwCIgrre-XLVBYhLhsTB818kY" },
  itc: { name: "Information Theory and Coding", code: "ITC", driveId: "1lNkG8ZQ4o8LLL1dlRSTWsvQVnjE3L_3k" },
  os: { name: "Operating Systems", code: "OS", driveId: "1LA0qMUqWgrKqfwOwm2X_44iSPk-i6tI_" }
};

const BASE_DIR = path.resolve();
const FRONTEND_PUBLIC_DIR = path.join(BASE_DIR, "../smartlearningplus/public");
const NK_PDF_DIR = path.join(BASE_DIR, "nk-pdf");

// Helper to delay executions to respect rate limits
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function computeHash(text) {
  return crypto.createHash("md5").update(text).digest("hex");
}

function cleanHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadPDF(driveId, destPath) {
  const url = `https://drive.google.com/uc?export=download&id=${driveId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  await fs.promises.writeFile(destPath, Buffer.from(arrayBuffer));
}

// Parses HTML files for a subject and returns chunks
function parseSyllabusHTML(folderPath, subjectInfo) {
  const chunks = [];
  if (!fs.existsSync(folderPath)) return chunks;

  const files = fs.readdirSync(folderPath).filter(f => f.startsWith("unit") && f.endsWith(".html"));

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const htmlContent = fs.readFileSync(filePath, "utf-8");

    // Split HTML by sections starting with h1 (unit title) or h2 (topic)
    const regex = /(<h[12][^>]*class=["'](?:unit-title|topic)["'][^>]*>[\s\S]*?<\/h[12]>)/gi;
    const parts = htmlContent.split(regex);

    let currentHeader = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      if (part.startsWith("<h")) {
        // Extract the title text inside header
        currentHeader = part.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      } else {
        // It's the section body
        const cleanedBody = cleanHtml(part);
        if (cleanedBody.length < 50) continue; // Skip empty/stub content

        const content = `${currentHeader}\n${cleanedBody}`;
        chunks.push({
          subject: subjectInfo.name,
          subject_code: subjectInfo.code,
          topic: currentHeader || "General Details",
          source_type: "syllabus",
          year: "Syllabus Notes",
          content,
          content_hash: computeHash(content)
        });
      }
    }
  }

  return chunks;
}

// Helper to chunk large PDF text strings
function chunkText(text, size = 1500, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

async function inferTopicWithAI(chunkText, subjectName) {
  const prompt = `Identify which syllabus unit or key topic (e.g. "Unit 1: Introduction", "Syntax Analysis", "CPU Scheduling", "Information Theory") the following exam prep text for the subject "${subjectName}" belongs to. Respond with ONLY the unit/topic name (maximum 5 words). Do not include any formatting, explanation, or conversational intro.
  
Text:
${chunkText.slice(0, 1000)}`;

  try {
    const res = await callAI(prompt);
    return res.answer.trim().replace(/^"|"$/g, "");
  } catch (err) {
    console.warn(`⚠️ AI topic inference failed: ${err.message}. Using fallback topic.`);
    return "General PYQ Reference";
  }
}

async function main() {
  console.log("🚀 Starting Data Ingestion Pipeline...");
  
  const summary = {
    totalChunks: 0,
    bySubject: {},
    failures: []
  };

  for (const [subjKey, info] of Object.entries(SUBJECTS)) {
    summary.bySubject[info.code] = 0;
    
    // ── 1. Ingest Syllabus Content ──
    const syllabusFolder = path.join(FRONTEND_PUBLIC_DIR, subjKey);
    console.log(`Processing syllabus for ${info.name} (${info.code})...`);
    
    const syllabusChunks = parseSyllabusHTML(syllabusFolder, info);
    console.log(`Found ${syllabusChunks.length} syllabus chunks.`);

    // ── 2. Ingest PYQ PDFs ──
    const pdfDir = path.join(NK_PDF_DIR, subjKey);
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Check if empty, if so, download the PDF from Drive
    let pdfFiles = fs.readdirSync(pdfDir).filter(f => f.endsWith(".pdf"));
    if (pdfFiles.length === 0) {
      const destFile = `${subjKey}_nk.pdf`;
      const destPath = path.join(pdfDir, destFile);
      console.log(`Downloading default NK PDF for ${info.code} from Google Drive...`);
      try {
        await downloadPDF(info.driveId, destPath);
        console.log(`Successfully downloaded ${destFile}`);
        pdfFiles = [destFile];
      } catch (err) {
        console.error(`❌ Failed to download PDF for ${info.code}:`, err.message);
        summary.failures.push(`${info.code} default NK PDF Download`);
      }
    }

    const pdfChunks = [];
    for (const pdfFile of pdfFiles) {
      const pdfPath = path.join(pdfDir, pdfFile);
      console.log(`Parsing NK PDF: ${pdfFile}...`);
      try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const parser = new PDFParse({ data: dataBuffer });
        const pdfData = await parser.getText();
        const text = pdfData.text.replace(/\s+/g, " ").trim();
        await parser.destroy();
        
        console.log(`Extracted ${text.length} chars. Chunking text...`);
        const rawChunks = chunkText(text, 1500, 200);
        console.log(`Created ${rawChunks.length} raw chunks. Running AI topic inference & embedding generation...`);

        // Extract year from filename (e.g. 2023_nk.pdf -> 2023) or default
        const yearMatch = pdfFile.match(/\b(20\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : "NK Notes";

        for (let idx = 0; idx < rawChunks.length; idx++) {
          const chunk = rawChunks[idx];
          
          // Call AI to infer unit/topic (rate limit buffer included)
          await sleep(1000); // 1s buffer
          const inferredTopic = await inferTopicWithAI(chunk, info.name);
          
          const fullContent = `Topic: ${inferredTopic} (${info.code} PYQ)\n${chunk}`;
          
          pdfChunks.push({
            subject: info.name,
            subject_code: info.code,
            topic: inferredTopic,
            source_type: "pyq",
            year,
            content: fullContent,
            content_hash: computeHash(fullContent)
          });
        }
      } catch (err) {
        console.error(`❌ Error parsing ${pdfFile}:`, err.message);
        summary.failures.push(pdfPath);
      }
    }

    const allSubjectChunks = [...syllabusChunks, ...pdfChunks];
    console.log(`Generating embeddings & upserting ${allSubjectChunks.length} chunks to Database...`);

    for (let idx = 0; idx < allSubjectChunks.length; idx++) {
      const chunk = allSubjectChunks[idx];
      try {
        // Embedding generation (rate limit buffer)
        await sleep(1000);
        const embedding = await getEmbedding(chunk.content);
        
        await q(`
          insert into study_chunks (subject, subject_code, topic, source_type, year, content, embedding, content_hash)
          values ($1, $2, $3, $4, $5, $6, $7, $8)
          on conflict (content_hash) do update set
            subject = excluded.subject,
            subject_code = excluded.subject_code,
            topic = excluded.topic,
            source_type = excluded.source_type,
            year = excluded.year,
            content = excluded.content,
            embedding = excluded.embedding
        `, [
          chunk.subject,
          chunk.subject_code,
          chunk.topic,
          chunk.source_type,
          chunk.year,
          chunk.content,
          `[${embedding.join(",")}]`,
          chunk.content_hash
        ]);

        summary.bySubject[info.code]++;
        summary.totalChunks++;
      } catch (err) {
        console.error(`❌ Error upserting chunk ${idx} for ${info.code}:`, err.message);
        summary.failures.push(`Chunk ${idx} (${info.code})`);
      }
    }
  }

  console.log("\n====================================");
  console.log("🏁 Ingestion Pipeline Completed!");
  console.log("====================================");
  console.log(`Total Chunks Ingested: ${summary.totalChunks}`);
  console.log("Chunks per Subject:");
  for (const [code, count] of Object.entries(summary.bySubject)) {
    console.log(`  - ${code}: ${count}`);
  }
  if (summary.failures.length > 0) {
    console.log("Failures / Errors during run:");
    for (const f of summary.failures) {
      console.log(`  - ${f}`);
    }
  } else {
    console.log("All processes finished with 0 errors! 🎉");
  }
  
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal Error during pipeline run:", err);
  process.exit(1);
});
