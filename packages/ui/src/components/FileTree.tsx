import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  GitBranch,
  RefreshCw,
} from "lucide-react";
import type { FileNode } from "@ride/contracts";
import { cn } from "../lib/cn";

export interface FileTreeProps {
  tree: FileNode[];
  activePath?: string;
  onOpen: (path: string) => void;
  onRefresh?: () => void;
  gitStatus?: Record<string, string>;
}

function TreeRow({
  node,
  depth,
  activePath,
  onOpen,
  gitStatus,
}: {
  node: FileNode;
  depth: number;
  activePath?: string;
  onOpen: (path: string) => void;
  gitStatus?: Record<string, string>;
}) {
  const [open, setOpen] = React.useState(depth === 0);
  const isDir = node.type === "dir";
  const isActive = activePath === node.path;
  const git = gitStatus?.[node.path];

  if (!isDir) {
    return (
      <div
        onClick={() => onOpen(node.path)}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-sm py-[3px] pr-2 text-[13px] leading-5 text-body transition-colors hover:bg-canvas-soft hover:text-ink ride-focus-ring",
          isActive && "bg-canvas-soft-2 text-ink",
        )}
        style={{ paddingLeft: depth * 12 + 8 }}
        title={node.path}
      >
        <File className="h-3.5 w-3.5 shrink-0 text-mute" />
        <span className="truncate">{node.name}</span>
        {git && (
          <span
            className={cn(
              "ml-auto h-2 w-2 shrink-0 rounded-full",
              git === "modified" && "bg-warning",
              git === "added" && "bg-success",
              git === "deleted" && "bg-error",
            )}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex cursor-pointer items-center gap-1.5 rounded-sm py-[3px] pr-2 text-[13px] leading-5 text-body transition-colors hover:bg-canvas-soft hover:text-ink"
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-mute" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-mute" />
        )}
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-link" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-link" />
        )}
        <span className="truncate font-medium">{node.name}</span>
      </div>
      {open &&
        node.children?.map((child) => (
          <TreeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            activePath={activePath}
            onOpen={onOpen}
            gitStatus={gitStatus}
          />
        ))}
    </div>
  );
}

export function FileTree({
  tree,
  activePath,
  onOpen,
  onRefresh,
  gitStatus,
}: FileTreeProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-hairline px-3">
        <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-body uppercase">
          Explorer
        </span>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex h-6 w-6 items-center justify-center rounded-sm text-mute transition-colors hover:bg-canvas-soft hover:text-ink"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {tree.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <GitBranch className="h-6 w-6 text-mute" />
            <p className="text-xs text-mute">Open a folder to explore your project.</p>
          </div>
        )}
        {tree.map((node) => (
          <TreeRow
            key={node.path}
            node={node}
            depth={0}
            activePath={activePath}
            onOpen={onOpen}
            gitStatus={gitStatus}
          />
        ))}
      </div>
    </div>
  );
}
