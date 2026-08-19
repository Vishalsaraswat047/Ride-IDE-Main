---
name: ux-guidelines
description: Core UX rules — hierarchy, flow, affordance, feedback, cognitive load, Gestalt principles, conversion patterns. Consult before designing any page or screen flow.
---

# UX Guidelines

Apply these before writing UI. They govern how a flow behaves, not how it looks.

## Fundamental Rules

1. Every screen has ONE primary goal and ONE primary action. Everything else is secondary.
2. Users must never need instructions. Affordance and convention carry the interaction.
3. Every interaction gives feedback within 100ms (visual) — hover, press, loading, error, success.
4. Keep cognitive load low: visible options ≤ 5–9 per decision point; defer details.
5. Never hide critical actions behind hover-only affordances on touch devices.
6. Progressive disclosure: show what's needed now, reveal the rest on demand.
7. Reduce steps: every extra click/field loses users. Cut optional fields, merge screens.
8. Errors explain what happened, why, and how to fix — in the user's words, next to the field.
9. Empty states teach: explain what goes here and offer the primary action to fill it.
10. Loading > 300ms needs a skeleton or progress indicator; > 5s needs cancel/status options.

## Gestalt Principles (grouping that makes UIs feel designed)

- **Proximity** — related items closer together.
- **Similarity** — same function, same visual style.
- **Continuity** — align elements along lines/edges.
- **Closure** — users complete incomplete patterns (cards, icons).
- **Figure/ground** — clear foreground vs background separation.
- **Common region** — containers create groups.

## Flow Design

1. Write the user's journey as steps before building screens.
2. Design for the happy path first; edge cases after.
3. Every flow has an escape hatch (back, cancel, close).
4. Destructive actions need confirmation; recoverable actions don't.
5. Defaults win: preselect the most common option, safest state.

## Conversion Patterns

- Place CTA above the fold AND again after the value proposition.
- Reduce commitment incrementally (email → signup → paid).
- Remove friction in the middle: autofill, social login, saved preferences.
- Testimonials/proof adjacent to decisions, not scattered randomly.

## Micro-UX Checklist

- [ ] Tappable targets ≥ 40px (desktop) / ≥ 48px (mobile).
- [ ] Every icon has a label or tooltip.
- [ ] Links are visually distinguishable from plain text.
- [ ] Keyboard can reach everything; focus is visible.
- [ ] No surprise navigation: back button behavior preserved.
- [ ] Consistent terminology across the product.