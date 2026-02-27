---
name: investigator
description: Use when a user reports an issue without clear root cause, says "why is this happening", "investigate this", or "look into this". For complex bugs requiring deep analysis and evidence gathering before any fix attempt.
---

# Investigator Skill
**Usage:** /investigator [issue description or error]

**Trigger this skill when:**
- User reports an issue without clear root cause
- User says "why is this happening?", "investigate this", "look into this"
- Unexpected behavior that needs diagnosis
- User mentions in GitHub issue or PR
- Complex bugs requiring deep analysis before fixing

**Skip for:** Known bugs with clear fixes (use bug-fix), feature requests (use code-implementation), code explanation (use tutor)

---

## Core Philosophy

**Investigate FIRST, implement LATER.**

This skill is about understanding the problem thoroughly before proposing solutions. No code changes until the user approves your findings.

```
USER REPORTS ISSUE
       ↓
   INVESTIGATE (you are here)
       ↓
   PRESENT FINDINGS
       ↓
   USER APPROVES? ──NO──→ Refine investigation
       ↓ YES
   INVOKE /code-implementation
```

---

## Phase 1: Issue Intake

### Step 1.1: Capture the Problem

| Question | Purpose |
|----------|---------|
| What is the observed behavior? | Understand the symptom |
| What is the expected behavior? | Define success |
| When does it occur? | Identify triggers |
| Is it reproducible? | Assess reliability |
| Any error messages/logs? | Get direct evidence |

### Step 1.2: Clarify if Needed

If issue is vague, ask ONE clarifying question:
```
I want to investigate this properly. 
Could you clarify: [specific question]?
```

**Do NOT proceed with guesses.** Vague issues lead to wasted investigation.

---

## Phase 2: Deploy Investigator Sub-Agent

**The main agent does NOT investigate directly.** Instead, it assembles a minimal context packet and deploys a `root-cause-hunter` sub-agent with only the information needed for this specific bug. This keeps the main context window clean and gives the sub-agent a focused, uncluttered workspace.

### Step 2.1: Assemble Context Packet (Main Agent)

Before deploying the sub-agent, gather ONLY what it needs. Do a quick scan (1-2 Grep/Glob calls max) to identify:

| Context Item | How to Get It | Include? |
|--------------|---------------|----------|
| Error message / stack trace | From user's report | Always |
| Affected file paths + line numbers | From error or quick grep | Always |
| Recent git changes to affected files | `git log --oneline -5 <file>` | If relevant |
| Related function signatures | Quick read of affected lines | Always |
| Data schema or config if relevant | One targeted file read | Only if data/config bug |

**Do NOT:**
- Read entire files and dump them into the prompt
- Include unrelated code or project history
- Pass the full conversation — only the bug-relevant parts

### Step 2.2: Deploy the Sub-Agent

Use the Task tool with `subagent_type="root-cause-hunter"` and `model="sonnet"`. Sonnet is fast and cheap — save Opus for the main agent's synthesis. The prompt must be **self-contained** — the sub-agent has NO access to your conversation history.

```
Task(
  subagent_type="root-cause-hunter",
  model="sonnet",
  description="Investigate [3-5 word bug summary]",
  prompt="""
## Bug Report

**Symptom:** [Exact error or wrong behavior from user]
**Expected:** [What should happen instead]
**Reproducible:** [Yes/No/Sometimes]

## Affected Code

**Files:** [List file paths]
**Key functions:** [Function names + brief role]
**Error location:** [file:line if known]

## Context

[Paste ONLY the relevant code snippets, 20-50 lines max per file]
[Include any error output or log snippets]
[If data bug: include schema or sample data]
[If recent regression: include git diff summary]

## Your Task

1. Read the affected files and trace the bug from symptom to root cause
2. Check error handling, edge cases, and data flow
3. Look for similar working patterns elsewhere in the codebase
4. Identify the EXACT root cause with file:line evidence
5. Propose a specific fix (what to change and why)
6. State your confidence: HIGH / MEDIUM / LOW

Report back with:
- Root cause (location + explanation)
- Evidence (code that proves it)
- Proposed fix (specific changes)
- Confidence level
- Any remaining uncertainties
- **Recommended fix model:** State whether fixing this bug requires **Opus** or **Sonnet**:
  - Use **Sonnet** if: single-file fix, straightforward logic change, clear pattern to follow, <3 files affected
  - Use **Opus** if: multi-file architectural change, complex refactor, subtle concurrency/state bug, requires reasoning across many dependencies, or >3 files affected
"""
)
```

### Step 2.3: Review Sub-Agent Report

When the sub-agent returns, evaluate its findings:

| Check | Pass? | Action if Failed |
|-------|-------|------------------|
| Root cause is specific (file:line) | | Redeploy with narrower focus |
| Evidence supports the conclusion | | Ask sub-agent to verify with different angle |
| Fix addresses root cause, not symptom | | Refine the proposed approach |
| Confidence is HIGH or MEDIUM | | Deploy second sub-agent with different hypothesis |

**If sub-agent returns LOW confidence or conflicting findings:**
Deploy a second sub-agent with a different investigation angle (e.g., check git history instead of code flow, or check integration points instead of internal logic).

### Step 2.4: Synthesize into Findings

Take the sub-agent's report and format it for the user (Phase 3). Add any context from your own intake that helps explain the bug. Do not present raw sub-agent output — synthesize it.

---

## Phase 3: Present Findings (MANDATORY)

### Investigation Report Template

```markdown
## Investigation Report: [Issue Title]

### Issue Summary
**Reported:** [What user described]
**Observed:** [What I found/reproduced]

---

### Root Cause Identified

**Location:** `file/path:line` (or multiple locations)

**What's Happening:**
[Clear explanation of the bug mechanism - 2-3 sentences]

**Why It's Happening:**
[Technical explanation of the root cause]

**Evidence:**
- [Code snippet or log that proves this]
- [Behavior that confirms hypothesis]

---

### Confidence Level
[ ] HIGH - Root cause confirmed with clear evidence
[ ] MEDIUM - Strong hypothesis, some uncertainty
[ ] LOW - Multiple possible causes, needs more info

---

### Proposed Fix

**Approach:** [Brief description of how to fix]

**Files to Change:**
- `path/to/file1` - [what change]
- `path/to/file2` - [what change]

**Estimated Complexity:** [Low / Medium / High]

**Risks:**
- [Potential risk 1]
- [Potential risk 2]

---

### Alternative Approaches (if any)
1. [Alternative 1] - Pros/Cons
2. [Alternative 2] - Pros/Cons

---

### Questions/Uncertainties
- [Any remaining questions]
- [Areas needing user input]

---

### Next Steps

Awaiting your approval to proceed with the fix.

**Options:**
1. **Approve** - I'll invoke /code-implementation to implement the fix
2. **Reject/Modify** - Tell me what to investigate further
3. **Ask Questions** - I'll clarify anything unclear
```

---

## Phase 4: Approval Gate (MANDATORY)

### Wait for User Response

**DO NOT proceed to implementation without explicit approval.**

| User Response | Action |
|---------------|--------|
| "Approved", "Go ahead", "Fix it" | Proceed to Phase 5 |
| "Not sure about X", questions | Answer questions, re-present if needed |
| "I think it's Y instead" | Re-investigate with new direction |
| "Rejected", "Wrong" | Ask what was wrong, re-investigate |

### If User Approves with Modifications

1. Update your understanding based on feedback
2. Confirm the updated approach
3. Then proceed to implementation

---

## Phase 5: Hand Off to Implementation

### Invoke Code Implementation Skill

Upon approval, invoke the `/code-implementation` skill with full context:

```markdown
/code-implementation

## Task: Fix [Issue Title]

### Background
[Brief issue description]

### Root Cause (from investigation)
[Summary of findings]

### Approved Fix Approach
[The approach user approved]

### Files to Modify
- `path/to/file1` - [change description]
- `path/to/file2` - [change description]

### Success Criteria
- [ ] [Specific testable outcome]
- [ ] [Specific testable outcome]
- [ ] No regressions in related functionality

### Verification
[How to verify the fix works]
```

**After implementation completes:**
- Report back to user with summary
- Confirm the issue is resolved

---

## Quality Guidelines

**ALWAYS:**
- Gather evidence before forming hypothesis
- Use multiple search angles (parallel agents)
- Present findings BEFORE proposing fixes
- Wait for explicit approval
- State confidence level honestly
- Hand off to code-implementation for actual fixes

**NEVER:**
- Guess at root cause without investigation
- Start fixing before user approves
- Present multiple weak hypotheses as "possibilities"
- Skip the approval gate
- Implement fixes directly (that's code-implementation's job)

---

## Investigation Anti-Patterns

| Bad Practice | Why It's Bad | Do This Instead |
|--------------|--------------|-----------------|
| Guessing root cause | Wastes time on wrong fixes | Investigate with evidence |
| "It might be X or Y or Z" | Unhelpful, no commitment | Pick most likely, state confidence |
| Fixing without approval | User may disagree with approach | Always present findings first |
| Surface-level search | Misses real root cause | Deep dive with multiple angles |
| Ignoring user's theory | They often have valuable context | Consider their input seriously |

---

## Escalation Triggers

**Consult Oracle if:**
- Root cause unclear after thorough investigation
- Multiple equally plausible hypotheses
- Architecture-level issue discovered
- Security vulnerability found

**Ask User if:**
- Need access to logs/data you can't see
- Business logic unclear (intended behavior?)
- Multiple valid fix approaches with trade-offs
- Issue may be intentional behavior
