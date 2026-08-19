import { useEffect, useState } from "react";
import { api, money } from "../api";
import { Badge, ErrorBox, PageHeader, Spinner, StatCard, Table } from "../ui";

interface PlanRow {
  id: string;
  title: string;
  kind: string;
  pricePaise: number;
  sold: number;
  revenuePaise: number;
}

export function PlansPage(): React.ReactElement {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void api.get<{ plans: PlanRow[] }>("/api/master/plans")
      .then((r) => setPlans(r.plans))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (!plans.length && !error) return <Spinner label="Loading plans…" />;

  const totalSold = plans.reduce((a, p) => a + p.sold, 0);
  const totalRevenue = plans.reduce((a, p) => a + p.revenuePaise, 0);

  return (
    <div>
      <PageHeader
        title="Plans & Pricing"
        subtitle="Which plan is actually selling? Sales come from captured orders grouped by product."
      />
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      <div className="mb-4 grid grid-cols-3 gap-2.5">
        <StatCard label="Units sold" value={totalSold.toLocaleString()} />
        <StatCard label="Revenue" value={money(totalRevenue)} tone="accent" />
        <StatCard label="Products" value={plans.length} />
      </div>

      <Table<PlanRow>
        rows={plans}
        empty={<p className="text-[12px] text-mute">No products in the catalog yet.</p>}
        columns={[
          { key: "title", label: "Plan", render: (p) => <span className="font-medium text-ink">{p.title}</span> },
          { key: "kind", label: "Kind", render: (p) => <Badge text={p.kind} tone="accent" /> },
          { key: "pricePaise", label: "Price", render: (p) => <span>{money(p.pricePaise)}</span> },
          { key: "sold", label: "Sold", render: (p) => <span className="font-semibold text-ink">{p.sold.toLocaleString()}</span> },
          { key: "revenuePaise", label: "Revenue", render: (p) => <span className="font-semibold text-ink">{money(p.revenuePaise)}</span> },
        ]}
      />
    </div>
  );
}