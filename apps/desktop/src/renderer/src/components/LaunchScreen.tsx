import { FilePlus2, FolderOpen, Sparkles } from "lucide-react";
import rideLogo from "../assets/ride-logo.png";

interface LaunchScreenProps {
  onNewFile: () => void;
  onOpenFolder: () => void;
  onTemplates: () => void;
}

const ACTIONS = [
  {
    key: "new",
    icon: <FilePlus2 className="h-7 w-7" />,
    title: "New File",
    blurb: "Start typing in a blank editor — save it where you like.",
    className: "hover:border-hairline-strong hover:bg-canvas-soft",
  },
  {
    key: "open",
    icon: <FolderOpen className="h-7 w-7" />,
    title: "Open Folder",
    blurb: "Work on an existing project.",
    className: "hover:border-hairline-strong hover:bg-canvas-soft",
  },
  {
    key: "templates",
    icon: <Sparkles className="h-7 w-7 text-brand-ember" />,
    title: "Templates",
    blurb: "Preview a starter, then let RIDE build the rest.",
    className: "hover:border-brand-ember/40 hover:bg-brand-ember/5",
  },
] as const;

export function LaunchScreen({ onNewFile, onOpenFolder, onTemplates }: LaunchScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 bg-canvas-soft px-6">
      <div className="text-center">
        <img src={rideLogo} alt="RIDE" className="mx-auto h-20 w-20 rounded-2xl shadow-level-4 ring-1 ring-hairline" />
        <div className="mt-4 font-mono text-6xl font-bold tracking-tight text-ink">RIDE</div>
        <div className="mt-3 text-sm text-body">AI Software Development IDE</div>
      </div>

      <div className="grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {ACTIONS.map((a) => {
          const run = a.key === "new" ? onNewFile : a.key === "open" ? onOpenFolder : onTemplates;
          return (
            <button
              key={a.key}
              onClick={run}
              className={`group flex h-44 flex-col items-center justify-center gap-3 rounded-md border border-hairline bg-canvas p-6 text-center shadow-level-2 transition-colors ${a.className} ride-focus-ring`}
            >
              <span className="text-body transition-transform group-hover:scale-110">{a.icon}</span>
              <span className="text-sm font-medium text-ink">{a.title}</span>
              <span className="text-[11px] leading-5 text-mute">{a.blurb}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}