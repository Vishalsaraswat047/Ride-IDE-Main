---
name: galaxy
description: Galaxy skill — uiverse.io's open-source UI library (3000+ community-made components in CSS/Tailwind, MIT licensed). Local copy at .rides/galaxy/. Use when a project needs a ready-made button, card, form, input, loader, notification, toggle, tooltip or pattern instead of writing from scratch.
---

# Galaxy (uiverse.io) — Open-Source UI Component Library

The largest open-source UI library: 3000+ community-made, free, MIT-licensed UI elements. RIDE keeps a local copy so components can be pulled into user projects offline.

## Local source

```
C:\Users\Visha\ride\.rides\galaxy\
```

Category folders (each contains standalone `.html` files, one component per file):

| Folder | Contents |
|---|---|
| `Buttons/` | buttons — gradient, glow, hover effects, icon buttons |
| `Cards/` | cards — profiles, pricing, product, glassmorphism |
| `Checkboxes/` | checkbox styles, animated checks |
| `Forms/` | full form blocks, login/signup, search bars |
| `Inputs/` | text inputs, search inputs, tags, password fields |
| `loaders/` | loaders, spinners, skeletons |
| `Notifications/` | toasts, alerts, notifications |
| `Patterns/` | layout patterns, navbars, hero sections |
| `Radio-buttons/` | radio styles |
| `Toggle-switches/` | toggle / switch styles |
| `Tooltips/` | tooltip styles |

## How to use (workflow)

1. **Search the library first** — before writing a button/card/form by hand, list the category folder and pick a component:
   ```
   ls .rides/galaxy/Buttons
   ```
   Components are named `creator_name-component.html`. Pick by visual description in the filename.
2. **Read the chosen file** — it is self-contained HTML + CSS (some use Tailwind classes).
3. **Adapt to the project** — convert the snippet into the project's framework:
   - React/Next: turn the markup into JSX (className), inline styles or `<style>` into CSS module / global CSS.
   - Tailwind projects: if the snippet uses Tailwind classes, verify class names against the tailwind-4-docs skill; if it uses raw CSS, keep the CSS as-is.
4. **Restyle to the project's design system** — always remap colors, radii, fonts, spacing to the active design tokens (see `DESIGN.md` at workspace root). Never paste a component with its raw colors into a page — recolor it.
5. **Accessibility pass** — these are community snippets; add `aria-*`, labels, focus-visible states, and semantic elements as needed (web-design-guidelines skill).

## Rules

1. Galaxy components are a starting point, not a final answer — they must be adapted, recolored, and accessibility-checked.
2. Attribution (optional but encouraged): credit the creator and uiverse.io in a comment.
3. MIT license — free to use, modify, and distribute; do not redistribute the raw library into user projects — copy only the component(s) needed.
4. Do NOT dump the whole library into a user project; install only the components a task needs.
5. Prefer Galaxy for single-purpose UI elements (buttons, inputs, loaders, toggles); prefer the site-type skills (`sites/*`) for whole-page layouts.

## Verification

- Component renders correctly in the project's framework after adaptation.
- Colors/radii/fonts match the active DESIGN.md tokens.
- Passes a11y basics: label, focus, contrast.