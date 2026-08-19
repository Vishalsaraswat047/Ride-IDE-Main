---
name: mui
description: Material UI skill — component library for Material-based React apps. ThemeProvider, sx props, Grid, Typography, buttons, dark mode. Use only when project stack is MUI-based.
---

# Material UI (MUI)

Material Design component library for React (v6/v7 current). Full component set with built-in theming, state, and styles. Use ONLY in MUI-based projects — do not mix with Tailwind/shadcn in the same UI.

## Core Concepts

1. **ThemeProvider** wraps the app; theme = design tokens (palette, typography, spacing, shape, breakpoints).
2. Two styling APIs: `sx` prop (rapid inline system styles, recommended) and styled components via `styled()`.
3. Default grid: 12-column `Grid` (`Grid size={6}`, spacing via `spacing`).
4. Typography: `<Typography variant="h1|h2|body1|..." component="h1">` — variant for style, component for semantics.

## Setup

```bash
npm i @mui/material @emotion/react @emotion/styled @mui/icons-material
```

```tsx
<ThemeProvider theme={theme}><CssBaseline /></ThemeProvider>
```

## Dark Mode

- `createTheme({ palette: { mode: 'dark' } })` + `useColorScheme` (v6+). Toggle via context, not CSS files.

## Component Rules

1. Buttons: `<Button variant="contained|outlined|text" size="small|medium|large">`.
2. `TextField` (FormControl + InputLabel for selects) — `fullWidth` in forms; `error` + `helperText` for validation.
3. Dialogs: `<Dialog open onClose><DialogTitle>...` — never raw overlays.
4. Tables: `Table` + `TableHead`/`TableRow` + `<TableSortLabel>` for sorting; `TablePagination`.
5. Use MUI's `Box`, `Stack` (flexbox), `Grid` for layout — not raw divs with custom CSS.
6. Icons from `@mui/icons-material` (Material Symbols family) — consistent family.

## Do / Don't

| Do | Don't |
|---|---|
| Customize via `theme.components` (defaultProps, styleOverrides) | Override with inline `style` |
| Use `sx` for layout spacing (`p: 2`, `gap: 2`) | Ad-hoc hex colors |
| Keep `CssBaseline` | Mix with Tailwind utilities on the same tree |
| Use `useTheme()` / `useMediaQuery(theme.breakpoints.down('md'))` | Hardcode breakpoint numbers |

## Verification

- [ ] Theme tokens used everywhere (no stray colors).
- [ ] Dark mode toggles correctly.
- [ ] Keyboard: dialogs focus-trap, selects arrow-key nav.