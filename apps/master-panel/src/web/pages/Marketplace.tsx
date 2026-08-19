import { useCallback, useEffect, useState } from "react";
import { api, fmtTime, money, moneyCompact, type StatusTone } from "../api";
import { Badge, Btn, Card, ErrorBox, PageHeader, SelectInput, Spinner, StatCard, Table, Tabs } from "../ui";

interface Overview {
  creators: number;
  listings: number;
  purchases: number;
  gmvPaise: number;
  commissionPaise: number;
  creatorEarnedPaise: number;
  pendingPayoutsPaise: number;
  paidOutPaise: number;
  refunds: number;
  refundAmountPaise: number;
}

interface ListingRow {
  id: string;
  kind: "template" | "plugin";
  title: string;
  creatorId: string;
  creatorEmail: string;
  pricePaise: number;
  status: string;
  category: string;
  framework: string;
  sales: number;
  createdAt: number;
}

interface CreatorRow {
  id: string;
  email: string;
  name: string;
  joinedAt: number | null;
  listings: number;
  sales: number;
  gross: number;
  commission: number;
  earned: number;
  pending: number;
  paid: number;
}

interface PayoutRow {
  id: string;
  creatorId: string;
  creatorEmail: string;
  amountPaise: number;
  method: string;
  reference: string;
  status: string;
  createdAt: number;
  paidAt: number | null;
}

type TabId = "overview" | "creators" | "payouts";

export function MarketplacePage(): React.ReactElement {
  const [tab, setTab] = useState<TabId>("overview");
  const route = window.location.hash.slice(1);
  const routeTab = route === "creators" ? "creators" : route === "wallets" ? "payouts" : null;
  const active = routeTab ?? tab;
  return (
    <div>
      <PageHeader title="Marketplace" subtitle="Listings, creators and the 70/30 earnings model — all real purchase data" />
      <Tabs<TabId>
        tabs={[
          { id: "overview", label: "Overview & Listings" },
          { id: "creators", label: "Creators" },
          { id: "payouts", label: "Wallets & Payouts" },
        ]}
        active={active}
        onChange={(t) => {
          if (routeTab) window.location.hash = t === "overview" ? "marketplace" : t === "creators" ? "creators" : "wallets";
          setTab(t);
        }}
      />
      {active === "overview" && <OverviewTab />}
      {active === "creators" && <CreatorsTab />}
      {active === "payouts" && <PayoutsTab />}
    </div>
  );
}

function OverviewTab(): React.ReactElement {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    void api.get<Overview>("/api/master/marketplace/overview").then(setOverview).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    void api.get<{ items: ListingRow[] }>(`/api/master/marketplace/listings?${params}`)
      .then((r) => setRows(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [status]);

  useEffect(load, [load]);

  const moderate = async (kind: "template" | "plugin", id: string, action: string) => {
    setBusy(`${kind}:${id}:${action}`);
    try {
      await api.post(`/api/master/marketplace/listings/${kind}/${id}/${action}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  if (!overview && !error) return <Spinner label="Loading marketplace…" />;

  return (
    <div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="GMV" value={overview ? moneyCompact(overview.gmvPaise) : "—"} tone="accent" />
        <StatCard label="RIDE commission (30%)" value={overview ? moneyCompact(overview.commissionPaise) : "—"} tone="ok" />
        <StatCard label="Creator earnings (70%)" value={overview ? moneyCompact(overview.creatorEarnedPaise) : "—"} />
        <StatCard label="Purchases" value={overview?.purchases.toLocaleString() ?? "—"} sub={`${overview?.creators ?? 0} creators`} />
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Listings" value={overview?.listings ?? "—"} sub={`${overview?.refunds ?? 0} refunded`} />
        <StatCard label="Pending payouts" value={overview ? moneyCompact(overview.pendingPayoutsPaise) : "—"} tone="warn" />
        <StatCard label="Paid out" value={overview ? moneyCompact(overview.paidOutPaise) : "—"} tone="ok" />
        <StatCard label="Refund amount" value={overview ? moneyCompact(overview.refundAmountPaise) : "—"} />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <SelectInput value={status} onChange={setStatus} options={[
          { value: "", label: "All statuses" },
          { value: "pending", label: "Pending review" },
          { value: "published", label: "Published" },
          { value: "rejected", label: "Rejected" },
          { value: "suspended", label: "Suspended" },
        ]} />
      </div>

      <Table<ListingRow>
        rows={rows}
        empty={<p className="text-[12px] text-mute">No listings match the filter.</p>}
        columns={[
          { key: "title", label: "Listing", render: (l) => <span className="font-medium text-ink">{l.title}</span> },
          { key: "kind", label: "Type", render: (l) => <Badge text={l.kind} tone="accent" /> },
          { key: "creatorEmail", label: "Creator", render: (l) => <span>{l.creatorEmail || "—"}</span> },
          { key: "category", label: "Category", render: (l) => <span>{l.category}</span> },
          { key: "pricePaise", label: "Price", render: (l) => <span>{l.pricePaise ? money(l.pricePaise) : "Free"}</span> },
          { key: "sales", label: "Sales", render: (l) => <span>{l.sales}</span> },
          { key: "status", label: "Status", render: (l) => <Badge text={l.status} /> },
          { key: "createdAt", label: "Submitted", render: (l) => <span>{fmtTime(l.createdAt)}</span> },
          {
            key: "actions",
            label: "Moderation",
            render: (l) => (
              <div className="flex items-center gap-1.5">
                {l.status === "pending" && (
                  <>
                    <Btn onClick={() => void moderate(l.kind, l.id, "approve")} disabled={busy === `${l.kind}:${l.id}:approve`} variant="primary">Approve</Btn>
                    <Btn onClick={() => void moderate(l.kind, l.id, "reject")} disabled={busy === `${l.kind}:${l.id}:reject`} variant="danger">Reject</Btn>
                  </>
                )}
                {l.status === "published" && <Btn onClick={() => void moderate(l.kind, l.id, "suspend")} disabled={busy === `${l.kind}:${l.id}:suspend`}>Suspend</Btn>}
                {l.status !== "published" && l.status !== "pending" && <Btn onClick={() => void moderate(l.kind, l.id, "approve")} disabled={busy === `${l.kind}:${l.id}:approve`}>Republish</Btn>}
                <Btn onClick={() => void moderate(l.kind, l.id, "remove")} disabled={busy === `${l.kind}:${l.id}:remove`} variant="danger">Remove</Btn>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function CreatorsTab(): React.ReactElement {
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ creators: CreatorRow[] }>("/api/master/marketplace/creators")
      .then((r) => setCreators(r.creators))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!creators.length && !error) return <Spinner label="Loading creators…" />;

  return (
    <div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <Table<CreatorRow>
        rows={creators}
        empty={<p className="text-[12px] text-mute">No creators yet — the first marketplace upload creates one.</p>}
        columns={[
          { key: "email", label: "Creator", render: (c) => <span className="font-medium text-ink">{c.name || c.email || c.id}</span> },
          { key: "listings", label: "Listings", render: (c) => <span>{c.listings}</span> },
          { key: "sales", label: "Sales", render: (c) => <span>{c.sales}</span> },
          { key: "gross", label: "Gross", render: (c) => <span>{money(c.gross)}</span> },
          { key: "commission", label: "RIDE 30%", render: (c) => <span className="text-mute">{money(c.commission)}</span> },
          { key: "earned", label: "Creator 70%", render: (c) => <span className="font-semibold text-ink">{money(c.earned)}</span> },
          { key: "pending", label: "Pending payout", render: (c) => <span className="text-warning">{money(c.pending)}</span> },
          { key: "paid", label: "Paid out", render: (c) => <span className="text-link">{money(c.paid)}</span> },
          { key: "joinedAt", label: "Joined", render: (c) => <span>{fmtTime(c.joinedAt)}</span> },
        ]}
      />
    </div>
  );
}

function PayoutsTab(): React.ReactElement {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(() => {
    void api.get<{ payouts: PayoutRow[] }>("/api/master/marketplace/payouts")
      .then((r) => setPayouts(r.payouts))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  useEffect(load, [load]);

  const markPaid = async (id: string) => {
    setBusy(id);
    try {
      await api.post(`/api/master/marketplace/payouts/${id}/paid`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  };

  if (!payouts.length && !error) return <Spinner label="Loading payouts…" />;

  const pending = payouts.filter((p) => p.status === "processing").reduce((a, p) => a + p.amountPaise, 0);
  const paid = payouts.filter((p) => p.status === "paid").reduce((a, p) => a + p.amountPaise, 0);

  return (
    <div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Pending" value={money(pending)} tone="warn" />
        <StatCard label="Completed" value={money(paid)} tone="ok" />
        <StatCard label="Requests" value={payouts.length} />
      </div>
      <Card title="Wallet example — one sale">
        <p className="text-[12px] text-mute">
          ₹1,000 sale → <span className="text-ink">₹300 RIDE commission</span> → <span className="text-link">₹700 creator balance</span>. Balances live in the
          earnings/payouts tables; every payout request is visible here.
        </p>
      </Card>
      <div className="mt-3">
        <Table<PayoutRow>
          rows={payouts}
          empty={<p className="text-[12px] text-mute">No payout requests yet.</p>}
          columns={[
            { key: "creatorEmail", label: "Creator", render: (p) => <span className="font-medium text-ink">{p.creatorEmail || p.creatorId}</span> },
            { key: "amountPaise", label: "Amount", render: (p) => <span className="font-semibold text-ink">{money(p.amountPaise)}</span> },
            { key: "method", label: "Method", render: (p) => <Badge text={p.method} tone="accent" /> },
            { key: "status", label: "Status", render: (p) => <Badge text={p.status} tone={p.status === "paid" ? "ok" : p.status === "failed" ? "error" : "warn"} /> },
            { key: "createdAt", label: "Requested", render: (p) => <span>{fmtTime(p.createdAt)}</span> },
            { key: "paidAt", label: "Paid at", render: (p) => <span>{fmtTime(p.paidAt)}</span> },
            {
              key: "actions",
              label: "Actions",
              render: (p) =>
                p.status === "processing" ? (
                  <Btn onClick={() => void markPaid(p.id)} disabled={busy === p.id} variant="primary">Mark paid</Btn>
                ) : (
                  <span className="text-[11px] text-mute">—</span>
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}