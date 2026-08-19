import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, Card, ErrorBox, PageHeader, Spinner, StatCard, Table } from "../ui";

interface DeploymentRow {
  id: string;
  userId: string;
  email: string;
  projectId: string;
  projectName: string;
  version: number;
  status: string;
  subdomain: string;
  url: string | null;
  buildSizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

interface DeploymentDetail extends DeploymentRow {
  healthCheck: string | null;
  logs: Array<{ level: string; message: string; createdAt: number }>;
}

export function DeploymentsPage(): React.ReactElement {
  const [rows, setRows] = useState<DeploymentRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<DeploymentDetail | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void api.get<{ items: DeploymentRow[]; counts: Record<string, number> }>(`/api/master/deployments?${params}`)
      .then((r) => { setRows(r.items); setCounts(r.counts); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [status]);

  if (!rows.length && !error) return <Spinner label="Loading deployments…" />;

  return (
    <div>
      <PageHeader title="Deployments" subtitle="Every deployment record with build status, hosting target and history" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Total" value={(counts.live ?? 0) + (counts.failed ?? 0) + (counts.building ?? 0) + (counts.rolledBack ?? 0)} />
        <StatCard label="Live" value={counts.live ?? 0} tone="ok" />
        <StatCard label="Failed" value={counts.failed ?? 0} tone={(counts.failed ?? 0) > 0 ? "error" : "mute"} />
        <StatCard label="Building" value={counts.building ?? 0} tone="warn" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        {["", "live", "building", "failed", "rolled_back"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-sm px-2.5 py-1.5 text-[12px] font-medium transition-colors ${status === s ? "bg-ember/15 text-ink" : "text-mute hover:bg-canvas-soft2"}`}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <Table<DeploymentRow>
        rows={rows}
        onRowClick={(d) => void api.get<DeploymentDetail>(`/api/master/deployments/${d.id}`).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
        empty={<p className="text-[12px] text-mute">No deployments recorded yet.</p>}
        columns={[
          { key: "projectName", label: "Project", render: (d) => <span className="font-medium text-ink">{d.projectName}</span> },
          { key: "email", label: "User", render: (d) => <span>{d.email || "—"}</span> },
          { key: "subdomain", label: "Hosting", render: (d) => <span className="font-mono text-[11px]">{d.subdomain}.ride.app</span> },
          { key: "version", label: "Version", render: (d) => <span>v{d.version}</span> },
          { key: "status", label: "Status", render: (d) => <Badge text={d.status} /> },
          { key: "url", label: "URL", render: (d) => (d.url ? <a className="text-link hover:underline" href={d.url} target="_blank" rel="noreferrer">open</a> : "—") },
          { key: "updatedAt", label: "Last deployment", render: (d) => <span>{fmtTime(d.updatedAt)}</span> },
        ]}
      />

      {detail && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setDetail(null)}>
          <div className="master-scroll h-full w-full max-w-[480px] overflow-y-auto border-l border-hairline bg-canvas p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">{detail.projectName}</h2>
                <p className="text-[12px] text-mute">{detail.email || "—"}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-sm p-1 text-mute hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Card title="Deployment">
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <Field k="Status" v={<Badge text={detail.status} />} />
                  <Field k="Hosting" v="RIDE local hosting" />
                  <Field k="Subdomain" v={`${detail.subdomain}.ride.app`} />
                  <Field k="Version" v={`v${detail.version}`} />
                  <Field k="Build size" v={detail.buildSizeBytes ? `${(detail.buildSizeBytes / 1024).toFixed(1)} KB` : "—"} />
                  <Field k="Health check" v={detail.healthCheck ?? "—"} />
                  <Field k="Created" v={fmtTime(detail.createdAt)} />
                  <Field k="Last updated" v={fmtTime(detail.updatedAt)} />
                </div>
              </Card>

              <Card title="Build logs">
                {detail.logs.length === 0 ? (
                  <p className="text-[12px] text-mute">No log lines recorded.</p>
                ) : (
                  <div className="flex max-h-[300px] flex-col gap-1 overflow-y-auto rounded-md bg-canvas-soft2 p-2 font-mono text-[10.5px]">
                    {detail.logs.map((l, i) => (
                      <div key={i} className={l.level === "error" ? "text-error" : l.level === "warn" ? "text-warning" : "text-body"}>
                        <span className="mr-2 text-mute">{fmtTime(l.createdAt)}</span>
                        <span className="mr-2 text-hairline-strong">[{l.level}]</span>
                        {l.message}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-hairline/60 py-1">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}