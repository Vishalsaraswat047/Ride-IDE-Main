---
name: asset-selection
description: Asset selection skill — how to pick and use images, SVG, illustrations, 3D models, video, backgrounds, patterns, gradients, fonts. Never random placeholders; search the registry; check dimensions, quality, license, relevance.
---

# Asset Selection

Every visual asset must be chosen — never random placeholder images.

## The Decision Order

1. **Needs a visual?** (icon / photo / illustration / 3D / video / pattern / gradient / font)
2. **Function over decoration**: does it communicate, demonstrate, or support hierarchy?
3. **Search RIDE asset registry / project assets FIRST** — reuse before creating.
4. **Validate**: dimensions, aspect ratio, quality, license, relevance.
5. Only then: create asset (SVG/code) or select placeholder clearly marked.

## Asset Type Rules

### Images (stock/unsplash)
- [ ] ≥ 1600px wide for heroes/backgrounds; `srcset` to 480/768/1280
- [ ] Aspect ratio chosen for layout (16:9 hero, 1:1 cards) — never random crops
- [ ] Optimized: WebP/AVIF, lazy-loaded below fold, `fetchpriority=high` for LCP
- [ ] License recorded (Unsplash license, attribution where required)
- [ ] Relevance: subject matches copy; alt text written for the ACTUAL content

### SVG / Illustrations
- Prefer inline SVG (stylable, tree-shakeable) over <img> for icons/logos
- Illustrations: one coherent style family (line | flat | 3D blob | isometric) — never 3 styles mixed
- Color via `currentColor`/tokens; stroke consistency

### 3D Models
- GLB/GLTF compressed (draco/ktx2); ≤ 20MB total per scene
- License (CC0/CC-BY — record attribution)
- Fallback poster/image for no-WebGL devices

### Video
- Muted + poster + lazy (`preload="none"` until visible)
- ≤ 12MB hero loops; WebM + MP4 fallbacks
- No autoplay with sound; reduced-motion → static poster

### Backgrounds / Patterns / Gradients
- Generated tastefully: mesh gradients, grids (SVG data-uri), noise texture (svg feTurbulence) — build, don't download
- One decorative style per page
- Backgrounds NEVER compete with content contrast (adjust opacity/overlay)

### Fonts
- Max 2 variable families, self-hosted woff2 (next/font or @font-face)
- License (OFL/Google preferred); weights subset to used

## The "Don't Use Placeholders" Protocol

If you must stub:
1. Use `<Image placeholder>`/styled skeleton — NOT random photo URLs
2. If external placeholder needed: picsum.photos/unsplash source WITH explicit `?w=800&h=600&fit=crop`
3. Mark in code: `{/* TODO: real asset */}` + add to a RIDE asset-manifest file for later replacement

## Verify (before ship)

- [ ] Every asset has license record (in manifest)
- [ ] Alt text everywhere (`alt=""` only for decorative)
- [ ] No oversized download (hero ≤ 250KB, card ≤ 60KB)
- [ ] Consistent visual language across all assets on page
- [ ] Dark mode: images have art direction or neutral compat