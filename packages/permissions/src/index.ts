import { relative, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import type { PermissionDecision } from "@ride/contracts";

export type ImpactLevel = "low" | "medium" | "high";

export interface PermissionPolicy {
  workspaceRoot: string;
  allowCommands: string[];
  denyCommands: string[];
  allowNetworkHosts?: string[];
  denyNetworkHosts?: string[];
  highImpactCommandPatterns: RegExp[];
  maxBatchDelete?: number;
  alwaysAllow: string[];
  alwaysDeny: string[];
}

export interface PermissionDecisionRequest {
  requestID: string;
  sessionID: string;
  tool: string;
  callID: string;
  input: unknown;
  impact: ImpactLevel;
  summary: string;
}

export type DecisionOutcome =
  | { kind: "allow-once" }
  | { kind: "always" }
  | { kind: "deny" }
  | { kind: "ask" };

export class PolicyEngine {
  private grantedAlways = new Set<string>();

  constructor(private policy: PermissionPolicy) {}

  setPolicy(policy: PermissionPolicy): void {
    this.policy = policy;
  }

  getPolicy(): PermissionPolicy {
    return this.policy;
  }

  /** Evaluate a tool call against policy. Returns the decision without user input. */
  evaluate(req: Omit<PermissionDecisionRequest, "requestID" | "impact" | "summary">): DecisionOutcome {
    const fingerprint = this.fingerprint(req);
    if (this.grantedAlways.has(fingerprint)) return { kind: "allow-once" };
    if (this.policy.alwaysDeny.includes(req.tool)) return { kind: "deny" };
    if (this.policy.alwaysAllow.includes(req.tool)) return { kind: "allow-once" };

    const { impact, summary } = this.assess(req);
    if (impact === "high") return { kind: "ask" };

    switch (req.tool) {
      case "read":
      case "list":
      case "search":
      case "grep":
      case "browse":
      case "webfetch":
        return { kind: "allow-once" };
      case "bash":
      case "execute_command":
      case "run":
        return this.evaluateCommand(req.input);
      case "write":
      case "edit":
      case "create":
        return { kind: "ask" };
      case "delete": {
        const count = this.countTargets(req.input as Record<string, unknown> | null);
        if (count > (this.policy.maxBatchDelete ?? 50)) return { kind: "ask" };
        return { kind: "allow-once" };
      }
      case "git":
        return this.evaluateGit(req.input);
      default:
        return impact === "low" ? { kind: "allow-once" } : { kind: "ask" };
    }
  }

  remember(requestID: string, decision: PermissionDecision, req?: { tool: string; callID?: string; input?: unknown }): void {
    if (decision.decision === "always") {
      this.grantedAlways.add(req ? this.fingerprint(req) : requestID);
    }
  }

  private evaluateCommand(input: unknown): DecisionOutcome {
    const cmd = this.commandString(input);
    if (!cmd) return { kind: "ask" };
    for (const pattern of this.policy.denyCommands) {
      if (cmd.match(new RegExp(pattern, "i"))) return { kind: "deny" };
    }
    for (const pattern of this.policy.allowCommands) {
      if (cmd.match(new RegExp(pattern, "i"))) return { kind: "allow-once" };
    }
    return { kind: "ask" };
  }

  private evaluateGit(input: unknown): DecisionOutcome {
    const cmd = this.commandString(input);
    if (!cmd) return { kind: "ask" };
    if (/reset|revert|clean|push|force/i.test(cmd)) return { kind: "ask" };
    return { kind: "allow-once" };
  }

  /** Classify impact + human summary (the "487 files" detector). */
  assess(req: { tool: string; input: unknown; sessionID: string }): { impact: ImpactLevel; summary: string } {
    const tool = req.tool;
    const input = req.input as Record<string, unknown> | null;

    if (tool === "delete") {
      const count = this.countTargets(input);
      if (count > (this.policy.maxBatchDelete ?? 50)) {
        return {
          impact: "high",
          summary: `Agent wants to delete ${count} files — this exceeds the ${this.policy.maxBatchDelete ?? 50}-file safety limit.`,
        };
      }
      return { impact: "medium", summary: `Delete ${count} file${count === 1 ? "" : "s"}` };
    }

    if (tool === "bash" || tool === "execute_command" || tool === "run") {
      const cmd = this.commandString(input);
      for (const pattern of this.policy.highImpactCommandPatterns) {
        if (cmd.match(pattern)) {
          return { impact: "high", summary: `High-impact command: ${truncate(cmd, 140)}` };
        }
      }
      return { impact: "medium", summary: `Run command: ${truncate(cmd, 140)}` };
    }

    if (tool === "write" || tool === "edit" || tool === "create") {
      const path = typeof input?.filePath === "string" ? input.filePath : "";
      return {
        impact: "medium",
        summary: `Write ${truncate(path, 100)}`,
      };
    }

    return { impact: "low", summary: `${tool} ${JSON.stringify(input ?? {}).slice(0, 120)}` };
  }

  /** True if the path stays inside the workspace. */
  isInsideWorkspace(filePath: string): boolean {
    const root = resolve(this.policy.workspaceRoot);
    const target = resolve(filePath);
    return target === root || target.startsWith(root + sep);
  }

  private commandString(input: unknown): string {
    if (!input) return "";
    const obj = input as Record<string, unknown>;
    if (typeof obj.command === "string") return obj.command;
    if (typeof obj.cmd === "string") return obj.cmd;
    if (typeof obj.input === "string") return obj.input;
    return JSON.stringify(input);
  }

  private countTargets(input: Record<string, unknown> | null): number {
    if (!input) return 1;
    const paths = input.paths ?? input.filePaths ?? input.files;
    if (Array.isArray(paths)) return paths.length;
    if (typeof input.path === "string") return 1;
    if (typeof input.filePath === "string") return 1;
    return 1;
  }

  /**
   * Stable fingerprint for remembering decisions: keyed on the actual action
   * (command text / tool), not the per-call callID, so "always allow" actually
   * persists across agent turns.
   */
  private fingerprint(req: { tool: string; callID?: string; input?: unknown }): string {
    const tool = req.tool;
    if (tool === "bash" || tool === "execute_command" || tool === "run") {
      return `bash:${this.commandString(req.input)}`;
    }
    if (tool === "git") {
      return `git:${this.commandString(req.input)}`;
    }
    if (tool === "write" || tool === "edit" || tool === "create" || tool === "delete") {
      return tool;
    }
    return `${tool}:${req.callID ?? randomUUID()}`;
  }
}

/** Redact common secret patterns from text before it reaches model context or logs. */
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9-_]{16,}/g,
  /\b(?:api[_-]?key|apikey|secret|token|password|passwd)\b["']?\s*[:=]\s*["'][^"']{8,}["']/gi,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /ghp_[A-Za-z0-9]{36,}/g,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
