---
name: modern-css
description: Modern CSS skill — container queries, :has(), cascade layers, subgrid, color-mix, logical properties, scroll-driven animations, view transitions, nesting. Use for vanilla CSS or complementing Tailwind.
---

# Modern CSS (2024–2026)

Use modern CSS instead of hacks. All of this works in evergreen browsers today.

## Layout

1. **Container queries** — style by container width, not viewport:
   ```css
   .card { container-type: inline-size; }
   @container (min-width: 400px) { .card__grid { grid-template-columns: 1fr 1fr; } }
   ```
   Tailwind v4: `@container` + `@sm:`-style container variants.
2. **Subgrid** — `grid-template-rows: subgrid;` aligns nested rows with parent grid.
3. **:has()** — parent selectors:
   ```css
   .form:has(input:user-invalid) .error-msg { display: block; }
   .card:has(.cta:hover) { box-shadow: ...; }
   ```
4. **Cascade layers** (`@layer reset, base, components, utilities;`) — predictable override order; Tailwind v4 uses layers internally.

## Typography & Color

- `text-wrap: balance` (headlines) / `pretty` (paragraphs).
- `color-mix(in oklab, var(--primary) 40%, transparent)` — alpha variants without new tokens.
- `oklch()` colors for perceptually even contrast (Tailwind v4 default).
- `font-size-adjust`, `font-variation-settings` for variable fonts.

## Logical Properties

- `margin-inline-start`, `padding-block`, `inset-inline-end` — RTL-safe automatically.
- Prefer `inline/block` axes over left/right/top/bottom.

## Motion (CSS-only)

1. **Scroll-driven animations** (`animation-timeline: scroll()/view()`):
   ```css
   .reveal { animation: fade-up linear both; animation-timeline: view(); animation-range: entry 0% entry 60%; }
   ```
2. **View Transitions API** — page/app transitions:
   ```css
   @view-transition { navigation: auto; }
   ::view-transition-old(root), ::view-transition-new(root) { animation-duration: .3s; }
   ```
3. `prefers-reduced-motion: reduce` media query must gate all of the above.

## Other

- `aspect-ratio` for media boxes; `object-fit` for images.
- `:user-valid` / `:user-invalid` for forms (only after user interaction).
- `scroll-margin-top` for anchor links under sticky headers.
- `text-overflow: ellipsis` + `display: -webkit-box; -webkit-line-clamp: N;` for multiline truncation.
- `content-visibility: auto` + `contain-intrinsic-size` for long lists.

## Rules for Quinn

1. Tailwind handles 90% — use raw CSS only for: container queries, scroll-driven animation, view transitions, :has() patterns.
2. Never use `!important` except against inline styles.
3. Always provide a no-JS fallback for JS-gated modern CSS features where content must remain visible.
4. Ship `@supports` guards for progressive enhancement when mixing new + legacy targets.