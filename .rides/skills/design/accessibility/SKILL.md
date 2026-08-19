---
name: accessibility
description: Mandatory accessibility skill — semantic HTML, keyboard nav, focus states, ARIA, contrast, alt text, screen-reader support, reduced motion. Every generated page must pass these checks.
---

# Accessibility (WCAG 2.2 / Level AA Baseline)

This is mandatory for every generated website, not optional polish.

## Semantic Structure

1. One `<h1>` per page; headings nest without skipping levels.
2. Use real elements: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<aside>`, `<button>`, `<a>`.
3. Only use `<div>`/`<span>` for non-semantic wrappers.
4. Landmarks: every page has `main`; repeated blocks (nav, footer) are `<nav>`/`<footer>`.
5. Tables for data with `<th scope>`; never use tables for layout.

## Keyboard

1. All interactive elements reachable via Tab (no `tabindex` > 0).
2. Visible focus indicator on every focusable element (≥ 2px contrast ring; never `outline: none` unless an alternative is visible).
3. Focus order matches visual order.
4. No keyboard traps; Esc closes dialogs/menus; arrow keys navigate menus, tabs, lists.
5. Custom widgets (dialog, combobox, tabs, switch) follow WAI-ARIA patterns with `role`, `aria-*`, keyboard handling.

## ARIA (use sparingly)

- ARIA only when native semantics are wrong. Prefer native elements.
- `aria-label` on icon-only buttons; `aria-labelledby` for groups/regions.
- `role="dialog"` + `aria-modal="true"` for dialogs; focus management on open/close.
- `aria-live="polite"` for dynamic updates; `assertive` only for critical alerts.
- Form errors: `aria-describedby` pointing to error text; `aria-invalid="true"`.

## Color & Contrast

1. Text contrast ≥ 4.5:1 (large text ≥ 3:1).
2. UI components + icons ≥ 3:1 against adjacent colors.
3. Never communicate via color alone — pair with icon/text/pattern.
4. Contrast under 3:1 is only acceptable for decorative elements.

## Images & Media

- Every `<img>` has meaningful `alt` (decorative → `alt=""`).
- Captions/transcripts for video and audio.
- Buttons with long text are fine; icon buttons always labelled.

## Forms

- Every input has a visible, programmatically-linked `<label>`.
- Required fields marked (`required` + explicit note).
- Errors link to fields, list in order, and survive page refresh.
- Placeholder is never the only label.

## Motion & Timing

- Respect `prefers-reduced-motion: reduce` — disable/scale animations (Motion: `useReducedMotion`, CSS: media query).
- No content flashes more than 3× per second (photosensitivity).
- Auto-advancing carousels pause on hover/focus; provide controls.

## Verification (must run for every generated UI)

1. Lighthouse accessibility audit (target ≥ 90 / 100).
2. Tab through the whole page manually.
3. Check with a screen reader (NVDA/VoiceOver) on key flows.
4. `axe-core` scan in CI/preview.