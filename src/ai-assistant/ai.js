import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function getEmbedding(text, retries = 3, delay = 2000) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await withTimeout(
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text }] },
            outputDimensionality: 768
          })
        }),
        10000
      );
      
      if (response.status === 429) {
        console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Embedding API failed with status ${response.status}: ${errText}`);
      }
      
      const data = await response.json();
      if (!data.embedding || !data.embedding.values) {
        throw new Error("Invalid response format from Embedding API");
      }
      
      return data.embedding.values;
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Embedding attempt ${i + 1} failed. Retrying in ${delay}ms... Error: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}

export async function callGemini(prompt, systemInstruction = "") {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  
  // Combine system instruction into the prompt or pass it to config
  const config = systemInstruction ? { systemInstruction } : {};
  const modelWithConfig = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, config);
  const result = await modelWithConfig.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

export async function callGroq(prompt, systemInstruction = "") {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is not configured");
  }
  const groq = new Groq({ apiKey: groqApiKey });
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const chatCompletion = await groq.chat.completions.create({
    messages,
    model: "llama-3.3-70b-versatile",
  });
  return chatCompletion.choices[0].message.content;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("AI service call timed out after " + (ms / 1000) + "s"));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function callAI(prompt, systemInstruction = "") {
  const timeoutMs = 10000; // 10 seconds timeout
  let attempts = 0;
  
  // Try Groq (up to 2 times)
  while (attempts < 2) {
    try {
      const answer = await withTimeout(callGroq(prompt, systemInstruction), timeoutMs);
      return { answer, served_by: "groq" };
    } catch (err) {
      attempts++;
      console.warn(`[AI-LOG] Groq attempt ${attempts} failed/timed out. Error: ${err.message}. Timestamp: ${new Date().toISOString()}`);
      if (attempts === 2) {
        break;
      }
      // Wait a short delay before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Fallback to Gemini
  try {
    console.log(`[AI-LOG] Groq failed completely. Falling back to Gemini. Timestamp: ${new Date().toISOString()}`);
    const answer = await withTimeout(callGemini(prompt, systemInstruction), timeoutMs);
    return { answer, served_by: "gemini" };
  } catch (err2) {
    console.error(`[AI-LOG] Gemini also failed. Error: ${err2.message}. Timestamp: ${new Date().toISOString()}`);
    // Return a clean answer instead of throwing an error to the user
    return { 
      answer: "I'm having trouble right now, please try again in a moment.", 
      served_by: "none" 
    };
  }
}
