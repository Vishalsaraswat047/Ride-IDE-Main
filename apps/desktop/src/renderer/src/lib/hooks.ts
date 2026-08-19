import { useCallback, useEffect, useState } from "react";
import type { AgentEvent, AuthProvider, AuthResult, FileNode, RideModel, RideSession, RideSettings, RideTemplate, UserAccount, WorkspaceOpenResult } from "@ride/contracts";
import { RideWorkspace } from "@ride/ide-core";

export const workspace = new RideWorkspace();

/**
 * Global settings store: fetched on mount and kept in sync via the
 * settings.changed broadcast from the main process.
 */
export function useSettings(): { settings: RideSettings | null; update: (patch: Partial<RideSettings>) => Promise<void>; setNvidiaKey: (key: string) => Promise<void> } {
  const [settings, setSettings] = useState<RideSettings | null>(null);

  const refresh = useCallback(() => {
    void window.ride.settings.get().then(setSettings);
  }, []);

  useEffect(() => {
    refresh();
    return window.ride.settings.onChanged(setSettings);
  }, [refresh]);

  const update = useCallback(async (patch: Partial<RideSettings>) => {
    setSettings(await window.ride.settings.set(patch));
  }, []);

  const setNvidiaKey = useCallback(async (key: string) => {
    setSettings(await window.ride.settings.setNvidiaKey(key));
  }, []);

  return { settings, update, setNvidiaKey };
}

export function useWorkspace(): RideWorkspace {
  const [, force] = useState(0);
  useEffect(() => {
    return workspace.subscribe(() => force((n) => n + 1));
  }, []);
  return workspace;
}

export function useAgentEvents(onEvent: (ev: unknown) => void): void {
  useEffect(() => {
    return window.ride.agent.onEvent(onEvent);
  }, [onEvent]);
}

export function useModels(): { models: RideModel[]; selected: string | null; refresh: () => Promise<void>; select: (id: string) => void } {
  const [models, setModels] = useState<RideModel[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await window.ride.agent.listModels();
      setModels(list);
      setSelected((cur) => cur && list.some((m) => m.id === cur) ? cur : (list[0]?.id ?? null));
    } catch {
      setModels([]);
    }
  }, []);

  const select = useCallback((id: string) => setSelected(id), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { models, selected, refresh, select };
}

export function useSessions(): RideSession[] {
  const [sessions, setSessions] = useState<RideSession[]>([]);
  useEffect(() => {
    void window.ride.agent.listSessions().then(setSessions);
  }, []);
  return sessions;
}

/**
 * Auth store: current user (if any), available sign-in providers and the
 * full set of auth actions wired to the main-process AuthService.
 */
export function useAuth(): {
  user: UserAccount | null;
  providers: AuthProvider[];
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (data: { email: string; password: string; displayName: string; username?: string }) => Promise<AuthResult>;
  oauthBegin: (providerId: string) => Promise<import("@ride/contracts").OAuthDeviceFlow>;
  oauthPoll: (providerId: string) => Promise<import("@ride/contracts").OAuthPollResult>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  confirmPasswordReset: (token: string, newPassword: string) => Promise<AuthResult>;
  verifyEmail: (token: string) => Promise<AuthResult>;
  refresh: () => void;
  getCurrentPlanName: () => Promise<string>;
  getCurrentBillingPlan: () => Promise<import("@ride/contracts").BillingPlan | null>;
} {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    void window.ride.auth.getCurrentUser().then(setUser);
    void window.ride.auth.getProviders().then(setProviders).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    return window.ride.auth.onChanged(() => refresh());
  }, [refresh]);

  const login = useCallback((email: string, password: string) => window.ride.auth.login({ email, password }), []);
  const oauthBegin = useCallback((providerId: string) => window.ride.auth.oauthBegin(providerId), []);
  const oauthPoll = useCallback((providerId: string) => window.ride.auth.oauthPoll(providerId), []);
  const signup = useCallback(
    (data: { email: string; password: string; displayName: string; username?: string }) => window.ride.auth.signup(data),
    [],
  );
  const logout = useCallback(() => window.ride.auth.logout(), []);
  const logoutAll = useCallback(() => window.ride.auth.logoutAll(), []);
  const requestPasswordReset = useCallback((email: string) => window.ride.auth.requestPasswordReset(email), []);
  const confirmPasswordReset = useCallback((token: string, newPassword: string) => window.ride.auth.confirmPasswordReset(token, newPassword), []);
  const verifyEmail = useCallback((token: string) => window.ride.auth.verifyEmail(token), []);

  const getCurrentPlanName = useCallback(() => window.ride.auth.getCurrentPlanName(), []);
  const getCurrentBillingPlan = useCallback(() => window.ride.auth.getCurrentBillingPlan(), []);

  return { user, providers, loading, login, signup, oauthBegin, oauthPoll, logout, logoutAll, requestPasswordReset, confirmPasswordReset, verifyEmail, refresh, getCurrentPlanName, getCurrentBillingPlan };
}

/** Providers + models + API keys for the AI settings area. */
export function useProviders(): {
  providers: import("@ride/contracts").AIProvider[];
  adapters: { id: string; name: string; displayName: string; kind: string; requiresApiKey: boolean; defaultBaseUrl?: string }[];
  loading: boolean;
  refresh: () => void;
} {
  const [providers, setProviders] = useState<import("@ride/contracts").AIProvider[]>([]);
  const [adapters, setAdapters] = useState<{ id: string; name: string; displayName: string; kind: string; requiresApiKey: boolean; defaultBaseUrl?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    void Promise.all([window.ride.providers.list(), window.ride.providers.listAdapters()])
      .then(([p, a]) => {
        setProviders(p);
        setAdapters(a);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    return window.ride.providers.onChanged(refresh);
  }, [refresh]);

  return { providers, adapters, loading, refresh };
}

/** Account data (profile, security, connected accounts, privacy). */
export function useAccountData(): {
  profile: import("@ride/contracts").ProfileData | null;
  privacy: import("@ride/contracts").PrivacyData | null;
  connected: import("@ride/contracts").ConnectedAccount[];
  refresh: () => Promise<void>;
} {
  const [profile, setProfile] = useState<import("@ride/contracts").ProfileData | null>(null);
  const [privacy, setPrivacy] = useState<import("@ride/contracts").PrivacyData | null>(null);
  const [connected, setConnected] = useState<import("@ride/contracts").ConnectedAccount[]>([]);

  const refresh = useCallback(async () => {
    try {
      const [p, pr, c] = await Promise.all([
        window.ride.account.getProfile(),
        window.ride.account.getPrivacy(),
        window.ride.account.getConnectedAccounts(),
      ]);
      setProfile(p);
      setPrivacy(pr);
      setConnected(c);
    } catch {
      /* not signed in or service error */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, privacy, connected, refresh };
}

export function useDeps(): { opencode: boolean; ollama: boolean; version: string } {
  const [deps, setDeps] = useState({ opencode: false, ollama: false, version: "" });
  useEffect(() => {
    void window.ride.agent.checkDeps().then(setDeps);
  }, []);
  return deps;
}

export function openWorkspaceAndLoad(workspace: RideWorkspace): Promise<void> {
  return window.ride.workspace.openProjectDialog().then(async (result: WorkspaceOpenResult | null) => {
    if (!result) return;
    workspace.setWorkspace(result);
    const tree = await window.ride.workspace.listFiles();
    workspace.setTree(tree as FileNode[]);
  });
}

export const UNTITLED_PATH = "untitled";

export async function newFileAndLoad(workspace: RideWorkspace): Promise<void> {
  const result = await window.ride.workspace.newFile();
  if (!result) return;
  workspace.setWorkspace(result.workspace);
  const tree = await window.ride.workspace.listFiles();
  workspace.setTree(tree as FileNode[]);
  workspace.openFile({ path: UNTITLED_PATH, content: "", language: "plaintext" });
}

/** Ctrl+S: plain save when a real file, otherwise Save-As dialog (then re-root the workspace to the saved file's folder). */
export async function saveActiveFileAs(ws: RideWorkspace): Promise<boolean> {
  const tab = ws.activeTab;
  if (!tab) return false;
  const content = ws.contentFor(tab.path);
  if (tab.path !== UNTITLED_PATH) {
    await window.ride.editor.saveFile(tab.path, content);
    ws.markSaved(tab.path);
    return true;
  }
  const r = await window.ride.editor.saveFileAs(content);
  if (!r.ok || !r.path) return false;
  const dir = r.path.slice(0, Math.max(r.path.lastIndexOf("/"), r.path.lastIndexOf("\\")));
  const lang = detectLang(r.path);
  const opened = await window.ride.workspace.open(dir);
  ws.setWorkspace(opened);
  const tree = await window.ride.workspace.listFiles();
  ws.setTree(tree as FileNode[]);
  ws.openFile({ path: r.path, content, language: lang });
  return true;
}

export function refreshTree(ws: RideWorkspace): Promise<void> {
  return window.ride.workspace.listFiles().then((tree) => ws.setTree(tree as FileNode[]));
}

export async function openFileInWorkspace(ws: RideWorkspace, path: string): Promise<void> {
  const { content } = await window.ride.editor.openFile(path);
  const lang = detectLang(path);
  ws.openFile({ path, content, language: lang });
}

/** Pick a destination folder, scaffold the template into it and open it. */
export async function createFromTemplate(templateId: string): Promise<WorkspaceOpenResult | null> {
  const picked = await window.ride.workspace.openProjectDialog();
  if (!picked) return null;
  const result = await window.ride.template.create({ templateId, dest: picked.root });
  workspace.setWorkspace(result);
  const tree = await window.ride.workspace.listFiles();
  workspace.setTree(tree as FileNode[]);
  return result;
}

export function buildCustomPrompt(tpl: RideTemplate, answers: Record<string, string>, notes: string): string {
  let prompt =
    tpl.customPrompt && tpl.customPrompt.trim()
      ? tpl.customPrompt
      : `Customize this ${tpl.name} template using these details: ${Object.entries(answers)
          .map(([k, v]) => `${k}: ${v || "—"}`)
          .join(", ")}.`;
  for (const q of tpl.questions) {
    prompt = prompt.split(`{${q.id}}`).join(answers[q.id]?.trim() || q.defaultValue || "");
  }
  if (notes.trim()) prompt += `\n\nExtra instructions from the user:\n${notes.trim()}`;
  return prompt;
}

/** Pick a destination folder, scaffold, open, then hand the agent a customization run. */
export async function customizeTemplate(
  tpl: RideTemplate,
  answers: Record<string, string>,
  notes: string,
  model?: string,
): Promise<WorkspaceOpenResult | null> {
  const picked = await window.ride.workspace.openProjectDialog();
  if (!picked) return null;
  const result = await window.ride.template.create({ templateId: tpl.id, dest: picked.root, answers });
  workspace.setWorkspace(result);
  const tree = await window.ride.workspace.listFiles();
  workspace.setTree(tree as FileNode[]);
  const prompt = buildCustomPrompt(tpl, answers, notes);
  await new Promise((r) => setTimeout(r, 250));
  void window.ride.agent.runTask({
    prompt,
    cwd: result.root,
    model,
    title: `Customize ${tpl.name}`,
    autoApprove: false,
  });
  return result;
}

export function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    json: "json", css: "css", html: "html", md: "markdown", py: "python",
    rs: "rust", go: "go", yml: "yaml", yaml: "yaml", sh: "shell", sql: "sql",
    toml: "ini", java: "java", c: "c", cpp: "cpp", h: "c", hpp: "cpp",
  };
  return map[ext] ?? "plaintext";
}

export type { AgentEvent };
