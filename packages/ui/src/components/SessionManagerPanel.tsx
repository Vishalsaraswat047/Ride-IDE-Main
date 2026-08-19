import * as React from "react";
import { Layers, Square, Loader2, Activity, CircleCheck, CircleX, Timer, User } from "lucide-react";
import { cn } from "../lib/cn";

export interface RideSessionLite {
  id: string;
  title: string;
  status: string;
  model?: string;
  cwd?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface SessionManagerApi {
  listSessions: () => Promise<RideSessionLite[]>;
  cancel: (sessionId: string) => Promise<{ ok: boolean }>;
  onEvent: (cb: (event: unknown) => void) => () => void;
}

const STATUS_STYLE: Record<string, string> = {
  running: "text-link",
  queued: "text-warning",
  completed: "text-emerald-500",
  failed: "text-error",
  cancelled: "text-mute",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3 w-3 animate-spin" />,
  queued: <Timer className="h-3 w-3" />,
  completed: <CircleCheck className="h-3 w-3" />,
  failed: <CircleX className="h-3 w-3" />,
  cancelled: <CircleX className="h-3 w-3 opacity-60" />,
};

export function SessionManagerPanel({
  api,
  className,
  onSelectSession,
}: {
  api: SessionManagerApi;
  className?: string;
  onSelectSession?: (session: RideSessionLite) => void;
}) {
  const [sessions, setSessions] = React.useState<RideSessionLite[]>([]);
  const [filter, setFilter] = React.useState<string>("all");

  const refresh = React.useCallback(() => {
    void api.listSessions().then((s) => setSessions(s));
  }, [api]);

  React.useEffect(() => {
    refresh();
    const off = api.onEvent(() => {
      // debounce: session events can arrive in bursts
      window.setTimeout(refresh, 250);
    });
    return off;
  }, [api, refresh]);

  const filtered = sessions.filter((s) => filter === "all" || s.status === filter);
  const openCount = sessions.filter((s) => s.status === "running" || s.status === "queued").length;

  const filters = ["all", "running", "completed", "failed", "cancelled"];

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mute">
          <Layers className="h-4 w-4 text-link" />
          Sessions {openCount > 0 && <span className="rounded-full bg-link/15 px-1.5 py-0.5 text-[10px] text-link">{openCount} open</span>}
        </h2>
        <button
          onClick={refresh}
          title="Refresh session list"
          className="flex h-6 w-6 items-center justify-center rounded-md border border-hairline text-mute transition-colors hover:text-link"
        >
          <Activity className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex gap-1 px-3 pb-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] capitalize transition-colors",
              filter === f ? "bg-link/15 text-link" : "text-mute hover:text-body",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 pt-10 text-center text-mute">
            <Layers className="h-8 w-8 opacity-40" />
            <p className="max-w-56 text-xs leading-5">No sessions here yet. Chat and scheduled runs appear as sessions — they run in parallel.</p>
          </div>
        )}
        {filtered.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelectSession?.(s)}
            className="w-full rounded-xl border border-hairline bg-canvas-soft/60 p-3 text-left transition-colors hover:border-link/30 hover:bg-canvas-soft"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-body">
                <User className="h-3.5 w-3.5 shrink-0 text-mute" />
                <span className="truncate">{s.title}</span>
              </span>
              <span className={cn("flex shrink-0 items-center gap-1 text-[11px] capitalize", STATUS_STYLE[s.status] ?? "text-mute")}>
                {STATUS_ICON[s.status] ?? null}
                {s.status}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-mute">
              {s.model && <span className="truncate rounded bg-canvas-soft px-1.5 py-0.5 border border-hairline">{s.model}</span>}
              <span>{s.messageCount} msgs</span>
              <span className="truncate">{new Date(s.updatedAt).toLocaleTimeString()}</span>
            </div>
            {(s.status === "running" || s.status === "queued") && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  void api.cancel(s.id).then(() => window.setTimeout(refresh, 300));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    void api.cancel(s.id).then(() => window.setTimeout(refresh, 300));
                  }
                }}
                className="mt-2 inline-flex items-center gap-1 rounded-md border border-hairline bg-canvas px-2 py-1 text-[11px] text-mute transition-colors hover:border-error/40 hover:text-error"
              >
                <Square className="h-3 w-3" /> Cancel
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}