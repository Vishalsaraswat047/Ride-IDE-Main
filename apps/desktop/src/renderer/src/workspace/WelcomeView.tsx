import { useState } from "react";
import { Plus, FolderOpen, GitBranch, Download, Sparkles, ArrowRight, FileCode, LayoutTemplate, Monitor, PackagePlus, Zap, TerminalSquare } from "lucide-react";
import { workspace, newFileAndLoad, openWorkspaceAndLoad } from "../lib/hooks";
import rideLogo from "../assets/ride-logo.png";

interface WelcomeViewProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onCloneRepo: () => void;
  onImportProject: () => void;
}

export function WelcomeView({ onNewProject, onOpenProject, onCloneRepo, onImportProject }: WelcomeViewProps) {
  const [recentProjects, setRecentProjects] = useState<Array<{ name: string; path: string; updated: string }>>([]);

  return (
    <div className="ride-welcome">
      <div className="ride-welcome-header">
        <div className="ride-welcome-brand">
          <img src={rideLogo} alt="RIDE" className="h-12 w-12 rounded-xl ring-1 ring-hairline" draggable={false} />
          <div>
            <h1 className="text-2xl font-bold text-ink">Welcome to RIDE</h1>
            <p className="text-mute mt-1">AI-native IDE for building production applications</p>
          </div>
        </div>
      </div>

      <div className="ride-welcome-main">
        <div className="ride-welcome-actions">
          <div className="ride-welcome-section">
            <h2 className="ride-welcome-section-title">Start a new project</h2>
            <div className="ride-action-grid">
              <button className="ride-action-card primary" onClick={onNewProject}>
                <div className="ride-action-icon bg-violet/20">
                  <Plus className="h-5 w-5 text-violet" />
                </div>
                <div className="ride-action-content">
                  <h3>New Project</h3>
                  <p>Create a new project from scratch</p>
                </div>
                <ArrowRight className="h-5 w-5 text-mute" />
              </button>

              <button className="ride-action-card" onClick={onOpenProject}>
                <div className="ride-action-icon bg-blue/20">
                  <FolderOpen className="h-5 w-5 text-blue" />
                </div>
                <div className="ride-action-content">
                  <h3>Open Project</h3>
                  <p>Open an existing local project</p>
                </div>
                <ArrowRight className="h-5 w-5 text-mute" />
              </button>

              <button className="ride-action-card" onClick={onCloneRepo}>
                <div className="ride-action-icon bg-green/20">
                  <GitBranch className="h-5 w-5 text-green" />
                </div>
                <div className="ride-action-content">
                  <h3>Clone Repository</h3>
                  <p>Clone from GitHub, GitLab, or any Git remote</p>
                </div>
                <ArrowRight className="h-5 w-5 text-mute" />
              </button>

              <button className="ride-action-card" onClick={onImportProject}>
                <div className="ride-action-icon bg-orange/20">
                  <Download className="h-5 w-5 text-orange" />
                </div>
                <div className="ride-action-content">
                  <h3>Import Project</h3>
                  <p>Import from ZIP, template, or existing codebase</p>
                </div>
                <ArrowRight className="h-5 w-5 text-mute" />
              </button>
            </div>
          </div>

          <div className="ride-welcome-section">
            <h2 className="ride-welcome-section-title">Start from a template</h2>
            <button className="ride-action-card w-full" onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-templates"))}>
              <div className="ride-action-icon bg-violet/20">
                <LayoutTemplate className="h-5 w-5 text-violet" />
              </div>
              <div className="ride-action-content">
                <h3>Template Studio</h3>
                <p>Browse the template library — websites, web apps, AI, mobile and more</p>
              </div>
              <ArrowRight className="h-5 w-5 text-mute" />
            </button>
          </div>
        </div>

        <div className="ride-welcome-sidebar">
          <div className="ride-welcome-section">
            <h2 className="ride-welcome-section-title">Recent Projects</h2>
            <div className="ride-recent-projects">
              {recentProjects.length === 0 ? (
                <div className="ride-empty-state">
                  <p className="text-mute">No recent projects</p>
                  <p className="text-[10px] text-mute mt-1">Open a project to see it here</p>
                </div>
              ) : (
                recentProjects.map((proj) => (
                  <button key={proj.path} className="ride-recent-item">
                    <div className="ride-recent-icon bg-blue/20">
                      <FileCode className="h-4 w-4 text-blue" />
                    </div>
                    <div className="ride-recent-info">
                      <span className="font-medium text-ink">{proj.name}</span>
                      <span className="text-[10px] text-mute truncate">{proj.path}</span>
                    </div>
                    <span className="text-[10px] text-mute">{proj.updated}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="ride-welcome-section">
            <h2 className="ride-welcome-section-title">Quick Actions</h2>
            <div className="ride-quick-actions">
              <button className="ride-quick-action" onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-agent"))}>
                <Zap className="h-4 w-4" /> Ask Agent to build something
              </button>
              <button className="ride-quick-action" onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-preview"))}>
                <Monitor className="h-4 w-4" /> Open Live Preview
              </button>
              <button className="ride-quick-action" onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-terminal"))}>
                <TerminalSquare className="h-4 w-4" /> Open Terminal
              </button>
              <button className="ride-quick-action" onClick={() => void window.dispatchEvent(new CustomEvent("ride:open-extensions"))}>
                <PackagePlus className="h-4 w-4" /> Manage Extensions
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ride-welcome-footer">
        <p className="text-[10px] text-mute">RIDE v0.1.0 — Built for developers who ship</p>
      </div>
    </div>
  );
}