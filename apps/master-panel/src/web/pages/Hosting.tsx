import { useEffect, useState } from "react";
import { Server } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, ErrorBox, Note, PageHeader, Spinner, StatCard, Table } from "../ui";
import { EmptyModule } from "../Shell";

interface HostingData {
  activeDeployments: number;
  liveSites: Array<{ id: string; subdomain: string; url: string | null; project: string; updatedAt: number }>;
  hostingerConnections: { available: boolean; note: string };
}

export function HostingPage(): React.ReactElement {
  const [data, setData] = useState<HostingData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<HostingData>("/api/master/hosting")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data && !error) return <Spinner label="Loading hosting data…" />;

  return (
    <div>
      <PageHeader title="Hosting" subtitle="Hosting targets behind RIDE deployments" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Active deployments" value={data?.activeDeployments ?? 0} tone="ok" />
        <StatCard label="Hostinger connections" value="N/A" sub="In-memory in backend process" tone="warn" />
        <StatCard label="Affiliate revenue" value="N/A" sub="Referral system not built yet" tone="mute" />
      </div>

      {data?.hostingerConnections && !data.hostingerConnections.available && (
        <div className="mb-3"><Note>{data.hostingerConnections.note}</Note></div>
      )}

      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Live sites (RIDE local hosting)</h3>
      <Table<HostingData["liveSites"][number]>
        rows={data?.liveSites ?? []}
        empty={<p className="text-[12px] text-mute">No live sites yet.</p>}
        columns={[
          { key: "subdomain", label: "Subdomain", render: (s) => <span className="font-mono text-[11px] text-ink">{s.subdomain}.ride.app</span> },
          { key: "project", label: "Project", render: (s) => <span>{s.project}</span> },
          { key: "url", label: "URL", render: (s) => (s.url ? <a className="text-link hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : "—") },
          { key: "updatedAt", label: "Last activity", render: (s) => <span>{fmtTime(s.updatedAt)}</span> },
          { key: "status", label: "Status", render: () => <Badge text="live" tone="ok" /> },
        ]}
      />
    </div>
  );
}

export function DomainsPage(): React.ReactElement {
  const [domains, setDomains] = useState<Array<{ id: string; subdomain: string; url: string | null; status: string; deployments: number; lastActiveAt: number }>>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ domains: typeof domains; note: string }>("/api/master/domains")
      .then((r) => { setDomains(r.domains); setNote(r.note); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!domains.length && !error) return <Spinner label="Loading domains…" />;

  return (
    <div>
      <PageHeader title="Domains" subtitle="RIDE subdomains serving live projects" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="mb-3"><Note>{note}</Note></div>

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Domains in use" value={domains.length} />
        <StatCard label="Live" value={domains.filter((d) => d.status === "live").length} tone="ok" />
        <StatCard label="Custom domains" value="N/A" sub="Needs Hostinger DNS data" tone="warn" />
      </div>

      {domains.length === 0 ? (
        <EmptyModule icon={<Server className="h-5 w-5" />} title="No domains yet" note="Domains appear here once a project is deployed. SSL/DNS status requires Hostinger integration data." />
      ) : (
        <Table<typeof domains[number]>
          rows={domains}
          columns={[
            { key: "subdomain", label: "Domain", render: (d) => <span className="font-mono text-[11px] text-ink">{d.subdomain}.ride.app</span> },
            { key: "url", label: "URL", render: (d) => (d.url ? <a className="text-link hover:underline" href={d.url} target="_blank" rel="noreferrer">{d.url}</a> : "—") },
            { key: "deployments", label: "Deployments", render: (d) => <span>{d.deployments}</span> },
            { key: "lastActiveAt", label: "Last active", render: (d) => <span>{fmtTime(d.lastActiveAt)}</span> },
            { key: "status", label: "Status", render: (d) => <Badge text={d.status} /> },
          ]}
        />
      )}
    </div>
  );
}