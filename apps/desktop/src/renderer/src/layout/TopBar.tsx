import { useState } from "react";
import { workspace } from "../lib/hooks";
import { Settings2, Play, Monitor, ArrowUpRight, Maximize2, User, ChevronDown, Store, LayoutDashboard } from "lucide-react";
import rideLogo from "../assets/ride-logo.png";

interface TopBarProps {
  projectState: string;
  setProjectState: (s: string) => void;
  deps: { ollama: boolean; opencode: boolean; version: string };
  onRun: () => void;
  onPreview: () => void;
  onDeploy: () => void;
  onSettings: () => void;
  onAccount: () => void;
  onLayout: () => void;
  onMarketplace: () => void;
  onDashboard: () => void;
}

export function TopBar({ projectState, deps, onRun, onPreview, onDeploy, onSettings, onAccount, onLayout, onMarketplace, onDashboard }: TopBarProps) {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  return (
    <div className="ride-topbar">
      <div className="ride-topbar-left">
        <span className="ride-topbar-brand">
          <button className="ride-logo" title="RIDE">
            <img src={rideLogo} alt="RIDE" className="h-4.5 w-4.5" draggable={false} />
          </button>
          <span className="ride-brand-wordmark">RIDE</span>
        </span>

        <div className="ride-project-selector">
          <button
            className="ride-btn ghost"
            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
            aria-expanded={projectMenuOpen}
          >
            <span className="truncate max-w-[180px]">
              {workspace.state.name ?? "RIDE"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 ml-1" />
          </button>
        </div>

        {projectMenuOpen && (
          <div className="ride-dropdown ride-project-dropdown">
            <button className="ride-dropdown-item" onClick={() => window.ride.workspace.openProjectDialog()}>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-violet/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                Open Folder
              </span>
            </button>
            <button className="ride-dropdown-item" onClick={() => window.ride.workspace.newFile()}>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-blue/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </span>
                New File
              </span>
            </button>
            <button className="ride-dropdown-item" onClick={() => { setProjectMenuOpen(false); void window.ride.workspace.openProjectDialog(); }}>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-green/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </span>
                Clone Repository
              </span>
            </button>
            <button className="ride-dropdown-item" onClick={() => { setProjectMenuOpen(false); void window.ride.workspace.openProjectDialog(); }}>
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded bg-orange/20 flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </span>
                Import Project
              </span>
            </button>
            <hr className="border-hairline my-1" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-mute">Recent</div>
            <div className="px-2 py-2 text-[11px] text-mute">No recent projects</div>
          </div>
        )}
      </div>

      <div className="ride-topbar-center">
        <button className="ride-btn primary" onClick={onRun} title="Run (Ctrl+R)">
          <Play className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Run</span>
        </button>
        <button className="ride-btn ghost" onClick={onPreview} title="Preview">
          <Monitor className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
        <button className="ride-btn ghost" onClick={onDashboard} title="My Dashboard">
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        <button className="ride-btn ghost" onClick={onMarketplace} title="Open Marketplace">
          <Store className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Marketplace</span>
        </button>
      </div>

      <div className="ride-topbar-right">
        <button className="ride-btn accent" onClick={onDeploy} title="Deploy">
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Deploy</span>
        </button>
        <div className="ride-layout-controls">
          <button className="ride-btn ghost" onClick={onLayout} title="Layout">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <button className="ride-btn ghost" onClick={onSettings} title="Settings (Ctrl+,)">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
        <div className="ride-account-menu">
          <button className="ride-btn ghost" onClick={onAccount} title="Account">
            <User className="h-3.5 w-3.5" />
          </button>
        </div>
        {deps.ollama && (
          <span className="ride-status-badge">ollama</span>
        )}
      </div>
    </div>
  );
}