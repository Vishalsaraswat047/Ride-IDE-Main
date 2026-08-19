import { useEffect, useState } from "react";
import { api, fmtTime, money, moneyCompact, toneOf, type StatusTone } from "../api";
import { Badge, BarChart, Card, ErrorBox, Note, PageHeader, Spinner, StatCard } from "../ui";

interface DashboardData {
  users: {
    total: number; newToday: number; newThisWeek: number; newThisMonth: number;
    active30d: number; active7d: number; creators: number; verifiedStudents: number; suspended: number;
  };
  logins: { total: number; today: number; failed: number; failedToday: number; dau: number; wau: number; mau: number };
  projects: { total: number; teamProjects: number; shipped: number; distinctShippedUsers: number };
  ships: { total: number; today: number; thisWeek: number; thisMonth: number; live: number; failed: number; rolledBack: number; building: number };
  payments: { grossRevenue: number; revenueToday: number; successful: number; failed: number; refunds: number; refundAmount: number; pending: number };
  marketplace: {
    gmv: number; commission: number; creatorEarned: number; purchases: number;
    templates: number; templatesPending: number; plugins: number; pluginsPending: number; pendingPayouts: number; paidOut: number;
  };
  deployments: { total: number; live: number; failed: number; today: number; thisMonth: number };
  feedback: { new: number; total: number };
  ai: { available: boolean };
  releases: { total: number; latest: { version: string; released_at: number } | null };
  series: { revenue: Array<{ day: number; value: number }>; signups: Array<{ day: number; value: number }>; ships: Array<{ day: number; value: number }>; gmv: Array<{ day: number; value: number }> };
  recentActivity: Array<{ id: number; action: string; detail: string; userId: string | null; createdAt: number }>;
  at: number;
}

export function DashboardPage(): React.ReactElement {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = (silent = false) => {
    if (!silent) setRefreshing(true);
    void api.get<DashboardData>("/api/master/dashboard")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load(true);
    const timer = window.setInterval(() => load(true), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (!data && !error) return <Spinner label="Loading dashboard…" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <PageHeader
        title={`${greeting}, Admin`}
        subtitle={
          <span>
            Real data from the RIDE database · last refresh {fmtTime(data?.at)} · auto-refreshes every 30s
          </span>
        }
        actions={
          <button type="button" onClick={() => load()} className="h-7 rounded-sm border border-hairline bg-canvas-soft2 px-2.5 text-[12px] text-body transition-colors hover:text-ink">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        }
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="Users" value={data?.users.total.toLocaleString() ?? "—"} sub={`+${data?.users.newToday ?? 0} today`} tone="ok" />
        <StatCard label="Active users (30d)" value={data?.users.active30d.toLocaleString() ?? "—"} sub={`DAU ${data?.logins.dau ?? 0} · WAU ${data?.logins.wau ?? 0} · MAU ${data?.logins.mau ?? 0}`} tone="ok" />
        <StatCard label="Projects shipped" value={data?.ships.total.toLocaleString() ?? "—"} sub={`${data?.deployments.live ?? 0} live now`} />
        <StatCard label="Revenue" value={data ? moneyCompact(data.payments.grossRevenue) : "—"} sub={`+${data ? moneyCompact(data.payments.revenueToday) : "—"} today`} tone="accent" />
        <StatCard label="Logins (total)" value={data?.logins.total.toLocaleString() ?? "—"} sub={`${data?.logins.failed ?? 0} failed`} />
        <StatCard label="Ships" value={data?.ships.total.toLocaleString() ?? "—"} sub={`${data?.ships.today ?? 0} today · ${data?.ships.thisWeek ?? 0} this week`} />
        <StatCard label="Deployments" value={data?.deployments.total.toLocaleString() ?? "—"} sub={`${data?.deployments.live ?? 0} live · ${data?.deployments.failed ?? 0} failed`} tone={data && data.deployments.failed > 0 ? "warn" : "ok"} />
        <StatCard label="Marketplace GMV" value={data ? moneyCompact(data.marketplace.gmv) : "—"} sub={`Commission ${data ? moneyCompact(data.marketplace.commission) : "—"}`} tone="accent" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <StatCard label="New this week" value={data?.users.newThisWeek.toLocaleString() ?? "—"} sub="Registrations" />
        <StatCard label="Verified students" value={data?.users.verifiedStudents.toLocaleString() ?? "—"} sub="Active student status" />
        <StatCard label="Payments (captured)" value={data?.payments.successful.toLocaleString() ?? "—"} sub={`${data?.payments.failed ?? 0} failed · ${data?.payments.refunds ?? 0} refunds`} />
        <StatCard label="Pending payouts" value={data ? moneyCompact(data.marketplace.pendingPayouts) : "—"} sub={`Paid out ${data ? moneyCompact(data.marketplace.paidOut) : "—"}`} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card title="Revenue — last 30 days" actions={data ? <span className="text-[12px] font-semibold text-ink">{money(data.payments.grossRevenue)}</span> : undefined}>
          <BarChart data={data?.series.revenue ?? []} moneyMode />
        </Card>
        <Card title="New users — last 30 days" actions={data ? <span className="text-[12px] font-semibold text-ink">{data.users.newThisMonth.toLocaleString()}</span> : undefined}>
          <BarChart data={data?.series.signups ?? []} />
        </Card>
        <Card title="Ships — last 30 days" actions={data ? <span className="text-[12px] font-semibold text-ink">{data.ships.thisMonth.toLocaleString()}</span> : undefined}>
          <BarChart data={data?.series.ships ?? []} />
        </Card>
        <Card title="Marketplace GMV — last 30 days" actions={data ? <span className="text-[12px] font-semibold text-ink">{moneyCompact(data.marketplace.gmv)}</span> : undefined}>
          <BarChart data={data?.series.gmv ?? []} moneyMode />
        </Card>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <Card title="Recent activity">
          {data && data.recentActivity.length === 0 ? (
            <p className="text-[12px] text-mute">No activity recorded yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(data?.recentActivity ?? []).map((a) => (
                <div key={a.id} className="flex items-center gap-2 text-[11.5px]">
                  <Badge text={a.action.replace(/^admin\./, "admin·")} tone={toneOf(a.action, ["auth.login", "deploy.create", "marketplace.purchase"]) as StatusTone} />
                  <span className="truncate text-mute">{a.detail}</span>
                  <span className="ml-auto shrink-0 text-[10.5px] text-mute">{fmtTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Business pulse">
          <div className="flex flex-col gap-2 text-[12px]">
            <PulseRow label="Users → Active → Projects → Ships → Revenue" values={[
              data?.users.total ?? 0,
              data?.users.active30d ?? 0,
              data?.projects.shipped ?? 0,
              data?.ships.total ?? 0,
              data?.payments.grossRevenue ?? 0,
            ]} />
            <div className="mt-1 flex flex-col gap-1.5 border-t border-hairline pt-2">
              <p className="text-[11px] text-mute">
                Payments: <span className="text-ink">{data?.payments.successful ?? 0}</span> captured ·{" "}
                <span className="text-error">{data?.payments.failed ?? 0}</span> failed ·{" "}
                <span className="text-warning">{data?.payments.pending ?? 0}</span> pending
              </p>
              <p className="text-[11px] text-mute">
                Marketplace: <span className="text-ink">{data?.marketplace.purchases ?? 0}</span> purchases ·{" "}
                <span className="text-ink">{data?.marketplace.templatesPending ?? 0}</span> templates pending review
              </p>
              <p className="text-[11px] text-mute">
                Feedback: <span className="text-ink">{data?.feedback.new ?? 0}</span> new · Releases:{" "}
                <span className="text-ink">{data?.releases.total ?? 0}</span> released
                {data?.releases.latest ? ` · latest ${data.releases.latest.version}` : ""}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {data?.ai.available === false && (
        <div className="mt-3">
          <Note>AI usage telemetry isn't recorded server-side yet — the AI module shows a full breakdown once QUINN reports usage.</Note>
        </div>
      )}
    </div>
  );
}

function PulseRow({ label, values }: { label: string; values: number[] }): React.ReactElement {
  const max = Math.max(1, ...values);
  return (
    <div>
      <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-mute">{label}</p>
      <div className="flex items-end gap-1">
        {values.map((v, i) => (
          <div key={i} className="group relative flex-1">
            <div className="w-full rounded-t-[2px] bg-ember/40 transition-colors group-hover:bg-ember" style={{ height: Math.max(4, Math.round((v / max) * 56)) }} />
            <p className="mt-0.5 text-center text-[10px] text-mute">{v >= 100000 ? `${(v / 100000).toFixed(1)}L` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}