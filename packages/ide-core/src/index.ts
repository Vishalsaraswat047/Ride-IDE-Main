import type { FileContent, FileNode, WorkspaceOpenResult } from "@ride/contracts";
export * from "./commands";

export interface EditorTab {
  id: string;
  path: string;
  name: string;
  dirty: boolean;
  savedContent: string;
  language: string;
}

export interface Diagnostic {
  path: string;
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface WorkspaceState {
  root: string | null;
  name: string | null;
  gitRepo: boolean;
}

export class RideWorkspace {
  state: WorkspaceState = { root: null, name: null, gitRepo: false };
  tree: FileNode[] = [];
  tabs: EditorTab[] = [];
  activeTabId: string | null = null;
  openFiles = new Map<string, FileContent>();
  diagnostics: Diagnostic[] = [];

  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  setWorkspace(result: WorkspaceOpenResult): void {
    this.state = { root: result.root, name: result.name, gitRepo: result.gitRepo };
    this.tabs = [];
    this.activeTabId = null;
    this.openFiles.clear();
    this.diagnostics = [];
    this.emit();
  }

  setTree(tree: FileNode[]): void {
    this.tree = tree;
    this.emit();
  }

  openFile(content: FileContent, tabId?: string): string {
    const existing = this.tabs.find((t) => t.path === content.path);
    if (existing) {
      this.activeTabId = existing.id;
      this.openFiles.set(content.path, content);
      this.emit();
      return existing.id;
    }
    const name = content.path.split(/[\\/]/).pop() ?? content.path;
    const tab: EditorTab = {
      id: tabId ?? `tab-${content.path}`,
      path: content.path,
      name,
      dirty: false,
      savedContent: content.content,
      language: content.language ?? "plaintext",
    };
    this.tabs.push(tab);
    this.activeTabId = tab.id;
    this.openFiles.set(content.path, content);
    this.emit();
    return tab.id;
  }

  updateContent(path: string, content: string): void {
    const tab = this.tabs.find((t) => t.path === path);
    const file = this.openFiles.get(path);
    if (tab) tab.dirty = content !== tab.savedContent;
    if (file) this.openFiles.set(path, { ...file, content });
    this.emit();
  }

  markSaved(path: string): void {
    const tab = this.tabs.find((t) => t.path === path);
    const file = this.openFiles.get(path);
    if (tab && file) {
      tab.dirty = false;
      tab.savedContent = file.content;
    }
    this.emit();
  }

  renameTab(tabId: string, newPath: string, language?: string): void {
    const tab = this.tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const file = this.openFiles.get(tab.path);
    this.openFiles.delete(tab.path);
    tab.path = newPath;
    tab.name = newPath.split(/[\\/]/).pop() ?? newPath;
    if (language) tab.language = language;
    if (file) this.openFiles.set(newPath, { ...file, path: newPath, language: language ?? file.language });
    this.emit();
  }

  setActive(tabId: string): void {
    this.activeTabId = tabId;
    this.emit();
  }

  closeTab(tabId: string): void {
    const idx = this.tabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;
    const tab = this.tabs[idx]!;
    this.tabs.splice(idx, 1);
    this.openFiles.delete(tab.path);
    if (this.activeTabId === tabId) {
      this.activeTabId = this.tabs[idx]?.id ?? this.tabs[idx - 1]?.id ?? null;
    }
    this.emit();
  }

  reorderTabs(fromId: string, toId: string): void {
    const from = this.tabs.findIndex((t) => t.id === fromId);
    const to = this.tabs.findIndex((t) => t.id === toId);
    if (from === -1 || to === -1 || from === to) return;
    const [moved] = this.tabs.splice(from, 1);
    this.tabs.splice(to, 0, moved!);
    this.emit();
  }

  get activeTab(): EditorTab | null {
    return this.tabs.find((t) => t.id === this.activeTabId) ?? null;
  }

  contentFor(path: string): string {
    return this.openFiles.get(path)?.content ?? "";
  }

  setDiagnostics(diags: Diagnostic[]): void {
    this.diagnostics = diags;
    this.emit();
  }
}
