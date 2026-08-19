---
name: gsap
description: GSAP skill — timeline-based animation for complex sequences, scrollTrigger, scrub, drawSVG, text reveal. Use for advanced/cinematic animation beyond Motion's scope; not for every site.
---

# GSAP (GreenSock)

Industry-standard timeline animation. Best for: cinematic hero sequences, scroll-scrubbed effects, SVG drawing, complex choreography, text reveals, path morphing. Choose GSAP ONLY when Motion/Framer can't express the sequence cleanly.

## Install

```bash
npm i gsap
```

## Core API

1. **Tween**: `gsap.to(el, { x: 100, opacity: 1, duration: 1, ease: "power2.out" })` — also `from`, `fromTo`, `set`.
2. **Timeline** (choreography):
   ```js
   const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
   tl.from(".hero-title", { y: 60, opacity: 0, duration: 0.8 })
     .from(".hero-sub", { y: 30, opacity: 0, duration: 0.6 }, "-=0.4")
     .from(".cta", { scale: 0.9, opacity: 0, duration: 0.4 }, "-=0.2");
   ```
3. **ScrollTrigger**:
   ```js
   gsap.registerPlugin(ScrollTrigger);
   gsap.from(".section", { scrollTrigger: { trigger: ".section", start: "top 80%", scrub: 1 }, y: 80, opacity: 0 });
   ```
   `scrub` links animation progress to scroll (parallax, progress bars, horizontal scroll sections).
4. **Text**: SplitText plugin (SplitText is a GSAP paid/Core+ plugin in v3.13+; free alternatives: split-type, gsap's `TextPlugin` for typewriter).
5. **SVG**: `drawSVG` plugin, `morphSVG`; or use CSS stroke-dashoffset for simple line draws.

## Rules

1. GSAP is heavy (≈50KB gz) — lazy-load it (`dynamic import`) and gate by `prefers-reduced-motion`.
2. Register plugins once; never CDN-load in production without integrity hashes.
3. `gsap.context()` / `gsap.matchMedia()` for React cleanup (`gsap.context(() => {...}, ref)` + `ctx.revert()`).
4. Kill on unmount: `ctx.revert()` or `tl.kill()` — GSAP leaks otherwise in React StrictMode.
5. Respect reduced motion: `gsap.matchMedia()` + `"(prefers-reduced-motion: reduce)"` to zero out animations.
6. Use `x/y` transforms, not `top/left`; use `will-change` sparingly.
7. ScrollTrigger + `once: true` or `scrub` responsibly — endless parallax = motion sickness.

## Do / Don't

| Do | Don't |
|---|---|
| Timelines for sequences | GSAP for simple hovers (use CSS/Motion) |
| `gsap.context` in React | Animations running after unmount |
| ScrollTrigger scrub for hero | Scrubbed animations on body text |
| Reduced-motion gating | Autoplay loops on every page |

## When to use GSAP vs Motion

- Motion: component states, layout animations, page transitions, in-view reveals.
- GSAP: scrubbed scroll scenes, cinematic hero, complex multi-element timelines, SVG animation.