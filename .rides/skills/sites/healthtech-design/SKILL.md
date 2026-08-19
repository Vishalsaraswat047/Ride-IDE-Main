---
name: healthtech-design
description: HealthTech design — patient portals, appointment booking, telemedicine, dashboards for providers, medical data privacy presentation, accessibility & calm design.
---

# HealthTech Design System

Medical UI: calm, unambiguous, privacy-first. Patients are stressed — reduce cognitive load deliberately.

## Visual Direction
- Soothing: soft neutrals (periwinkle/teal/mint accents ok), generous air, rounded shapes, NO erratic motion (patients with vestibular issues), clear hierarchy.
- Typography: readable body 16–18px, high contrast (4.5:1 min; medical imaging contrast even higher), no tiny print for anything clinical.

## Patient Side
1. **Portal home**: next appointment card (date, provider, prep instructions), medications with adherence status, test results (new badge), messages, billing.
2. **Appointment booking**: provider directory (photo, specialty, rating, languages), availability calendar (only bookable slots, timezone-local), confirmation with prep notes + reminders (SMS/email toggles), cancel/reschedule flow dead-simple (no call required).
3. **Telemedicine**: pre-visit checklist, waiting room (status: "Your doctor will join in ~3 min"), video call UI with mute/caption, post-visit summary + prescribed items.
4. **Results lab**: list with date + status (normal/flagged — flagged ALWAYS uses icon + text explanation, never color-only), download/print PDF, "talk to provider" button next to abnormal values.
5. **Medications**: current list, dosage times (reminders), interactions warnings (orange banner + explanation), refill request, adherence log.

## Provider Side
1. **Dashboard**: today's schedule (appointments with 5/15-min ago status), overdue follow-ups, new messages/results counts (red badges only for urgent).
2. **Patient chart**: demographics header, vitals widget, history timeline (events, meds, allergies — allergy banner persistent), orders/results toggles, notes editor with structured sections + autosave.
3. **E-prescribe**: search with safety checks (interactions surfaced BEFORE sign), quantity/directions structured, signature step explicit.
4. **Queue**: waiting room list, start/skip/rejoin call controls, next-up preview.

## Data & Privacy (the brand layer)
1. HIPAA/GDPR pattern: explicit "Your data is encrypted & private" statements, consent checkboxes BEFORE data collection (explain each), patient full records download/delete/export UI.
2. Never show PHI in URLs/logs; masked everywhere in UI prototypes ("Demo data" banners when mocked).
3. Audit trail visible to patient ("Last accessed by Dr. X on Aug 14") — builds trust.

## Accessibility & Calm (mandatory)
- WCAG AA minimum, AAA for alerts; reduced-motion sets ALL animations to fades.
- Emergency/urgent info: highest contrast + icon + text ("Seek emergency care if…").
- Screen-reader friendly forms (floating labels with visible labels — never placeholder-only).
- No autoplay videos; images with proper alt; video with captions.
- 48px touch targets; one-handed usage.

## Rules
1. Intent clarity over dense dashboards: one screen = one clinical question.
2. Loading states: skeleton layouts > spinners (users think "broken" otherwise).
3. Every date/time shown in patient's timezone; appointment reminders configurable 1h/24h/1w.
4. Error states calm: "We couldn't load results — Retry" + support phone.
5. Demo mode: any mock must be visibly mockable (banner) — trust is everything.

## Checklist
- [ ] Abnormal results flagged with text+icon (not color-only)
- [ ] Booking → confirmation ≤ 3 steps
- [ ] Privacy/consent explicit on data entry
- [ ] All motion reduced-motion safe
- [ ] Provider chart loads fast (< 2s), autosave verified