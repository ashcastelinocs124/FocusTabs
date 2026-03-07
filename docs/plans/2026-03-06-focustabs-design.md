# FocusTabs — v1 Design Document

**Date:** 2026-03-06
**Status:** Approved

---

## Overview

FocusTabs is a Chrome extension that reduces tab clutter by analyzing all open tabs against the user's current focus (the active tab), then suggesting — with user confirmation — which tabs to close and archive for later.

---

## Problem

Knowledge workers accumulate tens of open browser tabs across multiple contexts (research, shopping, work tasks, news). This creates cognitive overhead and makes it hard to stay focused. Existing solutions (tab grouping, tab suspension) require manual effort and don't understand context.

---

## Solution

A three-layer pipeline:

| Layer | Responsibility |
|---|---|
| **Tab Collection** | Extract structured data from every open tab |
| **Tab Understanding** | Use an LLM to score each tab's relevance to current focus |
| **Tab Optimization** | Present suggestions to user, execute confirmed closures, archive for restore |

---

## Architecture

**Platform:** Chrome Extension, Manifest V3

**Components:**

```
┌─────────────────────────────────────────────────────────┐
│  CHROME EXTENSION                                        │
│                                                          │
│  ┌─────────────┐     ┌──────────────────────────────┐   │
│  │  Popup UI   │────▶│  Background Service Worker   │   │
│  │ (popup.html)│◀────│  (orchestrates everything)   │   │
│  └─────────────┘     └─────────────┬────────────────┘   │
│                                    │                     │
│         ┌──────────────────────────┤                     │
│         ▼                          ▼                     │
│  ┌─────────────┐         ┌──────────────────┐           │
│  │ Content     │         │  chrome.storage  │           │
│  │ Scripts     │         │  .local          │           │
│  │ (per tab)   │         │  decisions       │           │
│  └─────────────┘         │  archive         │           │
│                           │  api key/model   │           │
│                           └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼ (HTTPS API call)
              ┌─────────────────────┐
              │  Cloud LLM          │
              │  OpenAI / Claude /  │
              │  Gemini             │
              └─────────────────────┘
```

### Content Script (`content.js`)
- Injected on-demand into each non-active tab
- Extracts: `document.title`, `window.location.href`, `<meta name="description">`, `<meta property="og:description">`, first ~250 words of visible body text
- Returns compact JSON summary to background worker

### Background Service Worker (`background.js`)
- Triggered when popup requests analysis
- Queries all open tabs via `chrome.tabs.query()`
- Injects content script into each non-active tab to collect summaries
- Identifies the active tab as the "focus" signal
- Constructs and sends LLM prompt
- Stores decision history and archive in `chrome.storage.local`
- Returns relevance decisions to popup

### Popup UI (`popup.html` + `popup.js`)
Three states:

1. **Idle** — shows tab count, active tab title, "Analyze" button
2. **Results** — checklist of suggested closures with LLM reasoning, "Archive & Close" CTA
3. **Archive panel** — list of archived tabs by time, one-click restore

### Settings Page (`settings.html`)
- API key input (stored in `chrome.storage.local`)
- Model selector: GPT-4o | Claude 3.5 Sonnet | Gemini Pro

---

## Data Flow

1. User clicks extension icon → popup opens (Idle state)
2. User clicks "Analyze My Tabs"
3. Popup sends `ANALYZE` message to background worker
4. Background worker:
   a. Calls `chrome.tabs.query({currentWindow: true})` to get all tabs
   b. Identifies active tab
   c. Injects content script into each non-active tab
   d. Collects summaries (parallel, with timeout per tab)
   e. Builds LLM prompt (see below)
   f. Calls LLM API
   g. Parses JSON response
   h. Returns `{ suggestions: [...], focusTab: {...} }` to popup
5. Popup renders Results state
6. User reviews, optionally unchecks tabs to keep
7. User clicks "Archive & Close"
8. Background worker closes selected tabs, saves to archive
9. Decision stored in history (for future learning)

---

## LLM Prompt Design

```
SYSTEM:
You are a focus assistant. Your job is to evaluate whether browser tabs are
relevant to what the user is currently working on. Return a JSON array only.
No markdown, no explanation outside the JSON.

USER:
Focus tab (what the user is currently working on):
  Title: "{activeTab.title}"
  URL: {activeTab.url}
  Summary: "{activeTab.summary}"

Other open tabs:
{tabs.map(t => `  [${t.index}] Title: "${t.title}", URL: ${t.url}\n  Summary: "${t.summary}"`).join('\n\n')}

Past decisions (learning context, most recent first):
{recentDecisions.map(d => `  - User ${d.action === 'keep' ? 'kept' : 'closed'} "${d.tabTitle}" while focused on "${d.activeTitle}"`).join('\n')}

For each tab, respond with:
[
  { "index": 0, "relevant": false, "reason": "Shopping, unrelated to current task" },
  ...
]
```

---

## Storage Schema

```json
{
  "apiKey": "sk-...",
  "model": "gpt-4o",
  "decisions": [
    {
      "activeUrl": "https://github.com/...",
      "activeTitle": "Fix auth bug · GitHub",
      "tabUrl": "https://amazon.com/...",
      "tabTitle": "Amazon - Cat toys",
      "action": "close",
      "userOverrode": false,
      "timestamp": 1741234567890
    }
  ],
  "archive": [
    {
      "url": "https://amazon.com/...",
      "title": "Amazon - Cat toys",
      "favicon": "https://amazon.com/favicon.ico",
      "archivedAt": 1741234567890
    }
  ]
}
```

---

## Learning System

- Last 20 decisions are included in every LLM prompt as "Past decisions"
- When user **unchecks** a suggested closure (overrides AI), `userOverrode: true` is stored
- When user restores a tab from archive, a `restore` decision is stored
- No separate training step — learning is implicit through prompt context

---

## MVP Scope

**In v1:**
- On-demand analysis (user-triggered)
- Close + archive irrelevant tabs
- Archive panel with one-click restore
- Settings: API key + model selection
- Basic learning via decision history in prompt

**Out of v1 (future):**
- Automatic/scheduled analysis
- Tab grouping, suspending, surfacing
- Named sessions / projects
- Cross-device sync
- Domain/site preference rules

---

## Tech Stack

- Chrome Extension Manifest V3
- Vanilla JS (popup, content script, background worker)
- `chrome.storage.local` for persistence
- Fetch API for LLM calls (OpenAI, Anthropic, Google Gemini)
- HTML/CSS for popup UI (no framework — keeps bundle tiny)
