import { useCallback, useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Badge, Btn, ErrorBox, PageHeader, SelectInput, Spinner, StatCard, Table } from "../ui";

interface FeedbackRow {
  id: string;
  userId: string | null;
  email: string;
  category: string;
  message: string;
  priority: string;
  status: string;
  createdAt: number;
}

const CATEGORIES = ["bug", "feature", "ui", "ai", "deployment", "marketplace", "payment", "performance", "other"];
const STATUSES = ["new", "in_review", "planned", "in_development", "completed", "rejected"];

export function FeedbackPage(): React.ReactElement {
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void api.get<{ items: FeedbackRow[]; counts: Record<string, number> }>(`/api/master/feedback?${params}`)
      .then((r) => { setRows(r.items); setCounts(r.counts); })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [status]);

  useEffect(load, [load]);

  const set = async (id: string, patch: { status?: string; priority?: string }) => {
    setBusy(id);
    try {
      await api.post(`/api/master/feedback/${id}/status`, patch);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  if (!rows.length && !error) return <Spinner label="Loading feedback…" />;

  return (
    <div>
      <PageHeader title="Feedback" subtitle="Turn user feedback into your product roadmap" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="New" value={counts.new ?? 0} tone="ok" />
        <StatCard label="In review / planned" value={(counts.in_review ?? 0) + (counts.planned ?? 0)} tone="warn" />
        <StatCard label="In development" value={counts.in_development ?? 0} tone="accent" />
        <StatCard label="Completed" value={counts.completed ?? 0} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <SelectInput value={status} onChange={setStatus} options={[
          { value: "", label: "All statuses" },
          ...STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") })),
        ]} />
      </div>

      <Table<FeedbackRow>
        rows={rows}
        empty={<p className="text-[12px] text-mute">No feedback submitted yet. Feedback submitted from the IDE lands here.</p>}
        columns={[
          { key: "message", label: "Message", render: (f) => <span className="max-w-[320px] truncate font-medium text-ink">{f.message}</span> },
          { key: "email", label: "User", render: (f) => <span>{f.email || "—"}</span> },
          { key: "category", label: "Category", render: (f) => <Badge text={f.category} tone={f.category === "bug" ? "error" : f.category === "feature" ? "ok" : "mute"} /> },
          { key: "priority", label: "Priority", render: (f) => <Badge text={f.priority} tone={f.priority === "urgent" ? "error" : f.priority === "high" ? "warn" : "mute"} /> },
          { key: "status", label: "Status", render: (f) => <Badge text={f.status} /> },
          { key: "createdAt", label: "Date", render: (f) => <span>{fmtTime(f.createdAt)}</span> },
          {
            key: "actions",
            label: "Triage",
            render: (f) => (
              <div className="flex items-center gap-1.5">
                <SelectInput value={f.status} onChange={(v) => void set(f.id, { status: v })} options={STATUSES.map((s) => ({ value: s, label: s.replace("_", " ") }))} />
                <SelectInput value={f.priority} onChange={(v) => void set(f.id, { priority: v })} options={[
                  { value: "low", label: "low" },
                  { value: "medium", label: "medium" },
                  { value: "high", label: "high" },
                  { value: "urgent", label: "urgent" },
                ]} />
                <Btn onClick={() => void set(f.id, { status: "rejected" })} disabled={busy === f.id} variant="danger">Reject</Btn>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}