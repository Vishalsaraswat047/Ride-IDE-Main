import * as React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import { cn } from "../lib/cn";

export type BuildState = "idle" | "running" | "success" | "failed";

export interface BuildProgressProps {
  state: BuildState;
  taskLabel?: string;
  progress?: number;
  log?: string;
  onRestart?: () => void;
  onRun?: () => void;
}

export function BuildProgress({
  state,
  taskLabel,
  progress,
  log,
  onRestart,
  onRun,
}: BuildProgressProps) {
  const isRunning = state === "running";
  const pct = progress ?? (isRunning ? 40 : state === "success" ? 100 : 0);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-hairline px-3">
        <span className="text-[11px] font-medium tracking-wide text-body uppercase">Run</span>
        {taskLabel && <span className="truncate text-xs text-mute">{taskLabel}</span>}
        <div className="ml-auto flex items-center gap-1">
          {state === "idle" && onRun && (
            <RunButton label="Run" onClick={onRun}>
              <Play className="h-3.5 w-3.5" />
            </RunButton>
          )}
          {(state === "success" || state === "failed") && onRestart && (
            <RunButton label="Rerun" onClick={onRestart}>
              <RotateCcw className="h-3.5 w-3.5" />
            </RunButton>
          )}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-canvas-soft-2">
            <motion.div
              className={cn(
                "h-full rounded-full",
                state === "failed" ? "bg-error" : state === "success" ? "bg-success" : "bg-link",
              )}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          {isRunning && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-link" />}
          {state === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
          {state === "failed" && <XCircle className="h-4 w-4 shrink-0 text-error" />}
          <span className="w-9 shrink-0 text-right text-xs text-mute tabular-nums">{pct}%</span>
        </div>
        {log && (
          <pre className="min-h-0 flex-1 overflow-auto rounded-md border border-hairline bg-canvas-soft p-3 font-mono text-[11.5px] leading-5 text-ink whitespace-pre-wrap">
            {log}
          </pre>
        )}
      </div>
    </div>
  );
}

function RunButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex h-6 items-center gap-1 rounded-sm border border-hairline bg-canvas-soft px-2 text-xs font-medium text-ink transition-colors hover:bg-canvas-soft-2 hover:text-body"
    >
      {children}
      {label}
    </button>
  );
}
