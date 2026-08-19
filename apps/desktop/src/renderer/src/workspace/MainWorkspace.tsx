import { useState, useEffect, useMemo } from "react";
import { CodeTabs, Tabs, TabsContent, TabsList, TabsTrigger, Button } from "@ride/ui";
import { Play, Monitor, LayoutGrid, Loader2, CheckCircle, AlertTriangle, XCircle, ChevronDown } from "lucide-react";
import { workspace, openFileInWorkspace, newFileAndLoad, openWorkspaceAndLoad, saveActiveFileAs, refreshTree } from "../lib/hooks";
import { EditorPane } from "../components/EditorPane";
import { PreviewPane } from "../components/PreviewPane";
import { TemplateStudio } from "../components/TemplateStudio";
import { WelcomeView } from "./WelcomeView";

interface MainWorkspaceProps {
  projectState: string;
  setProjectState: (s: string) => void;
  onAgentBuild: () => void;
}

export function MainWorkspace({ projectState, setProjectState, onAgentBuild }: MainWorkspaceProps) {
  const [launch, setLaunch] = useState<"home" | "templates">("home");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "preview" | "split">("code");
  const [splitRatio, setSplitRatio] = useState(50);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void saveActiveFileAs(workspace);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        void window.ride.workspace.openProjectDialog();
      }
    };
    const onOpenTemplates = () => { setLaunch("templates"); setTemplatesOpen(true); };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("ride:open-templates", onOpenTemplates);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("ride:open-templates", onOpenTemplates);
    };
  }, []);

  if (projectState === "no-project") {
    return (
      <div className="min-h-0 flex-1">
        {launch === "home" ? (
          <WelcomeView
            onNewProject={() => setLaunch("templates")}
            onOpenProject={() => void openWorkspaceAndLoad(workspace)}
            onCloneRepo={() => void window.ride.workspace.openProjectDialog()}
            onImportProject={() => void window.ride.workspace.openProjectDialog()}
          />
        ) : (
          <TemplateStudio onBack={() => setLaunch("home")} />
        )}
      </div>
    );
  }

  if (projectState === "loading") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-6">
        <div className="ride-skeleton h-9 w-full" />
        <div className="ride-skeleton h-4 w-2/3" />
        <div className="ride-skeleton h-4 w-1/2" />
        <div className="ride-skeleton mt-2 flex-1" />
        <div className="text-[11px] text-mute">Loading project…</div>
      </div>
    );
  }

  if (projectState === "agent-building") {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-6">
        <div className="ride-skeleton h-9 w-full" />
        <div className="ride-skeleton h-4 w-2/3" />
        <div className="ride-skeleton h-4 w-1/2" />
        <div className="ride-skeleton mt-2 flex-1" />
        <div className="text-[11px] text-link">Agent is building your project…</div>
      </div>
    );
  }

  if (projectState === "build-error") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-error" />
        <div className="text-[11px] font-medium text-error">Build failed</div>
        <button className="ride-btn primary mt-3" onClick={() => setProjectState("ready")} title="Fix with Agent">
          Fix with Agent
        </button>
      </div>
    );
  }

  if (projectState === "deployment-ready") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4">
        <CheckCircle className="h-12 w-12 text-success" />
        <div className="text-[11px] font-medium text-success">Project ready to deploy</div>
        <button className="ride-btn primary mt-3" onClick={() => window.ride.app.openExternal("/deployment")} title="Deploy">
          Deploy
        </button>
      </div>
    );
  }

  return (
    <div className="ride-main relative">
      <CodeTabs
        tabs={workspace.tabs.map((t) => ({ id: t.id, path: t.path, name: t.name, dirty: t.dirty }))}
        activeId={workspace.activeTabId ?? undefined}
        onSelect={(id) => workspace.setActive(id)}
        onClose={(id) => workspace.closeTab(id)}
        onReorder={(a, b) => workspace.reorderTabs(a, b)}
      />

      <div className="ride-editor-container">
        <Tabs defaultValue={viewMode} className="flex h-full flex-col">
          <TabsList className="ride-view-tabs">
            <TabsTrigger value="code" onClick={() => setViewMode("code")}>
              <Play className="h-3.5 w-3.5 mr-1.5" /> Code
            </TabsTrigger>
            <TabsTrigger value="preview" onClick={() => setViewMode("preview")}>
              <Monitor className="h-3.5 w-3.5 mr-1.5" /> Preview
            </TabsTrigger>
            <TabsTrigger value="split" onClick={() => setViewMode("split")}>
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> Split
            </TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="min-h-0 flex-1">
            <EditorPane />
          </TabsContent>

          <TabsContent value="preview" className="min-h-0 flex-1">
            <PreviewPane />
          </TabsContent>

          <TabsContent value="split" className="min-h-0 flex-1">
            <div className="flex h-full">
              <div className="min-w-0" style={{ width: `${splitRatio}%` }}>
                <EditorPane />
              </div>
              <div className="ride-resize-handle ride-resize-handle--vertical shrink-0" onPointerDown={(e) => startSplitDrag(e, splitRatio, setSplitRatio)} title="Drag to resize split" />
              <div className="min-w-0 flex-1" style={{ width: `${100 - splitRatio}%` }}>
                <PreviewPane />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {templatesOpen && (
        <div className="absolute inset-0 z-30">
          <TemplateStudio onBack={() => setTemplatesOpen(false)} />
        </div>
      )}
    </div>
  );
}

function startSplitDrag(e: React.PointerEvent, startRatio: number, setRatio: (r: number) => void) {
  e.preventDefault();
  const container = (e.currentTarget as HTMLElement).parentElement;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const onMove = (ev: PointerEvent) => {
    const diff = ((ev.clientX - rect.left) / rect.width) * 100;
    setRatio(Math.min(85, Math.max(15, diff)));
  };
  const onUp = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}