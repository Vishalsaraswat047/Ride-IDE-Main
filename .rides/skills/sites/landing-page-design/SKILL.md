---
name: landing-page-design
description: Landing page skill — hero-first layout, above-the-fold rules, conversion hierarchy, single-message discipline, section order, CTA engineering. For standalone landing/marketing pages.
---

# Landing Page Design

One page, one message, one goal. Every element either supports the goal or gets cut.

## Hero Rules (above the fold)
1. Headline ≤ 10 words, states the outcome ("Ship faster with X").
2. Subheadline ≤ 2 lines: who it's for + mechanism.
3. ONE primary CTA (button). Optional secondary (text link: demo/signup/video).
4. Visual proof beside/above fold: product shot, demo, or human face — NOT abstract illustration.
5. Everything above fold must fit ~1000px height on desktop, ~1.5 screens mobile.

## Section Order (proven)
1. Hero
2. Trust strip (logos/press) — small, not shouting
3. Problem/agitation (2 columns: pain vs relief)
4. Solution/features (3–6, concrete, screenshot-backed)
5. How it works (3 steps)
6. Social proof (testimonials w/ photos + result numbers)
7. Pricing or offer framing (if applicable)
8. FAQ (collapsible, 8–12)
9. Final CTA (big, restates value) + footer

## CTA Engineering
- Contrast: primary CTA is the ONLY filled accent button on screen; everything else ghost/outline.
- Copy = verb + value ("Start free →", "Get the guide"), never "Click here".
- Repetition: CTA appears in nav, hero, mid-page, final section (4× max), with escalating commitment.
- Microcopy under CTA ("No credit card · Cancel anytime") removes last friction.
- Forms: 1–3 fields; submit label repeats value ("Create my account").

## Design Discipline
- 8pt spacing grid; consistent container width (max-w-6xl/7xl).
- 2 fonts max; type scale consistent with hierarchy.
- One accent color; neutrals do 80% of the work.
- Imagery: real product screenshots > stock; illustrations only for abstract concepts.
- Animations: reveals only (≤0.6s), no autoplay carousels, reduced-motion safe.

## Responsive
- Mobile: headline scales with clamp(), CTA stack full-width, images swap to single-column, sticky bottom CTA bar only after 50% scroll (optional).

## Checklist
- [ ] One primary goal, one primary CTA per scroll-viewport
- [ ] Message passes 5-second test
- [ ] Trust elements real
- [ ] No horizontal scroll anywhere
- [ ] Lighthouse ≥ 90 performance
- [ ] A11y: semantic structure, focus states, ≥4.5:1 contrast