import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { RideSession, RunTaskRequest, AgentEvent } from "@ride/contracts";
import { AgentBridge, type RunTaskInput, type ToolRuntime } from "@ride/agent-bridge";
import type { PermissionRequest as BridgePermissionRequest } from "@ride/agent-bridge";
import { providerRegistry } from "../provider";
import { modelService, type ModelConfiguration } from "../model";
import { credentialService } from "../credential";

export interface AgentServiceEvents {
  sessionStarted: (session: RideSession) => void;
  sessionStatus: (sessionId: string, status: RideSession["status"]) => void;
  event: (event: AgentEvent) => void;
  permissionRequest: (request: PermissionRequest) => void;
  done: (sessionId: string, ok: boolean) => void;
}

export interface PermissionRequest {
  requestID: string;
  sessionID: string;
  tool: string;
  callID: string;
  input: unknown;
  impact: "low" | "medium" | "high";
  summary: string;
}

export interface AgentContext {
  workspaceRoot: string;
  activeFile?: string;
  selectedText?: string;
  openFiles: string[];
  gitStatus?: unknown;
  projectType?: string;
}

export class AgentService extends EventEmitter {
  private bridge: AgentBridge;
  private sessions = new Map<string, RideSession>();
  private aborts = new Map<string, AbortController>();
  private pendingPermissions = new Map<string, PermissionRequest>();
  private permissionHandler?: (req: PermissionRequest) => Promise<"allow-once" | "always" | "deny">;

  constructor() {
    super();
    
    this.bridge = new AgentBridge({
      permissionHandler: async (req) => {
        return this.handlePermissionRequest(req);
      },
    });

    this.bridge.on("sessionStarted", (session) => this.onSessionStarted(session));
    this.bridge.on("sessionStatus", (sessionId, status) => this.onSessionStatus(sessionId, status));
    this.bridge.on("event", (event) => this.emit("event", event));
    this.bridge.on("permissionRequest", (request) => this.onPermissionRequest(request));
    this.bridge.on("done", (sessionId, ok) => this.onDone(sessionId, ok));
  }

  setPermissionHandler(handler: (req: PermissionRequest) => Promise<"allow-once" | "always" | "deny">): void {
    this.permissionHandler = handler;
  }

  private async handlePermissionRequest(req: BridgePermissionRequest): Promise<"allow-once" | "always" | "deny"> {
    if (this.permissionHandler) {
      return this.permissionHandler(req as PermissionRequest);
    }
    return "deny";
  }

  private onSessionStarted(session: RideSession): void {
    this.sessions.set(session.id, session);
    this.emit("sessionStarted", session);
  }

  private onSessionStatus(sessionId: string, status: RideSession["status"]): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      session.updatedAt = Date.now();
    }
    this.emit("sessionStatus", sessionId, status);
  }

  private onPermissionRequest(request: BridgePermissionRequest): void {
    this.pendingPermissions.set(request.requestID, request as PermissionRequest);
    this.emit("permissionRequest", request as PermissionRequest);
  }

  private onDone(sessionId: string, ok: boolean): void {
    this.aborts.delete(sessionId);
    this.emit("done", sessionId, ok);
  }

  async runTask(req: RunTaskRequest, context: AgentContext): Promise<string> {
    const sessionId = req.sessionId ?? randomUUID();
    const modelConfig = this.resolveModel(req.model, context);
    
    if (!modelConfig) {
      throw new Error("No model configured. Please select a model in Settings → AI Models.");
    }

    const provider = providerRegistry.getProvider(modelConfig.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${modelConfig.providerId}`);
    }

    const apiKey = provider.authentication.type === "api_key" && provider.authentication.apiKeyName
      ? await credentialService.get(provider.authentication.apiKeyName)
      : undefined;

    if (provider.authentication.type === "api_key" && !apiKey) {
      throw new Error(`API key not configured for ${provider.displayName}. Add it in Settings → API Keys.`);
    }

    const endpoint = {
      baseURL: provider.baseUrl ?? "",
      apiKey: apiKey ?? "",
      model: modelConfig.modelId,
    };

    const toolRuntime = this.createToolRuntime(context);

    const input: RunTaskInput = {
      ...req,
      sessionId,
      endpoint,
      tools: toolRuntime,
    };

    const handle = this.bridge.runTask(input);
    return handle.sessionId;
  }

  private resolveModel(modelId?: string, context?: AgentContext): ModelConfiguration | undefined {
    if (modelId) {
      for (const config of modelService.getConfigurations()) {
        if (config.modelId === modelId || config.id === modelId) {
          return config;
        }
      }
    }

    if (context?.projectType) {
      return modelService.resolveModelForTask(context.projectType, {
        projectType: context.projectType,
        fileType: context.activeFile?.split(".").pop(),
      });
    }

    return modelService.getDefaultModel();
  }

  private createToolRuntime(context: AgentContext): ToolRuntime {
    return {
      resolve: async (tool: string, input: unknown) => {
        // This will be implemented by the main process IPC handlers
        return { ok: true, output: `Tool ${tool} executed` };
      },
    };
  }

  cancel(sessionId: string): void {
    this.bridge.cancel(sessionId);
  }

  getSession(id: string): RideSession | undefined {
    return this.sessions.get(id);
  }

  listSessions(): RideSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  getHistory(sessionId: string): unknown[] {
    return this.bridge.getHistory(sessionId);
  }

  decidePermission(requestID: string, decision: "allow-once" | "always" | "deny"): void {
    this.bridge.decidePermission(requestID, decision);
  }

  getPendingPermission(requestID: string): PermissionRequest | undefined {
    return this.pendingPermissions.get(requestID);
  }

  getBridge(): AgentBridge {
    return this.bridge;
  }
}

export const agentService = new AgentService();