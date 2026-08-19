---
name: heroicons
description: Heroicons skill — Tailwind Labs' official icon set (24 outline, 20 solid, 16 solid). Clean minimal style; ideal for Tailwind projects.
---

# Heroicons

Tailwind Labs' official icons: `24/outline`, `20/solid`, `16/solid` variants. Minimal, clean, sharp — pairs naturally with Tailwind.

## Install

```bash
npm i @heroicons/react    # React
# or: @heroicons/vue
```

## Usage

```tsx
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { MagnifyingGlassIcon as Solid } from "@heroicons/react/20/solid";

<MagnifyingGlassIcon className="size-5" />
```

Import from the size variant that matches usage:
- `24/outline` — default UI icons (stroke 1.5).
- `20/solid` — compact/active states, nav, dense UIs.
- `16/solid` — tiny inline (badges, table cells).

## Rules

1. Choose ONE variant set per context — outline for idle, solid for active/selected; don't mix both for the same element type.
2. All rules from icon-registry apply: no emoji, consistent family, `aria-label` on icon-only buttons, `currentColor`.
3. Lucide vs Heroicons: pick Heroicons for Tailwind-vanilla projects with zero extra deps; Lucide for richer stroke-weight control and larger catalog.
4. Solid icons read better at 16px; outline at 20–24px.

## Do / Don't

| Do | Don't |
|---|---|
| `size-4/5/6` Tailwind sizing | Raw default SVG sizes |
| `currentColor` | `fill` overrides |
| Outline + solid pairing for state | 3 size variants mixed in one row |