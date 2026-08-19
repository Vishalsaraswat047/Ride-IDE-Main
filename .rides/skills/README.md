# RIDE Skill Registry

Design Intelligence Stack — skills are loaded on demand by Quinn via the `skill` tool. Nothing here ships into user projects; only what a project needs gets installed.

## Design (rules)
- web-design-guidelines — Web Interface Guidelines compliance review
- ux-guidelines — flow, hierarchy, affordance, Gestalt, conversion
- accessibility — mandatory WCAG AA baseline
- responsive-design — breakpoints, fluid type, touch targets
- typography — pairing, scale, measure, variable fonts
- design-systems — component registry discipline, tokens

## UI (component libraries)
- galaxy — uiverse.io open-source UI library (3000+ CSS/Tailwind components, local copy in .rides/galaxy/)
- shadcn — Radix + Tailwind components, tokens, dark mode
- radix — accessible primitives
- mui — Material design, ThemeProvider, sx, Grid
- chakra — style props, theme scales, ColorMode
- headless-ui — unstyled Tailwind-friendly components

## CSS
- tailwind-4-docs — Tailwind v4 syntax/config snapshot
- modern-css — container queries, :has(), layers, scroll-driven animation

## Motion
- motion — React animation (variants, layout, scroll)
- gsap — timelines, ScrollTrigger, cinematic sequences
- lottie — vector animation playback

## 3D
- three-js — WebGL scene rules, performance, mobile fallback
- react-three-fiber — declarative 3D in React
- drei — R3F helpers (Float, Environment, Controls, Text)

## Icons
- icon-registry — family selection laws, no emoji, one family per project
- lucide / heroicons / phosphor / tabler — usage rules per family

## Web
- react — hooks, data fetching, forms, performance
- next-js — App Router, server components, metadata, images
- vite — SPA scaffolding, aliases, chunks, env
- astro — content collections, islands, assets

## Design Systems (brand)
- vercel-design — full Vercel DESIGN.md (tokens + recipes in ./DESIGN.md)

## Site-Type Packs
- landing-page-design, saas-design, startup-design, ai-product-design, dashboard-design, portfolio-design, agency-design, ecommerce-design, marketplace-design, documentation-design, developer-tool-design, blog-design, edtech-design, fintech-design, healthtech-design, travel-design, restaurant-design, real-estate-design, gaming-design, media-design

## Quality
- ui-evaluation — generate → review → fix → re-review loop (10 checks)
- asset-selection — image/SVG/3D/video/font/font placement + licensing

## Usage Model
Skill Registry → Capability Selection → Project Install. Quinn loads only the skills a task needs; nothing preinstalls into user projects.