# FocusTabs

> Smart tab cleanup powered by AI — close what doesn't matter, keep your focus.

FocusTabs is a Chrome extension (Manifest V3) that uses a cloud LLM to analyze your open tabs and suggest which ones are irrelevant to what you're currently working on. It learns from your decisions over time and keeps a one-click archive so you can always restore a closed tab.

---

## How It Works

1. **You open FocusTabs** (toolbar icon or auto-trigger at 10+ tabs)
2. The extension reads your active tab as your **focus signal** — the thing you're working on right now
3. It extracts the title, URL, and a ~500-character content summary from every other open tab
4. That data is sent to your chosen LLM, which scores each tab as **relevant** or **not relevant** to your focus
5. You review the suggestions as a checklist, uncheck anything you want to keep, and close the rest
6. Closed tabs go into an **archive** — you can restore them at any time

The LLM also incorporates your **past decisions** (up to 20 most recent) as learning context, so it gets smarter about your patterns over time.

---

## Features

- **AI-powered relevance scoring** — tabs are judged against your current focus, not a fixed set of rules
- **Tab Chat** — ask a natural language question across all your open tabs (e.g. "which tabs are about the auth bug?")
- **Archive + restore** — closed tabs are saved with a timestamp and can be reopened with one click
- **Multi-provider LLM support** — OpenAI, Anthropic, and Google Gemini all work out of the box
- **Auto-prompt** — optionally trigger the popup automatically when you have 10 or more tabs open
- **Inline prompt fallback** — if the popup can't be opened programmatically, a non-intrusive in-page prompt appears instead
- **Learns from you** — past keep/close decisions are sent to the LLM as context with each new analysis
- **No content scripts** — all tab analysis happens in the background service worker; no persistent page injection

---

## Supported Models

| Provider | Models |
|----------|--------|
| **OpenAI** | `gpt-5`, `gpt-5-mini` (Responses API), `gpt-4o`, `gpt-4o-mini` (Chat Completions) |
| **Anthropic** | `claude-3-5-sonnet` |
| **Google** | `gemini-pro` |

The extension auto-detects your provider from your API key prefix (`sk-ant-` → Anthropic, `AIza` → Gemini, `sk-` → OpenAI) and will switch to that provider's default model if there's a mismatch.

---

## Installation

FocusTabs is not on the Chrome Web Store. Load it as an unpacked extension:

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right)
4. Click **Load unpacked**
5. Select the `focustabs/` directory inside this repo

The FocusTabs icon will appear in your toolbar.

---

## Setup

1. Click the FocusTabs toolbar icon → click the **⚙ Settings** button (or right-click the icon → Options)
2. Paste your API key into the **API Key** field
   - OpenAI key: `sk-...`
   - Anthropic key: `sk-ant-...`
   - Gemini key: `AIza...`
3. Select a model (the extension will switch to the correct provider automatically based on your key)
4. Optionally enable **Auto-prompt** to trigger the popup when 10+ tabs are open
5. Click **Save**

Your API key is stored in `chrome.storage.local` — it never leaves your browser except in direct HTTPS calls to the provider you configured.

---

## Usage

### Tab Analysis (Analyze panel)

- Open FocusTabs when you have 11 or more tabs open (analysis is locked below this threshold)
- Your current tab is shown as the focus context
- Click **Analyze tabs** — the LLM scores all other tabs in ~5–10 seconds
- Uncheck any tabs you want to keep, then click **Archive & Close**
- Closed tabs appear in the **Archive** panel

### Tab Chat (Chat panel)

- Ask a question about your open tabs in plain English
- Examples: *"which tabs are about the login bug?"*, *"find anything related to billing"*
- The LLM answers and lists the relevant tabs it found
- Conversation history is preserved across multiple questions (last 20 turns)

### Archive Panel

- Lists all previously closed tabs with their title and time since closure
- Click **↩ Restore** on any tab to reopen it in a background tab and remove it from the archive

---

## Architecture

```
chrome.action (toolbar icon)
    └── popup/popup.html + popup.js     ← UI: analyze, chat, archive panels
            │  chrome.runtime.sendMessage
            ▼
background.js  (MV3 service worker — self-contained, no imports)
    ├── Tab extraction via chrome.scripting.executeScript
    │       └── extracts meta description + body text (~500 chars) per tab
    ├── LLM routing
    │       ├── OpenAI   → /v1/responses (gpt-5/gpt-5-mini) or /v1/chat/completions
    │       ├── Anthropic → /v1/messages
    │       └── Gemini   → /v1beta/models/gemini-pro:generateContent
    └── chrome.storage.local
            ├── apiKey, model, autoPromptEnabled
            ├── decisions[]    ← capped at 100 entries; last 20 sent to LLM
            └── archive[]      ← unbounded; stores url, title, favicon, archivedAt

settings/settings.html + settings.js   ← options page (chrome.runtime.openOptionsPage)
```

**Why is `background.js` self-contained?**
Manifest V3 service workers cannot use ES module imports from local files without a bundler. Rather than introducing a build step, `background.js` inlines all storage, LLM, and prompt logic directly. The `utils/` directory exists solely for Jest unit testing — it uses CommonJS `module.exports` so tests can `require()` it. If you change LLM request format or prompt structure, update **both** `background.js` and `utils/`.

---

## Message Protocol

The popup communicates with the background worker via `chrome.runtime.sendMessage`. All messages are handled in `background.js`:

| Message type | Payload | Response |
|---|---|---|
| `ANALYZE` | `{ apiKey?, model? }` | `{ suggestions[], focusTab }` |
| `CHAT_TABS` | `{ query, history[], apiKey?, model? }` | `{ answer, relevantTabs[] }` |
| `ARCHIVE_TABS` | `{ tabIds[], tabs[] }` | `{ status: 'ok' }` |
| `RESTORE_TAB` | `{ url }` | `{ status: 'ok' }` |
| `GET_ARCHIVE` | — | `{ archive[] }` |

---

## File Structure

```
focustabs/
├── manifest.json             ← Extension manifest (MV3)
├── background.js             ← Service worker (self-contained)
├── popup/
│   ├── popup.html            ← Popup UI shell
│   ├── popup.js              ← Popup controller (analyze, chat, archive)
│   └── popup.css             ← Popup styles
├── settings/
│   ├── settings.html         ← Options page
│   └── settings.js           ← Settings controller
├── utils/                    ← CommonJS modules (Jest only — not loaded by extension)
│   ├── llm.js                ← LLM API client
│   ├── prompt.js             ← Prompt builder
│   └── storage.js            ← chrome.storage wrapper
├── tests/
│   ├── llm.test.js           ← LLM routing + parsing tests
│   └── storage.test.js       ← Storage helper tests
└── package.json              ← Jest config (test dependencies only)
```

---

## Development

### Running Tests

```bash
cd focustabs
npm install    # install Jest and jest-chrome (dev deps only — not bundled into extension)
npm test       # run all unit tests
```

Tests use [jest-chrome](https://github.com/nickmccurdy/jest-chrome) to mock the Chrome extension APIs. There are 35 unit tests covering LLM response parsing, model routing, provider detection, and storage operations.

**Note:** jest-chrome 0.8.0 requires Jest 27. Do not upgrade to Jest 28/29 without verifying compatibility.

### Loading Changes in Chrome

After editing source files, go to `chrome://extensions` and click the **↻ refresh** button on the FocusTabs card. The background service worker restarts automatically; you don't need to reload the extension for popup or settings changes — just close and reopen the popup.

### Key Constraints

- **No bundler** — the extension loads files directly; no Webpack, Rollup, or esbuild
- **No content scripts** — tabs are read via `chrome.scripting.executeScript` from the background worker
- **Restricted tabs** — `chrome://` pages, PDFs, and the extensions page cannot be scripted; `extractTabSummary` returns `""` for these silently
- **Decisions cap** — `decisions[]` is capped at 100 entries; `archive[]` is unbounded
- **60-second LLM timeout** — all fetch calls use an `AbortController` timeout to avoid hanging the popup

---

## Permissions

| Permission | Why |
|---|---|
| `tabs` | Read tab titles, URLs, and active state |
| `scripting` | Execute inline scripts to extract page content (summary) |
| `storage` | Persist API key, model preference, decisions, and archive |
| `<all_urls>` | Required by `scripting` to extract content from any domain |

---

## Privacy

- Your API key is stored locally in `chrome.storage.local` and is **never sent anywhere except directly to your chosen LLM provider**
- Tab content (title, URL, ~500-char body text) is sent to the LLM provider you configure. No data is collected by FocusTabs itself.
- The system prompt instructs the LLM to treat tab content as untrusted and ignore any instructions it may contain (prompt injection defense)

---

## License

MIT
