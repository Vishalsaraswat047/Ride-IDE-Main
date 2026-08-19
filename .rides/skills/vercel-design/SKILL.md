---
name: vercel-design
description: Vercel design language — black-and-ink typographic minimalism, mesh gradient hero accents, Geist-style sans, token color system. Load before implementing any UI for a developer-platform / startup / landing page aesthetic.
---

This skill is the Vercel DESIGN.md design system installed into RIDE. It is a full design spec: tokens, colors, typography, layout rules, components, and motion.

# Source

The authoritative, full file is `DESIGN.md` in this workspace root (41 KB). When a task needs exact tokens, gradients, spacing, or component recipes, READ that file directly:

```
read C:\Users\Visha\ride\DESIGN.md
```

# System summary (use before reading the full file)

## Identity
An inspired interpretation of Vercel's design language — a developer-platform brand whose surface is a stark black-and-ink duet on near-white canvas, broken at hero scale by a multi-color mesh gradient (cyan / blue / magenta / amber) that acts as the entire decorative system, paired with a custom geometric sans for headlines and a monospaced caption face for technical labels.

## Core tokens
- colors.primary: #171717, on-primary: #ffffff
- canvas: #ffffff, canvas-soft: #fafafa, canvas-soft-2: #f5f5f5
- ink: #171717, body: #4d4d4d, mute: #888888
- hairline: #ebebeb, hairline-strong: #a1a1a1
- link: #0070f3, success: #0070f3, error: #ee0000, warning: #f5a623
- violet: #7928ca, cyan: #50e3c2, highlight-pink: #ff0080
- gradients:
  - develop: #007cf0 → #00dfd8
  - preview: #7928ca → #ff0080
  - ship: #ff4d4d → #f9cb28

## Design rules (from the file)
- Typography is the hero: display-scale geometric sans headlines, monospace for technical labels/code.
- Hairlines (#ebebeb) for borders and section dividers — no heavy shadows or cards-with-borders everywhere.
- The multi-color mesh gradient is the ONLY decorative system — use it at hero scale and on key CTAs, never everywhere.
- Black-and-white duet: ink on near-white canvas; restraint is the brand.
- Use the `--out`-style structure from DESIGN.md for exact spacing, type scale, and component patterns.
