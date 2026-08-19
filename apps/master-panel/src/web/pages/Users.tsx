import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, fmtTime, money, type StatusTone } from "../api";
import { Badge, Btn, Card, ErrorBox, PageHeader, SearchInput, SelectInput, Spinner, Table } from "../ui";
import { nav } from "../ui";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  type: string;
  joinedAt: number;
  lastLoginAt: number | null;
  ships: number;
  projects: number;
  spentPaise: number;
  orderCount: number;
  purchases: number;
  uploads: number;
  studentStatus: string | null;
}

interface UserDetail extends Omit<UserRow, "purchases" | "uploads"> {
  student: { status: string; method: string; institutionEmail: string; institution: string; verifiedAt: number; expiresAt: number } | null;
  orders: Array<{ id: string; product: string; amountPaise: number; taxPaise: number; status: string; gateway: string; gatewayTxnId: string | null; createdAt: number; capturedAt: number | null }>;
  deployments: Array<{ id: string; projectId: string; projectName: string; version: number; status: string; subdomain: string; url: string | null; createdAt: number }>;
  purchases: Array<{ id: string; item: string; pricePaise: number; createdAt: number }>;
  uploads: Array<{ id: string; title: string; status: string; pricePaise: number; createdAt: number }>;
  activity: Array<{ action: string; detail: string; createdAt: number }>;
  teams: Array<{ name: string; plan: string; role: string; status: string }>;
}

interface UsersResponse {
  items: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { all: number; students: number; developers: number; teams: number; agencies: number; creators: number };
}

export function UsersPage(): React.ReactElement {
  const [resp, setResp] = useState<UsersResponse | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<UserDetail | null>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    void api.get<UsersResponse>(`/api/master/users?${params}`)
      .then(setResp)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [q, type, page]);

  useEffect(() => {
    const t = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  const openUser = (u: UserRow) => {
    void api.get<UserDetail>(`/api/master/users/${u.id}`).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  if (!resp && !error) return <Spinner label="Loading users…" />;

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={`${resp?.total.toLocaleString() ?? 0} accounts · ${resp?.totals.students ?? 0} students · ${resp?.totals.developers ?? 0} developers · ${resp?.totals.teams ?? 0} team members · ${resp?.totals.creators ?? 0} creators`}
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search email or name…" />
        <SelectInput value={type} onChange={setType} options={[
          { value: "", label: "All types" },
          { value: "student", label: "Student" },
          { value: "developer", label: "Developer" },
          { value: "team", label: "Team" },
          { value: "agency", label: "Agency" },
          { value: "creator", label: "Creator" },
        ]} />
      </div>

      <Table<UserRow>
        rows={resp?.items ?? []}
        onRowClick={openUser}
        empty={<p className="text-[12px] text-mute">No users match the current filters.</p>}
        columns={[
          { key: "name", label: "Name", render: (u) => <span className="font-medium text-ink">{u.name || u.email.split("@")[0]}</span> },
          { key: "email", label: "Email", render: (u) => <span className="text-body">{u.email}</span> },
          { key: "type", label: "Type", render: (u) => <Badge text={u.type} tone={u.type === "Student" ? "ok" : "mute"} /> },
          { key: "joinedAt", label: "Joined", render: (u) => <span>{fmtTime(u.joinedAt)}</span> },
          { key: "lastLoginAt", label: "Last login", render: (u) => <span>{fmtTime(u.lastLoginAt)}</span> },
          { key: "projects", label: "Projects", render: (u) => <span>{u.projects}</span> },
          { key: "ships", label: "Ships", render: (u) => <span>{u.ships}</span> },
          { key: "spentPaise", label: "Spent", render: (u) => <span>{u.spentPaise ? money(u.spentPaise) : "—"}</span> },
          { key: "status", label: "Status", render: (u) => (u.studentStatus === "revoked" || u.role === "suspended" ? <Badge text="suspended" tone="error" /> : <Badge text="active" tone="ok" />) },
        ]}
      />

      {resp && resp.total > resp.pageSize && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-[11.5px] text-mute">Page {resp.page} of {Math.max(1, Math.ceil(resp.total / resp.pageSize))}</p>
          <div className="flex gap-2">
            <Btn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Btn>
            <Btn onClick={() => setPage((p) => p + 1)} disabled={page >= Math.ceil(resp.total / resp.pageSize)}>Next</Btn>
          </div>
        </div>
      )}

      {detail && <UserProfile detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function UserProfile({ detail, onClose }: { detail: UserDetail; onClose: () => void }): React.ReactElement {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={onClose}>
      <div className="master-scroll h-full w-full max-w-[520px] overflow-y-auto border-l border-hairline bg-canvas p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{detail.name || detail.email}</h2>
            <p className="text-[12px] text-mute">{detail.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-sm p-1 text-mute hover:text-ink" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Card title="Account">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
              <Field k="Account type" v={<Badge text={detail.type} tone={detail.type === "Student" ? "ok" : "mute"} />} />
              <Field k="Role" v={detail.role} />
              <Field k="Created" v={fmtTime(detail.joinedAt)} />
              <Field k="Last login" v={fmtTime(detail.lastLoginAt)} />
              <Field k="Status" v={detail.studentStatus === "revoked" || detail.role === "suspended" ? <Badge text="suspended" tone="error" /> : <Badge text="active" tone="ok" />} />
              {detail.student && (
                <Field
                  k="Student"
                  v={<Badge text={`${detail.student.status} · ${detail.student.method}`} tone={detail.student.status === "active" ? "ok" : "warn"} />}
                />
              )}
            </div>
            {detail.student && (
              <p className="mt-2 text-[11px] text-mute">
                {detail.student.institution || "Institution"} · verified {fmtTime(detail.student.verifiedAt)} · expires {fmtTime(detail.student.expiresAt)}
              </p>
            )}
          </Card>

          <Card title="Usage">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Projects" value={detail.projects} />
              <MiniStat label="Ships" value={detail.ships} />
              <MiniStat label="Deployments" value={detail.deployments.length} />
              <MiniStat label="Purchases" value={detail.purchases.length} />
              <MiniStat label="Uploads" value={detail.uploads.length} />
              <MiniStat label="Orders" value={detail.orderCount} />
            </div>
          </Card>

          <Card title="Payments">
            {detail.orders.length === 0 ? (
              <p className="text-[12px] text-mute">No orders.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {detail.orders.slice(0, 8).map((o) => (
                  <div key={o.id} className="flex items-center gap-2 text-[11.5px]">
                    <Badge text={o.status} tone={o.status === "captured" ? "ok" : o.status === "failed" ? "error" : "warn"} />
                    <span className="truncate text-body">{o.product}</span>
                    <span className="ml-auto text-ink">{money(o.amountPaise)}</span>
                    <span className="shrink-0 text-[10.5px] text-mute">{fmtTime(o.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[11px] text-mute">Total spent: <span className="text-ink">{money(detail.spentPaise)}</span> · {detail.orderCount} transactions</p>
          </Card>

          {detail.teams.length > 0 && (
            <Card title="Teams">
              <div className="flex flex-col gap-1.5 text-[11.5px]">
                {detail.teams.map((t) => (
                  <div key={t.name} className="flex items-center gap-2">
                    <span className="text-body">{t.name}</span>
                    <Badge text={t.plan} tone="mute" />
                    <Badge text={t.role} tone="accent" />
                    <span className="ml-auto"><Badge text={t.status} /></span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="Marketplace activity">
            {detail.purchases.length === 0 && detail.uploads.length === 0 ? (
              <p className="text-[12px] text-mute">No marketplace activity.</p>
            ) : (
              <>
                {detail.purchases.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 py-0.5 text-[11.5px]">
                    <span className="text-body">Purchased</span>
                    <span className="truncate text-ink">{p.item}</span>
                    <span className="ml-auto text-mute">{money(p.pricePaise)}</span>
                    <span className="text-[10.5px] text-mute">{fmtTime(p.createdAt)}</span>
                  </div>
                ))}
                {detail.uploads.map((u) => (
                  <div key={u.id} className="flex items-center gap-2 py-0.5 text-[11.5px]">
                    <span className="text-body">Uploaded</span>
                    <span className="truncate text-ink">{u.title}</span>
                    <Badge text={u.status} tone={(u.status === "published" ? "ok" : u.status === "pending" ? "warn" : "error") as StatusTone} />
                    <span className="ml-auto text-mute">{u.pricePaise ? money(u.pricePaise) : "Free"}</span>
                  </div>
                ))}
              </>
            )}
          </Card>

          <Card title="Recent activity">
            <div className="flex flex-col gap-1">
              {detail.activity.slice(0, 10).map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className="rounded-sm bg-canvas-soft2 px-1.5 py-0.5 font-mono text-[10px] text-body">{a.action}</span>
                  <span className="truncate text-mute">{a.detail}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-mute">{fmtTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Btn onClick={() => nav("transactions")} variant="ghost">View transactions…</Btn>
        </div>
      </div>
    </div>
  );
}

function Field({ k, v }: { k: string; v: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-hairline/60 py-1">
      <dt className="text-mute">{k}</dt>
      <dd className="truncate text-ink">{v}</dd>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }): React.ReactElement {
  return (
    <div className="rounded-md border border-hairline bg-canvas-soft2 px-2 py-2">
      <p className="text-[15px] font-semibold text-ink">{value}</p>
      <p className="text-[10px] text-mute">{label}</p>
    </div>
  );
}