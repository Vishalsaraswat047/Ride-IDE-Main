import { db, now, type Row } from "./dbenv.js";
import { pageFrom, sliceRows } from "./helpers.js";

export interface ListingRow {
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

function listingRows(): ListingRow[] {
  const templates = (db.prepare(
    "SELECT t.*, u.email AS creator_email FROM templates t LEFT JOIN users u ON u.id = t.creator_id ORDER BY t.created_at DESC",
  ).all() as Row[]).map((t) => ({
    id: String(t.id),
    kind: "template" as const,
    title: String(t.title),
    creatorId: String(t.creator_id),
    creatorEmail: String(t.creator_email ?? ""),
    pricePaise: Number(t.price_paise),
    status: String(t.status),
    category: String(t.category),
    framework: String(t.framework ?? ""),
    sales: Number(db.prepare("SELECT COUNT(*) AS c FROM purchases WHERE template_id = ?").get(String(t.id))?.c ?? 0),
    createdAt: Number(t.created_at),
  }));
  const plugins = (db.prepare(
    "SELECT p.*, u.email AS creator_email FROM plugins p LEFT JOIN users u ON u.id = p.creator_id ORDER BY p.created_at DESC",
  ).all() as Row[]).map((p) => ({
    id: String(p.id),
    kind: "plugin" as const,
    title: String(p.title),
    creatorId: String(p.creator_id),
    creatorEmail: String(p.creator_email ?? ""),
    pricePaise: Number(p.price_paise),
    status: String(p.status),
    category: String(p.category),
    framework: String(p.manifest_id ?? ""),
    sales: Number(db.prepare("SELECT COUNT(*) AS c FROM plugin_purchases WHERE plugin_id = ?").get(String(p.id))?.c ?? 0),
    createdAt: Number(p.created_at),
  }));
  return [...templates, ...plugins].sort((a, b) => b.createdAt - a.createdAt);
}

export function listListings(query: Record<string, unknown>): Record<string, unknown> {
  const status = String(query.status ?? "");
  const kind = String(query.kind ?? "");
  const { page, pageSize, offset } = pageFrom(query);
  const all = listingRows().filter((l) => {
    if (status && l.status !== status) return false;
    if (kind && l.kind !== kind) return false;
    return true;
  });
  const sliced = sliceRows(all, offset, pageSize);
  const counts: Record<string, number> = {};
  for (const l of all) counts[l.status] = (counts[l.status] ?? 0) + 1;
  return { ...sliced, page, pageSize, counts };
}

export function moderateListing(adminId: string, kind: "template" | "plugin", id: string, action: "approve" | "reject" | "suspend" | "remove"): boolean {
  const table = kind === "template" ? "templates" : "plugins";
  const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return false;
  if (action === "remove") {
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  } else {
    const status = action === "approve" ? "published" : action === "reject" ? "rejected" : "suspended";
    db.prepare(`UPDATE ${table} SET status = ?, updated_at = ? WHERE id = ?`).run(status, Date.now(), id);
  }
  db.prepare(
    "INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
  ).run(adminId, `admin.marketplace.${action}`, `${kind}=${id}`, now());
  return true;
}

export function marketplaceOverview(): Record<string, unknown> {
  const purchases = db.prepare("SELECT * FROM purchases").all() as Row[];
  const pluginPurchases = db.prepare("SELECT * FROM plugin_purchases").all() as Row[];
  const payouts = db.prepare("SELECT * FROM payouts").all() as Row[];
  const all = [...purchases, ...pluginPurchases];
  const refundedOrders = new Set(
    (db.prepare("SELECT id FROM orders WHERE status = 'refunded'").all() as Row[]).map((r) => String(r.id)),
  );
  const refunded = all.filter((p) => refundedOrders.has(String(p.order_id)));

  return {
    creators: new Set([...purchases, ...pluginPurchases].map((p) => String(p.creator_id))).size,
    listings: Number(db.prepare("SELECT COUNT(*) AS c FROM templates").get()?.c ?? 0) + Number(db.prepare("SELECT COUNT(*) AS c FROM plugins").get()?.c ?? 0),
    purchases: all.length,
    gmvPaise: all.reduce((a, p) => a + Number(p.price_paise), 0),
    commissionPaise: all.reduce((a, p) => a + Number(p.commission_paise), 0),
    creatorEarnedPaise: all.reduce((a, p) => a + Number(p.creator_paise), 0),
    pendingPayoutsPaise: payouts.filter((p) => p.status === "processing").reduce((a, p) => a + Number(p.amount_paise), 0),
    paidOutPaise: payouts.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount_paise), 0),
    refunds: refunded.length,
    refundAmountPaise: refunded.reduce((a, p) => a + Number(p.price_paise), 0),
  };
}

export function creatorRows(): Record<string, unknown> {
  const templates = db.prepare("SELECT * FROM templates").all() as Row[];
  const plugins = db.prepare("SELECT * FROM plugins").all() as Row[];
  const purchases = db.prepare("SELECT * FROM purchases").all() as Row[];
  const pluginPurchases = db.prepare("SELECT * FROM plugin_purchases").all() as Row[];
  const payouts = db.prepare("SELECT * FROM payouts").all() as Row[];
  const allPurchases = [...purchases, ...pluginPurchases];

  const byCreator = new Map<string, { listings: number; sales: number; gross: number; commission: number; earned: number; pending: number; paid: number }>();
  const touch = (id: string) => {
    if (!byCreator.has(id)) byCreator.set(id, { listings: 0, sales: 0, gross: 0, commission: 0, earned: 0, pending: 0, paid: 0 });
  };
  for (const t of templates) touch(String(t.creator_id));
  for (const p of plugins) touch(String(p.creator_id));
  for (const p of allPurchases) {
    const cid = String(p.creator_id);
    touch(cid);
    const c = byCreator.get(cid)!;
    c.sales += 1;
    c.gross += Number(p.price_paise);
    c.commission += Number(p.commission_paise);
    c.earned += Number(p.creator_paise);
  }
  for (const t of templates) byCreator.get(String(t.creator_id))!.listings += 1;
  for (const p of plugins) byCreator.get(String(p.creator_id))!.listings += 1;
  for (const p of payouts) {
    const c = byCreator.get(String(p.creator_id));
    if (!c) continue;
    if (String(p.status) === "paid") c.paid += Number(p.amount_paise);
    else if (String(p.status) === "processing") c.pending += Number(p.amount_paise);
  }

  const users = new Map<string, Row>();
  for (const u of db.prepare("SELECT id, email, display_name, created_at FROM users").all() as Row[]) users.set(String(u.id), u);

  return {
    creators: [...byCreator.entries()]
      .map(([id, c]) => ({
        id,
        email: String(users.get(id)?.email ?? ""),
        name: String(users.get(id)?.display_name ?? ""),
        joinedAt: users.get(id) ? Number(users.get(id)!.created_at) : null,
        ...c,
      }))
      .sort((a, b) => b.gross - a.gross),
  };
}

export function payoutRows(): Record<string, unknown> {
  const rows = (db.prepare(
    "SELECT p.*, u.email AS creator_email FROM payouts p LEFT JOIN users u ON u.id = p.creator_id ORDER BY p.created_at DESC LIMIT 500",
  ).all() as Row[]).map((p) => ({
    id: String(p.id),
    creatorId: String(p.creator_id),
    creatorEmail: String(p.creator_email ?? ""),
    amountPaise: Number(p.amount_paise),
    method: String(p.method),
    reference: String(p.reference ?? ""),
    status: String(p.status),
    createdAt: Number(p.created_at),
    paidAt: p.paid_at ? Number(p.paid_at) : null,
  }));
  return { payouts: rows };
}

export function markPayoutPaid(adminId: string, id: string): boolean {
  const p = db.prepare("SELECT * FROM payouts WHERE id = ?").get(id) as Row | undefined;
  if (!p || String(p.status) === "paid") return false;
  db.prepare("UPDATE payouts SET status = 'paid', paid_at = ?, reference = ? WHERE id = ?").run(Date.now(), "manual", id);
  db.prepare(
    "INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
  ).run(adminId, "admin.payout.paid", `payout=${id} amount=${Number(p.amount_paise)}`, now());
  return true;
}