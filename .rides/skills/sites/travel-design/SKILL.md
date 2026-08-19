---
name: travel-design
description: Travel/booking platform design — search-first experience, results with filters, trip booking flow, itinerary, live tracking maps, reviews. For flights/trains/buses/hotels platforms.
---

# Travel Design System

Travel UX: search → compare → book → track. Speed of search and clarity of the booking decision dominate everything.

## Visual Direction
- Fresh, aspirational, editorial: photography-led (real destinations, art-directed), warm neutrals + one accent, rounded cards, airy spacing. Avoid neon; avoid overloaded homepages.
- Typography: display sans with tight tracking; prices always prominent.

## Search (the front door)
1. **Tabs**: Flights / Trains / Buses / Hotels / Packages — one primary mode, clean toggle.
2. Form pattern: origin ⇄ destination swap, one-way/roundtrip toggle, dates (calendar with price hints), travelers (adults/children/infant), class. Recent searches + autocomplete (airport/city codes, IATA gutter).
3. Submit fast (1 click after autofill) — remember last search; SSE-friendly.

## Results/Listing
- **Filters sidebar/drawer**: price range slider, departure/arrival times, stops (0/1/2+), duration, airlines/providers, free amenities. Sort: cheapest / fastest / best / departure / arrival.
- **Result card anatomy** (flights/trains/buses): times (± schedule accuracy: "±15 min"), duration + stops line with dots, price + fare family (add baggage note if quoted), provider logo for trains/buses, "Select" button. Multi-fare toggle: Lowest / Value / Premium(Flex).
- **Detail step** (fare selection): fare rules (baggage, refundability, seat class), change/cancel fee shown UP FRONT, seat map teaser (paid add-ons), price breakdown table.

## Booking Flow
1. Passenger details → contact/insurance options → payment → confirmation. Progress bar; summary rail sticky (route, passengers, fare, total).
2. **No surprise pricing**: base fare + taxes + fees listed line-by-line before payment; currency converter hint.
3. Payment: card/UPI/wallet with saved-payment; "hold price" countdown honest ("Price held 4:59").
4. Confirmation: ticket/PNR with QR, email promise, "Add to calendar", app link.

## Post-booking (the product moat)
1. **Live tracking**: map with vehicle marker (real-time when provider API allows, else schedule), status timeline (On time / Delayed 12 min / Boarding), alerts (SMS/push thresholds configurable).
2. Itinerary: all legs in one timeline card list; cancellation/reschedule flows with refund estimate + reason select + instant refund status.
3. Reviews: post-trip rating prompt (4 criteria + comment), shown on provider/route pages with verification badge.

## Rules
- Placeholder routes/products: clearly "Demo" banner; real booking APIs mocked with honest states ("Live tracking available for select routes").
- Consistent currency/locale: detect and show; never mix.
- Timezones explicit on long hauls ("Arr 14:30 +1").
- Accessibility: AA (booking forms, payment keyboard-complete), no autoplay destination video.
- Empty states: no results → "Try shifting dates ±3 days" suggestions + flexible-search CTA.

## Checklist
- [ ] Search → selectable result in ≤ 3 clicks
- [ ] Price breakdown before any payment
- [ ] Tracking + status reachable from booking history
- [ ] Cancellation policy visible pre-booking
- [ ] Mobile: complete booking one-handed