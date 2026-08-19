---
name: marketplace-design
description: Marketplace/two-sided platform design — buyer/seller interfaces, listing cards, fuzzy search + facets, reviews, trust/identity verification, commission transparency, seller onboarding.
---

# Marketplace Design System

Two audiences, one platform: buyers navigate + transact; sellers list + fulfill. Each side gets its own tailored surface.

## Buyer Side (browse + book/buy)
1. **Search-first home**: prominent search + category tiles + filters preview; personalized recs once signed in.
2. **Listing cards**: photo (≥ 3, first = hero), title, location/meta row, price prominent, rating + review count, "book/order" affordance state (available, sold, waiting).
3. **Listing detail**: gallery, spec grid, description, seller card (name, rating, response time — trust), reviews tab, similar listings, sticky booking/purchase rail.
4. **PDP trust**: verified seller badge, cancellation policy, support chat entry, price breakdown.

## Seller Side (dashboard)
1. Onboarding: ≤ 5 steps, real-time progress ("verify identity → add first listing → get paid").
2. Dashboard: earnings (real-time, chart), orders queue with actions (accept/decline/fulfill), listings CRUD + analytics (views → clicks → bookings), promote tools.
3. **Effective listing** guidance: quality checklist, suggested price, photos guidance — marketplace quality = listing quality.
4. Support: dispute center, payouts page with schedule clarity.

## Marketplace-Specific Rules
1. **Trust is the product**: verified identity badges, review system with verified-only reviews where possible, escrow/payment status visible ("Payment secured").
2. **Search/filter power**: fuzzy matching, geo filters (distance), price sliders, availability calendars (for rentals/bookings) — as a first-class UI, not a dropdown.
3. **Commission transparency**: seller sees final payout, buyer sees final price — quote breakdown, no surprise fees at checkout.
4. **Reviews**: buyers review sellers AND vice versa/privately (tripadvisor/linkedin pattern); response capability; moderation queue.
5. **Dual CTAs**: seller CTA (nav "Become a seller" / "Start selling") distinct from buyer CTA — never compete.
6. **Dispute flows**: clear process links in both dashboards (initiate → evidence → resolution → possible refund).
7. Notifications: transactional only (booking, payment, message) — never spam; preferences UI.

## Design Standards
- Neutral professional (fintech-lean trust) with one accent; review stars native-looking unicode NOT emoji style.
- Numbers tabular-nums; money always currency-formatted with locale.
- Empty states: "No listings here yet" + become-first-seller or try-new-search CTA.

## Checklist
- [ ] Buyer can complete transaction < 3 clicks from search
- [ ] Seller onboarding completable in one session
- [ ] Total price shown before payment (no surprise fees)
- [ ] Verified badges legible; review counts real
- [ ] Both roles reachable from home in 1 click