import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, fmtTime, money, type StatusTone } from "../api";
import { Badge, Btn, Card, ErrorBox, PageHeader, SearchInput, SelectInput, Spinner, StatCard, Table } from "../ui";

interface OrderRow {
  id: string;
  userId: string;
  email: string;
  product: string;
  kind: string;
  amountPaise: number;
  taxPaise: number;
  status: string;
  gateway: string;
  gatewayTxnId: string | null;
  createdAt: number;
  capturedAt: number | null;
  refundedAt: number | null;
}

interface OrderDetail extends OrderRow {
  userName: string;
  productDescription: string;
  paymentId: string | null;
  extra: Record<string, unknown>;
}

interface OrdersResponse {
  items: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { gross: number; successful: number; failed: number; refunds: number; pending: number };
}

export function TransactionsPage(): React.ReactElement {
  const [resp, setResp] = useState<OrdersResponse | null>(null);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q) params.set("q", q);
    void api.get<OrdersResponse>(`/api/master/orders?${params}`)
      .then(setResp)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [status, q]);

  useEffect(() => {
    const t = window.setTimeout(load, q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  const refund = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await api.post(`/api/master/orders/${detail.id}/refund`);
      setDetail(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!resp && !error) return <Spinner label="Loading transactions…" />;

  return (
    <div>
      <PageHeader title="Payments" subtitle="Complete transaction history from the orders table, verified against the payment gateway" />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-4 gap-2.5">
        <StatCard label="Gross revenue" value={resp ? money(resp.totals.gross) : "—"} tone="accent" />
        <StatCard label="Successful" value={resp?.totals.successful.toLocaleString() ?? "—"} tone="ok" />
        <StatCard label="Failed" value={resp?.totals.failed.toLocaleString() ?? "—"} tone={resp && resp.totals.failed > 0 ? "error" : "mute"} />
        <StatCard label="Refunds" value={resp?.totals.refunds.toLocaleString() ?? "—"} tone={resp && resp.totals.refunds > 0 ? "warn" : "mute"} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search email or product…" />
        <SelectInput value={status} onChange={setStatus} options={[
          { value: "", label: "All statuses" },
          { value: "captured", label: "Captured" },
          { value: "pending", label: "Pending" },
          { value: "failed", label: "Failed" },
          { value: "refunded", label: "Refunded" },
          { value: "cancelled", label: "Cancelled" },
        ]} />
      </div>

      <Table<OrderRow>
        rows={resp?.items ?? []}
        onRowClick={(o) => void api.get<OrderDetail>(`/api/master/orders/${o.id}`).then(setDetail).catch((e) => setError(e instanceof Error ? e.message : String(e)))}
        empty={<p className="text-[12px] text-mute">No transactions match the current filters.</p>}
        columns={[
          { key: "id", label: "Transaction", render: (o) => <span className="font-mono text-[10.5px] text-body">{o.id}</span> },
          { key: "email", label: "User", render: (o) => <span className="text-ink">{o.email || "—"}</span> },
          { key: "product", label: "Product", render: (o) => <span>{o.product}</span> },
          { key: "amountPaise", label: "Amount", render: (o) => <span className="font-medium text-ink">{money(o.amountPaise)}</span> },
          { key: "gateway", label: "Gateway", render: (o) => <Badge text={o.gateway} tone="accent" /> },
          { key: "status", label: "Status", render: (o) => <Badge text={o.status} tone={o.status === "captured" ? "ok" : o.status === "failed" ? "error" : o.status === "refunded" ? "warn" : "mute"} /> },
          { key: "createdAt", label: "Date", render: (o) => <span>{fmtTime(o.createdAt)}</span> },
        ]}
      />

      {detail && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/50" onClick={() => setDetail(null)}>
          <div className="master-scroll h-full w-full max-w-[420px] overflow-y-auto border-l border-hairline bg-canvas p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">{money(detail.amountPaise)}</h2>
                <Badge text={detail.status} tone={(detail.status === "captured" ? "ok" : detail.status === "failed" ? "error" : detail.status === "refunded" ? "warn" : "mute") as StatusTone} />
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-sm p-1 text-mute hover:text-ink" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <Card title="Transaction">
                <div className="flex flex-col gap-1.5 text-[12px]">
                  <Field k="User" v={`${detail.userName || ""} ${detail.email}`.trim() || "—"} />
                  <Field k="Product" v={detail.product} />
                  <Field k="Kind" v={detail.kind} />
                  <Field k="Provider" v={detail.gateway} />
                  <Field k="Payment ID" v={detail.paymentId ?? detail.gatewayTxnId ?? "—"} />
                  <Field k="Amount" v={money(detail.amountPaise)} />
                  <Field k="Tax" v={money(detail.taxPaise)} />
                  <Field k="Created" v={fmtTime(detail.createdAt)} />
                  <Field k="Captured" v={fmtTime(detail.capturedAt)} />
                  <Field k="Refunded" v={fmtTime(detail.refundedAt)} />
                </div>
              </Card>
              {detail.extra && Object.keys(detail.extra).length > 0 && (
                <Card title="Metadata">
                  <pre className="overflow-x-auto rounded-md bg-canvas-soft2 p-2 font-mono text-[10.5px] text-body">{JSON.stringify(detail.extra, null, 2)}</pre>
                </Card>
              )}
              {detail.status === "captured" && (
                <Btn variant="danger" onClick={() => void refund()} disabled={busy}>Refund {money(detail.amountPaise)}</Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ k, v }: { k: string; v: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-hairline/60 py-1">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}