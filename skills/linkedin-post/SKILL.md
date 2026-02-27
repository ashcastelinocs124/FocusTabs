---
name: linkedin-post
description: Use when the user asks to write a LinkedIn post, social media announcement, project update for LinkedIn, or wants to share work publicly. Triggers on "LinkedIn post", "post about this", "announce this", "share on LinkedIn".
---

# LinkedIn Post Skill
**Usage:** /linkedin-post [optional: topic]

**Trigger this skill when:**
- User says "LinkedIn post", "write a post", "announce this"
- User wants to share a project, feature, or achievement publicly
- User asks to "post about this on LinkedIn" or "make a social post"

**Skip for:** Internal docs, blog posts (use /technical-blog), README content

## Phase 1: Understand the Post (MANDATORY)

**Before writing anything, ask clarifying questions using AskUserQuestion.**

### Question 1: What's the post about?

Ask what they want to post about. Use these categories:

| Type | Description | Example |
|------|-------------|---------|
| **Project launch** | Announcing a new project or product | "Built an AI data monitoring platform" |
| **Feature update** | Sharing a specific feature or capability | "Added LLM-powered root cause analysis" |
| **Learning/insight** | Sharing something you learned | "What I learned building multi-agent systems" |
| **Achievement** | Milestone, certification, event | "Presented at UIUC AI symposium" |
| **Opinion/thought** | Hot take or perspective on a topic | "Why data quality is the next frontier" |
| **Hiring/collab** | Looking for collaborators or announcing roles | "Looking for contributors to our open source project" |

### Question 2: Who's the audience?

Ask who they want to reach:
- Technical peers (engineers, data scientists)
- Non-technical stakeholders (managers, executives)
- Recruiters / hiring managers
- General professional network
- Specific community (data engineering, AI/ML, etc.)

### Question 3: Tone and style?

Ask their preference:
- **Technical deep-dive** — specifics, architecture details, stack
- **Storytelling** — narrative arc, problem-journey-solution
- **Casual/conversational** — personal, relatable, authentic voice
- **Professional/polished** — clean, corporate-appropriate, achievement-focused

## Phase 2: Gather Context

Based on the topic, gather relevant material:

**If about current project:**
- Read CLAUDE.md for project overview
- Check recent git commits for what was built
- Read key source files for technical details
- Check docs/plans/ for design decisions

**If about a learning/insight:**
- Ask user for the core insight
- Check codebase for concrete examples to reference

**If about an achievement:**
- Ask for specifics: what, when, impact, who was involved

## Phase 3: Write the Post

### LinkedIn Post Structure

```
[Hook — first 2 lines visible before "see more"]

[Body — the substance]

[Call to action or closing thought]

[Hashtags — 3-5 relevant]
```

### Writing Rules

**The hook (first 2 lines) is everything.** LinkedIn truncates after ~210 characters. The reader decides to click "see more" based on these lines alone.

**Good hooks:**
- Start with a bold statement or surprising fact
- Ask a provocative question
- Lead with a specific result or number
- Open with a relatable frustration

**Bad hooks:**
- "Excited to announce..." (overused, skippable)
- "I'm thrilled to share..." (same energy)
- "Check out my new project!" (no reason to care)
- Starting with project name nobody knows yet

**Body guidelines:**
- **Short paragraphs** — 1-3 sentences max. LinkedIn is mobile-first.
- **Use line breaks generously** — white space aids readability
- **Bullet points** for lists of features/learnings
- **Bold key phrases** sparingly for scannability
- **Include ONE concrete detail** that proves credibility (a number, a specific technical choice, a real challenge)
- **Length:** 150-300 words ideal. Under 100 feels thin, over 400 loses people.

**Hashtags:**
- 3-5 hashtags at the end
- Mix broad (#AI, #DataEngineering) with specific (#LangChain, #MultiAgentSystems)
- Don't hashtag-stuff — it looks desperate

### Post Type Templates

**Project Launch:**
```
[Problem statement — why this matters]

[What you built — 2-3 sentences]

[Key technical differentiators — bullets]

[What's next or invitation to try/contribute]

#tags
```

**Learning/Insight:**
```
[The insight stated boldly]

[The story of how you learned it]

[Why it matters / how it applies broadly]

[Takeaway for the reader]

#tags
```

**Feature Update:**
```
[The problem this feature solves]

[How it works — 2-3 sentences, no jargon]

[One specific example or result]

[Link or next steps]

#tags
```

## Phase 4: Present and Refine

**Show the draft to the user and ask:**

Use AskUserQuestion:
- "Want me to adjust the tone?"
- "Should I add/remove technical detail?"
- "Ready to post, or want changes?"

**Iterate until the user is satisfied.** LinkedIn posts are high-visibility — get it right.

## Quality Checklist

- [ ] Hook grabs attention in first 2 lines (before "see more" truncation)
- [ ] No "Excited to announce" or "Thrilled to share" openers
- [ ] Short paragraphs (1-3 sentences)
- [ ] At least one concrete detail (number, tech choice, real challenge)
- [ ] 150-300 words
- [ ] 3-5 relevant hashtags
- [ ] No sensitive info (API keys, internal URLs, client names)
- [ ] Tone matches the audience
- [ ] Has a clear call-to-action or closing thought
- [ ] Reads naturally on mobile (check line breaks)

## NEVER:

- Write generic corporate-speak that could apply to any project
- Use more than 5 hashtags
- Include entire code blocks (save that for blog posts)
- Name-drop without context
- Make claims without specifics to back them up
- Write walls of text without line breaks
- Start writing without asking what the post is for
