import { useState, useRef, useEffect } from "react";
import { api } from "../api.js";

const SUGGESTIONS = [
  "What are the most repeated PYQ topics?",
  "Explain SLR vs LALR Parsing in Hinglish",
  "Summarize the phases of a Compiler",
  "Explain CPU Scheduling algorithms"
];

const SUBJECT_MAP = [
  { code: "", name: "All Subjects" },
  { code: "AOA", name: "Analysis of Algorithms" },
  { code: "CD", name: "Compiler Design" },
  { code: "CGM", name: "Computer Graphics" },
  { code: "ITC", name: "Information Theory" },
  { code: "OS", name: "Operating Systems" }
];

export default function AskAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: "ai",
      text: "Hello! I am your Smart Study Assistant. Ask me anything from your RTU V Semester Syllabus or Nk PYQs! Main aapko English aur Hinglish ke mix mein answers dunga. 📚🤖",
      sources: []
    }
  ]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ask", {
        question: query,
        subject_code: subject || undefined,
        mode: query.toLowerCase().includes("pyq") || query.toLowerCase().includes("repeated") ? "pyq-pattern" : "explain"
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: res.data.answer,
          sources: res.data.sources || [],
          servedBy: res.data.served_by
        }
      ]);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.error || "AI service is currently busy. Please try again in a few seconds.";
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: `⚠️ **Error:** ${errMsg}`,
          sources: [],
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderSimpleMarkdown = (text) => {
    if (!text) return "";
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Bullet lists
    html = html.replace(/^\*\s+(.*$)/gim, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul class='list-disc pl-4 space-y-1 my-2'>$1</ul>");
    // Line breaks
    html = html.replace(/\n/g, "<br/>");
    return html;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-full border border-indigo-500/40 hover:border-indigo-500/90 shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-xs font-bold font-mono tracking-wider uppercase">Ask AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="w-[360px] sm:w-[420px] h-[550px] max-h-[85vh] bg-slate-950 border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in text-slate-100">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 border-b border-indigo-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <h3 className="font-bold font-mono text-sm tracking-tight">SmartAI Assistant</h3>
            </div>
            
            {/* Subject Selector */}
            <div className="flex items-center gap-2">
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500/50"
              >
                {SUBJECT_MAP.map((s) => (
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </select>

              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    msg.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : msg.isError
                      ? "bg-rose-950/40 border border-rose-900 text-rose-200 rounded-bl-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  <div
                    className="leading-relaxed whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(msg.text) }}
                  />
                  
                  {/* Sources chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                      {msg.sources.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[9px] text-indigo-300 font-medium"
                        >
                          {s.subject_code} · {s.topic} ({s.source_type === "pyq" ? `PYQ ${s.year}` : "Syllabus"})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Served by badge */}
                {msg.servedBy && (
                  <span className="text-[9px] text-slate-500 font-mono mt-1 px-1">
                    Served by {msg.servedBy.toUpperCase()}
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions (Render if last message is from AI and we are not loading) */}
          {!loading && messages[messages.length - 1]?.sender === "ai" && (
            <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-900 flex gap-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 rounded-full border border-slate-800 text-[10px] text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 whitespace-nowrap transition-all cursor-pointer bg-slate-900/40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900 border-t border-indigo-500/10 flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask a syllabus or exam prep question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Send
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
