---
name: media-design
description: Media/streaming/content-platform design — video/audio players, discovery grids, watch-lists, continue-watching, subscriptions, editorial curation, light+dark art direction.
---

# Media / Streaming Design System

Content platforms sell attention: discoverability + frictionless playback. Design around "what to watch/read/play next."

## Visual Direction
- Dark-first cinematic (streaming) OR editorial light (news/publication) — both art-directed. Imagery-led grids, minimal chrome, generous type for reading surfaces.
- One accent (play button color); autoplay trailers ONLY muted + click (reduced-motion aware).

## Discovery & Browsing
- **Home rows**: "Continue watching" (position bar + resume) → "Trending now" → genre carousels → "New & notable" → "Because you watched X". Each row: large-title mosaic cards (16:9/2:3), 4–8 visible, arrows, edge-fade.
- **Search**: prominent; typeahead over titles, cast, genres; filters (type: film/show/season, year, language, rating, duration); zero-result with suggestions.
- **Details page** (`watch now`): backdrop hero + title art, metadata (year, rating, duration, genres chips, subtitles/dubs), relation chips, cast, trailer (embed, click-to-play), episodes accordion with episode count + thumbnails, "Add to Watchlist" heart.

## Player (the product)
1. Controls minimal: back, title, fullscreen, play/pause, seek ±10, volume, captions, quality selector (auto/1080/720), speed (0.5–2×), PiP.
2. Buffering: spinner ≤ 3s then fallback message; error state with "Try again" + alternate source.
3. Player closes cleanly (Esc, swipe-peek timeline), resumes position (server + local).
4. Audio player (podcast/music): waveform or progress, 15/30 skip, speed, queue, offline badge, auto-play-next toggle.

## Watchlist & History
- Grid with remove/clear all; progress % bars; sorting (added/rating/recently watched); "next episode" continued banner. Sync across devices (login-based).

## Subscription & Entitlements
- Paywall framing: preview front (trailer + first N min) then clear CTA "Start 14-day trial" + plans card (pick → pay) + cancellation links in account; entitlements visible in account page (plan badge, renew date, invoice history).

## Editorial/Reading Surface (news/publication variant)
- Broadsheet-typography: serif body 19–21px, measure ~70ch, drop caps optional; article cards: kicker + headline + dek + byline + photo ratio consistent; tag taxonomy + follow-topics.
- Paywall: honest meters display ("3 free articles left"), membership upsell tasteful.

## Rules
1. **No autoplay with sound**; trailers muted + big visible play affordance; honor `prefers-reduced-motion`.
2. Thumbnails/posters: consistent crops (16:9 / 2:3 / 4:3), WebP/AVIF, lazy; LCP = hero backdrop.
3. Maturity ratings always displayed where legally framed (17+, R) with age-gate for 18+ content.
4. Ratings/reviews: verified-viewer badges; content warnings on titles list.
5. Keyboard: arrow navigation in carousels, Esc exits player, media buttons work.
6. Demo content clearly marked "Preview/demo catalog" — never fake streams.
7. Session persistence: watch position, quality pref, hmm subtitles defaults remembered.

## Checklist
- [ ] Continue-watching resumes exactly where left
- [ ] Search finds title/cast in ≤ 2 keystrokes
- [ ] Player survives flaky network (buffering + retry)
- [ ] Every row has clear focus + keyboard path
- [ ] Entitlements/page state consistent across devices