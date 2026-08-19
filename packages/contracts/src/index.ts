import { z } from "zod";

// ─── Core primitives ───────────────────────────────────────────────────────

export const AgentEventType = z.enum([
  "session.started",
  "step.start",
  "text",
  "thinking",
  "tool_use",
  "tool_result",
  "step.finish",
  "session.updated",
  "permission.request",
  "permission.result",
  "usage",
  "error",
  "done",
  "artifact.created",
  "artifact.updated",
  "artifact.feedback",
  "plan",
  "compacted",
  "review",
  "memory",
]);

export type AgentEventType = z.infer<typeof AgentEventType>;

export const ToolStateSchema = z.object({
  status: z.enum(["running", "completed", "cancelled", "failed"]),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export const ToolUsePartSchema = z.object({
  type: z.literal("tool"),
  tool: z.string(),
  callID: z.string(),
  state: ToolStateSchema,
  title: z.string().optional(),
});

export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("session.started"), sessionID: z.string(), timestamp: z.number(), model: z.string().optional() }),
  z.object({ type: z.literal("step.start"), sessionID: z.string(), timestamp: z.number(), part: z.any() }),
  z.object({
    type: z.literal("text"),
    sessionID: z.string(),
    timestamp: z.number(),
    messageID: z.string().optional(),
    part: z.object({ type: z.string(), text: z.string() }).passthrough(),
  }),
  z.object({
    type: z.literal("thinking"),
    sessionID: z.string(),
    timestamp: z.number(),
    messageID: z.string().optional(),
    part: z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
  }),
  z.object({
    type: z.literal("tool_use"),
    sessionID: z.string(),
    timestamp: z.number(),
    messageID: z.string().optional(),
    part: ToolUsePartSchema.passthrough(),
  }),
  z.object({ type: z.literal("tool_result"), sessionID: z.string(), timestamp: z.number(), callID: z.string(), output: z.unknown() }),
  z.object({
    type: z.literal("step.finish"),
    sessionID: z.string(),
    timestamp: z.number(),
    part: z
      .object({ reason: z.string(), tokens: z.any().optional(), cost: z.number().optional() })
      .passthrough(),
  }),
  z.object({ type: z.literal("session.updated"), sessionID: z.string(), timestamp: z.number(), data: z.unknown() }),
  z.object({
    type: z.literal("permission.request"),
    requestID: z.string(),
    sessionID: z.string(),
    timestamp: z.number(),
    tool: z.string(),
    callID: z.string(),
    input: z.unknown(),
    impact: z.enum(["low", "medium", "high"]),
    summary: z.string(),
  }),
  z.object({
    type: z.literal("permission.result"),
    requestID: z.string(),
    sessionID: z.string(),
    timestamp: z.number(),
    decision: z.enum(["allow-once", "always", "deny"]),
  }),
  z.object({
    type: z.literal("usage"),
    sessionID: z.string(),
    timestamp: z.number(),
    promptTokens: z.number(),
    completionTokens: z.number(),
    estimatedCost: z.number(),
  }),
  z.object({
    type: z.literal("error"),
    sessionID: z.string().optional(),
    timestamp: z.number(),
    error: z.object({ name: z.string(), message: z.string().optional() }).passthrough(),
  }),
  z.object({ type: z.literal("done"), sessionID: z.string(), timestamp: z.number(), ok: z.boolean() }),
  z.object({
    type: z.literal("plan"),
    sessionID: z.string(),
    timestamp: z.number(),
    plan: z.object({
      goal: z.string(),
      taskType: z.string(),
      complexity: z.string(),
      stack: z.array(z.string()).default([]),
      modules: z.array(z.string()).default([]),
      capabilities: z.array(z.string()).default([]),
      skills: z.array(z.string()).default([]),
      steps: z.array(z.string()).default([]),
      risks: z.array(z.string()).default([]),
    }),
  }),
  z.object({
    type: z.literal("compacted"),
    sessionID: z.string(),
    timestamp: z.number(),
    beforeTokens: z.number(),
    afterTokens: z.number(),
    droppedToolOutputs: z.number(),
    summarized: z.boolean(),
  }),
  z.object({
    type: z.literal("review"),
    sessionID: z.string(),
    timestamp: z.number(),
    review: z.object({
      passed: z.boolean(),
      findings: z.array(
        z.object({
          severity: z.enum(["error", "warning", "suggestion"]),
          category: z.string(),
          message: z.string(),
        }),
      ),
      summary: z.string(),
    }),
  }),
  z.object({
    type: z.literal("memory"),
    sessionID: z.string(),
    timestamp: z.number(),
    note: z.string(),
  }),
]);

export type AgentEvent = z.infer<typeof AgentEventSchema>;

// ─── Quinn brain (planning / compaction / review) ──────────────────────────

/** Deterministic plan sketch produced before the model runs — cheap, no LLM. */
export const AgentPlanSchema = z.object({
  goal: z.string(),
  taskType: z.string(),
  complexity: z.string(),
  stack: z.array(z.string()).default([]),
  modules: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  /** Recommended plugin names (e.g. "payments-stripe") from the RIDE plugin recommender. */
  plugins: z.array(z.string()).default([]).optional(),
  /** Verified integration instructions injected into the model frame. */
  pluginInstructions: z.string().default("").optional(),
  /** When true, the plan was built by classification heuristics (always for now). */
  estimated: z.boolean().default(true),
});

export type AgentPlan = z.infer<typeof AgentPlanSchema>;

export const CompactionNoticeSchema = z.object({
  beforeTokens: z.number(),
  afterTokens: z.number(),
  droppedToolOutputs: z.number(),
  summarized: z.boolean(),
});

export type CompactionNotice = z.infer<typeof CompactionNoticeSchema>;

export const ReviewFindingSchema = z.object({
  severity: z.enum(["error", "warning", "suggestion"]),
  category: z.string(),
  message: z.string(),
});

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const ReviewResultSchema = z.object({
  passed: z.boolean(),
  findings: z.array(ReviewFindingSchema).default([]),
  summary: z.string(),
});

export type ReviewResult = z.infer<typeof ReviewResultSchema>;
export type ToolUsePart = z.infer<typeof ToolUsePartSchema>;

// ─── Session model ─────────────────────────────────────────────────────────

export const SessionStatusSchema = z.enum(["idle", "running", "awaiting-permission", "completed", "cancelled", "failed"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: SessionStatusSchema,
  model: z.string().optional(),
  cwd: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  messageCount: z.number(),
});

export type RideSession = z.infer<typeof SessionSchema>;

// ─── Models & providers ────────────────────────────────────────────────────

export const ProviderKindSchema = z.enum(["local", "free", "byok", "remote"]);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

export const ModelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  kind: ProviderKindSchema,
  label: z.string(),
  context: z.number().optional(),
  tasks: z.array(z.string()).optional(),
  recommended: z.boolean().optional(),
});

export type RideModel = z.infer<typeof ModelSchema>;

// ─── Agent & runtime settings ──────────────────────────────────────────────

/**
 * Which inference backend RIDE defaults to:
 *  "auto"   → NVIDIA NIM when reachable / key present, else local Ollama, else free.
 *  "remote" → NVIDIA NIM (no API key required on public endpoints).
 *  "local"  → Ollama / local runtimes only.
 */
export const AgentProviderModeSchema = z.enum(["auto", "remote", "local"]);
export type AgentProviderMode = z.infer<typeof AgentProviderModeSchema>;

export const AgentSettingsSchema = z.object({
  providerMode: AgentProviderModeSchema.default("remote"),
  ollamaUrl: z.string().default("http://localhost:11434"),
  nvidiaUrl: z.string().default("https://integrate.api.nvidia.com/v1"),
  hasNvidiaKey: z.boolean().default(false),
  /** API key for the Featherless endpoint that serves the Qwen2.5-Coder abliterated model. */
  featherlessApiKey: z.string().default(""),
});

export type AgentSettings = z.infer<typeof AgentSettingsSchema>;

export const LibraryModelKindSchema = z.enum(["code", "instruct", "vision", "embedding", "small"]);
export type LibraryModelKind = z.infer<typeof LibraryModelKindSchema>;

export const LibraryModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: LibraryModelKindSchema,
  hfRepo: z.string(),
  hfFile: z.string(),
  license: z.string(),
  sizeGb: z.number(),
  context: z.number().optional(),
  notes: z.string().optional(),
  recommended: z.boolean().default(false),
});

export type LibraryModel = z.infer<typeof LibraryModelSchema>;

// ─── Application settings (schema-driven settings engine) ──────────────────

export const WorkbenchSettingsSchema = z.object({
  theme: z.string().default("ride-dark"),
  fontSize: z.number().int().min(9).max(32).default(13),
  fontFamily: z.string().default("'Cascadia Code', 'JetBrains Mono', Consolas, monospace"),
  restoreLastWorkspace: z.boolean().default(true),
  layout: z.object({
    sidebarWidth: z.number().min(140).max(560).default(240),
    rightPanelWidth: z.number().min(240).max(760).default(384),
    bottomPanelHeight: z.number().min(120).max(640).default(224),
    activeBottomView: z.enum(["terminal", "run"]).default("terminal"),
    activeRightView: z.enum(["agent", "preview", "plugins", "libraries"]).default("agent"),
  }),
});

export const EditorSettingsSchema = z.object({
  tabSize: z.number().int().min(1).max(8).default(2),
  insertSpaces: z.boolean().default(true),
  wordWrap: z.enum(["off", "on"]).default("off"),
  minimap: z.boolean().default(true),
  cursorBlinking: z.enum(["blink", "smooth", "phase", "expand", "solid"]).default("blink"),
  stickyScroll: z.boolean().default(true),
  formatOnSave: z.boolean().default(false),
});

export const TerminalSettingsSchema = z.object({
  shell: z.string().default(""),
  fontSize: z.number().int().min(8).max(24).default(13),
  scrollback: z.number().int().min(100).max(100000).default(10000),
});

export const GitSettingsSchema = z.object({
  autoFetch: z.boolean().default(false),
  confirmStashPop: z.boolean().default(true),
});

export const McpServerSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  /** Streamable HTTP endpoint of the MCP server (JSON-RPC over HTTP). */
  url: z.string().url(),
  enabled: z.boolean().default(true),
  /** Optional auth header (e.g. "Bearer …", "x-api-key: …") stored locally. */
  headers: z.record(z.string()).default({}),
  tools: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        inputSchema: z.record(z.unknown()).optional(),
      }),
    )
    .default([]),
  connected: z.boolean().default(false),
  lastError: z.string().nullable().default(null),
});
export type McpServer = z.infer<typeof McpServerSchema>;

export const AiSettingsSchema = z.object({
  providerMode: AgentProviderModeSchema.default("remote"),
  ollamaUrl: z.string().default("http://localhost:11434"),
  nvidiaUrl: z.string().default("https://integrate.api.nvidia.com/v1"),
  /** True when a key is stored (encrypted) in safeStorage. The value is never exposed to the renderer. */
  hasNvidiaKey: z.boolean().default(false),
  /** API key for the Featherless endpoint that serves the Qwen2.5-Coder abliterated model. */
  featherlessApiKey: z.string().default(""),
  defaultModel: z.string().default("z-ai/glm-5.2"),
  autocomplete: z.boolean().default(true),
  agentAutoApprove: z.boolean().default(false),
  /** Model Context Protocol servers the agent can reach through the `mcp` tool. */
  mcpServers: z.array(McpServerSchema).default([]),
});

/**
 * Inference power profile. AUTO derives the mode from hardware + power state;
 * the others cap or force which model tier the router may select.
 */
export const PowerModeSchema = z.enum(["auto", "battery", "balanced", "performance", "max"]);
export type PowerMode = z.infer<typeof PowerModeSchema>;

export const LocalAiSettingsSchema = z.object({
  /** Inference power profile for the adaptive router. */
  mode: PowerModeSchema.default("auto"),
  /**
   * Performance Governor profile for local inference.
   *  "eco"         → smallest tier, small context, quick idle unload (protects battery/heat).
   *  "balanced"    → the adaptive default (task-driven tier selection).
   *  "performance" → bump one tier above minimum, full context.
   */
  powerProfile: z.enum(["eco", "balanced", "performance"]).default("balanced"),
  /** Retry with the next larger installed model when a request fails or is insufficient. */
  autoEscalate: z.boolean().default(true),
  /** Max context (tokens) sent to the local runtime. */
  contextLimit: z.number().default(8192),
  /**
   * Performance Guard: one task at a time, aggressive idle unload,
   * reduced context/tokens, and pause while the system is busy.
   */
  focusMode: z.boolean().default(true),
  /** Unload the model from RAM after this many idle seconds. */
  idleUnloadSec: z.number().default(120),
});
export type LocalAiSettings = z.infer<typeof LocalAiSettingsSchema>;

// ─── Quinn agent brain settings ────────────────────────────────────────────

export const QuinnSettingsSchema = z.object({
  /** Produce a deterministic plan sketch (skills + steps) before every agent run. */
  planning: z.boolean().default(true),
  /** Auto-compact the tool-call history when it grows past the budget. */
  contextCompaction: z.boolean().default(true),
  /** Token budget for the live tool-call context window. */
  compactionBudgetTokens: z.number().min(2000).max(128000).default(8000),
  /** Re-run the output through a short self-review pass when enabled. */
  selfReview: z.boolean().default(true),
  /** Persist sessions/messages/decisions into the project memory (index.db). */
  projectMemory: z.boolean().default(true),
  /** How many past decisions the prompt memory injects (0 disables). */
  memoryDecisionLimit: z.number().min(0).max(50).default(5),
});
export type QuinnSettings = z.infer<typeof QuinnSettingsSchema>;

export const PrivacySettingsSchema = z.object({
  telemetry: z.boolean().default(false),
  analytics: z.boolean().default(false),
  localOnly: z.boolean().default(true),
  saveSessionHistory: z.boolean().default(true),
});

export const ExtensionsSettingsSchema = z.object({
  enabled: z.array(z.string()).default([]),
  autoUpdate: z.boolean().default(true),
});

// ─── Extended settings groups (Appearance → About RIDE) ─────────────────────

export const AppearanceSettingsSchema = z.object({
  uiScale: z.number().min(80).max(150).default(100),
  zoom: z.number().min(80).max(200).default(100),
  compactMode: z.boolean().default(false),
  animations: z.boolean().default(true),
  roundedCorners: z.boolean().default(true),
  glassEffects: z.boolean().default(false),
  showActivityBar: z.boolean().default(true),
  showStatusBar: z.boolean().default(true),
  showBreadcrumbs: z.boolean().default(true),
});

export const FilesSettingsSchema = z.object({
  autoSave: z.enum(["off", "afterDelay", "onFocusChange", "onWindowChange"]).default("off"),
  autoSaveDelay: z.number().int().min(100).max(60000).default(1000),
  hotExit: z.boolean().default(true),
  trimTrailingWhitespace: z.boolean().default(false),
  insertFinalNewline: z.boolean().default(true),
  encoding: z.enum(["utf8", "utf16le"]).default("utf8"),
  eol: z.enum(["auto", "lf", "crlf"]).default("auto"),
});

export const SearchSettingsSchema = z.object({
  caseSensitive: z.boolean().default(false),
  wholeWord: z.boolean().default(false),
  regex: z.boolean().default(false),
  keepHistory: z.boolean().default(true),
  excludePatterns: z.string().default("node_modules, dist, .git, out, build"),
});

export const MouseSettingsSchema = z.object({
  wheelZoom: z.boolean().default(false),
  smoothScrolling: z.boolean().default(true),
  multiCursorModifier: z.enum(["alt", "ctrlCmd"]).default("alt"),
  middleClickPaste: z.boolean().default(true),
});

export const LivePreviewSettingsSchema = z.object({
  autoStart: z.boolean().default(true),
  hotReload: z.boolean().default(true),
  autoRefresh: z.boolean().default(true),
  device: z.enum(["desktop", "tablet", "mobile"]).default("desktop"),
  defaultPort: z.number().int().min(1024).max(65535).default(5173),
  networkThrottling: z.enum(["off", "fast3g", "slow3g"]).default("off"),
  showConsole: z.boolean().default(true),
});

export const TestingSettingsSchema = z.object({
  autoDiscover: z.boolean().default(true),
  watchMode: z.boolean().default(false),
  coverage: z.boolean().default(false),
  aiTestGeneration: z.boolean().default(true),
  showExplorer: z.boolean().default(true),
});

export const DebuggingSettingsSchema = z.object({
  sourceMaps: z.boolean().default(true),
  inlineValues: z.boolean().default(true),
  breakpointsPersist: z.boolean().default(true),
  consoleColorize: z.boolean().default(true),
});

export const BuildRunSettingsSchema = z.object({
  buildOnSave: z.boolean().default(false),
  runOnSave: z.boolean().default(false),
  defaultBuildCommand: z.string().default("npm run build"),
  defaultRunner: z.enum(["npm", "pnpm", "yarn"]).default("npm"),
  showErrorNotifications: z.boolean().default(true),
});

export const PackageSettingsSchema = z.object({
  packageManager: z.enum(["auto", "npm", "pnpm", "yarn"]).default("pnpm"),
  autoInstall: z.boolean().default(true),
  strictVersions: z.boolean().default(false),
  workspaceSupport: z.boolean().default(true),
});

export const LanguageRuntimeSettingsSchema = z.object({
  managedRuntime: z.boolean().default(true),
  pythonFormatter: z.enum(["ruff", "black"]).default("ruff"),
  prettierDefault: z.boolean().default(true),
  languageServers: z.boolean().default(true),
});

export const VlsisettingsSchema = z.object({
  simulator: z.enum(["icarus", "verilator", "custom"]).default("verilator"),
  simulatorPath: z.string().default(""),
  waveformFormat: z.enum(["vcd", "fst"]).default("vcd"),
  compileOnSave: z.boolean().default(true),
  lintRtl: z.boolean().default(true),
});

export const SecuritySettingsSchema = z.object({
  workspaceTrust: z.enum(["ask", "always", "never"]).default("ask"),
  terminalPermission: z.enum(["askEveryTime", "destructiveOnly", "allowAll"]).default("destructiveOnly"),
  agentPermission: z.enum(["askEveryAction", "destructiveOnly", "allowSafe", "autonomous"]).default("allowSafe"),
  secretDetection: z.boolean().default(true),
  commandConfirmation: z.boolean().default(true),
  sandbox: z.boolean().default(false),
});

export const DatabaseSettingsSchema = z.object({
  defaultEngine: z.enum(["sqlite", "postgres", "mysql", "mongodb"]).default("sqlite"),
  agentDatabaseAccess: z.enum(["ask", "allow", "deny"]).default("ask"),
  connectionTimeoutMs: z.number().int().min(500).max(60000).default(5000),
  showConnections: z.boolean().default(true),
});

export const DockerSettingsSchema = z.object({
  engine: z.enum(["auto", "dockerDesktop", "custom"]).default("auto"),
  enginePath: z.string().default(""),
  composeEnabled: z.boolean().default(true),
  agentDockerAccess: z.enum(["ask", "allow", "deny"]).default("ask"),
});

export const DeploymentSettingsSchema = z.object({
  provider: z.enum(["hostinger"]).catch("hostinger"),
  autoDeploy: z.boolean().default(false),
  previewDeployments: z.boolean().default(true),
  environment: z.enum(["preview", "production"]).default("preview"),
  ssl: z.boolean().default(true),
});

export const CollaborationSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  liveShare: z.boolean().default(true),
  realtimeEditing: z.boolean().default(true),
  presence: z.boolean().default(true),
  comments: z.boolean().default(true),
});

export const NotificationsSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  aiCompleted: z.boolean().default(true),
  buildCompleted: z.boolean().default(true),
  testCompleted: z.boolean().default(true),
  deploymentCompleted: z.boolean().default(true),
  cloudVm: z.boolean().default(true),
  securityWarnings: z.boolean().default(true),
  gitChanges: z.boolean().default(false),
});

export const NetworkSettingsSchema = z.object({
  proxyEnabled: z.boolean().default(false),
  proxyUrl: z.string().default(""),
  offlineMode: z.boolean().default(false),
  timeoutMs: z.number().int().min(1000).max(120000).default(30000),
});

export const StorageSettingsSchema = z.object({
  syncSettings: z.boolean().default(false),
  syncExtensions: z.boolean().default(false),
  syncTemplates: z.boolean().default(false),
  aiContextCacheMb: z.number().int().min(0).max(8192).default(512),
});

export const AccessibilitySettingsSchema = z.object({
  screenReader: z.boolean().default(false),
  reducedMotion: z.boolean().default(false),
  highContrast: z.boolean().default(false),
  fontScaling: z.enum(["normal", "large", "xlarge"]).default("normal"),
  focusIndicators: z.boolean().default(true),
  reducedTransparency: z.boolean().default(false),
});

export const ExperimentalSettingsSchema = z.object({
  multiAgentMode: z.boolean().default(false),
  aiBrowser: z.boolean().default(false),
  aiVoiceCoding: z.boolean().default(false),
  aiDesignToCode: z.boolean().default(false),
  projectTimeMachine: z.boolean().default(false),
  aiArchitectureGraph: z.boolean().default(false),
  automaticDeployment: z.boolean().default(false),
});

export const PerformanceSettingsSchema = z.object({
  gpuAcceleration: z.boolean().default(true),
  fileIndexing: z.boolean().default(true),
  lazyLoading: z.boolean().default(true),
  maxBackgroundProcesses: z.number().int().min(1).max(32).default(8),
  maxExtensionHosts: z.number().int().min(1).max(16).default(4),
});

export const DeveloperSettingsSchema = z.object({
  developerMode: z.boolean().default(false),
  extensionHostLogs: z.boolean().default(false),
  agentLogs: z.boolean().default(false),
  aiRequestLogs: z.boolean().default(false),
  networkLogs: z.boolean().default(false),
  showInternalErrors: z.boolean().default(false),
});

export const UpdateSettingsSchema = z.object({
  autoCheck: z.boolean().default(true),
  autoDownload: z.boolean().default(true),
  autoInstall: z.boolean().default(false),
  channel: z.enum(["stable", "beta", "alpha"]).default("stable"),
});

export const CloudSettingsSchema = z.object({
  provider: z.enum(["ride-cloud", "aws", "azure", "gcp", "custom"]).default("ride-cloud"),
  region: z.string().default("auto"),
  cpu: z.number().int().min(1).max(64).default(2),
  ramGb: z.number().int().min(1).max(256).default(4),
  gpu: z.number().int().min(0).max(8).default(0),
  diskGb: z.number().int().min(5).max(1024).default(20),
  idleTimeoutMin: z.number().int().min(1).max(120).default(15),
  autoShutdown: z.boolean().default(true),
  persistEnvironment: z.boolean().default(true),
});

export const AccountSettingsSchema = z.object({
  displayName: z.string().default(""),
  email: z.string().default(""),
  organization: z.string().default(""),
  syncAccount: z.boolean().default(false),
});

export const TemplateSettingsSchema = z.object({
  autoInstallLibraries: z.boolean().default(true),
  confirmScaffold: z.boolean().default(true),
  showAllVariants: z.boolean().default(true),
  favoriteTemplates: z.array(z.string()).default([]),
});

export const UiLibrarySettingsSchema = z.object({
  preinstallApproved: z.boolean().default(true),
  autoDetectFramework: z.boolean().default(true),
  aiRecommendations: z.boolean().default(true),
  licenseCheck: z.boolean().default(true),
  versionManagement: z.boolean().default(true),
});

export const RecentProjectSchema = z.object({
  root: z.string(),
  name: z.string(),
  lastOpenedAt: z.number(),
});

export const SettingsSchema = z.object({
  schemaVersion: z.number().default(1),
  workbench: WorkbenchSettingsSchema,
  editor: EditorSettingsSchema,
  terminal: TerminalSettingsSchema,
  git: GitSettingsSchema,
  ai: AiSettingsSchema,
  localAi: LocalAiSettingsSchema,
  quinn: QuinnSettingsSchema,
  privacy: PrivacySettingsSchema,
  extensions: ExtensionsSettingsSchema,
  appearance: AppearanceSettingsSchema,
  files: FilesSettingsSchema,
  search: SearchSettingsSchema,
  mouse: MouseSettingsSchema,
  preview: LivePreviewSettingsSchema,
  testing: TestingSettingsSchema,
  debugging: DebuggingSettingsSchema,
  build: BuildRunSettingsSchema,
  packages: PackageSettingsSchema,
  languages: LanguageRuntimeSettingsSchema,
  vlsi: VlsisettingsSchema,
  security: SecuritySettingsSchema,
  database: DatabaseSettingsSchema,
  docker: DockerSettingsSchema,
  deployment: DeploymentSettingsSchema,
  collaboration: CollaborationSettingsSchema,
  notifications: NotificationsSettingsSchema,
  network: NetworkSettingsSchema,
  storage: StorageSettingsSchema,
  accessibility: AccessibilitySettingsSchema,
  experimental: ExperimentalSettingsSchema,
  performance: PerformanceSettingsSchema,
  developer: DeveloperSettingsSchema,
  updates: UpdateSettingsSchema,
  cloud: CloudSettingsSchema,
  account: AccountSettingsSchema,
  templates: TemplateSettingsSchema,
  uiLibraries: UiLibrarySettingsSchema,
  recentProjects: z.array(RecentProjectSchema).default([]),
  lastWorkspace: z.string().nullable().default(null),
});

export type RideSettings = z.infer<typeof SettingsSchema>;
export type WorkbenchSettings = z.infer<typeof WorkbenchSettingsSchema>;
export type AiSettings = z.infer<typeof AiSettingsSchema>;
export type RecentProject = z.infer<typeof RecentProjectSchema>;

// ─── Templates (Template Studio) ───────────────────────────────────────────

export const TemplateQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["text", "select"]),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().default(false),
});
export type TemplateQuestion = z.infer<typeof TemplateQuestionSchema>;

export const RideTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  /** Subcategory / family this template belongs to (e.g. "portfolio", "crm"). */
  category: z.string(),
  /** Top-level studio section (websites, webapps, ai, mobile, desktop, developer, games, starter). */
  section: z.string().default("websites"),
  tags: z.array(z.string()).default([]),
  framework: z.string().default("React + Vite"),
  styling: z.string().default("Tailwind CSS"),
  ui: z.string().default("Custom components"),
  icons: z.string().default("lucide-react"),
  animation: z.string().default("CSS transitions"),
  features: z.array(z.string()).default([]),
  aiCompatible: z.boolean().default(true),
  userGenerated: z.boolean().default(false),
  questions: z.array(TemplateQuestionSchema).default([]),
  hasPreview: z.boolean().default(true),
  /** Prompt template with {question-id} placeholders used by Customize-with-AI. Empty for user templates. */
  customPrompt: z.string().default(""),
  files: z.array(z.string()).default([]),
  createdAt: z.number().optional(),
});

export type RideTemplate = z.infer<typeof RideTemplateSchema>;

export const TemplateCreateRequestSchema = z.object({
  templateId: z.string(),
  dest: z.string(),
  answers: z.record(z.string()).optional(),
});
export type TemplateCreateRequest = z.infer<typeof TemplateCreateRequestSchema>;

export const TemplateSaveRequestSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
});
export type TemplateSaveRequest = z.infer<typeof TemplateSaveRequestSchema>;

// ─── Files & workspace ─────────────────────────────────────────────────────

export const WorkspaceOpenResultSchema = z.object({
  root: z.string(),
  name: z.string(),
  fileCount: z.number(),
  gitRepo: z.boolean(),
});

export type WorkspaceOpenResult = z.infer<typeof WorkspaceOpenResultSchema>;

export const NewFileResultSchema = z.object({
  filePath: z.string(),
  workspace: WorkspaceOpenResultSchema,
});

export type NewFileResult = z.infer<typeof NewFileResultSchema>;

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileNode[];
}

export const FileNodeSchema: z.ZodType<FileNode> = z.lazy(() =>
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.enum(["file", "dir"]),
    children: z.array(FileNodeSchema).optional(),
  }),
);

export const FileContentSchema = z.object({
  path: z.string(),
  content: z.string(),
  language: z.string().optional(),
});

export type FileContent = z.infer<typeof FileContentSchema>;

// ─── Git ───────────────────────────────────────────────────────────────────

export const GitStatusSchema = z.object({
  branch: z.string(),
  ahead: z.number(),
  behind: z.number(),
  staged: z.array(z.string()),
  unstaged: z.array(z.string()),
  untracked: z.array(z.string()),
  conflicts: z.array(z.string()),
});

export type GitStatus = z.infer<typeof GitStatusSchema>;

export const DiffHunkSchema = z.object({
  oldStart: z.number(),
  oldLines: z.number(),
  newStart: z.number(),
  newLines: z.number(),
  content: z.string(),
});

export type DiffHunk = z.infer<typeof DiffHunkSchema>;

export const FileDiffSchema = z.object({
  path: z.string(),
  status: z.enum(["modified", "added", "deleted", "renamed"]),
  hunks: z.array(DiffHunkSchema),
  full: z.string(),
});

export type FileDiff = z.infer<typeof FileDiffSchema>;

// ─── Terminal ──────────────────────────────────────────────────────────────

export const TerminalDataSchema = z.object({
  id: z.string(),
  data: z.string(),
});

export const TerminalSpawnSchema = z.object({
  id: z.string(),
  shell: z.string(),
  cwd: z.string(),
  cols: z.number(),
  rows: z.number(),
});

// ─── Live preview ───────────────────────────────────────────────────────────

export type PreviewServerState = "idle" | "installing" | "starting" | "running" | "stopped" | "error";

export type PreviewProjectType = "static" | "vite" | "next" | "nuxt" | "svelte" | "react-scripts" | "unknown";

export interface PreviewErrorDetail {
  message: string;
  command?: string;
  exitCode?: number;
  logs?: string[];
  timestamp: number;
}

export interface PreviewStatus {
  state: PreviewServerState;
  url: string | null;
  command: string | null;
  cwd: string | null;
  phase: string;
  lastChangedAt: number | null;
  errorCount: number;
  projectType?: PreviewProjectType;
  framework?: string;
  errorDetail?: PreviewErrorDetail;
  devServerUrl?: string;
}

export type PreviewEvent =
  | { type: "status"; status: PreviewStatus }
  | { type: "log"; line: string }
  | { type: "error"; line: string }
  | { type: "changed"; path: string; time: number };

// ─── Agent bridge requests ─────────────────────────────────────────────────

export const RunTaskRequestSchema = z.object({
  prompt: z.string(),
  model: z.string().optional(),
  agent: z.string().optional(),
  cwd: z.string(),
  files: z.array(z.string()).optional(),
  autoApprove: z.boolean().default(false),
  title: z.string().optional(),
  sessionId: z.string().optional(),
  /** Prior conversation turns (multi-turn chat context). */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .optional(),
});

export type RunTaskRequest = z.infer<typeof RunTaskRequestSchema>;

export const PermissionDecisionSchema = z.object({
  requestID: z.string(),
  decision: z.enum(["allow-once", "always", "deny"]),
});

export type PermissionDecision = z.infer<typeof PermissionDecisionSchema>;

// ─── AI inline completion (ghost text) ──────────────────────────────────────

export const InlineCompletionRequestSchema = z.object({
  path: z.string(),
  /** Full current buffer content. */
  content: z.string(),
  /** 1-based cursor position in the buffer. */
  position: z.object({ lineNumber: z.number(), column: z.number() }),
  /** Fast-model override id (defaults to the router's autocomplete pick). */
  model: z.string().optional(),
});

export type InlineCompletionRequest = z.infer<typeof InlineCompletionRequestSchema>;

export const InlineCompletionResultSchema = z.object({
  /** Text to insert at the cursor (appended only). */
  text: z.string().nullable(),
  model: z.string().optional(),
  ms: z.number().optional(),
});

export type InlineCompletionResult = z.infer<typeof InlineCompletionResultSchema>;

// ─── Artifacts ────────────────────────────────────────────────────────────────

export const ArtifactKindSchema = z.enum(["plan", "diff", "code", "markdown", "image", "log", "test-result", "report", "screenshot", "recording"]);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;

export const ArtifactSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  kind: ArtifactKindSchema,
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type Artifact = z.infer<typeof ArtifactSchema>;

export const ArtifactEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("artifact.created"), sessionID: z.string(), artifact: ArtifactSchema }),
  z.object({ type: z.literal("artifact.updated"), sessionID: z.string(), artifact: ArtifactSchema }),
  z.object({ type: z.literal("artifact.deleted"), sessionID: z.string(), artifactId: z.string() }),
  z.object({ type: z.literal("artifact.feedback"), sessionID: z.string(), artifactId: z.string(), feedback: z.string() }),
]);

export type ArtifactEvent = z.infer<typeof ArtifactEventSchema>;

// ─── Scheduled Tasks ────────────────────────────────────────────────────────

export const TaskScheduleSchema = z.enum(["manual", "hourly", "daily", "weekly", "interval"]);
export type TaskSchedule = z.infer<typeof TaskScheduleSchema>;

export const ScheduledTaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(120),
  prompt: z.string().min(1),
  schedule: TaskScheduleSchema,
  intervalMinutes: z.number().int().min(1).max(43200).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  hourOfDay: z.number().int().min(0).max(23).optional(),
  workspaceRoot: z.string().optional(),
  enabled: z.boolean().default(true),
  model: z.string().optional(),
  createdAt: z.number(),
  lastRunAt: z.number().nullable().default(null),
  nextRunAt: z.number().nullable().default(null),
  lastStatus: z.enum(["idle", "running", "success", "error"]).default("idle"),
  lastOutput: z.string().nullable().default(null),
});
export type ScheduledTask = z.infer<typeof ScheduledTaskSchema>;

export const TaskRunHistorySchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startedAt: z.number(),
  finishedAt: z.number().nullable(),
  status: z.enum(["running", "success", "error", "cancelled"]),
  output: z.string().nullable().default(null),
  sessionId: z.string().nullable().default(null),
});
export type TaskRunHistory = z.infer<typeof TaskRunHistorySchema>;

// ─── AI Providers ──────────────────────────────────────────────────────────

export const ProviderKindV2Schema = z.enum(["local", "free", "byok", "remote", "custom"]);
export type ProviderKindV2 = z.infer<typeof ProviderKindV2Schema>;

export const ProviderCapabilitiesSchema = z.object({
  chat: z.boolean().default(true),
  completion: z.boolean().default(true),
  embeddings: z.boolean().default(false),
  images: z.boolean().default(false),
  audio: z.boolean().default(false),
  fineTuning: z.boolean().default(false),
  batch: z.boolean().default(false),
});
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

export const ProviderModelV2Schema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  contextWindow: z.number().optional(),
  maxOutputTokens: z.number().optional(),
  supportsStreaming: z.boolean().default(true),
  supportsTools: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsReasoning: z.boolean().default(false),
  pricing: z
    .object({ inputPer1M: z.number(), outputPer1M: z.number(), currency: z.string() })
    .optional(),
});
export type ProviderModelV2 = z.infer<typeof ProviderModelV2Schema>;

export const AIProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  kind: ProviderKindV2Schema,
  baseUrl: z.string().optional(),
  authentication: z.object({
    type: z.enum(["api_key", "oauth", "none", "custom"]),
    apiKeyName: z.string().optional(),
    hasKey: z.boolean().default(false),
  }),
  capabilities: ProviderCapabilitiesSchema,
  streaming: z.boolean().default(true),
  toolCalling: z.boolean().default(true),
  vision: z.boolean().default(false),
  reasoning: z.boolean().default(false),
  enabled: z.boolean().default(true),
  priority: z.number().default(0),
  models: z.array(ProviderModelV2Schema).default([]),
  metadata: z.record(z.unknown()).default({}),
});
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const ProviderTestResultSchema = z.object({
  success: z.boolean(),
  latency: z.number().optional(),
  modelsFound: z.number().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});
export type ProviderTestResult = z.infer<typeof ProviderTestResultSchema>;

export const CreateProviderRequestSchema = z.object({
  adapterId: z.string(),
  name: z.string(),
  displayName: z.string().optional(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
});
export type CreateProviderRequest = z.infer<typeof CreateProviderRequestSchema>;

// ─── Model configuration & routing ─────────────────────────────────────────

export const ModelConfigurationSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  modelId: z.string(),
  displayName: z.string(),
  isDefault: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  temperature: z.number().default(0.7),
  maxTokens: z.number().default(4096),
  topP: z.number().default(1.0),
  metadata: z.record(z.unknown()).default({}),
});
export type ModelConfiguration = z.infer<typeof ModelConfigurationSchema>;

export const AgentRoutingRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  taskType: z.enum(["coding", "architecture", "debugging", "fast", "reasoning", "ui", "vlsi", "custom"]),
  modelId: z.string(),
  providerId: z.string(),
  priority: z.number().default(0),
  enabled: z.boolean().default(true),
  conditions: z
    .array(
      z.object({
        field: z.enum(["fileType", "projectType", "language", "complexity", "custom"]),
        operator: z.enum(["equals", "contains", "matches", "greaterThan", "lessThan"]),
        value: z.union([z.string(), z.number()]),
      }),
    )
    .default([]),
});
export type AgentRoutingRule = z.infer<typeof AgentRoutingRuleSchema>;

export const AgentToolPermissionSchema = z.object({
  tool: z.string(),
  allowed: z.boolean(),
  requireConfirmation: z.boolean().default(true),
});
export type AgentToolPermission = z.infer<typeof AgentToolPermissionSchema>;

export const AgentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().default(""),
  modelId: z.string().default(""),
  providerId: z.string().default(""),
  systemPrompt: z.string().default(""),
  temperature: z.number().default(0.3),
  maxTokens: z.number().default(8192),
  tools: z.array(z.string()).default([]),
  permissions: z.array(AgentToolPermissionSchema).default([]),
  isBuiltin: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});
export type AgentProfile = z.infer<typeof AgentProfileSchema>;

// ─── Auth & account ────────────────────────────────────────────────────────

export const AuthProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  type: z.enum(["email", "oauth", "passkey"]),
  enabled: z.boolean(),
});
export type AuthProvider = z.infer<typeof AuthProviderSchema>;

export const UserAccountSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  provider: z.string(),
  emailVerified: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
  twoFactorEnabled: z.boolean().default(false),
  passkeysEnabled: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});
export type UserAccount = z.infer<typeof UserAccountSchema>;

export const AuthSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  provider: z.string(),
  createdAt: z.number(),
  lastActivityAt: z.number(),
  deviceInfo: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["desktop", "mobile", "tablet", "unknown"]),
      os: z.string(),
      browser: z.string(),
      lastSeen: z.number(),
      trusted: z.boolean(),
    })
    .optional(),
});
export type AuthSession = z.infer<typeof AuthSessionSchema>;

export const AuthResultSchema = z.object({
  success: z.boolean(),
  user: UserAccountSchema.optional(),
  session: AuthSessionSchema.optional(),
  error: z.string().optional(),
  requiresVerification: z.boolean().optional(),
  /** Locally-generated one-time code (reset/verification) when no email service is available. */
  code: z.string().optional(),
});
export type AuthResult = z.infer<typeof AuthResultSchema>;

export const OAuthDeviceFlowSchema = z.object({
  success: z.boolean(),
  verificationUrl: z.string().optional(),
  userCode: z.string().optional(),
  deviceCode: z.string().optional(),
  expiresIn: z.number().optional(),
  interval: z.number().optional(),
  error: z.string().optional(),
});
export type OAuthDeviceFlow = z.infer<typeof OAuthDeviceFlowSchema>;

export const OAuthPollResultSchema = z.object({
  status: z.enum(["pending", "success", "denied", "expired", "error"]),
  user: UserAccountSchema.optional(),
  error: z.string().optional(),
});
export type OAuthPollResult = z.infer<typeof OAuthPollResultSchema>;

export const ProfileDataSchema = z.object({
  displayName: z.string(),
  username: z.string().optional(),
  bio: z.string().optional(),
  country: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
  avatarUrl: z.string().optional(),
});
export type ProfileData = z.infer<typeof ProfileDataSchema>;

export const PrivacyDataSchema = z.object({
  telemetry: z.boolean(),
  crashReports: z.boolean(),
  usageAnalytics: z.boolean(),
  aiInteractionData: z.boolean(),
  codeIndexing: z.boolean(),
  cloudSync: z.boolean(),
});
export type PrivacyData = z.infer<typeof PrivacyDataSchema>;

export const ConnectedAccountSchema = z.object({
  id: z.string(),
  provider: z.string(),
  email: z.string(),
  username: z.string().optional(),
  avatarUrl: z.string().optional(),
  connectedAt: z.number(),
  scopes: z.array(z.string()).default([]),
});
export type ConnectedAccount = z.infer<typeof ConnectedAccountSchema>;

// ─── Extensions & marketplace ──────────────────────────────────────────────

export const CompatibilityIssueSchema = z.object({
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  api: z.string().optional(),
  suggestion: z.string().optional(),
});
export type CompatibilityIssue = z.infer<typeof CompatibilityIssueSchema>;

export const ExtensionCompatibilitySchema = z.object({
  status: z.enum(["compatible", "partial", "incompatible", "unknown"]),
  issues: z.array(CompatibilityIssueSchema).default([]),
  apiVersion: z.string(),
  supportedApis: z.array(z.string()).default([]),
  unsupportedApis: z.array(z.string()).default([]),
});
export type ExtensionCompatibility = z.infer<typeof ExtensionCompatibilitySchema>;

export const ExtensionManifestSchema = z.object({
  name: z.string(),
  displayName: z.string().default(""),
  version: z.string(),
  publisher: z.string(),
  description: z.string().default(""),
  categories: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  engines: z.object({ ride: z.string().optional(), vscode: z.string().optional() }).default({}),
  main: z.string().default(""),
  license: z.string().optional(),
  icon: z.string().optional(),
  contributes: z.record(z.unknown()).default({}),
});
export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

export const InstalledExtensionSchema = z.object({
  id: z.string(),
  manifest: ExtensionManifestSchema,
  path: z.string(),
  enabled: z.boolean(),
  installedAt: z.number(),
  updatedAt: z.number(),
  isBuiltin: z.boolean(),
  compatibility: ExtensionCompatibilitySchema,
});
export type InstalledExtension = z.infer<typeof InstalledExtensionSchema>;

export const MarketplaceExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  publisher: z.string(),
  publisherDisplayName: z.string(),
  description: z.string(),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  iconUrl: z.string().optional(),
  repositoryUrl: z.string().optional(),
  installCount: z.number().default(0),
  rating: z.number().default(0),
  ratingCount: z.number().default(0),
  lastUpdated: z.number(),
  publishedAt: z.number(),
  compatibility: z.object({
    ride: z.string(),
    vscode: z.string().optional(),
  }),
  flags: z.object({
    verified: z.boolean().default(false),
    deprecated: z.boolean().default(false),
    preview: z.boolean().default(false),
  }),
});
export type MarketplaceExtension = z.infer<typeof MarketplaceExtensionSchema>;

export const MarketplaceSearchResultSchema = z.object({
  extensions: z.array(MarketplaceExtensionSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});
export type MarketplaceSearchResult = z.infer<typeof MarketplaceSearchResultSchema>;

// ─── Usage / cost tracking ─────────────────────────────────────────────────

export const UsageTotalsSchema = z.object({
  sessions: z.number(),
  promptTokens: z.number(),
  completionTokens: z.number(),
  estimatedCost: z.number(),
  lastEventAt: z.number(),
});

export type UsageTotals = z.infer<typeof UsageTotalsSchema>;

// ─── Local AI ──────────────────────────────────────────────────────────────

export const LocalAiTierSchema = z.enum(["lite", "standard", "developer", "pro", "max"]);
export type LocalAiTier = z.infer<typeof LocalAiTierSchema>;

/**
 * Task taxonomy the router understands. Each type maps to a minimum model
 * tier; the classifier picks one from the user's request text.
 */
export const TaskTypeSchema = z.enum([
  "chat",
  "codeCompletion",
  "explanation",
  "bugFix",
  "refactoring",
  "documentation",
  "uiGeneration",
  "websiteGeneration",
  "applicationGeneration",
  "terminalOperation",
  "projectPlanning",
  "architecture",
  "visualAnalysis",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

/** Complexity levels 0-4 — L0 must never reach an LLM. */
export const TaskComplexitySchema = z.enum(["level0", "level1", "level2", "level3", "level4"]);
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>;

export const ModelArchitectureSchema = z.enum(["dense", "moe"]);
export type ModelArchitecture = z.infer<typeof ModelArchitectureSchema>;

export const LocalAiFamilySchema = z.enum(["v1", "v2", "v3"]);
export type LocalAiFamily = z.infer<typeof LocalAiFamilySchema>;

/** A model RIDE offers for local inference, matched to hardware tiers. */
export const LocalModelSchema = z.object({
  tier: LocalAiTierSchema,
  /** Branded family: RIDE V1 (light) / V2 (medium) / V3 (heavy). */
  family: LocalAiFamilySchema,
  name: z.string(),
  ollamaTag: z.string(),
  sizeGB: z.number(),
  description: z.string(),
  paramsB: z.number(),
  architecture: ModelArchitectureSchema,
  /** Active parameters for MoE models (informational — full weights still load). */
  activeParamsB: z.number().optional(),
  quant: z.string(),
  ctxK: z.number(),
  /** RAM needed to run on CPU (weights + KV overhead), GB. */
  ramNeedGB: z.number(),
  /** VRAM needed to run on GPU, GB (0 = integrated/shared only). */
  vramNeedGB: z.number(),
  /** 0-1 capability scores used by the router. */
  coding: z.number(),
  reasoning: z.number(),
  toolUse: z.number(),
});
export type LocalModel = z.infer<typeof LocalModelSchema>;

/** Offline catalog RIDE can download from the Ollama library. Never bundled with the installer. */
export const LOCAL_MODEL_CATALOG: readonly LocalModel[] = [
  { tier: "lite", family: "v1", name: "RIDE V1", ollamaTag: "qwen2.5-coder:1.5b", sizeGB: 1.1, description: "Light — chat, quick fixes and edits. Runs on any machine.", paramsB: 1.5, architecture: "dense", quant: "Q4_K_M", ctxK: 32, ramNeedGB: 2.5, vramNeedGB: 1.5, coding: 0.35, reasoning: 0.25, toolUse: 0.15 },
  { tier: "standard", family: "v2", name: "RIDE V2", ollamaTag: "qwen2.5-coder:7b", sizeGB: 4.7, description: "Medium — everyday coding, debugging and small projects. The student default when RAM allows.", paramsB: 7.6, architecture: "dense", quant: "Q4_K_M", ctxK: 32, ramNeedGB: 7, vramNeedGB: 6, coding: 0.7, reasoning: 0.55, toolUse: 0.6 },
  { tier: "developer", family: "v3", name: "RIDE V3", ollamaTag: "qwen2.5-coder:14b", sizeGB: 9.0, description: "Heavy — repository analysis and agentic coding on 16GB+ RAM with a real GPU.", paramsB: 14.8, architecture: "dense", quant: "Q4_K_M", ctxK: 32, ramNeedGB: 12, vramNeedGB: 10, coding: 0.85, reasoning: 0.7, toolUse: 0.75 },
  { tier: "pro", family: "v3", name: "RIDE V3 Pro", ollamaTag: "qwen2.5-coder:32b", sizeGB: 19.0, description: "Heavy — complex debugging and full-stack work. Needs 32GB+ RAM.", paramsB: 32.8, architecture: "dense", quant: "Q4_K_M", ctxK: 32, ramNeedGB: 24, vramNeedGB: 20, coding: 0.93, reasoning: 0.85, toolUse: 0.85 },
  { tier: "max", family: "v3", name: "RIDE V3 Max (MoE)", ollamaTag: "qwen3:30b-a3b", sizeGB: 18.5, description: "Heavy — MoE (30B total, 3B active per token). Full weights still load. Workstation class.", paramsB: 30.5, architecture: "moe", activeParamsB: 3.3, quant: "Q4_K_M", ctxK: 128, ramNeedGB: 20, vramNeedGB: 16, coding: 0.9, reasoning: 0.88, toolUse: 0.8 },
];

export const TaskRequirementSchema = z.object({
  taskType: TaskTypeSchema,
  complexity: TaskComplexitySchema,
  /** Minimum tier whose capability satisfies this task. */
  minTier: LocalAiTierSchema,
  needsCoding: z.boolean(),
  needsReasoning: z.boolean(),
  needsTools: z.boolean(),
  confidence: z.number(),
});
export type TaskRequirement = z.infer<typeof TaskRequirementSchema>;

export const RoutingDecisionSchema = z.object({
  requestId: z.string(),
  taskType: TaskTypeSchema,
  complexity: TaskComplexitySchema,
  mode: PowerModeSchema,
  selectedTier: LocalAiTierSchema,
  selectedModel: z.string(),
  /** Why this tier was chosen (or why a bigger one was not). */
  reason: z.string(),
  escalated: z.boolean(),
  previousTier: LocalAiTierSchema.optional(),
  escalationAvailable: z.boolean().default(false),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

export const SystemCpuSchema = z.object({
  model: z.string(),
  cores: z.number(),
  threads: z.number(),
});
export type SystemCpu = z.infer<typeof SystemCpuSchema>;

export const SystemGpuSchema = z.object({
  name: z.string(),
  vendor: z.string(),
  vramGB: z.number(),
});
export type SystemGpu = z.infer<typeof SystemGpuSchema>;

export const SystemBatterySchema = z.object({
  hasBattery: z.boolean(),
  onBattery: z.boolean(),
  percent: z.number(),
});
export type SystemBattery = z.infer<typeof SystemBatterySchema>;

export const SystemInfoSchema = z.object({
  platform: z.string(),
  os: z.string(),
  cpu: SystemCpuSchema,
  memoryGB: z.object({ total: z.number(), free: z.number() }),
  gpus: z.array(SystemGpuSchema),
  freeStorageGB: z.number(),
  npu: z.boolean(),
  battery: SystemBatterySchema.optional(),
});
export type SystemInfo = z.infer<typeof SystemInfoSchema>;

export const RecommendedLocalModelSchema = z.object({
  tier: LocalAiTierSchema,
  name: z.string(),
  ollamaTag: z.string(),
  sizeGB: z.number(),
  reason: z.string(),
});
export type RecommendedLocalModel = z.infer<typeof RecommendedLocalModelSchema>;

export const InstalledLocalModelSchema = z.object({
  name: z.string(),
  sizeGB: z.number(),
});
export type InstalledLocalModel = z.infer<typeof InstalledLocalModelSchema>;

export const LocalAiStatusSchema = z.object({
  available: z.boolean(),
  serverRunning: z.boolean(),
  url: z.string(),
  system: SystemInfoSchema.optional(),
  recommended: RecommendedLocalModelSchema.optional(),
  installed: z.array(InstalledLocalModelSchema).default([]),
  error: z.string().optional(),
});
export type LocalAiStatus = z.infer<typeof LocalAiStatusSchema>;

export const LocalChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});
export type LocalChatMessage = z.infer<typeof LocalChatMessageSchema>;

export const LocalChatRequestSchema = z.object({
  requestId: z.string(),
  currentModel: z.string(),
  messages: z.array(LocalChatMessageSchema).min(1),
  /** Router override — retry with this exact model. */
  forceModel: z.string().optional(),
});
export type LocalChatRequest = z.infer<typeof LocalChatRequestSchema>;

export const LocalChatEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("router"), requestId: z.string(), decision: RoutingDecisionSchema }),
  z.object({ type: z.literal("chunk"), requestId: z.string(), content: z.string() }),
  z.object({ type: z.literal("done"), requestId: z.string(), content: z.string().optional(), error: z.string().optional() }),
]);
export type LocalChatEvent = z.infer<typeof LocalChatEventSchema>;

export const PullProgressSchema = z.object({
  tag: z.string(),
  status: z.string(),
  progress: z.number().optional(),
  total: z.number().optional(),
  completed: z.number().optional(),
  error: z.string().optional(),
});
export type PullProgress = z.infer<typeof PullProgressSchema>;

// ─── IPC channel registry ──────────────────────────────────────────────────

export const ShareExportResultSchema = z.object({
  ok: z.boolean(),
  repoUrl: z.string().nullable().optional(),
  message: z.string().optional(),
  needsAuth: z.boolean().optional(),
  commands: z.array(z.string()).optional(),
});
export type ShareExportResult = z.infer<typeof ShareExportResultSchema>;

export const ShareDownloadResultSchema = z.object({
  ok: z.boolean(),
  path: z.string().nullable().optional(),
  sizeBytes: z.number().optional(),
  error: z.string().optional(),
});
export type ShareDownloadResult = z.infer<typeof ShareDownloadResultSchema>;

/** A single UI component from the vendored galaxy collection (uiverse.io). */
export interface GalaxyComponent {
  id: string;
  category: string;
  filename: string;
  /** Full path relative to the galaxy root, e.g. "Buttons/foo.html". */
  relPath: string;
  /** Optional first line comment from the component, e.g. "From Uiverse.io by xyz". */
  attribution?: string;
}

export interface GalaxyCategory {
  id: string;
  name: string;
  count: number;
}

/** Billing plan for account types (Student/Developer) */
export interface BillingPlan {
  id: string;
  name: string;
  price: number; // paise for INR
  currency: string;
  interval: "one-time" | "monthly" | "yearly";
  description: string;
  features: readonly string[];
}

/** One-time project shipment record — payment unlocks shipping/deployment. */
export interface ShipmentRecord {
  projectRoot: string;
  projectName: string;
  planId: string;
  planName: string;
  price: number; // paise for INR
  currency: string;
  shippedAt: number; // ms since epoch
  paymentMethod: string;
}

export interface ShipStatus {
  shipped: boolean;
  shipment: ShipmentRecord | null;
}

/** Hostinger My Dashboard types */
export interface HostingerWebsite {
  id: string;
  domain: string;
  name: string;
  isEnabled: boolean;
  ipAddress?: string;
  datacenter?: string;
  plan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostingerDatabase {
  name: string;
  host: string;
  port: number;
  type: "mysql" | "postgresql";
  username: string;
  remoteConnections: boolean;
}

export interface HostingerDomain {
  domain: string;
  isConnected: boolean;
  isPrimary: boolean;
  sslStatus: "active" | "pending" | "error" | "none";
  dnsStatus: "configured" | "pending" | "error";
  expiresAt?: string;
}

export interface HostingerDNSRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface HostingerDNSZone {
  domain: string;
  records: HostingerDNSRecord[];
}

export interface HostingerDeployment {
  id: string;
  websiteId: string;
  status: "pending" | "building" | "deploying" | "success" | "error";
  version: string;
  commitHash?: string;
  branch?: string;
  createdAt: string;
  completedAt?: string;
  logs?: string;
}

export interface HostingerNodeJSBuild {
  id: string;
  websiteId: string;
  status: "pending" | "building" | "success" | "error";
  nodeVersion: string;
  buildCommand: string;
  startCommand: string;
  createdAt: string;
  completedAt?: string;
  logs?: string;
}

export interface MyDashboardData {
  websites: HostingerWebsite[];
  databases: HostingerDatabase[];
  domains: HostingerDomain[];
  dnsZones: HostingerDNSZone[];
  deployments: HostingerDeployment[];
  nodejsBuilds: HostingerNodeJSBuild[];
  vpsServers: any[];
  connected: boolean;
  lastSync: number;
}

export const IpcChannel = {
  // workspace
  workspace: {
    pickAndOpen: "workspace:pick-and-open",
    open: "workspace:open",
    openProjectDialog: "workspace:open-project-dialog",
    listFiles: "workspace:list-files",
    readFile: "workspace:read-file",
    writeFile: "workspace:write-file",
    createFile: "workspace:create-file",
    createDirectory: "workspace:create-dir",
    rename: "workspace:rename",
    delete: "workspace:delete",
    projectCards: "workspace:project-cards",
    createFromBlueprint: "workspace:create-from-blueprint",
    newFile: "workspace:new-file",
  },
  // templates (Template Studio)
  template: {
    list: "template:list",
    create: "template:create",
    save: "template:save",
    delete: "template:delete",
    preview: "template:preview",
    progress: "template:progress",
  },
  // git
  git: {
    status: "git:status",
    diff: "git:diff",
    diffStaged: "git:diff-staged",
    stage: "git:stage",
    unstage: "git:unstage",
    commit: "git:commit",
    log: "git:log",
    branches: "git:branches",
    checkout: "git:checkout",
    init: "git:init",
    aiCommit: "git:ai-commit",
    aiExplain: "git:ai-explain",
    aiUndoHunk: "git:ai-undo-hunk",
  },
  // terminal
  terminal: {
    spawn: "terminal:spawn",
    write: "terminal:write",
    resize: "terminal:resize",
    kill: "terminal:kill",
    data: "terminal:data",
    exit: "terminal:exit",
  },
  // live preview (dev server + file watcher)
  preview: {
    start: "preview:start",
    stop: "preview:stop",
    status: "preview:status",
    events: "preview:events",
  },
  // agent
  agent: {
    runTask: "agent:run-task",
    cancel: "agent:cancel",
    listSessions: "agent:list-sessions",
    sessionHistory: "agent:session-history",
    decide: "agent:decide",
    events: "agent:events",
    listModels: "agent:list-models",
    modelsChanged: "agent:models-changed",
    checkDeps: "agent:check-deps",
    usage: "agent:usage",
  },
  // settings (settings engine)
  settings: {
    get: "settings:get",
    set: "settings:set",
    setNvidiaKey: "settings:set-nvidia-key",
    changed: "settings:changed",
    getWorkspace: "settings:get-workspace",
    setWorkspace: "settings:set-workspace",
    resetWorkspace: "settings:reset-workspace",
  },
  // library (model library / Library Engine)
  library: {
    list: "library:list",
    download: "library:download",
    installed: "library:installed",
    progress: "library:progress",
  },
  // artifacts
  artifacts: {
    list: "artifacts:list",
    create: "artifacts:create",
    update: "artifacts:update",
    delete: "artifacts:delete",
    feedback: "artifacts:feedback",
    events: "artifacts:events",
  },
  // scheduled tasks
  tasks: {
    list: "tasks:list",
    create: "tasks:create",
    update: "tasks:update",
    delete: "tasks:delete",
    runNow: "tasks:run-now",
    history: "tasks:history",
    events: "tasks:events",
  },
  // MCP servers
  mcp: {
    list: "mcp:list",
    connectAll: "mcp:connect-all",
    reconnect: "mcp:reconnect",
    add: "mcp:add",
    update: "mcp:update",
    remove: "mcp:remove",
  },
  // editor
  editor: {
    openFile: "editor:open-file",
    getFileContent: "editor:get-file-content",
    saveFile: "editor:save-file",
    saveFileAs: "editor:save-file-as",
    diagnostics: "editor:diagnostics",
    inlineCompletion: "editor:inline-completion",
  },
  // app
  app: {
    getInfo: "app:get-info",
    openExternal: "app:open-external",
    showItemInFolder: "app:show-item-in-folder",
    pickFolder: "app:pick-folder",
    pickZip: "app:pick-zip",
    quitAndInstall: "app:quit-and-install",
    checkForUpdates: "app:check-for-updates",
    setReleaseChannel: "app:set-release-channel",
    getReleaseChannel: "app:get-release-channel",
  },
  // dashboard window
  dashboard: {
    open: "dashboard:open",
  },
  // auth & account
  auth: {
    getProviders: "auth:get-providers",
    configureProvider: "auth:configure-provider",
    login: "auth:login",
    signup: "auth:signup",
    logout: "auth:logout",
    logoutAll: "auth:logout-all",
    requestPasswordReset: "auth:request-password-reset",
    confirmPasswordReset: "auth:confirm-password-reset",
    verifyEmail: "auth:verify-email",
    getCurrentUser: "auth:get-current-user",
    getSession: "auth:get-session",
    getSessions: "auth:get-sessions",
    revokeSession: "auth:revoke-session",
    updateProfile: "auth:update-profile",
    changePassword: "auth:change-password",
    enableTwoFactor: "auth:enable-two-factor",
    verifyTwoFactor: "auth:verify-two-factor",
    refreshSession: "auth:refresh-session",
    getCurrentPlanName: "auth:get-current-plan-name",
    getCurrentBillingPlan: "auth:get-current-billing-plan",
    oauthBegin: "auth:oauth-begin",
    oauthPoll: "auth:oauth-poll",
    authChanged: "auth:changed",
  },
  account: {
    getProfile: "account:get-profile",
    saveProfile: "account:save-profile",
    getPrivacy: "account:get-privacy",
    savePrivacy: "account:save-privacy",
    getSecurity: "account:get-security",
    getConnectedAccounts: "account:get-connected-accounts",
    connectAccount: "account:connect-account",
    disconnectAccount: "account:disconnect-account",
    exportData: "account:export-data",
    downloadSettings: "account:download-settings",
    deleteAccount: "account:delete-account",
    saveAvatar: "account:save-avatar",
  },
  // hostinger my dashboard
  hostinger: {
    connect: "hostinger:connect",
    disconnect: "hostinger:disconnect",
    getStatus: "hostinger:get-status",
    getDashboard: "hostinger:get-dashboard",
    getWebsites: "hostinger:get-websites",
    getWebsite: "hostinger:get-website",
    getWebsiteDeployments: "hostinger:get-website-deployments",
    getWebsiteNodeJSBuilds: "hostinger:get-website-nodejs-builds",
    getDomains: "hostinger:get-domains",
    getDNSZone: "hostinger:get-dns-zone",
    getVPS: "hostinger:get-vps",
  },
  // ship & deploy (one-time project shipment)
  ship: {
    plan: "ship:plan",
    record: "ship:record",
    status: "ship:status",
  },
  // providers & models
  providers: {
    list: "providers:list",
    listAdapters: "providers:list-adapters",
    create: "providers:create",
    update: "providers:update",
    delete: "providers:delete",
    test: "providers:test",
    testModel: "providers:test-model",
    refreshModels: "providers:refresh-models",
    enabled: "providers:enabled",
    changed: "providers:changed",
  },
  models: {
    list: "models:list",
    create: "models:create",
    update: "models:update",
    delete: "models:delete",
    setDefault: "models:set-default",
    getDefault: "models:get-default",
    getFallbacks: "models:get-fallbacks",
    createFallback: "models:create-fallback",
    updateFallback: "models:update-fallback",
    deleteFallback: "models:delete-fallback",
    getRoutingRules: "models:get-routing-rules",
    createRoutingRule: "models:create-routing-rule",
    updateRoutingRule: "models:update-routing-rule",
    deleteRoutingRule: "models:delete-routing-rule",
    getProfiles: "models:get-profiles",
    createProfile: "models:create-profile",
    updateProfile: "models:update-profile",
    deleteProfile: "models:delete-profile",
    changed: "models:changed",
  },
  // credentials / API keys
  credentials: {
    list: "credentials:list",
    getStatus: "credentials:get-status",
    set: "credentials:set",
    delete: "credentials:delete",
    test: "credentials:test",
    changed: "credentials:changed",
  },
  // extensions
  extensions: {
    list: "extensions:list",
    install: "extensions:install",
    uninstall: "extensions:uninstall",
    enable: "extensions:enable",
    disable: "extensions:disable",
    update: "extensions:update",
    search: "extensions:search",
    getManifest: "extensions:get-manifest",
    checkCompatibility: "extensions:check-compatibility",
    changed: "extensions:changed",
  },
  // marketplace
  marketplace: {
    search: "marketplace:search",
    getExtension: "marketplace:get-extension",
    getExtensions: "marketplace:get-extensions",
    getVersions: "marketplace:get-versions",
    download: "marketplace:download",
    getCategories: "marketplace:get-categories",
    getFeatured: "marketplace:get-featured",
    getPopular: "marketplace:get-popular",
  },
  // plugins & integrations (RIDE plugin ecosystem)
  plugins: {
    catalog: "plugins:catalog",
    installed: "plugins:installed",
    install: "plugins:install",
    uninstall: "plugins:uninstall",
    enable: "plugins:enable",
    disable: "plugins:disable",
    connect: "plugins:connect",
    disconnect: "plugins:disconnect",
    verify: "plugins:verify",
    recommend: "plugins:recommend",
    scaffold: "plugins:scaffold",
    browse: "plugins:browse",
    purchase: "plugins:purchase",
    submit: "plugins:submit",
    prepareBundle: "plugins:prepare-bundle",
    importBundle: "plugins:import-bundle",
    deleteListing: "plugins:delete-listing",
    myListings: "plugins:my-listings",
    pending: "plugins:pending",
    approve: "plugins:approve",
    earnings: "plugins:earnings",
    purchases: "plugins:purchases",
    changed: "plugins:changed",
  },
  // share (Share modal: badge, zip download, GitHub export)
  share: {
    badgeHtml: "share:badge-html",
    downloadZip: "share:download-zip",
    exportToGitHub: "share:export-to-github",
  },
  // local AI (hardware detection + Ollama runtime + local chat)
  localAi: {
    status: "local-ai:status",
    installRuntime: "local-ai:install-runtime",
    pullModel: "local-ai:pull-model",
    deleteModel: "local-ai:delete-model",
    chat: "local-ai:chat",
    pullProgress: "local-ai:pull-progress",
    chatEvent: "local-ai:chat-event",
  },
  // galaxy (vendored uiverse.io UI library browser)
  galaxy: {
    list: "galaxy:list",
    read: "galaxy:read",
  },
} as const;

export type IpcChannel = (typeof IpcChannel)[keyof typeof IpcChannel];
