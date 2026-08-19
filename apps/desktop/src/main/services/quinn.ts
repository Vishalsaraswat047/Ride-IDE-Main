import { buildPlan, buildReviewPrompt, parseReview, type PlanContext } from "@ride/agent-core";
import { analyzePrompt } from "@ride/plugins";
import type { ModelEndpoint, QuinnOptions } from "@ride/agent-bridge";
import type { WorkspaceManager } from "./workspace";
import type { ProjectDb } from "@ride/project-db";
import { settingsManager } from "./settings";

/**
 * Quinn brain glue. Assembles the plan/compact/review hooks for the agent
 * bridge from the user's settings, and owns durable memory persistence into
 * the project index (project-db). Everything is best-effort: if a hook fails
 * the agent run continues unmodified.
 */

const OLLAMA_URL = "http://127.0.0.1:11434";

/** Ask the local Ollama runtime for a short summary (context compaction). */
async function localSummarize(text: string): Promise<string> {
  try {
    const model = settingsManager.get().ai.defaultModel.startsWith("ollama/")
      ? settingsManager.get().ai.defaultModel.slice("ollama/".length)
      : "qwen2.5-coder:1.5b";
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: `Summarize this agent conversation in up to 4 short bullets. Keep technical decisions, file paths and open questions:\n\n${text.slice(0, 20_000)}`,
        stream: false,
        options: { temperature: 0.2, num_predict: 320 },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { response?: string };
    return (data.response ?? "").trim().slice(0, 2000);
  } catch {
    throw new Error("local summarize unavailable");
  }
}

/** Run a short non-streaming completion for the self-review pass. */
async function reviewViaEndpoint(endpoint: ModelEndpoint, prompt: string): Promise<string> {
  const res = await fetch(`${endpoint.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${endpoint.apiKey}`,
    },
    body: JSON.stringify({
      model: endpoint.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 700,
    }),
    signal: AbortSignal.timeout(40_000),
  });
  if (!res.ok) throw new Error(`review API error ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Assemble the Quinn hooks for one run (plan + compaction + self-review). */
export function buildQuinnOptions(opts: { prompt: string; endpoint?: ModelEndpoint; cwd?: string; workspace: WorkspaceManager | null; review?: boolean }): QuinnOptions | undefined {
  const quinn = settingsManager.get().quinn;
  const out: QuinnOptions = {};

  if (quinn.planning && opts.workspace?.root) {
    out.plan = async (_prompt, skillsList) => {
      const ctx: PlanContext = { skills: skillsList?.map((s) => ({ name: s.name, description: s.description })) ?? [] };
      const plan = buildPlan(opts.prompt, ctx);
      // Plugin ecosystem: enrich the plan with RIDE's verified integrations.
      try {
        const analysis = analyzePrompt(opts.prompt);
        if (analysis.recommendations.length) {
          plan.plugins = analysis.recommendations.map((r) => r.manifestId);
          plan.capabilities = [...new Set([...plan.capabilities, ...analysis.modules])].slice(0, 12);
          plan.pluginInstructions = analysis.instructionBlock;
        }
      } catch {
        /* plugin analysis is best-effort — never block the run */
      }
      return plan;
    };
  }

  if (quinn.contextCompaction) {
    out.compactionBudget = quinn.compactionBudgetTokens;
    out.summarize = localSummarize;
  }

  const endpoint = opts.endpoint;

  if (quinn.selfReview && opts.review !== false && endpoint) {
    out.review = async (output, ctx) => {
      const reviewPrompt = buildReviewPrompt({
        goal: opts.prompt,
        output,
        touched: ctx.touched,
      });
      const raw = await reviewViaEndpoint(endpoint, reviewPrompt);
      return parseReview(raw);
    };
  }

  return out.plan || out.compactionBudget || out.review ? out : undefined;
}

/** Build the <project-memory> block from prior decisions + session summaries. */
export function memoryContextFor(db: ProjectDb | undefined | null): string | null {
  if (!db) return null;
  try {
    const { decisions, summaries } = db.getMemoryContext({ decisionLimit: settingsManager.get().quinn.memoryDecisionLimit });
    if (!decisions.length && !summaries.length) return null;
    const parts: string[] = [];
    if (decisions.length) {
      parts.push(`Recent decisions:\n${decisions.slice(-5).map((d) => `- ${d}`).join("\n")}`);
    }
    if (summaries.length) {
      parts.push(`Earlier session summaries:\n${summaries.slice(-3).map((s) => `- ${s}`).join("\n")}`);
    }
    return `<project-memory>\n${parts.join("\n\n")}\n</project-memory>`;
  } catch {
    return null;
  }
}

/** Record a finished session's turns + summary into durable project memory. */
export function persistSessionMemory(db: ProjectDb | undefined | null, sessionId: string, turns: Array<{ role: "user" | "assistant"; content: string }>): void {
  if (!db) return;
  try {
    for (const t of turns) {
      if (t.content && t.content.trim()) db.appendMessage(sessionId, t.role, t.content.trim().slice(0, 4000));
    }
    const last = [...turns].reverse().find((t) => t.role === "assistant");
    if (last?.content) {
      db.appendMessage(sessionId, "assistant", `Summary: ${last.content.trim().slice(0, 600)}`, "summary");
    }
  } catch {
    /* memory is best-effort */
  }
}