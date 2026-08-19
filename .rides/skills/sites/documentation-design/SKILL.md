---
name: documentation-design
description: Documentation site design — sidebar nav architecture, content typography, code blocks, search (Cmd+K), API reference layout, versioning, dark mode. For docs/developer portals/wiki sites.
---

# Documentation Design System

Docs convert readers into users. Structure + readability + search beat decoration.

## Layout Foundation
1. **3-pane**: left sidebar (nav tree) | content (max-w-prose ~72ch) | right "On this page" TOC (desktop ≥1280px). Breadcrumbs above content.
2. Sidebar: grouped accordions, active-state highlighting, sticky; mobile → drawer with same tree. Freeze scroll during navigation.
3. Topbar: logo, search (Cmd+K), version selector, dark-mode toggle, GitHub/edit link, status badge.

## Content Typography (docs-grade)
1. Body: 16px/1.7, `text-pretty`; headings clear hierarchy (h1 page title, h2 sections, h3 subsections — one h1 total).
2. **Code blocks**: mono font, syntax highlighting, copy button, language label, optional filename header. Long lines wrap or scroll with horizontal overflow.
3. Inline code, notes/warnings/callouts (info/warning/danger/example) semantically distinct.
4. Tables: sticky header, readable at all widths; avoid wide unformatatted tables → convert to definition lists.

## Navigation Rules
1. IA: learn (concepts/tutorials) → reference (API) → resources (changelog/FAQ). New = green badges.
2. Every page has: "previous/next" or parent-child links at bottom.
3. Cmd+K **command palette**: fuzzy search over everything (Titles, API symbols, code snippets, concepts) with keyboard-first results.
4. Make every code sample copy-testable: adjacent "run" (StackBlitz/CodePen) for framework docs.

## API Reference Layout
- Endpoint cards: `METHOD /path` (color-coded), auth requirement, request params table (name, type, required, description), request/response JSON samples (collapsible), error codes table.
- Sidebar lists endpoints grouped by resource; pagination links for long endpoints.
- Version selector + deprecation badges in refs.

## Standards
1. **Dark mode first-class** (developers live dark): token-based both themes, code blocks themed in both.
2. Search index: titles + headings + code language + first paragraph — client-side MiniSearch/Fuse or Algolia for big docs.
3. Content: TOC, "Edit this page" (GitHub), last-updated stamp, proper `lang` + SEO metadata per page.
4. Interactive examples: editable playground sections beside docs.
5. Performance: static pre-render (MDX/Markdown), zero JS for content pages except drawer/search/dark toggle islands.

## Checklist
- [ ] Content readable at 375px and 1440px
- [ ] Deep links (#anchors) on all headings
- [ ] Search finds a page in ≤ 2 keystrokes
- [ ] Code samples complete (no "…") and copyable
- [ ] Contrast ≥ 4.5:1 incl. code blocks