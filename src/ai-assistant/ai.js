import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

export async function getEmbedding(text) {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function callGemini(prompt, systemInstruction = "") {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  
  // Combine system instruction into the prompt or pass it to config
  const config = systemInstruction ? { systemInstruction } : {};
  const modelWithConfig = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, config);
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
  const timeoutMs = 15000; // 15 seconds
  try {
    const answer = await withTimeout(callGemini(prompt, systemInstruction), timeoutMs);
    return { answer, served_by: "gemini" };
  } catch (err) {
    console.warn("Gemini failed or timed out, falling back to Groq. Error:", err.message);
    try {
      const answer = await withTimeout(callGroq(prompt, systemInstruction), timeoutMs);
      return { answer, served_by: "groq" };
    } catch (err2) {
      console.error("Groq also failed or timed out. Error:", err2.message);
      throw new Error("Both AI providers (Gemini & Groq) are currently unavailable or timed out. Please try again.");
    }
  }
}
