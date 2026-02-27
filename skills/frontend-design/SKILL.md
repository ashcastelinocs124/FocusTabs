---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications, or uploads a screenshot/image as UI inspiration. Generates creative, polished code that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints. They may also upload screenshots or images as visual inspiration.

## Backend Alignment (Required)

Before any frontend work, connect to the backend context:
- Read `CLAUDE.md` to learn the project architecture and conventions.
- Inspect the backend surface (APIs, data contracts, models) relevant to the UI.
- If a backend skill exists, coordinate assumptions with it before proceeding.

## Image-Driven Design (When User Uploads a Screenshot/Image)

When the user uploads or references an image as UI inspiration, follow this workflow **before writing any code**:

### Step 1: Deep Visual Analysis

Use the Read tool to view the image. Analyze and document:
- **Layout structure**: Grid system, column layout, section hierarchy, spacing patterns
- **Color palette**: Extract dominant colors, accent colors, background tones, gradient usage
- **Typography style**: Font weight/size hierarchy, serif vs sans-serif, letter-spacing, line-height feel
- **Component patterns**: Cards, navbars, buttons, forms, modals, tables — what UI patterns are present?
- **Visual texture**: Shadows, borders, rounded corners, glassmorphism, noise, gradients, overlays
- **Motion cues**: Any visible hover states, transitions, or animation hints
- **Mood/tone**: What feeling does this design evoke? (e.g., corporate-clean, playful, dark-luxe, editorial)

Present this analysis to the user as a concise summary: "Here's what I see in your reference..."

### Step 2: Clarifying Questions (MANDATORY)

**You MUST ask clarifying questions before implementing.** Use AskUserQuestion with questions tailored to what's ambiguous. Pick from these categories based on context:

**Scope & Content:**
- "What content/data will populate this UI? Should I use realistic placeholder data or connect to an API?"
- "Which sections from the reference do you want — all of them, or specific parts?"
- "Is this a single page or part of a multi-page app?"

**Fidelity & Interpretation:**
- "How closely should I match this reference? Pixel-faithful reproduction, or use it as loose inspiration?"
- "Are there specific elements you love that I should keep? Anything you'd want changed?"
- "Should I keep the same color palette, or reinterpret it with a different scheme?"

**Technical:**
- "What framework/stack should I use? (React, Vue, plain HTML/CSS, etc.)"
- "Does this need to be responsive, or is it targeting a specific viewport?"
- "Any existing design system or component library I should integrate with?"

**Direction:**
- "What's the purpose of this UI? Who's the target audience?"
- "Any brand guidelines, fonts, or colors that must be used?"

Only ask 2-4 of the most relevant questions — don't overwhelm. Prioritize questions where the answer would significantly change the implementation.

### Step 3: Synthesize & Proceed

After receiving answers, merge the image analysis with user clarifications into a concrete design direction. Then proceed to the Design Thinking and Aesthetics sections below, using the reference image as the creative foundation rather than starting from scratch.

**Key principle:** The reference image sets the *floor* for quality and style — then elevate it. Don't just clone; understand what makes the reference work and push it further.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.