# FocusTabs — CLAUDE.md

## Project Overview

Chrome Extension (Manifest V3) that reduces tab clutter using AI. Analyzes all open tabs against the user's active tab as focus context, scores relevance via an LLM, and presents suggestions to close + archive tabs.

**Source code:** `focustabs/`
**Skills/agents/docs:** `.claude/`

---

## Architecture

```
Popup UI (popup/popup.html)
    ↕ chrome.runtime messages
Background Service Worker (background.js)   ← orchestrates everything
    ├── utils/llm.js        ← LLM API calls (Anthropic/OpenAI)
    ├── utils/prompt.js     ← prompt construction
    └── utils/storage.js    ← chrome.storage.local wrapper
         └── stores: decisions, archive, api key, model config
```

**Platform:** Chrome Extension, Manifest V3
**Permissions:** `tabs`, `scripting`, `storage`, `<all_urls>`
**No content scripts** — tab data extracted via background worker
**LLM call:** HTTPS from background service worker (not popup)

---

## Key Conventions

- **No content scripts** — all tab analysis happens in the background service worker
- **chrome.storage.local** — all persistence (no IndexedDB, no cookies)
- **Tests:** Jest + jest-chrome (`npm test` from `focustabs/`)
- **Test files live in** `focustabs/tests/` — mirrors `utils/` structure
- **Never modify test files autonomously** — tests are contracts; broken tests escalate to human

---

## Running Tests

```bash
cd focustabs
npm test
```

---

## In-Progress Work

- `ralph-wigum` skill — per-task retry loop for `max-wiggum` pipeline
  - Tests immutable within retry loop; BLOCKED status escalates to human after N fails
  - Diagnostic agent analyzes failure pattern and changes implementation strategy (never tests)

---

## Learnings

This project maintains a `learnings.md` file at the project root. Add entries whenever you:
- Fix a non-obvious bug (include root cause)
- Discover a Chrome Extension / MV3 gotcha
- Make an architectural decision worth remembering
- Find a useful command, config, or file path that wasn't obvious

Use the `/capture-learnings` skill at the end of sessions to do this automatically.
