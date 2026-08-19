---
name: lucide
description: Lucide icon skill — stroke-based icon library (successor of Feather). Default icon choice for modern React/Tailwind projects. Usage, sizing, stroke rules.
---

# Lucide Icons

Modern stroke-based icons — the default RIDE icon family for Tailwind/shadcn/React projects. ~1,500 icons, consistent 2px stroke, no fill.

## Install

```bash
npm i lucide-react          # React
# or: @lucide/web / lucide package for web components / css
```

## Usage

```tsx
import { Search, Menu, X, ArrowRight, Settings } from "lucide-react";
<Search className="size-4" />            // Tailwind: size-4 = 16px
<button aria-label="Search"><Search className="size-4" /></button>
```

```html
<i data-lucide="search" class="w-4 h-4"></i>  <!-- web component -->
```

## Rules

1. **Never use emoji as UI icons** when a proper icon exists — always prefer lucide/icon set.
2. Sizing: 16px (inline), 20–24px (buttons/toolbars), 32–48px (empty states/illustrative). Use `size` or `w/h` classes — never browser-default 24px everywhere.
3. Stroke width: default 2; use `strokeWidth={1.75}` for large display icons.
4. One family per project — do NOT mix lucide + heroicons + phosphor + tabler styles.
5. Icon-only buttons/links REQUIRE `aria-label` (accessible label).
6. Consistent color: `currentColor` (inherit text color) — tint via `text-*` classes.
7. Two icons for one concept site-wide; use the same icon for the same action everywhere.
8. Keep icons crisp: use `size-*` scale rather than arbitrary transforms.

## Common Icon Map (consistency)

- Search → `Search`; Menu → `Menu`; Close → `X`; Settings → `Settings`; Back → `ArrowLeft`; Next → `ArrowRight`; Add → `Plus`; Edit → `Pencil`; Delete → `Trash2`; Check → `Check`; Copy → `Copy`; External → `ExternalLink`; Star → `Star`; Heart → `Heart`; User → `User`; Users → `Users`; Bell → `Bell`; Help → `HelpCircle`/`CircleHelp`; Info → `Info`; Warning → `TriangleAlert`; Error → `CircleX`; Calendar → `CalendarDays`; Clock → `Clock`; Location → `MapPin`; Download → `Download`; Upload → `Upload`; Share → `Share2`; Logout → `LogOut`; Login → `LogIn`; Filter → `Filter`; Sort → `ArrowUpDown`.

## Do / Don't

| Do | Don't |
|---|---|
| `currentColor` + `text-*` | Hardcoded icon colors |
| `aria-label` on icon buttons | Title-attr-only labels |
| One family per app | Emoji as UI icons |
| Consistent 16/20/24 sizes | Mixed stroke weights |