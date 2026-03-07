---
name: max-wigium
description: Use when you want to go fully end-to-end from raw idea to working tested code in one session. Chains brainstorm-to-arch (idea → debate → system architecture) into arch-to-code (architecture → paired test+code subagents per task → committed implementation). One command, full pipeline.
---

# Max Wigium — Full Pipeline Orchestrator

## Overview

One skill. Full pipeline. Raw idea → battle-tested architecture → working, tested code.

```
brainstorm-to-arch   →   arch-to-code   →   finishing-a-development-branch
  (idea to arch)         (arch to code)         (ship it)
```

You do not implement this skill yourself. You **run the two sub-skills in sequence** and let them drive the work. Your job is to:
1. Run **brainstorm-to-arch** to completion (arch doc saved + committed)
2. Run **arch-to-code** to completion (all tasks implemented, tests passing)
3. Hand off to `superpowers:finishing-a-development-branch`

## Sub-Skills (read these files when executing each stage)

This skill folder contains two supporting files. Read the relevant one before starting each stage:

| Stage | File | What it contains |
|-------|------|-----------------|
| Stage 1 | `brainstorm-to-arch.md` | Full brainstorming + debate + arch doc flow |
| Stage 2 | `arch-to-code.md` | Paired test+code subagent implementation flow |

**REQUIRED: Read `brainstorm-to-arch.md` before starting Stage 1.**
**REQUIRED: Read `arch-to-code.md` before starting Stage 2.**

Do not rely on memory of these files — read them fresh at the start of each stage.

---

## The Pipeline

### Stage 1 — Brainstorm → Architecture

**Read:** `brainstorm-to-arch.md` (in this folder) then follow it completely.

Run the full brainstorm-to-arch flow. Do not shortcut any phase. The stage ends when:
- The arch doc is saved to `docs/architecture/YYYY-MM-DD-<topic>-arch.md`
- The arch doc is committed to git
- Both you and the user are confident in the design

**Do NOT move to Stage 2 until the arch doc is committed.**

---

### Stage 2 — Architecture → Code

**Read:** `arch-to-code.md` (in this folder) then follow it completely.

Once the arch doc is committed, start the arch-to-code flow. Pass it:
- The path to the arch doc just created
- All context accumulated during the brainstorm (user, problem, constraints, tech stack)

Run the full arch-to-code skill. Do not shortcut any task. The skill ends when:
- All tasks are implemented
- All tests are passing
- All tasks are committed

**Do NOT move to Stage 3 until all tasks are committed and green.**

---

### Stage 3 — Ship It

**Invoke:** `superpowers:finishing-a-development-branch`

Hand off cleanly. The finishing skill decides: PR, merge, or cleanup.

---

## Transition Hook Between Stages

After Stage 1 completes, fire this hook before starting Stage 2:

```
question: "Architecture is done and committed. Ready to move into implementation?"
header: "Start Stage 2"
options:
  - label: "Yes — kick off arch-to-code now"
    description: "Deploy paired test+code subagents for each task."
  - label: "Let me review the arch doc first"
    description: "Take a moment to read it, then tell me when to start."
  - label: "Something needs to change in the arch"
    description: "Go back into brainstorm-to-arch to revise before implementing."
```

---

## Rules

- **Never skip a stage.** Don't jump to arch-to-code without a committed arch doc. Don't finish without all tests green.
- **Never merge stages.** Don't start writing code during the brainstorm. Don't revise the arch during implementation — if a task reveals an arch problem, surface it and decide: patch the arch doc first, then continue.
- **Every question is a hook.** Both child skills enforce this — continue the pattern throughout.
- **The user can always chat.** "Other" on any hook is a conversation, not a dead end.

---

## If Something Goes Wrong Mid-Pipeline

If the arch turns out to be wrong during implementation:

```
question: "A task revealed a problem with the architecture. How do you want to handle it?"
header: "Arch conflict"
options:
  - label: "Patch the arch doc and continue"
    description: "Update the arch doc to reflect the new decision, commit it, then continue the task."
  - label: "Go back to brainstorm-to-arch"
    description: "The problem is significant enough to revisit the design before continuing."
  - label: "Accept it as a known deviation and document it"
    description: "Continue the task but note the deviation in the arch doc's Accepted Risks section."
```

---

## Quick Reference

| Stage | Skill | Ends when |
|-------|-------|-----------|
| 1 | `brainstorm-to-arch` | Arch doc committed, both sides confident |
| 2 | `arch-to-code` | All tasks implemented, all tests green, all committed |
| 3 | `superpowers:finishing-a-development-branch` | Branch shipped or PR created |
