import * as React from "react";
import { DiffEditor } from "@monaco-editor/react";
import { Check, FileText, X } from "lucide-react";
import { cn } from "../lib/cn";

export interface DiffFile {
  path: string;
  original: string;
  modified: string;
}

export interface DiffViewerProps {
  files: DiffFile[];
  activePath?: string;
  onActivePathChange?: (path: string) => void;
  onAccept?: (path: string) => void;
  onReject?: (path: string) => void;
  onAcceptAll?: () => void;
  theme?: "light" | "dark";
  className?: string;
}

export function DiffViewer({
  files,
  activePath,
  onActivePathChange,
  onAccept,
  onReject,
  onAcceptAll,
  theme = "light",
  className,
}: DiffViewerProps) {
  const active = activePath ?? files[0]?.path;
  const activeFile = files.find((f) => f.path === active);

  if (files.length === 0) {
    return (
      <div className={cn("flex h-full flex-col items-center justify-center gap-2 text-mute", className)}>
        <FileText className="h-8 w-8" />
        <p className="text-xs">No changes to review.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-canvas", className)}>
      <div className="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-hairline px-2">
        {files.map((f) => (
          <button
            key={f.path}
            onClick={() => onActivePathChange?.(f.path)}
            className={cn(
              "flex h-6 shrink-0 items-center rounded-sm px-2 text-xs transition-colors ride-focus-ring",
              f.path === active
                ? "bg-canvas-soft-2 text-ink"
                : "text-mute hover:bg-canvas-soft hover:text-body",
            )}
            title={f.path}
          >
            <span className="max-w-40 truncate">{f.path}</span>
          </button>
        ))}
        {onAcceptAll && (
          <button
            onClick={onAcceptAll}
            className="ml-auto flex h-6 shrink-0 items-center gap-1 rounded-sm bg-success px-2 text-xs font-medium text-white transition-opacity hover:opacity-85"
          >
            <Check className="h-3 w-3" /> Accept all
          </button>
        )}
      </div>
      <div className="flex min-h-0 flex-1">
        {activeFile ? (
          <DiffEditor
            className="ride-monaco-host min-h-0 w-full flex-1"
            original={activeFile.original}
            modified={activeFile.modified}
            language="plaintext"
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
            }}
            onMount={(_, monaco) => {
              const lang = detectLang(activeFile.path);
              monaco.editor.setModelLanguage(_.getOriginalEditor().getModel()!, lang);
              monaco.editor.setModelLanguage(_.getModifiedEditor().getModel()!, lang);
            }}
          />
        ) : null}
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-hairline py-2">
          {onAccept && (
            <button
              onClick={() => onAccept(activeFile!.path)}
              title="Accept file"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-success transition-colors hover:bg-canvas-soft"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          {onReject && (
            <button
              onClick={() => onReject(activeFile!.path)}
              title="Reject file"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-error transition-colors hover:bg-canvas-soft"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function detectLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    yml: "yaml",
    yaml: "yaml",
    sh: "shell",
    sql: "sql",
  };
  return map[ext] ?? "plaintext";
}
