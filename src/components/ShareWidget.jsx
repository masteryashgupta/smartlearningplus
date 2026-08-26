import { useState } from "react";

export default function ShareWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareTitle = "Smart Learning Plus";
  const shareText = "Check out Smart Learning Plus! 📚 Download RTU syllabus and access the study vault to learn smarter. Join here!";
  const shareUrl = "https://smartlearningplus.me";
  const fullShareText = `${shareText}\n\n👉 ${shareUrl}`;

  const handleShareClick = async () => {
    // If Web Share API is available (only use native share on mobile devices)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: shareTitle,
          text: fullShareText,
        });
        return;
      } catch (err) {
        console.log("Web Share failed, fallback to modal", err);
      }
    }
    // Fallback: Open custom popup on desktop
    setIsOpen(!isOpen);
    setCopied(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-50 font-sans">
      {/* Custom Share Dialog */}
      {isOpen && (
        <div
          className="absolute bottom-16 left-0 w-72 rounded-2xl shadow-lg p-4 animate-fade-in"
          style={{
            background: "var(--surface, #ffffff)",
            border: "1.5px solid var(--border, #e2e8f0)",
            color: "var(--text, #0f172a)",
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <h4 style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent, #2563eb)" }}>Share Platform</h4>
            <button
              onClick={() => setIsOpen(false)}
              style={{ color: "var(--muted, #64748b)", fontSize: "14px", background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "var(--muted, #64748b)", lineHeight: 1.5, marginBottom: "16px" }}>
            Share this platform and features with your classmates!
          </p>

          <div className="flex flex-col gap-2">
            {/* WhatsApp Share Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all group"
              style={{
                border: "1.5px solid var(--border, #e2e8f0)",
                color: "var(--text2, #334155)",
                textDecoration: "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.background = "var(--green-light, #ecfdf5)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span>Share via WhatsApp</span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>➔</span>
            </a>

            {/* Telegram Share Button */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all group"
              style={{
                border: "1.5px solid var(--border, #e2e8f0)",
                color: "var(--text2, #334155)",
                textDecoration: "none",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#06b6d4"; e.currentTarget.style.background = "var(--accent2-light, #ecfeff)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">✈️</span>
                <span>Share via Telegram</span>
              </div>
              <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>➔</span>
            </a>

            {/* Copy Button */}
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition-all group w-full text-left cursor-pointer"
              style={{
                border: "1.5px solid var(--border, #e2e8f0)",
                background: "transparent",
                color: "var(--text2, #334155)",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-light, #eff6ff)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "transparent"; }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <span>{copied ? "Copied!" : "Copy Share Message"}</span>
              </div>
              {copied ? (
                <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 700 }}>✓</span>
              ) : (
                <span style={{ fontSize: "10px", color: "var(--muted)", fontWeight: 700 }}>➔</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Share FAB */}
      <button
        onClick={handleShareClick}
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-3 sm:px-4 sm:py-3 rounded-full transition-all cursor-pointer group"
        style={{
          background: "var(--surface, #ffffff)",
          color: "var(--text, #0f172a)",
          border: "1.5px solid var(--border, #e2e8f0)",
          boxShadow: "var(--shadow, 0 4px 12px rgba(0,0,0,0.1))",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        <span className="text-sm group-hover:rotate-12 transition-transform">📤</span>
        <span className="text-xs font-bold font-mono tracking-wider uppercase hidden sm:inline">Share</span>
      </button>
    </div>
  );
}
