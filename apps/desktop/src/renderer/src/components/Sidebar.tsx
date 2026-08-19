import { useEffect, useState } from "react";
import { FileTree, Panel, Tabs, TabsContent, TabsList, TabsTrigger, ModelSelector, Button } from "@ride/ui";
import { GitBranch, LayoutTemplate, Plus, Sparkles, Trash2, MessageSquare, FolderOpen, History, Clock, Bot, Layers, Search, PlayCircle, Database, AlertTriangle, TerminalSquare, PackagePlus } from "lucide-react";
import type { GitStatus } from "@ride/contracts";
import rideLogo from "../assets/ride-logo.png";
import { workspace, refreshTree, openFileInWorkspace, useModels } from "../lib/hooks";
import { TerminalPane } from "./TerminalPane";

export function Sidebar({ onOpenFile, onTemplates, width }: { onOpenFile: (path: string) => void; onTemplates?: () => void; width?: number }) {
  const [, force] = useState(0);
  useEffect(() => workspace.subscribe(() => force((n) => n + 1)), []);
  const { models, selected, refresh, select } = useModels();
  const [git, setGit] = useState<GitStatus | null>(null);

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

  return (
    <div className="flex h-full shrink-0 flex-col border-r border-hairline bg-canvas" style={width ? { width } : undefined}>
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline px-2">
        <span className="flex min-w-0 items-center gap-1.5 px-1">
          <img src={rideLogo} alt="RIDE" className="h-5 w-5 shrink-0 rounded-[5px] ring-1 ring-hairline" />
          <span className="truncate text-[11px] font-semibold tracking-wide text-body uppercase">
            {workspace.state.name ?? "RIDE"}
          </span>
        </span>
        <ModelSelector models={models} selectedId={selected ?? undefined} onSelect={select} onRefresh={refresh} />
      </div>
      <div className="min-h-0 flex-1">
        <Tabs defaultValue="ride" className="flex h-full flex-col">
          <TabsList className="m-2 mb-0">
            {/* RIDE section - top group */}
            <TabsTrigger value="ride"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Chat</TabsTrigger>
            <TabsTrigger value="workspace"><FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Workspace</TabsTrigger>
            <TabsTrigger value="artifacts"><Layers className="h-3.5 w-3.5 mr-1.5" /> Artifacts</TabsTrigger>
            <TabsTrigger value="automation"><Clock className="h-3.5 w-3.5 mr-1.5" /> Automation</TabsTrigger>
            <TabsTrigger value="agent"><Bot className="h-3.5 w-3.5 mr-1.5" /> Agent</TabsTrigger>
            <TabsTrigger value="scheduled-tasks"><Clock className="h-3.5 w-3.5 mr-1.5" /> Scheduled Tasks</TabsTrigger>

            {/* PROJECT section - separated by spacing */}
            <TabsTrigger value="explorer"><FolderOpen className="h-3.5 w-3.5 mr-1.5" /> Explorer</TabsTrigger>
            <TabsTrigger value="search"><Search className="h-3.5 w-3.5 mr-1.5" /> Search</TabsTrigger>
            <TabsTrigger value="git" disabled={!workspace.state.gitRepo}><History className="h-3.5 w-3.5 mr-1.5" /> Git</TabsTrigger>
            <TabsTrigger value="run-debug"><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Run & Debug</TabsTrigger>
            <TabsTrigger value="database"><Database className="h-3.5 w-3.5 mr-1.5" /> Database</TabsTrigger>

            {/* TOOLS section */}
            <TabsTrigger value="terminal"><TerminalSquare className="h-3.5 w-3.5 mr-1.5" /> Terminal</TabsTrigger>
            <TabsTrigger value="problems"><AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Problems</TabsTrigger>
            <TabsTrigger value="logs"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Logs</TabsTrigger>

 /* Extensions as first-class item */
            <TabsTrigger value="extensions"><PackagePlus className="h-3.5 w-3.5 mr-1.5" /> Extensions</TabsTrigger>

            {/* Templates */}
            <TabsTrigger value="templates"><LayoutTemplate className="h-3.5 w-3.5 mr-1.5" /> Templates</TabsTrigger>
          </TabsList>

          {/* RIDE tab content */}
          <TabsContent value="ride" className="min-h-0 flex-1">
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
          </TabsContent>

          {/* PROJECT tab content - Explorer */}
          <TabsContent value="explorer" className="min-h-0 flex-1">
            <FileTree
              tree={workspace.tree}
              activePath={workspace.activeTab?.path}
              onOpen={(p) => void onOpenFile(p)}
              onRefresh={() => void refreshTree(workspace)}
              gitStatus={gitStatusMap}
            />
          </TabsContent>

          {/* Search content */}
          <TabsContent value="search" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <Search className="h-6 w-6 text-mute" />
              <p className="mt-2 text-[10px] text-mute">Search functionality</p>
            </div>
          </TabsContent>

          {/* Git content */}
          <TabsContent value="git" className="min-h-0 flex-1">
            <GitPanel git={git} onRefresh={refreshGit} />
          </TabsContent>

          {/* Run & Debug content */}
          <TabsContent value="run-debug" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <PlayCircle className="h-6 w-6 text-link" />
              <p className="mt-2 text-[10px] text-mute">Run & Debug panel</p>
            </div>
          </TabsContent>

          {/* Database content */}
          <TabsContent value="database" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <Database className="h-6 w-6 text-link" />
              <p className="mt-2 text-[10px] text-mute">Database panel</p>
            </div>
          </TabsContent>

          {/* Tools tab content - Terminal */}
          <TabsContent value="terminal" className="min-h-0 flex-1">
            <TerminalPane />
          </TabsContent>

          {/* Problems content */}
          <TabsContent value="problems" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <AlertTriangle className="h-6 w-6 text-warning" />
              <p className="mt-2 text-[10px] text-mute">Problems panel</p>
            </div>
          </TabsContent>

          {/* Logs content */}
          <TabsContent value="logs" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <MessageSquare className="h-6 w-6 text-mute" />
              <p className="mt-2 text-[10px] text-mute">Logs panel</p>
            </div>
          </TabsContent>

          {/* Extensions content */}
          <TabsContent value="extensions" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <PackagePlus className="h-6 w-6 text-link" />
              <p className="mt-2 text-[10px] text-mute">Extensions marketplace</p>
            </div>
          </TabsContent>

          {/* Templates content */}
          <TabsContent value="templates" className="min-h-0 flex-1">
            <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
              <LayoutTemplate className="h-6 w-6 text-violet" />
              <p className="text-xs text-mute">Browse 520+ starter templates — preview them, then let RIDE build the rest.</p>
              <Button size="sm" onClick={onTemplates} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Open Template Studio
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function GitPanel({ git, onRefresh }: { git: GitStatus | null; onRefresh: () => void }) {
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
        <Button
          size="sm"
          onClick={() => {
            if (workspace.state.root) {
              void window.ride.git.init().then(onRefresh);
            }
          }}
        >
          Initialize repo
        </Button>
      </div>
    );
  }

  const allChanged = [...git.unstaged, ...git.staged, ...git.untracked];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-hairline px-3 py-2">
        <GitBranch className="h-3.5 w-3.5 text-link" />
        <span className="text-xs font-medium text-ink">{git.branch}</span>
        <span className="ml-auto text-[10px] text-mute">
          {git.ahead}↑ {git.behind}↓
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {diff.map((f) => (
          <div key={f.path} className="group flex items-center gap-2 rounded-sm px-2 py-1 text-xs text-body hover:bg-canvas-soft">
            <span className="truncate">{f.path}</span>
            <span className="ml-auto shrink-0 text-[10px] text-mute">{f.hunks} hunks</span>
            <button
              onClick={() => void window.ride.git.stage([f.path]).then(onRefresh)}
              className="hidden shrink-0 text-[10px] text-link group-hover:block"
            >
              Stage
            </button>
          </div>
        ))}
        {diff.length === 0 && <p className="px-2 py-6 text-center text-xs text-mute">Working tree clean.</p>}
      </div>
      <div className="border-t border-hairline p-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Commit message"
          className="mb-2 h-8 w-full rounded-sm border border-hairline bg-canvas px-2 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
        />
        <Button
          size="sm"
          className="w-full"
          disabled={!message.trim() || allChanged.length === 0}
          onClick={() => {
            void window.ride.git.stage(allChanged).then(() => window.ride.git.commit(message).then(() => { setMessage(""); onRefresh(); }));
          }}
        >
          Commit all ({allChanged.length})
        </Button>
      </div>
    </div>
  );
}

export { Plus, Trash2 };