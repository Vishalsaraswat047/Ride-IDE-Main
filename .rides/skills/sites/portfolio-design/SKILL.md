---
name: portfolio-design
description: Portfolio/personal site design — creative expression, project showcase, hero personality, case studies, contact CTA, creative interaction. For personal/creative portfolios.
---

# Portfolio Design System

Portfolio = the most personal page you'll build. It must feel authored, not generated.

## Visual Direction
- Express the person's discipline: developer → terminal/mono accents, grids; designer → typography-forward; creative → bold color/type.
- Structure: hero (identity) → selected work → about → contact. No generic "services" card grids.

## Structure
1. **Hero**: name/statement in one line + role + current focus ("Building X at Y"). A signature visual (photo, 3D avatar, kinetic type).
2. **Selected work**: 3–6 projects. Each = title, one-line outcome, visual (screenshot/mockup/video), tags (stack), link. Order by relevance, not chronology.
3. **Case-study pattern** (for flagship project): context → problem → process (2–4 artifacts) → solution → results (numbers) → stack.
4. **About**: short human story + skills/stack + downloadable resume.
5. **Contact**: direct email + socials + availability status ("Open to freelance Q3").

## Project Cards
- Visual-first: screenshot 16:9, hover → interactive preview (video autoplay muted, or image zoom), tags ≤ 4.
- Each card links to live demo > GitHub > case study.

## Interaction & Motion
- Tasteful creative motion allowed: scroll reveals in view, magnetic buttons, cursor trail, hero 3D/particles — but ALWAYS reduced-motion safe and performance-capped.
- Hover micro-interactions on project cards (scale 1.02, image reveal).
- Page transitions (View Transitions / Motion AnimatePresence) suit portfolios — 0.3s, no spin.

## Typography
- Distinct display face (editorial serif or grotesk) + mono accents for labels; personal, not Inter-default.
- Big type OK: statements at 3–6rem with `text-balance`.

## Content Rules
1. Every claim supported by a link (companies, projects).
2. Real names/logos for references; fictional clearly marked.
3. Numbers in results ("40k monthly views"), not adjectives.
4. One primary contact action per page (email button).
5. Photo if present: professional, 300kb-optimized. No stock "developer at desk" clichés.

## Checklist
- [ ] Hero answers "who + what + where to click"
- [ ] ≤ 6 projects shown; rest "more" page or filter
- [ ] Mobile: single column, images full-width
- [ ] Reduced-motion safe
- [ ] Lighthouse ≥ 90