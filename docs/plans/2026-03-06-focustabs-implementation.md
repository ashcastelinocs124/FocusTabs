# FocusTabs v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that analyzes open tabs against the user's active tab focus, suggests irrelevant tabs for closure, archives them with restore support, and learns from user decisions.

**Architecture:** Chrome Extension Manifest V3. Content scripts extract page summaries per tab. A background service worker orchestrates collection, calls a cloud LLM, and manages chrome.storage.local. A popup UI presents suggestions and handles user confirmation.

**Tech Stack:** Vanilla JS (ES modules), Chrome Extension Manifest V3, chrome.storage.local, Fetch API for LLM calls (OpenAI/Anthropic/Google), Jest + jest-chrome for unit tests.

---

## File Structure

```
focustabs/               ← all extension code lives here
  manifest.json
  background.js          ← service worker (orchestrator)
  content.js             ← injected into each tab to extract summary
  popup/
    popup.html
    popup.js
    popup.css
  settings/
    settings.html
    settings.js
    settings.css
  utils/
    storage.js           ← thin wrapper around chrome.storage.local
    llm.js               ← LLM API client (OpenAI/Anthropic/Gemini)
    prompt.js            ← builds the LLM prompt from tab data
  tests/
    storage.test.js
    prompt.test.js
    llm.test.js
  package.json           ← for Jest only (not bundled into extension)
  jest.config.js
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `focustabs/manifest.json`
- Create: `focustabs/package.json`
- Create: `focustabs/jest.config.js`
- Create: `focustabs/background.js` (stub)
- Create: `focustabs/content.js` (stub)

**Step 1: Create the extension directory**

```bash
mkdir -p focustabs/popup focustabs/settings focustabs/utils focustabs/tests
```

**Step 2: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "FocusTabs",
  "version": "1.0.0",
  "description": "Smart tab cleanup powered by AI — close what doesn't matter, keep your focus.",
  "permissions": [
    "tabs",
    "scripting",
    "storage",
    "activeTab"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "FocusTabs"
  },
  "options_page": "settings/settings.html",
  "content_scripts": [],
  "icons": {}
}
```

Note: `content_scripts` is empty — we inject `content.js` programmatically via `chrome.scripting.executeScript`.

**Step 3: Create stub background.js**

```js
// background.js — service worker
// Handles messages from popup and orchestrates tab analysis.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze().then(sendResponse);
    return true; // keep message channel open for async response
  }
  if (message.type === 'ARCHIVE_TABS') {
    handleArchive(message.tabIds, message.tabs).then(sendResponse);
    return true;
  }
  if (message.type === 'RESTORE_TAB') {
    handleRestore(message.url).then(sendResponse);
    return true;
  }
});

async function handleAnalyze() {
  return { status: 'ok', suggestions: [] }; // stub
}

async function handleArchive(tabIds, tabs) {
  return { status: 'ok' }; // stub
}

async function handleRestore(url) {
  return { status: 'ok' }; // stub
}
```

**Step 4: Create stub content.js**

```js
// content.js — injected into a tab on demand to extract a summary.
// Returns { title, url, summary } via chrome.runtime messaging.

(function () {
  const title = document.title;
  const url = window.location.href;

  const metaDesc =
    document.querySelector('meta[name="description"]')?.getAttribute('content') ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
    '';

  const bodyText = document.body?.innerText?.slice(0, 1500) || '';
  const summary = (metaDesc + ' ' + bodyText).trim().slice(0, 500);

  return { title, url, summary };
})();
```

Note: Since we use `chrome.scripting.executeScript` with `func` not a file, content.js is a reference; we'll convert it to an IIFE that returns data inline.

**Step 5: Set up Jest**

Create `package.json`:

```json
{
  "name": "focustabs-tests",
  "private": true,
  "scripts": {
    "test": "jest"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "jest-chrome": "^0.8.0"
  }
}
```

Create `jest.config.js`:

```js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['jest-chrome'],
};
```

**Step 6: Install test dependencies**

```bash
cd focustabs && npm install
```

Expected: `node_modules/` created, no errors.

**Step 7: Run tests (zero tests = pass)**

```bash
npm test
```

Expected: "Test Suites: 0 skipped" or "No tests found" — that's fine.

**Step 8: Commit**

```bash
git add focustabs/
git commit -m "feat: scaffold FocusTabs Chrome extension"
```

---

## Task 2: Storage Utility

Wrap `chrome.storage.local` with a clean API for reading/writing settings, decisions, and archive.

**Files:**
- Create: `focustabs/utils/storage.js`
- Create: `focustabs/tests/storage.test.js`

**Step 1: Write the failing tests**

Create `focustabs/tests/storage.test.js`:

```js
// We test storage.js by mocking chrome.storage.local via jest-chrome.
const { getSettings, saveSettings, addDecision, getDecisions, addToArchive, getArchive, removeFromArchive } = require('../utils/storage');

describe('storage', () => {
  beforeEach(() => {
    // jest-chrome provides chrome.storage.local mock automatically via setupFiles
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
    chrome.storage.local.set.mockImplementation((obj, cb) => cb && cb());
  });

  test('getSettings returns defaults when storage is empty', async () => {
    const settings = await getSettings();
    expect(settings.model).toBe('gpt-4o');
    expect(settings.apiKey).toBe('');
  });

  test('saveSettings writes to storage', async () => {
    chrome.storage.local.set.mockImplementation((obj, cb) => { cb && cb(); });
    await saveSettings({ apiKey: 'sk-test', model: 'claude-3-5-sonnet' });
    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-test', model: 'claude-3-5-sonnet' }),
      expect.any(Function)
    );
  });

  test('addDecision appends to existing decisions', async () => {
    const existing = [{ tabUrl: 'a.com', action: 'close', timestamp: 1 }];
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ decisions: existing }));

    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await addDecision({ tabUrl: 'b.com', action: 'keep', timestamp: 2, activeUrl: 'c.com', activeTitle: 'C', tabTitle: 'B', userOverrode: false });

    expect(saved.decisions).toHaveLength(2);
    expect(saved.decisions[1].tabUrl).toBe('b.com');
  });

  test('getDecisions returns last 20', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ tabUrl: `${i}.com`, timestamp: i }));
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ decisions: many }));
    const decisions = await getDecisions();
    expect(decisions).toHaveLength(20);
    expect(decisions[0].timestamp).toBe(29); // most recent first
  });

  test('addToArchive prepends entry', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) => cb({ archive: [] }));
    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await addToArchive({ url: 'x.com', title: 'X', favicon: '', archivedAt: 99 });
    expect(saved.archive[0].url).toBe('x.com');
  });

  test('removeFromArchive filters by url', async () => {
    chrome.storage.local.get.mockImplementation((keys, cb) =>
      cb({ archive: [{ url: 'x.com' }, { url: 'y.com' }] })
    );
    let saved;
    chrome.storage.local.set.mockImplementation((obj, cb) => { saved = obj; cb && cb(); });

    await removeFromArchive('x.com');
    expect(saved.archive).toHaveLength(1);
    expect(saved.archive[0].url).toBe('y.com');
  });
});
```

**Step 2: Run tests — verify they FAIL**

```bash
cd focustabs && npm test -- --testPathPattern=storage
```

Expected: FAIL — "Cannot find module '../utils/storage'"

**Step 3: Write minimal implementation**

Create `focustabs/utils/storage.js`:

```js
// storage.js — chrome.storage.local helpers

const DEFAULTS = {
  apiKey: '',
  model: 'gpt-4o',
  decisions: [],
  archive: [],
};

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

async function getSettings() {
  const data = await storageGet(['apiKey', 'model']);
  return {
    apiKey: data.apiKey ?? DEFAULTS.apiKey,
    model: data.model ?? DEFAULTS.model,
  };
}

async function saveSettings({ apiKey, model }) {
  await storageSet({ apiKey, model });
}

async function addDecision(decision) {
  const data = await storageGet(['decisions']);
  const decisions = data.decisions ?? [];
  decisions.push(decision);
  await storageSet({ decisions });
}

async function getDecisions() {
  const data = await storageGet(['decisions']);
  const decisions = data.decisions ?? [];
  return decisions.slice(-20).reverse(); // last 20, most recent first
}

async function addToArchive(entry) {
  const data = await storageGet(['archive']);
  const archive = data.archive ?? [];
  archive.unshift(entry);
  await storageSet({ archive });
}

async function getArchive() {
  const data = await storageGet(['archive']);
  return data.archive ?? [];
}

async function removeFromArchive(url) {
  const data = await storageGet(['archive']);
  const archive = (data.archive ?? []).filter((e) => e.url !== url);
  await storageSet({ archive });
}

module.exports = { getSettings, saveSettings, addDecision, getDecisions, addToArchive, getArchive, removeFromArchive };
```

**Step 4: Run tests — verify they PASS**

```bash
npm test -- --testPathPattern=storage
```

Expected: All 6 tests pass.

**Step 5: Commit**

```bash
git add focustabs/utils/storage.js focustabs/tests/storage.test.js
git commit -m "feat: add storage utility with tests"
```

---

## Task 3: Prompt Builder

Builds the LLM prompt string from the active tab, other tabs, and past decisions.

**Files:**
- Create: `focustabs/utils/prompt.js`
- Create: `focustabs/tests/prompt.test.js`

**Step 1: Write failing tests**

Create `focustabs/tests/prompt.test.js`:

```js
const { buildPrompt } = require('../utils/prompt');

const activeTab = { title: 'GitHub PR #42', url: 'https://github.com/org/repo/pull/42', summary: 'Fix auth bug' };
const otherTabs = [
  { index: 0, title: 'Amazon - Shoes', url: 'https://amazon.com/shoes', summary: 'Buy shoes' },
  { index: 1, title: 'MDN - Array', url: 'https://developer.mozilla.org/array', summary: 'JavaScript docs' },
];
const decisions = [
  { action: 'keep', tabTitle: 'MDN docs', activeTitle: 'GitHub PR', tabUrl: 'mdn.com' },
];

describe('buildPrompt', () => {
  test('includes active tab info', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('GitHub PR #42');
    expect(userMessage).toContain('https://github.com/org/repo/pull/42');
  });

  test('includes all other tabs', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('Amazon - Shoes');
    expect(userMessage).toContain('MDN - Array');
  });

  test('includes past decisions', () => {
    const { userMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(userMessage).toContain('kept');
    expect(userMessage).toContain('MDN docs');
  });

  test('system message instructs JSON-only response', () => {
    const { systemMessage } = buildPrompt(activeTab, otherTabs, decisions);
    expect(systemMessage).toContain('JSON');
    expect(systemMessage.toLowerCase()).toContain('focus');
  });

  test('returns both systemMessage and userMessage', () => {
    const result = buildPrompt(activeTab, otherTabs, decisions);
    expect(result).toHaveProperty('systemMessage');
    expect(result).toHaveProperty('userMessage');
  });
});
```

**Step 2: Run tests — verify FAIL**

```bash
npm test -- --testPathPattern=prompt
```

Expected: FAIL — "Cannot find module '../utils/prompt'"

**Step 3: Implement prompt.js**

Create `focustabs/utils/prompt.js`:

```js
// prompt.js — builds the LLM prompt for tab relevance analysis

const SYSTEM_MESSAGE = `You are a focus assistant. Your job is to evaluate whether browser tabs are relevant to what the user is currently working on.

Return ONLY a JSON array. No markdown, no explanation, no other text.

Each element must have:
{ "index": <number>, "relevant": <boolean>, "reason": "<one sentence>" }`;

function buildPrompt(activeTab, otherTabs, decisions) {
  const tabList = otherTabs
    .map(
      (t) =>
        `  [${t.index}] Title: "${t.title}"
  URL: ${t.url}
  Summary: "${t.summary}"`
    )
    .join('\n\n');

  const decisionContext = decisions.length
    ? decisions
        .map((d) => `  - User ${d.action === 'keep' ? 'kept' : 'closed'} "${d.tabTitle}" while focused on "${d.activeTitle}"`)
        .join('\n')
    : '  (none yet)';

  const userMessage = `Focus tab (what the user is currently working on):
  Title: "${activeTab.title}"
  URL: ${activeTab.url}
  Summary: "${activeTab.summary}"

Other open tabs:
${tabList}

Past decisions (learning context, most recent first):
${decisionContext}

For each tab above, respond with a JSON array:
[{ "index": 0, "relevant": false, "reason": "..." }, ...]`;

  return { systemMessage: SYSTEM_MESSAGE, userMessage };
}

module.exports = { buildPrompt };
```

**Step 4: Run tests — verify PASS**

```bash
npm test -- --testPathPattern=prompt
```

Expected: All 5 tests pass.

**Step 5: Commit**

```bash
git add focustabs/utils/prompt.js focustabs/tests/prompt.test.js
git commit -m "feat: add prompt builder with tests"
```

---

## Task 4: LLM Client

Sends the prompt to the configured cloud LLM and returns parsed relevance decisions.

**Files:**
- Create: `focustabs/utils/llm.js`
- Create: `focustabs/tests/llm.test.js`

**Step 1: Write failing tests**

Create `focustabs/tests/llm.test.js`:

```js
const { callLLM, parseLLMResponse } = require('../utils/llm');

describe('parseLLMResponse', () => {
  test('parses valid JSON array from LLM response', () => {
    const raw = '[{"index":0,"relevant":false,"reason":"Shopping"},{"index":1,"relevant":true,"reason":"Docs"}]';
    const result = parseLLMResponse(raw);
    expect(result).toHaveLength(2);
    expect(result[0].relevant).toBe(false);
    expect(result[1].reason).toBe('Docs');
  });

  test('handles JSON wrapped in markdown code block', () => {
    const raw = '```json\n[{"index":0,"relevant":false,"reason":"x"}]\n```';
    const result = parseLLMResponse(raw);
    expect(result).toHaveLength(1);
  });

  test('throws on invalid JSON', () => {
    expect(() => parseLLMResponse('not json')).toThrow();
  });
});

describe('callLLM', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('calls OpenAI API with correct structure for gpt-4o', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '[{"index":0,"relevant":false,"reason":"x"}]' } }],
      }),
    });

    const result = await callLLM({
      model: 'gpt-4o',
      apiKey: 'sk-test',
      systemMessage: 'sys',
      userMessage: 'user',
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/chat/completions',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toHaveLength(1);
  });

  test('throws on non-ok HTTP response', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'Unauthorized' });
    await expect(callLLM({ model: 'gpt-4o', apiKey: 'bad', systemMessage: 's', userMessage: 'u' })).rejects.toThrow('401');
  });
});
```

**Step 2: Run tests — verify FAIL**

```bash
npm test -- --testPathPattern=llm
```

Expected: FAIL — "Cannot find module '../utils/llm'"

**Step 3: Implement llm.js**

Create `focustabs/utils/llm.js`:

```js
// llm.js — LLM API client supporting OpenAI, Anthropic, and Gemini

const ENDPOINTS = {
  'gpt-4o': 'https://api.openai.com/v1/chat/completions',
  'gpt-4o-mini': 'https://api.openai.com/v1/chat/completions',
  'claude-3-5-sonnet': 'https://api.anthropic.com/v1/messages',
  'gemini-pro': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
};

function parseLLMResponse(raw) {
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}

async function callOpenAI({ apiKey, model, systemMessage, userMessage }) {
  const response = await fetch(ENDPOINTS[model], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return parseLLMResponse(data.choices[0].message.content);
}

async function callAnthropic({ apiKey, model, systemMessage, userMessage }) {
  const response = await fetch(ENDPOINTS[model], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemMessage,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return parseLLMResponse(data.content[0].text);
}

async function callGemini({ apiKey, model, systemMessage, userMessage }) {
  const url = `${ENDPOINTS[model]}?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: systemMessage + '\n\n' + userMessage }] }],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return parseLLMResponse(data.candidates[0].content.parts[0].text);
}

async function callLLM({ model, apiKey, systemMessage, userMessage }) {
  if (model.startsWith('gpt-')) return callOpenAI({ apiKey, model, systemMessage, userMessage });
  if (model.startsWith('claude-')) return callAnthropic({ apiKey, model, systemMessage, userMessage });
  if (model.startsWith('gemini-')) return callGemini({ apiKey, model, systemMessage, userMessage });
  throw new Error(`Unsupported model: ${model}`);
}

module.exports = { callLLM, parseLLMResponse };
```

**Step 4: Run tests — verify PASS**

```bash
npm test -- --testPathPattern=llm
```

Expected: All 5 tests pass.

**Step 5: Run all tests — make sure nothing regressed**

```bash
npm test
```

Expected: All tests pass.

**Step 6: Commit**

```bash
git add focustabs/utils/llm.js focustabs/tests/llm.test.js
git commit -m "feat: add LLM client with OpenAI/Anthropic/Gemini support"
```

---

## Task 5: Background Service Worker (Full)

Wire up the background worker to use storage, prompt, and LLM utilities.

**Files:**
- Modify: `focustabs/background.js` (replace stub)

**Note:** The background service worker runs in Chrome's service worker context. It cannot be unit-tested easily — it touches `chrome.tabs`, `chrome.scripting`, and our utils. Manual testing in Chrome is the verification step here.

**Step 1: Replace stub background.js**

```js
// background.js — service worker (ES module)
import { getSettings, addDecision, getDecisions, addToArchive, getArchive, removeFromArchive } from './utils/storage.js';
import { buildPrompt } from './utils/prompt.js';
import { callLLM } from './utils/llm.js';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE') {
    handleAnalyze().then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'ARCHIVE_TABS') {
    handleArchive(message.tabIds, message.tabs).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'RESTORE_TAB') {
    handleRestore(message.url).then(sendResponse).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
  if (message.type === 'GET_ARCHIVE') {
    getArchive().then((archive) => sendResponse({ archive })).catch((err) => sendResponse({ error: err.message }));
    return true;
  }
});

async function extractTabSummary(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const title = document.title;
        const url = window.location.href;
        const metaDesc =
          document.querySelector('meta[name="description"]')?.getAttribute('content') ||
          document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
          '';
        const bodyText = document.body?.innerText?.slice(0, 1500) || '';
        const summary = (metaDesc + ' ' + bodyText).trim().slice(0, 500);
        return { title, url, summary };
      },
    });
    return results?.[0]?.result ?? null;
  } catch {
    return null; // Tab may be restricted (chrome://, extensions page, etc.)
  }
}

async function handleAnalyze() {
  const { apiKey, model } = await getSettings();
  if (!apiKey) throw new Error('API key not set. Open Settings to add your key.');

  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const activeTab = allTabs.find((t) => t.active);

  if (!activeTab) throw new Error('No active tab found.');

  // Extract summary for active tab
  const activeSummary = await extractTabSummary(activeTab.id);
  const activeFocus = {
    title: activeTab.title,
    url: activeTab.url,
    summary: activeSummary?.summary ?? '',
  };

  // Extract summaries for all other tabs in parallel (with timeout)
  const otherTabs = allTabs.filter((t) => !t.active);
  const summaries = await Promise.all(
    otherTabs.map(async (tab, idx) => {
      const data = await extractTabSummary(tab.id);
      return {
        index: idx,
        tabId: tab.id,
        title: tab.title ?? data?.title ?? '(no title)',
        url: tab.url ?? data?.url ?? '',
        favicon: tab.favIconUrl ?? '',
        summary: data?.summary ?? '',
      };
    })
  );

  if (summaries.length === 0) return { suggestions: [], focusTab: activeFocus };

  const decisions = await getDecisions();
  const { systemMessage, userMessage } = buildPrompt(activeFocus, summaries, decisions);

  const llmResults = await callLLM({ model, apiKey, systemMessage, userMessage });

  // Merge LLM results back with tab data
  const suggestions = llmResults
    .filter((r) => !r.relevant)
    .map((r) => {
      const tab = summaries[r.index];
      return {
        tabId: tab?.tabId,
        title: tab?.title ?? '',
        url: tab?.url ?? '',
        favicon: tab?.favicon ?? '',
        reason: r.reason,
      };
    });

  return { suggestions, focusTab: activeFocus };
}

async function handleArchive(tabIds, tabs) {
  const now = Date.now();

  // Archive each tab's data
  for (const tab of tabs) {
    await addToArchive({
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      archivedAt: now,
    });
  }

  // Record decisions
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const activeTab = allTabs.find((t) => t.active);

  for (const tab of tabs) {
    await addDecision({
      activeUrl: activeTab?.url ?? '',
      activeTitle: activeTab?.title ?? '',
      tabUrl: tab.url,
      tabTitle: tab.title,
      action: 'close',
      userOverrode: false,
      timestamp: now,
    });
  }

  // Close the tabs
  await chrome.tabs.remove(tabIds);
  return { status: 'ok' };
}

async function handleRestore(url) {
  await chrome.tabs.create({ url, active: false });
  await removeFromArchive(url);
  return { status: 'ok' };
}
```

**Step 2: Manual verification** (no automated test — depends on Chrome APIs)

Load the extension in Chrome (`chrome://extensions` → "Load unpacked" → select `focustabs/`) and verify no console errors appear in the service worker inspector.

**Step 3: Commit**

```bash
git add focustabs/background.js
git commit -m "feat: implement background service worker for tab analysis"
```

---

## Task 6: Popup UI

Three-state popup: Idle → Results → Archive tab.

**Files:**
- Create: `focustabs/popup/popup.html`
- Create: `focustabs/popup/popup.css`
- Create: `focustabs/popup/popup.js`

**Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FocusTabs</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <header>
    <span class="logo">FocusTabs</span>
    <div class="tabs-nav">
      <button class="tab-btn active" data-tab="analyze">Analyze</button>
      <button class="tab-btn" data-tab="archive">Archive</button>
    </div>
    <button class="settings-btn" id="settings-btn" title="Settings">⚙</button>
  </header>

  <!-- Analyze panel -->
  <div id="panel-analyze" class="panel">
    <!-- Idle state -->
    <div id="state-idle">
      <p class="tab-count" id="tab-count">Loading...</p>
      <p class="focus-label">Focus: <span id="focus-title">—</span></p>
      <button class="primary-btn" id="analyze-btn">Analyze My Tabs</button>
    </div>

    <!-- Loading state -->
    <div id="state-loading" class="hidden">
      <p class="loading-msg">Analyzing your tabs...</p>
      <div class="spinner"></div>
    </div>

    <!-- Error state -->
    <div id="state-error" class="hidden">
      <p class="error-msg" id="error-msg"></p>
      <button class="secondary-btn" id="retry-btn">Try Again</button>
    </div>

    <!-- Results state -->
    <div id="state-results" class="hidden">
      <p class="results-header" id="results-header"></p>
      <ul class="suggestions-list" id="suggestions-list"></ul>
      <div class="results-actions">
        <button class="primary-btn" id="archive-btn">Archive &amp; Close (<span id="close-count">0</span>)</button>
        <button class="secondary-btn" id="cancel-btn">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Archive panel -->
  <div id="panel-archive" class="panel hidden">
    <p class="archive-empty hidden" id="archive-empty">No archived tabs yet.</p>
    <ul class="archive-list" id="archive-list"></ul>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

**Step 2: Create popup.css**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  width: 320px;
  min-height: 200px;
  background: #fff;
  color: #1a1a1a;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid #e5e5e5;
}

.logo { font-weight: 700; font-size: 14px; flex: 0 0 auto; }

.tabs-nav { display: flex; gap: 4px; flex: 1; }
.tab-btn {
  padding: 3px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  background: #f5f5f5;
  cursor: pointer;
  font-size: 12px;
}
.tab-btn.active { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }

.settings-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 2px;
  color: #555;
}

.panel { padding: 14px 12px; }
.hidden { display: none !important; }

/* Idle */
.tab-count { font-size: 12px; color: #555; margin-bottom: 4px; }
.focus-label { font-size: 12px; color: #555; margin-bottom: 14px; }
.focus-label span { color: #1a1a1a; font-weight: 500; }

/* Loading */
.loading-msg { color: #555; margin-bottom: 12px; }
.spinner {
  width: 20px; height: 20px;
  border: 2px solid #e5e5e5;
  border-top-color: #1a1a1a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Buttons */
.primary-btn {
  width: 100%;
  padding: 8px 12px;
  background: #1a1a1a;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.secondary-btn {
  width: 100%;
  padding: 7px 12px;
  background: #fff;
  color: #1a1a1a;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  margin-top: 6px;
}

/* Error */
.error-msg { color: #c0392b; margin-bottom: 10px; font-size: 12px; }

/* Results */
.results-header { font-size: 12px; color: #555; margin-bottom: 10px; }
.suggestions-list { list-style: none; max-height: 240px; overflow-y: auto; margin-bottom: 12px; }
.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f0f0f0;
}
.suggestion-item:last-child { border-bottom: none; }
.suggestion-item input[type=checkbox] { margin-top: 2px; flex: 0 0 auto; }
.suggestion-info { flex: 1; min-width: 0; }
.suggestion-title {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.suggestion-reason { font-size: 11px; color: #777; margin-top: 2px; }
.results-actions { }

/* Archive */
.archive-empty { color: #999; font-size: 12px; }
.archive-list { list-style: none; max-height: 300px; overflow-y: auto; }
.archive-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid #f0f0f0;
}
.archive-item:last-child { border-bottom: none; }
.archive-favicon { width: 14px; height: 14px; flex: 0 0 auto; }
.archive-info { flex: 1; min-width: 0; }
.archive-title {
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.archive-time { font-size: 11px; color: #aaa; }
.restore-btn {
  background: none;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 11px;
  cursor: pointer;
  flex: 0 0 auto;
}
```

**Step 3: Create popup.js**

```js
// popup.js

const $ = (sel) => document.querySelector(sel);

// --- State ---
let currentSuggestions = [];

// --- Tab navigation ---
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
    $(`#panel-${btn.dataset.tab}`).classList.remove('hidden');
    if (btn.dataset.tab === 'archive') loadArchive();
  });
});

// --- Settings ---
$('#settings-btn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// --- Idle state: show tab count ---
async function initIdle() {
  showState('idle');
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const activeTab = tabs.find((t) => t.active);
  $('#tab-count').textContent = `${tabs.length} tab${tabs.length !== 1 ? 's' : ''} open`;
  $('#focus-title').textContent = truncate(activeTab?.title ?? 'Unknown', 40);
}

// --- Analyze ---
$('#analyze-btn').addEventListener('click', runAnalysis);
$('#retry-btn').addEventListener('click', runAnalysis);

async function runAnalysis() {
  showState('loading');
  try {
    const result = await sendMessage({ type: 'ANALYZE' });
    if (result.error) throw new Error(result.error);
    currentSuggestions = result.suggestions;
    renderResults(result.suggestions, result.focusTab);
  } catch (err) {
    showError(err.message);
  }
}

function renderResults(suggestions, focusTab) {
  if (suggestions.length === 0) {
    $('#results-header').textContent = 'All tabs look relevant to your current focus.';
    $('#suggestions-list').innerHTML = '';
    $('#archive-btn').disabled = true;
    $('#close-count').textContent = '0';
    showState('results');
    return;
  }

  $('#results-header').textContent = `Suggested to close (${suggestions.length}):`;
  const list = $('#suggestions-list');
  list.innerHTML = '';

  suggestions.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.dataset.index = i;
    li.innerHTML = `
      <input type="checkbox" id="chk-${i}" checked />
      <label for="chk-${i}" class="suggestion-info">
        <div class="suggestion-title" title="${escapeHtml(s.title)}">${escapeHtml(truncate(s.title, 45))}</div>
        <div class="suggestion-reason">${escapeHtml(s.reason)}</div>
      </label>`;
    list.appendChild(li);
  });

  updateCloseCount();
  list.addEventListener('change', updateCloseCount);
  showState('results');
}

function updateCloseCount() {
  const checked = document.querySelectorAll('#suggestions-list input[type=checkbox]:checked').length;
  $('#close-count').textContent = checked;
  $('#archive-btn').disabled = checked === 0;
}

$('#archive-btn').addEventListener('click', async () => {
  const checked = [...document.querySelectorAll('#suggestions-list input[type=checkbox]:checked')];
  const indicesToClose = checked.map((cb) => parseInt(cb.id.replace('chk-', ''), 10));
  const tabsToClose = indicesToClose.map((i) => currentSuggestions[i]);
  const tabIds = tabsToClose.map((t) => t.tabId);

  $('#archive-btn').disabled = true;
  try {
    const result = await sendMessage({ type: 'ARCHIVE_TABS', tabIds, tabs: tabsToClose });
    if (result.error) throw new Error(result.error);
    await initIdle(); // back to idle after archiving
  } catch (err) {
    showError(err.message);
  }
});

$('#cancel-btn').addEventListener('click', initIdle);

// --- Archive panel ---
async function loadArchive() {
  const result = await sendMessage({ type: 'GET_ARCHIVE' });
  const archive = result.archive ?? [];
  const list = $('#archive-list');
  const empty = $('#archive-empty');

  if (archive.length === 0) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  list.innerHTML = '';

  archive.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'archive-item';
    const timeAgo = formatTimeAgo(item.archivedAt);
    li.innerHTML = `
      <img class="archive-favicon" src="${escapeHtml(item.favicon || '')}" onerror="this.style.visibility='hidden'" />
      <div class="archive-info">
        <div class="archive-title" title="${escapeHtml(item.url)}">${escapeHtml(truncate(item.title, 40))}</div>
        <div class="archive-time">${timeAgo}</div>
      </div>
      <button class="restore-btn" data-url="${escapeHtml(item.url)}">↩ Restore</button>`;
    list.appendChild(li);
  });

  list.addEventListener('click', async (e) => {
    if (e.target.classList.contains('restore-btn')) {
      const url = e.target.dataset.url;
      await sendMessage({ type: 'RESTORE_TAB', url });
      await loadArchive();
    }
  });
}

// --- Helpers ---
function showState(state) {
  ['idle', 'loading', 'error', 'results'].forEach((s) => {
    $(`#state-${s}`).classList.toggle('hidden', s !== state);
  });
}

function showError(msg) {
  $('#error-msg').textContent = msg;
  showState('error');
}

function sendMessage(msg) {
  return new Promise((resolve) => chrome.runtime.sendMessage(msg, resolve));
}

function truncate(str, max) {
  return str.length <= max ? str : str.slice(0, max) + '…';
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatTimeAgo(ts) {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// --- Init ---
initIdle();
```

**Step 4: Manual verification**

Load extension in Chrome, open popup, verify:
- Idle state shows tab count and active tab title
- "Analyze" button triggers loading spinner
- Settings gear opens options page
- Archive tab shows "No archived tabs yet" on first load

**Step 5: Commit**

```bash
git add focustabs/popup/
git commit -m "feat: add popup UI with idle, results, and archive states"
```

---

## Task 7: Settings Page

Where the user inputs their API key and selects a model.

**Files:**
- Create: `focustabs/settings/settings.html`
- Create: `focustabs/settings/settings.css`
- Create: `focustabs/settings/settings.js`

**Step 1: Create settings.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>FocusTabs Settings</title>
  <link rel="stylesheet" href="settings.css" />
</head>
<body>
  <div class="container">
    <h1>FocusTabs Settings</h1>

    <section>
      <label for="model-select">AI Model</label>
      <select id="model-select">
        <option value="gpt-4o">OpenAI GPT-4o</option>
        <option value="gpt-4o-mini">OpenAI GPT-4o Mini (cheaper)</option>
        <option value="claude-3-5-sonnet">Anthropic Claude 3.5 Sonnet</option>
        <option value="gemini-pro">Google Gemini Pro</option>
      </select>
    </section>

    <section>
      <label for="api-key">API Key</label>
      <input type="password" id="api-key" placeholder="sk-... / sk-ant-... / AIza..." autocomplete="off" />
      <p class="hint">Your key is stored locally and never sent anywhere except the AI provider.</p>
    </section>

    <button id="save-btn">Save Settings</button>
    <p class="status hidden" id="status">Saved!</p>
  </div>
  <script src="settings.js"></script>
</body>
</html>
```

**Step 2: Create settings.css**

```css
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; max-width: 480px; color: #1a1a1a; }
h1 { font-size: 18px; margin-bottom: 20px; }
section { margin-bottom: 18px; }
label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
select, input[type=password] { width: 100%; padding: 8px 10px; border: 1px solid #d0d0d0; border-radius: 6px; font-size: 13px; }
.hint { font-size: 11px; color: #888; margin-top: 6px; }
button { padding: 8px 18px; background: #1a1a1a; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
.status { font-size: 12px; color: #27ae60; margin-top: 10px; }
.hidden { display: none; }
```

**Step 3: Create settings.js**

```js
// settings.js
async function load() {
  const data = await new Promise((res) => chrome.storage.local.get(['apiKey', 'model'], res));
  document.getElementById('api-key').value = data.apiKey ?? '';
  document.getElementById('model-select').value = data.model ?? 'gpt-4o';
}

document.getElementById('save-btn').addEventListener('click', async () => {
  const apiKey = document.getElementById('api-key').value.trim();
  const model = document.getElementById('model-select').value;
  await new Promise((res) => chrome.storage.local.set({ apiKey, model }, res));
  const status = document.getElementById('status');
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 2000);
});

load();
```

**Step 4: Manual verification**

Open extension settings, enter an API key, change model, save. Re-open settings — key and model should be persisted.

**Step 5: Commit**

```bash
git add focustabs/settings/
git commit -m "feat: add settings page for API key and model selection"
```

---

## Task 8: End-to-End Manual Testing

No automated tests for Chrome-specific behavior. Use this checklist in Chrome with a real API key.

**Setup:**
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `focustabs/` directory
4. Open Settings, enter a valid API key, select a model

**Test scenarios:**

**Scenario 1 — Basic analysis**
- Open 5+ tabs on different topics (e.g. GitHub, YouTube, news, docs, shopping)
- Make one tab active that you're "working on"
- Click extension icon → click "Analyze My Tabs"
- Verify: loading spinner appears, then results list appears with reasons

**Scenario 2 — Archive & restore**
- From results, leave some boxes checked, uncheck one
- Click "Archive & Close"
- Verify: checked tabs are closed
- Open popup → Archive tab → verify closed tabs appear there
- Click "↩ Restore" on one → verify tab opens

**Scenario 3 — Empty API key**
- Clear API key in settings
- Run analysis
- Verify: error message "API key not set..."

**Scenario 4 — All tabs relevant**
- Have only 1-2 tabs open all on the same topic
- Verify: "All tabs look relevant" message

**Step: Commit any bug fixes discovered during testing**

```bash
git add -u
git commit -m "fix: [describe what was fixed]"
```

---

## Task 9: Final Wiring & Cleanup

**Step 1: Add a CLAUDE.md to the project**

Create `focustabs/CLAUDE.md`:

```markdown
# FocusTabs

Chrome extension for AI-powered tab management.

## Dev Setup

```bash
cd focustabs
npm install        # install test deps (jest only)
npm test           # run unit tests
```

Load extension: `chrome://extensions` → Developer mode → Load unpacked → select `focustabs/`

## Key Files

- `manifest.json` — extension config
- `background.js` — service worker (orchestrates analysis)
- `utils/storage.js` — chrome.storage.local wrapper
- `utils/llm.js` — LLM API client (OpenAI/Anthropic/Gemini)
- `utils/prompt.js` — builds LLM prompt
- `popup/popup.js` — popup UI logic
- `settings/settings.js` — API key + model config

## Architecture

Three-layer pipeline: Tab Collection (content scripts) → Tab Understanding (cloud LLM, active tab as focus signal) → Tab Optimization (user-confirmed close/archive with restore).

## Learnings

This project maintains a `learnings.md` file at the project root. Add entries whenever you fix a non-obvious bug, discover an API gotcha, or make an architectural decision worth remembering.
```

**Step 2: Run all unit tests one final time**

```bash
cd focustabs && npm test
```

Expected: All tests pass.

**Step 3: Final commit**

```bash
git add focustabs/CLAUDE.md
git commit -m "docs: add CLAUDE.md for FocusTabs project"
```

---

## Summary

| Task | What it builds | Tests |
|---|---|---|
| 1 | Project scaffold + manifest | npm test (zero) |
| 2 | Storage utility | 6 unit tests |
| 3 | Prompt builder | 5 unit tests |
| 4 | LLM client | 5 unit tests |
| 5 | Background service worker | Manual in Chrome |
| 6 | Popup UI (3 states) | Manual in Chrome |
| 7 | Settings page | Manual in Chrome |
| 8 | End-to-end testing | Manual checklist |
| 9 | CLAUDE.md + final cleanup | npm test (all pass) |
