---
name: saas-design
description: SaaS product design skill — landing → dashboard → billing flows, product-led growth patterns, conversion, onboarding, empty states, plan/pricing design.
---

# SaaS Design System

## Visual Direction
- Premium, clean, technical. 1 accent color + neutrals. Verified SaaS heroes (Vercel, Linear, Stripe) = restrained surface + one bold accent.
- Typography: strong display sans + tight tracking; data-dense dashboards use smaller mono for numbers (tabular-nums).

## Recommended Structure (landing)
1. Nav (logo, product, pricing, docs, login, primary CTA)
2. Hero: headline states ONE outcome; product preview/screenshot/demo right in hero; single primary CTA (💡 demo > signup for complex products)
3. Social proof strip (logos) — immediately after hero
4. Problem → Solution section (3–4 feature cards with concrete product UI, not abstract icons)
5. How it works (3 steps max)
6. Integrations / ecosystem
7. Testimonials (with faces + metrics)
8. Pricing (3 plans; highlight recommended; toggle monthly/annual)
9. FAQ (10–12, honest)
10. Final CTA + minimal footer

## SaaS-Specific Rules
1. **Pricing**: 3 plans, clear feature differences, "Most popular" highlighted (scale/swatch), monthly/annual toggle saves ~20%. Never hide the price — listing price or "on request" both work, but uncertainty kills trials.
2. **Free trial**: define TTL (7/14/30d), show remaining time with progress, upgrade CTA in-app.
3. **Onboarding**: ≤ 5 steps; collect only what's needed; completion = first value (setup wizard, sample data).
4. **Empty states matter**: explain the feature + primary CTA (create first X).
5. **Dashboard layout**: sidebar nav + topbar (search, notifications, avatar); 3–5 KPI cards; charts with real data schema (not placeholder sparklines); data tables with sort/filter/search.
6. **Usage limits**: show meter (75% warning → upgrade prompt).
7. **Billing page**: current plan card, invoice list, payment method, cancel/downgrade with retention flow.
8. **Docs/status**: link docs + status page in footer (trust).
9. In-product messaging: changelog modal, feature announcements, upgrade prompts — subtle, dismissible.

## CTA Patterns
- Primary nav CTA contrasts both nav and page background.
- Signup form ≤ 3 fields (email + password). Social login as accelerator, not replacement.
- Post-signup: product tour modal (3 slides) — skip on repeat visits.

## Avoid
- ✗ Generic icon-card grids with no product substance
- ✗ "Revolutionize"/superlative copy
- ✗ Pricing pages that hide the number
- ✗ Oversized gradients drowning the product shot
- ✗ Fake logos/testimonials (use real or clearly-marked placeholder)