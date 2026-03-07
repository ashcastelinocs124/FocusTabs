# FocusTabs — Workflow Learnings

Captured from the session that designed and built FocusTabs v1 (2026-03-06).

---

## Workflow Process That Worked Well

### Brainstorm → Plan → Subagent-Driven Dev
The full pipeline (brainstorming skill → writing-plans skill → subagent-driven-development skill) produced a complete, tested Chrome extension in one session. Key insight: **locking in the design before touching code saved significant rework.** Every architectural question (platform, data depth, AI backend, learning model) was answered upfront.

### One Question at a Time
Asking clarifying questions one at a time (via `AskUserQuestion`) rather than dumping a list kept decision-making fast. Each answer informed the next question.

### Subagent + Two-Stage Review Per Task
The pattern of: implement → spec review → code quality review → fix → re-review caught real bugs before they compounded:
- `saveSettings` writing `undefined` values (discovered Task 2)
- Anthropic hardcoded model ID (discovered Task 4)
- Duplicate event listeners stacking on archive list (discovered Task 6)
- `sendMessage` resolving `undefined` when background unresponsive (discovered Task 6)

**Running reviews in parallel** (spec + code quality dispatched simultaneously) cut review time roughly in half.

---

## Architecture Decisions & Why

| Decision | Rationale |
|----------|-----------|
| Pure Chrome Extension (no backend) | Fastest MVP path, no infra, user controls their API key |
| Active tab = focus signal | Simplest, most accurate signal — no user configuration needed |
| On-demand analysis (user-triggered) | Avoids background CPU/API costs, keeps user in control |
| Self-contained background.js | No bundler needed for MVP; utils/ exist purely for Jest testing |
| CommonJS for utils | jest-chrome 0.8.0 only supports Jest 27 which requires CommonJS |
| Decision history in LLM prompt | Zero-infra learning — no separate training step, instant effect |

---

## Technical Gotchas

### jest-chrome requires `setupFilesAfterEnv`, not `setupFiles`
`setupFiles` runs before Jest installs `jest.fn()`. Since jest-chrome mocks use Jest's mock infrastructure, it must be in `setupFilesAfterEnv`. Symptom: `ReferenceError: chrome is not defined` at test time.

### jest-chrome 0.8.0 only supports Jest 27
Upgrading to Jest 29 breaks jest-chrome. Pin `jest@^27` until a newer jest-chrome version adds support.

### chrome.storage.local silently swallows errors without lastError check
`chrome.storage.local.set(obj, callback)` always calls the callback — even on failure (quota exceeded, etc.). Must check `chrome.runtime.lastError` inside the callback and reject the promise if set.

### background.js must be self-contained (no ES module imports without a bundler)
MV3 service workers support ES module syntax, but you can't `import` CommonJS modules. Since `utils/` use `module.exports` for Jest compatibility, background.js can't import them. Solution: inline the logic in background.js and keep utils/ for testing only. **If prompt/LLM logic changes, update BOTH.**

### LLM index-to-tab mapping has no bounds check by default
The LLM echoes back `index` values it was given, but it can hallucinate out-of-bounds indices. Always guard: `if (!tab) return null` + `.filter(Boolean)` after mapping LLM results to tab data.

### Duplicate event listeners on innerHTML-cleared elements
`element.innerHTML = ''` clears children but NOT listeners attached to the element itself. If you call `element.addEventListener(...)` inside a function that re-runs (like `loadArchive()`), listeners stack. Register once at module load using event delegation instead.

### favicon src via innerHTML is an XSS surface
Setting `<img src="${userValue}">` via `innerHTML` can allow `javascript:` URIs through `escapeHtml` (which only encodes `<>&"`). Always set `img.src` via DOM property (`img.src = value`) — the browser normalizes it safely.

---

## What to Do Differently Next Time

1. **Create a feature branch** before starting implementation, even for brand-new projects. Working on `main` works but isn't ideal.
2. **Add a bundler (Vite/esbuild) earlier** — the self-contained background.js is manageable for v1 but will become painful as the extension grows. Setting up a build step from the start would let background.js import from utils/.
3. **Add Anthropic/Gemini routing tests in Task 4 from the start** — the spec had them but the initial implementation missed them. Both providers had bugs (hardcoded model ID, no null guards) that only surfaced in the code quality review because tests didn't cover them.

---

## Prompts / Patterns That Work

- **"Active tab is the focus signal"** — this framing makes the product instantly understandable and removes the need for user onboarding.
- **Archive + restore pattern** — users are much more willing to close tabs if they know they can restore them. Always pair "close" with "restore."
- **LLM reasons shown per tab** — showing the model's reasoning in the checklist (e.g. "Shopping site, unrelated to current task") builds user trust and makes it easy to override.
