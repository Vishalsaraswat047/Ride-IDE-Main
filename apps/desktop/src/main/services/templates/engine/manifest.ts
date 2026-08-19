/**
 * RIDE Template Manifest.
 *
 * Every generated project carries a TEMPLATE_MANIFEST.json that pins the
 * template contract: category, style direction, stack, section architecture,
 * quality score and design system. The agent and marketplace read this file —
 * never "just another folder of files".
 */

import type { QaReport } from "./qa";
import type { DesignSystem } from "./designSystem";
import type { VariantBrief } from "./briefs";
import type { RecommendedLibrary } from "./registry";

export interface TemplateManifest {
  name: string;
  variant: string;
  category: string;
  type: "website" | "webapp" | "ai-app" | "mobile" | "game" | "developer" | "starter";
  style: string;
  framework: string;
  styling: string;
  ui: string;
  icons: string;
  animation: string;
  graphics: string;
  charts: string;
  libraries: RecommendedLibrary[];
  sections: string[];
  responsive: boolean;
  darkMode: boolean;
  accessibility: boolean;
  interactions: boolean;
  placeholderContent: false;
  designSystem: DesignSystem;
  brief: {
    era: VariantBrief["era"];
    eraLabel: string;
    layout: VariantBrief["layout"];
    nav: VariantBrief["nav"];
    hero: VariantBrief["hero"];
    cards: VariantBrief["cards"];
    imagery: VariantBrief["imagery"];
    motion: VariantBrief["motion"];
    interaction: VariantBrief["interaction"];
    theme: VariantBrief["theme"];
    typography: string;
    concept: string;
  };
  quality: { score: number; verdict: string; date: number };
  architecture?: {
    name: string;
    section: string;
    archetype: string;
    backendNeeded: boolean;
    apiRoutes: string[];
    requiredComponents: string[];
  };
}

const TYPE_BY_SECTION: Record<string, TemplateManifest["type"]> = {
  websites: "website",
  webapps: "webapp",
  ai: "ai-app",
  mobile: "mobile",
  games: "game",
  developer: "developer",
  starter: "starter",
};

export function buildManifest(input: {
  name: string;
  familyId: string;
  section: string;
  style: string;
  framework: string;
  styling: string;
  ui: string;
  icons: string;
  animation: string;
  graphics: string;
  charts: string;
  libraries: RecommendedLibrary[];
  sections: string[];
  designSystem: DesignSystem;
  brief: VariantBrief;
  quality: QaReport;
  architecture?: {
    name: string;
    section: string;
    archetype: string;
    backendNeeded: boolean;
    apiRoutes: string[];
    requiredComponents: string[];
  };
}): TemplateManifest {
  return {
    name: input.name,
    variant: input.name,
    category: input.familyId,
    type: TYPE_BY_SECTION[input.section] ?? "website",
    style: input.style,
    framework: input.framework,
    styling: input.styling,
    ui: input.ui,
    icons: input.icons,
    animation: input.animation,
    graphics: input.graphics,
    charts: input.charts,
    libraries: input.libraries,
    sections: input.sections,
    responsive: true,
    darkMode: input.designSystem.palette.dark,
    accessibility: true,
    interactions: true,
    placeholderContent: false,
    designSystem: input.designSystem,
    brief: {
      era: input.brief.era,
      eraLabel: input.brief.eraLabel,
      layout: input.brief.layout,
      nav: input.brief.nav,
      hero: input.brief.hero,
      cards: input.brief.cards,
      imagery: input.brief.imagery,
      motion: input.brief.motion,
      interaction: input.brief.interaction,
      theme: input.brief.theme,
      typography: input.brief.typography.label,
      concept: input.brief.concept,
    },
    quality: {
      score: input.quality.score,
      verdict: input.quality.verdict,
      date: Date.now(),
    },
    ...(input.architecture ? { architecture: input.architecture } : {}),
  };
}

/** Collects the actual <section> ids present in the generated app code. */
export function collectSections(files: Record<string, string>): string[] {
  const found: string[] = [];
  for (const text of Object.values(files)) {
    for (const m of text.matchAll(/<section\b[^>]*?(?:id=|aria-label=)["']([^"']+)["']/g)) {
      const id = m[1]!;
      if (!found.includes(id)) found.push(id);
    }
  }
  if (found.length === 0) {
    const text = Object.values(files).join("\n");
    const count = (text.match(/<section\b/g) ?? []).length;
    if (count > 0) found.push(...Array.from({ length: count }, (_, i) => `section-${i + 1}`));
  }
  return found.length > 0 ? found : ["app-shell"];
}