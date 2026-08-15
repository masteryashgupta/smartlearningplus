import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";

// Predefined palette colors
const PALETTES = {
  rainbow: ["#ef4444", "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899"],
  pastel: ["#fca5a5", "#fdba74", "#fde047", "#86efac", "#67e8f9", "#93c5fd", "#a5b4fc", "#c084fc", "#f472b6"],
  neon: ["#ff0055", "#ff5500", "#ffcc00", "#00ff66", "#00ccff", "#7700ff", "#ff00cc"],
  ocean: ["#0284c7", "#0369a1", "#075985", "#0c4a6e", "#0e7490", "#155e75", "#164e63", "#0284c7"]
};

// Persistent Web Audio API Sound Synthesizer with AudioContext reuse and instant stop capability
let globalAudioCtx = null;
let activeOscillators = [];

const stopAllSounds = () => {
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // ignore already stopped or disconnected nodes
    }
  });
  activeOscillators = [];
};

const getAudioContext = () => {
  try {
    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }
  } catch (err) {
    console.warn("⚠️ Web Audio API context creation error:", err);
  }
  return globalAudioCtx;
};

const playSound = (type) => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (type === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.02);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.02);
      
      activeOscillators.push(osc);
      osc.onended = () => {
        activeOscillators = activeOscillators.filter(o => o !== osc);
      };
    } else if (type === "win") {
      stopAllSounds();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          const noteStartTime = ctx.currentTime + idx * 0.09;
          
          osc.frequency.setValueAtTime(freq, noteStartTime);
          gain.gain.setValueAtTime(0.35, noteStartTime);
          gain.gain.exponentialRampToValueAtTime(0.001, noteStartTime + 0.35);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.start(noteStartTime);
          osc.stop(noteStartTime + 0.35);
          
          activeOscillators.push(osc);
          osc.onended = () => {
            activeOscillators = activeOscillators.filter(o => o !== osc);
          };
        } catch (e) {
          console.warn("⚠️ Win note scheduling error:", e);
        }
      });
    }
  } catch (err) {
    console.warn("⚠️ playSound error:", err);
  }
};

const DEFAULT_ENTRIES = [
  { text: "Ali", weight: 1, color: "#6366f1" },
  { text: "Beatriz", weight: 1, color: "#ec4899" },
  { text: "Charles", weight: 1, color: "#10b981" },
  { text: "Diya", weight: 1, color: "#f59e0b" },
  { text: "Eric", weight: 1, color: "#06b6d4" },
  { text: "Fatima", weight: 1, color: "#8b5cf6" },
  { text: "Gabriel", weight: 1, color: "#ef4444" },
  { text: "Hanna", weight: 1, color: "#3b82f6" }
];

export default function WheelPage() {
  const { id } = useParams();
  
  // Wheel State
  const [wheelTitle, setWheelTitle] = useState("Spin the Wheel");
  const [entries, setEntries] = useState(DEFAULT_ENTRIES);
  const [rawText, setRawText] = useState(DEFAULT_ENTRIES.map(e => e.text).join("\n"));
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  
  // Customization State
  const [spinDuration, setSpinDuration] = useState(5); // seconds
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedPalette, setSelectedPalette] = useState("rainbow");
  const [centerLogo, setCenterLogo] = useState(null);
  const [activeTab, setActiveTab] = useState("entries"); // entries | settings | test
  
  // Share & Save state
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [error, setError] = useState(null);
  
  // Simulation / Fairness test state
  const [simResults, setSimResults] = useState(null);
  const [simulating, setSimulating] = useState(false);

  // Wheel Physics & Audio Throttle Refs
  const canvasRef = useRef(null);
  const currentAngleRef = useRef(0);
  const animFrameRef = useRef(null);
  const lastSoundSectorRef = useRef(-1);
  const lastTickTimeRef = useRef(0);

  // Update entries from multiline text
  const handleRawTextChange = (text) => {
    setRawText(text);
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const palette = PALETTES[selectedPalette] || PALETTES.rainbow;
    
    const updated = lines.map((t, i) => {
      const existing = entries.find(e => e.text === t);
      return {
        text: t,
        weight: existing ? existing.weight : 1,
        color: existing ? existing.color : palette[i % palette.length]
      };
    });
    setEntries(updated.length > 0 ? updated : []);
  };

  // Re-color entries on palette change
  const applyPalette = (paletteName) => {
    setSelectedPalette(paletteName);
    const palette = PALETTES[paletteName] || PALETTES.rainbow;
    setEntries(prev => prev.map((e, i) => ({ ...e, color: palette[i % palette.length] })));
  };

  // Total weight calculation
  const totalWeight = entries.reduce((acc, e) => acc + (Number(e.weight) || 1), 0);

  // Draw Wheel on Canvas
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 16;

    ctx.clearRect(0, 0, width, height);

    if (entries.length === 0 || totalWeight === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Add entries to build wheel", centerX, centerY);
      return;
    }

    let startAngle = currentAngleRef.current;

    // Draw Slices
    entries.forEach((entry) => {
      const sliceWeight = Number(entry.weight) || 1;
      const sliceAngle = (sliceWeight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      ctx.fillStyle = entry.color || "#6366f1";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text label
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "#ffffff";
      ctx.font = entries.length > 30 ? "10px Inter, sans-serif" : "bold 13px Inter, sans-serif";
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 3;

      // Truncate long text
      let text = entry.text;
      if (text.length > 20) text = text.substring(0, 18) + "…";
      ctx.fillText(text, radius - 20, 4);
      ctx.restore();

      startAngle = endAngle;
    });

    // Draw Outer Rim Shadow
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center Cap / Logo
    ctx.beginPath();
    ctx.arc(centerX, centerY, 36, 0, 2 * Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (centerLogo) {
      const img = new Image();
      img.src = centerLogo;
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
      ctx.clip();
      ctx.drawImage(img, centerX - 32, centerY - 32, 64, 64);
      ctx.restore();
    } else {
      ctx.fillStyle = "#6366f1";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🎯", centerX, centerY + 6);
    }
  }, [entries, totalWeight, centerLogo]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  // Load saved wheel by ID if present
  useEffect(() => {
    if (!id) return;
    const fetchWheel = async () => {
      try {
        const { data } = await api.get(`/wheel/${id}`);
        if (data && data.config) {
          setWheelTitle(data.config.title || "Spin the Wheel");
          if (Array.isArray(data.config.entries)) {
            setEntries(data.config.entries);
            setRawText(data.config.entries.map(e => e.text).join("\n"));
          }
          if (data.config.spinDuration) setSpinDuration(data.config.spinDuration);
          if (data.config.palette) setSelectedPalette(data.config.palette);
          if (data.config.logo) setCenterLogo(data.config.logo);
        }
      } catch (err) {
        setError("Failed to load requested wheel.");
      }
    };
    fetchWheel();
  }, [id]);

  // Spin Logic
  const handleSpin = () => {
    if (spinning || entries.length === 0 || totalWeight === 0) return;
    stopAllSounds();
    setSpinning(true);
    setWinner(null);
    setShowWinnerModal(false);

    // Calculate random target stopping angle
    const extraRounds = 5 + Math.floor(Math.random() * 5); // 5 to 10 full rotations
    const randomAngle = Math.random() * 2 * Math.PI;
    const totalRotation = extraRounds * 2 * Math.PI + randomAngle;

    const startAngle = currentAngleRef.current;
    const targetAngle = startAngle + totalRotation;
    const startTime = performance.now();
    const durationMs = spinDuration * 1000;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      
      // Cubic ease-out deceleration physics
      const easeOut = 1 - Math.pow(1 - progress, 3);
      currentAngleRef.current = startAngle + (targetAngle - startAngle) * easeOut;

      drawWheel();

      // Sound tick logic on segment crossing (throttled to max 25-30 ticks/sec for large entry counts)
      if (soundEnabled) {
        try {
          const pointerAngle = (1.5 * Math.PI - (currentAngleRef.current % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI);
          let accumulatedAngle = 0;
          let currentSector = 0;

          for (let i = 0; i < entries.length; i++) {
            const sliceAngle = ((Number(entries[i].weight) || 1) / totalWeight) * 2 * Math.PI;
            if (pointerAngle >= accumulatedAngle && pointerAngle < accumulatedAngle + sliceAngle) {
              currentSector = i;
              break;
            }
            accumulatedAngle += sliceAngle;
          }

          if (currentSector !== lastSoundSectorRef.current) {
            const nowTime = performance.now();
            if (nowTime - lastTickTimeRef.current >= 35) { // min 35ms between ticks
              playSound("tick");
              lastTickTimeRef.current = nowTime;
            }
            lastSoundSectorRef.current = currentSector;
          }
        } catch (audioErr) {
          console.warn("⚠️ Tick sound error caught:", audioErr);
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        stopAllSounds();
        
        // Determine Winning Segment at top pointer (270deg / 1.5 * Math.PI)
        const pointerAngle = (1.5 * Math.PI - (currentAngleRef.current % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI);
        let acc = 0;
        let selectedWinner = entries[0];
        for (let i = 0; i < entries.length; i++) {
          const sliceAngle = ((Number(entries[i].weight) || 1) / totalWeight) * 2 * Math.PI;
          if (pointerAngle >= acc && pointerAngle < acc + sliceAngle) {
            selectedWinner = entries[i];
            break;
          }
          acc += sliceAngle;
        }
        setWinner(selectedWinner);
        setShowWinnerModal(true);

        if (soundEnabled) {
          setTimeout(() => {
            stopAllSounds();
            playSound("win");
          }, 40);
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // Remove Winning Entry (Elimination Raffle Mode)
  const handleRemoveWinner = () => {
    if (!winner) return;
    const updated = entries.filter(e => e.text !== winner.text);
    setEntries(updated);
    setRawText(updated.map(e => e.text).join("\n"));
    setShowWinnerModal(false);
    setWinner(null);
  };

  // Save Wheel Configuration & Get Shareable Link
  const handleSaveWheel = async () => {
    setSaving(true);
    setError(null);
    try {
      const config = {
        title: wheelTitle,
        entries,
        spinDuration,
        palette: selectedPalette,
        logo: centerLogo
      };
      const { data } = await api.post("/wheel", { title: wheelTitle, entries, config });
      const fullLink = `${window.location.origin}/wheel/${data.id}`;
      setShareUrl(fullLink);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save wheel.");
    } finally {
      setSaving(false);
    }
  };

  // Run 1,000 Spin Randomness Test Simulation
  const runRandomnessTest = () => {
    if (entries.length === 0 || totalWeight === 0) return;
    setSimulating(true);
    setTimeout(() => {
      const counts = {};
      entries.forEach(e => { counts[e.text] = 0; });

      const runs = 10000;
      for (let r = 0; r < runs; r++) {
        const rand = Math.random() * totalWeight;
        let acc = 0;
        for (let i = 0; i < entries.length; i++) {
          acc += (Number(entries[i].weight) || 1);
          if (rand <= acc) {
            counts[entries[i].text] += 1;
            break;
          }
        }
      }

      const results = entries.map(e => ({
        text: e.text,
        weight: Number(e.weight) || 1,
        expectedPct: (((Number(e.weight) || 1) / totalWeight) * 100).toFixed(1),
        actualCount: counts[e.text],
        actualPct: ((counts[e.text] / runs) * 100).toFixed(1)
      }));

      setSimResults({ runs, results });
      setSimulating(false);
    }, 300);
  };

  // CSV / File Import
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      handleRawTextChange(text);
    };
    reader.readAsText(file);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@600;700&display=swap');

        .wheel-root {
          min-height: 100vh;
          background: #FAFAF8;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 16px 48px;
        }

        .wheel-nav {
          width: 100%;
          max-width: 1100px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          margin-bottom: 24px;
        }

        .wheel-nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #1e293b;
        }

        .wheel-nav-logo-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #f59e0b, #10b981);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #fff;
        }

        .wheel-nav-title {
          font-size: 17px;
          font-weight: 700;
          font-family: 'Space Grotesk', sans-serif;
          color: #0f172a;
        }

        .wheel-container {
          width: 100%;
          max-width: 1100px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }

        @media (min-width: 900px) {
          .wheel-container {
            grid-template-columns: 1.1fr 0.9fr;
          }
        }

        .wheel-stage-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.04);
          position: relative;
        }

        .wheel-pointer {
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 24px solid #ef4444;
          position: absolute;
          top: 36px;
          z-index: 10;
          filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25));
        }

        .wheel-canvas {
          max-width: 100%;
          height: auto;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .wheel-canvas:hover {
          transform: scale(1.01);
        }

        .spin-action-btn {
          margin-top: 24px;
          padding: 14px 48px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-weight: 800;
          font-size: 16px;
          font-family: 'Space Grotesk', sans-serif;
          border: none;
          border-radius: 100px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(99,102,241,0.35);
          transition: all 0.2s;
        }

        .spin-action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99,102,241,0.5);
        }

        .spin-action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wheel-panel-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 10px 30px -5px rgba(0,0,0,0.04);
        }

        .panel-tabs {
          display: flex;
          gap: 6px;
          background: #f1f5f9;
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 20px;
        }

        .panel-tab-btn {
          flex: 1;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }

        .panel-tab-btn.active {
          background: #ffffff;
          color: #4f46e5;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }

        .entries-textarea {
          width: 100%;
          height: 180px;
          padding: 12px 14px;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          outline: none;
          resize: vertical;
        }

        .entries-textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
        }

        .weight-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .weight-input {
          width: 60px;
          padding: 4px 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 12px;
          text-align: center;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.6);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .winner-card {
          background: #ffffff;
          border-radius: 24px;
          padding: 36px 28px;
          text-align: center;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0,0,0,0.2);
          animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes popIn {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }

        .winner-name {
          font-size: 28px;
          font-weight: 800;
          color: #4f46e5;
          margin: 12px 0 24px;
          word-break: break-word;
        }
      `}</style>

      <div className="wheel-root">
        {/* Nav */}
        <nav className="wheel-nav">
          <Link to="/" className="wheel-nav-logo">
            <div className="wheel-nav-logo-icon">🎡</div>
            <span className="wheel-nav-title">{wheelTitle}</span>
          </Link>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleSaveWheel}
              disabled={saving}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                background: "#4f46e5",
                color: "#fff",
                border: "none",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {saving ? "Saving…" : "💾 Save & Share"}
            </button>
            <Link to="/tools" style={{
              padding: "8px 16px", borderRadius: "10px", background: "#fff",
              border: "1px solid #e2e8f0", color: "#64748b", textDecoration: "none",
              fontWeight: 600, fontSize: "12px"
            }}>
              ← Tools
            </Link>
          </div>
        </nav>

        {shareUrl && (
          <div style={{
            width: "100%", maxWidth: "1100px", marginBottom: "20px", padding: "12px 16px",
            background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "12px",
            display: "flex", alignItems: "center", justifyBetween: "space-between", gap: "10px"
          }}>
            <span style={{ fontSize: "13px", color: "#047857", fontWeight: 600 }}>
              🔗 Shareable Wheel Link: <strong style={{ fontFamily: "monospace" }}>{shareUrl}</strong>
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              style={{
                padding: "6px 14px", background: "#059669", color: "#fff", border: "none",
                borderRadius: "8px", fontWeight: 700, fontSize: "11px", cursor: "pointer"
              }}
            >
              {shareCopied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* Main Workspace */}
        <div className="wheel-container">
          {/* Wheel Stage */}
          <div className="wheel-stage-card">
            <div className="wheel-pointer" />
            <canvas
              ref={canvasRef}
              width={440}
              height={440}
              className="wheel-canvas"
              onClick={handleSpin}
            />
            <button
              className="spin-action-btn"
              onClick={handleSpin}
              disabled={spinning || entries.length === 0}
            >
              {spinning ? "Spinning…" : "SPIN THE WHEEL 🎯"}
            </button>
          </div>

          {/* Configuration Panel */}
          <div className="wheel-panel-card">
            <div className="panel-tabs">
              <button
                className={`panel-tab-btn ${activeTab === "entries" ? "active" : ""}`}
                onClick={() => setActiveTab("entries")}
              >
                Entries ({entries.length})
              </button>
              <button
                className={`panel-tab-btn ${activeTab === "weights" ? "active" : ""}`}
                onClick={() => setActiveTab("weights")}
              >
                Weights
              </button>
              <button
                className={`panel-tab-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                Customization
              </button>
              <button
                className={`panel-tab-btn ${activeTab === "test" ? "active" : ""}`}
                onClick={() => setActiveTab("test")}
              >
                Fairness Test
              </button>
            </div>

            {/* TAB 1: ENTRIES */}
            {activeTab === "entries" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>
                    Type or paste entries (one per line):
                  </label>
                  <label style={{ fontSize: "11px", color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>
                    📁 Import List / CSV
                    <input type="file" accept=".txt,.csv" onChange={handleFileUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <textarea
                  className="entries-textarea"
                  value={rawText}
                  onChange={(e) => handleRawTextChange(e.target.value)}
                  placeholder="Enter names or items here..."
                />
              </div>
            )}

            {/* TAB 2: WEIGHTS */}
            {activeTab === "weights" && (
              <div style={{ maxHeight: "280px", overflowY: "auto" }}>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Adjust segment weight multipliers (higher weight = higher chance of winning):
                </p>
                {entries.map((entry, idx) => (
                  <div className="weight-row" key={idx}>
                    <span style={{ fontWeight: 600, color: entry.color }}>● {entry.text}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={entry.weight || 1}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setEntries(prev => prev.map((item, i) => i === idx ? { ...item, weight: val } : item));
                        }}
                        className="weight-input"
                      />
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        ({(((entry.weight || 1) / totalWeight) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: CUSTOMIZATION */}
            {activeTab === "settings" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                    Wheel Title:
                  </label>
                  <input
                    type="text"
                    value={wheelTitle}
                    onChange={(e) => setWheelTitle(e.target.value)}
                    style={{
                      width: "100%", padding: "8px 12px", borderRadius: "8px",
                      border: "1px solid #cbd5e1", fontSize: "13px"
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                    Color Palette:
                  </label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {Object.keys(PALETTES).map(pKey => (
                      <button
                        key={pKey}
                        onClick={() => applyPalette(pKey)}
                        style={{
                          padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                          border: selectedPalette === pKey ? "2px solid #6366f1" : "1px solid #cbd5e1",
                          background: selectedPalette === pKey ? "#eef2ff" : "#fff",
                          cursor: "pointer", textTransform: "capitalize"
                        }}
                      >
                        {pKey}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                    Spin Duration: {spinDuration}s
                  </label>
                  <input
                    type="range" min="3" max="15" value={spinDuration}
                    onChange={(e) => setSpinDuration(parseInt(e.target.value))}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", itemsCenter: "center", gap: "10px" }}>
                  <input
                    type="checkbox" id="sound-toggle" checked={soundEnabled}
                    onChange={(e) => setSoundEnabled(e.target.checked)}
                  />
                  <label htmlFor="sound-toggle" style={{ fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                    🔊 Enable Spin & Win Sound Effects
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: FAIRNESS TEST */}
            {activeTab === "test" && (
              <div>
                <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "12px" }}>
                  Verify randomness fairness by running a 10,000-spin automated simulation:
                </p>
                <button
                  onClick={runRandomnessTest}
                  disabled={simulating}
                  style={{
                    padding: "8px 16px", background: "#10b981", color: "#fff", border: "none",
                    borderRadius: "8px", fontWeight: 700, fontSize: "12px", cursor: "pointer", marginBottom: "16px"
                  }}
                >
                  {simulating ? "Simulating 10,000 Spins…" : "⚡ Run 10,000 Spin Test"}
                </button>

                {simResults && (
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#047857", marginBottom: "8px" }}>
                      Simulation Completed ({simResults.runs.toLocaleString()} Spins):
                    </div>
                    {simResults.results.map((res, idx) => (
                      <div key={idx} style={{ marginBottom: "6px", fontSize: "11px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span><strong>{res.text}</strong> ({res.expectedPct}% expected)</span>
                          <span>{res.actualPct}% ({res.actualCount} wins)</span>
                        </div>
                        <div style={{ height: "4px", background: "#e2e8f0", borderRadius: "2px", overflow: "hidden", marginTop: "2px" }}>
                          <div style={{ width: `${res.actualPct}%`, background: "#10b981", height: "100%" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WINNER ANNOUNCEMENT MODAL */}
        {showWinnerModal && winner && (
          <div className="modal-overlay">
            <div className="winner-card">
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b" }}>
                We Have A Winner!
              </h3>
              <div className="winner-name">{winner.text}</div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button
                  onClick={handleRemoveWinner}
                  style={{
                    padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none",
                    borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer"
                  }}
                >
                  🗑️ Remove Winner (Elimination)
                </button>
                <button
                  onClick={() => setShowWinnerModal(false)}
                  style={{
                    padding: "10px 18px", background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1",
                    borderRadius: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
