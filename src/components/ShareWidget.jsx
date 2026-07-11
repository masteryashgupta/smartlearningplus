import { useState } from "react";

export default function ShareWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareTitle = "Smart Learning Plus";
  const shareText = "Check out Smart Learning Plus! 📚 Track your class attendance with heatmaps, download RTU syllabus, access the study vault, and chat with the built-in AI assistant to learn smarter. Join here!";
  const shareUrl = "https://smartlearningplus.me";
  const fullShareText = `${shareText}\n\n👉 ${shareUrl}`;

  const handleShareClick = async () => {
    // If Web Share API is available (native share on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
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
    <div className="fixed bottom-6 left-6 z-50 font-sans">
      {/* Custom Share Dialog */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 w-72 bg-white border border-slate-200/80 rounded-2xl shadow-lg p-4 animate-fade-in text-slate-800">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600">Share Platform</h4>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal mb-4">
            Share this platform and features with your classmates!
          </p>

          <div className="flex flex-col gap-2">
            {/* WhatsApp Share Button */}
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-emerald-500/30 hover:bg-emerald-50/30 text-xs font-medium transition-all group"
              style={{ cursor: "none" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span>Share via WhatsApp</span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-emerald-600 font-bold">➔</span>
            </a>

            {/* Telegram Share Button */}
            <a 
              href={telegramUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-sky-500/30 hover:bg-sky-50/30 text-xs font-medium transition-all group"
              style={{ cursor: "none" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">✈️</span>
                <span>Share via Telegram</span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-sky-600 font-bold">➔</span>
            </a>

            {/* Copy Button */}
            <button 
              onClick={handleCopyLink}
              className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:border-indigo-500/30 hover:bg-indigo-50/30 text-xs font-medium transition-all group w-full text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <span>{copied ? "Copied!" : "Copy Share Message"}</span>
              </div>
              {copied ? (
                <span className="text-[10px] text-emerald-600 font-bold">✓</span>
              ) : (
                <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-bold">➔</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Share FAB */}
      <button
        onClick={handleShareClick}
        className="flex items-center gap-2 px-4 py-3 bg-white text-slate-800 rounded-full border border-slate-200/80 hover:border-indigo-500/50 shadow-md transition-all cursor-pointer group"
      >
        <span className="text-sm group-hover:rotate-12 transition-transform">📤</span>
        <span className="text-xs font-bold font-mono tracking-wider uppercase">Share</span>
      </button>
    </div>
  );
}
