import * as React from "react";
import { motion } from "motion/react";
import { CalendarClock, Clock, Play, Pause, Plus, Trash2, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { cn } from "../lib/cn";
import type { ScheduledTask, TaskRunHistory, TaskSchedule } from "@ride/contracts";

const SCHEDULE_LABELS: Record<TaskSchedule, string> = {
  manual: "Manual",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  interval: "Every N minutes",
};

const SCHEDULE_OPTIONS: { value: TaskSchedule; label: string }[] = [
  { value: "manual", label: "Manual (run now only)" },
  { value: "interval", label: "Every N minutes" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface TasksApi {
  list: () => Promise<ScheduledTask[]>;
  create: (input: {
    name: string;
    prompt: string;
    schedule: TaskSchedule;
    intervalMinutes?: number;
    dayOfWeek?: number;
    hourOfDay?: number;
    workspaceRoot?: string;
    enabled?: boolean;
    model?: string;
  }) => Promise<ScheduledTask>;
  update: (id: string, patch: Partial<ScheduledTask>) => Promise<ScheduledTask | null>;
  delete: (id: string) => Promise<boolean>;
  runNow: (id: string) => Promise<TaskRunHistory | null>;
  history: (taskId: string) => Promise<TaskRunHistory[]>;
  onEvent: (cb: (event: { event: string; taskId: string; history: TaskRunHistory }) => void) => () => void;
}

export function ScheduledTasksPanel({
  api,
  workspaceRoot,
  className,
}: {
  api: TasksApi;
  workspaceRoot?: string | null;
  className?: string;
}) {
  const [tasks, setTasks] = React.useState<ScheduledTask[]>([]);
  const [expanded, setExpanded] = React.useState<Record<string, TaskRunHistory[]>>({});
  const [creating, setCreating] = React.useState(false);
  const [runningIds, setRunningIds] = React.useState<Set<string>>(new Set());
  const [draft, setDraft] = React.useState({
    name: "",
    prompt: "",
    schedule: "interval" as TaskSchedule,
    intervalMinutes: 60,
    dayOfWeek: 1,
    hourOfDay: 9,
  });

  const refresh = React.useCallback(() => {
    void api.list().then((t) => setTasks(t));
  }, [api]);

  React.useEffect(() => {
    refresh();
    const off = api.onEvent(() => refresh());
    return off;
  }, [api, refresh]);

  const submit = async () => {
    if (!draft.name.trim() || !draft.prompt.trim()) return;
    await api.create({
      name: draft.name.trim(),
      prompt: draft.prompt.trim(),
      schedule: draft.schedule,
      intervalMinutes: draft.schedule === "interval" ? draft.intervalMinutes : undefined,
      dayOfWeek: draft.schedule === "weekly" ? draft.dayOfWeek : undefined,
      hourOfDay: draft.schedule === "daily" || draft.schedule === "weekly" ? draft.hourOfDay : undefined,
      workspaceRoot: workspaceRoot ?? undefined,
    });
    setDraft({ ...draft, name: "", prompt: "" });
    setCreating(false);
    refresh();
  };

  const runNow = async (task: ScheduledTask) => {
    setRunningIds((s) => new Set(s).add(task.id));
    try {
      await api.runNow(task.id);
    } finally {
      setRunningIds((s) => {
        const next = new Set(s);
        next.delete(task.id);
        return next;
      });
      refresh();
    }
  };

  const toggleEnabled = async (task: ScheduledTask) => {
    await api.update(task.id, { enabled: !task.enabled });
    refresh();
  };

  const toggleHistory = async (task: ScheduledTask) => {
    if (expanded[task.id]) {
      setExpanded((e) => {
        const next = { ...e };
        delete next[task.id];
        return next;
      });
      return;
    }
    const h = await api.history(task.id);
    setExpanded((e) => ({ ...e, [task.id]: h }));
  };

  const inputCls =
    "w-full rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-link/40 focus:ring-1 focus:ring-link/20";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mute">
          <CalendarClock className="h-4 w-4 text-link" />
          Scheduled tasks
        </h2>
        <button
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas-soft px-2.5 py-1.5 text-xs text-body transition-colors hover:border-link/30 hover:text-link"
        >
          {creating ? "Cancel" : <><Plus className="h-3.5 w-3.5" /> New task</>}
        </button>
      </div>

      {creating && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3 space-y-2 rounded-xl border border-hairline bg-canvas-soft/70 p-3"
        >
          <input className={inputCls} placeholder="Task name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <textarea
            className={cn(inputCls, "min-h-20 resize-none")}
            placeholder="Prompt the agent runs, e.g. “Run the test suite and fix any failures, then commit.”"
            value={draft.prompt}
            onChange={(e) => setDraft({ ...draft, prompt: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <select className={inputCls} value={draft.schedule} onChange={(e) => setDraft({ ...draft, schedule: e.target.value as TaskSchedule })}>
              {SCHEDULE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {draft.schedule === "interval" && (
              <label className="flex items-center gap-1.5 text-xs text-mute">
                Every
                <input
                  type="number"
                  min={1}
                  className={cn(inputCls, "w-16")}
                  value={draft.intervalMinutes}
                  onChange={(e) => setDraft({ ...draft, intervalMinutes: Number(e.target.value) || 60 })}
                />
                min
              </label>
            )}
            {(draft.schedule === "daily" || draft.schedule === "weekly") && (
              <>
                {draft.schedule === "weekly" && (
                  <select className={inputCls} value={draft.dayOfWeek} onChange={(e) => setDraft({ ...draft, dayOfWeek: Number(e.target.value) })}>
                    {DAYS.map((d, i) => (
                      <option key={d} value={i}>{d}</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-1.5 text-xs text-mute">
                  At
                  <input
                    type="number"
                    min={0}
                    max={23}
                    className={cn(inputCls, "w-16")}
                    value={draft.hourOfDay}
                    onChange={(e) => setDraft({ ...draft, hourOfDay: Math.max(0, Math.min(23, Number(e.target.value) || 0)) })}
                  />
                  :00
                </label>
              </>
            )}
          </div>
          <button
            onClick={submit}
            disabled={!draft.name.trim() || !draft.prompt.trim()}
            className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary transition-opacity disabled:opacity-40"
          >
            Create task
          </button>
        </motion.div>
      )}

      {tasks.length === 0 && !creating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-mute">
          <Clock className="h-8 w-8 opacity-40" />
          <p className="text-xs leading-5 max-w-60">
            No scheduled tasks yet. Create one to have the agent run recurring jobs like tests, builds, or reports.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-hairline bg-canvas-soft/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", task.enabled ? "bg-emerald-500" : "bg-mute/50")} />
                  <span className="truncate text-sm font-medium text-body">{task.name}</span>
                  <span className="shrink-0 rounded bg-canvas-soft px-1.5 py-0.5 text-[10px] text-mute border border-hairline">
                    {SCHEDULE_LABELS[task.schedule]}
                    {task.schedule === "interval" && task.intervalMinutes ? ` · ${task.intervalMinutes}m` : ""}
                    {task.schedule === "daily" && task.hourOfDay != null ? ` · ${String(task.hourOfDay).padStart(2, "0")}:00` : ""}
                    {task.schedule === "weekly" && task.dayOfWeek != null ? ` · ${DAYS[task.dayOfWeek]}` : ""}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-mute">{task.prompt}</p>
                {task.lastStatus === "success" && <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Last run OK{task.lastRunAt ? ` · ${new Date(task.lastRunAt).toLocaleString()}` : ""}</p>}
                {task.lastStatus === "error" && <p className="mt-1 flex items-center gap-1 text-[11px] text-error"><XCircle className="h-3 w-3" /> Last run failed{task.lastRunAt ? ` · ${new Date(task.lastRunAt).toLocaleString()}` : ""}</p>}
                {task.lastStatus === "running" && <p className="mt-1 flex items-center gap-1 text-[11px] text-link"><Loader2 className="h-3 w-3 animate-spin" /> Running…</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => runNow(task)}
                  disabled={runningIds.has(task.id)}
                  title={task.schedule === "manual" ? "Run now" : "Run now (also reschedules)"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-link/30 hover:text-link disabled:opacity-40"
                >
                  {runningIds.has(task.id) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => toggleEnabled(task)}
                  title={task.enabled ? "Pause" : "Resume"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-link/30 hover:text-link"
                >
                  {task.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 opacity-50" />}
                </button>
                <button
                  onClick={() => void api.delete(task.id).then(refresh)}
                  title="Delete task"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-error/30 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleHistory(task)}
                  title="Run history"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-link/30 hover:text-link"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", expanded[task.id] && "rotate-180")} />
                </button>
              </div>
            </div>

            {expanded[task.id] && (
              <div className="mt-2 space-y-1.5 border-t border-hairline pt-2">
                {expanded[task.id]!.length === 0 && <p className="text-[11px] text-mute">No runs yet.</p>}
                {expanded[task.id]!.map((h) => (
                  <div key={h.id} className="rounded-lg border border-hairline bg-canvas-soft/70 px-2.5 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-mute">{new Date(h.startedAt).toLocaleString()}</span>
                      <span className={cn(
                        "text-[10px] font-medium uppercase tracking-wide",
                        h.status === "success" && "text-emerald-500",
                        h.status === "error" && "text-error",
                        h.status === "running" && "text-link",
                        h.status === "cancelled" && "text-warning",
                      )}>
                        {h.status}
                      </span>
                    </div>
                    {h.output && <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-4 text-mute">{h.output}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}