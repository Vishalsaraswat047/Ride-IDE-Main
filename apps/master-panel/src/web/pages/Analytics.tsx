import { useEffect, useState } from "react";
import { api, fmtTime } from "../api";
import { Card, ErrorBox, Note, PageHeader, Spinner, StatCard } from "../ui";

interface AnalyticsData {
  users: { total: number; newToday: number; newThisWeek: number; newThisMonth: number; active30d: number; active7d: number; creators: number; verifiedStudents: number; suspended: number };
  logins: { total: number; today: number; failed: number; failedToday: number; dau: number; wau: number; mau: number };
  ships: { total: number; today: number; thisWeek: number; thisMonth: number; live: number; failed: number; rolledBack: number; building: number };
  payments: { grossRevenue: number; revenueToday: number; successful: number; failed: number; refunds: number; refundAmount: number; pending: number };
  marketplace: { gmv: number; commission: number; creatorEarned: number; purchases: number; templates: number; templatesPending: number; plugins: number; pluginsPending: number; pendingPayouts: number; paidOut: number };
  funnel: {
    stages: Array<{ label: string; value: number | null; note?: string }>;
    rates: Array<{ from: string; to: string; rate: number | null }>;
  };
}

export function AnalyticsPage(): React.ReactElement {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<AnalyticsData>("/api/master/analytics")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!data && !error) return <Spinner label="Loading analytics…" />;

  const stages = data?.funnel.stages ?? [];
  const known = stages.filter((s) => typeof s.value === "number");

  return (
    <div>
      <PageHeader title="RIDE Analytics" subtitle="Product analytics from real database activity — no fabricated metrics" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="DAU" value={data?.logins.dau.toLocaleString() ?? "—"} sub="Logged in today" />
        <StatCard label="WAU" value={data?.logins.wau.toLocaleString() ?? "—"} sub="Logged in this week" />
        <StatCard label="MAU" value={data?.logins.mau.toLocaleString() ?? "—"} sub="Logged in this month" />
        <StatCard label="Ships / user" value={data && data.users.total > 0 ? (data.ships.total / data.users.total).toFixed(2) : "—"} />
      </div>

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Active 30d / users" value={data && data.users.total > 0 ? `${Math.round((data.users.active30d / data.users.total) * 1000) / 10}%` : "—"} />
        <StatCard label="Signups / DAU" value={data && data.logins.dau > 0 ? (data.users.newToday / data.logins.dau).toFixed(2) : "—"} />
        <StatCard label="Paid → shipped" value={data ? `${Math.round((data.ships.total / Math.max(1, data.payments.successful)) * 1000) / 10}%` : "—"} />
        <StatCard label="Ship success rate" value={data && data.ships.total > 0 ? `${Math.round(((data.ships.total - data.ships.failed) / data.ships.total) * 1000) / 10}%` : "—"} />
      </div>

      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Conversion funnel — last 30 days</h3>
      <Card>
        <div className="flex flex-col gap-3">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1] : undefined;
            const prevVal = prev && typeof prev.value === "number" ? prev.value : null;
            const curVal = typeof s.value === "number" ? s.value : null;
            const pct = prevVal && curVal && prevVal > 0 ? Math.round((curVal / prevVal) * 1000) / 10 : null;
            return (
              <div key={s.label}>
                <div className="flex items-center gap-3">
                  <span className="w-36 shrink-0 text-[12px] font-medium text-body">{s.label}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded-sm bg-canvas-soft2">
                    <div
                      className={`flex h-full items-center rounded-sm px-2 ${curVal === null ? "bg-hairline/50" : i === 0 ? "bg-ember/30" : "bg-link/30"}`}
                      style={{ width: known.length ? `${Math.max(6, Math.min(100, ((curVal ?? 0) / Math.max(1, Number(known[0]?.value ?? 1))) * 100))}%` : "6%" }}
                    >
                      <span className="text-[11px] font-semibold text-ink">{curVal === null ? "no data" : curVal.toLocaleString()}</span>
                    </div>
                  </div>
                  {pct !== null && <span className="w-16 shrink-0 text-right text-[11px] text-mute">{pct}%</span>}
                </div>
                {s.note && <p className="mt-0.5 pl-[172px] text-[10.5px] text-mute">{s.note}</p>}
              </div>
            );
          })}
        </div>
        <div className="mt-3 border-t border-hairline pt-2">
          <p className="text-[11px] text-mute">Stage-to-stage conversion: {data?.funnel.rates.map((r) => `${r.from}→${r.to}: ${r.rate === null ? "N/A" : `${r.rate}%`}`).join(" · ")}</p>
        </div>
      </Card>

      <div className="mt-4">
        <Note>
          Session length, retention and activation need per-user event tracking that RIDE does not record server-side yet. DAU/WAU/MAU are derived from
          login events in the audit log. "Projects created" only counts team projects and shipped projects until a server-side project registry exists.
        </Note>
      </div>
    </div>
  );
}