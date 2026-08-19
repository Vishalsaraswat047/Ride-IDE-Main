import type { ReviewFinding, ReviewResult } from "@ride/contracts";

/**
 * Self-review pass: after the agent finishes, the output is re-checked by the
 * model with a short, format-fixed prompt. The reviewer prompt is far cheaper
 * than the task itself and catches critical mistakes (broken imports, wrong
 * languages, missing edge cases) before the user sees the result.
 */

export interface ReviewContext {
  goal: string;
  output: string;
  /** Files touched during the run (absolute paths). */
  touched?: string[];
  /** Task type from the plan (drives what "good" means). */
  taskType?: string;
}

export const REVIEW_PROMPT = `You are the quality reviewer inside RIDE. You are given an agent task and its output. Check it critically and reply in EXACTLY this format:

RESULT: PASS or FINDINGS
FINDINGS: (only when RESULT is FINDINGS)
- [severity] category: message

severity is one of: error (broken/incorrect), warning (risky/incomplete), suggestion (could be better). category is a short label like imports, syntax, logic, security, a11y, styling, performance, docs. List at most 5 findings. Keep each message to one line.

Be strict about: broken imports, mismatched file paths, syntax errors, obviously wrong logic, missing API keys or secrets in code, huge duplicated blobs, and UI that breaks accessibility or dark mode. Do not invent problems.`;

export function buildReviewPrompt(ctx: ReviewContext): string {
  const parts: string[] = [REVIEW_PROMPT];
  parts.push(`GOAL: ${ctx.goal.slice(0, 500)}`);
  if (ctx.taskType) parts.push(`TASK TYPE: ${ctx.taskType}`);
  if (ctx.touched?.length) {
    parts.push(`TOUCHED FILES:\n${ctx.touched.map((t) => `- ${t}`).join("\n")}`);
  }
  const output = ctx.output.length > 40_000 ? `${ctx.output.slice(0, 40_000)}\n…(truncated for review)` : ctx.output;
  parts.push(`OUTPUT:\n${output}`);
  return parts.join("\n\n");
}

const FINDING_RE = /^\s*-\s*\[(error|warning|suggestion)\]\s*([^:]+):\s*(.+)$/im;

/** Parse the model's reviewer reply into a structured result. */
export function parseReview(text: string): ReviewResult {
  const findings: ReviewFinding[] = [];
  const body = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length)
    .slice(0, 120);

  const resultLine = (body.find((l) => /^RESULT/i.test(l)) ?? "").replace(/^RESULT\s*:?\s*/i, "").trim().toUpperCase();
  const declaredPass = resultLine === "PASS" || resultLine === "OK" || resultLine === "NO_FINDINGS";
  const declaredFindings = resultLine.startsWith("FINDINGS");

  const joined = body.join("\n");
  let rest = joined;
  let match = FINDING_RE.exec(rest);
  while (match) {
    const severity = match[1] as ReviewFinding["severity"];
    const category = (match[2] ?? "general").trim().toLowerCase();
    const message = (match[3] ?? "").trim();
    if (severity && message) findings.push({ severity, category, message: message.slice(0, 300) });
    rest = rest.slice(match.index + match[0].length);
    match = FINDING_RE.exec(rest);
  }

  const summary = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => /^(summar|note|comment)/i.test(l))
    ?.replace(/^(summar|note|comment)y?\s*:?\s*/i, "") ?? "";

  return {
    passed: (declaredPass && !declaredFindings && findings.length === 0) || (!declaredFindings && findings.every((f) => f.severity !== "error")),
    findings,
    summary: summary.slice(0, 500),
  };
}