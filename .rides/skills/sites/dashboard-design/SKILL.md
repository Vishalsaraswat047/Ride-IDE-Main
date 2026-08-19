---
name: dashboard-design
description: Dashboard/analytics design — KPI layout, chart selection, data density, tables with sort/filter, sidebar patterns, real-time updates, dark themes. For admin panels, analytics, monitoring apps.
---

# Dashboard Design System

Dashboards = decision surfaces. Goal: find the answer in < 5 seconds.

## Layout Foundation
1. **Sidebar** (collapsible) + topbar (search, filters, notifications, avatar). Content = responsive grid, max 4 columns.
2. **KPI row** (top): 3–6 cards — value, delta vs previous period, tiny sparkline. One number per card; unit + context label.
3. **Primary chart** takes 2/3 width; supporting list/table 1/3.
4. **Data table** full-width below: sortable headers, search, column filter, pagination or virtual scroll.

## Chart Selection (map data → chart)
- Trend over time → **line/area** (multi-series ≤ 5, legend).
- Comparison across categories → **bar** (vertical ≤ 8 bars, horizontal for long labels).
- Composition/share → **donut** (≤ 6 slices + "other").
- Distribution/outliers → **scatter/histogram**.
- Relationship → **scatter** with trend line.
- Single value → big number, not a chart.
- Map data → bounded choropleth.
- ✗ Pie charts for >6 slices; ✗ 3D charts; ✗ dual-axes without clear reason.

## Data-Viz Rules
1. Start axes at zero (bar/pie); line charts may crop with label.
2. Format numbers: `1.2M`, `$45.6K`, tabular-nums; consistent decimal places.
3. Color: 1 accent for primary series; gray for comparison; red/green ONLY for negative/positive deltas — never full rainbow.
4. Tooltips show exact values + date; hover states highlight series.
5. Loading: skeletons in chart slots (not spinners); empty: "No data for this period" + clear option.

## Interaction Patterns
- Global date-range filter (last 7/30/90d, custom) — top right, applies to all charts.
- Chart drill-down: click bar → filtered table/view below.
- Live data: streaming updates ≥ 5s intervals with pulsing indicator; pause when tab hidden.
- **Tables**: sticky header, sortable, filter chips, row actions on hover/selection mode, bulk select, export CSV. Mobile: cards or horizontal scroll + sticky first column.

## Visual Style
- Dark or light per product; pure dark (#0a0a0a) with 1 accent. Consistent card radii/shadows from tokens; data density allowed (12px text minima).
- Numbers in tabular-nums/mono; avoid ALL-CAPS titles.
- Status badges: success/warning/error/neutral chips standard.

## Checklist
- [ ] Every metric has a source + period label
- [ ] Charts readable at 1200px and 375px (stack or swipe)
- [ ] Filters persist across navigation
- [ ] Empty/loading/error states for every data region
- [ ] Keyboard: tables sortable via headers, charts focusable with tooltip
- [ ] Performance: virtualized tables > 100 rows, chart lib lazy-loaded