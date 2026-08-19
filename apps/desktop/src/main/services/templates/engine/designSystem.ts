/**
 * RIDE Design System Generator.
 *
 * Every template family gets a declared design direction — palette, typography,
 * spacing, radius, shadows, gradients, motion rules and section architecture.
 * The manifest embeds these tokens so the agent and future editors can keep them
 * coherent, and the Diversity Engine guarantees distinct directions per family.
 *
 * Since the Design Brief Engine was introduced, the design system is derived
 * from the per-template brief (era, palette, typography pairing, radius…), so
 * every one of the 520 templates carries its own token set.
 */

import { briefFor } from "./briefs";
import type { DesignEra } from "./briefs";

export const DESIGN_DIRECTIONS = [
  "minimal",
  "editorial",
  "futuristic",
  "glass",
  "luxury",
  "brutal",
  "bento",
  "terminal",
  "paper",
  "neon",
  "swiss",
  "cinematic",
  "galaxy",
] as const;

export type DesignDirection = (typeof DESIGN_DIRECTIONS)[number];

export interface DesignSystem {
  direction: string;
  label: string;
  /** UI component kit every generated surface ships with (Galaxy / uiverse.io). */
  kit: string;
  palette: {
    canvas: string;
    surface: string;
    ink: string;
    body: string;
    mute: string;
    hairline: string;
    accent: string;
    dark: boolean;
  };
  typography: {
    display: string;
    body: string;
    mono?: string;
    scale: [string, string, string, string];
  };
  radius: string;
  shadow: string;
  gradient: string;
  motion: string[];
  sections: string[];
}

const FONTS = {
  display: '"Inter", system-ui, sans-serif',
  serifDisplay: '"Georgia", "Times New Roman", serif',
  mono: '"SFMono-Regular", "Cascadia Code", "JetBrains Mono", Consolas, monospace',
};

const ERA_DIRECTION: Record<DesignEra, string> = {
  editorial: "editorial",
  swiss: "swiss",
  "neo-brutalist": "brutal",
  "minimal-luxury": "luxury",
  "glass-spatial": "glass",
  "digital-futurism": "futuristic",
  organic: "paper",
  "editorial-commerce": "editorial",
  industrial: "terminal",
  cinematic: "cinematic",
  playful: "paper",
  "data-dense": "terminal",
  architectural: "brutal",
  experimental: "futuristic",
};

export function designSystemFor(familyId: string, accent: string, primary: string, onPrimary: string, section: string, variantIndex: number): DesignSystem {
  const brief = briefFor(familyId, variantIndex, "Variant");
  const direction: string =
    ERA_DIRECTION[brief.era] ?? (variantIndex % DESIGN_DIRECTIONS.length < DESIGN_DIRECTIONS.length ? DESIGN_DIRECTIONS[variantIndex % DESIGN_DIRECTIONS.length]! : "minimal");
  const label = `${brief.eraLabel} · ${brief.layout}`;
  const dark = brief.palette.dark;
  const sections = SECTION_ARCHETYPES[section] ?? SECTION_ARCHETYPES.websites!;

  return {
    direction,
    label,
    kit: "Galaxy (uiverse.io) + Vercel DESIGN.md tokens",
    palette: {
      canvas: brief.palette.canvas,
      surface: brief.palette.surface,
      ink: brief.palette.ink,
      body: brief.palette.body,
      mute: brief.palette.mute,
      hairline: brief.palette.hairline,
      accent,
      dark,
    },
    typography: {
      display: brief.typography.display,
      body: brief.typography.body,
      mono: brief.typography.mono,
      scale: dark ? ["clamp(2.2rem, 5vw, 3.4rem)", "1.5rem", "1.125rem", "0.75rem"] : ["clamp(2rem, 4vw, 3rem)", "1.375rem", "1.0625rem", "0.75rem"],
    },
    radius: brief.radius,
    shadow: brief.shadow,
    gradient: brief.gradient,
    motion: brief.motionNotes,
    sections,
  };
}

const SECTION_ARCHETYPES: Record<string, string[]> = {
  websites: ["navbar", "hero", "trusted by", "featured work", "features", "testimonials", "pricing", "faq", "cta", "footer"],
  webapps: ["sidebar", "overview", "table", "drawer", "settings"],
  ai: ["sidebar", "chat", "knowledge", "runs", "drafts"],
  mobile: ["tab bar", "feed", "detail", "composer"],
  developer: ["sidebar", "terminal", "explorer", "output"],
  games: ["HUD", "stage", "scoreboard", "rules"],
};