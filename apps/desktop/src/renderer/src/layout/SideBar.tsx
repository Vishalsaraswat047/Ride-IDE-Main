import { useState, useEffect, type ReactNode } from "react";
import { FileTree, Panel, Tabs, TabsContent, TabsList, TabsTrigger, ModelSelector, Button } from "@ride/ui";
import { GitBranch, LayoutTemplate, Plus, Sparkles, Trash2, MessageSquare, FolderOpen, History, Clock, Bot, Layers, Search, PlayCircle, Database, AlertTriangle, TerminalSquare, PackagePlus, ChevronDown, User, Settings2, Plug } from "lucide-react";
import type { GitStatus, RideTemplate } from "@ride/contracts";
import rideLogo from "../assets/ride-logo.png";
import { workspace, refreshTree, openFileInWorkspace, useModels } from "../lib/hooks";
import { ExtensionsPane } from "../components/ExtensionsPane";
import { PluginsPane } from "../components/PluginsPane";

interface SideBarProps {
  activity: string;
  width: number;
  onResize: (width: number) => void;
  projectState: string;
  setProjectState: (s: string) => void;
}

export function SideBar({ activity, width, onResize, projectState, setProjectState }: SideBarProps) {
  const [, force] = useState(0);
  useEffect(() => workspace.subscribe(() => force((n) => n + 1)), []);
  const { models, selected, refresh, select } = useModels();
  const [git, setGit] = useState<import("@ride/contracts").GitStatus | null>(null);

  const refreshGit = () => {
    void window.ride.git.status().then(setGit);
  };

  useEffect(() => {
    const t = setInterval(refreshGit, 4000);
    return () => clearInterval(t);
  }, []);

  const gitStatusMap: Record<string, string> = {};
  for (const p of git?.unstaged ?? []) gitStatusMap[p] = "modified";
  for (const p of git?.staged ?? []) gitStatusMap[p] = "modified";
  for (const p of git?.untracked ?? []) gitStatusMap[p] = "added";

  const renderContent = () => {
    switch (activity) {
      case "explorer":
        return <ExplorerContent onOpenFile={(p) => void openFileInWorkspace(workspace, p)} onRefresh={() => void refreshTree(workspace)} gitStatus={gitStatusMap} />;
      case "search":
        return <SearchContent />;
      case "git":
        return <GitContent git={git} onRefresh={refreshGit} />;
      case "run-debug":
        return <RunDebugContent />;
      case "extensions":
        return <ExtensionsPane />;
      case "templates":
        return <TemplatesContent />;
      case "plugins":
        return <PluginsPane />;
      case "chat":
        return <ChatContent />;
      case "workspace":
        return <WorkspaceContent />;
      case "artifacts":
        return <ArtifactsContent />;
      case "automation":
        return <AutomationContent />;
      case "agent":
        return <AgentSidebarContent />;
      case "scheduled-tasks":
        return <ScheduledTasksContent />;
      case "database":
        return <DatabaseContent />;
      case "terminal":
        return <TerminalContent />;
      case "problems":
        return <ProblemsContent />;
      case "logs":
        return <LogsContent />;
      case "account":
        return <AccountContent />;
      case "settings":
        return <SettingsContent />;
      default:
        return <DefaultContent />;
    }
  };

  return (
    <div className="ride-sidebar" style={{ width }}>
      <div className="ride-sidebar-header">
        <span className="flex items-center gap-1.5 px-1">
          <img src={rideLogo} alt="RIDE" className="h-5 w-5 shrink-0 rounded-[5px] ring-1 ring-hairline" />
          <span className="truncate text-[11px] font-semibold tracking-wide text-body uppercase">
            {workspace.state.name ?? "RIDE"}
          </span>
        </span>
        <div className="ride-sidebar-header-actions">
          <ChevronDown className="h-4 w-4 text-mute" />
        </div>
      </div>
      <div className="ride-sidebar-content">
        {renderContent()}
      </div>
      <div
        className="ride-sidebar-resize-handle"
        onPointerDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startWidth = width;
          const onMove = (ev: PointerEvent) => {
            const newWidth = startWidth + (ev.clientX - startX);
            if (newWidth >= 180 && newWidth <= 560) onResize(newWidth);
          };
          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
          };
          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
      />
    </div>
  );
}

function ExplorerContent({ onOpenFile, onRefresh, gitStatus }: { onOpenFile: (p: string) => void; onRefresh: () => void; gitStatus: Record<string, string> }) {
  return (
    <FileTree
      tree={workspace.tree}
      activePath={workspace.activeTab?.path}
      onOpen={(p) => void onOpenFile(p)}
      onRefresh={onRefresh}
      gitStatus={gitStatus}
    />
  );
}

function SearchContent() {
  return (
    <div className="flex h-full flex-col p-2">
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
        <input
          className="h-8 w-full pl-8 pr-2 rounded-sm border border-hairline bg-canvas text-xs text-ink placeholder:text-mute outline-none ride-focus-ring"
          placeholder="Search in workspace..."
        />
      </div>
      <div className="flex-1 text-center text-mute text-[11px]">Search results appear here</div>
    </div>
  );
}

function GitContent({ git, onRefresh }: { git: import("@ride/contracts").GitStatus | null; onRefresh: () => void }) {
  const [message, setMessage] = useState("");
  const [diff, setDiff] = useState<{ path: string; status: string; hunks: number }[]>([]);

  useEffect(() => {
    if (git) {
      void window.ride.git.diff().then((d) =>
        setDiff(d.map((f) => ({ path: f.path, status: f.status, hunks: f.hunks.length }))),
      );
    }
  }, [git]);

  if (!git) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
        <GitBranch className="h-6 w-6 text-mute" />
        <p className="text-xs text-mute">Not a git repository.</p>
        <button className="ride-btn primary text-xs" onClick={() => { if (workspace.state.root) void window.ride.git.init().then(onRefresh); }}>
          Initialize Repository
        </button>
      </div>
    );
  }

  const allChanged = [...git.unstaged, ...git.staged, ...git.untracked];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-link" />
        <span className="text-xs font-medium text-ink">{git.branch}</span>
        <span className="ml-auto text-[10px] text-mute">{git.ahead}↑ {git.behind}↓</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {diff.map((f) => (
          <div key={f.path} className="group flex items-center gap-2 rounded-sm px-2 py-1 text-xs text-body hover:bg-canvas-soft">
            <span className="truncate">{f.path}</span>
            <span className="ml-auto shrink-0 text-[10px] text-mute">{f.hunks} hunks</span>
            <button onClick={() => void window.ride.git.stage([f.path]).then(onRefresh)} className="hidden shrink-0 text-[10px] text-link group-hover:block">Stage</button>
          </div>
        ))}
        {diff.length === 0 && <p className="px-2 py-6 text-center text-xs text-mute">Working tree clean.</p>}
      </div>
      <div className="border-t border-hairline p-2">
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Commit message" className="mb-2 h-8 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring" />
        <button className="ride-btn primary text-xs w-full" disabled={!message.trim() || allChanged.length === 0} onClick={() => { void window.ride.git.stage(allChanged).then(() => window.ride.git.commit(message).then(() => { setMessage(""); onRefresh(); })); }}>Commit all ({allChanged.length})</button>
      </div>
    </div>
  );
}

function RunDebugContent() {
  return <DefaultContent title="Run & Debug" icon={<PlayCircle className="h-6 w-6 text-link" />} description="Run & Debug panel" />;
}

function ExtensionsContent() {
  return <ExtensionsPane />;
}

function TemplatesContent() {
  const [templates, setTemplates] = useState<{ builtin: RideTemplate[]; users: RideTemplate[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void window.ride.template.list().then((r) => {
      if (!cancelled) setTemplates(r);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const all = [...(templates?.builtin ?? []), ...(templates?.users ?? [])];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <LayoutTemplate className="h-3.5 w-3.5 text-link" />
        <span className="text-xs font-medium text-ink">Templates</span>
        <span className="ml-auto text-[10px] text-mute">{all.length}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {!templates ? (
          <div className="px-2 py-6 text-center text-xs text-mute">Loading templates…</div>
        ) : all.length === 0 ? (
          <div className="px-2 py-6 text-center text-xs text-mute">No templates yet.</div>
        ) : (
          all.slice(0, 50).map((t) => (
            <div key={t.id} className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-canvas-soft">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet/15">
                <LayoutTemplate className="h-3 w-3 text-violet" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-ink">{t.name}</div>
                <div className="truncate text-[10px] text-mute">{t.category} · {t.framework}</div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-hairline p-2">
        <button
          className="ride-btn primary w-full text-xs"
          onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-templates"))}
        >
          Open Template Studio
        </button>
      </div>
    </div>
  );
}

function ChatContent() {
  return (
    <div className="flex flex-col gap-1.5 p-2">
      <div className="px-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">Workspace</div>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <MessageSquare className="h-3.5 w-3.5" /> Chat
      </button>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <FolderOpen className="h-3.5 w-3.5" /> Workspace
      </button>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <Layers className="h-3.5 w-3.5" /> Artifacts
      </button>
      <div className="pt-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">Automation</div>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <Bot className="h-3.5 w-3.5" /> Agents
      </button>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <Clock className="h-3.5 w-3.5" /> Scheduled Tasks
      </button>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <History className="h-3.5 w-3.5" /> Timeline
      </button>
      <div className="pt-1 px-1.5 text-[10px] font-semibold uppercase tracking-wider text-mute">Local</div>
      <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-body hover:bg-canvas-soft hover:text-ink transition-colors ride-focus-ring">
        <Sparkles className="h-3.5 w-3.5" /> Local Agent
      </button>
    </div>
  );
}

function WorkspaceContent() {
  return <DefaultContent title="Workspace" icon={<FolderOpen className="h-6 w-6 text-link" />} description="Workspace overview" />;
}

function ArtifactsContent() {
  return <DefaultContent title="Artifacts" icon={<Layers className="h-6 w-6 text-link" />} description="Generated artifacts" />;
}

function AutomationContent() {
  return <DefaultContent title="Automation" icon={<Bot className="h-6 w-6 text-link" />} description="Automation workflows" />;
}

function AgentSidebarContent() {
  return <DefaultContent title="Agent" icon={<Bot className="h-6 w-6 text-link" />} description="Agent configuration" />;
}

function ScheduledTasksContent() {
  return <DefaultContent title="Scheduled Tasks" icon={<Clock className="h-6 w-6 text-link" />} description="Task scheduler" />;
}

function DatabaseContent() {
  return <DefaultContent title="Database" icon={<Database className="h-6 w-6 text-link" />} description="Database connections" />;
}

function TerminalContent() {
  return <DefaultContent title="Terminal" icon={<TerminalSquare className="h-6 w-6 text-link" />} description="Integrated terminal" />;
}

function ProblemsContent() {
  return <DefaultContent title="Problems" icon={<AlertTriangle className="h-6 w-6 text-warning" />} description="Code problems" />;
}

function LogsContent() {
  return <DefaultContent title="Logs" icon={<MessageSquare className="h-6 w-6 text-link" />} description="Application logs" />;
}

function AccountContent() {
  return <DefaultContent title="Account" icon={<User className="h-6 w-6 text-link" />} description="Account settings" />;
}

function SettingsContent() {
  return <DefaultContent title="Settings" icon={<Settings2 className="h-6 w-6 text-link" />} description="IDE settings" />;
}

function DefaultContent({ title = "Select Activity", icon, description = "Select an activity from the activity bar" }: { title?: string; icon?: ReactNode; description?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      {icon}
      <p className="text-xs text-mute">{title}</p>
      <p className="text-[10px] text-mute">{description}</p>
    </div>
  );
}