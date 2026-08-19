import { detectCapabilities, getCapability } from "./capabilities.js";
import { OFFICIAL_PLUGINS, allManifests, getProvider, pluginsForCapability } from "./catalog.js";
import type { CapabilityAnalysis, PluginRecommendation } from "./schema.js";

/**
 * ─── AI plugin recommender (section 23 of the brief) ────────────────────────
 *
 * Deterministic, runs before any LLM call:
 *
 *   prompt → detected capabilities → required modules → recommended plugins
 *
 * Region bias: prompts that look INR-oriented (₹, rupees, upi, paytm…)
 * surface Razorpay/Cashfree before Stripe as the primary suggestion.
 */

const INR_HINTS = ["₹", "rupee", "rupees", "inr", "upi", "paytm", "phonepe", "gst"];

export function isInrPrompt(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return INR_HINTS.some((h) => lower.includes(h));
}

/** Deterministic module labels (planner-friendly) derived from capabilities. */
export function modulesForCapabilities(capabilityIds: string[]): string[] {
  const category = new Set(capabilityIds.map((id) => id.split(".")[0] ?? id));
  const names: Record<string, string> = {
    payments: "payments",
    authentication: "auth",
    database: "database",
    email: "email",
    storage: "storage",
    ai: "ai",
    communication: "notifications",
    analytics: "analytics",
    maps: "maps",
    search: "search",
    documents: "documents",
    infrastructure: "deploy",
    git: "git",
    crm: "crm",
    ecommerce: "store",
    automation: "automation",
    security: "security",
  };
  return [...category].map((c) => names[c] ?? c).sort();
}

export function recommendForPrompt(prompt: string): {
  capabilities: string[];
  modules: string[];
  recommendations: PluginRecommendation[];
} {
  const hits = detectCapabilities(prompt);
  const capabilityIds = hits.map((h) => h.capability.id);
  const inr = isInrPrompt(prompt);

  const recommendations: PluginRecommendation[] = [];
  const seen = new Set<string>();

  for (const { capability, score } of hits) {
    const candidates = pluginsForCapability(capability.id);
    if (!candidates.length) continue;

    let primary = candidates[0]!;
    if (inr && capability.category === "payments") {
      primary = candidates.find((p) => p.providers.includes("razorpay")) ?? primary;
    }

    if (seen.has(primary.id)) {
      // Already recommended — extend reason only when it's the same plugin.
      continue;
    }
    seen.add(primary.id);
    recommendations.push({
      manifestId: primary.id,
      displayName: primary.displayName,
      category: primary.category,
      reason: capability.label + (score > 1 ? " (strong signal)" : ""),
      required: true,
      alternatives: candidates.filter((c) => c.id !== primary.id).map((c) => c.id).slice(0, 3),
      providers: primary.providers,
    });
  }

  // Dependencies: if a recommended plugin `requires` another plugin that is
  // not yet covered, pull it in (e.g. ecommerce-shopify → payments-stripe).
  for (const rec of [...recommendations]) {
    const manifest = OFFICIAL_PLUGINS.find((m) => m.id === rec.manifestId);
    for (const dep of manifest?.requires ?? []) {
      if (seen.has(dep)) continue;
      seen.add(dep);
      const depManifest = allManifests().find((m) => m.id === dep);
      if (!depManifest) continue;
      recommendations.push({
        manifestId: dep,
        displayName: depManifest.displayName,
        category: depManifest.category,
        reason: `Required by ${rec.displayName}`,
        required: true,
        alternatives: [],
        providers: depManifest.providers,
      });
    }
  }

  return { capabilities: capabilityIds, modules: modulesForCapabilities(capabilityIds), recommendations };
}

/** Full analysis + the instruction block to inject into the agent frame. */
export function analyzePrompt(prompt: string): CapabilityAnalysis {
  const { capabilities: capabilityIds, modules, recommendations } = recommendForPrompt(prompt);
  const instructionBlock = buildInstructionBlock(recommendations);
  return {
    capabilities: capabilityIds.map((id) => getCapability(id)).filter((c): c is NonNullable<typeof c> => Boolean(c)),
    modules,
    recommendations,
    instructionBlock,
  };
}

/**
 * Build the AI instruction text for a set of recommendations — this is the
 * "RIDE knows the building blocks" payload: the model reads the verified
 * implementation rules instead of inventing integrations from scratch.
 */
export function buildInstructionBlock(recommendations: PluginRecommendation[]): string {
  if (!recommendations.length) return "";
  const parts: string[] = [];
  for (const rec of recommendations) {
    const manifest = OFFICIAL_PLUGINS.find((m) => m.id === rec.manifestId);
    if (!manifest) continue;
    const lines = [`## Plugin: ${manifest.displayName} (${manifest.id})`];
    if (manifest.aiInstructions) lines.push(manifest.aiInstructions);
    if (manifest.rules.length) {
      lines.push("Rules:");
      for (const r of manifest.rules) {
        lines.push(`- ${r.severity === "must-not" ? "NEVER" : r.severity === "must" ? "ALWAYS" : "SHOULD"} ${r.rule}`);
      }
    }
    parts.push(lines.join("\n"));
  }
  return `<ride-plugins>\n${parts.join("\n\n")}\n</ride-plugins>`;
}

/** Providers (with env conventions) for a manifest — for scaffold + .env. */
export function providerEnvFor(manifestId: string): Array<{ providerId: string; envVars: string[]; auth: string[] }> {
  const manifest = OFFICIAL_PLUGINS.find((m) => m.id === manifestId);
  if (!manifest) return [];
  return manifest.providers.map((pid) => {
    const full = getProvider(pid);
    return {
      providerId: pid,
      envVars: full?.envVars ?? [],
      auth: full?.auth ?? [],
    };
  });
}