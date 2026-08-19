---
name: design-systems
description: How to USE a design system — tokens, component registry discipline, don't invent new components, consistency rules. The meta-skill for all UI libraries.
---

# Design System Usage

RIDE has a component/design registry. Quinn's job is to CONFIGURE and REUSE, not reinvent.

## The Core Discipline

1. **Don't invent a new button.** Search the project's component registry / design tokens first.
2. Find the right component → configure it with props/tokens → reuse it everywhere.
3. Only create a new component when no existing one fits AND it will be reused ≥ 3 times.
4. Components defined in projects: `src/components/ui/*` (shadcn), `packages/ui/*` (workspace), theme `components/` (MUI/Chakra).

## Token Layer (what all components consume)

Every generated project should define, then components MUST consume:

- Colors: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring` (shadcn naming), light + dark.
- Typography scale + font families.
- Spacing scale (4px base): 4/8/12/16/24/32/48/64.
- Radii: sm 6px, md 8px, lg 12px, xl 16px, full.
- Shadows: 1 level for cards, 1 for elevated/dialog, 1 for popovers.
- Motion: durations 150/300/500, easings standard/expo.

## Don't / Do

| Don't | Do |
|---|---|
| Hardcode hexes in components | Use token variables (`bg-primary`, `var(--primary)`) |
| Inline styles for layout | Use utility classes / system spacing |
| Copy-paste a widget with tweaks | Extend or wrap the base component |
| Style per-page | Style per-token/variant |
| Mixed component libraries on one page (Radix + MUI + Chakra together) | One library per project |

## Variant Discipline

- Every button has variants: primary/secondary/outline/ghost/destructive/link + sizes sm/default/lg/icon.
- New variants = new tokens, not new components.
- States always included: default, hover, active, focus-visible, disabled, loading.

## Consistency Checks (run before shipping a UI)

- [ ] Same component used for same purpose site-wide (buttons, badges, dialogs).
- [ ] No hardcoded colors/fonts/radius/shadow except tokens.
- [ ] Sizes come from the scale, not arbitrary px.
- [ ] Dark mode uses tokens (no new hardcoded colors).
- [ ] Icon set is a single family.