import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IpcChannel, type PermissionDecision, type RunTaskRequest } from "@ride/contracts";

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>;
}

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, p: T) => cb(p);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const api = {
  workspace: {
    openProjectDialog: () => invoke<import("@ride/contracts").WorkspaceOpenResult | null>(IpcChannel.workspace.openProjectDialog),
    open: (root: string) => invoke<import("@ride/contracts").WorkspaceOpenResult>(IpcChannel.workspace.open, root),
    listFiles: () => invoke<import("@ride/contracts").FileNode[]>(IpcChannel.workspace.listFiles),
    readFile: (path: string) => invoke<string>(IpcChannel.workspace.readFile, path),
    writeFile: (path: string, content: string) => invoke<{ ok: boolean }>(IpcChannel.workspace.writeFile, path, content),
    createFile: (path: string, content: string) => invoke<{ ok: boolean }>(IpcChannel.workspace.createFile, path, content),
    createDirectory: (path: string) => invoke<{ ok: boolean }>(IpcChannel.workspace.createDirectory, path),
    rename: (from: string, to: string) => invoke<{ ok: boolean }>(IpcChannel.workspace.rename, from, to),
    delete: (path: string) => invoke<{ ok: boolean; error?: string }>(IpcChannel.workspace.delete, path),
    projectCards: () => invoke<{ id: string; name: string; description: string; tags?: string[] }[]>(IpcChannel.workspace.projectCards),
    createFromBlueprint: (id: string, dest: string) =>
      invoke<import("@ride/contracts").WorkspaceOpenResult>(IpcChannel.workspace.createFromBlueprint, id, dest),
    newFile: () => invoke<import("@ride/contracts").NewFileResult | null>(IpcChannel.workspace.newFile),
  },
  template: {
    list: () =>
      invoke<{ builtin: import("@ride/contracts").RideTemplate[]; users: import("@ride/contracts").RideTemplate[] }>(IpcChannel.template.list),
    create: (req: import("@ride/contracts").TemplateCreateRequest) =>
      invoke<import("@ride/contracts").WorkspaceOpenResult>(IpcChannel.template.create, req),
    save: (req: import("@ride/contracts").TemplateSaveRequest) =>
      invoke<{ ok: boolean; error?: string; template?: import("@ride/contracts").RideTemplate }>(IpcChannel.template.save, req),
    delete: (id: string) => invoke<{ ok: boolean }>(IpcChannel.template.delete, id),
    preview: (id: string) => invoke<string | null>(IpcChannel.template.preview, id),
    onProgress: (cb: (event: { phase: string; pm?: string; ok?: boolean; error?: string; templateId?: string; templateName?: string; score?: number; verdict?: string; issues?: string[] }) => void) => on(IpcChannel.template.progress, cb),
  },
  editor: {
    openFile: (path: string) => invoke<{ path: string; content: string }>(IpcChannel.editor.openFile, path),
    getFileContent: (path: string) => invoke<string>(IpcChannel.editor.getFileContent, path),
    saveFile: (path: string, content: string) => invoke<{ ok: boolean }>(IpcChannel.editor.saveFile, path, content),
    saveFileAs: (content: string) => invoke<{ ok: boolean; path?: string }>(IpcChannel.editor.saveFileAs, content),
    inlineCompletion: (req: import("@ride/contracts").InlineCompletionRequest) =>
      invoke<import("@ride/contracts").InlineCompletionResult>(IpcChannel.editor.inlineCompletion, req),
  },
  git: {
    status: () => invoke<import("@ride/contracts").GitStatus | null>(IpcChannel.git.status),
    diff: (path?: string) => invoke<import("@ride/contracts").FileDiff[]>(IpcChannel.git.diff, path),
    diffStaged: () => invoke<import("@ride/contracts").FileDiff[]>(IpcChannel.git.diffStaged),
    stage: (paths: string[]) => invoke<{ ok: boolean }>(IpcChannel.git.stage, paths),
    unstage: (paths: string[]) => invoke<{ ok: boolean }>(IpcChannel.git.unstage, paths),
    commit: (message: string) => invoke<{ ok: boolean }>(IpcChannel.git.commit, message),
    log: () => invoke<{ hash: string; subject: string; author: string; date: string }[]>(IpcChannel.git.log),
    branches: () => invoke<{ current: string; branches: string[] }>(IpcChannel.git.branches),
    checkout: (branch: string) => invoke<{ ok: boolean }>(IpcChannel.git.checkout, branch),
    init: () => invoke<{ ok: boolean; error?: string }>(IpcChannel.git.init),
    aiCommit: (paths: string[], message: string) => invoke<{ ok: boolean }>(IpcChannel.git.aiCommit, paths, message),
    aiExplain: (path: string, ref?: string) =>
      invoke<{ blob: string | null; diff: import("@ride/contracts").FileDiff[] }>(IpcChannel.git.aiExplain, path, ref),
    aiUndoHunk: (paths: string[]) => invoke<{ ok: boolean }>(IpcChannel.git.aiUndoHunk, paths),
  },
  terminal: {
    spawn: (req: { id?: string; cwd: string; cols: number; rows: number }) =>
      invoke<{ id: string }>(IpcChannel.terminal.spawn, req),
    write: (id: string, data: string) => ipcRenderer.send(IpcChannel.terminal.write, { id, data }),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.send(IpcChannel.terminal.resize, { id, cols, rows }),
    kill: (id: string) => ipcRenderer.send(IpcChannel.terminal.kill, id),
    onData: (cb: (payload: { id: string; data: string }) => void) => on(IpcChannel.terminal.data, cb),
    onExit: (cb: (payload: { id: string; code: number }) => void) => on(IpcChannel.terminal.exit, cb),
  },
  preview: {
    start: (root?: string) => invoke<import("@ride/contracts").PreviewStatus>(IpcChannel.preview.start, root),
    stop: () => invoke<import("@ride/contracts").PreviewStatus>(IpcChannel.preview.stop),
    status: () => invoke<import("@ride/contracts").PreviewStatus>(IpcChannel.preview.status),
    onEvent: (cb: (event: import("@ride/contracts").PreviewEvent) => void) => on(IpcChannel.preview.events, cb),
  },
  agent: {
    runTask: (req: RunTaskRequest) => invoke<{ started: boolean }>(IpcChannel.agent.runTask, req),
    cancel: (sessionId: string) => invoke<{ ok: boolean }>(IpcChannel.agent.cancel, sessionId),
    listSessions: () => invoke<import("@ride/contracts").RideSession[]>(IpcChannel.agent.listSessions),
    sessionHistory: (sessionId: string) => invoke<unknown[]>(IpcChannel.agent.sessionHistory, sessionId),
    decide: (payload: PermissionDecision) => invoke<{ ok: boolean }>(IpcChannel.agent.decide, payload),
    listModels: () => invoke<import("@ride/contracts").RideModel[]>(IpcChannel.agent.listModels),
    checkDeps: () => invoke<{ opencode: boolean; ollama: boolean; version: string }>(IpcChannel.agent.checkDeps),
    usage: () => invoke<import("@ride/contracts").UsageTotals>(IpcChannel.agent.usage),
    onEvent: (cb: (event: unknown) => void) => on(IpcChannel.agent.events, cb),
  },
  app: {
    getInfo: () => invoke<{ version: string; platform: string; arch: string; node: string; electron: string }>(IpcChannel.app.getInfo),
    openExternal: (url: string) => invoke<{ ok: boolean }>(IpcChannel.app.openExternal, url),
    showItemInFolder: (path: string) => invoke<{ ok: boolean }>(IpcChannel.app.showItemInFolder, path),
    pickFolder: () => invoke<string | null>(IpcChannel.app.pickFolder),
    pickZip: () => invoke<string | null>(IpcChannel.app.pickZip),
    quitAndInstall: () => invoke<{ ok: boolean }>(IpcChannel.app.quitAndInstall),
    checkForUpdates: () => invoke<{ available: boolean; version?: string }>(IpcChannel.app.checkForUpdates),
    setReleaseChannel: (channel: "stable" | "beta" | "alpha") => invoke<{ ok: boolean }>(IpcChannel.app.setReleaseChannel, channel),
    getReleaseChannel: () => invoke<"stable" | "beta" | "alpha">(IpcChannel.app.getReleaseChannel),
  },
  dashboard: {
    open: () => invoke<{ ok: boolean }>(IpcChannel.dashboard.open),
  },
  artifacts: {
    list: (sessionId?: string) => invoke<import("@ride/contracts").Artifact[]>(IpcChannel.artifacts.list, sessionId),
    create: (input: { sessionId: string; kind: string; title: string; content: string; metadata?: Record<string, unknown> }) =>
      invoke<import("@ride/contracts").Artifact>(IpcChannel.artifacts.create, input),
    update: (id: string, patch: { title?: string; content?: string; metadata?: Record<string, unknown> }) =>
      invoke<import("@ride/contracts").Artifact | undefined>(IpcChannel.artifacts.update, id, patch),
    delete: (id: string) => invoke<{ ok: boolean }>(IpcChannel.artifacts.delete, id),
    feedback: (artifactId: string, feedback: string) => invoke<{ ok: boolean }>(IpcChannel.artifacts.feedback, artifactId, feedback),
    onEvent: (cb: (event: unknown) => void) => on(IpcChannel.artifacts.events, cb),
  },
  tasks: {
    list: () => invoke<import("@ride/contracts").ScheduledTask[]>(IpcChannel.tasks.list),
    create: (input: { name: string; prompt: string; schedule: import("@ride/contracts").TaskSchedule; intervalMinutes?: number; dayOfWeek?: number; hourOfDay?: number; workspaceRoot?: string; enabled?: boolean; model?: string }) =>
      invoke<import("@ride/contracts").ScheduledTask>(IpcChannel.tasks.create, input),
    update: (id: string, patch: Partial<import("@ride/contracts").ScheduledTask>) =>
      invoke<import("@ride/contracts").ScheduledTask | null>(IpcChannel.tasks.update, id, patch),
    delete: (id: string) => invoke<boolean>(IpcChannel.tasks.delete, id),
    runNow: (id: string) => invoke<import("@ride/contracts").TaskRunHistory | null>(IpcChannel.tasks.runNow, id),
    history: (taskId: string) => invoke<import("@ride/contracts").TaskRunHistory[]>(IpcChannel.tasks.history, taskId),
    onEvent: (cb: (event: { event: string; taskId: string; history: import("@ride/contracts").TaskRunHistory }) => void) =>
      on(IpcChannel.tasks.events, cb),
  },
  mcp: {
    list: () => invoke<Array<{ id: string; name: string; url: string; enabled: boolean; connected: boolean; lastError: string | null }>>(IpcChannel.mcp.list),
    connectAll: () => invoke<Array<{ id: string; name: string; url: string; enabled: boolean; connected: boolean; lastError: string | null }>>(IpcChannel.mcp.connectAll),
    reconnect: (id: string) =>
      invoke<{ ok: boolean; error?: string; tools?: import("@ride/contracts").McpServer["tools"] }>(IpcChannel.mcp.reconnect, id),
    add: (input: { name: string; url: string; headers?: Record<string, string> }) =>
      invoke<import("@ride/contracts").McpServer | null>(IpcChannel.mcp.add, input),
    update: (id: string, patch: Partial<{ name: string; url: string; headers: Record<string, string>; enabled: boolean }>) =>
      invoke<import("@ride/contracts").McpServer | null>(IpcChannel.mcp.update, id, patch),
    remove: (id: string) => invoke<boolean>(IpcChannel.mcp.remove, id),
  },
  settings: {
    get: () => invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.get),
    set: (patch: Partial<import("@ride/contracts").RideSettings>) => invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.set, patch),
    setNvidiaKey: (key: string) => invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.setNvidiaKey, key),
    resetGroup: (group: string) => invoke<import("@ride/contracts").RideSettings>("settings:reset-group", group),
    resetAll: () => invoke<import("@ride/contracts").RideSettings>("settings:reset-all"),
    export: () => invoke<string>("settings:export"),
    import: (json: string) => invoke<import("@ride/contracts").RideSettings>("settings:import", json),
    getWorkspace: (root: string) => invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.getWorkspace, root),
    setWorkspace: (root: string, patch: Partial<import("@ride/contracts").RideSettings>) =>
      invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.setWorkspace, root, patch),
    resetWorkspace: (root: string) => invoke<import("@ride/contracts").RideSettings>(IpcChannel.settings.resetWorkspace, root),
    onChanged: (cb: (settings: import("@ride/contracts").RideSettings) => void) => on(IpcChannel.settings.changed, cb),
  },
  auth: {
    getProviders: () => invoke<import("@ride/contracts").AuthProvider[]>(IpcChannel.auth.getProviders),
    configureProvider: (id: string, config: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AuthProvider | undefined>(IpcChannel.auth.configureProvider, id, config),
    login: (credentials: { email: string; password: string }) =>
      invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.login, credentials),
    signup: (data: { email: string; password: string; displayName: string; username?: string }) =>
      invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.signup, data),
    logout: () => invoke<void>(IpcChannel.auth.logout),
    logoutAll: () => invoke<void>(IpcChannel.auth.logoutAll),
    requestPasswordReset: (email: string) =>
      invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.requestPasswordReset, { email }),
    confirmPasswordReset: (token: string, newPassword: string) =>
      invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.confirmPasswordReset, { token, newPassword }),
    verifyEmail: (token: string) => invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.verifyEmail, token),
    getCurrentUser: () => invoke<import("@ride/contracts").UserAccount | null>(IpcChannel.auth.getCurrentUser),
    getSessions: () => invoke<import("@ride/contracts").AuthSession[]>(IpcChannel.auth.getSessions),
    revokeSession: (sessionId: string) => invoke<boolean>(IpcChannel.auth.revokeSession, sessionId),
    updateProfile: (updates: Record<string, unknown>) =>
      invoke<import("@ride/contracts").UserAccount | null>(IpcChannel.auth.updateProfile, updates),
    changePassword: (current: string, next: string) =>
      invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.changePassword, current, next),
    enableTwoFactor: () => invoke<{ secret: string; qrCode: string } | null>(IpcChannel.auth.enableTwoFactor),
    verifyTwoFactor: (token: string) => invoke<boolean>(IpcChannel.auth.verifyTwoFactor, token),
    refreshSession: () => invoke<import("@ride/contracts").AuthResult>(IpcChannel.auth.refreshSession),
    oauthBegin: (providerId: string) =>
      invoke<import("@ride/contracts").OAuthDeviceFlow>(IpcChannel.auth.oauthBegin, providerId),
    oauthPoll: (providerId: string) =>
      invoke<import("@ride/contracts").OAuthPollResult>(IpcChannel.auth.oauthPoll, providerId),
    getCurrentPlanName: () => invoke<string>(IpcChannel.auth.getCurrentPlanName),
    getCurrentBillingPlan: () => invoke<import("@ride/contracts").BillingPlan | null>(IpcChannel.auth.getCurrentBillingPlan),
    onChanged: (cb: (event: Record<string, unknown>) => void) => on(IpcChannel.auth.authChanged, cb),
  },
  account: {
    getProfile: () => invoke<import("@ride/contracts").ProfileData>(IpcChannel.account.getProfile),
    saveProfile: (profile: Record<string, unknown>) =>
      invoke<import("@ride/contracts").ProfileData>(IpcChannel.account.saveProfile, profile),
    getPrivacy: () => invoke<import("@ride/contracts").PrivacyData>(IpcChannel.account.getPrivacy),
    savePrivacy: (privacy: Record<string, unknown>) =>
      invoke<import("@ride/contracts").PrivacyData>(IpcChannel.account.savePrivacy, privacy),
    getSecurity: () => invoke<Record<string, unknown>>(IpcChannel.account.getSecurity),
    getConnectedAccounts: () => invoke<import("@ride/contracts").ConnectedAccount[]>(IpcChannel.account.getConnectedAccounts),
    connectAccount: (provider: string, email?: string, username?: string) =>
      invoke<import("@ride/contracts").ConnectedAccount | null>(IpcChannel.account.connectAccount, provider, email, username),
    disconnectAccount: (accountId: string) => invoke<boolean>(IpcChannel.account.disconnectAccount, accountId),
    exportData: () => invoke<Record<string, unknown>>(IpcChannel.account.exportData),
    downloadSettings: () => invoke<string>(IpcChannel.account.downloadSettings),
    deleteAccount: (confirmation: string) => invoke<boolean>(IpcChannel.account.deleteAccount, confirmation),
  },
  hostinger: {
    connect: (apiToken: string) => invoke<{ ok: boolean; connected: boolean }>(IpcChannel.hostinger.connect, { apiToken }),
    disconnect: () => invoke<{ ok: boolean; connected: boolean }>(IpcChannel.hostinger.disconnect),
    getStatus: () => invoke<{ connected: boolean }>(IpcChannel.hostinger.getStatus),
    getDashboard: () => invoke<import("@ride/contracts").MyDashboardData>(IpcChannel.hostinger.getDashboard),
    getWebsites: () => invoke<{ websites: import("@ride/contracts").HostingerWebsite[] }>(IpcChannel.hostinger.getWebsites),
    getWebsite: (id: string) => invoke<import("@ride/contracts").HostingerWebsite | null>(IpcChannel.hostinger.getWebsite, id),
    getWebsiteDeployments: (id: string) => invoke<{ deployments: import("@ride/contracts").HostingerDeployment[] }>(IpcChannel.hostinger.getWebsiteDeployments, id),
    getWebsiteNodeJSBuilds: (id: string) => invoke<{ builds: import("@ride/contracts").HostingerNodeJSBuild[] }>(IpcChannel.hostinger.getWebsiteNodeJSBuilds, id),
    getDomains: () => invoke<{ domains: import("@ride/contracts").HostingerDomain[] }>(IpcChannel.hostinger.getDomains),
    getDNSZone: (domain: string) => invoke<import("@ride/contracts").HostingerDNSZone | null>(IpcChannel.hostinger.getDNSZone, domain),
    getVPS: () => invoke<{ servers: any[] }>(IpcChannel.hostinger.getVPS),
  },
  ship: {
    plan: () => invoke<import("@ride/contracts").BillingPlan | null>(IpcChannel.ship.plan),
    record: (input: { projectRoot: string; projectName: string; paymentMethod: string }) =>
      invoke<import("@ride/contracts").ShipmentRecord | null>(IpcChannel.ship.record, input),
    status: (projectRoot: string) => invoke<import("@ride/contracts").ShipStatus>(IpcChannel.ship.status, projectRoot),
  },
  providers: {
    list: () => invoke<import("@ride/contracts").AIProvider[]>(IpcChannel.providers.list),
    listAdapters: () =>
      invoke<{ id: string; name: string; displayName: string; kind: string; requiresApiKey: boolean; defaultBaseUrl?: string }[]>(
        IpcChannel.providers.listAdapters,
      ),
    create: (req: import("@ride/contracts").CreateProviderRequest) =>
      invoke<import("@ride/contracts").AIProvider>(IpcChannel.providers.create, req),
    update: (id: string, updates: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AIProvider | undefined>(IpcChannel.providers.update, id, updates),
    delete: (id: string) => invoke<boolean>(IpcChannel.providers.delete, id),
    test: (id: string) => invoke<import("@ride/contracts").ProviderTestResult>(IpcChannel.providers.test, id),
    testModel: (providerId: string, modelId: string) =>
      invoke<import("@ride/contracts").ProviderTestResult>(IpcChannel.providers.testModel, providerId, modelId),
    refreshModels: (id: string) => invoke<unknown[]>(IpcChannel.providers.refreshModels, id),
    onChanged: (cb: (event: Record<string, unknown>) => void) => on(IpcChannel.providers.changed, cb),
  },
  models: {
    list: () => invoke<import("@ride/contracts").ModelConfiguration[]>(IpcChannel.models.list),
    create: (providerId: string, modelId: string, overrides?: Record<string, unknown>) =>
      invoke<import("@ride/contracts").ModelConfiguration>(IpcChannel.models.create, providerId, modelId, overrides),
    update: (id: string, updates: Record<string, unknown>) =>
      invoke<import("@ride/contracts").ModelConfiguration | undefined>(IpcChannel.models.update, id, updates),
    delete: (id: string) => invoke<boolean>(IpcChannel.models.delete, id),
    setDefault: (id: string) => invoke<boolean>(IpcChannel.models.setDefault, id),
    getDefault: () => invoke<import("@ride/contracts").ModelConfiguration | undefined>(IpcChannel.models.getDefault),
    getFallbacks: () => invoke<unknown[]>(IpcChannel.models.getFallbacks),
    createFallback: (fallback: Record<string, unknown>) => invoke<unknown>(IpcChannel.models.createFallback, fallback),
    updateFallback: (id: string, updates: Record<string, unknown>) => invoke<unknown>(IpcChannel.models.updateFallback, id, updates),
    deleteFallback: (id: string) => invoke<boolean>(IpcChannel.models.deleteFallback, id),
    getRoutingRules: () => invoke<import("@ride/contracts").AgentRoutingRule[]>(IpcChannel.models.getRoutingRules),
    createRoutingRule: (rule: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AgentRoutingRule>(IpcChannel.models.createRoutingRule, rule),
    updateRoutingRule: (id: string, updates: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AgentRoutingRule | undefined>(IpcChannel.models.updateRoutingRule, id, updates),
    deleteRoutingRule: (id: string) => invoke<boolean>(IpcChannel.models.deleteRoutingRule, id),
    getProfiles: () => invoke<import("@ride/contracts").AgentProfile[]>(IpcChannel.models.getProfiles),
    createProfile: (profile: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AgentProfile>(IpcChannel.models.createProfile, profile),
    updateProfile: (id: string, updates: Record<string, unknown>) =>
      invoke<import("@ride/contracts").AgentProfile | undefined>(IpcChannel.models.updateProfile, id, updates),
    deleteProfile: (id: string) => invoke<boolean>(IpcChannel.models.deleteProfile, id),
    onChanged: (cb: (event: Record<string, unknown>) => void) => on(IpcChannel.models.changed, cb),
  },
  credentials: {
    list: () =>
      invoke<{ key: string; hasValue: boolean; updatedAt: number }[]>(IpcChannel.credentials.list),
    getStatus: () => invoke<{ vaultType: string; secure: boolean }>(IpcChannel.credentials.getStatus),
    set: (key: string, value: string) => invoke<{ ok: boolean }>(IpcChannel.credentials.set, key, value),
    delete: (key: string) => invoke<{ ok: boolean }>(IpcChannel.credentials.delete, key),
    test: (key: string) => invoke<{ ok: boolean }>(IpcChannel.credentials.test, key),
    onChanged: (cb: (event: Record<string, unknown>) => void) => on(IpcChannel.credentials.changed, cb),
  },
  extensions: {
    list: () => invoke<import("@ride/contracts").InstalledExtension[]>(IpcChannel.extensions.list),
    install: () => invoke<import("@ride/contracts").InstalledExtension | null>(IpcChannel.extensions.install),
    uninstall: (id: string) => invoke<boolean>(IpcChannel.extensions.uninstall, id),
    enable: (id: string) => invoke<boolean>(IpcChannel.extensions.enable, id),
    disable: (id: string) => invoke<boolean>(IpcChannel.extensions.disable, id),
    update: (id: string) => invoke<import("@ride/contracts").InstalledExtension | null>(IpcChannel.extensions.update, id),
    search: (query: string) => invoke<import("@ride/contracts").InstalledExtension[]>(IpcChannel.extensions.search, query),
    getManifest: (id: string) => invoke<Record<string, unknown> | null>(IpcChannel.extensions.getManifest, id),
    checkCompatibility: (manifest: Record<string, unknown>) =>
      invoke<import("@ride/contracts").ExtensionCompatibility | null>(IpcChannel.extensions.checkCompatibility, manifest),
    onChanged: (cb: (event: Record<string, unknown>) => void) => on(IpcChannel.extensions.changed, cb),
  },
  marketplace: {
    search: (options: Record<string, unknown>) =>
      invoke<import("@ride/contracts").MarketplaceSearchResult>(IpcChannel.marketplace.search, options),
    getExtension: (id: string) =>
      invoke<import("@ride/contracts").MarketplaceExtension | null>(IpcChannel.marketplace.getExtension, id),
    getVersions: (id: string) => invoke<unknown[]>(IpcChannel.marketplace.getVersions, id),
    download: (id: string, version?: string) =>
      invoke<{ ok: boolean; path?: string; error?: string; extension?: import("@ride/contracts").InstalledExtension }>(
        IpcChannel.marketplace.download,
        id,
        version,
      ),
    getCategories: () => invoke<{ id: string; name: string; description: string; icon: string; extensionCount: number }[]>(
      IpcChannel.marketplace.getCategories,
    ),
    getFeatured: (limit?: number) =>
      invoke<import("@ride/contracts").MarketplaceExtension[]>(IpcChannel.marketplace.getFeatured, limit),
    getPopular: (limit?: number) =>
      invoke<import("@ride/contracts").MarketplaceExtension[]>(IpcChannel.marketplace.getPopular, limit),
  },
  share: {
    badgeHtml: (origin?: string) => invoke<string>(IpcChannel.share.badgeHtml, origin),
    downloadZip: (workspacePath: string) =>
      invoke<import("@ride/contracts").ShareDownloadResult>(IpcChannel.share.downloadZip, workspacePath),
    exportToGitHub: (input: { workspacePath: string; repoName: string; visibility?: "public" | "private" }) =>
      invoke<import("@ride/contracts").ShareExportResult>(IpcChannel.share.exportToGitHub, input),
  },
  localAi: {
    status: () => invoke<import("@ride/contracts").LocalAiStatus>(IpcChannel.localAi.status),
    installRuntime: () => invoke<{ ok: boolean; error?: string }>(IpcChannel.localAi.installRuntime),
    pullModel: (tag: string) => invoke<{ ok: boolean }>(IpcChannel.localAi.pullModel, tag),
    deleteModel: (tag: string) => invoke<{ ok: boolean }>(IpcChannel.localAi.deleteModel, tag),
    chat: (req: import("@ride/contracts").LocalChatRequest) =>
      invoke<{ started: boolean }>(IpcChannel.localAi.chat, req),
    onPullProgress: (cb: (event: import("@ride/contracts").PullProgress) => void) =>
      on(IpcChannel.localAi.pullProgress, cb),
    onChatEvent: (cb: (event: import("@ride/contracts").LocalChatEvent) => void) =>
      on(IpcChannel.localAi.chatEvent, cb),
  },
  galaxy: {
    list: () =>
      invoke<{ components: import("@ride/contracts").GalaxyComponent[]; categories: import("@ride/contracts").GalaxyCategory[] }>(
        IpcChannel.galaxy.list,
      ),
    read: (relPath: string) =>
      invoke<{ ok: boolean; content?: string; attribution?: string; error?: string }>(IpcChannel.galaxy.read, relPath),
  },
  plugins: {
    catalog: () => invoke<import("@ride/plugins").PluginManifest[]>(IpcChannel.plugins.catalog),
    installed: () => invoke<import("@ride/plugins").PluginInstallation[]>(IpcChannel.plugins.installed),
    install: (manifestId: string) =>
      invoke<{ installation: import("@ride/plugins").PluginInstallation; checklist: Array<{ step: string; ok: boolean }> }>(
        IpcChannel.plugins.install,
        manifestId,
      ),
    uninstall: (manifestId: string) => invoke<boolean>(IpcChannel.plugins.uninstall, manifestId),
    enable: (manifestId: string) => invoke<import("@ride/plugins").PluginInstallation | undefined>(IpcChannel.plugins.enable, manifestId),
    disable: (manifestId: string) => invoke<import("@ride/plugins").PluginInstallation | undefined>(IpcChannel.plugins.disable, manifestId),
    connect: (manifestId: string, providerId: string, values: Record<string, string>) =>
      invoke<import("@ride/plugins").PluginInstallation | undefined>(IpcChannel.plugins.connect, manifestId, providerId, values),
    disconnect: (manifestId: string, providerId: string) =>
      invoke<import("@ride/plugins").PluginInstallation | undefined>(IpcChannel.plugins.disconnect, manifestId, providerId),
    verify: (manifestId: string, providerId: string) =>
      invoke<{ ok: boolean; missing: string[] }>(IpcChannel.plugins.verify, manifestId, providerId),
    recommend: (prompt: string) => invoke<import("@ride/plugins").CapabilityAnalysis>(IpcChannel.plugins.recommend, prompt),
    scaffold: (manifestId: string, opts?: { framework?: string; serverDir?: string; clientDir?: string }) =>
      invoke<import("@ride/plugins").ScaffoldFile[]>(IpcChannel.plugins.scaffold, manifestId, opts),
    browse: (opts?: { query?: string; category?: string; kind?: string; freeOnly?: boolean; verifiedOnly?: boolean }) =>
      invoke<import("@ride/marketplace").MarketplaceListing[]>(IpcChannel.plugins.browse, opts),
    purchase: (listingId: string, buyerId: string) =>
      invoke<import("@ride/marketplace").PurchaseRecord | null>(IpcChannel.plugins.purchase, listingId, buyerId),
    submit: (input: {
      creatorId: string;
      creatorName?: string;
      kind: string;
      title: string;
      description: string;
      category: string;
      pricePaise: number;
      framework?: string;
      manifestId?: string;
      bundleRef?: string;
      version?: string;
      tags?: string[];
    }) => invoke<import("@ride/marketplace").MarketplaceListing>(IpcChannel.plugins.submit, input),
    prepareBundle: (
      source: { type: "workspace" } | { type: "folder"; path: string } | { type: "zip"; path: string },
      workspaceRoot?: string,
    ) =>
      invoke<{
        bundleId: string;
        zipPath: string;
        rootName: string;
        framework: string;
        language: string;
        fileCount: number;
        sizeBytes: number;
        deps: string[];
      }>(IpcChannel.plugins.prepareBundle, source, workspaceRoot),
    importBundle: (listingId: string, buyerId: string, dest?: string) =>
      invoke<string>(IpcChannel.plugins.importBundle, listingId, buyerId, dest),
    deleteListing: (listingId: string) => invoke<boolean>(IpcChannel.plugins.deleteListing, listingId),
    myListings: (creatorId: string) =>
      invoke<import("@ride/marketplace").MarketplaceListing[]>(IpcChannel.plugins.myListings, creatorId),
    pending: () => invoke<import("@ride/marketplace").MarketplaceListing[]>(IpcChannel.plugins.pending),
    approve: (listingId: string, approve: boolean, note?: string) =>
      invoke<import("@ride/marketplace").MarketplaceListing | undefined>(IpcChannel.plugins.approve, listingId, approve, note),
    earnings: (creatorId: string) =>
      invoke<{
        totalSalesPaise: number;
        commissionPaise: number;
        creatorPaise: number;
        pendingPaise: number;
        salesCount: number;
      }>(IpcChannel.plugins.earnings, creatorId),
    purchases: (buyerId: string) =>
      invoke<Array<{ purchase: import("@ride/marketplace").PurchaseRecord; listing?: import("@ride/marketplace").MarketplaceListing }>>(
        IpcChannel.plugins.purchases,
        buyerId,
      ),
    onChange: (cb: (payload: { type: string; manifestId?: string; listingId?: string }) => void) =>
      on(IpcChannel.plugins.changed, cb),
  },
};

export type RideApi = typeof api;

contextBridge.exposeInMainWorld("ride", api);