---
name: next-js
description: Next.js skill (App Router) — pages/layouts, SSR/CSR/ISR, client vs server components, data fetching, metadata/SEO, image optimization, middleware, deployment. Use for all Next.js projects.
---

# Next.js (App Router, 15+)

## Structure

- `app/` routes: `app/page.tsx`, `app/layout.tsx` (root layout REQUIRED with `<html><body>`), routes as folders (`app/dashboard/page.tsx`).
- Dynamic segments: `[id]`, `[...slug]` catch-all; `generateStaticParams` for SSG.
- `loading.tsx` (Suspense boundary), `error.tsx` (Error Boundary, must rethrow or handle), `not-found.tsx`, `route.ts` (API), `middleware.ts` (edge).

## Server vs Client Components (the core decision)

- **Server components (default!)**: fetch data, read env, DB access, heavy deps — no hooks/event handlers/`useState`.
- **Client components** (`"use client"`): interactivity, hooks, event handlers, `useSearchParams` (needs Suspense).
- Rule: push interactivity to the leaf; keep parents server-rendered.
- Passing server data → client: props must be serializable (no functions/fetched Huge objects — pass ids).

## Data Fetching

- Server components: `async` fetch directly (automatic caching rules per v15: GET is uncached by default unless tagged; use `next: { revalidate }` for ISR, `unstable_cache`/React `cache()` for dedupe).
- Client: TanStack Query or server actions. Prefer server components + layouts for the skeleton; client fetch for live data.
- **Server Actions**: `"use server"` functions for mutations (form actions, `useActionState`). Never pass raw DB errors to client — map to messages.

## SEO & Metadata

- `export const metadata: Metadata = { title, description, openGraph }` (server only).
- `generateMetadata()` for dynamic pages; canonical, robots, sitemap (`app/sitemap.ts`), `app/robots.ts`, `app/manifest.ts`.
- `<Image>` from next/image: automatic optimization — ALWAYS set `width`/`height` (or `fill` + `sizes`), `priority` for LCP, `loading="lazy"` for rest. Never raw `<img>` for local/remote.

## Fonts & Styling

- `next/font/google` or local `next/font/local` — auto self-hosting, `font-display: swap`, `variable` for CSS var.
- Tailwind v4 recommended (via `@import "tailwindcss"` + `@theme`).

## Middleware & Auth

- `middleware.ts` for simple guards/redirects (edge). Heavy auth checks belong in server components / server actions.
- Base URL/login redirects from `auth.config`/`auth.ts` (NextAuth v5).

## Performance Checklist

- [ ] Route segments cached where possible; dynamic content pulled client-side after shell.
- [ ] `<Image>` with sizes, no unoptimized big images.
- [ ] Lazy client chunks ≤ 150KB.
- [ ] `<Link>` prefetch for above-fold routes only (default is fine).
- [ ] Streaming: `loading.tsx` + `Suspense` for slow data.
- [ ] No `"use client"` spread into libraries.
- [ ] Typecheck + `next build` must pass.

## Deployment

- Vercel: zero-config (`output: "standalone"` optional). Node runtime for DB; edge only for lightweight middleware.
- env vars via `.env.local` / platform config; `.env.example` committed.
- `NEXT_PUBLIC_*` for client-exposed vars only.