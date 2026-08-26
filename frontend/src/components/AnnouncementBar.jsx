import { useEffect, useState, useRef } from "react";
import { api } from "../api.js";

/**
 * LiveAnnouncementBar
 *
 * A sticky, horizontally-scrolling marquee bar that sits ABOVE the main header.
 * - Fetches from GET /api/announcement/public (no auth)
 * - Auto-refreshes every 5 minutes
 * - Dismissed per-session via a close button (does NOT call any API)
 * - Renders nothing if isActive=false or text is empty
 */
export default function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState(null); // { text, isActive }
  const [dismissed, setDismissed] = useState(false);
  const [hovered, setPaused] = useState(false);
  const intervalRef = useRef(null);

  const fetchAnnouncement = async () => {
    try {
      const { data } = await api.get("/announcement/public");
      setAnnouncement(data);
    } catch {
      // silently ignore — bar stays hidden if fetch fails
    }
  };

  useEffect(() => {
    fetchAnnouncement();
    intervalRef.current = setInterval(fetchAnnouncement, 5 * 60 * 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Reset dismiss whenever a new announcement text comes in
  const prevText = useRef(null);
  useEffect(() => {
    if (announcement?.text && announcement.text !== prevText.current) {
      setDismissed(false);
      prevText.current = announcement.text;
    }
  }, [announcement?.text]);

  if (!announcement || !announcement.isActive || !announcement.text || dismissed) {
    return null;
  }

  const text = announcement.text;
  const scrollSpeed = announcement.scrollSpeed || 45;
  const gapSize = announcement.gap || 20;
  const spaces = "\u00A0".repeat(gapSize);
  const repeated = `${text}${spaces}${text}${spaces}${text}${spaces}${text}${spaces}`;

  return (
    <>
      <style>{`
        @keyframes sl-marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .sl-ann-bar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          height: 38px;
          display: flex;
          align-items: center;
          background: linear-gradient(90deg, #2563eb 0%, #7c3aed 50%, #06b6d4 100%);
          box-shadow: 0 2px 12px rgba(37,99,235,0.25);
          overflow: hidden;
          user-select: none;
        }

        .sl-ann-bar .sl-ann-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
          border-right: 1px solid rgba(255,255,255,0.25);
          white-space: nowrap;
          height: 100%;
          background: rgba(0,0,0,0.12);
        }

        .sl-ann-bar .sl-ann-icon svg {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }

        .sl-ann-bar .sl-ann-track {
          flex: 1;
          overflow: hidden;
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
        }

        .sl-ann-bar .sl-ann-inner {
          display: flex;
          white-space: nowrap;
          will-change: transform;
          animation: sl-marquee-scroll 45s linear infinite;
        }

        .sl-ann-bar .sl-ann-inner.paused {
          animation-play-state: paused;
        }

        .sl-ann-bar .sl-ann-text {
          color: #fff;
          font-size: 13.5px;
          font-weight: 500;
          letter-spacing: 0.015em;
          line-height: 1;
          padding: 0 24px;
        }

        .sl-ann-bar .sl-ann-close {
          flex-shrink: 0;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.15);
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.85);
          font-size: 16px;
          transition: background 0.2s, color 0.2s;
        }

        .sl-ann-bar .sl-ann-close:hover {
          background: rgba(0,0,0,0.3);
          color: #fff;
        }
      `}</style>

      <div className="sl-ann-bar" role="marquee" aria-label="Live announcement">
        {/* Label badge */}
        <div className="sl-ann-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5.882V19.24a1.76 1.76 0 0 1-3.417.592l-2.147-6.15M18 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.94 9.072A7 7 0 0 0 11 6V5" />
          </svg>
          Live
        </div>

        {/* Scrolling text track */}
        <div
          className="sl-ann-track"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div 
            className={`sl-ann-inner${hovered ? " paused" : ""}`}
            style={{ animationDuration: `${scrollSpeed}s` }}
          >
            <span className="sl-ann-text">{repeated}</span>
            <span className="sl-ann-text" aria-hidden="true">{repeated}</span>
          </div>
        </div>

        {/* Close button */}
        <button
          className="sl-ann-close"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcement"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </>
  );
}
