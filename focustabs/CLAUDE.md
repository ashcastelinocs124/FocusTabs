# FocusTabs

Chrome extension for AI-powered tab management.

## Dev Setup

```bash
cd focustabs
npm install        # install test deps (jest only, not bundled into extension)
npm test           # run unit tests (35 tests across storage, prompt, LLM)
```

Load extension in Chrome: `chrome://extensions` → Enable "Developer mode" → "Load unpacked" → select `focustabs/`

## Key Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (MV3, permissions, popup, settings) |
| `background.js` | Service worker — orchestrates all tab analysis (self-contained, no imports) |
| `popup/popup.js` | Popup UI controller (idle, loading, results, archive states) |
| `settings/settings.js` | API key + model config page |
| `utils/storage.js` | chrome.storage.local wrapper (used in tests + background.js inlines it) |
| `utils/llm.js` | LLM API client — OpenAI, Anthropic, Gemini (used in tests) |
| `utils/prompt.js` | Builds LLM prompt from tab data (used in tests) |
| `tests/` | Jest unit tests for utils (35 tests) |

## Architecture

Three-layer pipeline:
1. **Tab Collection** — content scripts (inline in background.js via executeScript) extract title, URL, and ~500-char summary from each open tab
2. **Tab Understanding** — active tab = focus signal; cloud LLM scores all other tabs by relevance using past decisions as learning context
3. **Tab Optimization** — popup presents suggestions as a checklist; user confirms; irrelevant tabs are archived with one-click restore

## Important Notes

- `background.js` is self-contained (inlines storage/prompt/LLM logic) because the extension cannot use ES module imports without a bundler. `utils/` modules exist for unit testing only. **If you change prompt format or LLM logic, update both `background.js` AND `utils/`.**
- LLM model routing: `gpt-*` → OpenAI, `claude-*` → Anthropic, `gemini-*` → Gemini (API key as query param per Google's documented method)
- Storage cap: decisions are capped at 100 entries; archive is unbounded
- Chrome restrictions: `chrome://` pages, PDF viewers, and the extensions page cannot be scripted — `extractTabSummary` returns `""` for these

## Learnings

This project maintains a `learnings.md` file at the project root. Add entries whenever you:
- Fix a non-obvious bug (include root cause)
- Discover a library/API gotcha or version-specific quirk
- Make an architectural decision worth remembering
- Find a useful command, config, or file path that wasn't obvious

Use the `/capture-learnings` skill at the end of sessions to do this automatically.
