# Framework-Specific Implementation Reference

## Framework Detection

Detect the project's framework before generating code. Check in order:

1. `package.json` → look for `next`, `react`, `vue`, `svelte`, `astro`, `@angular/core`
2. `astro.config.*`, `next.config.*`, `nuxt.config.*`, `svelte.config.*` → framework config files
3. `tsconfig.json` → TypeScript project
4. No framework files → default to single-file HTML

## Single-File HTML (default)

Use when no framework is detected or user requests standalone HTML.

```
Structure:
- Single index.html file
- Inline <style> in <head> (CSS custom properties at :root)
- Inline <script> at end of <body>
- Google Fonts loaded via <link> in <head>
- Images via placeholder services or inline SVG
- Intersection Observer for scroll animations
- No build step required
```

Key patterns:
- CSS custom properties for theming: `--color-primary`, `--color-surface`, `--text-primary`
- `scroll-behavior: smooth` on html
- `@media (prefers-reduced-motion: reduce)` to disable animations
- Responsive: mobile-first with `min-width` breakpoints at 768px and 1024px
- Use `<picture>` with `srcset` for responsive images when applicable

## React / Next.js

```
Structure:
- Components in src/components/ or app/components/
- One component per section: Hero.tsx, Features.tsx, Pricing.tsx, etc.
- Shared: Button.tsx, Container.tsx, SectionWrapper.tsx
- Styles: CSS Modules, Tailwind, or styled-components (match existing project)
- Next.js: use App Router (app/) conventions if next.config exists
```

Key patterns:
- `'use client'` directive for interactive components (Next.js App Router)
- `framer-motion` or `motion` for animations if already in dependencies
- `next/image` for optimized images in Next.js
- `next/font` for font loading in Next.js
- Intersection Observer via `useInView` hook for scroll-triggered animations
- Export metadata from page.tsx for SEO

## Vue / Nuxt

```
Structure:
- Components in components/ (auto-imported in Nuxt)
- Single File Components (.vue): <template>, <script setup>, <style scoped>
- Nuxt: pages/index.vue for the landing page
```

Key patterns:
- `<script setup lang="ts">` for Composition API
- `v-motion` or custom directives for animations
- `useHead()` for SEO meta in Nuxt
- `<NuxtImage>` for optimized images in Nuxt

## Astro

```
Structure:
- Pages in src/pages/index.astro
- Components in src/components/ (.astro for static, .tsx/.vue for interactive)
- Layouts in src/layouts/
```

Key patterns:
- Static by default — use `client:visible` for interactive islands
- Frontmatter for data fetching and props
- `<style>` is scoped by default
- Import framework components (React/Vue/Svelte) as needed

## Svelte / SvelteKit

```
Structure:
- Routes in src/routes/+page.svelte
- Components in src/lib/components/
```

Key patterns:
- `transition:` and `animate:` directives for motion
- `$:` reactive declarations
- `+page.ts` for data loading
- Scoped styles by default

## Universal Patterns (all frameworks)

### Responsive breakpoints
```
Mobile:    < 768px   (default / base styles)
Tablet:    768px+    (2-column layouts)
Desktop:   1024px+   (full layouts)
Wide:      1280px+   (max-width containers)
```

### Container
```
max-width: 1200px (content) / 1400px (wide sections)
padding-inline: 1.5rem (mobile) / 2rem (tablet) / 4rem (desktop)
margin-inline: auto
```

### Section spacing
```
padding-block: 4rem (mobile) / 6rem (tablet) / 8rem (desktop)
```

### Font scale (fluid)
```
Hero headline:    clamp(2.5rem, 5vw, 4.5rem)
Section headline: clamp(1.75rem, 3vw, 3rem)
Subheadline:      clamp(1.125rem, 2vw, 1.5rem)
Body:             clamp(1rem, 1.2vw, 1.125rem)
Small:            clamp(0.875rem, 1vw, 0.9375rem)
```
