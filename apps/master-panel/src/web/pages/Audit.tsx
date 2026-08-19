import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { api, fmtTime } from "../api";
import { Badge, Card, ErrorBox, PageHeader, SearchInput, Spinner, Table } from "../ui";

interface AuditEvent {
  id: number;
  action: string;
  detail: string;
  userId: string | null;
  userEmail: string;
  ip: string;
  createdAt: number;
}

export function AuditPage(): React.ReactElement {
  const [rows, setRows] = useState<AuditEvent[]>([]);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    void api.get<{ events: AuditEvent[] }>(`/api/master/audit?${params}`)
      .then((r) => setRows(r.events))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [q]);

  if (!rows.length && !error) return <Spinner label="Loading audit log…" />;

  const adminEvents = rows.filter((r) => r.action.startsWith("admin.")).length;

  return (
    <div>
      <PageHeader title="Audit Log" subtitle={`Every administrative action and key user event · ${adminEvents} admin actions in view`} />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Filter by action or detail…" />
      </div>

      <Table<AuditEvent>
        rows={rows}
        empty={<p className="text-[12px] text-mute">No audit events recorded yet.</p>}
        columns={[
          {
            key: "action",
            label: "Action",
            render: (e) => (
              <Badge text={e.action} tone={e.action.startsWith("admin.") ? "accent" : e.action.includes("failed") ? "error" : "mute"} />
            ),
          },
          { key: "detail", label: "Detail", render: (e) => <span className="block max-w-[320px] truncate text-body">{e.detail || "—"}</span> },
          { key: "userEmail", label: "Actor", render: (e) => <span>{e.userEmail || e.userId || "system"}</span> },
          { key: "ip", label: "IP", render: (e) => <span className="font-mono text-[10.5px] text-mute">{e.ip || "—"}</span> },
          { key: "createdAt", label: "Timestamp", render: (e) => <span>{fmtTime(e.createdAt)}</span> },
        ]}
      />

      <div className="mt-3">
        <Card title="Why this matters">
          <p className="text-[11.5px] leading-5 text-mute">
            Example — every action from this panel writes a line here: "admin.marketplace.remove template=…", "admin.order.refund order=…".
            That makes the panel fully accountable: who did what, to which object, when, and the result.
          </p>
        </Card>
      </div>
    </div>
  );
}