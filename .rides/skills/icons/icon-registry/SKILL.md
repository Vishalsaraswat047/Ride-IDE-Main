---
name: icon-registry
description: Unified icon rules — how RIDE picks and uses icon families (Lucide, Heroicons, Phosphor, Tabler, Remix, Material Symbols). Never emoji as UI icons; one family, consistent stroke, accessible labels.
---

# Icon Registry & Rules

RIDE supports: Lucide, Heroicons, Phosphor, Tabler, Remix Icon, Material Symbols. This skill governs ALL icon usage.

## Selection (pick per project, not per icon)

| Project type | Default family |
|---|---|
| Tailwind/shadcn/React (default) | **Lucide** |
| Tailwind-vanilla, minimal deps | **Heroicons** |
| Branded UI needing weights/duotone | **Phosphor** |
| Data-dense admin/dashboards, niche domains | **Tabler** |
| Material/MUI apps | **Material Symbols** (@mui/icons-material) |
| Vue/legacy, big generic set | **Remix Icon** |

## The Laws

1. **Never use emoji as UI icons** when a proper icon exists. Emoji only in content copy where intentional.
2. **One family per project.** Never mix 5 icon styles on one page.
3. **Consistent stroke weight** (Lucide/Tabler/Heroicons = 2 or 1.5; Phosphor = one chosen weight).
4. **Consistent size scale**: 16 / 20 / 24 / 32 / 48. Never random.
5. **`currentColor`** — tint via text color, not per-icon fills.
6. **Accessible labels**: icon-only buttons always get `aria-label` (or visible text).
7. Same action = same icon everywhere (search → magnifier, close → X, etc.).
8. Semantics: don't swap icon meaning between sections (⚠ for error AND warning).

## Verification

- [ ] No emoji in buttons/nav/icons.
- [ ] One family imported project-wide.
- [ ] `aria-label` on all icon-only controls.
- [ ] Sizes from the scale.
- [ ] Same icon reused for same concept.