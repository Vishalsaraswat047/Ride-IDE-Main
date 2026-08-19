import { db, now, type Row } from "./dbenv.js";
import { pageFrom, sliceRows } from "./helpers.js";

export function listOrders(query: Record<string, unknown>): Record<string, unknown> {
  const status = String(query.status ?? "");
  const q = String(query.q ?? "").trim().toLowerCase();
  const { page, pageSize, offset } = pageFrom(query);
  const rows = db.prepare(
    "SELECT o.*, p.title AS product_title, p.kind AS product_kind, u.email AS user_email FROM orders o LEFT JOIN products p ON p.id = o.product_id LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 5000",
  ).all() as Row[];
  const enriched = rows
    .filter((o) => {
      if (status && String(o.status) !== status) return false;
      if (q && !String(o.user_email ?? "").toLowerCase().includes(q) && !String(o.product_title ?? "").toLowerCase().includes(q)) return false;
      return true;
    })
    .map((o) => ({
      id: String(o.id),
      userId: String(o.user_id),
      email: String(o.user_email ?? ""),
      product: String(o.product_title ?? o.product_id),
      kind: String(o.product_kind ?? ""),
      amountPaise: Number(o.amount_paise),
      taxPaise: Number(o.tax_paise),
      status: String(o.status),
      gateway: String(o.gateway),
      gatewayTxnId: o.gateway_txn_id ? String(o.gateway_txn_id) : null,
      createdAt: Number(o.created_at),
      capturedAt: o.captured_at ? Number(o.captured_at) : null,
      refundedAt: o.refunded_at ? Number(o.refunded_at) : null,
    }));
  const sliced = sliceRows(enriched, offset, pageSize);
  const totals = {
    gross: enriched.filter((o) => o.status === "captured").reduce((a, o) => a + o.amountPaise, 0),
    successful: enriched.filter((o) => o.status === "captured").length,
    failed: enriched.filter((o) => o.status === "failed").length,
    refunds: enriched.filter((o) => o.status === "refunded").length,
    pending: enriched.filter((o) => o.status === "pending").length,
  };
  return { ...sliced, page, pageSize, totals };
}

export function orderDetail(id: string): Record<string, unknown> | null {
  const o = db.prepare(
    "SELECT o.*, p.title AS product_title, p.kind AS product_kind, p.description AS product_description, u.email AS user_email, u.display_name FROM orders o LEFT JOIN products p ON p.id = o.product_id LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?",
  ).get(id) as Row | undefined;
  if (!o) return null;
  return {
    id: String(o.id),
    userId: String(o.user_id),
    email: String(o.user_email ?? ""),
    userName: String(o.display_name ?? ""),
    product: String(o.product_title ?? o.product_id),
    productKind: String(o.product_kind ?? ""),
    productDescription: String(o.product_description ?? ""),
    amountPaise: Number(o.amount_paise),
    taxPaise: Number(o.tax_paise),
    status: String(o.status),
    gateway: String(o.gateway),
    gatewayTxnId: o.gateway_txn_id ? String(o.gateway_txn_id) : null,
    paymentId: o.payment_id ? String(o.payment_id) : null,
    createdAt: Number(o.created_at),
    capturedAt: o.captured_at ? Number(o.captured_at) : null,
    refundedAt: o.refunded_at ? Number(o.refunded_at) : null,
    extra: (() => {
      try {
        return JSON.parse(String(o.extra ?? "{}")) as Record<string, unknown>;
      } catch {
        return {};
      }
    })(),
  };
}

export function refundOrder(adminId: string, id: string): boolean {
  const o = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
  if (!o || String(o.status) !== "captured") return false;
  db.prepare("UPDATE orders SET status = 'refunded', refunded_at = ? WHERE id = ?").run(Date.now(), id);
  db.prepare(
    "INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
  ).run(adminId, "admin.order.refund", `order=${id} amount=${Number(o.amount_paise)}`, now());
  return true;
}

export function planSales(): Record<string, unknown> {
  const rows = db.prepare(
    "SELECT p.id, p.title, p.kind, p.price_paise, COUNT(o.id) AS sold, COALESCE(SUM(o.amount_paise), 0) AS revenue FROM products p LEFT JOIN orders o ON o.product_id = p.id AND o.status = 'captured' GROUP BY p.id ORDER BY revenue DESC",
  ).all() as Row[];
  return {
    plans: rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      kind: String(r.kind),
      pricePaise: Number(r.price_paise),
      sold: Number(r.sold),
      revenuePaise: Number(r.revenue),
    })),
  };
}

export function shipments(): Record<string, unknown> {
  const rows = db.prepare(
    "SELECT d.*, u.email AS user_email, e.product_id AS entitlement_product FROM deployments d LEFT JOIN users u ON u.id = d.user_id LEFT JOIN entitlements e ON e.id = (SELECT id FROM entitlements WHERE user_id = d.user_id AND kind = 'website_deploy' ORDER BY granted_at DESC LIMIT 1) ORDER BY d.created_at DESC LIMIT 5000",
  ).all() as Row[];
  const items = rows.map((d) => ({
    id: String(d.id),
    projectId: String(d.project_id),
    projectName: String(d.project_name),
    email: String(d.user_email ?? ""),
    userId: String(d.user_id),
    status: String(d.status),
    version: Number(d.version),
    subdomain: String(d.subdomain),
    url: d.url ? String(d.url) : null,
    createdAt: Number(d.created_at),
  }));
  return { shipments: items };
}
