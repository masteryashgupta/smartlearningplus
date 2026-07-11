import { useState, useRef, useEffect } from "react";
import { api } from "../api.js";

const SUGGESTIONS = [
  "How do I mark attendance?",
  "Where can I find syllabus PDFs?",
  "How does the leaderboard work?",
  "How can I share study material?"
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
      text: "Hello! I am your Smart Learning Plus Platform Guide. I can help you navigate the website, explain how features work, and provide direct links. What do you need help with? 🌐🤖",
      sources: []
    }
  ]);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Hide/show other FABs when chat opens/closes
  const openChat = () => {
    setIsOpen(true);
    document.body.classList.add("ai-chat-open");
  };
  const closeChat = () => {
    setIsOpen(false);
    document.body.classList.remove("ai-chat-open");
  };

  useEffect(() => {
    return () => document.body.classList.remove("ai-chat-open");
  }, []);

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
    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, "<a href='$2' class='text-primary hover:underline'>$1</a>");
    // Line breaks
    html = html.replace(/\n/g, "<br/>");
    return html;
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans" style={{ maxWidth: "calc(100vw - 32px)" }}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={openChat}
          className="flex items-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-4 sm:py-3 bg-surface text-ink rounded-full border border-line hover:border-primary/50 shadow-soft transition-all cursor-pointer group"
        >
          <span className="text-lg group-hover:scale-110 transition-transform">🤖</span>
          <span className="text-xs font-bold font-mono tracking-wider uppercase hidden sm:inline">Ask AI</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="bg-surface border border-line rounded-2xl shadow-soft flex flex-col overflow-hidden animate-fade-in text-ink"
          style={{
            width: "min(420px, calc(100vw - 32px))",
            height: "min(550px, calc(100svh - 96px))",
            maxHeight: "85vh",
          }}
        >
          
          {/* Header */}
          <div className="p-4 bg-paper border-b border-line flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              <h3 className="font-bold font-mono text-sm tracking-tight">SmartAI Assistant</h3>
            </div>
            
            {/* Header Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={closeChat}
                className="text-muted hover:text-ink transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                    msg.sender === "user"
                      ? "bg-primary text-white rounded-br-none"
                      : msg.isError
                      ? "bg-red-50 border border-red-200 text-red-700 rounded-bl-none"
                      : "bg-surface text-ink border border-line rounded-bl-none"
                  }`}
                >
                  <div
                    className="leading-relaxed whitespace-pre-line"
                    dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(msg.text) }}
                    onClick={(e) => {
                      if (e.target.tagName === 'A') {
                        const href = e.target.getAttribute('href');
                        if (href && href.startsWith('#')) {
                          e.preventDefault();
                          const targetId = href.substring(1);
                          const el = document.getElementById(targetId);
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                  />
                  
                  {/* Sources chips */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-line flex flex-wrap gap-1.5">
                      {msg.sources.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded bg-paper border border-line text-[9px] text-primary font-medium"
                        >
                          {s.subject_code} · {s.topic} ({s.source_type === "pyq" ? `PYQ ${s.year}` : "Syllabus"})
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Served by badge */}
                {msg.servedBy && (
                  <span className="text-[9px] text-muted font-mono mt-1 px-1">
                    Served by {msg.servedBy.toUpperCase()}
                  </span>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex flex-col items-start">
                <div className="bg-surface border border-line rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions (Render if last message is from AI and we are not loading) */}
          {!loading && messages[messages.length - 1]?.sender === "ai" && (
            <div className="px-4 py-2 bg-paper border-t border-line flex gap-2 overflow-x-auto shrink-0" style={{ scrollbarWidth: "none" }}>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(s)}
                  className="px-2.5 py-1 rounded-full border border-line text-[10px] text-muted hover:text-primary hover:border-primary/30 whitespace-nowrap transition-all cursor-pointer bg-surface shadow-sm"
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
            className="p-3 bg-surface border-t border-line flex gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder="Ask me how to use the website..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 bg-paper border border-line rounded-xl px-3 py-2 text-xs text-ink placeholder-muted focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-primary hover:bg-primary-dark text-white rounded-xl px-3.5 py-2 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
            >
              Send
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
