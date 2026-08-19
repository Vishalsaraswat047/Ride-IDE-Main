---
name: gaming-design
description: Gaming site/product design — energetic dark UI, leaderboards, matchmaking, player profiles, store/reward redemption, tournaments; full motion + 3D allowed but performance-capped.
---

# Gaming Design System

Gaming allows the boldest visuals — darkest darks, neon accents, kinetic energy. Freedom WITH guardrails: performance, reduced-motion, and readability still rule.

## Visual Direction
- Energetic dark base (#0d0d0f style), neon accent system (per-game/brand color), glows, glass panels, bold display type with wide tracking, diagonal/angular clips.
- 3D + particles + magnetic cursors ALLOWED in hero (lazy-loaded, WebGL-capped, fallback image). Everything reduced-motion safe.

## Core Surfaces
1. **Home**: featured match/tournament hero (live badge), quick-enter (Play now / Find match), leaderboard top-10, active events carousel, latest news, game-mode cards.
2. **Queue/matchmaking**: card with game mode select (solo/duo/squad), estimated wait, cancel anytime; matched → lobby screen with players, accept/decline, countdown. Timeout states honest ("No match in your rank — expanding search…").
3. **Lobby (in-game adjacent)**: player list with roles/ranks, ready states, chat, start when full. Spectator view indication.

## Player Profile
- Header: avatar, username, rank badge (tiered: Bronze→Diamond with icons), level + XP bar; stats grid (K/D, win rate, matches, peak rank) with sparklines; recent matches table (result color + icons); achievements/badges gallery; loadout/cosmetics showcase.
- Privacy toggles: public/private stats, friend request controls.

## Leaderboards
- Global / regional / friends tabs; rank columns (rank, player, tier badge, points, delta); pagination + "my position" jump; rewards top-N callout.
- Real-time: moving ranks animate subtly (not color-blasting); polling ≤ 30s.

## Store & Rewards
- Store grid: item cards (art, category, price currency points/coins), rarity gem labels, "owned" states, bundles (value badge), daily deals row, wallet balance top-right.
- Purchase flow: confirm sheet (item, price, balance, "Dearer: [price]" honestly), success animation ≤ 0.8s, inventory link.
- Rewards: battle-pass progress bar with locked/unlocked milestones, claim flow (one-tap claim), season end countdown.

## Tournaments
- Bracket view (rounds, winner path highlight), schedule/prize pool, registration button with eligibility check, live match status, results + VOD links.

## Rules
1. **Performance first**: 60fps shell — WebGL scenes capped (DPR ≤ 2), lazy-chunked, disposed on unmount; three/framer chunked separately.
2. Reduced motion: disable all glows/stagger/marquee; provide "static density" via CSS media query.
3. Readability: neon on dark must still meet 4.5:1 body contrast; avoid pure-cyan-on-black body text.
4. Touch: 48px controls (mobile lobbies), no hover-only info (long-press/alt shown).
5. Monetization honesty: odds shown where loot boxes (regulator + ethics), purchase double-confirm, refund policy link, "Demo currency" banners in mock.
6. Sound design optional; video/motion never autoplay with audio.
7. One accent family; URP-style consistent tokens (no rainbow).

## Checklist
- [ ] Matchmaking flow completes or explains failure
- [ ] Leaderboard readable at 375px and 1440px
- [ ] 3D/particles have static fallbacks
- [ ] Wallet/currency consistent across store
- [ ] All states (queue, wait, disconnect) honest + recoverable