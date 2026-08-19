import { useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Badge, ErrorBox, PageHeader, Spinner, StatCard, Table } from "../ui";

interface ShipRow {
  id: string;
  projectId: string;
  projectName: string;
  email: string;
  userId: string;
  status: string;
  version: number;
  subdomain: string;
  url: string | null;
  createdAt: number;
}

export function ShipmentsPage(): React.ReactElement {
  const [ships, setShips] = useState<ShipRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ shipments: ShipRow[] }>("/api/master/shipments")
      .then((r) => setShips(r.shipments))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!ships.length && !error) return <Spinner label="Loading shipments…" />;

  const live = ships.filter((s) => s.status === "live").length;

  return (
    <div>
      <PageHeader
        title="Shipments"
        subtitle="Every project shipped to production. The plan split (₹49 student / ₹99 developer) is derived from the entitlement that funded the deployment."
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Total shipments" value={ships.length} />
        <StatCard label="Live" value={live} tone="ok" />
        <StatCard label="Failed" value={ships.filter((s) => s.status === "failed").length} tone={ships.some((s) => s.status === "failed") ? "error" : "mute"} />
        <StatCard label="Builds in progress" value={ships.filter((s) => s.status === "building").length} tone="warn" />
      </div>

      <Table<ShipRow>
        rows={ships}
        empty={<p className="text-[12px] text-mute">No shipments yet — deploy a project from the IDE to see it here.</p>}
        columns={[
          { key: "projectName", label: "Project", render: (s) => <span className="font-medium text-ink">{s.projectName}</span> },
          { key: "email", label: "User", render: (s) => <span>{s.email || "—"}</span> },
          { key: "subdomain", label: "Subdomain", render: (s) => <span className="font-mono text-[11px]">{s.subdomain}.ride.app</span> },
          { key: "url", label: "URL", render: (s) => (s.url ? <a className="text-link hover:underline" href={s.url} target="_blank" rel="noreferrer">{s.url}</a> : "—") },
          { key: "version", label: "Version", render: (s) => <span>v{s.version}</span> },
          { key: "status", label: "Status", render: (s) => <Badge text={s.status} /> },
          { key: "createdAt", label: "Date", render: (s) => <span>{fmtTime(s.createdAt)}</span> },
        ]}
      />
    </div>
  );
}