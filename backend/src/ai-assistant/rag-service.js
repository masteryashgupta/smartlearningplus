import { getEmbedding, callAI } from "./ai.js";
import { q } from "../db.js";

const rateLimitMap = new Map();

export function isRateLimited(key) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }
  const timestamps = rateLimitMap.get(key).filter(t => now - t < windowMs);
  if (timestamps.length >= 20) {
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(key, timestamps);
  return false;
}

export async function askRAG(question, subjectCode, mode) {
  // 1. Embed incoming question
  const embedding = await getEmbedding(question);
  
  // 2. Query Supabase for top 8 chunks using vector cosine distance operator <=>
  const subjectFilter = subjectCode ? subjectCode.toUpperCase().trim() : null;
  const { rows: chunks } = await q(
    `select subject, subject_code, topic, source_type, year, content,
            (embedding <=> $1::vector) as distance
     from study_chunks
     where ($2::text is null or upper(subject_code) = $2)
     order by embedding <=> $1::vector
     limit 8`,
    [`[${embedding.join(",")}]`, subjectFilter]
  );

  // 3. Build context grounded prompt and apply similarity threshold
  const filteredChunks = chunks.filter(c => Number(c.distance) <= 0.65);
  let contextText = "";
  if (filteredChunks.length > 0) {
    contextText = filteredChunks
      .map((c, i) => `[Context ${i + 1}] Source: ${c.source_type} (${c.subject_code} - ${c.topic} ${c.year ? `Year: ${c.year}` : ""})\nContent:\n${c.content}`)
      .join("\n\n---\n\n");
  } else {
    return {
      answer: "I don't have specific information on that in my study materials — try checking the syllabus pages or ask your faculty.",
      sources: [],
      served_by: "none"
    };
  }

  const systemInstruction = `You are the Smart Learning Plus Platform Guide, an AI assistant dedicated ONLY to helping users navigate and use the features of this website.

CRITICAL RULES:
1. ONLY answer questions using the provided context. Do NOT invent links, URLs, facts, or statistics not present in the context.
2. If the user asks a question about their subjects, syllabus, exams, PYQs, solutions, or any study material content, politely DECLINE to answer it. State clearly that your role is to help them use the website's features and you do not provide study solutions.
3. If you are uncertain or the context does not contain the answer, say "I don't have specific information on that in my study materials — try checking the relevant page or ask your faculty" rather than guessing.

Website Features & Usage:
1. Open Study Notes & Modules: Complete theory, mnemonics, and unit cheat sheets for engineering subjects:
   - Operating Systems (OS): [OS Module](/os/index.html)
   - Human-Computer Interaction (HCI): [HCI Module](/hci/index.html)
   - Analysis of Algorithms (AOA): [AOA Module](/aoa/index.html)
   - Compiler Design (CD): [CD Module](/cd/index.html)
   - Computer Graphics & Multimedia (CGM): [CGM Module](/cg/index.html)
   - Information Theory & Coding (ITC): [ITC Module](/itc/index.html)
2. Study Tools Hub: QuickPaste (text/code sharing), Spin Wheel (random picker), and Study Timers at [Tools](/tools).
3. Email Notifications / Updates: Users can subscribe with their email on the homepage to get alerts when new notes and cheat sheets are published.
4. Share Study Material: Anyone can upload and contribute study materials, PDFs, notes, or unit summaries.
5. All notes, cheat sheets, and tools are completely open to everyone with no login required.

When explaining a feature or module, provide clear steps or the direct link from the list above. Keep responses helpful, concise, and friendly.`;

  const prompt = `Context:\n${contextText}\n\nUser Question: ${question}`;

  // 4. Run AI call with fallback
  const aiResult = await callAI(prompt, systemInstruction);

  // Format sources list (unique sources only)
  const sources = [];
  const seen = new Set();
  for (const c of filteredChunks) {
    const key = `${c.subject_code}-${c.topic}-${c.source_type}`;
    if (!seen.has(key)) {
      seen.add(key);
      sources.push({
        subject: c.subject,
        subject_code: c.subject_code,
        topic: c.topic,
        source_type: c.source_type,
        year: c.year
      });
    }
  }

  return {
    answer: aiResult.answer,
    sources: sources,
    served_by: aiResult.served_by
  };
}
