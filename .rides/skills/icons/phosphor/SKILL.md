---
name: phosphor
description: Phosphor icon skill — flexible weight system (thin→bold), 6 variants, ~1,500 icons. Best when you need weight variety and duotone for branded UIs.
---

# Phosphor Icons

Family with weight control: `thin`, `light`, `regular`, `bold`, `fill`, `duotone` — ~1,500 icons, coherent geometry. Great for branded/expressive UIs that still need consistency.

## Install

```bash
npm i @phosphor-icons/react   # React
```

## Usage

```tsx
import { Star, StarHalf, StarFill } from "@phosphor-icons/react";
<Star size={20} weight="regular" />
<Star weight="duotone" color="#f59e0b" />
```

Props: `size`, `weight`, `color`, `mirrored`, `fill`.

## Rules

1. Choose ONE weight for the app (regular or bold — pick bold for small sizes).
2. Duotone = brand accent; use for hero/illustrative, not dense dashboards (legibility drops).
3. `weight="fill"` for active/selected states.
4. All icon-registry rules: no emoji, consistent family, `aria-label`, `currentColor` default.
5. Phosphor > Lucide when: you need weight variety, duotone branding, or a friendlier organic style.

## Do / Don't

| Do | Don't |
|---|---|
| One weight system-wide | Mixed thin+bold siblings |
| Duotone accents in hero | Duotone in tables |
| `fill` for active state | Colors on every icon |