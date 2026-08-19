---
name: responsive-design
description: Actual responsive rules — breakpoints, fluid type, touch targets, grid collapse, responsive tables/images, mobile nav patterns. Not just "make it responsive".
---

# Responsive Design Rules

"Make it responsive" is not a design instruction. Apply these rules instead.

## Strategy

1. Choose mobile-first or desktop-first per project — document the decision, don't guess per-component.
2. Define the breakpoint ladder once: typically 640 / 768 / 1024 / 1280 (Tailwind default).
3. Layout should mostly derive from container queries / flex-wrap / grid-auto-fit so fewer hard breakpoints are needed.

## Grid & Layout

1. Grids collapse logically per breakpoint: multi-column → single meaningful column (never random).
2. On mobile, keep the critical content and primary CTA first — reorder with `order-*` or source order.
3. Cards become full-width stacked; never shrink below ~280px content width.
4. Sidebars → horizontal tabs or drawer below the content, not permanently pinned.

## Typography

- Fluid type: `clamp(min, vw, max)` or Tailwind `text-fluid-*`; headline scales from ~2rem (mobile) to ~4rem+ (desktop).
- Line-height tightens at larger sizes (1.1–1.2) and loosens small (1.5).
- Measure (line length) stays 45–75 characters at every breakpoint; widen container, not font, on desktop.

## Navigation

1. Mobile nav patterns in order of preference: bottom tab bar (app-like), hamburger + full-screen/drawer menu, persistent top bar with scrollable tabs.
2. Logo → search/primary CTA → menu, same order on all screens.
3. Sticky headers keep usable height on mobile (≤ 64px) or unfix on scroll down.

## Touch & Interaction

- Tap targets ≥ 48×48px on mobile; ≥ 32px spacing between them.
- Hover-only features get tap equivalents (toggle/expand on first tap).
- Use `@media (hover: hover)` to condition hover effects; never rely on hover for mobile.

## Media

1. Images: `srcset`/`sizes` or `next/image`/`astro:asset` with responsive widths.
2. `loading="lazy"` below the fold; `fetchpriority="high"` for LCP image.
3. Tables with many columns: horizontal scroll with pinned first column, or reflow into stacked cards on mobile.
4. Video/iframes: aspect-ratio wrapper, `object-fit` for images.

## Visual Density

- Desktop 8–12 cards per view = data-dense; mobile show 2–4 + "see more".
- Whitespace compresses (or is removed) on mobile — spacing scale can halve.

## Verification

- Test at 360, 768, 1024, 1440.
- No horizontal scroll at 360px.
- All primary flows complete on a phone-sized viewport.