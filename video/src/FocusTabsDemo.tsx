import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  AbsoluteFill,
  Easing,
} from "remotion";

// ── Design tokens (matches popup.css) ───────────────────────────────────────
const C = {
  accent: "#6366f1",
  purple: "#8b5cf6",
  bg: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#1e293b",
  muted: "#64748b",
  gradient: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
};

// ── Scene timing (frames @ 30fps) ────────────────────────────────────────────
const T = {
  introDone:     60,   // 2s
  browserIn:     90,   // 3s
  browserFull:   150,  // 5s
  popupOpen:     240,  // 8s
  popupFull:     300,  // 10s
  analyzeClick:  390,  // 13s
  loadingStart:  420,  // 14s
  resultsStart:  540,  // 18s
  resultsFull:   720,  // 24s
  archiveClick:  750,  // 25s
  tabsGone:      810,  // 27s
  outroStart:    840,  // 28s
};

// ── Demo data ────────────────────────────────────────────────────────────────
const TABS = [
  { title: "focustabs — GitHub",           url: "github.com",               active: true  },
  { title: "r/programming",                url: "reddit.com",               active: false },
  { title: "Lo-fi hip hop • YouTube",      url: "youtube.com",              active: false },
  { title: "Twitter / X",                  url: "x.com",                    active: false },
  { title: "Hacker News",                  url: "news.ycombinator.com",     active: false },
  { title: "Array.prototype.flat — MDN",  url: "developer.mozilla.org",    active: false },
  { title: "Stack Overflow",               url: "stackoverflow.com",        active: false },
  { title: "Inbox (3) — Gmail",            url: "gmail.com",                active: false },
];

const SUGGESTIONS = [
  { title: "r/programming",           reason: "Social media — not relevant to your dev work" },
  { title: "Lo-fi hip hop • YouTube", reason: "Entertainment — potential distraction" },
  { title: "Twitter / X",             reason: "Social media — review after your session" },
  { title: "Inbox (3) — Gmail",       reason: "Email — schedule a dedicated inbox time" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

function fadeIn(frame: number, start: number, dur = 20): number {
  return clamp(interpolate(frame, [start, start + dur], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
}

function fadeOut(frame: number, start: number, dur = 15): number {
  return clamp(interpolate(frame, [start, start + dur], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }));
}

function slideUp(frame: number, start: number, fps = 30): number {
  return spring({ frame: frame - start, fps, config: { damping: 22, stiffness: 180, mass: 0.8 } });
}

// ── Sub-components ────────────────────────────────────────────────────────────

const MonitorIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const Spinner: React.FC<{ frame: number }> = ({ frame }) => {
  const rotation = interpolate(frame, [0, 30], [0, 360], { extrapolateRight: "extend" });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 16px" }}>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>
        Analyzing your tabs…
      </p>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: `conic-gradient(from ${rotation}deg, #6366f1 0%, #8b5cf6 30%, transparent 30%)`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 5,
          background: C.bg, borderRadius: "50%",
        }} />
      </div>
    </div>
  );
};

const SuggestionItem: React.FC<{
  title: string; reason: string; checked: boolean; opacity?: number; translateY?: number;
}> = ({ title, reason, checked, opacity = 1, translateY = 0 }) => (
  <li style={{
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 12px",
    background: C.surface,
    border: `1px solid ${checked ? "rgba(99,102,241,0.4)" : C.border}`,
    borderRadius: 10,
    boxShadow: checked
      ? "0 0 0 2px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.06)"
      : "0 1px 3px rgba(0,0,0,0.06)",
    opacity,
    transform: `translateY(${translateY}px)`,
    transition: "none",
    listStyle: "none",
  }}>
    <div style={{
      marginTop: 2, flex: "0 0 auto", width: 16, height: 16,
      borderRadius: 4, border: `2px solid ${checked ? C.accent : C.border}`,
      background: checked ? C.accent : "white",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {checked && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {title}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>
        {reason}
      </div>
    </div>
  </li>
);

const FocusTabsPopup: React.FC<{ frame: number }> = ({ frame }) => {
  const showLoading = frame >= T.analyzeClick && frame < T.resultsStart;
  const showResults = frame >= T.resultsStart;
  const allChecked  = frame >= T.archiveClick;
  const archiveCount = 4;

  // Results stagger: each item fades in 15 frames apart after resultsStart
  const resultOpacity = (i: number) => fadeIn(frame, T.resultsStart + i * 18, 20);
  const resultSlide   = (i: number) => {
    const p = slideUp(frame, T.resultsStart + i * 18);
    return interpolate(p, [0, 1], [12, 0]);
  };

  // Archive button pulse
  const archivePulse = allChecked
    ? interpolate(
        Math.sin(interpolate(frame - T.archiveClick, [0, 8], [0, Math.PI])),
        [-1, 1], [1, 1.03]
      )
    : 1;

  return (
    <div style={{
      width: 360, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
      background: C.bg,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif',
      fontSize: 13, color: C.text, lineHeight: 1.4,
    }}>
      {/* Header */}
      <div style={{ background: C.gradient, padding: "14px 16px 13px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <MonitorIcon />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.01em" }}>FocusTabs</span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.18)", borderRadius: 6,
            padding: "5px 7px", fontSize: 14, lineHeight: 1,
          }}>⚙</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{
        display: "flex", gap: 3, background: C.surface,
        padding: "8px 12px", borderBottom: `1px solid ${C.border}`,
      }}>
        {["Analyze", "Chat", "Archive"].map((label, i) => (
          <button key={label} style={{
            flex: 1, padding: "6px 10px", border: "none", borderRadius: 6,
            background: i === 0 ? C.gradient : "transparent",
            color: i === 0 ? "white" : C.muted,
            fontSize: 12, fontWeight: i === 0 ? 600 : 500,
            cursor: "pointer", fontFamily: "inherit",
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ padding: 14 }}>

        {/* Idle state */}
        {!showLoading && !showResults && (
          <>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "11px 13px", marginBottom: 11,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 3 }}>
                8 tabs open
              </p>
              <p style={{ fontSize: 12, color: C.muted }}>
                Focus: <span style={{ color: C.text, fontWeight: 500 }}>focustabs — GitHub</span>
              </p>
            </div>
            <button style={{
              width: "100%", padding: "10px 16px",
              background: C.gradient, color: "white",
              border: "none", borderRadius: 10, cursor: "pointer",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            }}>
              Analyze My Tabs
            </button>
          </>
        )}

        {/* Loading state */}
        {showLoading && <Spinner frame={frame - T.loadingStart} />}

        {/* Results state */}
        {showResults && (
          <>
            <p style={{
              fontSize: 11, fontWeight: 600, color: C.muted,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
            }}>
              Suggested to archive
            </p>

            {/* Workflow insight card */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "10px 12px", marginBottom: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              opacity: fadeIn(frame, T.resultsStart, 20),
            }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                Workflow: Software Development
              </p>
              <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
                GitHub + MDN + Stack Overflow suggest active coding. Archive distractions to stay in flow.
              </p>
            </div>

            {/* Suggestions list */}
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {SUGGESTIONS.map((s, i) => (
                <SuggestionItem
                  key={s.title}
                  title={s.title}
                  reason={s.reason}
                  checked={allChecked}
                  opacity={resultOpacity(i)}
                  translateY={resultSlide(i)}
                />
              ))}
            </ul>

            {/* Actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button style={{
                width: "100%", padding: "10px 16px",
                background: C.gradient, color: "white",
                border: "none", borderRadius: 10, cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                transform: `scale(${archivePulse})`,
                opacity: allChecked ? 1 : 0.55,
              }}>
                Archive &amp; Close ({archiveCount})
              </button>
              <button style={{
                width: "100%", padding: "9px 16px",
                background: C.surface, color: C.muted,
                border: `1px solid ${C.border}`, borderRadius: 10,
                cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              }}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Chrome-style browser mockup
const BrowserMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const tabsRemoved = frame >= T.tabsGone;
  const visibleTabs = tabsRemoved ? TABS.filter(t => t.active || t.url.includes("mozilla") || t.url.includes("stackoverflow") || t.url.includes("news")) : TABS;

  return (
    <div style={{
      width: 1100, background: "#dee1e6", borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 20px 60px rgba(0,0,0,0.30), 0 4px 16px rgba(0,0,0,0.15)",
    }}>
      {/* Title bar (traffic lights) */}
      <div style={{
        background: "#3c3c3c", height: 38, display: "flex", alignItems: "center",
        padding: "0 16px", gap: 8,
      }}>
        {["#ff5f57", "#febc2e", "#28c840"].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>

      {/* Tab bar */}
      <div style={{
        background: "#dee1e6", display: "flex", alignItems: "flex-end",
        padding: "6px 12px 0", gap: 2, overflowX: "hidden",
      }}>
        {visibleTabs.map((tab, i) => (
          <div key={tab.title} style={{
            background: tab.active ? "#ffffff" : "rgba(255,255,255,0.55)",
            borderRadius: "8px 8px 0 0",
            padding: "7px 16px 7px 12px",
            fontSize: 12, color: tab.active ? "#1e293b" : "#5f6368",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            maxWidth: 160, minWidth: 80,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontWeight: tab.active ? 500 : 400,
            flexShrink: tab.active ? 0 : 1,
            opacity: tabsRemoved && i > 0 && i < 4 ? 0 : 1,
          }}>
            {tab.title}
          </div>
        ))}
        {!tabsRemoved && (
          <div style={{
            color: "#5f6368", fontSize: 11, paddingBottom: 6, paddingLeft: 4, whiteSpace: "nowrap",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          }}>
            +1 more
          </div>
        )}
      </div>

      {/* Address bar */}
      <div style={{ background: "#ffffff", padding: "10px 16px", borderBottom: "1px solid #e0e0e0" }}>
        <div style={{
          background: "#f1f3f4", borderRadius: 22, padding: "6px 14px",
          display: "flex", alignItems: "center", gap: 8, maxWidth: 600, margin: "0 auto",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span style={{ fontSize: 13, color: "#202124", fontFamily: "inherit" }}>
            github.com/focustabs/focustabs
          </span>
        </div>
      </div>

      {/* Page content (simplified GitHub-style) */}
      <div style={{ background: "#ffffff", height: 280, padding: "24px 48px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 24, height: "100%" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.gradient }} />
              <span style={{ fontSize: 14, color: "#0969da", fontFamily: "inherit" }}>
                focustabs / focustabs
              </span>
            </div>
            <div style={{ height: 2, background: "#e1e4e8", marginBottom: 16 }} />
            {[140, 120, 100, 80, 90, 110].map((w, i) => (
              <div key={i} style={{
                height: 10, background: "#e1e4e8", borderRadius: 5,
                marginBottom: 8, width: `${w}%`, maxWidth: `${w * 4}px`,
                opacity: 0.6 + i * 0.05,
              }} />
            ))}
          </div>
          <div style={{ width: 220 }}>
            {["MIT License", "48 stars", "12 forks", "JavaScript 87%"].map((label) => (
              <div key={label} style={{
                fontSize: 12, color: "#57606a", fontFamily: "inherit",
                padding: "6px 0", borderBottom: "1px solid #e1e4e8",
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const FocusTabsDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase detection
  const inIntro      = frame < T.introDone;
  const inBrowser    = frame >= T.browserIn;
  const inPopup      = frame >= T.popupOpen;
  const inOutro      = frame >= T.outroStart;

  // Intro animations
  const introOpacity = inIntro
    ? fadeIn(frame, 0, 20)
    : fadeOut(frame, T.introDone - 5, 20);
  const introTagline = fadeIn(frame, 25, 25);

  // Browser animations
  const browserOpacity = inBrowser ? fadeIn(frame, T.browserIn, 25) : 0;
  const browserY = inBrowser
    ? interpolate(slideUp(frame, T.browserIn), [0, 1], [40, 0])
    : 40;

  // Popup animations
  const popupOpacity = inPopup ? fadeIn(frame, T.popupOpen, 18) : 0;
  const popupY = inPopup
    ? interpolate(slideUp(frame, T.popupOpen), [0, 1], [-20, 0])
    : -20;

  // Outro animations
  const outroOpacity = inOutro ? fadeIn(frame, T.outroStart, 20) : 0;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>

      {/* Intro card */}
      {(inIntro || frame < T.introDone + 20) && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          opacity: introOpacity, zIndex: 20,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            marginBottom: 20,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: C.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(99,102,241,0.5)",
            }}>
              <MonitorIcon size={28} />
            </div>
            <span style={{
              fontSize: 48, fontWeight: 800, color: "white",
              letterSpacing: "-0.03em",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}>
              FocusTabs
            </span>
          </div>
          <p style={{
            fontSize: 20, color: "rgba(255,255,255,0.7)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            opacity: introTagline, fontWeight: 400,
          }}>
            Smart tab cleanup powered by AI
          </p>
        </div>
      )}

      {/* Main scene: browser + popup */}
      {inBrowser && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          opacity: browserOpacity,
        }}>
          {/* Browser (slightly left-offset to make room for popup) */}
          <div style={{
            position: "absolute",
            left: "50%", top: "50%",
            transform: `translate(-56%, -50%) translateY(${browserY}px)`,
          }}>
            <BrowserMockup frame={frame} />
          </div>

          {/* Popup (overlaid top-right of browser) */}
          {inPopup && (
            <div style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(22%, -52%) translateY(${popupY}px)`,
              opacity: popupOpacity,
              zIndex: 10,
            }}>
              <FocusTabsPopup frame={frame} />
            </div>
          )}
        </div>
      )}

      {/* Outro */}
      {inOutro && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: outroOpacity, zIndex: 30,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: C.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(99,102,241,0.5)",
            }}>
              <MonitorIcon size={24} />
            </div>
            <span style={{
              fontSize: 40, fontWeight: 800, color: "white",
              letterSpacing: "-0.03em",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}>
              FocusTabs
            </span>
          </div>
          <p style={{
            fontSize: 22, color: "rgba(255,255,255,0.85)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            fontWeight: 500, marginBottom: 12,
          }}>
            More focus. Less clutter.
          </p>
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.5)",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          }}>
            Available on the Chrome Web Store
          </p>
        </div>
      )}

      {/* Subtle particle bg */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          width: 200 + i * 80,
          height: 200 + i * 80,
          borderRadius: "50%",
          border: "1px solid rgba(99,102,241,0.08)",
          top: "50%", left: "50%",
          transform: `translate(-50%, -50%)`,
          pointerEvents: "none",
        }} />
      ))}
    </AbsoluteFill>
  );
};
