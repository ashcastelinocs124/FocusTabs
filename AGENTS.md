## Skills
A skill is a set of local instructions to follow from `.claude/skills/`.

### Available skills
- bug-fix: Systematic bug fixing with planning and delegation. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/bug-fix/SKILL.md)
- code-architect: Deprecated (merged into code-implementation). (file: /Users/ash/Desktop/FocusTabs/.claude/skills/code-architect/SKILL.md)
- code-implementation: Plan, approve, implement, verify. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/code-implementation/SKILL.md)
- code-reviewer: Review code against plans and standards. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/code-reviewer/SKILL.md)
- document-changes: Document changes for PRs/commits. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/document-changes/SKILL.md)
- explain: Explain code or concepts clearly. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/explain/SKILL.md)
- integration-test-validator: Unit/integration/system test validation. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/integration-test-validator/SKILL.md)
- investigator: Deep investigation before implementation. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/investigator/SKILL.md)
- receiving-code-review: Handle external review feedback. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/receiving-code-review/SKILL.md)
- system-arch: Architecture analysis and trade-offs. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/system-arch/SKILL.md)
- tutor: Code explanation and walkthroughs. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/tutor/SKILL.md)
- superdesign: Frontend UI/UX ideation and iteration. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/superdesign/SKILL.md)
- linkedin-post: Guided LinkedIn post drafting. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/linkedin-post/SKILL.md)
- deploy: Deployment with checks and rollback plan. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/deploy/skill.md)
- cleanup: Codebase cleanup before push. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/cleanup/cleanup.md)
- technical-blog: Technical blog writing. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/technical-blog.md)
- test-cases: Generate structured test cases. (file: /Users/ash/Desktop/FocusTabs/.claude/skills/test-cases.md)

## Agent routing for skills
Use these agent definitions when a skill requires delegation.

- code-implementation skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/code-implementation.md
- code-reviewer skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/code-reviewer.md
- integration-test-validator skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/integration-test-validator.md
- system-arch skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/system-arch.md
- tutor skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/tutor.md
- bug-fix skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/root-cause-hunter.md (investigate first, then implement via code-implementation)
- investigator skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/root-cause-hunter.md
- explain skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/tutor.md
- code-architect skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/code-implementation.md
- receiving-code-review skill -> /Users/ash/Desktop/FocusTabs/.claude/agents/code-reviewer.md

Skills without a dedicated agent file should execute directly from their skill instructions in `.claude/skills/`.

## How to use
- If a user names a skill or the task clearly matches one, use that skill.
- If the skill maps to an agent above, route to that `.claude/agents/*.md` file.
- If there is no mapped agent, follow the skill file directly.
- Do not carry skills across turns unless the user re-mentions them.
