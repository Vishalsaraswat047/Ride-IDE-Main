---
name: astro
description: Astro skill — content-first static sites, islands architecture, MDX/Markdown content, View Transitions, Tailwind, dynamic routes, Image optimization. Use for blogs, docs, marketing, portfolio sites.
---

# Astro (5.x)

Content-first meta-framework: zero-JS by default + "islands" for interactivity. Ideal for: blogs, docs, marketing sites, portfolios, landing pages. Choose Astro over Next.js for content sites; Next for apps.

## Structure

- `src/pages/*.astro` — file-based routing (`[slug].astro` for dynamic).
- `src/layouts/`, `src/components/`, `src/content/` (content collections: `config.ts` + markdown/mdx).
- `astro.config.mjs` — integrations, output mode.

## Islands (the core concept)

- `` `---` frontmatter (server) + `<Component client:load /> `` — only the island ships JS.
- Directive choice: `client:load` (eager), `client:visible` (lazy — default for below-fold), `client:only="react"` (framework-only components).
- Rule: ZERO JavaScript unless needed. Static everything; islands only for interactivity (nav menus, 3D hero canvas, charts).

## Content Collections (MDX/Markdown)

```astro
// src/content/config.ts
import { defineCollection, z } from 'astro:content';
export const collections = { posts: defineCollection({ schema: z.object({ title: z.string(), date: z.date() }) }) };
// [...slug].astro
const { slug } = Astro.params;
const entry = await getEntry('posts', slug);
```

- `getCollection()`, `getEntry()`, `getEntries()` — typed via Zod schema. Frontmatter = schema-validated.
- MDX: import `@astrojs/mdx`; use `<MDXLayout>` or default layout frontmatter.

## Integrations (RIDE favorite set)

- `@astrojs/tailwind` (v5: use official `tailwindcss` PostCSS/Vite plugin instead).
- `@astrojs/react` (islands with React), `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/rss`.
- `@astrojs/image` (or Astro `<Image>` built-in `astro:assets`).

## SEO & Assets

- `astro:assets` `<Image src import widths quality />` + `import.meta.env` — always optimize images.
- `Astro.glob` for collections; `<Head>` via `@astrojs/sitemap` for sitemap.
- View Transitions: `<ViewTransitions />` in layout for SPA-like page transitions (respect reduced-motion).

## Rules

1. JSX/TSX components only when islands required — prefer Astro components + CSS.
2. Never ship the framework runtime to content pages.
3. Use `astro:env` for env vars (`client`/`server` secrets properly separated).
4. `output: 'static'` default (fastest); `'server'` only for dynamic SSR + `'hybrid'` for opt-in.
5. Deploy: Cloudflare Pages / Netlify / Vercel zero-config; or `dist/` to any static host.

## Quality Gates

- [ ] Page renders with zero client JS (DevTools network check).
- [ ] Images optimized; LCP flagged priority.
- [ ] `astro build` passes; sitemap generated.