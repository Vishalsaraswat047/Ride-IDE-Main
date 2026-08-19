import { useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Badge, ErrorBox, PageHeader, Spinner, Table } from "../ui";

interface LoginRow {
  id: number;
  action: string;
  userId: string | null;
  email: string;
  name: string;
  ip: string;
  createdAt: number;
  success: boolean;
}

export function LoginsPage(): React.ReactElement {
  const [rows, setRows] = useState<LoginRow[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ items: LoginRow[]; total: number }>("/api/master/logins?pageSize=50")
      .then((r) => { setRows(r.items); setTotal(r.total); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!rows.length && !error) return <Spinner label="Loading authentication events…" />;

  const ok = rows.filter((r) => r.success).length;
  const fail = rows.length - ok;

  return (
    <div>
      <PageHeader
        title="Authentication"
        subtitle={`${total.toLocaleString()} login events recorded in the audit log · provider-level splits (Google/email) are not captured — only success/failure`}
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 flex gap-2 text-[12px]">
        <span className="rounded-full bg-link/10 px-2.5 py-1 font-semibold text-link">{ok} succeeded (shown)</span>
        <span className="rounded-full bg-error/10 px-2.5 py-1 font-semibold text-error">{fail} failed (shown)</span>
      </div>

      <Table<LoginRow>
        rows={rows}
        empty={<p className="text-[12px] text-mute">No authentication events recorded yet.</p>}
        columns={[
          { key: "email", label: "Email", render: (r) => <span className="font-medium text-ink">{r.email || "—"}</span> },
          { key: "name", label: "Name", render: (r) => <span>{r.name || "—"}</span> },
          { key: "action", label: "Event", render: (r) => <Badge text={r.success ? "login" : "login failed"} tone={r.success ? "ok" : "error"} /> },
          { key: "ip", label: "IP", render: (r) => <span className="font-mono text-[11px]">{r.ip || "—"}</span> },
          { key: "createdAt", label: "Timestamp", render: (r) => <span>{fmtTime(r.createdAt)}</span> },
        ]}
      />
      <p className="mt-3 text-[11.5px] text-mute">Device/OS metadata is not collected for logins — only IP (when recorded) is available for security review.</p>
    </div>
  );
}