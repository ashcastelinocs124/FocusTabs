---
name: bug-fix
description: Use when a user reports a specific bug, error message, stack trace, test failure, or unexpected behavior in their code. Covers backend logic bugs, frontend/UI rendering issues, and interaction problems.
---

# Bug Fix Skill
**Usage:** /bug-fix [bug description or error message]

**Trigger this skill when:**
- User reports a specific bug or error
- User shares an error message or stack trace
- User says "fix this bug", "debug this", "why is this failing"
- User describes unexpected behavior in their code
- Test failures that need investigation
- UI/interaction issues (button not working, form not submitting, etc.)
- Visual rendering problems or layout issues
- Frontend component malfunctions

**Skip for:** General refactoring, feature requests, code review, performance optimization

## Core Philosophy

**Main Agent = Architect** → Analyzes, identifies issue, plans, defines success criteria
**Subagent = Builder** → Executes the plan, makes changes, verifies

This separation ensures:
1. Thorough analysis before any code changes
2. Clear success criteria defined upfront
3. Focused execution without scope creep
4. Verification against the original plan
5. **UI bugs**: Browser-based verification using Playwright MCP to ensure fixes are actually working

---

## Phase 0: Traceability Check (run FIRST, before anything else)

Check if `traceability.md` exists in the project root:

```bash
cat traceability.md 2>/dev/null || echo "NO TRACEABILITY FILE"
```

**If it exists**, read it and extract:

| Field | What to look for |
|-------|-----------------|
| **Goal** | What was the agent originally trying to build? |
| **Steps** | Which steps are `✅ Done`, `🔄 In Progress`, `❌ Blocked`, `⏳ Pending`? |
| **Files Changed** | Which files has the agent already touched? |
| **Decisions** | What architectural choices were made? Do any conflict with the current bug? |
| **Deviations** | Has the agent already noted straying from plan? |

Then produce a **Traceability Summary** before moving to Phase 1:

```
## Traceability Summary
- Goal: [from traceability.md]
- Last active step: [step # and description, with status]
- Steps completed: X / Y
- Files touched so far: [list]
- Known deviations: [from Deviations section, or "none"]
- Likely deviation point: [your assessment of where actual behavior diverged from plan]
```

**If no traceability.md exists**, note it and continue with standard Phase 1 investigation.

---

## Phase 1: Bug Identification (Main Agent)

### Step 1.1: Gather Context

Run in parallel:
- Read the error message/stack trace carefully
- Identify the failing file(s) and line numbers
- Fire `explore` agent to search for related code
- **Cross-reference with traceability.md** — if the failing file is in "Files Changed", the bug was introduced during this task; if not, it may be a pre-existing issue or regression

### Step 1.2: Reproduce Understanding

| Question | Where to look |
|----------|--------------|
| What is the expected behavior? | Traceability **Goal** + user description |
| What is the actual behavior? | Error message / symptom |
| When does it occur? | Identify triggers |
| What changed recently? | Traceability **Files Changed** + `git diff` |
| Does it match a known deviation? | Traceability **Deviations** section |

### Step 1.3: Root Cause Analysis

1. Read the failing code section
2. Trace the data flow to the failure point
3. Check dependencies and imports
4. Look for similar patterns elsewhere that work
5. Identify the ACTUAL root cause (not just symptoms)

**For common bug patterns, see:** `examples.md` in this folder

**Silent failures (no error, no output):** When the UI shows nothing but there's no error message, use the **split-testing methodology** from Example 3 — test each layer (backend → proxy → frontend) independently. Add a visible debug state panel to the UI when browser DevTools isn't available. See `examples.md` Example 3 for the full technique.

---

## Playwright MCP Integration for UI Bugs

### When to Use Playwright MCP

**Mandatory for:**
- Frontend component bugs
- User interaction issues
- Visual rendering problems
- Navigation/flow failures
- Form submission errors
- Any bug affecting the user interface

### Playwright Verification Workflow

1. **Before Fix**: 
   - Take screenshot of current broken state
   - Record the failing user interaction
   - Document exact reproduction steps

2. **After Fix**:
   - Navigate to same page/component
   - Perform the same user interaction
   - Verify expected behavior occurs
   - Take comparison screenshot
   - Test related user flows for regressions

### Playwright MCP Tools to Use

- Browser automation for testing user flows
- Screenshot capture for before/after comparison
- Form filling and submission testing
- Click and interaction verification
- Page navigation testing
- Responsive design verification

### Success Criteria for UI Bugs

- [ ] Original failing scenario now works
- [ ] Screenshots show visual improvement
- [ ] Related user flows still function
- [ ] No console errors in browser
- [ ] Responsive behavior maintained
- [ ] Accessibility not degraded

---

## Phase 2: Create Fix Plan (Main Agent)

### Plan Template

```markdown
## Bug Fix Plan

### Bug Summary
[One sentence describing the bug]

### Root Cause
[Specific reason why the bug occurs]

### Subagents Involved
- `explore` - [what to search for]
- `general` - [execution tasks]
- `oracle` - [if architectural guidance needed]
- `playwright` - [for browser/UI bug verification]

### Files to Modify
- `path/to/file1.py` - [what changes needed]
- `path/to/file2.py` - [what changes needed]

### Fix Steps (Ordered)
1. [First change to make]
2. [Second change to make]
3. [Third change to make]

### Success Criteria
- [ ] [Specific testable outcome 1]
- [ ] [Specific testable outcome 2]
- [ ] [No regressions in related functionality]

### Verification Commands
```bash
[command to verify fix works]
```

### Browser/UI Verification (if applicable)
- Playwright test scenarios:
  - [ ] Navigate to affected page
  - [ ] Perform the action that was failing
  - [ ] Verify expected behavior is restored
  - [ ] Check for visual regressions
  - [ ] Test related user flows
```

### Validation Checklist

Before delegating:
- [ ] Root cause is clearly identified (not guessing)
- [ ] Fix addresses root cause, not just symptoms
- [ ] All affected files are listed
- [ ] Steps are specific and actionable
- [ ] Success criteria are testable
- [ ] No unnecessary refactoring included
- [ ] If UI bug: Playwright verification scenarios defined

---

## Phase 3: Execute Fix (Delegate to Subagent)

Use Task tool with appropriate subagent based on bug type:

**For backend/API bugs:**
```
TASK: Execute bug fix plan for [bug summary]

CONTEXT:
[Paste the full bug fix plan]

EXPECTED OUTCOME:
- All fix steps completed
- All success criteria verified
- lsp_diagnostics clean on changed files
- Verification commands pass

REQUIRED TOOLS:
- Read, Edit, lsp_diagnostics, Bash

MUST DO:
- Follow fix steps IN ORDER
- Make MINIMAL changes (no refactoring)
- Run lsp_diagnostics after each file change
- Execute verification commands at the end

MUST NOT DO:
- Deviate from plan without explicit reasoning
- Add unrelated improvements
- Suppress errors with type ignores
- Change files not in the plan

REPORT BACK:
1. Changes made (file:line for each edit)
2. Verification results (pass/fail)
3. Any issues encountered
```

**For UI/frontend bugs (load playwright skill):**
```
TASK: Execute UI bug fix plan for [bug summary]

CONTEXT:
[Paste the full bug fix plan]

EXPECTED OUTCOME:
- All fix steps completed
- All success criteria verified
- lsp_diagnostics clean on changed files
- Browser verification passes via Playwright MCP
- No visual regressions detected

REQUIRED TOOLS:
- Read, Edit, lsp_diagnostics, Bash
- Playwright MCP tools for browser automation

MUST DO:
- Follow fix steps IN ORDER
- Make MINIMAL changes (no refactoring)
- Run lsp_diagnostics after each file change
- Execute browser verification scenarios using Playwright
- Take screenshots before/after fix for comparison
- Test the exact user flow that was failing

MUST NOT DO:
- Deviate from plan without explicit reasoning
- Add unrelated improvements
- Suppress errors with type ignores
- Change files not in the plan
- Skip browser verification even if code changes look correct

REPORT BACK:
1. Changes made (file:line for each edit)
2. Verification results (pass/fail)
3. Browser test results with screenshots
4. Any issues encountered
```

---

## Phase 4: Verify & Close (Main Agent)

### Review Results

| Check | Action if Failed |
|-------|------------------|
| All steps completed? | Ask subagent to complete missing steps |
| Success criteria met? | Investigate why, create new plan if needed |
| No new errors? | Fix introduced regressions |
| Verification passed? | Debug verification failure |

### Update traceability.md (if it exists)

After confirming the fix works, update `traceability.md`:

- Add the bug to **Deviations**: what deviated, which step caused it, and the fix applied
- Update any steps that were marked `🔄 In Progress` or `❌ Blocked` to `✅ Done` if the fix resolves them
- Add any new files modified by the fix to **Files Changed**
- Add a **Test Results** entry for the verification outcome

This keeps the traceability file accurate for the full task history.

### Final Verification

1. Run lsp_diagnostics on all changed files
2. Run the original failing scenario
3. Run related tests if they exist
4. Check for regressions
5. **For UI bugs**: Use Playwright MCP to verify fix in browser:
   - Navigate to affected page/component
   - Reproduce the original failing scenario
   - Verify the fix resolves the issue
   - Test related user flows for regressions
   - Take screenshots for documentation

---

## Quality Guidelines

**ALWAYS:**
- Identify root cause before planning fix
- Create specific, actionable fix steps
- Define testable success criteria
- Make minimal changes (fix only what's broken)
- Verify fix doesn't introduce regressions
- For UI bugs: Use Playwright MCP to verify changes are reflected and working properly
- Include browser-based verification in the fix plan for frontend issues

**NEVER:**
- Guess at the root cause
- Mix bug fixes with refactoring
- Skip verification steps
- Deploy subagent without a clear plan
- Suppress errors instead of fixing them
- Assume UI fixes work without browser testing
- Skip Playwright verification for frontend bugs

---

## Escalation Triggers

**Consult Oracle if:**
- Root cause unclear after investigation
- Fix requires architectural changes
- Multiple possible solutions with trade-offs
- Two fix attempts have already failed
- Playwright verification reveals unexpected behavior or additional issues

**Ask User if:**
- Bug is in business logic (intended behavior unclear)
- Fix would change public API
- Multiple valid interpretations of expected behavior
