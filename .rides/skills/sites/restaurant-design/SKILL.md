---
name: restaurant-design
description: Restaurant/food-app design — menu display, food photography, ordering, table reservations, delivery tracking, kitchen/owner dashboard, ratings. For food delivery, reservation, and restaurant sites.
---

# Restaurant / Food Design System

Food is sold with appetite. Photography + speed of ordering are the product.

## Visual Direction
- Warm, mouthwatering: food photography-first (hero dish shots, real images), warm palette (ambers, creams) with brand accent, rounded cards, playful-but-clean type.
- Never rely on stock-food bloat: use appetizing crops, consistent lighting, WebP.

## Customer Side
1. **Home**: brand dish hero → categories (pizza/curry/burgers…) as image tiles → "Today's specials", trending items, ratings summary, delivery banner (ETA + fee), search prominent.
2. **Menu/catalog**: sticky category chips (scroll-sync), item cards: photo (small, consistent), name, description line, price, dietary badges (veg/non-veg, gluten-free, spicy) — OEM-styled, quantity stepper or "Add", popular badge. Search with autocorrect.
3. **Item detail (optional sheet)**: photo large, description, customization matrix (size/spice/toppings) with options, price updates live.
4. **Cart**: grouped by restaurant, qty steppers, add-ons, promo code, delivery fee + tax lines, "Checkout" sticky bottom (mobile), "order again" from history.
5. **Checkout**: address autocomplete, delivery/pickup toggle, tip selection (optional, honest), payment (card/UPI/COD options), order summary final, place order with confirmation screen + ETA.
6. **Order tracking**: status timeline (Confirmed → Preparing → Out for delivery → Delivered) with LIVE map + driver contact (if product supports), SMS/push alerts, "contact restaurant".

## Reservation Flow (restaurants with tables)
1. Date + party size → time slots grid (available highlighted, nearby times dimmed) → special requests → confirmation with reminder opt-in.
2. Table count honest; waitlist UI ("Join waitlist, notify at 7pm").

## Owner/Restaurant Side (dashboard)
1. Today overview: orders timeline, revenue card, avg prep time, pending reviews.
2. Menu manager: CRUD items/variants/availability (toggle sold-out live reflects to customers), photo upload with auto-suggest quality.
3. Orders queue: incoming (accept/decline with reason), prep status pumps, delivery handoff; KDS-style printer-friendly.
4. Insights: bestsellers, slow movers, rating breakdown, peak hours, revenue by day.

## Rules
1. Dietary marks are semantic and always shown (India: Veg/Non-Veg mandatory; global: vegan/veg/GF).
2. Wait/delay transparency: "Preparing ~12 min" honest ETA logic, never fake.
3. Price + taxes visible before payment (GST line), ₹/$ locale formatted.
4. Photos: consistent 1:1 crops; alt text for food items (accessibility).
5. Ratings: verified orders only for reviews; restaurant replies UI.
6. Delivery-fee clarity: surcharge for rain/surge clearly stated at add-to-cart, never at payment surprise.
7. 48px touch targets; one-handed ordering flow.

## Checklist
- [ ] Order from browse → placed ≤ 6 taps
- [ ] Dietary/labels correct on every item
- [ ] Tracking live + offline fallback (schedule)
- [ ] Owner queue usable mid-rush (fast, big touch)
- [ ] Honest wait/ETA or "estimate" labels