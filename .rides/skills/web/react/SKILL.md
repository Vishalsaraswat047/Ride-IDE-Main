---
name: react
description: React skill — component model, hooks, data fetching, forms, state, error boundaries, performance. Reference before writing any React code.
---

# React (19+)

## Component Rules

1. Components = functions; props typed (`interface Props`); name components `PascalCase`.
2. Keep components ≤ ~200 lines; split presentational vs logic (hooks or container components).
3. Derive state, don't duplicate: compute values in render/useMemo — no sync-state mirrors.
4. No prop drilling beyond 2 levels → context or state library (zustand preferred for RIDE projects; redux only when ecosystem demands).

## Hooks Usage

- `useState` — local UI state only.
- `useEffect` — sync with outside systems (events, subscriptions, timers); return cleanup; never fetch with raw useEffect for loading UI — use a data library (TanStack Query) or loader.
- `useMemo`/`useCallback` — only for expensive work / stable refs (avoid over-memoizing).
- `useRef` — DOM refs, imperative handles, latest-value mirrors.
- Custom hooks: `useXxx` (e.g. `useDebounce`, `useLocalStorage`).
- StrictMode: effects run twice in dev — write idempotent effects.

## Data Fetching

1. Prefer server-side loaders / TanStack Query (cache, retry, refetch, pagination) over raw `useEffect`+`fetch`.
2. All fetches have loading, error, empty, success states.
3. `fetch` with `AbortController` when manual; never setState after unmount.
4. SSR/CSR: guard `window`/`document` access for client components.

## Forms

- react-hook-form + zod schema validation (shadcn default). `zodResolver`.
- Controlled vs uncontrolled: RHF uncontrolled with `register`; re-render minimization.

## Error Handling

- Error Boundaries for render errors (class component with `componentDidCatch`) — at least at root + route level.
- Async errors: try/catch + user-visible toast/snackbar; log via console/telemetry.
- Never throw during render for recoverable conditions.

## Performance

1. React.memo only where re-render cost is measurable.
2. `useDeferredValue`/`useTransition` for expensive filters/search.
3. Virtualize long lists (`@tanstack/react-virtual`).
4. Bundle: lazy routes/components (`React.lazy` + `Suspense`), avoid giant import-all libraries.
5. Keep context values stable (memo provider value) — context changes rerender consumers.

## Style of Code

- No default props on function components — use `??` in body.
- Keys: stable unique ids — never array index (except static lists).
- Events: `onClick={() => fn(id)}` is fine for simple cases.
- Type everything: no `any` leaks.