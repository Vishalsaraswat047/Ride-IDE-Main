---
name: typography
description: Typography system rules — font pairing, hierarchy, scale, measure, leading, letter-spacing, variable fonts, responsive type. H1 is not automatically huge.
---

# Typography Rules

H1 ≠ huge text automatically. Choose type from brand, content, viewport, hierarchy, density.

## Choosing Faces

1. Pick 1 display/heading family + 1 body family max (mono optional for code/labels).
2. Pair by contrast of structure: serif + sans, geometric + humanist, or same family across weights.
3. Strong recommended pairings: Geist/Inter + JetBrains Mono; Fraunces + Inter; Space Grotesk + Inter; Playfair+ Inter (editorial).
4. Use variable fonts where available (single file, all weights) — `font-variation-settings` for optical sizing.
5. Self-host (woff2) for performance + privacy; avoid > 3 font files total, preload the primary.

## Scale & Hierarchy

1. Establish a type scale (e.g. 12/14/16/20/24/32/48/64) and stick to it.
2. Display (hero) uses 4–7rem at desktop, 2.25–3rem mobile — via `clamp()`.
3. Hierarchy = weight/size/color contrast, not italics or all-caps everywhere.
4. One visual emphasis per section. Don't shout everywhere.
5. Body maxes at 16–18px; secondary text 14px; captions 12–13px minimum (never < 12px UI text).

## Measure & Leading

- Measure: 45–75 chars per line (aim ~65). Use `max-w-prose` (~65ch).
- Leading: body 1.5–1.65; large display 1.0–1.2 (tight); mid sizes 1.3–1.4.
- Letter-spacing: display headlines slightly tight (-0.02 to -0.05em); body normal (0); ALL-CAPS small labels +0.05 to +0.1em.
- Never justify without hyphenation control.

## Vertical Rhythm

- Space in multiples of baseline unit (8px). Headings get margin-bottom ≈ 0.5× font-size.
- Consistent paragraph spacing; avoid margin-based overlapping.

## Technical Rules

1. `font-size` on root from CSS, then `rem` everywhere (no px components).
2. `font-display: swap` (or `optional` to avoid FOIT tuning).
3. `text-wrap: balance` for short headlines, `text-wrap: pretty` for paragraphs (modern CSS, Tailwind v4: `text-balance`, `text-pretty`).
4. Break words with `overflow-wrap` on long tokens (URLs).

## Anti-Patterns

- ✗ More than 2–3 families per page
- ✗ Text smaller than 13px for meaningful content
- ✗ > 95ch line length
- ✗ UPPERCASE body copy
- ✗ Random font sizes per section ("designer's walk")

## Fonts Quinn Should Use

- Default premium stack: Geist / Inter / Manrope / Space Grotesk (display), Inter (body), JetBrains Mono / Geist Mono (code).
- Editorial: Fraunces / Newsreader / Source Serif 4.
- System fallback always: `-apple-system, "Segoe UI", Roboto, sans-serif`.