---
name: gitpush
description: Safely push code to GitHub while preventing sensitive files. Use when the user asks to push, publish, or sync code to GitHub, or mentions git push/branching.
---

# gitpush

## Purpose
Push code to GitHub following basic industry practices, with explicit repo/branch confirmation and strict sensitive-file exclusions.

## Required Safety Rules
- Never push `.env`, `.claude/**`, credentials, or secrets (e.g., keys, tokens, config with secrets).
- Always review `git status` and `git diff` before pushing.
- **Always ask the user which repo and branch to push to — never assume.**
- Always show a final confirmation summary and get explicit approval before committing or pushing.
- Never force-push unless explicitly requested.
- If this is the first push (no remote history), ensure a `README.md` exists before pushing.
- **Always verify commits are attributed to the correct account.** Run `git config user.name` and `git config user.email` and confirm both match:
  - `user.name` = `ashcastelinocs124`
  - `user.email` = `ashleyn4@illinois.edu`
  - If either is wrong, run `git config user.name "ashcastelinocs124"` and `git config user.email "ashleyn4@illinois.edu"` to fix before committing.

## Workflow

### Step 1 — Gather info
Run `git status`, `git diff`, `git remote -v`, and `git branch` to understand current state.

Also run `git config user.name` and `git config user.email`. If they don't match `ashcastelinocs124` / `ashleyn4@illinois.edu`, fix them now:
```bash
git config user.name "ashcastelinocs124"
git config user.email "ashleyn4@illinois.edu"
```

### Step 2 — Branch selection (BLOCKING — use AskUserQuestion)

Use the `AskUserQuestion` tool to ask which branch to push to. Build the options dynamically from `git branch -a` output:

```
question: "Which branch do you want to push to?"
header: "Target branch"
options:
  - label: "<current branch>"         ← always first
    description: "Push to current branch (currently checked out)"
  - label: "main"                     ← if exists and different from current
    description: "Push to main branch"
  - label: "New branch"
    description: "Create and push to a new branch — I'll ask for the name"
```

- If user selects "New branch", ask for the name with a follow-up `AskUserQuestion` or text prompt.
- If pushing to main/master, note: "This pushes directly to the default branch."

### Step 2.5 — README check (BLOCKING — use AskUserQuestion)

Check if a `README.md` exists in the repo root. Then use `AskUserQuestion`:

```
question: "Does the README need to be updated before pushing?"
header: "README update"
options:
  - label: "No, README is fine"
    description: "Proceed without touching the README"
  - label: "Yes, update it"
    description: "I'll describe what changed and you update the README before pushing"
  - label: "No README exists — create one"    ← only show if README is missing
    description: "Generate a basic README before pushing"
```

- If user selects "Yes, update it": ask them what to add/change, make the edits, then continue.
- If user selects "create one": generate a minimal README based on the repo contents, show it for approval, then continue.

### Step 3 — Scan for sensitive files
- `.env`, `.env.*`
- `.claude/**`
- `credentials.json`, `secrets.*`, `*.pem`, `*.key`
- Any file containing obvious secrets

If sensitive files are staged or modified, **stop and ask** the user what to do.

### Step 4 — Show final confirmation summary + AskUserQuestion gate (BLOCKING — do not skip)

Display the summary to the user:

```
Ready to push:
  Repo:    <remote URL>
  Branch:  <branch name>
  Files:   <list of staged files>
  Commit:  "<proposed commit message>"
  Author:  ashcastelinocs124 <ashleyn4@illinois.edu>  ✓
```

Then **immediately use the `AskUserQuestion` tool** with this exact question:

```
question: "Are you sure you want to push to <branch> on <repo>?"
header: "Confirm push"
options:
  - label: "Yes, push it"
    description: "Proceed with git push"
  - label: "No, cancel"
    description: "Abort — do not push anything"
```

**Do NOT run any git commit or git push command until the user selects "Yes, push it".
If they select "No, cancel" or "Other", abort immediately and tell the user nothing was pushed.**

### Step 5 — Execute
1. If first push, verify `README.md` exists; create one only if the user asks.
2. Ensure branch is up to date (pull/rebase if needed) unless user says otherwise.
3. Commit and push to the confirmed repo and branch.

## Example Prompt
User: "push my changes"
Assistant:
1. Run status/diff/remote/branch checks + fix git identity if needed.
2. AskUserQuestion → "Which branch?" (options: current branch / main / new branch)
3. AskUserQuestion → "Does the README need updating?" (yes / no / create)
4. Scan for sensitive files — stop if any found.
5. Show confirmation summary (repo, branch, files, commit message, author).
6. AskUserQuestion → "Are you sure you want to push?" (Yes, push it / No, cancel)
7. Commit and push only after explicit "Yes, push it".

---

## Examples

See [`examples.md`](.claude/skills/gitpush/examples.md) for full annotated walkthroughs.

**Available examples:**
- **Example 1** — Pushing files to a separate empty repo (different repo from working directory, first-time push, false-positive secret scan)

