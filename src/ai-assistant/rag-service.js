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

  // 3. Build context grounded prompt
  let contextText = "";
  if (chunks.length > 0) {
    contextText = chunks
      .map((c, i) => `[Context ${i + 1}] Source: ${c.source_type} (${c.subject_code} - ${c.topic} ${c.year ? `Year: ${c.year}` : ""})\nContent:\n${c.content}`)
      .join("\n\n---\n\n");
  }

  const systemInstruction = `You are the Smart Learning Plus AI tutor and assistant for RTU B.Tech CSE students. 

If the user's question is about their syllabus or exams, answer it using the provided Context below if available. If the answer to a syllabus question is not in the context, say you don't have that in your syllabus data but try to help using your general knowledge.

If the user's question is a general greeting or conversation, respond naturally and politely.
If the user asks about website features, how to do things on the site, or where to find things, you MUST provide the relevant links formatted as markdown links:
- Mark Attendance: [Mark Attendance](/)
- Leaderboard: [Leaderboard](/)
- Share Study Material: [Share Study Material](/)
- Subject Attendance Breakdown / Heatmap: [Dashboard](/)

Explain in a highly engaging, clear mix of English and Hinglish, matching the style of university exams when answering study questions. Use bullet points, bold text, and clean headings where appropriate.
If context details include PYQ sources, specify the number of times or years that topic appeared to highlight exam patterns.
Mode selected: ${mode || "explain"}. 
Keep formatting clean — use headers/bullets for explain mode, numbered question lists for pyq-pattern mode.`;

  const prompt = `Context:\n${contextText}\n\nUser Question: ${question}`;

  // 4. Run AI call with fallback
  const aiResult = await callAI(prompt, systemInstruction);

  // Format sources list (unique sources only)
  const sources = [];
  const seen = new Set();
  for (const c of chunks) {
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
    sources,
    served_by: aiResult.served_by
  };
}
