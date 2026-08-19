/**
 * RIDE template previews — PREMIUM renderer.
 *
 * Previews are rendered from the Real Content Engine (siteCopyFor), the Design
 * Brief Engine (briefFor) and the Design System Generator (designSystemFor) —
 * the same tokens and copy that the pipeline writes into the scaffold. No
 * placeholder text ever appears, and because every variant carries its own
 * brief (era, layout, hero, nav, cards, typography), every preview has its
 * own composition.
 *
 * Design language: gradient display type, glass surfaces, gradient-border
 * cards, cinematic glows, marquee logo cloud, bento feature grids, browser
 * mockups and era-specific backgrounds (ruled editorial paper, grid lines,
 * ink washes, ambient orbs). Implements the RIDE "Product Experience
 * Generator" quality bar — no generic hero + 3 cards.
 */

import { siteCopyFor, previewKindFor } from "./engine/content";
import type { SiteCopy } from "./engine/content";
import { designSystemFor } from "./engine/designSystem";
import type { DesignSystem } from "./engine/designSystem";
import { briefFor } from "./engine/briefs";
import type { VariantBrief } from "./engine/briefs";
import { registryFor } from "./engine/registry";

interface PreviewSlots {
  name: string;
  emoji: string;
  accent: string;
  familyId: string;
  archetype: string;
  variantIndex: number;
  copy: SiteCopy;
  ds: DesignSystem;
}

/* ─── Design primitives ───────────────────────────────────────────────────── */

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body { font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-font-smoothing: antialiased; }
  .mono { font-family: "SFMono-Regular", "Cascadia Code", Consolas, monospace; }
  .display { font-family: var(--display); }
  .sec { position: relative; z-index: 1; }
  .chip { display: inline-flex; align-items: center; gap: 6px; background: var(--surface); border: 1px solid var(--hairline); color: var(--mute); font-size: 10px; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
  .chip .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
  .btn { border: 1px solid var(--hairline); background: var(--surface); color: var(--ink); border-radius: var(--radius); padding: 9px 18px; font-size: 12px; font-weight: 650; cursor: pointer; transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
  .btn:hover { transform: translateY(-1px); }
  .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 8px 22px -8px color-mix(in srgb, var(--accent) 70%, transparent); }
  .btn.ghost { background: transparent; }
  .btn .arr { margin-left: 6px; opacity: .8; }
  .brutal .btn { box-shadow: 4px 4px 0 var(--ink); border-width: 2px; border-radius: 2px; }
  .g-text { background: linear-gradient(100deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 58%, var(--ink)) 58%, var(--ink) 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .g-text-soft { background: linear-gradient(100deg, var(--ink), color-mix(in srgb, var(--accent) 45%, var(--ink))); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .glass { background: color-mix(in srgb, var(--surface) 58%, transparent); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .ring-card { background: linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(135deg, color-mix(in srgb, var(--accent) 55%, transparent), transparent 62%) border-box; border: 1px solid transparent; }
  .ring-card.accent { background: linear-gradient(color-mix(in srgb, var(--accent) 12%, var(--surface)), color-mix(in srgb, var(--accent) 12%, var(--surface))) padding-box, linear-gradient(135deg, var(--accent), transparent 70%) border-box; border: 1px solid transparent; box-shadow: 0 24px 60px -22px color-mix(in srgb, var(--accent) 45%, transparent); }
  .hair { height: 1px; background: linear-gradient(90deg, transparent, var(--hairline) 18%, var(--hairline) 82%, transparent); }
  .orb { position: absolute; border-radius: 50%; filter: blur(72px); pointer-events: none; z-index: 0; }
  .marquee { overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent); mask-image: linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent); }
  .marquee-inner { display: flex; gap: 52px; width: max-content; animation: marquee 30s linear infinite; }
  .marquee-inner > * { flex-shrink: 0; }
  @keyframes marquee { to { transform: translateX(-50%); } }
  .tick { display: inline-flex; align-items: center; gap: 8px; font-weight: 750; font-size: 13px; opacity: .78; letter-spacing: -.1px; }
  .rise { animation: rise .75s cubic-bezier(.22, 1, .36, 1) both; }
  .rise.d1 { animation-delay: .05s; } .rise.d2 { animation-delay: .12s; } .rise.d3 { animation-delay: .2s; } .rise.d4 { animation-delay: .28s; }
  @keyframes rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .floaty { animation: floaty 6s ease-in-out infinite; }
  @keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
  .pulse { animation: pulse 2.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: .45; } 50% { opacity: .95; } }
  .tile-icon { width: 38px; height: 38px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--accent) 13%, transparent); color: var(--accent); }
  .hover-lift { transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: var(--shadow); border-color: color-mix(in srgb, var(--accent) 32%, var(--hairline)); }
  .eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 10px; letter-spacing: 2.4px; text-transform: uppercase; font-weight: 700; color: var(--mute); }
  .eyebrow::before { content: ""; width: 18px; height: 1px; background: var(--accent); }
  .mockup { background: var(--surface); border: 1px solid var(--hairline); border-radius: calc(var(--radius) + 6px); box-shadow: var(--shadow); overflow: hidden; }
  .mockup-bar { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid var(--hairline); background: color-mix(in srgb, var(--canvas) 70%, transparent); }
  .mockup-bar span { width: 9px; height: 9px; border-radius: 50%; background: var(--hairline); }
  .mockup-bar span:nth-child(1) { background: #ff5f57; } .mockup-bar span:nth-child(2) { background: #febc2e; } .mockup-bar span:nth-child(3) { background: #28c840; }
  .noise::after { content: ""; position: fixed; inset: 0; background-image: var(--noise); pointer-events: none; z-index: 6; opacity: .55; }
  html { scroll-behavior: smooth; }
  ::selection { background: var(--ink); color: var(--canvas); }
  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 99px; border: 3px solid var(--canvas); }
  ::-webkit-scrollbar-thumb:hover { background: var(--hairline-strong, var(--hairline)); }
  .logo-mark { display: inline-flex; align-items: center; justify-content: center; font-weight: 800; color: #fff; background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, var(--ink))); box-shadow: 0 2px 10px -2px color-mix(in srgb, var(--accent) 55%, transparent); flex-shrink: 0; }
  .logo-dot { width: 6px; height: 6px; border-radius: 2px; background: var(--accent); transform: rotate(45deg); display: inline-block; flex-shrink: 0; }
  .nav-sticky { position: sticky; top: 0; z-index: 5; background: color-mix(in srgb, var(--canvas) 76%, transparent); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
  .hero-grid::before { content: ""; position: absolute; inset: 0; background-image: linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px); background-size: 44px 44px; opacity: .35; -webkit-mask-image: radial-gradient(620px 330px at 50% 0%, #000, transparent 78%); mask-image: radial-gradient(620px 330px at 50% 0%, #000, transparent 78%); pointer-events: none; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;

function iconFor(icon: string): string {
  const paths: Record<string, string> = {
    Cpu: `<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/>`,
    Layers: `<path d="m12 2 10 6-10 6L2 8Z"/><path d="m2 12 10 6 10-6"/>`,
    Bot: `<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M8 4h8M9 14h.01M15 14h.01"/><circle cx="12" cy="2" r="1.5"/>`,
    FileCode: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M10 13l-2 2 2 2M14 13l2 2-2 2"/>`,
    Wrench: `<path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3Z"/>`,
    GraduationCap: `<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>`,
    Box: `<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>`,
    Zap: `<path d="M13 2 3 14h9l-1 8 10-12h-9Z"/>`,
    Shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>`,
    Heart: `<path d="M19 14c1.5-1.5 3-3.3 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.2 1.5 4 3 5.5l7 7Z"/>`,
    Globe: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>`,
    Star: `<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2 2 9.3l6.9-1Z"/>`,
    Truck: `<path d="M1 3h15v13H1ZM16 8h4l3 3v5h-7ZM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>`,
    Users: `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>`,
    Chart: `<path d="M3 3v18h18"/><path d="m7 15 4-6 4 3 5-7"/>`,
    Message: `<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>`,
    Calendar: `<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>`,
    Dollar: `<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>`,
    Key: `<path d="m21 2-2 2m-7.6 7.6a5.5 5.5 0 1 1-7.8 7.8 5.5 5.5 0 0 1 7.8-7.8Zm0 0L15.5 7.5m3 3L21 8m-3-3 2-2"/>`,
    Search: `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
    Eye: `<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
    Lock: `<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>`,
    Phone: `<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2Z"/>`,
    Camera: `<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/>`,
    Check: `<path d="M20 6 9 17l-5-5"/>`,
    X: `<path d="M18 6 6 18M6 6l12 12"/>`,
    Menu: `<path d="M4 6h16M4 12h16M4 18h16"/>`,
    Arrow: `<path d="M5 12h14m-6-7 7 7-7 7"/>`,
    ArrowLeft: `<path d="M19 12H5m6 7-7-7 7-7"/>`,
    Play: `<path d="m6 3 14 9-14 9Z"/>`,
    Pause: `<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>`,
    Music: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>`,
    Clock: `<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>`,
    Compass: `<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2 6.3-6.4 2 2-6.3Z"/>`,
    Code: `<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>`,
    Terminal: `<path d="m4 17 6-6-6-6M12 19h8"/>`,
    Package: `<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>`,
    Puzzle: `<path d="M19 14V9a2 2 0 0 0-2-2h-2.2a2.5 2.5 0 0 1-5 0H7a2 2 0 0 0-2 2v3.2a2.5 2.5 0 0 1 0 5V19a2 2 0 0 0 2 2h3.2a2.5 2.5 0 0 1 5 0H17a2 2 0 0 0 2-2v-2.2a2.5 2.5 0 0 1 0-5Z"/>`,
    Gamepad: `<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.3 5H6.7a5 5 0 0 0-4.9 4L1 14a3 3 0 0 0 3.8 2.9L7 16.3A3.5 3.5 0 0 1 9.9 17h4.2a3.5 3.5 0 0 1 2.9-.7l2.2.6A3 3 0 0 0 23 14l-.8-5a5 5 0 0 0-4.9-4Z"/>`,
    Trophy: `<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>`,
    Book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5ZM4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>`,
    Send: `<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>`,
    Cloud: `<path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.6 1.5A3.5 3.5 0 0 0 7 19Z"/>`,
    Database: `<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>`,
    Git: `<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 9v6M18 9v3a4 4 0 0 1-4 4h-2"/>`,
    Mic: `<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>`,
    Gem: `<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6M2 9h20"/>`,
    Cake: `<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8M4 16c.5.5 1 1 1 1s1-1.5 2-1.5 1 1.5 2 1.5 1-1.5 2-1.5 1 1.5 2 1.5 1-1.5 2-1.5 1 1.5 2 1.5 1-1.5 2-1.5 1 1.5 1 1.5M12 8V5M12 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/>`,
    Leaf: `<path d="M11 20A7 7 0 0 1 4 13c0-6 5-10 16-10 0 11-4 16-9 17Z"/><path d="M4 21c3-5 7-8 12-10"/>`,
    Balloon: `<path d="M12 2a7 7 0 0 1 7 7c0 3-1.5 5.4-4 6.7V17h-6v-1.3C6.5 14.4 5 12 5 9a7 7 0 0 1 7-7Z"/><path d="M10 20h4M12 17v3"/>`,
    Clover: `<path d="M12 12c-2.5-2.5-6-1.8-6 1.2 0 2 1.8 3 3.5 3 .8 0 1.5-.3 2.5-1v4.3h0M12 12c2.5-2.5 1.8-6-1.2-6-2 0-3 1.8-3 3.5 0 .8.3 1.5 1 2.5H4.5h0M12 12c2.5 2.5 6 1.8 6-1.2 0-2-1.8-3-3.5-3-.8 0-1.5.3-2.5 1V4.5h0M12 12c-2.5 2.5-1.8 6 1.2 6 2 0 3-1.8 3-3.5 0-.8-.3-1.5-1-2.5h7.3h0"/>`,
    Pizza: `<path d="M2.5 7A12 12 0 0 1 22 7H2.5ZM5 11l14 0a10 10 0 0 1-3.5 7.6L5 11ZM12 11v6.5M8.5 11v5M15.5 11v5.6"/>`,
  };
  const p = paths[icon];
  if (!p) return `<circle cx="12" cy="12" r="10"/>`;
  return p;
}

function svg(icon: string, size = 16): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconFor(icon)}</svg>`;
}

function favicon(slots: PreviewSlots): string {
  const letter = monogram(slots.name);
  return `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='${slots.accent}'/><text x='50' y='68' font-size='56' font-family='Inter,Arial,sans-serif' font-weight='800' text-anchor='middle' fill='#fff'>${letter}</text></svg>`)}">`;
}

/** Text logo system — the brand's first letter on an accent gradient chip.
 *  Replaces emoji marks with typographic monograms (DESIGN.md: no emoji,
 *  text-first brand language). */
function monogram(name: string): string {
  return (name.replace(/[^a-zA-Z0-9]/g, "")[0] ?? "R").toUpperCase();
}

function logoMark(name: string, size = 26, radius = 8, fontSize = 13): string {
  return `<span class="logo-mark" style="width:${size}px;height:${size}px;border-radius:${radius}px;font-size:${fontSize}px">${monogram(name)}</span>`;
}

const ERA_BORDER: Record<string, string> = {
  "neo-brutalist": "2px solid var(--ink)",
  industrial: "1px solid var(--hairline)",
  swiss: "1px solid var(--ink)",
  architectural: "1px solid var(--hairline-strong, var(--ink))",
  "digital-futurism": "1px solid var(--hairline)",
  cinematic: "1px solid var(--hairline)",
  "glass-spatial": "1px solid var(--hairline)",
};

/** Era-scaled display sizes — premium hierarchy per visual direction. */
function heroSizes(b: VariantBrief): { display: string; h2: string; letter: string; transform: string } {
  const style = b.typography?.label ?? b.era;
  const editorial = /editorial/i.test(style) || /luxur/i.test(style) ? true : /serif/i.test(style);
  if (editorial)
    return { display: "58px", h2: "30px", letter: "-1.2px", transform: "none" };
  if (b.era === "neo-brutalist")
    return { display: "62px", h2: "30px", letter: "-1.5px", transform: "none" };
  if (b.era === "swiss" || b.era === "architectural")
    return { display: "52px", h2: "26px", letter: ".5px", transform: "uppercase" };
  if (b.era === "cinematic")
    return { display: "56px", h2: "28px", letter: "-1.2px", transform: "none" };
  if (b.era === "data-dense")
    return { display: "48px", h2: "24px", letter: "-.8px", transform: "none" };
  return { display: "48px", h2: "26px", letter: "-1.2px", transform: "none" };
}

function eraBackground(b: VariantBrief): string {
  switch (b.era) {
    case "glass-spatial":
      return `body{background:radial-gradient(900px 460px at 88% -12%, color-mix(in srgb, var(--accent) 26%, transparent), transparent 70%), radial-gradient(640px 380px at 4% 8%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%), var(--canvas)}`;
    case "cinematic":
      return `body{background:radial-gradient(760px 420px at 12% -4%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 72%), radial-gradient(620px 340px at 96% 10%, color-mix(in srgb, var(--accent) 20%, transparent), transparent 72%), var(--canvas)}`;
    case "digital-futurism":
    case "architectural":
      return `body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px);background-size:${b.era === "architectural" ? "56px" : "44px"} 44px;opacity:.32;pointer-events:none;z-index:0}`;
    case "editorial":
    case "editorial-commerce":
      return `body{background:repeating-linear-gradient(0deg, transparent, transparent 31px, color-mix(in srgb, var(--hairline) 60%, transparent) 32px), var(--canvas)}`;
    case "swiss":
      return `body::before{content:"";position:fixed;inset:14px;border:1px solid var(--ink);opacity:.25;pointer-events:none;z-index:0}`;
    case "playful":
    case "organic":
      return `body{background:radial-gradient(700px 380px at 6% -6%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%), var(--canvas)}`;
    default:
      return "";
  }
}

/* ─── Section vocabulary ──────────────────────────────────────────────────── */

function sectionHead(slots: PreviewSlots, title: string, sub?: string, align: "left" | "center" = "center"): string {
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const size = heroSizes(b);
  const centered = align === "center";
  return `<div style="${centered ? "text-align:center" : ""}">
    <span class="eyebrow" style="${centered ? "justify-content:center" : ""}">${b.eraLabel}</span>
    <h2 class="display" style="font-size:${size.h2};font-weight:850;letter-spacing:${size.letter};margin-top:10px;text-transform:${coveredTransform(size)};line-height:1.1">${title}</h2>
    ${sub ? `<p style="font-size:13.5px;color:var(--mute);line-height:1.65;margin-top:10px;max-width:${centered ? "520px" : "420px"};${centered ? "margin-left:auto;margin-right:auto" : ""}">${sub}</p>` : ""}
  </div>`;
}

function coveredTransform(size: { transform: string }): string {
  return size.transform === "uppercase" ? "uppercase" : "none";
}

function stars(): string {
  return `<span style="display:inline-flex;gap:2px;color:#f5a623">${svg("Star", 13)}${svg("Star", 13)}${svg("Star", 13)}${svg("Star", 13)}${svg("Star", 13)}</span>`;
}

function avatarCircle(name: string): string {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
  return `<div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,var(--ink)))">${initials}</div>`;
}

/* ─── Navigation ──────────────────────────────────────────────────────────── */

function navBar(slots: PreviewSlots): string {
  const { copy } = slots;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const brand = `<span class="display" style="font-weight:800;font-size:14.5px;display:flex;align-items:center;gap:9px">${logoMark(slots.name, 26, 8, 13)}${slots.name}</span>`;
  const links = `<span style="display:flex;gap:22px;font-size:12px;color:var(--mute)">${copy.nav.slice(0, 5).map((n) => `<span style="cursor:pointer;transition:color .15s ease">${n}</span>`).join("")}</span>`;
  const cta = `<span style="display:flex;gap:10px;align-items:center">${b.era === "editorial" || b.era === "editorial-commerce" ? `<span style="font-size:11.5px;color:var(--mute)">Sign in</span>` : `<span class="chip">Version 2.0</span>`}<button class="btn primary"><span style="display:inline-flex;align-items:center">${copy.cta[1]}<span class="arr">→</span></span></button></span>`;
  if (b.nav === "minimal")
    return `<div class="sec nav-sticky" style="display:flex;align-items:center;justify-content:space-between;padding:22px 32px">${brand}${cta}</div>`;
  if (b.nav === "command")
    return `<div class="sec nav-sticky" style="display:flex;align-items:center;justify-content:space-between;padding:16px 30px;border-bottom:1px solid var(--hairline)">${brand}
      <span style="flex:1;max-width:300px;margin:0 26px;border:1px solid var(--hairline);border-radius:999px;padding:7px 13px;font-size:11px;color:var(--mute);display:flex;align-items:center;gap:7px;background:var(--surface)">${svg("Search", 12)} Search templates, docs, settings…<span style="margin-left:auto;font-size:9px;border:1px solid var(--hairline);border-radius:5px;padding:1px 5px;font-family:inherit">⌘K</span></span>
      ${cta}</div>`;
  if (b.nav === "floating")
    return `<div class="sec" style="padding:18px 30px 0"><div class="glass" style="display:flex;align-items:center;justify-content:space-between;border:1px solid var(--hairline);border-radius:var(--radius);padding:12px 18px;box-shadow:var(--shadow)">${brand}${links}${cta}</div></div>`;
  if (b.nav === "sidebar")
    return `<div class="sec nav-sticky" style="display:flex;align-items:center;gap:16px;padding:16px 30px;border-bottom:1px solid var(--hairline)">${brand}<span style="width:1px;height:20px;background:var(--hairline)"></span>${links}${cta}</div>`;
  return `<div class="sec nav-sticky" style="display:flex;align-items:center;justify-content:space-between;padding:16px 30px;border-bottom:1px solid var(--hairline)">${brand}${links}${cta}</div>`;
}

/* ─── Hero — premium compositions per brief ───────────────────────────────── */

function heroOrbs(b: VariantBrief): string {
  if (b.era === "cinematic" || b.era === "glass-spatial")
    return `<div class="orb" style="width:340px;height:340px;top:-120px;left:-80px;background:color-mix(in srgb,var(--accent) 34%,transparent)"></div><div class="orb" style="width:280px;height:280px;bottom:-60px;right:-40px;background:color-mix(in srgb,var(--accent) 18%,transparent)"></div>`;
  if (b.era === "digital-futurism")
    return `<div class="orb" style="width:300px;height:300px;top:-100px;right:10%;background:color-mix(in srgb,var(--accent) 24%,transparent)"></div>`;
  return "";
}

function browserMockup(inner: string): string {
  return `<div class="mockup rise d2" style="max-width:460px">
    <div class="mockup-bar"><span></span><span></span><span></span><span style="flex:1;margin-left:8px;height:14px;border-radius:7px;background:color-mix(in srgb,var(--hairline) 75%,transparent)"></span></div>
    <div style="padding:18px">${inner}</div>
  </div>`;
}

function heroBand(slots: PreviewSlots): string {
  const { copy } = slots;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const size = heroSizes(b);
  const badge = `<span class="chip rise d1" style="color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent);background:color-mix(in srgb,var(--accent) 9%,var(--surface))"><span class="dot"></span>${copy.badge}</span>`;
  const lines = copy.headline
    .split(" ")
    .map((w, i) => (i === copy.headline.split(" ").length - 1 ? `<span class="g-text">${w}</span>` : w))
    .join(" ");
  const headline = `<h1 class="display rise d2" style="font-size:${size.display};font-weight:900;line-height:1.03;letter-spacing:${size.letter};margin:18px 0 16px;text-transform:${coveredTransform(size)}">${lines}</h1>`;
  const sub = `<p class="rise d3" style="font-size:14.5px;color:var(--body);line-height:1.7;max-width:460px">${copy.sub}</p>`;
  const ctas = `<div class="rise d4" style="margin-top:24px;display:flex;gap:12px;align-items:center"><button class="btn primary">${copy.cta[0]}<span class="arr">→</span></button><button class="btn ghost">${copy.cta[1]}</button><span class="mono" style="font-size:10.5px;color:var(--mute);margin-left:4px">No credit card · Live in minutes</span></div>`;
  const orbs = heroOrbs(b);
  const trust = `<div class="rise d4" style="margin-top:26px;display:flex;align-items:center;gap:14px"><span style="display:flex"><span style="width:20px;height:20px;border-radius:50%;border:2px solid var(--canvas);background:linear-gradient(135deg,#f5a623,#ff5f57)"></span><span style="width:20px;height:20px;border-radius:50%;border:2px solid var(--canvas);background:linear-gradient(135deg,#28c840,#50e3c2)"></span><span style="width:20px;height:20px;border-radius:50%;border:2px solid var(--canvas);background:linear-gradient(135deg,#0070f3,#7928ca)"></span></span><span style="font-size:11.5px;color:var(--mute)">Loved by ${copy.stats[0]?.[0] ?? "2,000+"} ${copy.stats[0]?.[1]?.toLowerCase() ?? "teams"}</span></div>`;

  const featureCard = (f: { icon: string; title: string; note: string }, i: number): string =>
    `<div class="hover-lift" style="background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius);padding:16px;${i % 2 === 1 ? "transform:translateY(8px)" : ""}">
      <div class="tile-icon">${svg(f.icon, 17)}</div>
      <b style="display:block;font-size:12.5px;margin-top:10px">${f.title}</b>
      <span style="font-size:11px;color:var(--mute);line-height:1.55;display:block;margin-top:4px">${f.note}</span>
    </div>`;

  // Cinematic: full-bleed glow hero with marquee ticker underneath.
  if (b.era === "cinematic" || b.era === "glass-spatial" || b.era === "digital-futurism")
    return `<div class="sec glow-hero hero-grid" style="padding:${b.era === "glass-spatial" ? "60px" : "76px"} 30px 0;position:relative;overflow:hidden">${orbs}
      <div style="max-width:860px">${badge}${headline}${sub}${trust}${ctas}</div>
      <div class="marquee" style="margin-top:44px;padding-bottom:12px"><div class="marquee-inner">${copy.logos.length >= 4 ? copy.logos.concat(copy.logos).map((l) => `<span class="tick"><span class="logo-dot"></span>${l}</span>`).join("") : copy.features.slice(0, 6).map((f) => `<span class="tick" style="color:var(--accent)">${svg(f.icon, 14)} ${f.title}</span>`).join("")}</div></div>
    </div>`;

  // Asymmetric: editorial or product-led text with a tall browser mockup.
  if (b.hero === "asymmetric")
    return `<div class="sec glow-hero hero-grid" style="padding:64px 30px 0;position:relative;overflow:hidden">${orbs}
      <div style="display:grid;grid-template-columns:1.55fr .95fr;gap:34px;align-items:center">
        <div>${badge}${headline}${sub}${trust}${ctas}</div>
        <div style="transform:translateY(14px)">${browserMockup(`<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--mute)"><span style="font-weight:800;color:var(--ink)">${slots.name}</span><span class="chip"><span class="dot"></span>Live</span></div>
        <div class="display" style="font-size:22px;font-weight:850;letter-spacing:-.6px;margin:16px 0 4px">${copy.headline.split(" ").slice(0, 3).join(" ")}</div>
        <div style="font-size:11.5px;color:var(--mute);line-height:1.6">${copy.sub}</div>
        ${copy.stats.length >= 3 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">${copy.stats.slice(0, 4).map(([v, l]) => `<div style="border:1px solid var(--hairline);border-radius:10px;padding:10px 12px"><div class="display" style="font-size:17px;font-weight:900;color:var(--accent)">${v}</div><div style="font-size:9.5px;color:var(--mute);margin-top:2px">${l}</div></div>`).join("")}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:16px">${copy.features.slice(0, 4).map((f) => `<span class="chip"><span style="color:var(--accent)">${svg(f.icon, 11)}</span>${f.title.split(" ")[0]}</span>`).join("")}</div>`)}</div>
      </div>
    </div>`;

  // Split: text + floating product visual with orbiting chips.
  if (b.hero === "split")
    return `<div class="sec glow-hero hero-grid" style="padding:62px 30px 0;position:relative;overflow:hidden">${orbs}
      <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center">
        <div>${badge}${headline}${sub}${ctas}</div>
        <div style="position:relative;display:flex;justify-content:center">
          <div class="floaty ring-card accent" style="width:240px;height:240px;border-radius:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 30px 70px -26px color-mix(in srgb,var(--accent) 55%,transparent)"><span class="display" style="font-size:96px;font-weight:900;letter-spacing:-3px;line-height:1;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 60%,var(--ink)));-webkit-background-clip:text;background-clip:text;color:transparent">${monogram(slots.name)}</span></div>
          <div class="glass" style="position:absolute;top:16px;right:6%;border:1px solid var(--hairline);border-radius:999px;padding:7px 13px;font-size:10.5px;font-weight:750;box-shadow:var(--shadow)">${svg("Check", 11)} ${copy.features[0]?.title ?? "Fast setup"}</div>
          <div class="glass" style="position:absolute;bottom:22px;left:4%;border:1px solid var(--hairline);border-radius:999px;padding:7px 13px;font-size:10.5px;font-weight:750;box-shadow:var(--shadow);color:var(--accent)">${svg("Zap", 11)} ${copy.cta[0]}</div>
        </div>
      </div>
    </div>`;

  // Product / typography-first: statement hero with feature strip under.
  return `<div class="sec glow-hero hero-grid" style="padding:${b.hero === "typography" ? "84px" : "70px"} 30px 0;position:relative;overflow:hidden">${orbs}
    <div style="max-width:780px">${badge}${headline}${sub}${trust}${ctas}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:44px">
      ${copy.features.slice(0, 3).map((f, i) => featureCard(f, i)).join("")}
    </div>
  </div>`;
}

/* ─── Logo marquee ────────────────────────────────────────────────────────── */

function logosBar(slots: PreviewSlots): string {
  const { copy } = slots;
  if (copy.logos.length === 0) return "";
  const items = copy.logos.length >= 4 ? copy.logos : copy.logos.concat(copy.logos, copy.logos);
  const double = items.concat(items);
  return `<div class="sec" style="padding:44px 0 0">
    <div style="text-align:center"><span style="font-size:10px;letter-spacing:2.6px;color:var(--mute);text-transform:uppercase;font-weight:750">Trusted by product teams at</span></div>
    <div class="marquee" style="margin-top:18px"><div class="marquee-inner">${double.map((l) => `<span class="tick"><span class="logo-dot"></span>${l}</span>`).join("")}</div></div>
  </div>`;
}

/* ─── Features — bento grid with era card grammar ─────────────────────────── */

function featuresGrid(slots: PreviewSlots): string {
  const { copy } = slots;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const size = heroSizes(b);
  const feats = copy.features.slice(0, 6);

  // Editorial: numbered index rows with dividers — magazine grammar.
  if (b.cards === "borderless" || b.era === "editorial" || b.era === "editorial-commerce") {
    const rows = feats
      .map(
        (f, i) => `<div class="hover-lift" style="display:grid;grid-template-columns:44px 1fr 2.2fr auto;gap:18px;align-items:center;padding:20px 4px;border-bottom:1px solid var(--hairline)">
          <span class="display mono" style="font-size:20px;font-weight:900;color:color-mix(in srgb,var(--accent) 70%,transparent)">${String(i + 1).padStart(2, "0")}</span>
          <div class="tile-icon">${svg(f.icon, 18)}</div>
          <div><b style="font-size:14px">${f.title}</b><span style="font-size:11.5px;color:var(--mute);line-height:1.55;display:block;margin-top:3px">${f.note}</span></div>
          <span style="color:var(--mute)">${svg("Arrow", 15)}</span>
        </div>`,
      )
      .join("");
    return `<div class="sec" style="padding:56px 30px 0">
      ${sectionHead(slots, copy.headline.split(" ").slice(0, 3).join(" "), "The work, the tools, the process — documented end to end.", "left")}
      <div style="margin-top:24px">${rows}</div>
    </div>`;
  }

  // Bento: hero tile + supporting tiles in a deliberate grid.
  const heroTile = feats[0];
  const rest = feats.slice(1, 5);
  const tile = (f: { icon: string; title: string; note: string }, span: string): string =>
    `<div class="hover-lift ring-card" style="border-radius:var(--radius);padding:20px;grid-column:${span};min-height:${span.includes("/") ? "auto" : "150px"};display:flex;flex-direction:column">
      <div class="tile-icon" style="margin-bottom:auto">${svg(f.icon, 18)}</div>
      <b style="font-size:13.5px;display:block;margin-top:14px">${f.title}</b>
      <span style="font-size:11.5px;color:var(--mute);line-height:1.6;display:block;margin-top:5px">${f.note}</span>
    </div>`;

  const layered = b.cards === "layered";
  const floating = b.cards === "floating";
  const brutal = b.era === "neo-brutalist";
  const shadow = brutal ? "box-shadow:5px 5px 0 var(--ink);" : floating ? "box-shadow:var(--shadow);" : layered ? "box-shadow:3px 3px 0 var(--hairline-strong, var(--hairline));" : "";
  const tileBrutal = brutal ? "border:2px solid var(--ink);border-radius:2px;" : "";

  const bentoTile = (f: { icon: string; title: string; note: string }, i: number): string =>
    `<div class="hover-lift" style="background:var(--surface);border:1px solid var(--hairline);border-radius:${brutal ? "2px" : "var(--radius)"};padding:18px;${shadow}${brutal ? "border:2px solid var(--ink)" : ""}${i % 2 === 1 && floating ? "transform:translateY(9px)" : ""};display:flex;flex-direction:column">
      <div class="tile-icon">${svg(f.icon, 17)}</div>
      <b style="font-size:12.5px;display:block;margin-top:11px">${f.title}</b>
      <span style="font-size:11px;color:var(--mute);line-height:1.56;display:block;margin-top:4px">${f.note}</span>
    </div>`;

  if (b.layout === "editorial" || b.layout === "asymmetric") {
    const grid = [
      ...(heroTile ? [bentoTile(heroTile, 0)] : []),
      ...rest.map((f, i) => bentoTile(f, i + 1)),
    ];
    const span = grid[0]?.replace(/^$/, "") ?? "";
    void span;
    return `<div class="sec" style="padding:56px 30px 0">
      ${sectionHead(slots, "Capabilities", "Everything the product needs — one deliberate system.", "left")}
      <div style="display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:14px;margin-top:26px;align-items:stretch">
        ${grid.slice(0, 3).map((g, i) => g.replace(/grid-column:[^;]+;/, i === 0 ? "grid-column:auto;" : "")).join("")}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:14px">${grid.slice(3, 5).join("")}</div>
    </div>`;
  }

  return `<div class="sec" style="padding:56px 30px 0">
    ${sectionHead(slots, "Everything you need, nothing you don't", undefined)}
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:28px">
      ${heroTile ? tile(heroTile, "1 / 3") : ""}
      ${rest.map((f) => tile(f, "auto")).join("")}
      ${heroTile ? "" : feats.slice(5, 6).map((f) => tile(f, "auto")).join("")}
    </div>
  </div>`;
}

/* ─── Stats band ──────────────────────────────────────────────────────────── */

function statsRow(slots: PreviewSlots): string {
  const { copy } = slots;
  const stats = copy.stats.slice(0, 4);
  if (stats.length === 0) return "";
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const editorial = b.era === "editorial" || b.era === "editorial-commerce";
  if (editorial)
    return `<div class="sec" style="padding:52px 30px 0;display:flex;gap:56px;flex-wrap:wrap;justify-content:flex-start">
      ${stats.map(([v, l]) => `<div><div class="display" style="font-size:40px;font-weight:900;letter-spacing:-1px;color:var(--ink)">${v}<span style="color:var(--accent)">.</span></div><div style="font-size:10.5px;color:var(--mute);margin-top:5px;text-transform:uppercase;letter-spacing:1.6px">${l}</div></div>`).join("")}
    </div>`;
  return `<div class="sec" style="padding:50px 30px 0">
    <div class="hair"></div>
    <div style="display:grid;grid-template-columns:repeat(${Math.max(stats.length, 3)},1fr);gap:14px;padding:26px 0;text-align:center">
      ${stats.map(([v, l], i) => `<div style="${i > 0 ? "border-left:1px solid var(--hairline);" : ""}">
        <div class="display" style="font-size:32px;font-weight:900;letter-spacing:-.8px;background:linear-gradient(180deg,var(--ink),color-mix(in srgb,var(--accent) 55%,var(--ink)));-webkit-background-clip:text;background-clip:text;color:transparent">${v}</div>
        <div style="font-size:10.5px;color:var(--mute);margin-top:5px;text-transform:uppercase;letter-spacing:1.4px">${l}</div>
      </div>`).join("")}
    </div>
    <div class="hair"></div>
  </div>`;
}

/* ─── Testimonial ─────────────────────────────────────────────────────────── */

function testimonial(slots: PreviewSlots): string {
  const { copy } = slots;
  if (!copy.testimonial) return "";
  const t = copy.testimonial;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const editorial = b.era === "editorial" || b.era === "editorial-commerce";
  const quoteMark = `<span class="display" style="font-size:64px;line-height:.5;color:var(--accent);opacity:.55">“</span>`;
  return `<div class="sec" style="padding:52px 30px 0;display:flex;justify-content:center">
    <div style="max-width:620px;width:100%;${editorial ? "" : "border:1px solid var(--hairline);border-radius:calc(var(--radius) + 6px);background:color-mix(in srgb,var(--surface) 72%,transparent);padding:30px;box-shadow:var(--shadow);backdrop-filter:blur(8px)"}">
      ${editorial ? `<div style="display:flex;justify-content:space-between;align-items:flex-end"><div>${quoteMark}</div>${stars()}</div>` : `<div style="display:flex;justify-content:space-between;align-items:flex-start">${stars()}${quoteMark}</div>`}
      <p class="display" style="font-size:16.5px;line-height:1.7;margin:18px 0 22px;color:var(--body);letter-spacing:-.2px">${t.quote}</p>
      <div style="display:flex;align-items:center;gap:12px;${editorial ? "border-top:1px solid var(--hairline);padding-top:16px" : ""}">
        ${avatarCircle(t.name)}
        <div><div style="font-size:12.5px;font-weight:800">${t.name}</div><div style="font-size:11px;color:var(--mute)">${t.role}</div></div>
        <div class="chip" style="margin-left:auto">Verified customer</div>
      </div>
    </div>
  </div>`;
}

/* ─── Pricing ─────────────────────────────────────────────────────────────── */

function pricing(slots: PreviewSlots): string {
  const { copy } = slots;
  if (copy.pricing.length === 0) return "";
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const brutal = b.era === "neo-brutalist";
  return `<div class="sec" style="padding:54px 30px 0">
    ${sectionHead(slots, b.era === "data-dense" ? "Plans & limits" : "Simple pricing that scales", "Start free. Upgrade when the work demands it.")}
    <div style="display:flex;justify-content:center;gap:6px;margin:22px 0 26px">
      <span class="chip" style="background:var(--ink);color:var(--canvas);border-color:var(--ink);font-weight:750">Monthly</span>
      <span class="chip">Yearly <span style="color:var(--accent)">−20%</span></span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(${Math.min(copy.pricing.length, 3)},1fr);gap:16px;align-items:stretch;max-width:860px;margin:0 auto">
      ${copy.pricing.map((p) => `<div class="hover-lift ${p.featured ? "ring-card accent" : "ring-card"}" style="border-radius:var(--radius);padding:24px;display:flex;flex-direction:column;${brutal && !p.featured ? "box-shadow:5px 5px 0 var(--ink);border:2px solid var(--ink);border-radius:2px" : ""}${p.featured ? "transform:translateY(-6px)" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:800">${p.name}</span>
          ${p.featured ? `<span class="chip" style="background:var(--accent);color:#fff;border-color:var(--accent);font-weight:750">Most popular</span>` : ""}
        </div>
        <div class="display" style="font-size:34px;font-weight:900;letter-spacing:-1px;margin:14px 0 2px">${p.price}<span style="font-size:11px;color:var(--mute);font-weight:600">${p.note}</span></div>
        <span style="font-size:11px;color:var(--mute);margin-bottom:14px">Everything in ${p.name}, plus:</span>
        <div style="flex:1;display:flex;flex-direction:column;gap:9px;font-size:12px;color:var(--body)">
          ${slots.copy.features.slice(0, 3).map((f) => `<span style="display:flex;gap:8px;align-items:center"><span style="color:var(--accent)">${svg("Check", 13)}</span>${f.title}</span>`).join("")}
        </div>
        <button class="btn ${p.featured ? "primary" : ""}" style="width:100%;margin-top:20px">Choose ${p.name}</button>
      </div>`).join("")}
    </div>
    <p style="text-align:center;font-size:11px;color:var(--mute);margin-top:18px">Prices in USD · Cancel anytime · 30-day money-back guarantee</p>
  </div>`;
}

/* ─── FAQ ─────────────────────────────────────────────────────────────────── */

function faq(slots: PreviewSlots): string {
  const { copy } = slots;
  if (copy.faq.length === 0) return "";
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const editorial = b.era === "editorial" || b.era === "editorial-commerce";
  return `<div class="sec" style="padding:52px 30px 0;max-width:680px;margin:0 auto">
    ${sectionHead(slots, "Frequently asked", "Straight answers, no fine-print evasion.")}
    <div style="margin-top:24px;display:flex;flex-direction:column;${editorial ? "" : "gap:10px"}">
      ${copy.faq.slice(0, 4).map(([q, a], i) => `<div class="hover-lift" style="${editorial ? `padding:18px 2px;border-bottom:1px solid var(--hairline);display:grid;grid-template-columns:36px 1fr auto;gap:12px` : `background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius);padding:15px 18px`}">
        <span style="font-size:11px;color:var(--accent);font-weight:800" class="mono">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <div style="font-size:13px;font-weight:750">${q}</div>
          <div style="font-size:12px;color:var(--mute);margin-top:5px;line-height:1.65">${a}</div>
        </div>
        <span style="color:var(--mute)">${svg("X", 13)}</span>
      </div>`).join("")}
    </div>
  </div>`;
}

/* ─── Footer ──────────────────────────────────────────────────────────────── */

function footer(slots: PreviewSlots): string {
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const border = ERA_BORDER[b.era] ?? "1px solid var(--hairline)";
  const stack = registryFor(sectionForKind(slots.familyId), slots.archetype);
  const stackChips = stack.libraries
    .slice(0, 6)
    .map((l) => `<span class="chip mono" style="font-size:9.5px" title="${l.purpose}">${l.name}</span>`)
    .join("");
  const watermark = slots.name.replace(/[^a-zA-Z0-9]/g, "");
  return `<div class="sec" style="margin-top:56px;padding:0 30px 26px;position:relative;overflow:hidden">
    <div style="border-top:${border}">
      <div class="display" style="font-size:76px;font-weight:900;letter-spacing:-2px;line-height:1.15;margin-top:28px;color:transparent;-webkit-text-stroke:1px color-mix(in srgb, var(--ink) 28%, transparent);user-select:none">${watermark}</div>
      <div style="display:flex;gap:44px;flex-wrap:wrap;margin-top:30px">
        <div style="flex:1.6;max-width:280px"><div style="display:flex;align-items:center;gap:9px;font-weight:800;font-size:14px">${logoMark(slots.name, 30, 9, 15)}${slots.name}</div>
          <p style="font-size:12px;color:var(--mute);line-height:1.7;margin-top:12px">${slots.copy.sub}</p>
          <div style="display:flex;gap:10px;margin-top:16px">${["Git", "Globe", "Message", "Music"].map((i) => `<span class="chip" style="width:30px;height:30px;padding:0;justify-content:center">${svg(i, 13)}</span>`).join("")}</div>
        </div>
        <div style="flex:1"><div style="font-size:10px;letter-spacing:2px;color:var(--mute);text-transform:uppercase;font-weight:750;margin-bottom:12px">Product</div>${slots.copy.nav.slice(0, 4).map((n) => `<div style="font-size:12px;color:var(--body);padding:5px 0;cursor:pointer">${n}</div>`).join("")}</div>
        <div style="flex:1"><div style="font-size:10px;letter-spacing:2px;color:var(--mute);text-transform:uppercase;font-weight:750;margin-bottom:12px">Company</div>${slots.copy.nav.slice(4, 8).map((n) => `<div style="font-size:12px;color:var(--body);padding:5px 0;cursor:pointer">${n}</div>`).join("")}</div>
        <div style="flex:1"><div style="font-size:10px;letter-spacing:2px;color:var(--mute);text-transform:uppercase;font-weight:750;margin-bottom:12px">Stack</div><div style="display:flex;flex-direction:column;gap:7px;margin-top:8px">${stackChips || `<span class="chip mono" style="font-size:9.5px">React · Vite · Tailwind</span>`}</div></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:34px;font-size:10.5px;color:var(--mute)">
        <span>© 2026 ${slots.name}. All rights reserved.</span>
        <span>${b.eraLabel} · ${b.layout} · ${b.typography.label}</span>
        <span class="chip" style="border-color:color-mix(in srgb,var(--accent) 45%,transparent);color:var(--accent)">Built with RIDE</span>
      </div>
    </div>
  </div>`;
}

function sectionForKind(familyId: string): string {
  const kind = previewKindFor(familyId);
  return kind === "app" ? "webapps" : kind === "mobile" ? "mobile" : kind === "game" ? "games" : kind === "aichat" ? "ai" : kind === "dev" ? "developer" : "websites";
}

function siteBody(slots: PreviewSlots): string {
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const sections = [navBar, heroBand, logosBar, featuresGrid, statsRow, testimonial, pricing, faq, footer]
    .map((fn) => fn(slots))
    .join("");
  const eraClass = b.era === "neo-brutalist" ? " brutal" : "";
  return `<div class="${eraClass}" style="min-height:100vh">${sections}</div>`;
}

/* ─── App kind — dashboard chrome ─────────────────────────────────────────── */

function miniBarChart(stats: string[][]): string {
  const nums = stats.map(([v]) => {
    const n = parseFloat(String(v).replace(/[$,%]/g, ""));
    return Number.isFinite(n) ? n : 40;
  });
  const max = Math.max(...nums, 1);
  const bars = nums
    .map((n, i) => `<rect x="${i * 26}" y="${60 - (n / max) * 52}" width="17" height="${(n / max) * 52}" rx="3" fill="${i === nums.length - 1 ? "var(--accent)" : "color-mix(in srgb, var(--accent) 38%, transparent)"}"/>`)
    .join("");
  return `<svg viewBox="0 0 ${Math.max(nums.length * 26 - 9, 60)} 62" style="width:100%;height:120px" preserveAspectRatio="none">${bars}</svg>`;
}

function appBody(slots: PreviewSlots): string {
  const { copy } = slots;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const side = [
    ["Chart", "Overview", true],
    ["Message", "Inbox"],
    ["Eye", "Reports"],
    ["Users", "Members"],
    ["Wrench", "Settings"],
  ] as const;
  const stats = copy.stats.length >= 3 ? copy.stats : [["$12,480", "Revenue this month"], ["2,418", "Active users"], ["98.2%", "Uptime"]];
  const rows = copy.features.slice(0, 5).map((f, i) => `<div style="display:flex;align-items:center;gap:11px;padding:11px 0;border-bottom:1px solid var(--hairline);font-size:12px">
    <div class="tile-icon" style="width:30px;height:30px;border-radius:8px">${svg(f.icon, 14)}</div>
    <span style="flex:1;font-weight:650">${f.title}</span>
    <span style="color:var(--mute);font-size:11px">${f.note.split(" ").slice(0, 3).join(" ")}…</span>
    <span class="chip"><span class="dot"></span>Active</span>
  </div>`).join("");
  return `<div style="display:flex;height:100vh;background:var(--canvas)">
    <div class="sec" style="width:206px;border-right:1px solid var(--hairline);padding:16px 12px;display:flex;flex-direction:column;gap:3px">
      <div class="display" style="font-weight:800;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px;padding:0 7px">${logoMark(slots.name, 24, 7, 12)}${slots.name}</div>
      ${side.map(([icon, label, active]) => `<div style="display:flex;align-items:center;gap:10px;font-size:12px;padding:8px 10px;border-radius:9px;${active ? "background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 72%,var(--ink)));color:#fff;font-weight:750;box-shadow:0 8px 18px -8px color-mix(in srgb,var(--accent) 70%,transparent)" : "color:var(--mute)"}">${svg(icon, 14)}${label}</div>`).join("")}
      <div style="margin-top:auto;display:flex;gap:8px;align-items:center;border:1px solid var(--hairline);border-radius:12px;padding:10px;background:var(--surface)">${avatarCircle("Ride Studio")}<div><div style="font-size:11px;font-weight:750">${copy.testimonial?.name ?? "Ride Studio"}</div><div style="font-size:9.5px;color:var(--mute)">${b.eraLabel}</div></div></div>
    </div>
    <div class="sec" style="flex:1;padding:20px 26px;overflow:hidden;display:flex;flex-direction:column">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><b class="display" style="font-size:18px;letter-spacing:-.4px">${copy.headline}</b><div style="font-size:11px;color:var(--mute);margin-top:3px">${copy.sub}</div></div>
        <div style="display:flex;gap:9px"><button class="btn ghost">${svg("Calendar", 13)} Last 30 days</button><button class="btn primary">+ New ${slots.archetype === "dashboard" || slots.archetype === "analytics" ? "report" : "item"}</button></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:18px">
        ${stats.slice(0, 3).map(([v, l]) => `<div class="hover-lift ring-card" style="border-radius:var(--radius);padding:16px 18px"><div style="font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:var(--mute);font-weight:750">${l}</div><div style="display:flex;align-items:baseline;gap:8px;margin-top:8px"><span class="display" style="font-size:26px;font-weight:900;letter-spacing:-.8px">${v}</span><span class="chip" style="color:#28c840">↗ 12.4%</span></div></div>`).join("")}
      </div>
      <div style="display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin-top:12px;flex:1;min-height:0">
        <div style="background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:12.5px;font-weight:800">Performance</span><span class="chip mono">${copy.stats[0]?.[0] ?? "2.4k"} / day</span></div>
          ${miniBarChart(stats)}
        </div>
        <div style="background:var(--surface);border:1px solid var(--hairline);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow);overflow:hidden">
          <div style="font-size:12.5px;font-weight:800;margin-bottom:6px">Recent activity</div>
          ${rows}
        </div>
      </div>
    </div>
  </div>`;
}

/* ─── Mobile kind — app-frame phone ───────────────────────────────────────── */

function mobileBody(slots: PreviewSlots): string {
  const { copy } = slots;
  const cards = copy.features.slice(0, 4).map((f, i) => `<div class="hover-lift" style="background:var(--surface);border:1px solid var(--hairline);border-radius:16px;padding:13px 14px;display:flex;gap:12px;align-items:flex-start;${i === 0 ? "box-shadow:var(--shadow)" : ""}">
    <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 60%,var(--ink)));color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px -5px color-mix(in srgb,var(--accent) 65%,transparent)">${svg(f.icon, 17)}</div>
    <div style="flex:1"><b style="font-size:12.5px;display:block">${f.title}</b><span style="font-size:10.5px;color:var(--mute);display:block;margin-top:2px;line-height:1.5">${f.note}</span></div>
    <span style="color:var(--mute);font-size:10px;white-space:nowrap">${i === 0 ? "Now" : i === 1 ? "2m" : "1h"}</span>
  </div>`).join("");
  return `<div style="min-height:100vh;background:radial-gradient(900px 500px at 50% -20%, color-mix(in srgb,var(--accent) 20%,transparent), transparent), var(--canvas);display:flex;justify-content:center;align-items:center;padding:24px">
    <div style="width:350px;background:#15151a;border-radius:44px;padding:9px;box-shadow:0 40px 90px -30px rgba(0,0,0,.55)">
      <div style="background:linear-gradient(180deg, var(--canvas), var(--surface));border-radius:36px;overflow:hidden">
        <div style="height:22px;display:flex;justify-content:center;align-items:center"><span style="width:72px;height:5px;border-radius:99px;background:#15151a;opacity:.85"></span></div>
        <div style="padding:6px 17px 14px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:13px;font-weight:850;display:flex;gap:7px;align-items:center">${logoMark(slots.name, 22, 7, 11)}${slots.name}</span>
          <span class="chip" style="color:var(--accent);border-color:color-mix(in srgb,var(--accent) 45%,transparent)"><span class="dot"></span>${copy.badge}</span>
        </div>
        <div style="padding:0 17px 4px"><div class="display" style="font-size:19px;font-weight:850;letter-spacing:-.5px">${copy.headline.split(" ").slice(0, 5).join(" ")}</div><div style="font-size:11px;color:var(--mute);margin-top:4px;line-height:1.55">${copy.sub}</div></div>
        <div style="display:flex;flex-direction:column;gap:9px;padding:13px 14px">${cards}
          <div style="display:flex;gap:8px;margin-top:2px"><button class="btn primary" style="flex:1;padding:10px">${copy.cta[0]}</button></div>
        </div>
        <div style="display:flex;justify-content:space-around;border-top:1px solid var(--hairline);padding:13px 8px 18px">
          ${["Home", "Search", "Cart", "Profile"].map((t, i) => `<span style="display:flex;flex-direction:column;align-items:center;gap:4px;font-size:9px;${i === 0 ? "color:var(--accent);font-weight:800" : "color:var(--mute)"}">${svg(["Menu", "Search", "Box", "Users"][i] ?? "Layers", 17)}${t}</span>`).join("")}
        </div>
      </div>
    </div>
  </div>`;
}

/* ─── Game kind — arcade cabinet ──────────────────────────────────────────── */

function gameBody(slots: PreviewSlots): string {
  const { copy } = slots;
  const cells = copy.features.slice(0, 9);
  return `<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:28px;background:radial-gradient(1200px 560px at 50% -14%, color-mix(in srgb,var(--accent) 30%,transparent), transparent), var(--canvas)">
    <div style="width:min(440px,100%)">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px">
        <span class="display" style="font-weight:900;font-size:15px;display:flex;gap:9px;align-items:center"><span style="width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,var(--ink)));display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff">${monogram(slots.name)}</span>${slots.name}</span>
        <div style="display:flex;gap:8px"><span class="chip mono" style="color:var(--accent)">● Score 2,840</span><span class="chip mono">Lv 04</span></div>
      </div>
      <div style="border:1px solid var(--hairline);border-radius:18px;padding:14px;margin-top:18px;box-shadow:var(--shadow);background:var(--surface)">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          ${cells.map((c, i) => `<div class="floaty hover-lift" style="animation-delay:${(i % 3) * .4}s;aspect-ratio:1;background:var(--canvas);border:1px solid var(--hairline);border-radius:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;${i === 1 || i === 4 || i === 7 ? "border-color:var(--accent);box-shadow:inset 0 0 0 1.5px var(--accent), 0 0 22px -6px color-mix(in srgb,var(--accent) 65%,transparent)" : ""}">
            <span style="color:${i === 1 || i === 4 || i === 7 ? "var(--accent)" : "var(--mute)"}">${svg(c.icon, 22)}</span>
            <span style="font-size:9px;font-weight:750;color:var(--mute)">${c.title.split(" ")[0]}</span>
          </div>`).join("")}
        </div>
        <div style="display:flex;align-items:center;justify-content:center;gap:22px;margin-top:14px;padding:8px 0 2px">
          <span class="chip" style="padding:8px 18px;font-size:16px;color:var(--ink)">◀</span>
          <span class="btn primary" style="padding:12px 26px;font-size:13px;border-radius:999px">${copy.cta[0]}</span>
          <span class="chip" style="padding:8px 18px;font-size:16px;color:var(--ink)">▶</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;font-size:11px;color:var(--mute)">
        <span class="chip"><span class="dot"></span>${copy.badge}</span>
        <span>${copy.sub.split(".")[0]}.</span>
        <span style="color:var(--accent);font-weight:800">${copy.stats[0]?.[0] ?? "12"}+ levels</span>
      </div>
    </div>
  </div>`;
}

/* ─── AI chat kind — assistant workspace ──────────────────────────────────── */

function aichatBody(slots: PreviewSlots): string {
  const { copy } = slots;
  const userMsg = copy.cta[0];
  const convo = copy.features.slice(0, 4);
  const bubbles = [
    `<div style="align-self:flex-end;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 70%,var(--ink)));color:#fff;border-radius:14px 14px 4px 14px;padding:10px 14px;font-size:12px;max-width:70%;box-shadow:0 8px 18px -8px color-mix(in srgb,var(--accent) 60%,transparent)">${userMsg}</div>`,
    `<div style="align-self:flex-start;max-width:82%;display:flex;gap:10px"><div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,var(--ink)));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff">${monogram(slots.name)}</div>
      <div style="background:var(--surface);border:1px solid var(--hairline);border-radius:14px 14px 14px 4px;padding:10px 14px;font-size:12px;color:var(--body);line-height:1.6">${copy.sub}</div></div>`,
    `<div style="align-self:flex-start;max-width:86%;display:flex;gap:10px"><div style="width:30px;height:30px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 55%,var(--ink)));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff">${monogram(slots.name)}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:7px">${convo.slice(0, 3).map((f) => `<div style="background:var(--surface);border:1px solid var(--hairline);border-radius:10px;padding:8px 12px;font-size:11px;color:var(--body);display:flex;gap:8px;align-items:center"><span style="color:var(--accent)">${svg(f.icon, 12)}</span>${f.title}</div>`).join("")}</div></div>`,
  ].join("");
  return `<div style="display:flex;height:100vh;background:radial-gradient(800px 420px at 90% -10%, color-mix(in srgb,var(--accent) 16%,transparent), transparent), var(--canvas)">
    <div class="sec" style="width:178px;border-right:1px solid var(--hairline);padding:16px 12px;font-size:11.5px;display:flex;flex-direction:column;gap:3px">
      <div class="display" style="font-weight:850;margin-bottom:14px;display:flex;gap:8px;align-items:center;padding:0 6px">${logoMark(slots.name, 22, 7, 11)}${slots.name}</div>
      <div style="display:flex;align-items:center;gap:7px;padding:7px 9px;border-radius:9px;background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--accent);font-weight:750;border:1px solid color-mix(in srgb,var(--accent) 30%,transparent)">${svg("Message", 13)} New chat</div>
      ${["Today", "Previous 7 days"].map((g, gi) => `<div style="font-size:9px;color:var(--mute);letter-spacing:1.4px;text-transform:uppercase;margin:10px 4px 4px">${g}</div>${copy.features.slice(gi * 2, gi * 2 + 2).map((f, fi) => `<div style="padding:7px 9px;border-radius:8px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${fi === 0 && gi === 0 ? "background:var(--surface);border:1px solid var(--hairline);color:var(--ink);font-weight:600" : ""}">${svg("Message", 12)} ${f.title}</div>`).join("")}`).join("")}
      <div style="margin-top:auto;padding:8px 9px;color:var(--mute);display:flex;gap:8px;align-items:center">${svg("Wrench", 13)} Settings</div>
    </div>
    <div class="sec" style="flex:1;display:flex;flex-direction:column;padding:20px 24px 14px">
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--mute)">
        <span style="display:flex;align-items:center;gap:7px"><span class="dot" style="width:6px;height:6px;border-radius:50%;background:#28c840"></span>${copy.badge}</span>
        <span class="chip mono">${slots.name} · ready</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;flex:1;margin-top:14px">${bubbles}
        <div style="align-self:flex-start;display:flex;gap:4px;padding:8px 4px">${[0, 1, 2].map(() => `<span class="pulse" style="width:5px;height:5px;border-radius:50%;background:var(--accent)"></span>`).join("")}</div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">${convo.slice(0, 3).map((f) => `<span class="chip" style="color:var(--body)">${svg(f.icon, 11)} ${f.title.split(" ")[0]}</span>`).join("")}</div>
      <div class="glass" style="border:1px solid var(--hairline);border-radius:14px;padding:12px 15px;font-size:12px;color:var(--mute);display:flex;align-items:center;justify-content:space-between;box-shadow:var(--shadow)">
        <span>Ask ${slots.name} anything…</span>
        <span style="display:flex;gap:12px;align-items:center"><span style="color:var(--mute)">${svg("Mic", 14)}</span><span style="width:30px;height:30px;border-radius:10px;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center">${svg("Send", 14)}</span></span>
      </div>
    </div>
  </div>`;
}

/* ─── Dev kind — terminal workspace ───────────────────────────────────────── */

function devBody(slots: PreviewSlots): string {
  const { copy } = slots;
  const b = briefFor(slots.familyId, slots.variantIndex, slots.name);
  const line = (code: string, color = "var(--body)"): string => `<div style="color:${color}">${code}</div>`;
  return `<div style="min-height:100vh;padding:30px;display:flex;flex-direction:column;gap:18px;background:radial-gradient(800px 400px at 100% -10%, color-mix(in srgb,var(--accent) 18%,transparent), transparent), var(--canvas)">
    <div style="display:flex;align-items:center;gap:10px;font-weight:850;font-size:14px" class="display"><span style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--accent),color-mix(in srgb,var(--accent) 50%,var(--ink)));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff">${monogram(slots.name)}</span>${slots.name}<span class="chip" style="margin-left:auto"><span class="dot"></span>${copy.badge}</span></div>
    <p style="color:var(--body);font-size:12.5px;line-height:1.7;max-width:520px">${copy.sub}</p>
    <div class="mockup mono" style="font-size:11.5px;line-height:2;">
      <div class="mockup-bar"><span></span><span></span><span></span><span style="flex:1;margin-left:8px;font-size:10px;color:var(--mute)">${slots.name.toLowerCase().replace(/\s+/g, "-")} — zsh</span></div>
      <div style="padding:16px 18px">
        ${line("$ ride init " + slots.familyId, "var(--mute)")}
        ${line("▸ resolving dependencies…", "var(--mute)")}
        ${line("✓ " + slots.familyId.replaceAll("-", "") + "@latest installed", "var(--accent)")}
        ${line("✓ " + (copy.stats[0]?.[0] ?? "28") + " checks passed · 0 failures · 0 warnings", "var(--accent)")}
        ${line("", "")}
        ${line("export function " + slots.familyId.replaceAll("-", "") + "(opts: Options) {", "var(--ink)")}
        ${line('  return `ready → ' + copy.cta[0] + '`;', "var(--body)")}
        ${line("}", "var(--ink)")}
        <span style="display:inline-block;width:7px;height:14px;background:var(--accent);animation:pulse 1.2s ease-in-out infinite"></span>
      </div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${copy.features.slice(0, 5).map((f) => `<span class="chip" style="display:flex;align-items:center;gap:6px;padding:6px 11px"><span style="color:var(--accent)">${svg(f.icon, 12)}</span>${f.title}</span>`).join("")}</div>
    <div style="display:flex;gap:10px;margin-top:2px"><button class="btn primary">${copy.cta[0]}<span class="arr">→</span></button><button class="btn">${copy.cta[1]}</button><span style="align-self:center;font-size:10.5px;color:var(--mute)">Compatible with ${b.typography.label} tooling</span></div>
  </div>`;
}

/* ─── Entry ───────────────────────────────────────────────────────────────── */

const BODIES: Record<string, (slots: PreviewSlots) => string> = {
  site: siteBody,
  app: appBody,
  mobile: mobileBody,
  game: gameBody,
  aichat: aichatBody,
  dev: devBody,
};

export function previewFor(tpl: { familyId: string; archetype: string; name: string; emoji: string; accent: string; variantIndex?: number }): string | null {
  const copy = siteCopyFor(tpl.familyId);
  const kind = previewKindFor(tpl.familyId);
  const body = BODIES[kind];
  if (!body) return null;
  const variantIndex = tpl.variantIndex ?? 0;
  const brief = briefFor(tpl.familyId, variantIndex, tpl.name);
  const ds = designSystemFor(tpl.familyId, tpl.accent, tpl.accent, "#ffffff", "landing", variantIndex);
  const slots: PreviewSlots = { ...tpl, variantIndex, copy, ds };
  const noiseUri =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(#n)' opacity='0.05'/></svg>",
    );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${favicon(slots)}
<style>:root{--accent:${tpl.accent};--display:${brief.typography.display};--canvas:${ds.palette.canvas};--surface:${ds.palette.surface};--ink:${ds.palette.ink};--body:${ds.palette.body};--mute:${ds.palette.mute};--hairline:${ds.palette.hairline};--radius:${ds.radius};--shadow:${ds.shadow};--noise:url("${noiseUri}")}${BASE_CSS}${eraBackground(brief)}</style></head>
<body class="noise" style="background:var(--canvas);color:var(--ink)">${body(slots)}</body></html>`;
}