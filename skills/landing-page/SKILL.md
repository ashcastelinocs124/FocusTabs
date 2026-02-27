---
name: landing-page
description: Build high-converting, industry-standard landing pages with proper section structure, copy patterns, and conversion optimization. Extends the frontend-design skill with landing-page-specific structure and strategy. Use when the user asks to create a landing page, marketing page, product page, waitlist page, coming soon page, portfolio site, app download page, or any single-page site designed to convert visitors. Triggers on requests like "build me a landing page", "create a product page", "make a waitlist page", "design my portfolio site", or "I need a page for my SaaS/app/event".
---

# Landing Page

Build conversion-focused landing pages that follow industry-standard structure, copy patterns, and UX conventions. This skill layers landing-page-specific guidance on top of the `frontend-design` skill's aesthetic system.

## Workflow

### 1. Classify the Page Type

Determine the landing page type from user context and project files:

| Type | Signals | Reference |
|------|---------|-----------|
| **SaaS / Product** | pricing, features, "sign up", B2B/B2C software | [saas-product.md](references/saas-product.md) |
| **Portfolio / Personal** | "my work", case studies, resume, freelance | [portfolio-personal.md](references/portfolio-personal.md) |
| **Event / Conference** | dates, speakers, tickets, schedule | [event-other.md](references/event-other.md) |
| **Waitlist / Coming Soon** | "launching soon", email capture, teaser | [event-other.md](references/event-other.md) |
| **Nonprofit / Cause** | donate, volunteer, impact metrics | [event-other.md](references/event-other.md) |
| **App Download** | mobile app, App Store, Play Store | [event-other.md](references/event-other.md) |

Read the matching reference file for required sections, copy formulas, and patterns.

### 2. Detect Framework

Check [frameworks.md](references/frameworks.md) for framework detection logic. Check `package.json` and config files to determine the tech stack. Default to single-file HTML when no framework is detected.

### 3. Apply Frontend Design Skill

This skill extends `frontend-design`. Apply all its rules:
- Read `CLAUDE.md` for project architecture
- Choose a bold aesthetic direction (never generic)
- Follow all typography, color, motion, and spatial guidelines
- Avoid the AI slop aesthetics listed in that skill

### 4. Build the Page

Follow these principles while implementing:

**Structure**: Use the section order from the reference file. Every section exists for a conversion reason — don't skip sections without justification, don't reorder arbitrarily.

**Copy**: Use the copy formulas from the reference file. Headlines are benefit-driven, not feature-driven. CTAs use action verbs. Subheadlines address pain points.

**Conversion**: Apply these non-negotiable patterns:
- Primary CTA visible at every scroll depth (sticky nav or repeated inline)
- CTA buttons have minimum 4.5:1 contrast ratio against background
- Reduce friction near every CTA (trust signals, "no credit card", "free trial")
- One primary action per page — everything else is secondary
- F-pattern or Z-pattern eye flow for content-heavy sections
- Above-the-fold must answer: What is it? Who is it for? What do I do next?

**Performance**:
- Lazy-load images below the fold (`loading="lazy"`)
- Preload hero fonts and critical CSS
- Keep total page weight under 500KB for HTML builds (excluding images)
- Use `font-display: swap` for web fonts

**SEO**:
- Semantic HTML: one `<h1>` (hero headline), proper heading hierarchy
- `<meta name="description">` matching the hero subheadline
- Open Graph tags: `og:title`, `og:description`, `og:image`
- `<title>` tag: `[Product/Name] — [Value Proposition]`

**Accessibility**:
- All interactive elements keyboard-navigable
- Skip-to-content link
- Alt text on all images
- `aria-label` on icon-only buttons
- `prefers-reduced-motion` media query disabling animations
- Minimum 16px body text, minimum 44px touch targets

**Responsive**:
- Mobile-first: base styles for mobile, `min-width` breakpoints for larger
- Breakpoints: 768px (tablet), 1024px (desktop), 1280px (wide)
- Hero headline scales with `clamp()` — see frameworks.md for fluid scale
- Navigation collapses to hamburger menu on mobile
- Stack multi-column layouts to single column on mobile
- Test that CTAs are thumb-reachable on mobile

## Anti-Patterns to Avoid

- Generic stock photography (use product shots, illustrations, or abstract visuals)
- Walls of text — if a section has more than 3 sentences, break it up
- Multiple competing CTAs with equal visual weight
- Carousel/slider for hero content (low engagement, kills conversion)
- Auto-playing video with sound
- Pagination or "read more" links on a landing page — show everything
- Pop-ups on first visit
- Missing mobile navigation
- CTA below the fold with no CTA above the fold
