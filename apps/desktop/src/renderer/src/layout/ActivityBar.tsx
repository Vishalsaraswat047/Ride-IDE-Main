import { type ReactNode } from "react";
import { FolderOpen, Search, GitBranch, PlayCircle, PackagePlus, MessageSquare, FolderOpen as FolderOpenIcon, Layers, Bot, Clock, Database, TerminalSquare, AlertTriangle, MessageSquare as MessageSquareIcon, User, Settings2, LayoutTemplate, Plug } from "lucide-react";
import { workspace } from "../lib/hooks";

interface ActivityItem {
  id: string;
  icon: ReactNode;
  label: string;
  section: string;
  disabled?: boolean;
}

const ACTIVITY_ITEMS: ActivityItem[] = [
  { id: "explorer", icon: <FolderOpen className="h-5 w-5" />, label: "Explorer", section: "Development" },
  { id: "search", icon: <Search className="h-5 w-5" />, label: "Search", section: "Development" },
  { id: "git", icon: <GitBranch className="h-5 w-5" />, label: "Source Control", section: "Development", disabled: !workspace.state.gitRepo },
  { id: "run-debug", icon: <PlayCircle className="h-5 w-5" />, label: "Run & Debug", section: "Development" },
  { id: "templates", icon: <LayoutTemplate className="h-5 w-5" />, label: "Templates", section: "Development" },
  { id: "extensions", icon: <PackagePlus className="h-5 w-5" />, label: "Extensions", section: "Development" },
  { id: "plugins", icon: <Plug className="h-5 w-5" />, label: "Plugins", section: "Development" },
  { id: "chat", icon: <MessageSquare className="h-5 w-5" />, label: "Chat", section: "RIDE" },
  { id: "workspace", icon: <FolderOpenIcon className="h-5 w-5" />, label: "Workspace", section: "RIDE" },
  { id: "artifacts", icon: <Layers className="h-5 w-5" />, label: "Artifacts", section: "RIDE" },
  { id: "automation", icon: <Bot className="h-5 w-5" />, label: "Automation", section: "RIDE" },
  { id: "agent", icon: <Bot className="h-5 w-5" />, label: "Agent", section: "RIDE" },
  { id: "scheduled-tasks", icon: <Clock className="h-5 w-5" />, label: "Scheduled Tasks", section: "RIDE" },
  { id: "database", icon: <Database className="h-5 w-5" />, label: "Database", section: "Tools" },
  { id: "terminal", icon: <TerminalSquare className="h-5 w-5" />, label: "Terminal", section: "Tools" },
  { id: "problems", icon: <AlertTriangle className="h-5 w-5" />, label: "Problems", section: "Tools" },
  { id: "logs", icon: <MessageSquareIcon className="h-5 w-5" />, label: "Logs", section: "Tools" },
];

const SECTIONS = [
  { id: "Development", label: "DEVELOPMENT" },
  { id: "RIDE", label: "RIDE" },
  { id: "Tools", label: "TOOLS" },
];

export function ActivityBar({ active, onSelect, disabled, onOpenAccount, onOpenSettings }: { active: string; onSelect: (id: string) => void; disabled: boolean; onOpenAccount?: () => void; onOpenSettings?: () => void }) {
  return (
    <div className="ride-activitybar" role="navigation" aria-label="Activity Bar">
      <div className="ride-activitybar-top">
        {SECTIONS.map((section) => {
          const items = ACTIVITY_ITEMS.filter((item) => item.section === section.id);
          if (items.length === 0) return null;

          return (
            <div key={section.id} className="ride-activitybar-section">
              {section.label && (
                <div className="ride-activitybar-section-label">
                  {section.label}
                </div>
              )}
              <div className="ride-activitybar-items">
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`ride-activitybar-item ${active === item.id ? "active" : ""} ${item.disabled ? "disabled" : ""}`}
                    onClick={() => !item.disabled && onSelect(item.id)}
                    disabled={item.disabled || disabled}
                    title={item.label}
                    aria-label={item.label}
                    aria-pressed={active === item.id}
                  >
                    {item.icon}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ride-activitybar-bottom">
        <button
          className={`ride-activitybar-item ${active === "account" ? "active" : ""}`}
          onClick={() => onOpenAccount?.()}
          title="Account"
          aria-label="Account"
        >
          <User className="h-5 w-5" />
        </button>
        <button
          className={`ride-activitybar-item ${active === "settings" ? "active" : ""}`}
          onClick={() => onOpenSettings?.()}
          title="Settings (Ctrl+,)"
          aria-label="Settings"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}