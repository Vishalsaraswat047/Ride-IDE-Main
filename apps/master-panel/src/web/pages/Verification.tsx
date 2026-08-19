import { useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Badge, Btn, Card, ErrorBox, PageHeader, Spinner, StatCard, Table } from "../ui";

interface VerificationRow {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  institution_name: string;
  verification_method: string;
  institution_email: string;
  verified_at: number;
  expires_at: number;
  status: string;
}

interface VerificationsResponse {
  items: VerificationRow[];
  counts: { active: number; expired: number; revoked: number };
  total: number;
  page: number;
  pageSize: number;
}

export function VerificationPage(): React.ReactElement {
  const [resp, setResp] = useState<VerificationsResponse | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void api.get<VerificationsResponse>(`/api/master/student/verifications?${params}`)
      .then(setResp)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [status]);

  useEffect(load, [load]);

  const act = async (userId: string, s: string) => {
    setBusy(`${userId}:${s}`);
    try {
      await api.post(`/api/master/student/verifications/${userId}/${s}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  if (!resp && !error) return <Spinner label="Loading verifications…" />;

  const counts = resp?.counts ?? { active: 0, expired: 0, revoked: 0 };

  return (
    <div>
      <PageHeader
        title="Student Verification"
        subtitle="Active student pricing entitlements. RIDE never stores ID documents — only verification metadata. Pending applications are not recorded server-side."
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Active" value={counts.active.toLocaleString()} tone="ok" />
        <StatCard label="Expired" value={counts.expired.toLocaleString()} tone="warn" />
        <StatCard label="Revoked / suspended" value={counts.revoked.toLocaleString()} tone="error" />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Btn onClick={() => setStatus("")} variant={status === "" ? "primary" : "ghost"}>All</Btn>
        <Btn onClick={() => setStatus("active")} variant={status === "active" ? "primary" : "ghost"}>Active</Btn>
        <Btn onClick={() => setStatus("expired")} variant={status === "expired" ? "primary" : "ghost"}>Expired</Btn>
        <Btn onClick={() => setStatus("revoked")} variant={status === "revoked" ? "primary" : "ghost"}>Revoked</Btn>
      </div>

      <Table<VerificationRow>
        rows={resp?.items ?? []}
        empty={<p className="text-[12px] text-mute">No student verifications recorded.</p>}
        columns={[
          { key: "email", label: "Email", render: (r) => <span className="font-medium text-ink">{r.email}</span> },
          { key: "display_name", label: "Name", render: (r) => <span>{r.display_name}</span> },
          { key: "institution_name", label: "University", render: (r) => <span>{r.institution_name || "—"}</span> },
          { key: "verification_method", label: "Method", render: (r) => <Badge text={r.verification_method} tone="accent" /> },
          { key: "verified_at", label: "Verified", render: (r) => <span>{fmtTime(r.verified_at)}</span> },
          { key: "expires_at", label: "Expires", render: (r) => <span>{fmtTime(r.expires_at)}</span> },
          { key: "status", label: "Status", render: (r) => <Badge text={r.status} /> },
          {
            key: "actions",
            label: "Actions",
            render: (r) => (
              <div className="flex items-center gap-1.5">
                {r.status !== "active" && (
                  <Btn onClick={() => void act(r.user_id, "active")} disabled={busy === `${r.user_id}:active`} variant="primary">Approve</Btn>
                )}
                {r.status === "active" && (
                  <Btn onClick={() => void act(r.user_id, "revoked")} disabled={busy === `${r.user_id}:revoked`} variant="danger">Suspend</Btn>
                )}
              </div>
            ),
          },
        ]}
      />

      <div className="mt-3">
        <Card title="Policy note">
          <p className="text-[11.5px] leading-5 text-mute">
            Verification evidence (OTP confirmations, campus codes, student-ID metadata) is intentionally not retained. This list only shows active,
            expired and revoked entitlements. Approving here is an administrative override — the audit log records every change.
          </p>
        </Card>
      </div>
    </div>
  );
}