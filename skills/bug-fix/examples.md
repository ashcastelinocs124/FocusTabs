# Bug Fix Examples
**Description:** Collection of real-world bug patterns and how they were successfully resolved. Reference this when encountering similar issues.
**Usage:** Reference from `/bug-fix` when identifying root causes

---

## Quick Reference: Error Pattern Recognition

| Error Message | Root Cause | Fix Strategy |
|---------------|------------|--------------|
| `cannot import name 'X' from 'module'` | X not exported in `__init__.py` | Add to `__init__.py` exports |
| `No module named 'X'` | Wrong import path or missing file | Fix path or create file |
| `object.__init__() takes exactly one argument` | Parent class fallback to `object` | Fix conditional import or super() call |
| `'X' is possibly unbound` | Import inside try/except failed | Add fallback assignment before try block |
| `Argument to class must be a base class` | Class inheriting from non-class | Fix the parent class import |
| No error, but UI shows no data | SSE parser line-ending mismatch / batch streaming | Normalize `\r\n`, process remaining buffer, use queue for incremental streaming (see Example 3) |

---

## Example 1: The LearningRouter Import Chain Bug

### Error
```
TypeError: object.__init__() takes exactly one argument (the instance to initialize)
```

### How It Was Found
1. User ran `python src/cli.py`
2. Error occurred during MCP initialization
3. Traced through: CLI → MasterMCPServer → LearningRouter → AIRouter

### Root Cause Analysis

**The Chain:**
```
routing/__init__.py didn't export AIRouter
    → learning_router's "from .ai_router import AIRouter" worked
    → But src/__init__.py's "from .routing import AIRouter" failed
    → LearningRouter inherited from fallback `object` instead of AIRouter
    → super().__init__(model, provider) called on object → TypeError
```

**The Problematic Code:**
```python
# routing/__init__.py - MISSING AIRouter export
from .query_analyzer import QueryAnalyzer
from .learning_router import LearningRouter
# AIRouter NOT exported!

# learning_router.py
try:
    from .ai_router import AIRouter
except ImportError:
    AIRouter = object  # Fallback triggered in some contexts

class LearningRouter(AIRouter):
    def __init__(self, model, provider):
        super().__init__(model, provider)  # FAILS when AIRouter is object
```

### Fix Applied

**Step 1:** Added AIRouter to routing/__init__.py exports
```python
from .ai_router import AIRouter
__all__ = [..., "AIRouter"]
```

**Step 2:** Added multiple import path fallbacks
```python
try:
    from .ai_router import AIRouter
except ImportError:
    try:
        from ai_router import AIRouter
    except ImportError:
        AIRouter = object
```

**Step 3:** Guarded super().__init__() call
```python
def __init__(self, model, provider):
    if AIRouter is not object:
        super().__init__(model, provider)
    else:
        self.model = model
        self.provider = provider
        self.is_available = False
```

### Verification Commands Used
```bash
python -c "from src.routing import AIRouter; print('OK')"
python -c "from src import MCPCLI; print('OK')"
python src/cli.py  # Full integration test
```

### Key Learnings
- Import errors cascade through module chains
- Different import contexts can resolve the same module differently
- Always check `__init__.py` exports when "cannot import name" occurs
- Conditional imports with class inheritance need guarded super() calls

---

## Example 2: Wrong Relative Import Path

### Error
```
ModuleNotFoundError: No module named 'src.simple_multi_mcp'
```

### How It Was Found
1. CLI showed "No multi-MCP handler available" 
2. Checked import in master_mcp_server.py
3. Found import path didn't match actual file location

### Root Cause
```python
# master_mcp_server.py tried:
from src.simple_multi_mcp import SimpleMultiMCPHandler

# But file was at:
src/utils/simple_multi_mcp.py
```

### Fix Applied
```python
# Changed to correct relative import:
from ..utils.simple_multi_mcp import SimpleMultiMCPHandler
```

### Diagnosis Command
```bash
find . -name "simple_multi_mcp.py"
# Output: ./src/utils/simple_multi_mcp.py
```

---

## Example 3: SSE Streaming — Silent Data Loss in Frontend

### Error
No error message. Frontend shows no output after submitting a query. Backend returns 200 OK with valid SSE data.

### How It Was Found
1. User reported "no response" after submitting a query in the React frontend
2. Split-tested backend vs frontend independently:
   - `curl` directly to backend → all SSE events received correctly
   - `curl` through Vite proxy → all SSE events received correctly
   - Frontend with dummy instant data → **still no output**
3. Added visible debug state panel to UI (bypass browser console requirement)
4. Debug log showed: `readSSEStream finished` with zero events parsed

### Root Cause Analysis

**Two compounding issues:**

**Issue 1: Backend batching (no incremental streaming)**
```python
# server.py — _stream_agent collected ALL events before yielding
def _run_sync():
    events = []
    for event in graph.stream(initial_state, stream_mode="updates"):
        events.append(event)  # Collect everything
    return events

events = await asyncio.to_thread(_run_sync)  # 22s of silence
for event in events:  # THEN yield all at once
    yield json.dumps(...)
```

**Issue 2: Frontend SSE parser line-ending mismatch**
```javascript
// readSSEStream split on \n\n but sse_starlette may send \r\n
const parts = buffer.split('\n\n');  // Fails if data uses \r\n\r\n

// Also: last event lost when stream ends without trailing \n\n
buffer = parts.pop() ?? '';  // Last chunk stays in buffer
// reader.read() returns done=true → buffer never processed
```

### Fix Applied

**Backend — queue-based incremental streaming:**
```python
import queue as thread_queue

_SENTINEL = object()

async def _stream_agent(question, db_path):
    q = thread_queue.Queue()

    def _run_sync():
        try:
            graph = build_graph()
            for event in graph.stream(initial_state, stream_mode="updates"):
                for sse_str in _process_graph_event(event):
                    q.put(sse_str)  # Push immediately
        finally:
            q.put(_SENTINEL)

    asyncio.get_running_loop().run_in_executor(None, _run_sync)

    while True:
        item = await asyncio.to_thread(q.get)  # Yield as they arrive
        if item is _SENTINEL:
            break
        yield item
```

**Frontend — normalize line endings + process remaining buffer:**
```javascript
buffer = buffer.replace(/\r\n/g, '\n');  // Normalize before splitting

// When stream ends, process leftover buffer
if (done) {
  if (buffer.trim()) {
    for (const line of buffer.split('\n')) {
      const trimmedLine = line.replace(/\r$/, '').trim();
      if (trimmedLine.startsWith('data:')) {
        // parse and emit
      }
    }
  }
  break;
}
```

### Debugging Methodology: Split Testing

This bug required **systematic layer isolation** since there was no error message:

| Test | Tool | Result | Conclusion |
|------|------|--------|------------|
| Backend directly | `curl :8001/query` | Events received | Backend OK |
| Through proxy | `curl :5173/api/query` | Events received | Proxy OK |
| Dummy instant data | `/query/test` endpoint | **No UI output** | Frontend parser broken |
| Debug state panel | Yellow box in UI | `readSSEStream finished, 0 events` | Parser confirmed |
| Raw chunk logging | `debugLog` in `readSSEStream` | Revealed `\r\n` format | Root cause found |

**Key technique:** When you can't access browser DevTools, inject a visible debug state panel directly into the React UI — a yellow box showing raw state values and an event log. This is faster than guessing.

### Verification Commands
```bash
# Backend incremental streaming (timestamps prove progressive delivery)
curl -sN -XPOST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{"question":"count customers","preset":"enterprise"}' \
  | while IFS= read -r line; do echo "[$(date +%H:%M:%S)] $line"; done

# Through Vite proxy
curl -sN -XPOST http://localhost:5173/api/query ...
```

### Key Learnings
- **No error ≠ no bug.** Silent data loss (SSE events parsed as zero) produces no errors anywhere
- **Split-test by layer.** When frontend shows nothing: test backend → proxy → frontend independently
- **SSE parsers must normalize `\r\n` to `\n`** — servers vary in line endings
- **Always process remaining buffer when stream ends** — the last event may not have a trailing `\n\n`
- **Sync-to-async bridges need queues, not batch-collect.** `asyncio.to_thread` that returns all results blocks streaming. Use `thread_queue.Queue` + `asyncio.to_thread(q.get)` for incremental bridging
- **Visible debug panels > console.log** when you can't access browser DevTools

---

## Adding New Examples

When you successfully fix a bug, add it here with:

1. **Error** - Exact error message
2. **How It Was Found** - Steps to reproduce/discover
3. **Root Cause Analysis** - Why it happened
4. **Fix Applied** - Code changes made
5. **Verification Commands** - How you confirmed the fix
6. **Key Learnings** - What to remember for next time
