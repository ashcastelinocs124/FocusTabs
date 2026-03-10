/**
 * Chrome Web Store screenshot generator
 * Produces 4 x 1280×800 PNGs in focustabs/screenshots/
 * Run: node screenshots/generate.js
 */

const puppeteer = require('/Users/ash/Desktop/FocusTabs/video/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname);
const W = 1280, H = 800;

// ── Shared inline styles (mirrors popup.css) ──────────────────────────────────
const CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", system-ui, sans-serif; font-size: 13px; color: #1e293b; line-height: 1.4; width: ${W}px; height: ${H}px; overflow: hidden; }
:root { --accent:#6366f1; --purple:#8b5cf6; --gradient:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%); --surface:#fff; --bg:#f8fafc; --border:#e2e8f0; --text:#1e293b; --muted:#64748b; --radius:10px; }
`;

// ── Browser chrome component (raw HTML string) ────────────────────────────────
function browserChrome(activeTabs = 8, tabNames = null) {
  const defaultTabs = ['focustabs — GitHub','r/programming','Lo-fi hip hop • YouTube','Twitter / X','Hacker News','Array.prototype.flat — MDN','Stack Overflow','Inbox (3) — Gmail'];
  const names = tabNames || defaultTabs.slice(0, activeTabs);
  const tabsHtml = names.map((t, i) => `
    <div style="background:${i===0?'#fff':'rgba(255,255,255,0.55)'};border-radius:8px 8px 0 0;padding:7px 16px 7px 12px;font-size:12px;color:${i===0?'#1e293b':'#5f6368'};max-width:155px;min-width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${i===0?500:400};flex-shrink:${i===0?0:1};">${t}</div>
  `).join('');
  return `
    <div style="width:100%;background:#dee1e6;border-radius:12px 12px 0 0;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.18);">
      <div style="background:#3c3c3c;height:36px;display:flex;align-items:center;padding:0 14px;gap:7px;">
        <div style="width:11px;height:11px;border-radius:50%;background:#ff5f57;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:#febc2e;"></div>
        <div style="width:11px;height:11px;border-radius:50%;background:#28c840;"></div>
      </div>
      <div style="background:#dee1e6;display:flex;align-items:flex-end;padding:5px 10px 0;gap:2px;overflow:hidden;">
        ${tabsHtml}
        ${activeTabs > names.length ? `<div style="color:#5f6368;font-size:11px;padding-bottom:5px;padding-left:4px;">+${activeTabs - names.length} more</div>` : ''}
      </div>
      <div style="background:#fff;padding:9px 14px;border-bottom:1px solid #e0e0e0;">
        <div style="background:#f1f3f4;border-radius:20px;padding:5px 13px;display:flex;align-items:center;gap:7px;max-width:560px;margin:0 auto;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5f6368" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span style="font-size:13px;color:#202124;">github.com/focustabs/focustabs</span>
        </div>
      </div>
      <div style="background:#fff;height:240px;padding:22px 42px;overflow:hidden;">
        <div style="display:flex;gap:22px;height:100%;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:11px;">
              <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);"></div>
              <span style="font-size:14px;color:#0969da;">focustabs / focustabs</span>
            </div>
            <div style="height:2px;background:#e1e4e8;margin-bottom:14px;"></div>
            ${[140,120,100,80,90,110].map(w=>`<div style="height:9px;background:#e1e4e8;border-radius:4px;margin-bottom:7px;width:${w}%;max-width:${w*3.6}px;opacity:.65;"></div>`).join('')}
          </div>
          <div style="width:200px;">
            ${['MIT License','48 stars','12 forks','JavaScript 87%'].map(l=>`<div style="font-size:12px;color:#57606a;padding:5px 0;border-bottom:1px solid #e1e4e8;">${l}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Popup component ───────────────────────────────────────────────────────────
function popupShell(innerHtml, activeTab = 'analyze') {
  const tabs = ['Analyze','Chat','Archive'];
  const tabNav = tabs.map(t => {
    const key = t.toLowerCase();
    const active = key === activeTab;
    return `<button style="flex:1;padding:6px 10px;border:none;border-radius:6px;background:${active?'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)':'transparent'};color:${active?'white':'#64748b'};font-size:12px;font-weight:${active?600:500};cursor:pointer;font-family:inherit;">${t}</button>`;
  }).join('');

  return `
    <div style="width:360px;border-radius:14px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.28),0 2px 8px rgba(0,0,0,0.12);background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif;font-size:13px;color:#1e293b;line-height:1.4;">
      <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:14px 16px 13px;color:white;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            <span style="font-weight:700;font-size:15px;letter-spacing:-0.01em;">FocusTabs</span>
          </div>
          <div style="background:rgba(255,255,255,0.18);border-radius:6px;padding:5px 7px;font-size:14px;line-height:1;">⚙</div>
        </div>
      </div>
      <div style="display:flex;gap:3px;background:#fff;padding:8px 12px;border-bottom:1px solid #e2e8f0;">${tabNav}</div>
      <div style="padding:14px;">${innerHtml}</div>
    </div>
  `;
}

// ── Screen layouts ────────────────────────────────────────────────────────────

// 1. Idle state — popup on browser background
function screen1() {
  const popupContent = `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:11px 13px;margin-bottom:11px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <p style="font-size:12px;font-weight:600;color:#6366f1;margin-bottom:3px;">8 tabs open</p>
      <p style="font-size:12px;color:#64748b;">Focus: <span style="color:#1e293b;font-weight:500;">focustabs — GitHub</span></p>
    </div>
    <button style="width:100%;padding:10px 16px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;">Analyze My Tabs</button>
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div style="position:relative;width:${W}px;height:${H}px;background:#f0f2f5;overflow:hidden;">
      <!-- Browser fills top portion -->
      <div style="position:absolute;top:0;left:0;right:0;padding:20px 24px 0;">
        ${browserChrome(8)}
      </div>
      <!-- Gradient fade at bottom of browser area -->
      <div style="position:absolute;bottom:0;left:0;right:0;height:260px;background:linear-gradient(to bottom, transparent, #f0f2f5);"></div>
      <!-- Popup overlaid top-right -->
      <div style="position:absolute;top:48px;right:64px;">
        ${popupShell(popupContent, 'analyze')}
      </div>
      <!-- Label badge -->
      <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);text-align:center;">
        <div style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;font-size:15px;font-weight:600;padding:10px 28px;border-radius:24px;box-shadow:0 4px 16px rgba(99,102,241,0.4);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;letter-spacing:-0.01em;">
          AI-powered tab management for Chrome
        </div>
      </div>
    </div>
  </body></html>`;
}

// 2. Analysis results
function screen2() {
  const suggestions = [
    { title: 'r/programming', reason: 'Social media — not related to your dev work' },
    { title: 'Lo-fi hip hop • YouTube', reason: 'Entertainment — potential distraction' },
    { title: 'Twitter / X', reason: 'Social media — review after your session' },
    { title: 'Inbox (3) — Gmail', reason: 'Email — schedule a dedicated inbox time' },
  ];

  const suggestionItems = suggestions.map(s => `
    <li style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:#fff;border:1px solid rgba(99,102,241,0.35);border-radius:10px;list-style:none;box-shadow:0 0 0 2px rgba(99,102,241,0.08),0 1px 3px rgba(0,0,0,0.06);">
      <div style="margin-top:2px;width:16px;height:16px;border-radius:4px;border:2px solid #6366f1;background:#6366f1;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:600;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.title}</div>
        <div style="font-size:11px;color:#64748b;margin-top:3px;line-height:1.4;">${s.reason}</div>
      </div>
    </li>
  `).join('');

  const popupContent = `
    <p style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">Suggested to archive</p>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <p style="font-size:12px;font-weight:600;color:#1e293b;margin-bottom:4px;">Workflow: Software Development</p>
      <p style="font-size:11px;color:#64748b;line-height:1.4;">GitHub + MDN + Stack Overflow signal active coding. Archive distractions to stay in flow.</p>
    </div>
    <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">${suggestionItems}</ul>
    <div style="display:flex;flex-direction:column;gap:6px;">
      <button style="width:100%;padding:10px 16px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:white;border:none;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;font-family:inherit;">Archive &amp; Close (4)</button>
      <button style="width:100%;padding:9px 16px;background:#fff;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;">Cancel</button>
    </div>
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div style="width:${W}px;height:${H}px;background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);display:flex;align-items:center;justify-content:center;gap:72px;overflow:hidden;position:relative;">
      ${[...Array(5)].map((_,i)=>`<div style="position:absolute;width:${280+i*140}px;height:${280+i*140}px;border-radius:50%;border:1px solid rgba(99,102,241,0.07);top:50%;left:50%;transform:translate(-50%,-50%);"></div>`).join('')}
      <!-- Left side: context copy -->
      <div style="flex:0 0 380px;color:white;z-index:1;">
        <div style="display:inline-flex;align-items:center;gap:9px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.3);border-radius:24px;padding:8px 16px;margin-bottom:22px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div>
          <span style="font-size:13px;font-weight:500;color:#c4b5fd;">AI Analysis Complete</span>
        </div>
        <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Know which tabs<br>actually matter</h2>
        <p style="font-size:16px;color:rgba(255,255,255,0.6);line-height:1.6;margin-bottom:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">FocusTabs uses AI to identify distractions and suggest which tabs to close — keeping your workflow clean.</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${['Powered by GPT-5, Claude &amp; Gemini','Your data stays on your device','One-click archive &amp; restore'].map(f=>`
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <span style="font-size:14px;color:rgba(255,255,255,0.75);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">${f}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <!-- Right side: popup -->
      <div style="flex:0 0 auto;z-index:1;">
        ${popupShell(popupContent, 'analyze')}
      </div>
    </div>
  </body></html>`;
}

// 3. Archive & restore panel
function screen3() {
  const archived = [
    { title: 'r/programming',           url: 'reddit.com',   ago: 'Archived 2 min ago' },
    { title: 'Lo-fi hip hop • YouTube', url: 'youtube.com',  ago: 'Archived 2 min ago' },
    { title: 'Twitter / X',             url: 'x.com',        ago: 'Archived 2 min ago' },
    { title: 'Inbox (3) — Gmail',       url: 'gmail.com',    ago: 'Archived 2 min ago' },
  ];

  const archiveItems = archived.map((item, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <div style="width:20px;height:20px;border-radius:4px;background:linear-gradient(135deg,#6366f1,#8b5cf6);flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:500;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.title}</div>
        <div style="font-size:11px;color:#64748b;margin-top:1px;">${item.ago}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:500;color:#1e293b;cursor:pointer;flex-shrink:0;">Restore</div>
    </div>
  `).join('');

  const popupContent = archiveItems;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div style="width:${W}px;height:${H}px;background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);display:flex;align-items:center;justify-content:center;gap:72px;overflow:hidden;position:relative;">
      ${[...Array(5)].map((_,i)=>`<div style="position:absolute;width:${280+i*140}px;height:${280+i*140}px;border-radius:50%;border:1px solid rgba(99,102,241,0.07);top:50%;left:50%;transform:translate(-50%,-50%);"></div>`).join('')}
      <div style="flex:0 0 380px;color:white;z-index:1;">
        <div style="display:inline-flex;align-items:center;gap:9px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.3);border-radius:24px;padding:8px 16px;margin-bottom:22px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div>
          <span style="font-size:13px;font-weight:500;color:#c4b5fd;">Nothing is lost forever</span>
        </div>
        <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Restore any tab<br>with one click</h2>
        <p style="font-size:16px;color:rgba(255,255,255,0.6);line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Archived tabs are never deleted. They live in the Archive panel, ready to reopen whenever you need them.</p>
      </div>
      <div style="flex:0 0 auto;z-index:1;">
        ${popupShell(popupContent, 'archive')}
      </div>
    </div>
  </body></html>`;
}

// 4. Settings page
function screen4() {
  const settingsHtml = `
    <div style="width:480px;background:#fff;border-radius:16px;padding:32px 36px;box-shadow:0 12px 48px rgba(0,0,0,0.28);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif;color:#1e293b;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">
        <div style="width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
        </div>
        <div>
          <h1 style="font-size:18px;font-weight:700;letter-spacing:-0.01em;">FocusTabs Settings</h1>
          <p style="font-size:12px;color:#64748b;margin-top:1px;">Configure your AI model and preferences</p>
        </div>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">AI Model</label>
        <select style="width:100%;padding:9px 11px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#f8fafc;color:#1e293b;font-family:inherit;">
          <option>GPT-5 (most capable)</option>
        </select>
        <p style="font-size:11px;color:#94a3b8;margin-top:5px;">Choose from OpenAI, Anthropic Claude, or Google Gemini</p>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">API Key</label>
        <input type="text" value="sk-••••••••••••••••••••••••" readonly style="width:100%;padding:9px 11px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#f8fafc;color:#64748b;font-family:monospace;" />
        <p style="font-size:11px;color:#94a3b8;margin-top:5px;">Stored locally on your device only — never sent to any server</p>
      </div>

      <div style="margin-bottom:18px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#374151;">Work Context <span style="font-weight:400;color:#94a3b8;">(optional)</span></label>
        <textarea rows="3" style="width:100%;padding:9px 11px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;background:#f8fafc;color:#64748b;font-family:inherit;resize:none;">I'm a software engineer working on a Chrome extension for tab management. I focus on React, TypeScript, and browser APIs.</textarea>
      </div>

      <div style="display:flex;align-items:center;gap:8px;padding:11px 13px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span style="font-size:12px;color:#15803d;font-weight:500;">Settings saved</span>
      </div>
    </div>
  `;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${CSS}</style></head><body>
    <div style="width:${W}px;height:${H}px;background:linear-gradient(160deg,#0f0c29 0%,#302b63 55%,#24243e 100%);display:flex;align-items:center;justify-content:center;gap:72px;overflow:hidden;position:relative;">
      ${[...Array(5)].map((_,i)=>`<div style="position:absolute;width:${280+i*140}px;height:${280+i*140}px;border-radius:50%;border:1px solid rgba(99,102,241,0.07);top:50%;left:50%;transform:translate(-50%,-50%);"></div>`).join('')}
      <div style="flex:0 0 360px;color:white;z-index:1;">
        <div style="display:inline-flex;align-items:center;gap:9px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.3);border-radius:24px;padding:8px 16px;margin-bottom:22px;">
          <div style="width:8px;height:8px;border-radius:50%;background:#8b5cf6;"></div>
          <span style="font-size:13px;font-weight:500;color:#c4b5fd;">Bring your own API key</span>
        </div>
        <h2 style="font-size:36px;font-weight:800;letter-spacing:-0.03em;line-height:1.15;margin-bottom:16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Your choice of AI,<br>your data</h2>
        <p style="font-size:16px;color:rgba(255,255,255,0.6);line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">Use OpenAI, Anthropic Claude, or Google Gemini. Your API key lives on your device — we never touch it.</p>
      </div>
      <div style="flex:0 0 auto;z-index:1;">${settingsHtml}</div>
    </div>
  </body></html>`;
}

// ── Runner ────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

  const screens = [
    { name: '1-idle',     html: screen1() },
    { name: '2-results',  html: screen2() },
    { name: '3-archive',  html: screen3() },
    { name: '4-settings', html: screen4() },
  ];

  for (const s of screens) {
    await page.setContent(s.html, { waitUntil: 'domcontentloaded' });
    const file = path.join(OUT, `${s.name}.jpg`);
    await page.screenshot({ path: file, type: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: W, height: H } });
    console.log(`✓  ${s.name}.jpg`);
  }

  await browser.close();
  console.log('\nDone — 4 JPEGs at 1280×800 (no alpha) saved to focustabs/screenshots/');
})();
