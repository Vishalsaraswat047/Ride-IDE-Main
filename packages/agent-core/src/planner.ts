import type { AgentPlan } from "@ride/contracts";

/**
 * Deterministic plan sketch — the cheap "what am I about to do" layer that runs
 * before any LLM call. Uses keyword classification only, so it is zero-cost and
 * portable to any project the agent is pointed at.
 */

export interface PlanContext {
  /** Skill catalog (name + description) used to pre-select relevant skills. */
  skills?: Array<{ name: string; description: string }>;
  /** Capability vocabulary available to the runtime (e.g. design stack names). */
  capabilities?: string[];
}

const TASK_KEYWORDS: Record<string, string[]> = {
  codeCompletion: ["complete this", "complete the", "finish this", "finish the", "write the rest", "implement this function", "fill in"],
  explanation: ["explain", "what does", "what is", "why does", "how does", "walk me through", "help me understand", "in plain terms"],
  bugFix: ["fix", "bug", "error", "exception", "stack trace", "crash", "failing", "broken", "not working", "wrong result", "error message"],
  refactoring: ["refactor", "rename", "extract", "clean up", "restructure", "modularize", "simplify this", "split this", "decouple"],
  documentation: ["document", "jsdoc", "docstring", "readme", "comments", "comment this"],
  uiGeneration: ["button", "modal", "form", "navbar", "dashboard", "component", "landing page", "layout", "toast", "sidebar", "ui", "chat interface"],
  websiteGeneration: ["website", "web page", "homepage", "portfolio", "landing page", "site", "web app"],
  applicationGeneration: ["saas", "full-stack", "backend", "api server", "application", "platform", "auth", "database schema", "end-to-end", "starter"],
  terminalOperation: ["run this", "command", "install", "npm run", "shell", "git", "execute", "build command", "scaffold"],
  projectPlanning: ["plan", "roadmap", "milestone", "steps", "break it into", "project plan", "scope out"],
  architecture: ["architecture", "system design", "data model", "tech stack", "monolith", "microservice", "design doc", "design the"],
};

const STACK_KEYWORDS: Record<string, string[]> = {
  react: ["react", "jsx", "hooks", "components", "next.js", "nextjs"],
  next: ["next.js", "nextjs", "next app", "app router"],
  vue: ["vue", "nuxt", "v-bind", "v-model"],
  svelte: ["svelte", "sveltekit"],
  astro: ["astro", "island architecture"],
  tailwind: ["tailwind", "utility classes", "tw-"],
  shadcn: ["shadcn", "shadcn/ui"],
  typescript: ["typescript", "tsx", ".ts", "typed"],
  javascript: ["javascript", "node.js", "nodejs", "npm", "pnpm"],
  python: ["python", "pip", "venv", "django", "fastapi", "flask"],
  rust: ["rust", "cargo", "crate"],
  go: ["go", "golang"],
  sqlite: ["sqlite", "database", "schema", "tables"],
  postgres: ["postgres", "postgresql", "sql"],
  redis: ["redis", "cache"],
  vite: ["vite", "vitest"],
  motion: ["animation", "motion", "framer", "transition", "animate"],
  tailwindAnimate: ["animate-in", "tw-animate"],
  lucide: ["lucide", "icons", "icon set"],
};

const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  "design": ["design", "ui", "landing", "dashboard", "interface", "layout", "branding", "color", "typography"],
  "accessibility": ["accessible", "a11y", "screen reader", "contrast", "keyboard navigation"],
  "responsive": ["responsive", "mobile", "breakpoint", "fluid"],
  "motion": ["animation", "motion", "transition", "fade", "spring"],
  "3d": ["three.js", "threejs", "3d", "webgl", "r3f", "react-three"],
  "icons": ["icon", "iconset", "svg icon"],
  "data": ["database", "schema", "query", "orm", "sql"],
  "auth": ["auth", "authentication", "login", "oauth", "jwt", "session"],
  "api": ["api", "rest", "endpoint", "graphql", "server", "backend"],
  "testing": ["test", "vitest", "jest", "pytest", "unit test"],
  "deployment": ["deploy", "vercel", "netlify", "docker", "ci/cd"],
  "docs": ["readme", "documentation", "docs", "guide"],
  "ecommerce": ["cart", "checkout", "stripe", "payment", "store", "shop"],
  "content": ["blog", "cms", "markdown", "posts", "content"],
};

const COMPLEXITY_BUMPS = ["multiple files", "several files", "whole project", "entire", "across the", "repo", "authentication", "database", "end-to-end", "production", "scalable", "architecture"];

const TASK_STEPS: Record<string, string[]> = {
  bugFix: ["Reproduce and isolate the failing path", "Trace the root cause in the relevant module", "Apply the minimal fix", "Run the related tests / build to verify"],
  codeCompletion: ["Locate the incomplete function or component", "Read its neighboring code for conventions", "Finish the implementation", "Verify it compiles"],
  uiGeneration: ["Select the matching UI skill (design system first)", "Build the component in the project's stack", "Match the project's design tokens", "Preview and iterate"],
  websiteGeneration: ["Plan page structure and content sections", "Load web-design guidance from the skill library", "Scaffold the page components", "Preview and polish responsive behavior"],
  applicationGeneration: ["Define the data model and API surface", "Scaffold the project structure", "Implement backend then frontend pieces", "Wire config, env and run scripts"],
  refactoring: ["Map current structure and call sites", "Define the target shape", "Move code in small, reviewable steps", "Run tests + typecheck after each step"],
  architecture: ["Clarify constraints and scale assumptions", "Sketch the component/module diagram", "Define interfaces and data flow", "Produce a phased implementation plan"],
  projectPlanning: ["Break the goal into milestones", "Assign each milestone a deliverable", "Note dependencies and risks", "Sequence the steps for execution"],
  documentation: ["Identify what needs documenting", "Write concise, example-first docs", "Keep formatting consistent with the project"],
  explanation: ["Summarize the concept in plain terms", "Ground it in the project's own code", "Give a runnable example"],
  terminalOperation: ["Resolve the right working directory", "Run the command and capture output", "Surface and fix errors"],
  chat: ["Answer directly and concisely in the user's language", "Offer a concrete next step"],
};

const TASK_RISKS: Record<string, string[]> = {
  applicationGeneration: ["Scope creep — pin down the MVP surface first", "Secrets — never hardcode keys or tokens", "Breaking changes — keep the seed files minimal"],
  websiteGeneration: ["Design drift — reuse the project design tokens", "Responsive breakpoints — verify small screens"],
  bugFix: ["Fix masking the symptom, not the cause", "Regression in a related module"],
  refactoring: ["Behavior drift behind renames", "Large diffs that are hard to review"],
  architecture: ["Over-engineering the first iteration", "Unstated performance constraints"],
  uiGeneration: ["Inconsistent spacing/typography with existing UI", "Broken dark mode / contrast"],
  database: ["Migration without rollback plan", "Unindexed query paths"],
  default: [],
};

function detectExact(prompt: string, table: Record<string, string[]>): string[] {
  const hits: string[] = [];
  for (const [key, words] of Object.entries(table)) {
    let score = 0;
    for (const w of words) {
      if (w.length <= 3) {
        if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(prompt)) score += 1;
      } else if (prompt.includes(w)) {
        score += 1;
      }
    }
    if (score > 0) hits.push(key);
  }
  return hits;
}

function classifyTask(prompt: string): { taskType: string; complexity: string } {
  const lower = prompt.toLowerCase();
  let bestType = "chat";
  let bestScore = 0;
  for (const [type, words] of Object.entries(TASK_KEYWORDS)) {
    const score = words.reduce((acc, w) => acc + (lower.includes(w) ? (w.length > 7 ? 2 : 1) : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  let complexity = bestType === "chat" ? "level1" : "level2";
  if (bestScore >= 4) complexity = bump(complexity);
  const hasCode = /```|\bfunction\b|\bclass\b|\bimport\b|\breturn\b/.test(lower);
  const long = lower.length > 600;
  const multiStep = /\b1[.)]\s|\b2[.)]\s|\bstep\b|\bfirst\b|\bthen\b/.test(lower);
  if (hasCode || long || multiStep) complexity = bump(complexity);
  if (COMPLEXITY_BUMPS.some((w) => lower.includes(w))) complexity = bump(complexity);
  return { taskType: bestType, complexity };
}

function bump(c: string): string {
  const levels = ["level0", "level1", "level2", "level3", "level4"];
  const i = levels.indexOf(c);
  return levels[Math.min(levels.length - 1, i + 1)] ?? "level4";
}

function goalOf(prompt: string): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 160) return cleaned;
  return `${cleaned.slice(0, 157)}…`;
}

/**
 * Build a plan sketch for a prompt. Pure + deterministic, so it doubles as a
 * cheap pre-flight that the renderer can show instantly.
 */
export function buildPlan(prompt: string, ctx?: PlanContext): AgentPlan {
  const lower = prompt.toLowerCase();
  const { taskType, complexity } = classifyTask(prompt);
  const stack = detectExact(lower, STACK_KEYWORDS).slice(0, 6).sort();

  const capabilitySet = detectExact(lower, CAPABILITY_KEYWORDS);
  const capabilities: string[] = [];
  for (const key of capabilitySet) {
    const label = key;
    if (ctx?.capabilities?.length && !ctx.capabilities.includes(key) && !ctx.capabilities.some((c) => c.toLowerCase().includes(key))) continue;
    if (!capabilities.includes(label)) capabilities.push(label);
  }
  if (!capabilities.length && stack.length) {
    const known = Object.keys(CAPABILITY_KEYWORDS).find((c) => stack.includes(c));
    if (known) capabilities.push(known);
  }

  const skills: string[] = [];
  for (const s of ctx?.skills ?? []) {
    const hay = `${s.name} ${s.description}`.toLowerCase();
    if (capabilities.some((c) => hay.includes(c)) || capabilitySet.some((c) => hay.includes(c))) {
      skills.push(s.name);
    }
  }
  if (!skills.length && ctx?.skills?.length && capabilities.length) {
    const known = ctx.skills.find((s) => s.name.includes(capabilities[0] ?? ""));
    if (known) skills.push(known.name);
  }

  const modules: string[] = stack.length ? stack : taskType === "chat" ? [] : ["main"];
  const steps = TASK_STEPS[taskType] ?? TASK_STEPS.chat ?? [];
  const risks = TASK_RISKS[taskType] ?? TASK_RISKS.default ?? [];

  return {
    goal: goalOf(prompt),
    taskType,
    complexity,
    stack,
    modules: modules.slice(0, 8),
    capabilities: capabilities.slice(0, 8),
    skills: skills.slice(0, 6),
    steps: steps.slice(0, 6),
    risks: risks.slice(0, 4),
    estimated: true,
  };
}

/** Format a plan into a compact system-instruction block (fed to the model). */
export function formatPlan(plan: AgentPlan): string {
  const lines: string[] = [];
  lines.push(`Planned task type: ${plan.taskType} (${plan.complexity})`);
  if (plan.stack.length) lines.push(`Detected stack: ${plan.stack.join(", ")}`);
  if (plan.capabilities.length) lines.push(`Capabilities: ${plan.capabilities.join(", ")}`);
  if (plan.skills.length) lines.push(`Suggested skills (load via the skill tool when relevant): ${plan.skills.join(", ")}`);
  if (plan.plugins?.length) lines.push(`Use these installed/integration modules (RIDE plugins): ${plan.plugins.join(", ")}`);
  if (plan.steps.length) lines.push(`Execution outline:\n${plan.steps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`);
  if (plan.risks.length) lines.push(`Watch out for: ${plan.risks.join("; ")}`);
  const frame = `<plan from Quinn>\n${lines.join("\n")}\n</plan>`;
  if (plan.pluginInstructions?.trim()) return `${frame}\n${plan.pluginInstructions.trim()}\n`;
  return frame;
}