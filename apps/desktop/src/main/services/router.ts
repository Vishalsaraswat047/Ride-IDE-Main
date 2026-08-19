import {
  LOCAL_MODEL_CATALOG,
  type InstalledLocalModel,
  type LocalAiSettings,
  type LocalAiTier,
  type LocalModel,
  type PowerMode,
  type RoutingDecision,
  type SystemInfo,
  type TaskComplexity,
  type TaskRequirement,
  type TaskType,
} from "@ride/contracts";

const TIER_ORDER: readonly LocalAiTier[] = ["lite", "standard", "developer", "pro", "max"];

function tierIndex(t: LocalAiTier): number {
  return TIER_ORDER.indexOf(t);
}

function tierAt(i: number): LocalAiTier {
  return TIER_ORDER[Math.max(0, Math.min(TIER_ORDER.length - 1, i))] ?? "lite";
}

// ─── Task taxonomy → minimum tier ──────────────────────────────────────────

const TASK_ROUTING: Record<TaskType, { minTier: LocalAiTier; baseComplexity: TaskComplexity; note: string }> = {
  chat: { minTier: "lite", baseComplexity: "level1", note: "conversation" },
  codeCompletion: { minTier: "lite", baseComplexity: "level1", note: "completion" },
  explanation: { minTier: "lite", baseComplexity: "level1", note: "explanation" },
  documentation: { minTier: "lite", baseComplexity: "level1", note: "documentation" },
  bugFix: { minTier: "standard", baseComplexity: "level2", note: "bug fixing" },
  visualAnalysis: { minTier: "standard", baseComplexity: "level2", note: "visual analysis" },
  terminalOperation: { minTier: "standard", baseComplexity: "level2", note: "terminal" },
  uiGeneration: { minTier: "standard", baseComplexity: "level2", note: "UI generation" },
  refactoring: { minTier: "developer", baseComplexity: "level3", note: "refactoring" },
  websiteGeneration: { minTier: "developer", baseComplexity: "level3", note: "website generation" },
  applicationGeneration: { minTier: "developer", baseComplexity: "level3", note: "application generation" },
  projectPlanning: { minTier: "developer", baseComplexity: "level3", note: "planning" },
  architecture: { minTier: "pro", baseComplexity: "level4", note: "architecture" },
};

const TASK_KEYWORDS: Record<Exclude<TaskType, "chat">, string[]> = {
  codeCompletion: ["complete this", "complete the", "finish this", "finish the", "write the rest", "implement this function", "rest of the function", "fill in"],
  explanation: ["explain", "what does", "what is", "why does", "how does", "walk me through", "break down", "in plain terms", "help me understand", "what's the difference"],
  bugFix: ["fix", "bug", "error", "exception", "stack trace", "stacktrace", "crash", "failing", "broken", "not working", "failed", "incorrect output", "wrong result"],
  refactoring: ["refactor", "rename", "extract", "clean up", "cleanup", "restructure", "modularize", "simplify this", "split this", "decouple"],
  documentation: ["document", "jsdoc", "docstring", "readme", "comments", "comment this", "documentation"],
  uiGeneration: ["button", "modal", "form", "navbar", "dashboard", "component", "landing page", "ui", "interface", "layout", "toast", "sidebar"],
  websiteGeneration: ["website", "web page", "site", "homepage", "portfolio", "landing"],
  applicationGeneration: ["saas", "full-stack", "backend", "api server", "application", "platform", "auth system", "authentication system", "database schema", "end-to-end"],
  terminalOperation: ["run this", "command", "install", "terminal", "shell", "npm run", "git", "execute", "build command"],
  projectPlanning: ["plan", "roadmap", "milestone", "steps", "break it into", "project plan", "scope out", "todo"],
  architecture: ["architecture", "system design", "data model", "schema design", "tech stack", "microservice", "monolith", "design doc", "design the"],
  visualAnalysis: ["image", "screenshot", "picture", "look at this", "describe this image", "visual"],
};

const GREETINGS = new Set(["hi", "hello", "hey", "yo", "hola", "namaste", "howdy", "thanks", "thank you", "ty", "ok", "okay", "bye", "goodbye", "good morning", "good evening", "good night", "nice", "cool", "awesome", "great"]);
const GREETING_CASUAL = new Set(["there", "how", "are", "you", "doing", "today", "buddy", "friend", "guys", "everyone", "everybody", "and", "what's", "whats", "up", "my", "name", "is", "am", "glad", "to", "meet", "ya", "!?", ".?", "?", "!", ".", ","]);
const COMPLEXITY_BUMPS = ["multiple files", "several files", "everywhere", "whole project", "entire", "across the", "repo", "repository", "authentication", "database", "multi-file", "end-to-end", "production", "scalable", "architecture"];

/** True when the message is pure greeting small-talk — no content worth an LLM call. */
function isCasualGreeting(text: string): boolean {
  const tokens = text.toLowerCase().replace(/[?!.,]+/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  if (tokens.length === 1) return GREETINGS.has(tokens[0] ?? "");
  if (tokens.length > 8) return false;
  return tokens.every((t) => GREETINGS.has(t) || GREETING_CASUAL.has(t));
}

// ─── Deterministic task classifier (no LLM involved) ──────────────────────

export function classifyTask(text: string): TaskRequirement {
  const lower = text.toLowerCase().trim();

  if (!lower || GREETINGS.has(lower) || lower.length <= 6 || (lower.length <= 40 && isCasualGreeting(lower))) {
    return { taskType: "chat", complexity: "level0", minTier: "lite", needsCoding: false, needsReasoning: false, needsTools: false, confidence: 0.9 };
  }

  let bestType: TaskType = "chat";
  let bestScore = 0;
  for (const [type, words] of Object.entries(TASK_KEYWORDS) as Array<[Exclude<TaskType, "chat">, string[]]>) {
    let score = 0;
    for (const w of words) {
      if (lower.includes(w)) score += w.length > 7 ? 2 : 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  const base = TASK_ROUTING[bestType];
  let complexity = base.baseComplexity;
  if (bestScore >= 4) complexity = bumpComplexity(complexity);

  const hasCode = /```|\bfunction\b|\bclass\b|\bimport\b|\bconst\b|\bdef\b|\breturn\b/.test(lower);
  const long = lower.length > 600;
  const multiStep = /\b1[.)]\s|\b2[.)]\s|\bstep\b|\bfirst\b|\bthen\b/.test(lower);
  if (hasCode || long || multiStep) complexity = bumpComplexity(complexity);
  for (const w of COMPLEXITY_BUMPS) {
    if (lower.includes(w)) {
      complexity = bumpComplexity(complexity);
      break;
    }
  }

  let minTier = base.minTier;
  if (bestType === "bugFix" && /stack|crash|memory|segfault|deadlock|concurrency/.test(lower)) minTier = tierAt(Math.max(tierIndex(minTier), tierIndex("developer")));
  if (bestType === "explanation" && long) minTier = tierAt(Math.max(tierIndex(minTier), tierIndex("standard")));

  const req: TaskRequirement = {
    taskType: bestType,
    complexity,
    minTier,
    needsCoding: ["codeCompletion", "bugFix", "refactoring", "uiGeneration", "websiteGeneration", "applicationGeneration", "architecture"].includes(bestType),
    needsReasoning: ["refactoring", "applicationGeneration", "architecture", "projectPlanning"].includes(bestType),
    needsTools: bestType === "terminalOperation",
    confidence: 0.5 + Math.min(0.45, bestScore / 8),
  };
  return req;
}

function bumpComplexity(c: TaskComplexity): TaskComplexity {
  const levels: TaskComplexity[] = ["level0", "level1", "level2", "level3", "level4"];
  const i = levels.indexOf(c);
  return levels[Math.min(levels.length - 1, i + 1)] ?? "level4";
}

// ─── Model selection ───────────────────────────────────────────────────────

export interface RouteContext {
  system: SystemInfo;
  installed: InstalledLocalModel[];
  settings: LocalAiSettings;
  /** Renderer override (e.g. "retry with a larger model"). */
  forceModel?: string;
  previousTier?: LocalAiTier;
}

export interface RouteResult {
  decision: RoutingDecision;
  model: LocalModel | null;
  /** Instant reply for L0 — no LLM invocation. */
  level0Reply?: string;
}

export function routeRequest(req: { requestId: string; messages: Array<{ role: string; content: string }> }, ctx: RouteContext): RouteResult {
  const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
  const text = lastUser?.content ?? "";
  const reqClass = classifyTask(text);
  const mode = effectiveMode(ctx);

  if (reqClass.complexity === "level0") {
    const reply = level0Reply(text);
    return {
      model: null,
      level0Reply: reply,
      decision: {
        requestId: req.requestId,
        taskType: "chat",
        complexity: "level0",
        mode,
        selectedTier: "lite",
        selectedModel: "",
        reason: "Level 0 — instant response, no model invoked.",
        escalated: false,
        escalationAvailable: false,
      },
    };
  }

  if (reqClass.taskType === "visualAnalysis") {
    return {
      model: null,
      decision: {
        requestId: req.requestId,
        taskType: "visualAnalysis",
        complexity: reqClass.complexity,
        mode,
        selectedTier: "standard",
        selectedModel: "",
        reason: "Local models cannot process images yet — visual analysis is unsupported in the local runtime.",
        escalated: false,
        escalationAvailable: false,
      },
      level0Reply: "Local models on RIDE can't see images yet. Describe the screenshot or paste the error text and I'll work with that.",
    };
  }

  let targetTier = reqClass.minTier;

  // Power-mode adjustments (escalate cap for battery, bump for performance).
  let modeNote = "";
  if (mode === "battery") {
    if (tierIndex(targetTier) > tierIndex("standard")) {
      targetTier = "standard";
      modeNote = "battery saver capped tier — switch to Balanced/Performance for higher quality.";
    }
  } else if (mode === "performance") {
    targetTier = tierAt(tierIndex(targetTier) + 1);
    modeNote = "performance mode — one tier above minimum.";
  } else if (mode === "max") {
    targetTier = "max";
    modeNote = "MAX QUALITY — using the largest installed model.";
  }

  // Performance Governor profile: eco caps the tier, performance bumps it.
  const profile = ctx.settings.powerProfile;
  if (profile === "eco") {
    if (tierIndex(targetTier) > tierIndex("standard")) {
      targetTier = "standard";
      modeNote = "eco profile — capped at Standard to protect battery and heat.";
    }
  } else if (profile === "performance") {
    targetTier = tierAt(tierIndex(targetTier) + 1);
    modeNote = "performance profile — one tier above minimum.";
  }

  // Installed models, mapped to catalog tiers (unknown tags count as installed at any tier).
  const installedByTier = new Map<LocalAiTier, string>();
  for (const m of ctx.installed) {
    const catalog = LOCAL_MODEL_CATALOG.find((c) => c.ollamaTag === m.name);
    const tier = catalog?.tier ?? "max";
    if (!installedByTier.has(tier)) installedByTier.set(tier, m.name);
  }
  const installedTiers = [...installedByTier.keys()].sort((a, b) => tierIndex(a) - tierIndex(b));

  let chosenTier: LocalAiTier | null = null;
  let chosenModel: LocalModel | null = null;
  let escalated = false;
  let previousTier = ctx.previousTier;
  let escalationAvailable = false;
  let reason: string;

  if (ctx.forceModel) {
    chosenModel = LOCAL_MODEL_CATALOG.find((c) => c.ollamaTag === ctx.forceModel) ?? null;
    chosenTier = chosenModel?.tier ?? "max";
    escalated = Boolean(previousTier && chosenTier && tierIndex(chosenTier) > tierIndex(previousTier));
    reason = "Manual escalation — retrying with a larger model.";
  } else {
    // Pick smallest installed tier >= target that fits RAM.
    let candidate: LocalAiTier | null = null;
    let candidateFits = false;
    for (const t of installedTiers) {
      if (tierIndex(t) < tierIndex(targetTier)) continue;
      const catalog = LOCAL_MODEL_CATALOG.find((c) => c.tier === t);
      if (catalog && ctx.system.memoryGB.free >= catalog.ramNeedGB) {
        candidate = t;
        candidateFits = true;
        break;
      }
    }
    if (!candidate) {
      // Nothing installed at/above target: fall back to largest installed.
      if (installedTiers.length) {
        const top = installedTiers[installedTiers.length - 1] ?? null;
        if (top) {
          const topCatalog = LOCAL_MODEL_CATALOG.find((c) => c.tier === top);
          if (topCatalog && ctx.system.memoryGB.free >= topCatalog.ramNeedGB) {
            candidate = top;
            candidateFits = true;
          } else {
            candidate = top;
          }
        }
      }
      escalationAvailable = installedTiers.some((t) => tierIndex(t) > tierIndex(candidate ?? targetTier));
    } else if (!candidateFits) {
      escalationAvailable = installedTiers.some((t) => tierIndex(t) > tierIndex(candidate ?? targetTier));
    }

    if (candidate) {
      chosenTier = candidate;
      chosenModel = LOCAL_MODEL_CATALOG.find((c) => c.tier === candidate) ?? null;
      reason = buildReason(reqClass, chosenTier, targetTier, modeNote, ctx, chosenModel);
      if (chosenModel && !candidateFits && ctx.system.memoryGB.free < chosenModel.ramNeedGB) {
        reason += ` (low RAM: ${ctx.system.memoryGB.free} GB free vs ~${chosenModel.ramNeedGB} GB needed)`;
      }
    } else {
      reason = "No local models installed — download one from the Models tab.";
      escalationAvailable = true;
    }
  }

  if (previousTier && chosenTier && tierIndex(chosenTier) > tierIndex(previousTier)) escalated = true;
  if (chosenTier && chosenTier !== targetTier && !ctx.forceModel && tierIndex(chosenTier) < tierIndex(targetTier)) {
    escalationAvailable = installedTiers.some((t) => tierIndex(t) > tierIndex(chosenTier));
  }

  const decision: RoutingDecision = {
    requestId: req.requestId,
    taskType: reqClass.taskType,
    complexity: reqClass.complexity,
    mode,
    selectedTier: chosenTier ?? "lite",
    selectedModel: chosenModel?.ollamaTag ?? installedByTier.get(chosenTier ?? "lite") ?? "",
    reason,
    escalated,
    previousTier,
    escalationAvailable,
  };

  return { decision, model: chosenModel };
}

function effectiveMode(ctx: RouteContext): PowerMode {
  const s = ctx.settings.mode;
  if (s !== "auto") return s;
  const b = ctx.system.battery;
  if (b?.hasBattery && b.onBattery && b.percent < 60) return "battery";
  return "balanced";
}

function buildReason(req: TaskRequirement, chosen: LocalAiTier, target: LocalAiTier, modeNote: string, ctx: RouteContext, model: LocalModel | null): string {
  const taskLabel = TASK_ROUTING[req.taskType].note;
  const parts: string[] = [];
  if (tierIndex(chosen) >= tierIndex(target)) {
    parts.push(`${model ? `${model.name} (${chosen})` : chosen} is sufficient for ${taskLabel}.`);
  } else {
    parts.push(`Target tier ${target} not installed — using ${chosen} instead.`);
  }
  if (modeNote) parts.push(modeNote);
  if (model) parts.push(`${model.paramsB}B ${model.architecture} · ${model.quant} · ~${model.ramNeedGB}GB RAM needed.`);
  return parts.join(" ");
}

const LEVEL0_REPLIES: Record<string, string> = {
  "hi": "Hey! I'm RIDE's local assistant — everything runs on your machine. Ask me to explain code, fix a bug, or build something.",
  "hello": "Hello! How can I help you today? Everything here runs locally.",
  "hey": "Hey! Ask me anything about your code.",
  "yo": "Yo! What can I help you with?",
  "hola": "¡Hola! Ask me to explain or fix your code.",
  "namaste": "Namaste! I can help with your code — all local.",
  "howdy": "Howdy! What are we building today?",
  "thanks": "You're welcome! Happy to help.",
  "thank you": "You're welcome! Anything else?",
  "ty": "No problem!",
  "ok": "Got it. Let me know what you need.",
  "okay": "Sounds good! What's next?",
  "bye": "See you! I'll be here when you need me.",
  "goodbye": "Goodbye! Happy coding.",
  "good morning": "Good morning! Ready to help with your code.",
  "good evening": "Good evening! What are we working on?",
  "good night": "Good night! Rest well.",
  "nice": "Thanks! Glad you like it.",
  "cool": "Thanks! What's next?",
  "awesome": "Thanks! What shall we do next?",
  "great": "Great! Let me know what you need.",
};

function level0Reply(text: string): string {
  const key = text.trim().toLowerCase();
  return LEVEL0_REPLIES[key] ?? "That's handled directly by RIDE itself — ask me for code, explanations, fixes or builds instead.";
}