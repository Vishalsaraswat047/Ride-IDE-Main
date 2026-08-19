---
name: motion
description: Motion (framer-motion successor) skill — React animation library: variants, transitions, layout animations, scroll/gesture, useReducedMotion, spring physics. Rules for tasteful animation.
---

# Motion (motion.dev / `motion` package)

The successor to framer-motion (`import { motion } from "motion/react"`). Adds CSS-first `@keyframes`-style classes AND React API.

## Install

```bash
npm i motion
```

## Core API

1. `motion.div` — animatable component; props: `initial`, `animate`, `exit`, `whileHover`, `whileTap`, `whileInView`, `transition`.
2. **Variants** (preferred for orchestration):
   ```tsx
   const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
   const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
   <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }}>
     {items.map(i => <motion.div variants={item} />)}
   </motion.div>
   ```
3. **Layout animations**: `layout` prop + `<AnimatePresence>` for shared-element transitions (list reorder, expand/collapse, page transitions with `mode="wait"`).
4. **Scroll**: `useScroll()` + `useTransform()` for parallax/progress; `whileInView` for reveals.
5. **Gestures**: `drag`, `whileDrag`; springs: `transition={{ type: "spring", stiffness: 300, damping: 30 }}`.
6. **Reduced motion**: `useReducedMotion()` hook; wrap/motion overrides when true.

## Animation Rules (the important part)

1. Animation is supporting UX — not decoration everywhere.
2. Duration: reveals 0.3–0.6s; micro-interactions 0.15–0.3s; page transitions 0.3–0.5s.
3. One system: `ease: [0.22, 1, 0.36, 1]` (easeOutExpo) or springs — never random easings.
4. Distance: y-offsets ≤ 24px; scale ≤ 1.05. Subtle beats flashy.
5. `whileInView` with `viewport={{ once: true }}` — content reveals once, not on every scroll.
6. Stagger children 0.05–0.12s — never more than ~0.3s total stagger for a group.
7. Respect `prefers-reduced-motion` globally (Motion has a built-in reduced-motion provider; also set `initial`/`animate` to instant).
8. Don't animate layout-affecting properties (width/height) when `layout` exists — it's janky; prefer `layout` prop.
9. Performance: animate `opacity`/`transform` only; GPU-accelerate (never `top/left`).
10. Below-the-fold content: don't animate what you can't see.

## Do / Don't

| Do | Don't |
|---|---|
| `whileInView` reveals | Animation on every element |
| Variants + stagger | Nested random durations |
| Springs for UI | Linear easings (except progress) |
| Reduced-motion guard | 3D spins / big bounces in dashboards |

## Verification

- [ ] No animation when `prefers-reduced-motion: reduce`.
- [ ] All content visible without JS.
- [ ] No layout shift after animation completes (or intentional).