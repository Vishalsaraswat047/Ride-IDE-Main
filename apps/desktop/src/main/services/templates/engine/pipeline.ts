/**
 * RIDE Generation Pipeline.
 *
 *   scaffold → enrich (real content) → Visual QA → autofix → manifest → approve
 *
 * Runs one template at a time, never a batch. A template below the quality
 * floor loops through autofix once; if it still fails, the run reports the
 * rejection with concrete issues instead of shipping it.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { QaReport } from "./qa";
import { autofix, runVisualQA } from "./qa";
import { enrichContent, enrichContentWithArchitecture } from "./content";
import { designSystemFor } from "./designSystem";
import { briefFor, verifyCategoryUniqueness } from "./briefs";
import { understandPrompt, generateUserJourney, userContextFromPrompt } from "./product-understanding";
import { scaffoldTemplate, scaffoldMultiPageTemplate } from "../scaffold";
import { buildManifest, collectSections, type TemplateManifest } from "./manifest";
import { registryFor } from "./registry";
import { getBuiltinTemplate } from "../catalog";
import type { ProductArchetypeArchitecture } from "./product-architecture";

export interface PipelineProgress {
  phase: string;
  templateId: string;
  templateName: string;
  score?: number;
  verdict?: string;
  issues?: string[];
  architectureName?: string;
  userJourneys?: unknown[];
}

export type PhaseFn = (p: PipelineProgress) => void;

async function readAllText(dir: string): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const stack = [""];
  while (stack.length > 0) {
    const rel = stack.pop()!;
    const fs = await import("node:fs/promises");
    const { readdir } = fs;
    const entries = await readdir(join(dir, ...rel.split("/"))).catch(() => []);
    for (const e of entries) {
      const full = join(dir, ...rel.split("/"), e);
      const { stat } = await import("node:fs/promises");
      const st = await stat(full).catch(() => null);
      if (!st) continue;
      if (st.isDirectory()) stack.push(rel ? `${rel}/${e}` : e);
      else {
        const text = await readFile(full, "utf8").catch(() => null);
        if (text !== null) out[rel ? `${rel}/${e}` : e] = text;
      }
    }
  }
  return out;
}

export interface GenerationResult {
  dest: string;
  quality: QaReport;
  rejected: boolean;
  manifest: TemplateManifest;
}

export async function generateTemplate(
  templateId: string,
  dest: string,
  userPrompt?: string,
  onPhase?: PhaseFn,
): Promise<GenerationResult> {
  const tpl = getBuiltinTemplate(templateId);
  if (!tpl) throw new Error(`Unknown template: ${templateId}`);

  const { scaffoldTemplate } = await import("../scaffold");
  const emit = (phase: string, extra: Partial<PipelineProgress> = {}) =>
    onPhase?.({ phase, templateId, templateName: tpl.name, ...extra });

  let enriched: Record<string, string> = {};

  emit("design-system");

  // Step 1: Use product understanding engine to map prompt to complete architecture
  if (userPrompt) {
    const understanding = understandPrompt(userPrompt);
    const architecture = understanding.architecture;

    emit("architecture-mapped", { architectureName: architecture.name });

    // Step 2: Scaffold based on complete architecture (multi-page)
    await scaffoldMultiPageTemplate(dest, architecture, tpl);

    // Step 3: Enrich content with architecture-aware content ops
    emit("content");
    const raw = await readAllText(dest);
    enriched = enrichContentWithArchitecture(raw, architecture, tpl);
    for (const [path, text] of Object.entries(enriched)) {
      if (path === "RIDE_TEMPLATE.json") continue;
      await writeFile(join(dest, ...path.split("/")), text, "utf8");
    }

    // Step 4: Generate user journeys based on architecture
    emit("journeys", {
      userJourneys: generateUserJourney(architecture, userContextFromPrompt(userPrompt)),
    });
  } else {
    // Step 2: Scaffold based on existing template (single-page fallback)
    emit("scaffolding");
    await scaffoldTemplate(templateId, dest);

    // Step 3: Enrich content
    emit("content");
    const raw = await readAllText(dest);
    enriched = enrichContent(raw, tpl.familyId, tpl.archetype);
    for (const [path, text] of Object.entries(enriched)) {
      if (path === "RIDE_TEMPLATE.json") continue;
      await writeFile(join(dest, ...path.split("/")), text, "utf8");
    }
  }

  emit("quality");
  let report = runVisualQA(
    { familyId: tpl.familyId, archetype: tpl.archetype, section: tpl.section, name: tpl.name },
    enriched,
  );
  if (report.score < 75) {
    const fixed = autofix(enriched, report);
    for (const [path, text] of Object.entries(fixed)) {
      if (path === "RIDE_TEMPLATE.json") continue;
      await writeFile(join(dest, ...path.split("/")), text, "utf8");
    }
    report = runVisualQA(
      { familyId: tpl.familyId, archetype: tpl.archetype, section: tpl.section, name: tpl.name },
      fixed,
    );
  }

  // Step 5: Build manifest with full architecture data
  const registry = registryFor(tpl.section, tpl.archetype);
  const brief = briefFor(tpl.familyId, tpl.variantIndex, tpl.name);
  const designSystem = designSystemFor(
    tpl.familyId,
    tpl.accent,
    tpl.accent,
    "#ffffff",
    tpl.section,
    tpl.variantIndex,
  );
  const sections = collectSections(enriched);

  const uniqueness = verifyCategoryUniqueness(tpl.familyId, 10);
  if (!uniqueness.ok) {
    console.warn(`[pipeline] category uniqueness collision for ${tpl.familyId}:`, uniqueness.collisions);
  }

  const manifest = buildManifest({
    name: tpl.name,
    familyId: tpl.familyId,
    section: tpl.section,
    style: designSystem.label,
    framework: tpl.framework,
    styling: tpl.styling,
    ui: registry.ui,
    icons: registry.icons,
    animation: registry.animation,
    graphics: registry.graphics,
    charts: registry.charts,
    libraries: registry.libraries,
    sections,
    designSystem,
    brief,
    quality: report,
    // Add architecture metadata
    architecture: userPrompt
      ? {
          name: (understandPrompt(userPrompt).architecture as ProductArchetypeArchitecture).name,
          section: tpl.section,
          archetype: tpl.archetype,
          backendNeeded: (understandPrompt(userPrompt).architecture as ProductArchetypeArchitecture).backendNeeded,
          apiRoutes: (understandPrompt(userPrompt).architecture as ProductArchetypeArchitecture).apiRoutes,
          requiredComponents: (understandPrompt(userPrompt).architecture as ProductArchetypeArchitecture).requiredComponents,
        }
      : undefined,
  });

  await writeFile(join(dest, "TEMPLATE_MANIFEST.json"), JSON.stringify(manifest, null, 2), "utf8");
  await writeFile(join(dest, "QA_REPORT.json"), JSON.stringify(report, null, 2), "utf8");

  // Emit user journeys if available
  const journeys = userPrompt
    ? (() => {
        const u = understandPrompt(userPrompt);
        return generateUserJourney(u.architecture, userContextFromPrompt(userPrompt));
      })()
    : [];

  emit(journeys.length > 0 ? "journeys-generated" : "no-journeys", {
    userJourneys: journeys,
  });

  const rejected = report.score < 75;
  emit(rejected ? "failed" : "approved", { score: report.score, verdict: report.verdict, issues: rejected ? report.issues : undefined });

  return { dest, quality: report, rejected, manifest };
}

export async function runVisualQaOnExisting(files: Record<string, string>, familyId: string, archetype: string, section: string, name: string): Promise<QaReport> {
  return runVisualQA({ familyId, archetype, section, name }, files);
}