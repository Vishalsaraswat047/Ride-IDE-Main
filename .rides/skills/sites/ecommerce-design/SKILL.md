---
name: ecommerce-design
description: E-commerce design — storefront, product pages, PDP anatomy, cart/checkout optimization, trust signals, search/filters, conversion rules. For storefronts and marketplaces.
---

# E-commerce Design System

Goal: frictionless path browse → product → cart → checkout; trust at every step.

## Storefront (PLP/Category)
1. **Header**: logo, search (prominent), account, cart WITH item count.
2. **Product grid**: 3–4 cols desktop / 2 mobile; cards = image (square, consistent), name, price (sale = strikethrough + color), quick "Add" on hover (desktop).
3. **Filters sidebar** (desktop) / drawer (mobile): category, price range, size/color/variants, rating, sort (popularity, price ↑↓, newest). Filter chips + clear all + result count.
4. Banner/hero spots for campaigns only (not dead space).
5. Footer: support, shipping/returns, payment icons, newsletter.

## PDP (Product Detail Page) Anatomy
1. **Gallery**: 5+ images (front, angle, scale, lifestyle, detail), zoom on hover, thumbnails; video for complex products. Mobile: swipe carousel w/ dots.
2. **Right rail**: brand, name, rating + review count (linked), price + compare-at, variant selectors (with stock states: "Low stock: 3 left"), quantity, **Add to cart** (sticky mobile), Buy now (optional).
3. Trust stack (below rail): shipping estimate, returns/delivery, payment methods, badges.
4. **Content below**: description tabs or sections → details, specs table, reviews (sortable, verified badges, photo reviews), related items (2 rows: "You may also like", "Recently viewed").
5. Social proof: review count shown early; star rating in search results too.

## Cart & Checkout
1. Cart: line items (thumb, name, variant, qty stepper, delete), subtotal, shipping estimate, promo code (inline), trust microcopy, "Proceed to checkout" persistent.
2. **Checkout best practices**: ≤ 3 steps (info → shipping → payment), guest checkout (or "checkout as guest" primary!), progress bar, order summary sticky right, autofill (billing = shipping), save payment methods (session), field validation inline, trust badges near payment.
3. Never surprise: total, taxes, shipping shown BEFORE payment button. Subscribe discounts clearly marked.
4. Success: order confirmation with summary + email promise + "track order."

## Trust & Decision Rules
- Reviews visible at every decision point; photos in reviews rank.
- Returns policy stated early (reduces risk); free shipping threshold nudges cart ("Add $12 for free shipping").
- Stock urgency honest ("Only 3 left" only when true).
- Currency/locale detection; multi-currency toggle where relevant.

## Performance (critical)
- Product images: WebP/AVIF, `srcset`, lazy below fold, thumbnail variants; grid pages must be instant.
- PDP LCP = main product image (priority hint).

## Checklist
- [ ] Search finds products (typo-tolerant)
- [ ] Cart updates without page reload; count badge
- [ ] Mobile checkout completable one-handed
- [ ] Trust signals at add-to-cart + payment
- [ ] Empty cart/empty results have recovery CTAs