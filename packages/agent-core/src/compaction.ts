import type { AgentPlan } from "@ride/contracts";
import { formatPlan } from "./planner";
import { estimateMessagesTokens } from "./tokens";

/**
 * Structural context compaction. Keeps the system frame + the most recent
 * turns intact and collapses the dense middle of a tool-call conversation:
 * paired assistant(tool_calls) + tool messages are dropped together (both
 * halves are required by the APIs), long outputs are truncated, and — when a
 * summarizer is configured — the remaining middle is folded into one brief
 * summary so nothing important is lost.
 */

export interface CompactorMessage {
  role: string;
  content?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CompactionOptions {
  /** LLM summarizer callback for the compressed middle (optional). */
  summarize?: (text: string) => Promise<string>;
  /** How many trailing messages are always kept verbatim. */
  keepLast?: number;
  /** Longest kept middle message before truncation. */
  maxMiddleLength?: number;
}

export interface CompactionResult {
  messages: CompactorMessage[];
  beforeTokens: number;
  afterTokens: number;
  droppedToolOutputs: number;
  summarized: boolean;
}

const SUMMARIZE_HEADER =
  "Previous conversation (compacted by RIDE to save context — stay consistent with it):\n";

/**
 * Compact `messages` if they exceed `budgetTokens`. This is the safety net that
 * lets long agent runs survive on small local models without overflowing the
 * context window.
 */
export async function compactMessages(
  messages: CompactorMessage[],
  budgetTokens: number,
  opts?: CompactionOptions,
): Promise<CompactionResult> {
  const keepLast = Math.max(2, opts?.keepLast ?? 8);
  const maxMiddle = opts?.maxMiddleLength ?? 1200;
  const beforeTokens = estimateMessagesTokens(messages);

  if (messages.length <= keepLast + 1 || beforeTokens <= budgetTokens) {
    return { messages, beforeTokens, afterTokens: beforeTokens, droppedToolOutputs: 0, summarized: false };
  }

  const systemIdx = messages.findIndex((m) => m.role === "system");
  const system = systemIdx >= 0 ? messages[systemIdx] : undefined;
  const { tail, tailStart } = buildTail(messages, systemIdx, keepLast);

  const middle = messages.slice(systemIdx >= 0 ? systemIdx + 1 : 0, tailStart);
  let droppedToolOutputs = 0;
  const keptMiddle: CompactorMessage[] = [];

  for (let i = 0; i < middle.length; i++) {
    const m = middle[i];
    if (!m) continue;

    // Assistant messages that carried tool calls need their tool results;
    // drop the pair (they are the bulk of the history weight).
    if (m.role === "assistant" && m.tool_calls?.length) {
      let consumed = 1;
      while (i + consumed < middle.length && middle[i + consumed]?.role === "tool") {
        droppedToolOutputs += 1;
        consumed += 1;
      }
      i += consumed - 1;
      continue;
    }
    if (m.role === "tool") {
      droppedToolOutputs += 1;
      continue;
    }

    if (typeof m.content === "string") {
      // Truncate long prose/tool text but keep the gist.
      const text = m.content;
      if (text.length > maxMiddle) {
        keptMiddle.push({ ...m, content: `${text.slice(0, maxMiddle)}…(truncated by compaction)` });
        continue;
      }
    }
    keptMiddle.push(m);
  }

  let summarized = false;
  let middleBlock: CompactorMessage[] = keptMiddle;

  // Only spend a model call on summarizing when the middle actually carries weight.
  const middleWeight = estimateMessagesTokens(keptMiddle);
  if (opts?.summarize && keptMiddle.length > 0 && middleWeight > 600) {
    const body = keptMiddle
      .map((m) => `${m.role}: ${typeof m.content === "string" ? m.content.slice(0, 800) : "(data)"}`)
      .join("\n")
      .slice(0, 24_000);
    try {
      const summary = await opts.summarize(body);
      middleBlock = [{ role: "user", content: `${SUMMARIZE_HEADER}${summary.slice(0, 4000)}` }];
      summarized = true;
    } catch {
      // Summarizer failed (offline local model, etc.) — structural compaction stands.
    }
  }

  const compacted = system ? [system, ...middleBlock, ...tail] : [...middleBlock, ...tail];
  const afterTokens = estimateMessagesTokens(compacted);
  return { messages: compacted, beforeTokens, afterTokens, droppedToolOutputs, summarized };
}

/**
 * Walk the conversation backwards keeping whole logical turns (a text message
 * plus any tool-call pair that belongs to it) until `keepTextMessages` text
 * messages are collected. Tool-call pairs are never split across the boundary.
 */
function buildTail(messages: CompactorMessage[], systemIdx: number, keepTextMessages: number): { tail: CompactorMessage[]; tailStart: number } {
  const tail: CompactorMessage[] = [];
  const pending: CompactorMessage[] = [];
  let textCount = 0;
  let i = messages.length - 1;
  for (; i > systemIdx && textCount < keepTextMessages; i--) {
    const m = messages[i];
    if (!m) break;
    if (m.role === "tool") {
      pending.unshift(m);
      continue;
    }
    if (m.role === "assistant" && m.tool_calls?.length) {
      pending.unshift(m);
      tail.unshift(...pending);
      pending.length = 0;
      continue;
    }
    pending.unshift(m);
    tail.unshift(...pending);
    pending.length = 0;
    textCount += 1;
  }
  if (pending.length) tail.unshift(...pending);
  return { tail, tailStart: i + 1 };
}

/** Plan-aware system frame for local agents — packs the plan into the prompt. */
export function applyPlanFrame(systemPrompt: string, plan: AgentPlan | null, memoryContext?: string): string {
  const parts: string[] = [systemPrompt];
  if (plan) parts.push(formatPlan(plan));
  if (memoryContext) parts.push(memoryContext);
  return parts.join("\n\n");
}