import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { AgentPlan, RideSession, RunTaskRequest } from "@ride/contracts";
import { applyPlanFrame, compactMessages, estimateMessagesTokens, type CompactorMessage } from "@ride/agent-core";

export interface AgentBridgeEvents {
  event: (event: unknown) => void;
  sessionStarted: (session: RideSession) => void;
  sessionStatus: (sessionId: string, status: RideSession["status"]) => void;
  permissionRequest: (request: PermissionRequest) => void;
  done: (sessionId: string, ok: boolean) => void;
  exit: (sessionId: string, code: number | null) => void;
}

export interface PermissionRequest {
  requestID: string;
  sessionID: string;
  tool: string;
  callID: string;
  input: unknown;
}

interface PermissionRecord extends PermissionRequest {
  resolve: (d: "allow-once" | "always" | "deny") => void;
}

export interface ModelEndpoint {
  baseURL: string;
  apiKey: string;
  model: string;
}

export interface TaskHandle {
  sessionId: string;
}

export type RunTaskInput = RunTaskRequest & {
  endpoint?: ModelEndpoint;
  tools?: ToolRuntime;
  silent?: boolean;
  skills?: SkillLoader;
  mcp?: McpBridge;
  /**
   * Quinn brain options: plan-then-execute, context compaction and the
   * self-review pass. All optional — the bridge stays fully backward compatible.
   */
  quinn?: QuinnOptions;
};

export interface QuinnOptions {
  /** Build a plan sketch before the run and inject it into the system frame. */
  plan?: (prompt: string, skills?: SkillSpec[]) => Promise<AgentPlan | null> | AgentPlan | null;
  /** Collapse history when the live prompt exceeds this many tokens. */
  compactionBudget?: number;
  /** Summarizer for the compacted middle (local model — can return short text). */
  summarize?: (text: string) => Promise<string>;
  /** Self-review pass after the run finishes. */
  review?: (output: string, ctx: { sessionId: string; prompt: string; touched: string[] }) => Promise<unknown>;
}

export interface McpBridge {
  list: () => Array<{ serverName: string; name: string; description?: string }>;
  call: (serverName: string, toolName: string, args: Record<string, unknown>) => Promise<string>;
}

export function resolveOpencodeBin(): string {
  if (process.env.RIDE_OPENCODE_BIN) return process.env.RIDE_OPENCODE_BIN;
  const candidates: string[] = [];
  if (process.platform === "win32") {
    candidates.push(process.env.APPDATA ? `${process.env.APPDATA}\\npm\\opencode.cmd` : "");
  }
  candidates.push("opencode");
  for (const c of candidates) {
    if (c && c !== "opencode") return c;
  }
  return "opencode";
}

const SYSTEM_PROMPT =
  "You are RIDE, a coding assistant running inside the RIDE editor. Answer in the same language the user used. " +
  "Be concise and concrete; when writing code, output complete, ready-to-use code blocks with no placeholders. " +
  "When you write a complete file, put the file path as the code fence language so the editor can save it, " +
  "e.g. ```src/App.tsx or ```package.json. Use real, conventional project paths (src/, components/, lib/, ...). " +
  "For standalone snippets (no file intent), use the plain language name like ```tsx or ```bash." +
  " If a `skill` tool is available, use it to load specialized instructions for the user's current task before answering.";

/** Skills map to a SKILL.md-style instruction file, injected on demand via the `skill` tool. */
export interface SkillSpec {
  name: string;
  description: string;
  /** Absolute path of the SKILL.md file (loaded when the tool runs). */
  path?: string;
  /** Inline skill body (used when no file exists). */
  body?: string;
}

export interface SkillLoader {
  list: () => Promise<SkillSpec[]>;
  load: (name: string) => Promise<SkillSpec | null>;
}

// ─── Native tool system ────────────────────────────────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * The exact tool surface RIDE hands to the agent. Names deliberately match the
 * RIDE permission policy vocabulary (read/write/delete/bash/git/…) so the
 * PolicyEngine can classify them without extra mapping.
 */
export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "read",
    description: "Read a file from the workspace. Returns its full text content.",
    parameters: {
      type: "object",
      properties: { filePath: { type: "string", description: "Absolute path of the file to read" } },
      required: ["filePath"],
    },
  },
  {
    name: "write",
    description: "Create or overwrite a file with the given content. Creates parent directories as needed.",
    parameters: {
      type: "object",
      properties: {
        filePath: { type: "string" },
        content: { type: "string", description: "Full new file content" },
      },
      required: ["filePath", "content"],
    },
  },
  {
    name: "delete",
    description: "Delete a file or directory (recursive). Only works inside the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Absolute path to delete" },
        paths: { type: "array", items: { type: "string" }, description: "Batch delete (alternative to path)" },
      },
    },
  },
  {
    name: "rename",
    description: "Rename or move a file inside the workspace.",
    parameters: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    },
  },
  {
    name: "list",
    description: "List files and directories in a folder, one level deep.",
    parameters: {
      type: "object",
      properties: { path: { type: "string", description: "Absolute directory path" } },
      required: ["path"],
    },
  },
  {
    name: "search",
    description: "Full-text search over the project index. Use it to find where things are defined or referenced.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Search terms" } },
      required: ["query"],
    },
  },
  {
    name: "grep",
    description: "Regex search inside text files of the workspace. Returns matching lines with file and line number.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Regular expression" },
        path: { type: "string", description: "Optional directory to limit the search to" },
      },
      required: ["pattern"],
    },
  },
  {
    name: "bash",
    description: "Execute a shell command in the workspace. Use for build/test/install/inspect. Output is captured.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run" },
        cwd: { type: "string", description: "Optional working directory (defaults to workspace root)" },
      },
      required: ["command"],
    },
  },
  {
    name: "git",
    description:
      "Git operations for the workspace. ops: status, diff, staged, log, branches, checkout <branch>, commit <message>, init, stash, restore <paths>. Commits stage all changes first.",
    parameters: {
      type: "object",
      properties: {
        op: { type: "string", description: "One of status, diff, staged, log, branches, checkout, commit, init, stash, restore" },
        arg: { type: "string", description: "Branch name (checkout) or commit message (commit) or paths (restore)" },
      },
      required: ["op"],
    },
  },
  {
    name: "preview",
    description: "Controls the live preview dev server. ops: status, start, stop. start returns the preview URL.",
    parameters: {
      type: "object",
      properties: { op: { type: "string", enum: ["status", "start", "stop"] } },
      required: ["op"],
    },
  },
  {
    name: "browse",
    description: "Search the web and return a list of results with titles, URLs, and snippets. Use for finding documentation, APIs, or current information.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        maxResults: { type: "number", description: "Maximum number of results to return (default: 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "webfetch",
    description: "Fetch and extract content from a specific URL. Returns the main text content of the page.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch" },
        maxLength: { type: "number", description: "Maximum characters to return (default: 8000)" },
      },
      required: ["url"],
    },
  },
  {
    name: "browser",
    description:
      "Full browser automation in a hidden window. ops: open <url>, navigate <url>, click <css selector>, type <css selector> <text>, select <css selector> <value>, scroll <down|up|top|bottom>, extract [css selector], screenshot, status, close. Use extract after open/navigate to read page text; screenshot saves a PNG into the workspace artifacts folder so you can inspect the page visually.",
    parameters: {
      type: "object",
      properties: {
        op: { type: "string", description: "One of open, navigate, click, type, select, scroll, extract, screenshot, status, close" },
        url: { type: "string", description: "URL for open/navigate" },
        selector: { type: "string", description: "CSS selector for click/type/select/extract" },
        text: { type: "string", description: "Text to type" },
        value: { type: "string", description: "Value to select" },
        direction: { type: "string", description: "Scroll direction: down, up, top, bottom" },
        index: { type: "number", description: "Which matching element to use (default: 0)" },
      },
      required: ["op"],
    },
  },
  {
    name: "skill",
    description:
      "Load a specialized skill by name to get its detailed instructions for the current task. Call this before answering when a matching skill exists. Returns the skill body or an error listing available skills.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name to load" },
      },
      required: ["name"],
    },
  },
  {
    name: "mcp",
    description:
      "Interact with Model Context Protocol servers. ops: list (show all MCP tools from connected servers), call <serverName> <toolName> <args JSON object>. Use list first to discover what tools are available, then call them to delegate that capability to the external server.",
    parameters: {
      type: "object",
      properties: {
        op: { type: "string", enum: ["list", "call"], description: "list or call" },
        server: { type: "string", description: "Server name for call" },
        tool: { type: "string", description: "Tool name for call" },
        args: { type: "object", description: "JSON arguments object for the tool call" },
      },
      required: ["op"],
    },
  },
];

/** Tools that only inspect state — always safe. */
export const SAFE_TOOLS = new Set(["read", "list", "search", "grep", "browse", "webfetch", "skill"]);

export interface ToolRuntime {
  resolve: (tool: string, input: unknown) => Promise<{ ok: boolean; output?: string; error?: string }>;
}

export interface SessionUsage {
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
}

// ─── Agent bridge ──────────────────────────────────────────────────────────

export class AgentBridge extends EventEmitter {
  private sessions = new Map<string, RideSession>();
  private aborts = new Map<string, AbortController>();
  private pendingPermission = new Map<string, PermissionRecord>();
  private history = new Map<string, unknown[]>();
  private turns = new Map<string, Array<{ role: "user" | "assistant"; content: string }>>();
  private usage = new Map<string, SessionUsage>();
  private lastUsageAt = 0;
  private silentTexts = new Map<string, string>();
  private touched = new Map<string, string[]>();
  private turnText = new Map<string, string>();

  override on(event: "event", listener: (event: unknown) => void): this;
  override on(event: "sessionStarted", listener: (session: RideSession) => void): this;
  override on(event: "sessionStatus", listener: (sessionId: string, status: RideSession["status"]) => void): this;
  override on(event: "permissionRequest", listener: (request: PermissionRequest) => void): this;
  override on(event: "done", listener: (sessionId: string, ok: boolean) => void): this;
  override on(event: "exit", listener: (sessionId: string, code: number | null) => void): this;
  override on(event: string | symbol, listener: (...args: never[]) => void): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return super.on(event, listener as (...args: any[]) => void);
  }

  constructor(
    private readonly opts: {
      permissionHandler?: (req: PermissionRequest) => Promise<"allow-once" | "always" | "deny">;
    } = {},
  ) {
    super();
  }

  runTask(req: RunTaskInput): TaskHandle {
    const sessionId = req.sessionId ?? randomUUID();
    const endpoint = req.endpoint;

    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      id: sessionId,
      title: existing?.title ?? req.title ?? truncate(req.prompt, 60),
      status: "running",
      model: req.model,
      cwd: req.cwd,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      messageCount: existing?.messageCount ?? 0,
    });
    if (!existing) this.emit("sessionStarted", this.sessions.get(sessionId)!);

    const turnHistory = this.turns.get(sessionId) ?? [];
    const priorTurns = req.sessionId && existing ? turnHistory : (req.history ?? []).map((h) => ({ role: h.role, content: h.content }));
    turnHistory.push({ role: "user", content: req.prompt });
    this.turns.set(sessionId, turnHistory);

    const abort = new AbortController();
    this.aborts.set(sessionId, abort);

    void (async () => {
      try {
        if (!endpoint?.apiKey) {
          throw new Error(
            endpoint
              ? "No API key configured for this model. Add the Featherless key in Settings → AI."
              : "Model not configured. Pick a model from the header dropdown first.",
          );
        }

        let systemPrompt = SYSTEM_PROMPT;
        if (req.quinn?.plan) {
          const skills = req.skills ? await req.skills.list().catch(() => []) : undefined;
          const plan = await Promise.resolve(req.quinn.plan(req.prompt, skills)).catch(() => null);
          if (plan) {
            this.pushEvent(sessionId, { type: "plan", sessionID: sessionId, timestamp: Date.now(), plan });
            systemPrompt = applyPlanFrame(systemPrompt, plan);
          }
        }

        const messages: ChatMessage[] = [
          { role: "system", content: systemPrompt },
          ...priorTurns.map((t) => ({ role: t.role, content: t.content })),
          { role: "user", content: req.prompt },
        ];

        if (req.tools) {
          await this.toolLoop(sessionId, endpoint, messages, abort.signal, req);
        } else {
          await this.chatStream(sessionId, endpoint, messages, abort.signal, req);
        }

        const assistantText = this.turnText.get(sessionId);
        if (assistantText && !this.silentTexts.has(sessionId)) {
          this.turns.set(sessionId, [...(this.turns.get(sessionId) ?? []), { role: "assistant", content: assistantText }]);
        }
        this.turnText.delete(sessionId);

        this.setStatus(sessionId, "completed");
        this.pushEvent(sessionId, { type: "done", sessionID: sessionId, timestamp: Date.now(), ok: true });
        this.emit("done", sessionId, true);
        this.emit("exit", sessionId, 0);
      } catch (err) {
        if (abort.signal.aborted) {
          this.setStatus(sessionId, "cancelled");
          this.emit("done", sessionId, false);
          this.emit("exit", sessionId, null);
        } else {
          const message = err instanceof Error ? err.message : String(err);
          this.pushEvent(sessionId, {
            type: "error",
            sessionID: sessionId,
            timestamp: Date.now(),
            error: { name: "request", message },
          });
          this.setStatus(sessionId, "failed");
          this.pushEvent(sessionId, { type: "done", sessionID: sessionId, timestamp: Date.now(), ok: false });
          this.emit("done", sessionId, false);
          this.emit("exit", sessionId, null);
        }
      } finally {
        this.aborts.delete(sessionId);
        this.turnText.delete(sessionId);
      }
    })();

    return { sessionId };
  }

  /**
   * Background run for scheduled tasks: same loop but no renderer events are
   * emitted and no permission prompts are raised (autoApprove). Resolves with
   * the accumulated assistant text when the run completes.
   */
  async runBackgroundTask(req: RunTaskInput): Promise<string> {
    const sessionId = req.sessionId ?? randomUUID();
    const endpoint = req.endpoint;
    if (!endpoint?.apiKey) {
      throw new Error(endpoint ? "No API key configured for this model." : "Model not configured.");
    }

    const userMessages = (req.history ?? []).map((h) => ({ role: h.role, content: h.content }));
    let systemPrompt = SYSTEM_PROMPT;
    if (req.quinn?.plan) {
      const skills = req.skills ? await req.skills.list().catch(() => []) : undefined;
      const plan = await Promise.resolve(req.quinn.plan(req.prompt, skills)).catch(() => null);
      if (plan) systemPrompt = applyPlanFrame(systemPrompt, plan);
    }

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages,
      { role: "user", content: req.prompt },
    ];

    this.silentTexts.set(sessionId, "");

    let error: unknown = null;
    try {
if (req.tools) {
      await this.toolLoop(sessionId, endpoint, messages, new AbortController().signal, { ...req, silent: true });
    } else {
      await this.chatStream(sessionId, endpoint, messages, new AbortController().signal, { ...req, silent: true });
    }
    } catch (err) {
      error = err;
    } finally {
      const text = this.silentTexts.get(sessionId) ?? "";
      this.silentTexts.delete(sessionId);
      if (error) throw error;
      return text;
    }
  }

  /**
   * Native agent loop: model → tool calls → execute → result → model, until the
   * model answers without tool calls (final text is streamed). Falls back to a
   * plain streamed chat when the endpoint rejects the tools payload.
   */
  private async toolLoop(
    sessionId: string,
    endpoint: ModelEndpoint,
    initial: ChatMessage[],
    signal: AbortSignal,
    req: RunTaskInput,
  ): Promise<void> {
    const messages = [...initial];
    const maxIterations = 14;

    for (let iter = 0; iter < maxIterations; iter++) {
      if (req.quinn?.compactionBudget) {
        await this.maybeCompact(sessionId, messages, req);
      }

      const payload: Record<string, unknown> = {
        model: endpoint.model,
        messages,
        temperature: 0.5,
        max_tokens: 4096,
        tools: AGENT_TOOLS.map((t) => ({ type: "function", function: t })),
      };
      let useTools = true;

      const res = await this.postChat(sessionId, endpoint, payload, signal, req).catch(async (err) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (useTools && /tool|function|400|invalid|unsupported/i.test(msg)) {
          useTools = false;
          delete payload["tools"];
          return this.postChat(sessionId, endpoint, payload, signal, req);
        }
        throw err;
      });

      const choice = res.choices?.[0];
      const message = choice?.message ?? {};
      const toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> = message.tool_calls ?? [];

      if (toolCalls.length === 0) {
        const finalText = message.content ?? "";
        await this.emitAssistantText(sessionId, finalText);
        await this.maybeReview(sessionId, finalText, req);
        return;
      }

      const raw = message.content ?? "";
      if (typeof raw === "string" && raw.trim()) {
        this.pushEvent(sessionId, {
          type: "text",
          sessionID: sessionId,
          timestamp: Date.now(),
          part: { type: "text", text: raw },
        });
      }

      this.pushEvent(sessionId, {
        type: "step.start",
        sessionID: sessionId,
        timestamp: Date.now(),
        part: { reason: "tool_use" },
      });

      const toolResults: Array<{ role: "tool"; tool_call_id: string; content: string }> = [];

      for (const call of toolCalls) {
        let toolName = "";
        let input: unknown = {};
        try {
          toolName = call.function?.name ?? "";
          input = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
        } catch {
          input = { raw: call.function?.arguments };
        }

        if (toolName === "skill" && req.skills) {
          const name = String((input as Record<string, unknown>)?.name ?? "");
          const spec = await req.skills.load(name);
          const list = (await req.skills.list()).map((s) => `${s.name}: ${s.description}`).join("\n");
          toolResults.push({
            role: "tool",
            tool_call_id: call.id,
            content: spec
              ? `Skill "${spec.name}" loaded.\n\n${spec.body ?? `Instructions in ${spec.path ?? "unknown file"}`}`
              : `Skill "${name}" not found. Available skills:\n${list || "(none)"}`,
          });
          this.pushEvent(sessionId, {
            type: "tool_result",
            sessionID: sessionId,
            timestamp: Date.now(),
            callID: call.id,
            output: `skill(${name})`,
          });
          continue;
        }

        if (toolName === "mcp") {
          const reqInput = (input ?? {}) as Record<string, unknown>;
          const op = String(reqInput.op ?? "list");
          if (op === "list") {
            const tools = req.mcp?.list() ?? [];
            const body = tools.length
              ? tools.map((t) => `- [${t.serverName}] ${t.name}${t.description ? `: ${t.description}` : ""}`).join("\n")
              : "No MCP tools available. Add and connect an MCP server in Settings → AI → MCP servers.";
            toolResults.push({ role: "tool", tool_call_id: call.id, content: body });
            this.pushEvent(sessionId, {
              type: "tool_result",
              sessionID: sessionId,
              timestamp: Date.now(),
              callID: call.id,
              output: `mcp list (${tools.length} tools)`,
            });
            continue;
          }
          const server = String(reqInput.server ?? "");
          const tool = String(reqInput.tool ?? "");
          const args = (reqInput.args ?? {}) as Record<string, unknown>;
          try {
            const output = req.mcp
              ? await req.mcp.call(server, tool, args)
              : "MCP not configured. Add and connect an MCP server first.";
            toolResults.push({ role: "tool", tool_call_id: call.id, content: output.slice(0, 16000) });
            this.pushEvent(sessionId, {
              type: "tool_result",
              sessionID: sessionId,
              timestamp: Date.now(),
              callID: call.id,
              output: `mcp call ${server}.${tool}`,
            });
          } catch (err) {
            toolResults.push({ role: "tool", tool_call_id: call.id, content: `MCP call failed: ${err instanceof Error ? err.message : String(err)}` });
          }
          continue;
        }

        this.pushEvent(sessionId, {
          type: "tool_use",
          sessionID: sessionId,
          timestamp: Date.now(),
          part: {
            type: "tool",
            tool: toolName,
            callID: call.id,
            title: toolName,
            state: { status: "running", input },
          },
        });

        const allowed = await this.authorizeTool(sessionId, toolName, call.id, input, req);
        let ok = allowed;
        let output = "";

        if (allowed) {
          try {
            const result = await req.tools!.resolve(toolName, input);
            ok = result.ok;
            output = result.error ?? result.output ?? "(no output)";
            if (ok && req.quinn?.review) {
              const path = (input as Record<string, unknown>)?.filePath ?? (input as Record<string, unknown>)?.path;
              if (typeof path === "string") {
                const list = this.touched.get(sessionId) ?? [];
                if (!list.includes(path)) list.push(path);
                this.touched.set(sessionId, list);
              }
            }
          } catch (err) {
            ok = false;
            output = err instanceof Error ? err.message : String(err);
          }
        } else {
          output = "Permission denied by the user.";
        }

        toolResults.push({ role: "tool", tool_call_id: call.id, content: output.slice(0, 16000) });

        this.pushEvent(sessionId, {
          type: "tool_result",
          sessionID: sessionId,
          timestamp: Date.now(),
          callID: call.id,
          output,
        });
      }

      this.pushEvent(sessionId, {
        type: "step.finish",
        sessionID: sessionId,
        timestamp: Date.now(),
        part: { reason: "tool_use" },
      });

      messages.push({ role: "assistant", content: raw ?? "", tool_calls: toolCalls });
      messages.push(...toolResults);
    }

    await this.emitAssistantText(sessionId, "I reached the tool limit for this task. Ask me to continue if needed.");
    this.touched.delete(sessionId);
  }

  /** Collapse the live history when it grows past the budget (Quinn layer). */
  private async maybeCompact(sessionId: string, messages: ChatMessage[], req: RunTaskInput): Promise<void> {
    try {
      const budget = req.quinn!.compactionBudget!;
      const before = estimateMessagesTokens(messages);
      if (before <= budget) return;
      const compacted = await compactMessages(
        messages as unknown as CompactorMessage[],
        budget,
        { summarize: req.quinn?.summarize, keepLast: 6 },
      );
      if (compacted.messages.length === messages.length && compacted.beforeTokens === compacted.afterTokens) return;
      messages.length = 0;
      messages.push(...(compacted.messages as unknown as ChatMessage[]));
      this.pushEvent(sessionId, {
        type: "compacted",
        sessionID: sessionId,
        timestamp: Date.now(),
        beforeTokens: compacted.beforeTokens,
        afterTokens: compacted.afterTokens,
        droppedToolOutputs: compacted.droppedToolOutputs,
        summarized: compacted.summarized,
      });
    } catch {
      /* compaction is best-effort — never break the loop */
    }
  }

  /** Self-review pass after the final answer (Quinn layer). */
  private async maybeReview(sessionId: string, finalText: string, req: RunTaskInput): Promise<void> {
    if (!req.quinn?.review) return;
    try {
      const touched = this.touched.get(sessionId) ?? [];
      const result = await req.quinn.review(finalText, { sessionId, prompt: req.prompt, touched });
      this.pushEvent(sessionId, {
        type: "review",
        sessionID: sessionId,
        timestamp: Date.now(),
        review: result,
      });
    } catch {
      /* review is best-effort — never fail the run */
    } finally {
      this.touched.delete(sessionId);
    }
  }

  private async postChat(
    sessionId: string,
    endpoint: ModelEndpoint,
    payload: Record<string, unknown>,
    signal: AbortSignal,
    req: RunTaskInput,
  ): Promise<{
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  }> {
    const res = await fetch(`${endpoint.baseURL}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };
    this.trackUsage(sessionId, data.usage);
    return data;
  }

  private trackUsage(sessionId: string | undefined, usage: { prompt_tokens?: number; completion_tokens?: number } | undefined): void {
    if (!usage || !sessionId) return;
    const prompt = usage.prompt_tokens ?? 0;
    const completion = usage.completion_tokens ?? 0;
    const cur = this.usage.get(sessionId) ?? { promptTokens: 0, completionTokens: 0, estimatedCost: 0 };
    cur.promptTokens += prompt;
    cur.completionTokens += completion;
    // Conservative public pricing fallback (per 1M tokens).
    cur.estimatedCost += prompt * 0.2 + completion * 2.0;
    this.usage.set(sessionId, cur);
    this.lastUsageAt = Date.now();
    this.pushEvent(sessionId, {
      type: "usage",
      sessionID: sessionId,
      timestamp: Date.now(),
      promptTokens: cur.promptTokens,
      completionTokens: cur.completionTokens,
      estimatedCost: cur.estimatedCost / 1_000_000,
    });
  }

  private async authorizeTool(
    sessionId: string,
    tool: string,
    callID: string,
    input: unknown,
    req: RunTaskInput,
  ): Promise<boolean> {
    if (SAFE_TOOLS.has(tool)) return true;
    if (req.autoApprove) return true;

    const requestID = randomUUID();
    const decision = await new Promise<"allow-once" | "always" | "deny">((resolve) => {
      this.pendingPermission.set(requestID, { requestID, sessionID: sessionId, callID, tool, input, resolve });
      const request: PermissionRequest = { requestID, sessionID: sessionId, tool, callID, input };
      this.emit("permissionRequest", request);

      if (this.opts.permissionHandler) {
        void this.opts.permissionHandler(request).then(resolve);
      }
    });

    this.pushEvent(sessionId, {
      type: "permission.result",
      requestID,
      sessionID: sessionId,
      timestamp: Date.now(),
      decision,
    });
    return decision !== "deny";
  }

  /**
   * External decision resolution (renderer → main → bridge). Resolves the
   * pending permission promise for a requestID.
   */
  decidePermission(requestID: string, decision: "allow-once" | "always" | "deny"): void {
    const pending = this.pendingPermission.get(requestID);
    if (pending) {
      this.pendingPermission.delete(requestID);
      pending.resolve(decision);
    }
  }

  /** Look up the tool/call info behind a pending permission request (for "always" memory). */
  getPendingInfo(requestID: string): { tool: string; callID: string; input: unknown } | undefined {
    const pending = this.pendingPermission.get(requestID);
    return pending ? { tool: pending.tool, callID: pending.callID, input: pending.input } : undefined;
  }

  private async emitAssistantText(sessionId: string, text: string): Promise<void> {
    if (this.silentTexts.has(sessionId)) {
      this.silentTexts.set(sessionId, (this.silentTexts.get(sessionId) ?? "") + text);
      return;
    }
    this.turnText.set(sessionId, (this.turnText.get(sessionId) ?? "") + text);
    for (const chunk of splitChunks(text)) {
      this.pushEvent(sessionId, {
        type: "text",
        sessionID: sessionId,
        timestamp: Date.now(),
        part: { type: "text", text: chunk },
      });
    }
  }

  cancel(sessionId: string): void {
    const abort = this.aborts.get(sessionId);
    if (abort) abort.abort();
    this.setStatus(sessionId, "cancelled");
  }

  getSession(id: string): RideSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): RideSession[] {
    return [...this.sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getHistory(sessionId: string): unknown[] {
    return this.history.get(sessionId) ?? [];
  }

  /** Durable conversation turns (user + assistant) for this session. */
  getTurns(sessionId: string): Array<{ role: "user" | "assistant"; content: string }> {
    return this.turns.get(sessionId) ?? [];
  }

  getUsage(): { sessions: number; promptTokens: number; completionTokens: number; estimatedCost: number; lastEventAt: number } {
    let promptTokens = 0;
    let completionTokens = 0;
    let estimatedCost = 0;
    for (const u of this.usage.values()) {
      promptTokens += u.promptTokens;
      completionTokens += u.completionTokens;
      estimatedCost += u.estimatedCost;
    }
    return {
      sessions: this.usage.size,
      promptTokens,
      completionTokens,
      estimatedCost: estimatedCost / 1_000_000,
      lastEventAt: this.lastUsageAt,
    };
  }

  /** Backward-compatible plain streaming chat (used when no tools are requested). */
  private async chatStream(
    sessionId: string,
    endpoint: ModelEndpoint,
    messages: ChatMessage[],
    signal: AbortSignal,
    req: RunTaskInput,
  ): Promise<void> {
    if (req.quinn?.compactionBudget) {
      try {
        const compacted = await compactMessages(messages as unknown as CompactorMessage[], req.quinn.compactionBudget, {
          summarize: req.quinn.summarize,
          keepLast: 4,
        });
        if (compacted.messages.length !== messages.length || compacted.afterTokens !== compacted.beforeTokens) {
          messages.length = 0;
          messages.push(...(compacted.messages as unknown as ChatMessage[]));
        }
      } catch {
        /* best-effort */
      }
    }

    const res = await fetch(`${endpoint.baseURL}/chat/completions`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({
        model: endpoint.model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 8192,
      }),
    });

    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta ?? {};
          const text = delta?.content;
          if (typeof text === "string" && text.length) {
            if (this.silentTexts.has(sessionId)) {
              this.silentTexts.set(sessionId, (this.silentTexts.get(sessionId) ?? "") + text);
            } else {
              this.turnText.set(sessionId, (this.turnText.get(sessionId) ?? "") + text);
              this.pushEvent(sessionId, {
                type: "text",
                sessionID: sessionId,
                timestamp: Date.now(),
                part: { type: "text", text },
              });
            }
            const session = this.sessions.get(sessionId);
            if (session) {
              session.messageCount += 1;
              session.updatedAt = Date.now();
            }
          }
          const reasoning = delta?.reasoning_content;
          if (typeof reasoning === "string" && reasoning.length) {
            this.pushEvent(sessionId, {
              type: "thinking",
              sessionID: sessionId,
              timestamp: Date.now(),
              part: { type: "thinking", text: reasoning },
            });
          }
          this.trackUsage(sessionId, chunk.usage);
        } catch {
          /* non-JSON SSE line — ignore */
        }
      }
    }
  }

  private pushEvent(sessionId: string, ev: unknown): void {
    if (this.silentTexts.has(sessionId)) return;
    const list = this.history.get(sessionId) ?? [];
    list.push(ev);
    this.history.set(sessionId, list);
    this.emit("event", ev);
  }

  private setStatus(sessionId: string, status: RideSession["status"]): void {
    if (this.silentTexts.has(sessionId)) return;
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = status;
    session.updatedAt = Date.now();
    this.emit("sessionStatus", sessionId, status);
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function splitChunks(text: string, size = 120): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out.length ? out : [""];
}

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };