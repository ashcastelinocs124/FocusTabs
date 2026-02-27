---
name: gitpush
description: Safely push code to GitHub while preventing sensitive files. Use when the user asks to push, publish, or sync code to GitHub, or mentions git push/branching.
---

# gitpush

## Purpose
Push code to GitHub following basic industry practices, with explicit branch confirmation and strict sensitive-file exclusions.

## Required Safety Rules
- Never push `.env`, `.claude/**`, credentials, or secrets (e.g., keys, tokens, config with secrets).
- Always review `git status` and `git diff` before pushing.
- Always ask the user which branch to push to (main/master vs another branch) and confirm.
- Never force-push unless explicitly requested.
- If this is the first push (no remote history), ensure a `README.md` exists before pushing.

## Workflow
1. Check `git status` and `git diff`.
2. Identify any sensitive files:
   - `.env`, `.env.*`
   - `.claude/**`
   - `credentials.json`, `secrets.*`, `*.pem`, `*.key`
   - Any file containing obvious secrets
3. If sensitive files are staged or modified, stop and ask the user what to do.
4. Ask user which branch to push to and confirm the target:
   - If main/master, request explicit confirmation.
5. If first push, verify `README.md` exists; create one only if the user asks.
6. Ensure branch is up to date (pull/rebase if needed) unless user says otherwise.
7. Push to the confirmed branch.

## Example Prompt
User: "push my changes"
Assistant:
1. Review status/diff.
2. Ask: "Which branch should I push to? main or another branch?"
3. Ensure no sensitive files are included.
4. Push to the confirmed branch.

