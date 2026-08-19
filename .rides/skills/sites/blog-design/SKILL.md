---
name: blog-design
description: Blog/content-site design — reading experience, article layout, featured post, related content, tags, RSS, newsletter pattern, typographic quality. For blogs, magazines, news sites.
---

# Blog / Content Site Design System

Content is king — the design must disappear and make reading effortless.

## Layout Foundation
1. Header: logo, nav (5 items max), search, newsletter CTA.
2. Home: **featured post** (large, visual, editorial) + latest grid (cards: image, category, title, excerpt 2 lines, date, read time). Infinite scroll or "Load more" — never awkward pagination.
3. Category/archive pages: maintained grids with filter chips.
4. Footer: popular posts, categories, about, RSS.

## Article Page (the craft)
1. Header: category + title (clamp 2rem–4rem, `text-balance`), author (photo, name, bio one-liner), date + read time, featured image.
2. **Body**: max-width 68–75ch, `font-size 18px` line-height 1.7; headings `scroll-margin-top` for anchor nav; h2/h3 spacing generous.
3. **Reading aids**: post TOC (sticky right, desktop), back-to-top, related posts (2×3 grid below), prev/next article, "share" row (copy link, X, LinkedIn — native SVG icons, not emoji).
4. **Newsletter capture**: 1 inline (mid-article, plain) + 1 footer — never popup spam.
5. Comments (optional): threaded, moderation badge, oldest/newest sort.

## Typography Rules (blogs live or die here)
1. Serif body (Fraunces/Source Serif 4/Newsreader) for editorial feel OR proven sans (Inter) for dev blogs — decide once.
2. Measure 45–75ch, `text-pretty` paragraphs (v4 CSS), `overflow-wrap` long URLs.
3. Code blocks (dev blogs): mono, copy button, no background-color conflict with dark mode.
4. Quotes styled as callouts with attribution; pull-quotes optional.

## Media
- Featured images: 16:9 consistent crop; WebP/AVIF `srcset`; alt text descriptive (not "image").
- No autoplay video; GIF/loops in small confined boxes only.

## SEO/Technical
- Metadata: title pattern "Post · Site", OG image working, canonical, sitemap.xml, RSS feed link in `<head>`.
- Structured data: Article schema for top posts (`@type: "Article"`, author, datePublished).
- Performance: static generation, no client JS on article pages (Astro/Next SSG) except dark-mode + search.

## Rules
1. Category systems: ≤ 10 evergreen categories; tags unlimited.
2. Dates truthful ("2026-08-14" not stale); "Updated" stamp for edited posts.
3. Related content recommendation: same category + recency; explicit "Sponsored" labels if monetized.
4. Reading time estimate consistent (200 wpm).
5. Dark/light both art-directed (images don't blind in dark mode).

## Checklist
- [ ] Article readable start-to-finish under 4:5 contrast
- [ ] Search + category filters functional
- [ ] RSS + sitemap present
- [ ] No popups blocking content
- [ ] Loads fast even with 100 posts (pagination/ISR)