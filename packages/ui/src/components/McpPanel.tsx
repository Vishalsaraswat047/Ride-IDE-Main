import * as React from "react";
import { PlugZap, Plus, Trash2, RefreshCw, Loader2, CircleCheck, CircleX } from "lucide-react";
import { cn } from "../lib/cn";

export interface McpServerLite {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  connected: boolean;
  lastError: string | null;
}

export interface McpApi {
  list: () => Promise<McpServerLite[]>;
  connectAll: () => Promise<McpServerLite[]>;
  reconnect: (id: string) => Promise<{ ok: boolean; error?: string }>;
  add: (input: { name: string; url: string; headers?: Record<string, string> }) => Promise<unknown>;
  update: (id: string, patch: Partial<{ name: string; url: string; headers: Record<string, string>; enabled: boolean }>) => Promise<unknown>;
  remove: (id: string) => Promise<boolean>;
}

export function McpPanel({ api, className }: { api: McpApi; className?: string }) {
  const [servers, setServers] = React.useState<McpServerLite[]>([]);
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", url: "" });
  const [notice, setNotice] = React.useState<string | null>(null);

  const refresh = React.useCallback(() => {
    void api.list().then(setServers);
  }, [api]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const connectAll = async () => {
    setBusy(true);
    try {
      const list = await api.connectAll();
      setServers(list);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!draft.name.trim() || !draft.url.trim()) return;
    setBusy(true);
    try {
      await api.add({ name: draft.name.trim(), url: draft.url.trim() });
      setDraft({ name: "", url: "" });
      setCreating(false);
      refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const toggleEnabled = async (s: McpServerLite) => {
    await api.update(s.id, { enabled: !s.enabled });
    refresh();
  };

  const inputCls =
    "w-full rounded-lg border border-hairline bg-canvas-soft px-3 py-2 text-sm text-ink outline-none placeholder:text-mute focus:border-link/40 focus:ring-1 focus:ring-link/20";

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto p-3", className)}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mute">
          <PlugZap className="h-4 w-4 text-link" />
          MCP servers
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            onClick={connectAll}
            disabled={busy}
            title="Connect / refresh all servers"
            className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas-soft px-2.5 py-1.5 text-xs text-body transition-colors hover:border-link/30 hover:text-link disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Connect all
          </button>
          <button
            onClick={() => setCreating((c) => !c)}
            className="flex items-center gap-1 rounded-lg border border-hairline bg-canvas-soft px-2.5 py-1.5 text-xs text-body transition-colors hover:border-link/30 hover:text-link"
          >
            {creating ? "Cancel" : <><Plus className="h-3.5 w-3.5" /> Add server</>}
          </button>
        </div>
      </div>

      {notice && <p className="mb-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">{notice}</p>}

      {creating && (
        <div className="mb-3 space-y-2 rounded-xl border border-hairline bg-canvas-soft/70 p-3">
          <input className={inputCls} placeholder="Server name (e.g. “GitHub MCP”)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <input className={inputCls} placeholder="Streamable HTTP URL (https://…/mcp)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
          <button
            onClick={add}
            disabled={!draft.name.trim() || !draft.url.trim() || busy}
            className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary transition-opacity disabled:opacity-40"
          >
            Add & connect
          </button>
          <p className="text-[10px] leading-4 text-mute">
            Protocol: Model Context Protocol over Streamable HTTP (JSON-RPC). The agent can reach connected servers through its{" "}
            <code className="rounded bg-canvas-soft px-1">mcp</code> tool.
          </p>
        </div>
      )}

      {servers.length === 0 && !creating && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-mute">
          <PlugZap className="h-8 w-8 opacity-40" />
          <p className="max-w-64 text-xs leading-5">
            No MCP servers yet. Add one to give the agent access to external tools (databases, GitHub, browsers…).
          </p>
        </div>
      )}

      <div className="space-y-2">
        {servers.map((s) => (
          <div key={s.id} className="rounded-xl border border-hairline bg-canvas-soft/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", s.connected ? "bg-emerald-500" : "bg-mute/50")} />
                  <span className="truncate text-sm font-medium text-body">{s.name}</span>
                  <span className={cn(
                    "flex shrink-0 items-center gap-1 text-[10px] uppercase tracking-wide",
                    s.connected ? "text-emerald-500" : "text-mute",
                  )}>
                    {s.connected ? <CircleCheck className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
                    {s.connected ? "connected" : "offline"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-mute">{s.url}</p>
                {s.lastError && <p className="mt-1 text-[10px] leading-4 text-warning">{s.lastError.slice(0, 160)}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => void api.reconnect(s.id).then(refresh)}
                  title="Reconnect"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-link/30 hover:text-link"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleEnabled(s)}
                  title={s.enabled ? "Disable" : "Enable"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-link/30 hover:text-link"
                >
                  <span className={cn("text-xs", s.enabled ? "text-link" : "text-mute")}>ON</span>
                </button>
                <button
                  onClick={() => void api.remove(s.id).then(refresh)}
                  title="Remove server"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline bg-canvas-soft text-body transition-colors hover:border-error/30 hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}