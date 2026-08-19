import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Hammer,
  Loader2,
  FileText,
  X,
  ShieldAlert,
  Activity,
} from "lucide-react";
import { cn } from "../lib/cn";

export type TimelineStepKind = "plan" | "message" | "tool" | "text" | "error" | "permission";

export interface TimelineStep {
  id: string;
  kind: TimelineStepKind;
  label: string;
  detail?: string;
  status: "pending" | "running" | "done" | "failed";
  tool?: string;
  time?: string;
}

export interface AgentTimelineProps {
  steps: TimelineStep[];
  title?: string;
}

const KIND_ICON: Record<TimelineStepKind, React.ReactNode> = {
  plan: <Bot className="h-3 w-3" />,
  message: <FileText className="h-3 w-3" />,
  tool: <Hammer className="h-3 w-3" />,
  text: <FileText className="h-3 w-3" />,
  error: <X className="h-3 w-3" />,
  permission: <ShieldAlert className="h-3 w-3" />,
};

const STATUS_STYLE: Record<TimelineStep["status"], { dot: string; icon: React.ReactNode; chip: string }> = {
  pending: { dot: "border-hairline-strong text-mute", icon: null, chip: "bg-canvas-soft text-mute" },
  running: { dot: "border-link text-link", icon: <Loader2 className="h-2.5 w-2.5 animate-spin" />, chip: "bg-link/10 text-link" },
  done: { dot: "border-success text-success", icon: <Check className="h-2.5 w-2.5" />, chip: "bg-success/10 text-success" },
  failed: { dot: "border-error text-error", icon: <X className="h-2.5 w-2.5" />, chip: "bg-error/10 text-error" },
};

export function AgentTimeline({ steps, title = "Agent Timeline" }: AgentTimelineProps) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const runningCount = steps.filter((s) => s.status === "running").length;
  const doneCount = steps.filter((s) => s.status === "done").length;
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-hairline px-4">
        <Activity className="h-3.5 w-3.5 text-mute" aria-hidden="true" />
        <span className="text-[11px] font-semibold tracking-wide text-body uppercase">{title}</span>
        <span className="rounded-full bg-canvas-soft px-1.5 py-0.5 text-[10px] text-mute tabular-nums">{steps.length}</span>
        {runningCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-link/10 px-2 py-0.5 text-[10px] font-semibold text-link">
            <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-link opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-link" />
            </span>
            {runningCount} running
          </span>
        )}
        {runningCount === 0 && steps.length > 0 && (
          <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{progress}% done</span>
        )}
      </div>

      {/* progress bar */}
      {steps.length > 0 && (
        <div className="h-0.5 shrink-0 bg-hairline" aria-hidden="true">
          <div
            className={cn("ride-brand-gradient h-full transition-all duration-500", runningCount > 0 && "animate-pulse")}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* steps */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ol className="relative ml-2 space-y-1.5 border-l border-hairline pl-5">
          {steps.map((step) => {
            const isCollapsed = collapsed.has(step.id);
            const style = STATUS_STYLE[step.status];
            return (
              <motion.li
                key={step.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.14 }}
                className="group relative"
              >
                {/* node */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[26.5px] top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border bg-canvas shadow-level-1",
                    style.dot,
                  )}
                >
                  {style.icon ?? KIND_ICON[step.kind]}
                </span>

                <div
                  className={cn(
                    "rounded-lg border px-2.5 py-2 transition-colors",
                    step.status === "running" ? "border-link/25 bg-link/5" : "border-transparent hover:border-hairline hover:bg-canvas-soft/60",
                  )}
                >
                  <button
                    onClick={() => step.detail && toggle(step.id)}
                    className="flex w-full items-center gap-1.5 text-left text-[13px] leading-5 text-body transition-colors group-hover:text-ink ride-focus-ring"
                  >
                    {step.detail &&
                      (isCollapsed ? (
                        <ChevronRight className="h-3 w-3 shrink-0 text-mute" />
                      ) : (
                        <ChevronDown className="h-3 w-3 shrink-0 text-mute" />
                      ))}
                    <span className="min-w-0 flex-1 truncate">{step.label}</span>
                    {step.tool && (
                      <span className="hidden shrink-0 rounded bg-canvas-soft-2 px-1.5 py-px font-mono text-[9.5px] text-mute sm:inline" translate="no">
                        {step.tool}
                      </span>
                    )}
                    <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide", style.chip)}>
                      {step.status === "running" ? "running" : step.status === "pending" ? "queued" : step.status}
                    </span>
                    {step.time && <span className="shrink-0 text-[9.5px] text-mute tabular-nums">{step.time}</span>}
                  </button>

                  <AnimatePresence initial={false}>
                    {step.detail && !isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <pre className="mt-1.5 overflow-x-auto rounded-md bg-canvas-soft-2 px-2.5 py-2 font-mono text-[11px] leading-4 text-body whitespace-pre-wrap">
                          {step.detail}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.li>
            );
          })}
          {steps.length === 0 && (
            <li className="py-8 text-center text-xs text-mute">
              No activity yet — start a task from the chat.
            </li>
          )}
        </ol>
      </div>
    </div>
  );
}