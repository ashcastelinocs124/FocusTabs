# .claude — Global Claude Code Config

Global skills, agents, and settings used across all projects.

## Structure

```
.claude/
  skills/           ← general-purpose skills (available in every project)
  agents/           ← sub-agents dispatched by skills
  commands/         ← custom slash commands
  CODING_WORKFLOW_GUIDE.md
```

## Skills

| Skill | Purpose |
|-------|---------|
| `code-implementation` | Plan → approve → implement → review cycle |
| `bug-fix` | Root cause analysis + targeted fix with traceability.md integration |
| `gitpush` | Safe push with secret scanning, branch/README hooks, confirmation gate |
| `system-arch` | Architecture decisions with AskUserQuestion gates at each phase |
| `code-reviewer` | Validate implementation against plan and coding standards |
| `skill-creator` | Guide for building new skills |
| `capture-learnings` | Extract session learnings to learnings.md + improve skills |
| `debate` | Stress-test architecture proposals |
| `frontend-design` | Production-grade UI implementation |
| `superdesign` | Design-first UI/UX agent |
| `validation` | Brutally honest architecture feedback |
| `integration-test-validator` | Comprehensive test suite validation |
| `investigator` | Deep root-cause investigation |
| `summarize` | Structured session summaries |
| `gitpush` | Safe GitHub push workflow |
| `landing-page` | High-converting landing page generation |

## Agents

| Agent | Dispatched by |
|-------|--------------|
| `code-implementation` | `/code-implementation` skill for heavy subtasks |
| `code-reviewer` | Auto-called after implementation completes |
| `root-cause-hunter` | `/bug-fix` skill for investigation |
| `integration-test-validator` | After code review passes |
| `system-arch` | Architecture design tasks |
| `tutor` | Explanations on request |

## Convention

Project-specific skills live in `<project-folder>/.claude/skills/` — not here.
Only general-purpose skills that apply to every project belong in this repo.

See global `CLAUDE.md` for full rules.
