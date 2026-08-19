import { useState, useEffect, type CSSProperties } from "react";
import { TopBar } from "./TopBar";
import { ActivityBar } from "./ActivityBar";
import { SideBar } from "./SideBar";
import { MainWorkspace } from "../workspace/MainWorkspace";
import { AgentPanel } from "../agent/AgentPanel";
import { BottomPanel } from "./BottomPanel";
import { MarketplacePage } from "../components/MarketplacePage";
import { ShipDeployModal } from "../components/ShipDeployModal";
import { DeploymentCenter } from "../components/DeploymentCenter";
import { workspace } from "../lib/hooks";
import { useSettings, useDeps } from "../lib/hooks";

type ProjectState =
  | "no-project"
  | "loading"
  | "agent-building"
  | "ready"
  | "build-error"
  | "deployment-ready";

function useProjectState(): { state: ProjectState; setState: (s: ProjectState) => void } {
  const [state, setState] = useState<ProjectState>("no-project");
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const check = async () => {
      if (!workspace.state.root) {
        if (!cancelled) setState("no-project");
        return;
      }
      if (!cancelled) setState("loading");
      timeout = setTimeout(() => {
        if (!cancelled) setState("ready");
      }, 500);
    };
    void check();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [workspace.state.root]);
  return { state, setState };
}

interface IDELayoutProps {
  onOpenSettings?: () => void;
  onOpenAccount?: () => void;
  onDeploy?: () => void;
  onDashboard?: () => void;
}

export function IDELayout({ onOpenSettings, onOpenAccount }: IDELayoutProps) {
  const { settings, update } = useSettings();
  const deps = useDeps();
  const { state: projectState, setState: setProjectState } = useProjectState();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [rightPanelWidth, setRightPanelWidth] = useState(384);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(224);
  const [activeActivity, setActiveActivity] = useState<string>("explorer");
  const [rightView, setRightView] = useState<"agent" | "preview" | "dashboard" | "deploy">("agent");
  const [bottomView, setBottomView] = useState<"terminal" | "output" | "problems" | "debug" | "logs">("terminal");
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [shipProject, setShipProject] = useState<{ root: string; name: string } | null>(null);

  const isSmallScreen = viewportWidth < 1440;
  const isMediumScreen = viewportWidth >= 1440 && viewportWidth < 1600;

  const responsiveSidebarWidth = isSmallScreen ? Math.min(240, Math.max(180, sidebarWidth)) : sidebarWidth;
  const responsiveRightPanelWidth = isSmallScreen ? Math.min(384, Math.max(320, rightPanelWidth)) : rightPanelWidth;
  const responsiveBottomPanelHeight = isSmallScreen ? Math.min(224, Math.max(160, bottomPanelHeight)) : bottomPanelHeight;

  const persistLayout = (patch: Partial<{ sidebarWidth: number; rightPanelWidth: number; bottomPanelHeight: number }>) => {
    if (!settings) return;
    void update({ workbench: { ...settings.workbench, layout: { ...settings.workbench.layout, ...patch } } });
  };

  useEffect(() => {
    if (!settings) return;
    setSidebarWidth(settings.workbench.layout.sidebarWidth ?? 240);
    setRightPanelWidth(settings.workbench.layout.rightPanelWidth ?? 384);
    setBottomPanelHeight(settings.workbench.layout.bottomPanelHeight ?? 224);
  }, [settings]);

  useEffect(() => {
    const updateViewport = () => setViewportWidth(window.innerWidth);
    updateViewport();
    window.addEventListener("resize", updateViewport);
    const onOpenMarketplace = () => setMarketplaceOpen(true);
    const onOpenDashboard = () => void window.ride.dashboard.open();
    const onOpenAgent = () => setRightView("agent");
    const onOpenPreview = () => setRightView("preview");
    const onOpenTerminal = () => setBottomView("terminal");
    const onOpenExtensions = () => setActiveActivity("extensions");
    const onOpenShip = (e: CustomEvent<{ projectRoot: string; projectName: string }>) => {
      setShipProject({ root: e.detail.projectRoot, name: e.detail.projectName });
      setShipModalOpen(true);
    };
    const onOpenDeploymentCenter = (e: CustomEvent<{ projectRoot: string; projectName: string }>) => {
      setRightView("deploy");
    };
    window.addEventListener("ride:open-marketplace", onOpenMarketplace);
    window.addEventListener("ride:open-dashboard", onOpenDashboard);
    window.addEventListener("ride:open-agent", onOpenAgent);
    window.addEventListener("ride:open-preview", onOpenPreview);
    window.addEventListener("ride:open-terminal", onOpenTerminal);
    window.addEventListener("ride:open-extensions", onOpenExtensions);
    window.addEventListener("ride:open-ship", onOpenShip as EventListener);
    window.addEventListener("ride:open-deployment-center", onOpenDeploymentCenter as EventListener);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("ride:open-marketplace", onOpenMarketplace);
      window.removeEventListener("ride:open-dashboard", onOpenDashboard);
      window.removeEventListener("ride:open-agent", onOpenAgent);
      window.removeEventListener("ride:open-preview", onOpenPreview);
      window.removeEventListener("ride:open-terminal", onOpenTerminal);
      window.removeEventListener("ride:open-extensions", onOpenExtensions);
      window.removeEventListener("ride:open-ship", onOpenShip as EventListener);
      window.removeEventListener("ride:open-deployment-center", onOpenDeploymentCenter as EventListener);
    };
  }, []);

  const handleSidebarResize = (width: number) => {
    const clamped = Math.max(isSmallScreen ? 180 : 200, Math.min(width, 560));
    setSidebarWidth(clamped);
    persistLayout({ sidebarWidth: clamped });
  };

  const handleRightPanelResize = (width: number) => {
    const clamped = Math.max(isSmallScreen ? 280 : 300, Math.min(width, 760));
    setRightPanelWidth(clamped);
    persistLayout({ rightPanelWidth: clamped });
  };

  const handleBottomPanelResize = (height: number) => {
    const clamped = Math.max(isSmallScreen ? 160 : 180, Math.min(height, 640));
    setBottomPanelHeight(clamped);
    persistLayout({ bottomPanelHeight: clamped });
  };

  return (
    <div
      className="ride-ide"
      style={{
        "--ride-titlebar-height": "40px",
        "--ride-tabs-height": "36px",
        "--ride-resize-height": "4px",
        "--ride-sidebar-width": `${responsiveSidebarWidth}px`,
        "--ride-activitybar-width": "48px",
        "--ride-side-panel-width": `${responsiveRightPanelWidth}px`,
        "--ride-bottom-panel-height": `${responsiveBottomPanelHeight}px`,
      } as CSSProperties}
    >
      <TopBar
        projectState={projectState}
        setProjectState={(s) => setProjectState(s as ProjectState)}
        deps={deps}
        onRun={() => {
          if (!workspace.state.root) return;
          void window.ride.preview.start(workspace.state.root).catch(() => {
            setRightView("preview");
          });
        }}
        onPreview={() => setRightView("preview")}
        onDeploy={() => void window.dispatchEvent(new CustomEvent("ride:open-deployment"))}
        onMarketplace={() => setMarketplaceOpen(true)}
        onDashboard={() => void window.ride.dashboard.open()}
        onSettings={onOpenSettings ?? (() => {})}
        onAccount={onOpenAccount ?? (() => {})}
        onLayout={() => setRightView(rightView === "agent" ? "preview" : "agent")}
      />

      <div className="ride-body">
        <ActivityBar
          active={activeActivity}
          onSelect={setActiveActivity}
          disabled={!workspace.state.root}
          onOpenAccount={onOpenAccount}
          onOpenSettings={onOpenSettings}
        />

        <SideBar
          activity={activeActivity}
          width={sidebarWidth}
          onResize={handleSidebarResize}
          projectState={projectState}
          setProjectState={(s) => setProjectState(s as ProjectState)}
        />

        <div
          className="ride-resize-handle ride-resize-handle--vertical"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            const onMove = (ev: PointerEvent) => {
              handleSidebarResize(startWidth + (ev.clientX - startX));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
          title="Drag to resize sidebar"
        />

        <MainWorkspace
          projectState={projectState}
          setProjectState={(s) => setProjectState(s as ProjectState)}
          onAgentBuild={() => setProjectState("agent-building")}
        />

        <div
          className="ride-resize-handle ride-resize-handle--vertical"
          onPointerDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = rightPanelWidth;
            const onMove = (ev: PointerEvent) => {
              handleRightPanelResize(startWidth - (ev.clientX - startX));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
          title="Drag to resize agent panel"
        />

        <AgentPanel
          view={rightView}
          onViewChange={setRightView}
          width={rightPanelWidth}
          onResize={handleRightPanelResize}
        />

        {rightView === "deploy" && projectState !== "no-project" && (
          <div className="absolute right-0 top-0 bottom-0 w-[384px] bg-canvas border-l border-hairline z-10">
            <DeploymentCenter
              projectRoot={workspace.state.root ?? ""}
              projectName={workspace.state.name ?? "RIDE"}
            />
          </div>
        )}

        <div
          className="ride-resize-handle ride-resize-handle--horizontal"
          onPointerDown={(e) => {
            e.preventDefault();
            const startY = e.clientY;
            const startHeight = bottomPanelHeight;
            const onMove = (ev: PointerEvent) => {
              handleBottomPanelResize(startHeight - (ev.clientY - startY));
            };
            const onUp = () => {
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
          }}
          title="Drag to resize bottom panel"
        />

        <BottomPanel
          view={bottomView}
          onViewChange={setBottomView}
          height={bottomPanelHeight}
          onResize={handleBottomPanelResize}
        />
      </div>

      {marketplaceOpen && <MarketplacePage onClose={() => setMarketplaceOpen(false)} />}
      {shipModalOpen && shipProject && (
        <ShipDeployModal
          isOpen={true}
          onClose={() => setShipModalOpen(false)}
          onDeployContinue={() => {
            setShipModalOpen(false);
            setRightView("deploy");
          }}
          projectRoot={shipProject.root}
          projectName={shipProject.name}
        />
      )}
    </div>
  );
}