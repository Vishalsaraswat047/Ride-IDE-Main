---
name: tabler
description: Tabler icon skill — MIT, ~5,000 icons, stroke-based, filled and outline variants. Largest modern open-source set; good for data-dense apps needing many specialized icons.
---

# Tabler Icons

~5,000 stroke-based icons (MIT). Massive catalog = specialized icons for dashboards, admin, and niche domains without hand-drawing.

## Install

```bash
npm i @tabler/icons-react    # React
# or: @tabler/icons / @tabler/icons-webfont
```

## Usage

```tsx
import { IconBrandReact, IconBus, IconRoute, IconTicket } from "@tabler/icons-react";
<IconBus className="size-5" />
```

Naming: `Icon` + PascalCase (`IconUserCircle`, `IconChartLine`). Props mirror lucide (`size`, `stroke`).

## Rules

1. Stroke default 2; `stroke={1.5}` for display sizes.
2. The `filled` variants (e.g. `IconStarFilled`) exist — use for active states.
3. All icon-registry rules apply: no emoji, single family, `aria-label`, `currentColor`.
4. Choose Tabler when: huge specialized catalog matters (bus/train/medical/finance icons), or existing project uses it.
5. Bundle size: import named icons only; tree-shaking is automatic with `@tabler/icons-react`.

## Do / Don't

| Do | Don't |
|---|---|
| Named imports only | Whole-set import (`import * as Icons`) |
| One stroke weight | Custom strokes per icon |
| Filled variants for state | Both outline + filled mixed casually |