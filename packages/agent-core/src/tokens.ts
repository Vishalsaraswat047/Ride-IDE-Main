/**
 * Token estimation for the Quinn brain. Approximate — good enough to decide
 * whether to compact a tool-call conversation before it overflows the window.
 */

const CODE_CHARS_PER_TOKEN = 3.2;
const TEXT_CHARS_PER_TOKEN = 4.2;

/** Rough token estimate for one message, weighting code-ish lines. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let codeChars = 0;
  let textChars = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trimStart();
    if (
      trimmed.startsWith("```") ||
      trimmed.startsWith("{") ||
      trimmed.startsWith("[") ||
      trimmed.startsWith("(") ||
      trimmed.endsWith(";") ||
      trimmed.endsWith("}") ||
      trimmed.endsWith(")") ||
      /[a-zA-Z_$][\w$]*\s*\(/.test(trimmed) ||
      /^\s*[-*#>\d.].*$/.test(line)
    ) {
      codeChars += line.length + 1;
    } else {
      textChars += line.length + 1;
    }
  }
  return Math.ceil(codeChars / CODE_CHARS_PER_TOKEN + textChars / TEXT_CHARS_PER_TOKEN);
}

export interface EstimableMessage {
  role: string;
  content?: unknown;
}

/** Estimate the full prompt size of a chat message list (tools included). */
export function estimateMessagesTokens(messages: EstimableMessage[]): number {
  let total = 0;
  for (const m of messages) {
    total += 8;
    if (typeof m.content === "string") total += estimateTokens(m.content);
    if (m.role === "tool") total += 12;
    if (m.role === "assistant" && m.content === undefined) total += 6;
  }
  return total;
}
