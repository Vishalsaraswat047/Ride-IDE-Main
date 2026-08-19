---
name: developer-tool-design
description: Developer-tool/product design — terminal-first aesthetics, code-centric heroes, CLI install snippet, API playground, technical credibility, dark-first, docs-first onboarding.
---

# Developer Tool Design System

Dev tools = earned trust. Show the workflow in code; polish is credibility.

## Visual Direction
- **Dark-first** aesthetic (developers live dark): near-black surfaces, mono accents, ONE accent color (green/purple/blue per brand), hairline borders.
- "Terminal truth" energy: code, prompts, logs are the decoration. Fits: Vercel/Linode/Railway vibes — minimal chrome.

## Structure
1. Nav: product, docs, pricing, changelog, GitHub star count, login.
2. **Hero with CLI install** (canonical dev-tool hero):
   ```
   $ npm i @your/pkg
   $ npx your-cli init
   ```
   + typed terminal animation or code window; headline states the UNIQUE workflow ("Ship previews in 3 commands").
3. Code-driven feature sections: each feature shows real terminal/code/UI snippet with caption — no abstract icons.
4. **Interactive playground**: REPL/try-it box (editable input → output with fake latency), or embedded StackBlitz-ish preview.
5. API reference teaser + docs CTA at 80% scroll.
6. Trust: GitHub stars, downloads count, benchmark/CI badges, "used by" logos, security page link.
7. Pricing: open-source friendly (free tier real), per-seat table, compare table honest.

## Rules
1. **Every claim is verifiable**: docs exist, CLI works, error messages show real behavior.
2. Copy: command-first tone, no fluff ("Run `npx foo`" > "Get started today").
3. Integrations grid: realistic (React, Next, TS, Redis, Docker…) with correct icons from ONE icon set.
4. Changelog visible (semver), status page link, open-source license clear.
5. Docs deep-link right under hero ("Quickstart →"), not buried.
6. Dark mode: default dark with `system` — design both; code blocks themed.
7. Terminal animations: respect reduced motion; type effect ≤ 2s loop or once.

## Technical Standards
- Syntax highlighting accurate (not fake colors); monospace `tabular-nums`; code text ≥ 13px.
- Copy buttons on every snippet; multi-tab code windows (npm/yarn/pnpm/bun) — default to the package manager detected.
- Playground output must appear ≤ 300ms (mock with skeleton).
- Documentation + changelog + status footer links all reachable in 2 clicks.

## Anti-Patterns
- ✗ Stock "robot hand" hero
- ✗ Fake terminal visuals on a product that has no CLI
- ✗ Marketing-speak ("revolutionary DX")
- ✗ Arch without actual refresh icons — listeners of the workflow
- ✗ Shrinking mono type under 12px