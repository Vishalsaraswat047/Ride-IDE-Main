---
name: ui-evaluation
description: UI/UX evaluation skill — run a design review of generated UI: hierarchy, spacing, alignment, typography, contrast, consistency, responsiveness, accessibility, density, interaction. Generate → Inspect → Fix → Inspect again.
---

# UI/UX Evaluation

The mandatory post-generation loop. NEVER ship generated UI without this review.

## The Loop

```
GENERATE UI
   ↓
SCREENSHOT / RUN
   ↓
DESIGN REVIEW (this skill)
   ↓
ISSUES FOUND?
   ├── NO → ship
   └── YES → fix → screenshot again → review
```

## Review Checklist (10 checks — score each PASS/FAIL)

### 1. Hierarchy
- [ ] ONE dominant element per viewport (hero headline, dashboard KPI)
- [ ] Type hierarchy clear by size/weight, not by color alone
- [ ] Primary CTA visually strongest action on screen
- [ ] No two elements compete for attention

### 2. Spacing
- [ ] 8pt system: all gaps/margins from {4,8,12,16,24,32,48,64}
- [ ] Consistent rhythm between sections (e.g. 96px desktop, 64px mobile)
- [ ] No spacing outliers (>2× neighbors) without intent
- [ ] Card padding ≥ 16px; touch targets ≥ 44px

### 3. Alignment
- [ ] Grid alignment: no 3px off-alignment of sibling elements
- [ ] Consistent text starts (left-aligned blocks, not mixed justified)
- [ ] Icons aligned to text baselines
- [ ] Vertical rhythm: related blocks share top edges

### 4. Typography
- [ ] Max 2 families + optional mono
- [ ] Scale consistent (no random sizes)
- [ ] Measure 45–75ch; line-height 1.5–1.7 body
- [ ] No ALL-CAPS long text; letter-spacing sensible

### 5. Contrast
- [ ] Body text ≥ 4.5:1 against background
- [ ] UI elements/charts ≥ 3:1
- [ ] No gray-on-gray text (#888 on #fafafa fails)
- [ ] Focus states visible (≥ 2px ring)

### 6. Consistency
- [ ] Same component, same look site-wide (buttons/inputs/badges)
- [ ] Same icon for same action; one icon family
- [ ] Colors from tokens — no stray hexes
- [ ] Border radius/shadow scale consistent

### 7. Responsiveness
- [ ] 360 / 768 / 1440 tested; no horizontal scroll
- [ ] Grid collapses logically; nav becomes drawer/tab ✓
- [ ] Type scales down (clamp), not clipped
- [ ] Images fluid; tables reflow or scroll w/ pin

### 8. Accessibility
- [ ] Landmarks + one h1; heading order sane
- [ ] Keyboard-complete; focus visible; no traps
- [ ] Forms labeled; errors described
- [ ] prefers-reduced-motion honored

### 9. Visual Density
- [ ] Density matches context (dashboard dense, marketing airy)
- [ ] No card-soup pages (5+ identical cards without reason)
- [ ] Whitespace guides flow; nothing feels abandoned or cramped

### 10. Interaction
- [ ] All interactive elements respond: hover, active, disabled, loading
- [ ] Primary flows < 3 clicks
- [ ] Empty/loading/error states exist for dynamic areas
- [ ] Motion: subtle, purposeful, ≤ 0.6s

## Judgment Rules

1. **Fail = fix now**: contrast, accessibility, alignment, hierarchy issues.
2. **Fail = redesign section**: card soup, random layout, off-brand color.
3. **Pass with note**: minor polish (shadow weight, spacing nudge) — batch fixes.

## Output Format (for the agent loop)

```
REVIEW: <page>
PASS: hierarchy, spacing, contrast, responsiveness
FAIL:
  - contrast: footer text #9ca3af on #f3f4f6 (2.8:1) → use #6b7280
  - consistency: two button styles → unify to Button variants
  - interaction: no hover feedback on table rows → add bg + cursor
FIX → RE-SCREENSHOT → VERIFY
```

## When to run
- After generating ANY UI (page, component set, dashboard)
- After every major refactor of a UI surface
- Before declaring a project "done"