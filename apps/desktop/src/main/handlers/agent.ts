import { ipcMain, app } from "electron";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { IpcChannel, type PermissionDecision, type RunTaskRequest } from "@ride/contracts";
import { AgentBridge, resolveOpencodeBin, SAFE_TOOLS } from "@ride/agent-bridge";
import { resolveEndpoint } from "@ride/model-router";
import { redactSecrets, type PermissionDecisionRequest } from "@ride/permissions";
import type { WorkspaceManager } from "../services/workspace";
import { buildToolResolver, mcpBridge } from "../services/agentTools";
import { createSkillLoader } from "../services/skills";
import { settingsManager } from "../services/settings";
import { providerRegistry } from "../services/provider";
import { modelService } from "../services/model";
import { credentialService } from "../services/credential";
import { buildQuinnOptions, memoryContextFor, persistSessionMemory } from "../services/quinn";
import { sendToRenderer } from "../index";
import { getPolicy } from "./workspace";

const exec = promisify(execFile);

export const agentBridge = new AgentBridge();

const PROJECT_RULE_FILES = ["RIDE.md", "AGENTS.md", "ride.md"];

/** Read project rules (RIDE.md / AGENTS.md) from the workspace root, if any. */
export async function loadProjectRules(cwd: string): Promise<string | null> {
  for (const name of PROJECT_RULE_FILES) {
    try {
      const content = await readFile(join(cwd, name), "utf8");
      if (content.trim()) return content.trim().slice(0, 8000);
    } catch {
      /* missing */
    }
  }
  return null;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with", "from", "at", "by", "is", "are",
  "was", "were", "be", "been", "it", "this", "that", "these", "those", "my", "your", "our", "their",
  "please", "can", "you", "me", "there", "how", "what", "why", "when", "where", "who", "which", "all",
  "any", "some", "into", "about", "do", "does", "did", "have", "has", "had", "using", "use", "make",
  "build", "fix", "add", "need", "want", "should", "could", "would", "then", "than",
]);

function extractKeywords(prompt: string, limit = 5): string[] {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9_$.\-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
  return [...new Set(words)].slice(0, limit);
}

/** Attach RIDE.md project rules + relevant indexed files to the user prompt. */
export async function enrichPrompt(cwd: string, prompt: string, files?: string[]): Promise<string> {
  const parts: string[] = [];

  const rules = await loadProjectRules(cwd);
  if (rules) {
    parts.push(`<project-rules from RIDE.md>\n${rules}\n</project-rules>`);
  }

  if (files?.length) {
    parts.push(
      `<attached-files>\n${files
        .map((f) => `- ${f}`)
        .join("\n")}\n</attached-files>`,
    );
  }

  return parts.length ? `${parts.join("\n\n")}\n\n${prompt}` : prompt;
}

/** Relevant-file context from the project index (cheap FTS keyword pick). */
export async function addCodebaseContext(workspace: WorkspaceManager, prompt: string): Promise<string> {
  try {
    const db = workspace.projectDb;
    if (!db) return prompt;
    const keywords = extractKeywords(prompt);
    if (keywords.length === 0) return prompt;
    const hits = db.contextForTask(keywords, 8);
    if (hits.length === 0) return prompt;
    const body = hits
      .map((h) => `### ${h.path}\n${h.snippet}`)
      .join("\n\n");
    return `${prompt}\n\n<project-context (relevant files)>\n${body}\n</project-context>`;
  } catch {
    return prompt;
  }
}

function autoDecide(req: {
  tool: string;
  input: unknown;
  sessionID: string;
  callID: string;
}): "allow-once" | "deny" | "ask" | null {
  const security = settingsManager.get().security;
  const mode = security.agentPermission;
  const engine = getPolicy();

  try {
    const outcome = engine.evaluate({ tool: req.tool, callID: req.callID, input: req.input, sessionID: req.sessionID });
    if (outcome.kind === "allow-once") return "allow-once";
    if (outcome.kind === "deny") return "deny";

    switch (mode) {
      case "autonomous":
        return "allow-once";
      case "allowSafe": {
        if (SAFE_TOOLS.has(req.tool)) return "allow-once";
        if (req.tool === "bash") return "allow-once";
        if (req.tool === "git") return "allow-once";
        const path = (req.input as Record<string, unknown> | null)?.filePath ?? (req.input as Record<string, unknown> | null)?.path;
        if (typeof path === "string" && engine.isInsideWorkspace(path)) return "allow-once";
        if (req.tool === "write" || req.tool === "create" || req.tool === "rename") return "allow-once";
        return "ask";
      }
      case "destructiveOnly": {
        const assessment = engine.assess({ tool: req.tool, input: req.input, sessionID: req.sessionID });
        return assessment.impact === "high" ? "ask" : "allow-once";
      }
      default:
        return "ask";
    }
  } catch {
    return "ask";
  }
}

function wireBridge(workspace: WorkspaceManager): void {
  agentBridge.on("event", (ev) => {
    const safe = redactSecrets(typeof ev === "string" ? ev : JSON.stringify(ev));
    const parsed = typeof ev === "string" ? safe : JSON.parse(safe);
    sendToRenderer(IpcChannel.agent.events, parsed);

    // Durable decision memory: "always allow" rules become project memory.
    if ((parsed as { type?: string })?.type === "permission.result") {
      const pr = parsed as { decision?: string; tool?: string; sessionID?: string };
      if (pr.decision === "always" && pr.tool && pr.sessionID) {
        try {
          workspace.projectDb?.recordAgentDecision(pr.sessionID, `allow always: ${pr.tool}`);
        } catch {
          /* best-effort */
        }
      }
    }
  });

  agentBridge.on("sessionStarted", (session) => {
    sendToRenderer(IpcChannel.agent.events, { type: "session.started", session });
    try {
      workspace.projectDb?.saveSession({ ...session, messageCount: session.messageCount ?? 0 });
    } catch {
      /* best-effort */
    }
  });

  agentBridge.on("sessionStatus", (sessionId, status) => {
    sendToRenderer(IpcChannel.agent.events, { type: "session.status", sessionID: sessionId, status });
  });

  agentBridge.on("done", (sessionId, ok) => {
    try {
      const db = workspace.projectDb;
      if (!db || !settingsManager.get().quinn.projectMemory) return;
      const session = agentBridge.getSession(sessionId);
      if (session) {
        db.saveSession({ ...session, status: ok ? "completed" : session.status, messageCount: session.messageCount ?? 0 });
      }
      if (ok) {
        persistSessionMemory(db, sessionId, agentBridge.getTurns(sessionId));
      }
    } catch {
      /* memory is best-effort */
    }
  });

  // RIDE permission layer: policy + user-mode gating for every tool call.
  agentBridge.on("permissionRequest", (req) => {
    const requestID = req.requestID;
    let impact: PermissionDecisionRequest["impact"] = "low";
    let summary = "";

    try {
      const engine = getPolicy();
      const assessment = engine.assess({ tool: req.tool, input: req.input, sessionID: req.sessionID });
      impact = assessment.impact;
      summary = assessment.summary;

      const decision = autoDecide({ tool: req.tool, input: req.input, sessionID: req.sessionID, callID: req.callID });
      if (decision === "allow-once") {
        agentBridge.decidePermission(requestID, decision);
        return;
      }
      if (decision === "deny") {
        agentBridge.decidePermission(requestID, "deny");
        return;
      }
    } catch {
      /* policy not ready — ask user */
    }

    sendToRenderer(IpcChannel.agent.events, {
      type: "permission.request",
      requestID,
      sessionID: req.sessionID,
      timestamp: Date.now(),
      tool: req.tool,
      callID: req.callID,
      input: req.input,
      impact,
      summary,
    });
  });
}

export function registerAgentHandlers(workspace: WorkspaceManager): void {
  wireBridge(workspace);

  ipcMain.handle(IpcChannel.agent.runTask, async (_e, req: RunTaskRequest) => {
    const ai = settingsManager.get().ai;
    let modelId = req.model;
    let endpoint = modelId ? resolveEndpoint(modelId, ai) : undefined;
    
    // If no model specified, use the default from model service (configured providers)
    if (!modelId) {
      const defaultConfig = modelService.getDefaultModel();
      if (defaultConfig) {
        modelId = `${defaultConfig.providerId}:${defaultConfig.modelId}`;
        const provider = providerRegistry.getProvider(defaultConfig.providerId);
        if (provider) {
          const model = provider.models.find(m => m.id === defaultConfig.modelId);
          if (model) {
            const apiKeyName = provider.authentication.apiKeyName ?? "";
            let apiKey = "";
            if (provider.authentication.type === "api_key" && apiKeyName) {
              const { credentialService } = await import("../services/credential");
              const key = await credentialService.get(apiKeyName);
              apiKey = key ?? "";
            }
            endpoint = {
              baseURL: provider.baseUrl ?? "",
              apiKey,
              model: model.id,
            };
          }
        }
      } else {
        // Fallback to AI settings default
        modelId = ai.defaultModel;
        endpoint = resolveEndpoint(modelId, ai);
      }
    }
    
    const cwd = req.cwd || app.getPath("home");

    let prompt = await enrichPrompt(cwd, req.prompt, req.files);
    prompt = await addCodebaseContext(workspace, prompt);

    // Project memory: prior decisions + session summaries from the index.
    const memory = memoryContextFor(workspace.projectDb);
    if (memory) {
      prompt = `${prompt}\n\n${memory}`;
      agentBridge.emit("event", {
        type: "memory",
        sessionID: req.sessionId ?? "pending",
        timestamp: Date.now(),
        note: "Loaded project memory (prior decisions and session summaries).",
      });
    }

    // Native tool loop when a workspace is open; plain chat otherwise.
    let tools: ReturnType<typeof buildToolResolver> | undefined;
    try {
      if (workspace.root) tools = buildToolResolver(workspace);
    } catch {
      tools = undefined;
    }

    agentBridge.runTask({
      ...req,
      prompt,
      model: modelId,
      endpoint,
      cwd,
      autoApprove: req.autoApprove || ai.agentAutoApprove || settingsManager.get().security.agentPermission === "autonomous",
      tools,
      skills: createSkillLoader(workspace),
      mcp: mcpBridge(),
      quinn: buildQuinnOptions({ prompt: req.prompt, endpoint, workspace }),
    });
    return { started: true };
  });

  ipcMain.handle(IpcChannel.agent.cancel, (_e, sessionId: string) => {
    agentBridge.cancel(sessionId);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.agent.listSessions, () => {
    return agentBridge.listSessions();
  });

  ipcMain.handle(IpcChannel.agent.sessionHistory, (_e, sessionId: string) => {
    return agentBridge.getHistory(sessionId);
  });

  ipcMain.handle(IpcChannel.agent.usage, () => {
    return agentBridge.getUsage();
  });

  ipcMain.handle(IpcChannel.agent.decide, async (_e, payload: PermissionDecision) => {
    const info = agentBridge.getPendingInfo(payload.requestID);
    agentBridge.decidePermission(payload.requestID, payload.decision);
    if (info) {
      try {
        getPolicy().remember(payload.requestID, payload, info);
      } catch {
        /* policy not ready */
      }
    }
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.agent.listModels, async () => {
    return modelService.getModelsForUI();
  });

  ipcMain.handle(IpcChannel.agent.checkDeps, async () => {
    let opencode = false;
    let opencodeVersion = "";
    try {
      await exec(resolveOpencodeBin(), ["--version"]);
      const { stdout } = await exec(resolveOpencodeBin(), ["--version"], { encoding: "utf8" });
      opencode = true;
      opencodeVersion = stdout.trim();
    } catch {
      /* missing */
    }
    let ollama = false;
    try {
      await exec("ollama", ["--version"]);
      ollama = true;
    } catch {
      /* missing */
    }
    return { opencode, opencodeVersion, ollama };
  });
}