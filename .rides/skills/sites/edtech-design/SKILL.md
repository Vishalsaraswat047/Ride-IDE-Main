---
name: edtech-design
description: EdTech/LMS design — course catalog, lesson player, progress tracking, quizzes, dashboards for student/teacher, gamification, accessibility-first layouts.
---

# EdTech / LMS Design System

Two core jobs: help students LEARN (focus, progress) and help teachers MANAGE (clarity, bulk actions).

## Learner Side
1. **Home/dashboard**: "Continue learning" hero card (current course, progress bar, resume button — persists), enrolled courses grid (cover, progress ring %, next lesson), streaks/points (honest), calendar.
2. **Catalog**: course cards (cover, title, instructor, rating, price/free badge, duration), filters (subject, level, price, rating), search. Course preview page: syllabus accordion (lesson previews for free), instructor bio, reviews, price + enrollment CTA, FAQ.
3. **Lesson player** (the studio): video player (or reading pane) + sidebar lesson list with completion checkmarks; auto-advance optional; notes/bookmarks; keyboard shortcuts; transcript tab; "mark complete" explicit.
4. **Quiz/exam**: one question at a time (mobile-friendly), progress dots, instant feedback with explanation ("Correct — why"), final score screen with review. Never time-penalize unfairly.
5. **Progress visualization**: per-course progress bar, % module completion, badges/achievements (intrinsic > extrinsic), streak calendar.

## Teacher/Admin Side
1. Dashboard: roster counts, pending work, attendance heatmap, recent activity feed.
2. Course builder: module/lesson tree (drag-drop), draft/publish states, preview toggle, content editor (rich text + embed video + quiz builder).
3. Student management: table (name, progress, last active, grade) with bulk email/export; gradebook.
4. Analytics: completion rate per lesson (funnel), quiz score distributions, engagement (active minutes) — charts per dashboard rules.

## Engagement Rules
1. **Micro-goals**: "Finish this module today" nudges; streak messaging gentle, never guilt-trip.
2. Badges/points only when real (no empty gamification); celebrate completion animation once (0.5s) then ship.
3. Social: discussion threads under lessons (teacher-answered, moderation queue), study groups optional.
4. Notification cadence: lesson reminders ~1/2/7d daily cap — user-controllable.

## Accessibility (mandatory in EdTech)
- WCAG AA everywhere: quiz inputs keyboard-first, focus rings, ≥ 4.5:1 text, captions required for video (transcripts), alt text for diagrams (longdesc for complex math/images).
- Reduced-motion: no flashing celebratory animations; `prefers-reduced-motion` respected.
- Contrast between "correct/incorrect" not color-only (check/X + color).

## Technical
- Mobile-first lesson player (86% watch mobile): sticky bottom progress, portrait video, offline downloads indicator.
- Video: custom player controls tested (play/pause/skip/10s/transcript); LCP = player with poster image.
- Progress saved instantly (no "did you watch?" hacks on refresh).

## Checklist
- [ ] Resume-in-one-click from dashboard
- [ ] Quiz feedback teaches (explanation shown)
- [ ] Progress visible in 3 places (dashboard, player, LMS)
- [ ] Video accessible (captions, keyboard)
- [ ] Teacher bulk actions work (select-all, export)