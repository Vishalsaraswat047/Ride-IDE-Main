---
name: shadcn
description: shadcn/ui skill — copy-paste Radix + Tailwind components, CLI install, registry, theming with CSS variables, dark mode. Use when a project uses shadcn/ui or needs high-quality accessible React components.
---

# shadcn/ui (v2+ / latest)

shadcn/ui ships source into YOUR project (`components/ui/*`). No runtime dependency — you own and modify the code. Works with Tailwind CSS v4 (current default), React, Vite/Next/Remix/Astro.

## Install

```bash
npx shadcn@latest init            # sets up components.json, CSS variables, utils
npx shadcn@latest add button card dialog dropdown-menu sheet tabs tooltip ... # add components
npx shadcn@latest add --all       # everything
```

Component names (v2): `button card input label select textarea checkbox switch radio-group slider dialog alert-dialog dropdown-menu sheet popover tooltip tabs accordion badge avatar breadcrumb calendar carousel chart command context-menu data-table form hover-card input-otp menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner switch table tabs textarea toast toggle tooltip`

Note: `sonner` for toasts; `sidebar` for app layouts; `chart` (Recharts wrapper) for charts; `form` (react-hook-form + zod).

## Theming

1. Colors are CSS variables in `globals.css` under `:root` and `.dark`:
   `--background --foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring`
2. Set `darkMode: "class"` in Tailwind config (v4: `@custom-variant dark (&:is(.dark *));` in CSS).
3. Change a theme by editing ONLY the variable values — never component styles.
4. Radius: `--radius: 0.625rem` → all radii derive from it (sm/md/lg/xl from base).
5. `npx shadcn@latest add --yes` inside component dir to overwrite modified components when upgrading.

## Component Patterns

- `<Dialog>` (Radix) for modals — controlled `open`, `onOpenChange`; `<DialogTitle>` REQUIRED for a11y.
- `<Sheet>` for side panels/drawers; `<DropdownMenu>` for menus; `<Popover>` for floating panels.
- `<Table>` plain, or `<DataTable>` with TanStack Table + column defs + faceted filters.
- `<Command>` for command palette; `<Form>` = react-hook-form + zod resolver (`zodResolver(schema)`).

## Rules

1. Do NOT hand-write a Dialog/Tabs/Tooltip when shadcn exists — `add` it.
2. Modify components under `components/ui/*` freely — they're yours.
3. Use Tailwind utilities for layout; components carry only their own styling.
4. Prefer `cn()` for conditional classes.
5. shadcn = Radix primitives + Tailwind styling. Don't mix in MUI/Chakra on the same page.
6. Keep `components.json` in sync when adding to workspaces (`aliases`).

## Verification

- Every Dialog has a Title; sheets have `aria-label`.
- Dark mode toggle flips via `.dark` class on `<html>`.
- New components must appear in the components directory and pass typecheck.