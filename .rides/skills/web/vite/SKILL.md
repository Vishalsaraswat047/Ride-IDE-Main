---
name: vite
description: Vite skill — SPA/3D/component-library scaffolding, dev server, env vars, alias config, build optimization, lazy loading, preview. Use for React/Vue SPA projects (non-Next).
---

# Vite

Dev server + bundler (Rollup) for SPAs, libraries, 3D (Three.js scenes). Use for React/Vue/Svelte SPAs when server-rendering isn't needed (dashboards, tools, 3D sites).

## Setup (React + TS + Tailwind)

```bash
pnpm create vite@latest app --template react-ts
pnpm i tailwindcss @tailwindcss/vite
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": "/src" } },
  server: { port: 5173 },
  build: { target: "es2022", sourcemap: true },
});
```

## Rules

1. **Aliases**: `"@": "/src"` in config + `paths` in tsconfig — never relative-import soup.
2. **Absolute imports** throughout; import extensions for TS: omit `.ts/.tsx`, keep `.css`.
3. **Env vars**: `import.meta.env.VITE_*` only (exposed); put secrets server-side/backend.
4. **Lazy loading**: `const Chart = lazy(() => import("./Chart"))` + `<Suspense>`; big 3D/motion deps get their own chunk with `manualChunks`.
5. `build.rollupOptions.output.manualChunks`: separate `three`, `motion`, `react` vendor chunks.
6. `vite preview` to verify production build locally before deploy.
7. Base path: `base: "./"` when hosting in subfolder (GitHub Pages).
8. Dev proxy for API: `server.proxy = { "/api": "http://localhost:8787" }`.
9. PWA (optional): `vite-plugin-pwa` + workbox.
10. If the project needs SSR/SEO: consider Next.js instead — Vite SPA is a tradeoff.
11. StrictMode + React 19: keep `<React.StrictMode>`; effects run twice in dev.

## Quality Gates

- `pnpm build` passes + `vite preview` renders.
- Bundle report: `pnpm build` → check chunk sizes; main chunk < ~250KB gzipped.
- Typecheck passes (`tsc --noEmit` — not just vite dev).