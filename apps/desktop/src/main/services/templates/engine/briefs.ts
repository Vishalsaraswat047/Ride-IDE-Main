/**
 * RIDE Design Brief Engine.
 *
 * Every one of the 520 templates (52 families × 10 variants) gets its own
 * deterministic design brief: era, layout architecture, navigation, hero,
 * typography pairing, color language, motion profile, cards, imagery and
 * interactions. Uniqueness is guaranteed INSIDE each category by assigning
 * a distinct era per variant (14 eras > 10 variants, offset by family seed),
 * then modulating every other dimension on the variant index.
 *
 * briefFor(familyId, variantIndex, name) is pure — the same inputs always
 * produce the same brief, so the marketplace tile, the generated project
 * and the manifest all agree.
 */

export type DesignEra =
  | "editorial"
  | "swiss"
  | "neo-brutalist"
  | "minimal-luxury"
  | "glass-spatial"
  | "digital-futurism"
  | "organic"
  | "editorial-commerce"
  | "industrial"
  | "cinematic"
  | "playful"
  | "data-dense"
  | "architectural"
  | "experimental";

export const DESIGN_ERAS: DesignEra[] = [
  "editorial",
  "swiss",
  "neo-brutalist",
  "minimal-luxury",
  "glass-spatial",
  "digital-futurism",
  "organic",
  "editorial-commerce",
  "industrial",
  "cinematic",
  "playful",
  "data-dense",
  "architectural",
  "experimental",
];

export type LayoutArch = "grid" | "editorial" | "asymmetric" | "split" | "fullscreen" | "spatial";
export type NavStyle = "top" | "floating" | "sidebar" | "minimal" | "command";
export type HeroStyle = "typography" | "product" | "interactive" | "split" | "asymmetric";
export type CardSystem = "minimal" | "floating" | "borderless" | "layered" | "none";
export type ImageDir = "editorial" | "product" | "architecture" | "illustration";
export type MotionProfile = "subtle" | "fluid" | "cinematic" | "interactive";
export type InteractionModel = "hover" | "scroll" | "drag" | "cursor" | "3d";
export type ThemeMode = "light" | "dark" | "hybrid";

export interface VariantBrief {
  familyId: string;
  variantIndex: number;
  key: string;
  era: DesignEra;
  eraLabel: string;
  eraHint: string;
  concept: string;
  layout: LayoutArch;
  nav: NavStyle;
  hero: HeroStyle;
  cards: CardSystem;
  imagery: ImageDir;
  motion: MotionProfile;
  interaction: InteractionModel;
  theme: ThemeMode;
  targetUser: string;
  brandPersonality: string;
  primaryAction: string;
  typography: { display: string; body: string; mono?: string; label: string };
  accent: string;
  palette: { canvas: string; surface: string; ink: string; body: string; mute: string; hairline: string; dark: boolean };
  radius: string;
  shadow: string;
  gradient: string;
  sections: string[];
  motionNotes: string[];
  uniqueness: string[];
}

/* ─── Deterministic hash ──────────────────────────────────────────────────── */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = <T,>(arr: readonly T[], n: number): T => arr[Math.abs(n) % arr.length]!;

/* ─── Era definitions ─────────────────────────────────────────────────────── */

interface EraDef {
  label: string;
  hint: string;
  dark: boolean;
  display: "serif" | "sans" | "mono";
  body: "sans" | "serif";
  radius: string;
  shadow: string;
  canvas: string;
  surface: string;
  ink: string;
  bodyC: string;
  mute: string;
  hairline: string;
  gradient: "duo" | "soft" | "glow";
}

const ERA_DEFS: Record<DesignEra, EraDef> = {
  editorial: {
    label: "Editorial",
    hint: "Large typography, asymmetric magazine grid, serif display, quiet backgrounds.",
    dark: false, display: "serif", body: "sans", radius: "4px",
    shadow: "0 1px 2px rgba(0,0,0,.05), 0 24px 48px -32px rgba(0,0,0,.3)",
    canvas: "#faf8f4", surface: "#ffffff", ink: "#171310", bodyC: "#514a42", mute: "#9b9286", hairline: "#e8e3d9", gradient: "soft",
  },
  swiss: {
    label: "Swiss / International",
    hint: "Strict grid, typography-led hierarchy, mono labels, zero decoration.",
    dark: false, display: "mono", body: "sans", radius: "2px",
    shadow: "0 0 0 1px rgba(0,0,0,.06)",
    canvas: "#f5f5f2", surface: "#ffffff", ink: "#111111", bodyC: "#3f3f3f", mute: "#8f8f8f", hairline: "#d9d9d5", gradient: "duo",
  },
  "neo-brutalist": {
    label: "Neo-Brutalist",
    hint: "Heavy borders, hard offset shadows, raw type, bold blocks, unconventional layout.",
    dark: false, display: "sans", body: "sans", radius: "0px",
    shadow: "6px 6px 0 rgba(0,0,0,1)",
    canvas: "#fffdf5", surface: "#ffffff", ink: "#0f0f0f", bodyC: "#3c3c3c", mute: "#777777", hairline: "#0f0f0f", gradient: "duo",
  },
  "minimal-luxury": {
    label: "Minimal Luxury",
    hint: "Whitespace, elegant serif, restrained palette, subtle fade motion.",
    dark: false, display: "serif", body: "sans", radius: "16px",
    shadow: "0 4px 12px rgba(0,0,0,.06), 0 32px 64px -40px rgba(0,0,0,.35)",
    canvas: "#fbfaf7", surface: "#ffffff", ink: "#1b1a17", bodyC: "#5c574e", mute: "#a49d90", hairline: "#e9e4da", gradient: "soft",
  },
  "glass-spatial": {
    label: "Glass / Spatial",
    hint: "Translucent surfaces, ambient light, depth stacking, blur layers.",
    dark: true, display: "sans", body: "sans", radius: "18px",
    shadow: "0 24px 70px -24px rgba(0,0,0,.6)",
    canvas: "#0c1017", surface: "rgba(255,255,255,.07)", ink: "#eef1f6", bodyC: "#a7b0bd", mute: "#5f6a78", hairline: "rgba(255,255,255,.14)", gradient: "glow",
  },
  "digital-futurism": {
    label: "Digital Futurism",
    hint: "Dark canvas, luminous accents, data ribbons, glowing gradients.",
    dark: true, display: "sans", body: "sans", radius: "12px",
    shadow: "0 0 40px -8px rgba(0,0,0,.5)",
    canvas: "#07090f", surface: "#0e121b", ink: "#e8ecf4", bodyC: "#9aa3b4", mute: "#566072", hairline: "#1d2431", gradient: "glow",
  },
  organic: {
    label: "Organic",
    hint: "Soft shapes, natural colors, fluid blobs, rounded everything.",
    dark: false, display: "sans", body: "sans", radius: "28px",
    shadow: "0 8px 30px -12px rgba(0,0,0,.18)",
    canvas: "#f7f6f1", surface: "#ffffff", ink: "#1d2a24", bodyC: "#4d5c54", mute: "#8d9a92", hairline: "#e2e6de", gradient: "soft",
  },
  "editorial-commerce": {
    label: "Editorial Commerce",
    hint: "Magazine + product catalog, serif headlines, product-led imagery, asymmetric grid.",
    dark: false, display: "serif", body: "sans", radius: "6px",
    shadow: "0 2px 6px rgba(0,0,0,.05), 0 30px 60px -36px rgba(0,0,0,.35)",
    canvas: "#fafaf7", surface: "#ffffff", ink: "#191712", bodyC: "#55504a", mute: "#9c968b", hairline: "#e6e1d6", gradient: "soft",
  },
  industrial: {
    label: "Industrial",
    hint: "Technical typography, diagrams, dense information, grid lines, utility styling.",
    dark: false, display: "mono", body: "sans", radius: "4px",
    shadow: "0 0 0 1px rgba(0,0,0,.08)",
    canvas: "#f4f4ef", surface: "#fbfbf8", ink: "#141414", bodyC: "#454540", mute: "#8a8a83", hairline: "#cfcfc8", gradient: "duo",
  },
  cinematic: {
    label: "Cinematic",
    hint: "Large imagery, storytelling, dramatic reveal motion, dark letterbox bands.",
    dark: true, display: "sans", body: "sans", radius: "8px",
    shadow: "0 40px 90px -30px rgba(0,0,0,.8)",
    canvas: "#0a0a0c", surface: "#141418", ink: "#f2f0ed", bodyC: "#a8a49e", mute: "#615e59", hairline: "#232327", gradient: "duo",
  },
  playful: {
    label: "Playful",
    hint: "Illustration, oversized type, bright colors, bouncy interactions, rounded forms.",
    dark: false, display: "sans", body: "sans", radius: "24px",
    shadow: "0 10px 0 -4px rgba(0,0,0,.1)",
    canvas: "#fff8f0", surface: "#ffffff", ink: "#26130f", bodyC: "#5a463c", mute: "#96897f", hairline: "#f0e2d2", gradient: "soft",
  },
  "data-dense": {
    label: "Data Dense",
    hint: "Tables, charts, filters, command interfaces, numeric-first hierarchy.",
    dark: false, display: "mono", body: "sans", radius: "6px",
    shadow: "0 1px 3px rgba(0,0,0,.08)",
    canvas: "#f7f7f5", surface: "#ffffff", ink: "#101418", bodyC: "#414a53", mute: "#8a93a0", hairline: "#dfe3e8", gradient: "duo",
  },
  architectural: {
    label: "Architectural",
    hint: "Large grids, structural lines, spatial depth, plan-view graphics.",
    dark: false, display: "sans", body: "sans", radius: "0px",
    shadow: "0 2px 0 rgba(0,0,0,.15)",
    canvas: "#f6f4ef", surface: "#fdfcf9", ink: "#17150f", bodyC: "#4c483e", mute: "#91897a", hairline: "#d8d2c2", gradient: "duo",
  },
  experimental: {
    label: "Experimental",
    hint: "Unusual navigation, horizontal motion, oversized type, unconventional composition.",
    dark: false, display: "sans", body: "sans", radius: "2px",
    shadow: "0 30px 60px -30px rgba(0,0,0,.5)",
    canvas: "#f2f1ee", surface: "#ffffff", ink: "#0d0d0d", bodyC: "#3d3d3d", mute: "#868682", hairline: "#dcdcd8", gradient: "duo",
  },
};

/* ─── Diversity pools ─────────────────────────────────────────────────────── */

const LAYOUTS: LayoutArch[] = ["grid", "editorial", "asymmetric", "split", "fullscreen", "spatial"];
const NAVS: NavStyle[] = ["top", "floating", "sidebar", "minimal", "command"];
const HEROS: HeroStyle[] = ["typography", "product", "interactive", "split", "asymmetric"];
const CARDS: CardSystem[] = ["minimal", "floating", "borderless", "layered", "none"];
const IMAGERY: ImageDir[] = ["editorial", "product", "architecture", "illustration"];
const MOTIONS: MotionProfile[] = ["subtle", "fluid", "cinematic", "interactive"];
const INTERACTIONS: InteractionModel[] = ["hover", "scroll", "drag", "cursor", "3d"];

const FONTS = {
  serif: '"Playfair Display", "Instrument Serif", Georgia, serif',
  sans: '"Inter", "Geist", system-ui, sans-serif',
  "sans-alt": '"Space Grotesk", "Sora", system-ui, sans-serif',
  mono: '"JetBrains Mono", "IBM Plex Mono", Consolas, monospace',
};

const TYPO_LABELS: Record<string, string> = {
  serif: "Serif display · sans body",
  sans: "Sans display · sans body",
  "sans-alt": "Grotesk display · sans body",
  mono: "Mono display · sans body",
};

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return `#${rgb.map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/* ─── Per-family section vocabulary ───────────────────────────────────────── */

const SECTION_VOCAB: Record<string, string[]> = {
  websites: ["navbar", "hero", "series", "features", "testimonials", "pricing", "faq", "cta", "footer"],
  webapps: ["sidebar", "overview", "board", "table", "drawer", "settings"],
  ai: ["sidebar", "chat", "knowledge", "runs", "drafts", "model"],
  mobile: ["tab bar", "feed", "detail", "composer", "profile"],
  desktop: ["sidebar", "workspace", "panels", "status bar", "shortcuts"],
  developer: ["sidebar", "terminal", "explorer", "output", "docs"],
  games: ["HUD", "stage", "scoreboard", "rules", "leaderboard"],
  starter: ["workspace"],
};

/* ─── Brief construction ──────────────────────────────────────────────────── */

export function briefFor(familyId: string, variantIndex: number, name: string): VariantBrief {
  const seed = hashStr(familyId);
  // Distinct era per variant inside a category: 14 eras, 10 variants.
  const era = DESIGN_ERAS[(seed + variantIndex * 5) % DESIGN_ERAS.length]!;
  const def = ERA_DEFS[era];

  // Every other dimension modulates with the variant index too, so two
  // families never line up on the same composition.
  const layout = pick(LAYOUTS, seed + variantIndex * 7);
  const nav = pick(NAVS, seed * 3 + variantIndex);
  const hero = pick(HEROS, seed + variantIndex * 11);
  const cards = pick(CARDS, seed * 5 + variantIndex);
  const imagery = pick(IMAGERY, seed * 7 + variantIndex * 3);
  const motion = pick(MOTIONS, seed + variantIndex * 13);
  const interaction = pick(INTERACTIONS, seed * 11 + variantIndex * 3);
  const theme: ThemeMode = def.dark ? "dark" : variantIndex % 3 === 1 ? "dark" : "light";

  // Accent: hue from family+variant, saturation/value tuned per era mood with
  // per-variant jitter so siblings in the same hue bucket land on distinct hex.
  const hue = (seed + variantIndex * 47 + 17) % 360;
  const hueStep = (seed >> 2) % 6 - 3;
  const hueShifted = (hue + hueStep + 360) % 360;
  const satJitter = ((seed >> 3) + variantIndex * 31) % 7 - 3; // -3..3
  const valJitter = ((seed >> 1) + variantIndex * 23) % 9 - 4; // -4..4
  const jitterSat = (x: number) => Math.max(0.28, Math.min(0.95, x + satJitter * 0.015));
  const jitterVal = (x: number) => Math.max(0.22, Math.min(1, x + valJitter * 0.02));
  const accent =
    era === "editorial" || era === "minimal-luxury" || era === "editorial-commerce"
      ? hsvToHex(hueShifted, jitterSat(0.55), jitterVal(0.55))
      : era === "neo-brutalist" || era === "architectural" || era === "industrial"
        ? hsvToHex(hueShifted, jitterSat(0.75), jitterVal(0.35))
        : era === "glass-spatial" || era === "digital-futurism" || era === "cinematic"
          ? hsvToHex(hueShifted, jitterSat(0.72), jitterVal(0.9))
          : hsvToHex(hueShifted, jitterSat(0.68), jitterVal(0.85));

  const darkCanvas = def.canvas;
  const darkSurface = def.surface.startsWith("rgba") ? def.surface : def.surface;
  const darkInk = def.ink;
  const isDark = theme === "dark";

  const displayFont =
    def.display === "serif"
      ? FONTS.serif
      : def.display === "mono"
        ? FONTS.mono
        : variantIndex % 3 === 0
          ? FONTS["sans-alt"]
          : FONTS.sans;

  const unitIndex = seed % 10;

  return {
    familyId,
    variantIndex,
    key: `brief:${familyId}:${variantIndex}`,
    era,
    eraLabel: def.label,
    eraHint: def.hint,
    concept: `${name} in a ${def.label} visual language — ${def.hint.split(".")[0]!.toLowerCase()}.`,
    layout,
    nav,
    hero,
    cards,
    imagery,
    motion,
    interaction,
    theme,
    targetUser:
      pick(
        [
          "a first-time visitor deciding in seconds if the product is credible",
          "a repeat user who needs the information hierarchy to stay predictable",
          "a decision-maker evaluating the offering against rivals",
          "an expert user who wants density over decoration",
          "a broad audience that responds to editorial storytelling",
        ],
        seed + variantIndex,
      ),
    brandPersonality:
      pick(
        [
          "confident, understated, precise",
          "playful, warm, optimistic",
          "bold, direct, unapologetic",
          "calm, premium, deliberate",
          "technical, rigorous, capable",
        ],
        seed * 3 + variantIndex,
      ),
    primaryAction:
      pick(
        ["Conversions", "Reading dwell time", "Signups", "Inquire / contact", "Direct purchase"],
        seed + variantIndex * 9,
      ),
    typography: {
      display: displayFont,
      body: def.body === "serif" ? FONTS.serif : FONTS.sans,
      mono: def.display === "mono" || era === "data-dense" || era === "industrial" ? FONTS.mono : undefined,
      label: TYPO_LABELS[def.display] ?? "Sans display · sans body",
    },
    accent,
    palette: {
      canvas: isDark ? "#0b0d12" : darkCanvas,
      surface: isDark ? (darkSurface.startsWith("rgba") ? "#151a22" : "#151a22") : darkSurface,
      ink: isDark ? darkInk : darkInk,
      body: isDark ? def.bodyC : def.bodyC,
      mute: isDark ? def.mute : def.mute,
      hairline: isDark ? "#262b34" : def.hairline,
      dark: isDark,
    },
    radius: def.radius,
    shadow: def.shadow,
    gradient:
      def.gradient === "glow"
        ? `linear-gradient(120deg, ${accent}, color-mix(in srgb, ${accent} 30%, #ffffff))`
        : def.gradient === "soft"
          ? `linear-gradient(120deg, color-mix(in srgb, ${accent} 22%, transparent), color-mix(in srgb, ${accent} 6%, transparent))`
          : `linear-gradient(120deg, ${accent}, color-mix(in srgb, ${accent} 55%, #000000))`,
    sections: SECTION_VOCAB[unitIndex % 8 === 0 ? "websites" : familySection(familyId)] ?? SECTION_VOCAB.websites!,
    motionNotes: [
      `${motion} motion profile`,
      `${interaction}-driven micro-interactions`,
      "prefers-reduced-motion respected",
      era === "cinematic" || era === "experimental" ? "scroll-linked reveals" : "entrance + reveal on scroll",
    ],
    uniqueness: [
      `era: ${def.label}`,
      `layout: ${layout}`,
      `nav: ${nav}`,
      `hero: ${hero}`,
      `cards: ${cards}`,
      `typography: ${def.display}`,
      `theme: ${theme}`,
    ],
  };
}

function familySection(familyId: string): string {
  if (familyId.startsWith("mobile-")) return "mobile";
  if (familyId.startsWith("ai-") || familyId === "rag") return "ai";
  if (["game-2d", "game-3d", "game-multiplayer", "game-puzzle", "game-arcade"].includes(familyId)) return "games";
  if (["rest-api", "graphql-api", "cli", "sdk", "packages", "browser-extension"].includes(familyId)) return "developer";
  if (["dev-tools", "desktop-productivity", "media", "file-manager", "business-software"].includes(familyId)) return "desktop";
  if (["saas", "crm", "erp", "admin-panel", "analytics", "project-management", "ecommerce", "marketplace", "social-network", "learning-platform"].includes(familyId)) return "webapps";
  if (familyId === "custom") return "starter";
  return "websites";
}

export interface CategoryUniqueness {
  familyId: string;
  ok: boolean;
  variants: number;
  distinctKeys: number;
  collisions: string[];
}

/**
 * Verifies that every variant in a category differs from its siblings on a
 * substantial combination of dimensions. Returns collisions if two variants
 * share era + layout + hero + typography mood.
 */
export function verifyCategoryUniqueness(familyId: string, variantCount: number): CategoryUniqueness {
  const seen = new Map<string, string>();
  const collisions: string[] = [];
  for (let i = 0; i < variantCount; i++) {
    const b = briefFor(familyId, i, `v${i}`);
    const key = `${b.era}|${b.layout}|${b.hero}|${b.typography.label}|${b.theme}`;
    const prev = seen.get(key);
    if (prev !== undefined) collisions.push(`${prev} and ${b.key}`);
    else seen.set(key, b.key);
  }
  return {
    familyId,
    ok: collisions.length === 0,
    variants: variantCount,
    distinctKeys: seen.size,
    collisions,
  };
}

/** Per-variant accent used by the catalog (keeps it in sync with the brief). */
export function accentForVariant(familyId: string, variantIndex: number): string {
  return briefFor(familyId, variantIndex, " ").accent;
}