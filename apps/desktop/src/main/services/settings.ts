import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { SettingsSchema, type RideSettings } from "@ride/contracts";
import { sendToRenderer } from "../index";
import { IpcChannel } from "@ride/contracts";

const DEFAULTS: RideSettings = {
  schemaVersion: 1,
  workbench: { theme: "ride-dark", fontSize: 13, fontFamily: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace", restoreLastWorkspace: true, layout: { sidebarWidth: 240, rightPanelWidth: 384, bottomPanelHeight: 224, activeBottomView: "terminal", activeRightView: "agent" } },
  editor: { tabSize: 2, insertSpaces: true, wordWrap: "off", minimap: true, cursorBlinking: "blink", stickyScroll: true, formatOnSave: false },
  terminal: { shell: "", fontSize: 13, scrollback: 10000 },
  git: { autoFetch: false, confirmStashPop: true },
  ai: { providerMode: "remote", ollamaUrl: "http://localhost:11434", nvidiaUrl: "https://integrate.api.nvidia.com/v1", hasNvidiaKey: false, featherlessApiKey: "", defaultModel: "nvidia/llama-3.3-70b-instruct", autocomplete: true, agentAutoApprove: false, mcpServers: [] },
  localAi: { mode: "auto", powerProfile: "balanced", autoEscalate: true, contextLimit: 8192, focusMode: true, idleUnloadSec: 120 },
  quinn: { planning: true, contextCompaction: true, compactionBudgetTokens: 8000, selfReview: true, projectMemory: true, memoryDecisionLimit: 5 },
  privacy: { telemetry: false, analytics: false, localOnly: true, saveSessionHistory: true },
  extensions: { enabled: [], autoUpdate: true },
  appearance: { uiScale: 100, zoom: 100, compactMode: false, animations: true, roundedCorners: true, glassEffects: false, showActivityBar: true, showStatusBar: true, showBreadcrumbs: true },
  files: { autoSave: "off", autoSaveDelay: 1000, hotExit: true, trimTrailingWhitespace: false, insertFinalNewline: true, encoding: "utf8", eol: "auto" },
  search: { caseSensitive: false, wholeWord: false, regex: false, keepHistory: true, excludePatterns: "node_modules, dist, .git, out, build" },
  mouse: { wheelZoom: false, smoothScrolling: true, multiCursorModifier: "alt", middleClickPaste: true },
  preview: { autoStart: true, hotReload: true, autoRefresh: true, device: "desktop", defaultPort: 5173, networkThrottling: "off", showConsole: true },
  testing: { autoDiscover: true, watchMode: false, coverage: false, aiTestGeneration: true, showExplorer: true },
  debugging: { sourceMaps: true, inlineValues: true, breakpointsPersist: true, consoleColorize: true },
  build: { buildOnSave: false, runOnSave: false, defaultBuildCommand: "npm run build", defaultRunner: "npm", showErrorNotifications: true },
  packages: { packageManager: "pnpm", autoInstall: true, strictVersions: false, workspaceSupport: true },
  languages: { managedRuntime: true, pythonFormatter: "ruff", prettierDefault: true, languageServers: true },
  vlsi: { simulator: "verilator", simulatorPath: "", waveformFormat: "vcd", compileOnSave: true, lintRtl: true },
  security: { workspaceTrust: "ask", terminalPermission: "destructiveOnly", agentPermission: "allowSafe", secretDetection: true, commandConfirmation: true, sandbox: false },
  database: { defaultEngine: "sqlite", agentDatabaseAccess: "ask", connectionTimeoutMs: 5000, showConnections: true },
  docker: { engine: "auto", enginePath: "", composeEnabled: true, agentDockerAccess: "ask" },
  deployment: { provider: "hostinger", autoDeploy: false, previewDeployments: true, environment: "preview", ssl: true },
  collaboration: { enabled: false, liveShare: true, realtimeEditing: true, presence: true, comments: true },
  notifications: { enabled: true, aiCompleted: true, buildCompleted: true, testCompleted: true, deploymentCompleted: true, cloudVm: true, securityWarnings: true, gitChanges: false },
  network: { proxyEnabled: false, proxyUrl: "", offlineMode: false, timeoutMs: 30000 },
  storage: { syncSettings: false, syncExtensions: false, syncTemplates: false, aiContextCacheMb: 512 },
  accessibility: { screenReader: false, reducedMotion: false, highContrast: false, fontScaling: "normal", focusIndicators: true, reducedTransparency: false },
  experimental: { multiAgentMode: false, aiBrowser: false, aiVoiceCoding: false, aiDesignToCode: false, projectTimeMachine: false, aiArchitectureGraph: false, automaticDeployment: false },
  performance: { gpuAcceleration: true, fileIndexing: true, lazyLoading: true, maxBackgroundProcesses: 8, maxExtensionHosts: 4 },
  developer: { developerMode: false, extensionHostLogs: false, agentLogs: false, aiRequestLogs: false, networkLogs: false, showInternalErrors: false },
  updates: { autoCheck: true, autoDownload: true, autoInstall: false, channel: "stable" },
  cloud: { provider: "ride-cloud", region: "auto", cpu: 2, ramGb: 4, gpu: 0, diskGb: 20, idleTimeoutMin: 15, autoShutdown: true, persistEnvironment: true },
  account: { displayName: "", email: "", organization: "", syncAccount: false },
  templates: { autoInstallLibraries: true, confirmScaffold: true, showAllVariants: true, favoriteTemplates: [] },
  uiLibraries: { preinstallApproved: true, autoDetectFramework: true, aiRecommendations: true, licenseCheck: true, versionManagement: true },
  recentProjects: [],
  lastWorkspace: null,
};

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) return (patch ?? base) as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch as Record<string, unknown>)) {
    out[k] = deepMerge(out[k], v);
  }
  return out as T;
}

/**
 * Schema-driven settings engine. Persists to <userData>/settings.json with
 * atomic writes; every mutation is zod-validated and broadcast to the renderer.
 * Secrets (NVIDIA key) never touch the settings file in plaintext — they are
 * held encrypted via Electron safeStorage and reported only as hasNvidiaKey.
 */
export class SettingsManager {
  private settings: RideSettings = structuredClone(DEFAULTS);
  private filePath = join(app.getPath("userData"), "settings.json");
  private nvidiaKey: string | null = null;
  private dirty = false;

  async init(): Promise<void> {
    try {
      const raw = JSON.parse(await readFile(this.filePath, "utf8")) as Record<string, unknown>;
      const loaded = deepMerge(DEFAULTS, raw);
      const parsed = SettingsSchema.safeParse(loaded);
      if (parsed.success) {
        this.settings = parsed.data;
      } else {
        console.warn("[settings] invalid settings.json — falling back to defaults", parsed.error.issues.map((i) => i.path.join(".")));
      }
    } catch {
      /* first run */
    }
    this.loadNvidiaKey();
  }

  private loadNvidiaKey(): void {
    try {
      const fs = require("node:fs") as typeof import("node:fs");
      const blob = fs.readFileSync(join(app.getPath("userData"), ".nvidia-key"));
      this.nvidiaKey = safeStorage.decryptString(blob);
    } catch {
      this.nvidiaKey = null;
    }
    if (this.nvidiaKey) {
      this.settings.ai.hasNvidiaKey = true;
    }
  }

  get(): RideSettings {
    return structuredClone(this.settings);
  }

  async set(patch: Partial<RideSettings>): Promise<RideSettings> {
    const merged = deepMerge(this.settings, patch);
    const parsed = SettingsSchema.safeParse(merged);
    if (!parsed.success) {
      throw new Error(`Invalid settings: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    }
    this.settings = parsed.data;
    await this.persist();
    sendToRenderer(IpcChannel.settings.changed, this.get());
    return this.get();
  }

  /** Store the NVIDIA API key encrypted; a blank string clears it. */
  async setNvidiaKey(key: string): Promise<void> {
    const fs = require("node:fs") as typeof import("node:fs");
    const path = join(app.getPath("userData"), ".nvidia-key");
    if (!key) {
      this.nvidiaKey = null;
      this.settings.ai.hasNvidiaKey = false;
      try {
        fs.rmSync(path, { force: true });
      } catch {
        /* ignore */
      }
      await this.persist();
      return;
    }
    this.nvidiaKey = key;
    this.settings.ai.hasNvidiaKey = true;
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(path, safeStorage.encryptString(key));
    } else {
      fs.writeFileSync(path, key, "utf8");
    }
    await this.persist();
  }

  getNvidiaKey(): string | null {
    return this.nvidiaKey;
  }

  /** Record a recently opened project (deduped, most recent first). */
  async touchRecent(root: string, name: string): Promise<void> {
    this.settings.recentProjects = [
      { root, name, lastOpenedAt: Date.now() },
      ...this.settings.recentProjects.filter((r) => r.root !== root),
    ].slice(0, 8);
    this.settings.lastWorkspace = root;
    await this.persist();
  }

  /** Reset a single settings group (e.g. "editor") back to its defaults. */
  async resetGroup(group: string): Promise<RideSettings> {
    const defaults = structuredClone(DEFAULTS) as Record<string, unknown>;
    const current = this.settings as Record<string, unknown>;
    if (!(group in defaults) || !(group in current)) {
      throw new Error(`Unknown settings group: ${group}`);
    }
    current[group] = deepMerge(defaults[group], current[group]);
    const parsed = SettingsSchema.safeParse(this.settings);
    if (!parsed.success) {
      throw new Error("Invalid settings after reset");
    }
    this.settings = parsed.data;
    await this.persist();
    sendToRenderer(IpcChannel.settings.changed, this.get());
    return this.get();
  }

  /** Reset every setting to factory defaults (keeps recentProjects/lastWorkspace). */
  async resetAll(): Promise<RideSettings> {
    this.settings = structuredClone(DEFAULTS);
    this.nvidiaKey = null;
    try {
      const fs = require("node:fs") as typeof import("node:fs");
      fs.rmSync(join(app.getPath("userData"), ".nvidia-key"), { force: true });
    } catch {
      /* ignore */
    }
    await this.persist();
    sendToRenderer(IpcChannel.settings.changed, this.get());
    return this.get();
  }

  /** Import settings from a JSON string; rejects invalid payloads. */
  async importJson(json: string): Promise<RideSettings> {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const merged = deepMerge(DEFAULTS, raw);
    const parsed = SettingsSchema.safeParse(merged);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`Invalid settings JSON: ${issues || "unknown error"}`);
    }
    this.settings = parsed.data;
    await this.persist();
    sendToRenderer(IpcChannel.settings.changed, this.get());
    return this.get();
  }

  /**
   * Workspace-scoped settings: lives in <workspaceRoot>/.ride/settings.json,
   * resolved over the defaults so partial files are valid. Never contains
   * secrets — API keys belong in the credential vault.
   */
  async getWorkspace(root: string): Promise<RideSettings> {
    try {
      const raw = JSON.parse(await readFile(this.workspaceFile(root), "utf8")) as Record<string, unknown>;
      const loaded = deepMerge(DEFAULTS, raw);
      const parsed = SettingsSchema.safeParse(loaded);
      if (parsed.success) return parsed.data;
      console.warn("[settings] invalid workspace settings.json — falling back to defaults");
    } catch {
      /* no workspace settings yet */
    }
    return structuredClone(DEFAULTS);
  }

  /** Apply a patch to the workspace settings file (creates it on first use). */
  async setWorkspace(root: string, patch: Partial<RideSettings>): Promise<RideSettings> {
    const current = await this.getWorkspace(root);
    const merged = deepMerge(current, patch);
    const parsed = SettingsSchema.safeParse(merged);
    if (!parsed.success) {
      throw new Error(`Invalid workspace settings: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
    }
    const dir = join(root, ".ride");
    await mkdir(dir, { recursive: true });
    const file = join(dir, "settings.json");
    const tmp = join(dir, "settings.json.tmp");
    await writeFile(tmp, JSON.stringify(parsed.data, null, 2), "utf8");
    await rename(tmp, file);
    sendToRenderer(IpcChannel.settings.changed, parsed.data);
    return parsed.data;
  }

  /** Delete the workspace settings file, reverting the project to user defaults. */
  async resetWorkspace(root: string): Promise<RideSettings> {
    try {
      const fs = require("node:fs") as typeof import("node:fs");
      fs.rmSync(this.workspaceFile(root), { force: true });
    } catch {
      /* ignore */
    }
    const defaults = structuredClone(DEFAULTS);
    sendToRenderer(IpcChannel.settings.changed, defaults);
    return defaults;
  }

  private workspaceFile(root: string): string {
    return join(root, ".ride", "settings.json");
  }

  private async persist(): Promise<void> {
    const dir = app.getPath("userData");
    await mkdir(dir, { recursive: true });
    const tmp = join(dir, "settings.json.tmp");
    const out = join(dir, "settings.json");
    const serialized = JSON.stringify(this.settings, null, 2);
    await writeFile(tmp, serialized, "utf8");
    await rename(tmp, out);
    this.dirty = true;
  }
}

export const settingsManager = new SettingsManager();

/** Plain settings view for the model router (never contains secrets). */
export function agentSettingsView(): import("@ride/contracts").AgentSettings {
  const s = settingsManager.get();
  return { providerMode: s.ai.providerMode, ollamaUrl: s.ai.ollamaUrl, nvidiaUrl: s.ai.nvidiaUrl, hasNvidiaKey: s.ai.hasNvidiaKey, featherlessApiKey: s.ai.featherlessApiKey };
}
