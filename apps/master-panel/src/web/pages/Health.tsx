import { useEffect, useState } from "react";
import { Activity, Server } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, Card, ErrorBox, PageHeader, Spinner, StatCard } from "../ui";

interface HealthData {
  checks: Array<{ name: string; status: "ok" | "error" | "unknown"; detail: string }>;
  failedActions24h: number;
  at: number;
}

export function HealthPage(): React.ReactElement {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<HealthData>("/api/master/health")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data && !error) return <Spinner label="Checking system health…" />;

  return (
    <div>
      <PageHeader title="System Health" subtitle={`Checked at ${fmtTime(data?.at)}`} />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Failed actions (24h)" value={data?.failedActions24h ?? "—"} tone={(data?.failedActions24h ?? 0) > 0 ? "error" : "ok"} />
        <StatCard label="Services" value={data?.checks.length ?? "—"} sub="checked" />
      </div>

      <Card title="Service status">
        <div className="grid gap-2 md:grid-cols-2">
          {(data?.checks ?? []).map((c) => (
            <div key={c.name} className="flex items-center gap-3 rounded-md border border-hairline bg-canvas-soft2 px-3 py-2.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-md ${
                  c.status === "ok" ? "bg-link/10 text-link" : c.status === "error" ? "bg-error/10 text-error" : "bg-hairline/40 text-mute"
                }`}
              >
                {c.status === "unknown" ? <Server className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-ink">{c.name}</p>
                <p className="truncate text-[11px] text-mute">{c.detail}</p>
              </div>
              <div className="ml-auto">
                <Badge text={c.status === "ok" ? "healthy" : c.status === "error" ? "down" : "unknown"} tone={c.status === "ok" ? "ok" : c.status === "error" ? "error" : "warn"} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-3 text-[11.5px] text-mute">
        API, database and payments are checked against live state. The AI agent and builds run inside the desktop IDE — the master panel can only report
        "unknown" until telemetry is added.
      </p>
    </div>
  );
}