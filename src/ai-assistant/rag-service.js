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

  const systemInstruction = `You are the Smart Learning Plus Platform Guide, an AI assistant dedicated ONLY to helping users navigate and use the features of this website.

If the user asks a question about their subjects, syllabus, exams, PYQs, solutions, or any study material content, politely DECLINE to answer it. State clearly that your role is to help them use the website's features and you do not provide study solutions. 

Website Features & Usage:
1. Mark Attendance: Users can mark their daily class attendance (Present, Absent, or Cancelled) on the Dashboard. Link: [Mark Attendance](/)
2. Leaderboard: Users can see their ranking based on attendance percentage. Link: [Leaderboard](/)
3. Share Study Material: Users can upload PDFs, notes, or images to share with the community. Link: [Share Study Material](/)
4. Subject Attendance Breakdown: Visual indicators showing attendance percentage per subject/lab. Link: [Dashboard](/)
5. Timetable / Heatmap: View weekly schedule and past attendance history. Link: [Dashboard](/)
6. Syllabus PDFs / Official Schemes: Download official RTU syllabus and examination schemes. Link: [Syllabus PDFs](/#downloads)
7. Telegram Integration: Users can connect their Telegram account to get bot notifications. Link: [Dashboard](/)

When explaining a feature, provide clear steps on how to use it and ALWAYS include the relevant markdown link from the list above. Keep responses helpful, concise, and friendly.

If the user greets you, introduce yourself as the Platform Guide and list a few features you can help with.`;

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
    sources: [],
    served_by: aiResult.served_by
  };
}
