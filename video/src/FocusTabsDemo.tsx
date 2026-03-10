import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

// ── Design tokens ────────────────────────────────────────────────────────────
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

// ── Scene timing at 30fps (60 seconds = 1800 frames) ─────────────────────────
const T = {
  // Intro
  introDone:       90,   // 3s
  // Browser appear
  browserIn:      120,   // 4s
  browserFull:    210,   // 7s
  // Caption: "Too many tabs..."
  problemLabel:   210,   // 7s
  // Popup opens
  popupOpen:      390,   // 13s
  popupFull:      450,   // 15s
  // Analyze click
  analyzeClick:   570,   // 19s
  loadingStart:   600,   // 20s
  // Results
  resultsStart:   840,   // 28s
  resultsFull:   1080,   // 36s
  // Archive
  archiveClick:  1110,   // 37s
  tabsGone:      1200,   // 40s
  // Archive panel demo
  archivePanel:  1260,   // 42s
  archiveDone:   1470,   // 49s
  // Outro
  outroStart:    1530,   // 51s
};

// ── Captions ──────────────────────────────────────────────────────────────────
const CAPTIONS: { start: number; end: number; text: string }[] = [
  { start: 180,  end: 390,  text: "You have 8 browser tabs open — which ones actually matter?" },
  { start: 450,  end: 570,  text: "Click Analyze My Tabs to let AI figure it out" },
  { start: 600,  end: 840,  text: "FocusTabs reads your tabs and sends them to your AI of choice" },
  { start: 840,  end: 1080, text: "AI identifies which tabs are irrelevant to your current work" },
  { start: 1080, end: 1200, text: "One click archives them — they're never lost, just out of the way" },
  { start: 1260, end: 1470, text: "Restore any tab from the Archive panel at any time" },
  { start: 1530, end: 1800, text: "Install FocusTabs free on the Chrome Web Store" },
];

// ── Demo data ─────────────────────────────────────────────────────────────────
const TABS = [
  { title: "focustabs — GitHub",          url: "github.com",            active: true  },
  { title: "r/programming",               url: "reddit.com",            active: false },
  { title: "Lo-fi hip hop • YouTube",     url: "youtube.com",           active: false },
  { title: "Twitter / X",                 url: "x.com",                 active: false },
  { title: "Hacker News",                 url: "news.ycombinator.com",  active: false },
  { title: "Array.prototype.flat — MDN",  url: "developer.mozilla.org", active: false },
  { title: "Stack Overflow",              url: "stackoverflow.com",     active: false },
  { title: "Inbox (3) — Gmail",           url: "gmail.com",             active: false },
];

const SUGGESTIONS = [
  { title: "r/programming",           reason: "Social media — not related to your dev work" },
  { title: "Lo-fi hip hop • YouTube", reason: "Entertainment — potential distraction" },
  { title: "Twitter / X",             reason: "Social media — review after your session" },
  { title: "Inbox (3) — Gmail",       reason: "Email — schedule a dedicated inbox time" },
];

const ARCHIVED = [
  { title: "r/programming",           time: "Archived just now" },
  { title: "Lo-fi hip hop • YouTube", time: "Archived just now" },
  { title: "Twitter / X",             time: "Archived just now" },
  { title: "Inbox (3) — Gmail",       time: "Archived just now" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function fadeIn(frame: number, start: number, dur = 20): number {
  return clamp01(interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
}

function fadeOut(frame: number, start: number, dur = 15): number {
  return clamp01(interpolate(frame, [start, start + dur], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
}

function pop(frame: number, start: number): number {
  return spring({ frame: frame - start, fps: 30, config: { damping: 22, stiffness: 180, mass: 0.8 } });
}

// ── Sub-components (at 1280×720 logical scale) ────────────────────────────────

const MonitorIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
  </svg>
);

const Spinner: React.FC<{ frame: number }> = ({ frame }) => {
  const rotation = interpolate(frame, [0, 30], [0, 360], { extrapolateRight: "extend" });
  return (
    <div style={{ textAlign: "center", padding: "28px 16px" }}>
      <p style={{ color: C.muted, fontSize: 13, marginBottom: 16, fontFamily: "inherit" }}>
        Analyzing your tabs…
      </p>
      <div style={{ width: 28, height: 28, borderRadius: "50%", margin: "0 auto", position: "relative",
        background: `conic-gradient(from ${rotation}deg, #6366f1 0%, #8b5cf6 30%, transparent 30%)` }}>
        <div style={{ position: "absolute", inset: 5, background: C.bg, borderRadius: "50%" }} />
      </div>
    </div>
  );
};

const SuggestionItem: React.FC<{
  title: string; reason: string; checked: boolean; opacity?: number; ty?: number;
}> = ({ title, reason, checked, opacity = 1, ty = 0 }) => (
  <li style={{
    display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px",
    background: C.surface,
    border: `1px solid ${checked ? "rgba(99,102,241,0.4)" : C.border}`,
    borderRadius: 10, listStyle: "none", opacity, transform: `translateY(${ty}px)`,
    boxShadow: checked ? "0 0 0 2px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.06)",
  }}>
    <div style={{
      marginTop: 2, width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      border: `2px solid ${checked ? C.accent : C.border}`,
      background: checked ? C.accent : "white",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.4 }}>{reason}</div>
    </div>
  </li>
);

const FocusTabsPopup: React.FC<{ frame: number; showArchive?: boolean }> = ({ frame, showArchive = false }) => {
  const showLoading  = frame >= T.analyzeClick && frame < T.resultsStart;
  const showResults  = frame >= T.resultsStart && !showArchive;
  const allChecked   = frame >= T.archiveClick;

  const resultOpacity = (i: number) => fadeIn(frame, T.resultsStart + i * 20, 22);
  const resultTy      = (i: number) => interpolate(pop(frame, T.resultsStart + i * 20), [0, 1], [14, 0]);

  const archivePulse = allChecked && frame < T.archiveClick + 20
    ? interpolate(pop(frame, T.archiveClick), [0, 1], [1, 1.04])
    : 1;

  const activeTab = showArchive ? "archive" : "analyze";

  return (
    <div style={{
      width: 360, borderRadius: 12, overflow: "hidden",
      boxShadow: "0 12px 48px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.14)",
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
          <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 6, padding: "5px 7px", fontSize: 14, lineHeight: 1 }}>⚙</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: "flex", gap: 3, background: C.surface, padding: "8px 12px", borderBottom: `1px solid ${C.border}` }}>
        {(["Analyze", "Chat", "Archive"] as const).map((label) => {
          const isActive = (label === "Archive" && activeTab === "archive") || (label === "Analyze" && activeTab === "analyze");
          return (
            <button key={label} style={{
              flex: 1, padding: "6px 10px", border: "none", borderRadius: 6,
              background: isActive ? C.gradient : "transparent",
              color: isActive ? "white" : C.muted,
              fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: "pointer", fontFamily: "inherit",
            }}>{label}</button>
          );
        })}
      </div>

      {/* Panel */}
      <div style={{ padding: 14 }}>

        {/* Archive panel */}
        {showArchive && (
          <>
            {ARCHIVED.map((item, i) => {
              const itemOpacity = fadeIn(frame, T.archivePanel + i * 18, 20);
              return (
                <div key={item.title} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 10,
                  marginBottom: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  opacity: itemOpacity,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: C.gradient, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{item.time}</div>
                  </div>
                  <div style={{
                    background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6,
                    padding: "4px 9px", fontSize: 11, fontWeight: 500, color: C.text, cursor: "pointer", flexShrink: 0,
                  }}>Restore</div>
                </div>
              );
            })}
          </>
        )}

        {/* Idle state */}
        {!showLoading && !showResults && !showArchive && (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px", marginBottom: 11, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 3 }}>8 tabs open</p>
              <p style={{ fontSize: 12, color: C.muted }}>Focus: <span style={{ color: C.text, fontWeight: 500 }}>focustabs — GitHub</span></p>
            </div>
            <button style={{ width: "100%", padding: "10px 16px", background: C.gradient, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit" }}>
              Analyze My Tabs
            </button>
          </>
        )}

        {/* Loading */}
        {showLoading && <Spinner frame={frame - T.loadingStart} />}

        {/* Results */}
        {showResults && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              Suggested to archive
            </p>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", opacity: fadeIn(frame, T.resultsStart, 20) }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>Workflow: Software Development</p>
              <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>GitHub + MDN + Stack Overflow signal active coding. Archive distractions to stay in flow.</p>
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {SUGGESTIONS.map((s, i) => (
                <SuggestionItem key={s.title} title={s.title} reason={s.reason}
                  checked={allChecked} opacity={resultOpacity(i)} ty={resultTy(i)} />
              ))}
            </ul>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button style={{
                width: "100%", padding: "10px 16px", background: C.gradient, color: "white",
                border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600,
                fontFamily: "inherit", transform: `scale(${archivePulse})`,
                opacity: allChecked ? 1 : 0.5,
              }}>Archive &amp; Close (4)</button>
              <button style={{ width: "100%", padding: "9px 16px", background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const BrowserMockup: React.FC<{ frame: number }> = ({ frame }) => {
  const tabsGone    = frame >= T.tabsGone;
  const showArchive = frame >= T.archivePanel;
  const keepTabs    = TABS.filter(t => t.active || t.url.includes("mozilla") || t.url.includes("stackoverflow") || t.url.includes("news"));
  const visibleTabs = tabsGone ? keepTabs : TABS;

  return (
    <div style={{ width: 1100, background: "#dee1e6", borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.32), 0 4px 16px rgba(0,0,0,0.16)" }}>
      {/* Title bar */}
      <div style={{ background: "#3c3c3c", height: 38, display: "flex", alignItems: "center", padding: "0 16px", gap: 8 }}>
        {["#ff5f57","#febc2e","#28c840"].map(c => (
          <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />
        ))}
      </div>
      {/* Tab bar */}
      <div style={{ background: "#dee1e6", display: "flex", alignItems: "flex-end", padding: "6px 12px 0", gap: 2 }}>
        {visibleTabs.map((tab) => (
          <div key={tab.title} style={{
            background: tab.active ? "#ffffff" : "rgba(255,255,255,0.55)",
            borderRadius: "8px 8px 0 0", padding: "7px 16px 7px 12px",
            fontSize: 12, color: tab.active ? "#1e293b" : "#5f6368",
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            maxWidth: 160, minWidth: 80, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            fontWeight: tab.active ? 500 : 400, flexShrink: tab.active ? 0 : 1,
          }}>{tab.title}</div>
        ))}
        {!tabsGone && <div style={{ color: "#5f6368", fontSize: 11, paddingBottom: 6, paddingLeft: 4, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>+1 more</div>}
      </div>
      {/* Address bar */}
      <div style={{ background: "#ffffff", padding: "10px 16px", borderBottom: "1px solid #e0e0e0" }}>
        <div style={{ background: "#f1f3f4", borderRadius: 22, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8, maxWidth: 600, margin: "0 auto" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
          <span style={{ fontSize: 13, color: "#202124", fontFamily: "inherit" }}>github.com/focustabs/focustabs</span>
        </div>
      </div>
      {/* Page content */}
      <div style={{ background: "#ffffff", height: 280, padding: "24px 48px", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 24, height: "100%" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.gradient }} />
              <span style={{ fontSize: 14, color: "#0969da", fontFamily: "inherit" }}>focustabs / focustabs</span>
            </div>
            <div style={{ height: 2, background: "#e1e4e8", marginBottom: 16 }} />
            {[140,120,100,80,90,110].map((w, i) => (
              <div key={i} style={{ height: 10, background: "#e1e4e8", borderRadius: 5, marginBottom: 8, width: `${w}%`, maxWidth: `${w * 4}px`, opacity: 0.6 + i * 0.04 }} />
            ))}
          </div>
          <div style={{ width: 220 }}>
            {["MIT License","48 stars","12 forks","JavaScript 87%"].map(label => (
              <div key={label} style={{ fontSize: 12, color: "#57606a", fontFamily: "inherit", padding: "6px 0", borderBottom: "1px solid #e1e4e8" }}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Caption overlay ───────────────────────────────────────────────────────────
const Caption: React.FC<{ frame: number }> = ({ frame }) => {
  const active = CAPTIONS.find(c => frame >= c.start && frame < c.end);
  if (!active) return null;

  const fadeInOp  = fadeIn(frame, active.start, 12);
  const fadeOutOp = fadeOut(frame, active.end - 18, 18);
  const opacity   = Math.min(fadeInOp, fadeOutOp);

  return (
    <div style={{
      position: "absolute",
      bottom: 52,               // sits above bottom edge at 1080p
      left: "50%",
      transform: "translateX(-50%)",
      opacity,
      maxWidth: 1400,
      textAlign: "center",
      zIndex: 100,
      pointerEvents: "none",
    }}>
      <div style={{
        display: "inline-block",
        background: "rgba(0,0,0,0.72)",
        color: "white",
        fontSize: 28,
        fontWeight: 500,
        padding: "14px 32px",
        borderRadius: 10,
        backdropFilter: "blur(4px)",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif',
        lineHeight: 1.4,
        letterSpacing: "-0.01em",
      }}>
        {active.text}
      </div>
    </div>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const FocusTabsDemo: React.FC = () => {
  const frame = useCurrentFrame();

  const inIntro   = frame <= T.introDone + 20;
  const inBrowser = frame >= T.browserIn;
  const inPopup   = frame >= T.popupOpen;
  const inOutro   = frame >= T.outroStart;
  const showArchivePanel = frame >= T.archivePanel && frame < T.outroStart;

  // Intro
  const introOp    = frame < T.introDone ? fadeIn(frame, 0, 20) : fadeOut(frame, T.introDone, 18);
  const taglineOp  = fadeIn(frame, 28, 25);

  // Browser
  const browserOp  = inBrowser ? fadeIn(frame, T.browserIn, 25) : 0;
  const browserTY  = inBrowser ? interpolate(pop(frame, T.browserIn), [0,1], [50,0]) : 50;

  // Popup
  const popupOp    = inPopup   ? fadeIn(frame, T.popupOpen, 18) : 0;
  const popupTY    = inPopup   ? interpolate(pop(frame, T.popupOpen), [0,1], [-24, 0]) : -24;

  // Outro
  const outroOp    = inOutro   ? fadeIn(frame, T.outroStart, 22) : 0;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>

      {/* Decorative rings */}
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          position: "absolute", borderRadius: "50%",
          width: 300 + i * 160, height: 300 + i * 160,
          border: "1px solid rgba(99,102,241,0.07)",
          top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", pointerEvents: "none",
        }} />
      ))}

      {/* ── Intro ── */}
      {inIntro && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          opacity: introOp, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
            <div style={{
              width: 84, height: 84, borderRadius: 22,
              background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 12px 40px rgba(99,102,241,0.55)",
            }}>
              <MonitorIcon size={42} />
            </div>
            <span style={{
              fontSize: 72, fontWeight: 800, color: "white",
              letterSpacing: "-0.03em",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            }}>FocusTabs</span>
          </div>
          <p style={{
            fontSize: 30, color: "rgba(255,255,255,0.72)", fontWeight: 400,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
            opacity: taglineOp,
          }}>
            Smart tab cleanup powered by AI
          </p>
        </div>
      )}

      {/* ── Browser + Popup scene ── */}
      {inBrowser && (
        <div style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          opacity: browserOp,
        }}>
          {/* Scale the 1280×720 content up to 1920×1080 */}
          <div style={{
            position: "absolute",
            width: 1280, height: 720,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%) scale(1.5)",
            transformOrigin: "center",
          }}>
            {/* Browser */}
            <div style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(-56%, -50%) translateY(${browserTY}px)`,
            }}>
              <BrowserMockup frame={frame} />
            </div>

            {/* Popup */}
            {inPopup && (
              <div style={{
                position: "absolute",
                left: "50%", top: "50%",
                transform: `translate(22%, -52%) translateY(${popupTY}px)`,
                opacity: popupOp,
                zIndex: 10,
              }}>
                <FocusTabsPopup frame={frame} showArchive={showArchivePanel} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Outro ── */}
      {inOutro && (
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          opacity: outroOp, zIndex: 30,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(99,102,241,0.55)" }}>
              <MonitorIcon size={36} />
            </div>
            <span style={{ fontSize: 60, fontWeight: 800, color: "white", letterSpacing: "-0.03em", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
              FocusTabs
            </span>
          </div>

          <p style={{ fontSize: 32, color: "rgba(255,255,255,0.88)", fontWeight: 500, marginBottom: 16, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
            More focus. Less clutter.
          </p>

          {/* CTA badge */}
          <div style={{
            marginTop: 8,
            background: C.gradient,
            borderRadius: 16,
            padding: "18px 48px",
            boxShadow: "0 8px 32px rgba(99,102,241,0.50)",
            opacity: fadeIn(frame, T.outroStart + 20, 20),
          }}>
            <p style={{
              fontSize: 26, fontWeight: 700, color: "white",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
              letterSpacing: "-0.01em",
            }}>
              Install Free on the Chrome Web Store
            </p>
          </div>

          <p style={{ marginTop: 24, fontSize: 18, color: "rgba(255,255,255,0.4)", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif' }}>
            Works with OpenAI · Anthropic · Google Gemini
          </p>
        </div>
      )}

      {/* ── Caption overlay (at 1920×1080 coordinates) ── */}
      <Caption frame={frame} />
    </AbsoluteFill>
  );
};
