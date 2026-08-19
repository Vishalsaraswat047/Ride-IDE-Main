---
name: real-estate-design
description: Real-estate platform design — property search with map-first results, listing galleries, filters, mortgage calculator, agent profiles, lead capture, tour booking.
---

# Real Estate Design System

Property = biggest purchase decision. Search on map, compare fast, inquire with zero friction.

## Visual Direction
- Trustworthy + aspirational: neutral premium (grays/beiges), photography-led, clean typography, subtle shadows. Blue/teal accents ok. No gimmicks.

## Search Experience
1. **Map-first results** (desktop): left listing cards / right map with clustered pins → zoom re-clusters, card hover highlights pin. Mobile: search → list with map toggle (drawer).
2. **Filters** (first-class): property type, BHK/rooms, price range, locality/area (polygon map draw optional), status (buy/rent/lease), amenities multi-select, furnishing, possession. Saved searches + alert toggle ("Email me new matches").
3. **Sort**: newest, price ↑↓, area, verified first.
4. Search page: breadcrumb locality path, result count meta ("214 matches in Bandra"), map boundary applied indicator.

## Listing Page (the conversion page)
1. **Gallery**: 10–20 photos, professional, grid or full-bleed carousel (thumbnails), video/virtual-tour badge, "photos count".
2. Sticky right/bottom rail: price (per-crore/lakh or rent/mo), amenities summary icons, **Book a visit / Contact agent** primary CTA, EMI estimate + mortgage calculator link, "Save/Shortlist" heart.
3. Description: structured sections (Overview, Amenities chips, Layout, Floor plan image, Nearby/schools transit map snippet, Possession/legal: title docs, RERA badge if applicable).
4. **Agent card**: photo, name, agency, response rate, rating, phone/whatsapp contact, "more listings".
5. Owner/seller side: verified badge hierarchy (Owner Verified > RERA registered).

## Mortgage/EMI Calculator
- Sliders (price, down payment %, rate, tenure) → instant EMI, downpayment split, interest total, printable estimate. Put near every price.

## Lead & CRM Side (for owner products)
1. Inquiry form: tiny (name, phone, preferred time); "request call back" alternative; success toast with next step + agent name.
2. Owner dashboard: leads list (source, status funnel: New → Contacted → Site Visit → Negotiation → Closed), follow-up reminders, team assignments, listing performance (views, saves, inquiries per listing).
3. Agent profile: verified photo, credentials, past-clients reviews, active listings, video intro.

## Rules
1. **Honest pricing**: price + all fees noted; "negotiable" only when true; no bait listings.
2. Photos real (no stock interiors passed as the unit); photo count + "virtual staging" disclosure.
3. Verified badges grounded in actual verification process; demo markers when mock.
4. Distance/duration chips ("7 min to Metro") with source note.
5. Mobile: contact action always reachable (sticky bottom bar on listing).
6. Accessibility: alt text on every property image; maps keyboard-navigable; WCAG AA.
7. Never autoplay video/open virtual tours without intent.

## Checklist
- [ ] Map/listing sync (hover ↔ pin) works
- [ ] Book-a-visit request < 4 fields
- [ ] EMI visible on listing
- [ ] Filters persist (URL state) and shareable
- [ ] Lead notifications to agent within seconds (demo honest)