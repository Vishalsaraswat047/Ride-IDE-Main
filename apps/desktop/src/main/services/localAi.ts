import { EventEmitter } from "node:events";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import si from "systeminformation";
import {
  IpcChannel,
  LOCAL_MODEL_CATALOG,
  type InstalledLocalModel,
  type LocalAiStatus,
  type LocalAiTier,
  type LocalChatEvent,
  type LocalChatRequest,
  type PullProgress,
  type SystemInfo,
  type TaskType,
} from "@ride/contracts";
import { getSystemInfo, recommendModel } from "./hardware";
import { routeRequest, type RouteResult } from "./router";
import { settingsManager } from "./settings";
import { sendToRenderer } from "../index";

const exec = promisify(execFile);
const OLLAMA_URL = "http://127.0.0.1:11434";
const VERSION_POLL_MS = 500;
const VERSION_POLL_ATTEMPTS = 30;
const BUSY_LOAD_THRESHOLD = 85;
const LOW_BATTERY_THRESHOLD = 25;

type PullLine = {
  status?: string;
  progress?: number;
  total?: number;
  completed?: number;
  error?: string;
};

/**
 * Ollama runtime manager. Detects the binary, spawns `ollama serve` when the
 * server is installed but not running, then talks to the local HTTP API for
 * model listing, downloads, deletion and streaming chat.
 */
export class LocalAiService extends EventEmitter {
  private systemCache: { at: number; info: SystemInfo } | null = null;
  private idleUnloadTimer: NodeJS.Timeout | null = null;
  private loadedModel: string | null = null;

  async getStatus(): Promise<LocalAiStatus> {
    const [available, serverRunning, system] = await Promise.all([
      this.ollamaAvailable(),
      this.serverRunning(),
      this.systemInfo(),
    ]);
    const status: LocalAiStatus = {
      available,
      serverRunning,
      url: OLLAMA_URL,
      system,
      recommended: recommendModel(system),
      installed: [],
    };
    if (!available) {
      status.error = "Ollama is not installed. Install it to use local AI — RIDE can do this for you.";
    } else if (serverRunning) {
      status.installed = await this.listInstalled().catch(() => []);
    }
    return status;
  }

  /** Best-effort silent install via winget. Returns ok + human error if it fails. */
  async installRuntime(): Promise<{ ok: boolean; error?: string }> {
    try {
      await exec("winget", ["--version"], { timeout: 10_000, windowsHide: true });
    } catch {
      return { ok: false, error: "winget is not available — install Ollama manually from https://ollama.com/download" };
    }
    try {
      await exec("winget", ["install", "--id", "Ollama.Ollama", "-e", "--accept-source-agreements", "--accept-package-agreements", "--silent"], { timeout: 600_000, windowsHide: true, maxBuffer: 16 * 1024 * 1024 });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message.slice(0, 300) : String(err) };
    }
  }

  async pullModel(tag: string): Promise<void> {
    await this.ensureServer();
    const res = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tag, stream: true }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    await readNdjson(res, (line: PullLine) => {
      const ev: PullProgress = { tag, status: line.status ?? "unknown", progress: line.progress, total: line.total, completed: line.completed, error: line.error };
      this.emit("pullProgress", ev);
    });
  }

  async deleteModel(tag: string): Promise<void> {
    await this.ensureServer();
    const res = await fetch(`${OLLAMA_URL}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: tag }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  async chat(req: LocalChatRequest): Promise<void> {
    this.cancelIdleUnload();
    const guard = await this.guardCheck();
    const routed = await this.route(req, undefined);
    if (!routed) return;
    if (guard) {
      this.emit("chatEvent", { type: "done", requestId: req.requestId, content: guard });
      return;
    }
    if (routed.level0Reply) {
      this.emit("chatEvent", { type: "done", requestId: req.requestId, content: routed.level0Reply });
      return;
    }
    if (!routed.model) {
      this.emit("chatEvent", { type: "done", requestId: req.requestId, error: routed.decision.reason });
      return;
    }

    this.loadedModel = routed.model.ollamaTag;
    const installed = await this.listInstalled().catch(() => []);
    const tag = routed.model && installed.some((m) => m.name === routed.model!.ollamaTag) ? routed.model.ollamaTag : req.currentModel;
    try {
      await this.respond(req, tag, routed, 0);
      this.scheduleIdleUnload(tag);
    } catch (err) {
      if (this.shouldEscalateOnFailure()) {
        const next = nextInstalledTier(tag, installed);
        if (next) {
          this.emit("chatEvent", {
            type: "router",
            requestId: req.requestId,
            decision: { ...routed.decision, selectedModel: next, selectedTier: tierOf(next) ?? routed.decision.selectedTier, escalated: true, previousTier: routed.decision.selectedTier, reason: "Request failed — auto-escalated to the next installed model." },
          });
          this.loadedModel = next;
          try {
            await this.respond(req, next, routed, 0);
            this.scheduleIdleUnload(next);
            return;
          } catch (err2) {
            this.emit("chatEvent", { type: "done", requestId: req.requestId, error: err2 instanceof Error ? err2.message : String(err2) });
            return;
          }
        }
      }
      this.emit("chatEvent", { type: "done", requestId: req.requestId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  /** Performance Guard: pause local AI when the system is genuinely busy or the battery is critically low. */
  private async guardCheck(): Promise<string | null> {
    const ai = settingsManager.get().localAi;
    if (ai.mode === "performance" || ai.mode === "max") return null;
    const eco = ai.powerProfile === "eco";
    const system = await this.systemInfo();
    const battery = system.battery;
    if (battery?.hasBattery && battery.onBattery && battery.percent < (eco ? 40 : LOW_BATTERY_THRESHOLD)) {
      return `Battery critically low (${battery.percent}%) — local AI paused to protect the laptop. Plug in or switch the mode to Performance/Max, or disable Focus Mode.`;
    }
    try {
      const load = await si.currentLoad();
      const threshold = eco ? 70 : BUSY_LOAD_THRESHOLD;
      if (load.avgLoad > threshold) {
        return `System is busy (CPU at ${Math.round(load.avgLoad)}%) — local AI paused to keep the laptop responsive. Try again in a moment.`;
      }
    } catch {
      /* load probe unavailable — proceed */
    }
    return null;
  }

  /** Unload the model from RAM after an idle period (no LLM is kept resident). */
  private scheduleIdleUnload(tag: string): void {
    this.cancelIdleUnload();
    const ai = settingsManager.get().localAi;
    const eco = ai.powerProfile === "eco";
    const seconds = Math.max(eco ? 15 : 60, Math.min(ai.idleUnloadSec, ai.focusMode ? 60 : 300));
    this.idleUnloadTimer = setTimeout(() => {
      this.idleUnloadTimer = null;
      void this.unloadModel(tag);
    }, seconds * 1000);
  }

  private cancelIdleUnload(): void {
    if (this.idleUnloadTimer) {
      clearTimeout(this.idleUnloadTimer);
      this.idleUnloadTimer = null;
    }
  }

  private async unloadModel(tag: string): Promise<void> {
    try {
      await fetch(`${OLLAMA_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: tag, keep_alive: 0, prompt: "" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (this.loadedModel === tag) this.loadedModel = null;
    } catch {
      /* server may be stopped — nothing to unload */
    }
  }

  private async route(req: LocalChatRequest, forceModel: string | undefined): Promise<RouteResult | null> {
    const [system, installed, status] = await Promise.all([this.systemInfo(), this.listInstalled().catch(() => []), this.serverRunning()]);
    if (!status) return null;
    const routed = routeRequest(req, {
      system,
      installed,
      settings: settingsManager.get().localAi,
      forceModel,
    });
    this.emit("chatEvent", { type: "router", requestId: req.requestId, decision: routed.decision });
    return routed;
  }

  private async respond(req: LocalChatRequest, tag: string, routed: RouteResult, retry: number): Promise<void> {
    await this.ensureServer();
    const model = routed.model ?? null;
    const ai = settingsManager.get().localAi;
    let numCtx = Math.min(ai.contextLimit, (model?.ctxK ?? 32) * 1024, [8192, 4096, 2048][retry] ?? 2048);
    let numPredict = routed.decision.complexity === "level1" ? 400 : undefined;
    const profile = ai.powerProfile;
    if (profile === "eco") numCtx = Math.min(numCtx, 4096);
    if (profile === "performance") numCtx = Math.min(numCtx, ai.contextLimit, (model?.ctxK ?? 32) * 1024);
    if (ai.focusMode) {
      numCtx = Math.min(numCtx, 4096);
      numPredict = numPredict === undefined ? 600 : Math.min(numPredict, 600);
    }
    const temperature = taskTemperature(routed.decision.taskType);
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: tag,
        messages: req.messages.slice(-8),
        stream: true,
        keep_alive: "5m",
        options: {
          num_ctx: numCtx,
          temperature,
          num_predict: numPredict,
        },
      }),
    });
    if (!res.ok || !res.body) {
      if (retry < 2) return this.respond(req, tag, routed, retry + 1);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    let full = "";
    await readNdjson(res, (line) => {
      const msg = (line as { message?: { content?: string } }).message;
      if (msg?.content) {
        full += msg.content;
        this.emit("chatEvent", { type: "chunk", requestId: req.requestId, content: msg.content });
      }
      if ((line as { error?: string }).error) {
        const error = (line as { error: string }).error;
        if (retry < 2 && /context|memory|out of memory|oom/i.test(error)) {
          this.emit("chatEvent", { type: "done", requestId: req.requestId, content: full });
          throw new Error(error);
        }
        this.emit("chatEvent", { type: "done", requestId: req.requestId, error });
      }
      if ((line as { done?: boolean }).done) {
        this.emit("chatEvent", { type: "done", requestId: req.requestId, content: full });
      }
    });
  }

  private shouldEscalateOnFailure(): boolean {
    return settingsManager.get().localAi.autoEscalate;
  }

  private async systemInfo(): Promise<SystemInfo> {
    if (this.systemCache && Date.now() - this.systemCache.at < 60_000) return this.systemCache.info;
    const info = await getSystemInfo();
    this.systemCache = { at: Date.now(), info };
    return info;
  }

  private async ollamaAvailable(): Promise<boolean> {
    try {
      await exec("ollama", ["--version"], { timeout: 10_000, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }

  private async serverRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${OLLAMA_URL}/api/version`, { signal: AbortSignal.timeout(1500) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async ensureServer(): Promise<void> {
    if (!(await this.ollamaAvailable())) {
      throw new Error("Ollama is not installed — install it from the Models tab first.");
    }
    if (await this.serverRunning()) return;
    spawn("ollama", ["serve"], { detached: true, stdio: "ignore", windowsHide: true }).unref();
    for (let i = 0; i < VERSION_POLL_ATTEMPTS; i++) {
      await sleep(VERSION_POLL_MS);
      if (await this.serverRunning()) return;
    }
    throw new Error("Ollama server did not start. Check for a port conflict on 11434.");
  }

  private async listInstalled(): Promise<InstalledLocalModel[]> {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name?: string; size?: number }> };
    return (data.models ?? []).map((m) => ({
      name: m.name ?? "unknown",
      sizeGB: round1((m.size ?? 0) / 1e9),
    }));
  }
}

async function readNdjson(res: Response, onLine: (obj: Record<string, unknown>) => void): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("Ollama returned an empty stream");
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try {
          onLine(JSON.parse(line) as Record<string, unknown>);
        } catch {
          /* skip malformed line */
        }
      }
      nl = buf.indexOf("\n");
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Task-adaptive sampling — deterministic tasks want colder, chat warmer. */
function taskTemperature(taskType: TaskType): number {
  switch (taskType) {
    case "codeCompletion":
    case "bugFix":
    case "refactoring":
      return 0.1;
    case "explanation":
    case "documentation":
      return 0.3;
    case "chat":
      return 0.6;
    default:
      return 0.4;
  }
}

/** Next installed model tier strictly above the given tag's tier. */
function nextInstalledTier(tag: string, installed: InstalledLocalModel[]): string | null {
  const current = tierOf(tag);
  const tiers: LocalAiTier[] = ["lite", "standard", "developer", "pro", "max"];
  const next = tiers.slice(tiers.indexOf(current) + 1);
  for (const t of next) {
    const catalogTag = LOCAL_MODEL_CATALOG.find((m) => m.tier === t)?.ollamaTag;
    const hit = catalogTag ? installed.find((m) => m.name === catalogTag) : undefined;
    if (hit) return hit.name;
  }
  return null;
}

function tierOf(tag: string): LocalAiTier {
  return LOCAL_MODEL_CATALOG.find((m) => m.ollamaTag === tag)?.tier ?? "standard";
}

export const localAiService = new LocalAiService();

export function wireLocalAiBroadcasts(): void {
  localAiService.on("pullProgress", (ev: PullProgress) => sendToRenderer(IpcChannel.localAi.pullProgress, ev));
  localAiService.on("chatEvent", (ev: LocalChatEvent) => sendToRenderer(IpcChannel.localAi.chatEvent, ev));
}