import { db, Row, genId, now } from "../db.js";

export const RIDE_COMMISSION_RATE = 0.3;
export const CREATOR_RATE = 0.7;

export interface MarketTemplate {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  pricePaise: number;
  rating: number;
  ratingCount: number;
  version: string;
  status: "pending" | "published" | "rejected";
  reviewNote: string | null;
  framework: string;
  previewUrl: string | null;
  downloadCount: number;
  createdAt: number;
  updatedAt: number;
  creatorName?: string;
}

function templateFromRow(row: Row): MarketTemplate {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    category: String(row.category ?? "web"),
    pricePaise: Number(row.price_paise),
    rating: Number(row.rating),
    ratingCount: Number(row.rating_count),
    version: String(row.version ?? "1.0.0"),
    status: String(row.status) as MarketTemplate["status"],
    reviewNote: row.review_note == null ? null : String(row.review_note),
    framework: String(row.framework ?? ""),
    previewUrl: row.preview_url == null ? null : String(row.preview_url),
    downloadCount: Number(row.download_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    creatorName: row.creator_name == null ? undefined : String(row.creator_name),
  };
}

/** Seed a few demo templates so the store isn't empty on first run. */
export function seedTemplates(): void {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM templates").get() as Row).c as number;
  if (count > 0) return;

  // system store creator (not a real user, no password)
  let creator = db.prepare("SELECT * FROM users WHERE email = ?").get("store@ride.app") as Row | undefined;
  if (!creator) {
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'creator', ?, ?)",
    ).run("usr-store", "store@ride.app", "", "RIDE Store", now(), now());
    creator = db.prepare("SELECT * FROM users WHERE email = ?").get("store@ride.app") as Row | undefined;
  }
  const creatorId = creator ? String(creator.id) : "usr-store";

  const stamp = now();
  const insert = db.prepare(
    `INSERT INTO templates (id, creator_id, title, slug, description, category, price_paise, rating, rating_count, version, status, framework, preview_url, download_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '1.0.0', 'published', ?, NULL, ?, ?, ?)`,
  );
  insert.run(
    "tpl-saas-dash", creatorId, "SaaS Dashboard", "saas-dashboard",
    "A complete SaaS admin dashboard with charts, tables, settings and dark mode.", "web", 4900, 4.8, 127,
    "React, Tailwind, Motion", 1850, stamp, stamp,
  );
  insert.run(
    "tpl-portfolio", creatorId, "Portfolio Pro", "portfolio-pro",
    "Modern personal portfolio with smooth scroll animations and a blog section.", "web", 4900, 4.6, 342,
    "React, Tailwind", 4210, stamp, stamp,
  );
  insert.run(
    "tpl-landing", creatorId, "Startup Landing", "startup-landing",
    "Conversion-focused landing page with pricing tables and waitlist.", "web", 2900, 4.5, 810,
    "React, Tailwind, Motion", 9930, stamp, stamp,
  );
  insert.run(
    "tpl-docs", creatorId, "Docs Kit", "docs-kit",
    "Clean documentation site with sidebar navigation and MDX support.", "web", 3500, 4.7, 96,
    "React, MDX, Tailwind", 720, stamp, stamp,
  );
}

export function listPublishedTemplates(category?: string, q?: string): MarketTemplate[] {
  let sql = "SELECT t.*, u.display_name AS creator_name FROM templates t LEFT JOIN users u ON u.id = t.creator_id WHERE t.status = 'published'";
  const params: string[] = [];
  if (category) {
    sql += " AND t.category = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND (t.title LIKE ? OR t.description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY t.rating DESC, t.download_count DESC LIMIT 60";
  return (db.prepare(sql).all(...params) as Row[]).map(templateFromRow);
}

export function listCreatorTemplates(creatorId: string): MarketTemplate[] {
  return (
    db.prepare("SELECT t.*, u.display_name AS creator_name FROM templates t LEFT JOIN users u ON u.id = t.creator_id WHERE t.creator_id = ? ORDER BY t.created_at DESC").all(creatorId) as Row[]
  ).map(templateFromRow);
}

export function listPendingTemplates(): MarketTemplate[] {
  return (
    db.prepare("SELECT t.*, u.display_name AS creator_name FROM templates t LEFT JOIN users u ON u.id = t.creator_id WHERE t.status = 'pending' ORDER BY t.created_at ASC").all() as Row[]
  ).map(templateFromRow);
}

export function getTemplate(id: string): MarketTemplate | null {
  const row = db
    .prepare("SELECT t.*, u.display_name AS creator_name FROM templates t LEFT JOIN users u ON u.id = t.creator_id WHERE t.id = ?")
    .get(id) as Row | undefined;
  return row ? templateFromRow(row) : null;
}

export function getTemplateBySlug(slug: string): MarketTemplate | null {
  const row = db
    .prepare("SELECT t.*, u.display_name AS creator_name FROM templates t LEFT JOIN users u ON u.id = t.creator_id WHERE t.slug = ?")
    .get(slug) as Row | undefined;
  return row ? templateFromRow(row) : null;
}

export async function createTemplate(input: {
  creatorId: string;
  title: string;
  description: string;
  category: string;
  pricePaise: number;
  framework: string;
}): Promise<MarketTemplate | null> {
  void (await import("node:fs/promises"));
  const slugBase = slugify(input.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  const id = genId("tpl");
  const stamp = now();
  db.prepare(
    `INSERT INTO templates (id, creator_id, title, slug, description, category, price_paise, version, status, framework, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, '1.0.0', 'pending', ?, ?, ?)`,
  ).run(id, input.creatorId, input.title, slug, input.description, input.category, input.pricePaise, input.framework, stamp, stamp);
  return getTemplate(id);
}

export async function approveTemplate(id: string, approve: boolean, note = ""): Promise<MarketTemplate | null> {
  db.prepare("UPDATE templates SET status = ?, review_note = ?, updated_at = ? WHERE id = ?").run(
    approve ? "published" : "rejected", note, now(), id,
  );
  return getTemplate(id);
}

export function hasPurchased(userId: string, templateId: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS c FROM purchases WHERE user_id = ? AND template_id = ?").get(userId, templateId) as Row;
  return Number(row.c) > 0;
}

/** Purchase a template → money split (RIDE 30% / creator 70%) + download grant. */
export function purchaseTemplate(userId: string, templateId: string, orderId: string, paidPaise: number, commissionPaise: number): boolean {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM purchases WHERE user_id = ? AND template_id = ?").get(userId, templateId) as Row;
  if (Number(existing.c) > 0) return false;

  const id = genId("pur");
  const stamp = now();
  db.prepare(
    `INSERT INTO purchases (id, user_id, template_id, order_id, price_paise, commission_paise, creator_paise, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, templateId, orderId, paidPaise, commissionPaise, paidPaise - commissionPaise, stamp);

  const tpl = getTemplate(templateId);
  if (tpl) {
    db.prepare("UPDATE templates SET download_count = download_count + 1, updated_at = ? WHERE id = ?").run(stamp, templateId);
    db.prepare(
      "INSERT INTO earnings (id, creator_id, purchase_id, amount_paise, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    ).run(genId("earn"), tpl.creatorId, id, paidPaise - commissionPaise, stamp);
  }
  return true;
}

export function listPurchases(userId: string): Array<{ purchase: Row; template?: MarketTemplate }> {
  const rows = db.prepare("SELECT p.* FROM purchases p WHERE p.user_id = ? ORDER BY p.created_at DESC").all(userId) as Row[];
  return rows.map((purchase) => ({
    purchase,
    template: getTemplate(String(purchase.template_id)) ?? undefined,
  }));
}

export function addReview(userId: string, templateId: string, rating: number, comment: string): void {
  db.prepare("DELETE FROM template_reviews WHERE template_id = ? AND user_id = ?").run(templateId, userId);
  db.prepare(
    "INSERT INTO template_reviews (id, template_id, user_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(genId("rev"), templateId, userId, rating, comment, now());
  const agg = db.prepare(
    "SELECT AVG(rating) AS avg, COUNT(*) AS cnt FROM template_reviews WHERE template_id = ?",
  ).get(templateId) as Row;
  db.prepare("UPDATE templates SET rating = ?, rating_count = ?, updated_at = ? WHERE id = ?").run(
    Number(agg.avg ?? 0), Number(agg.cnt ?? 0), now(), templateId,
  );
}

export function creatorStats(creatorId: string): {
  totalSalesPaise: number;
  commissionPaise: number;
  earningsPaise: number;
  pendingPayoutPaise: number;
  availablePaise: number;
  salesCount: number;
} {
  const sales = db.prepare("SELECT COUNT(*) AS c FROM purchases p JOIN templates t ON t.id = p.template_id WHERE t.creator_id = ?").get(creatorId) as Row;
  const totals = db.prepare(
    "SELECT COALESCE(SUM(p.price_paise), 0) AS total, COALESCE(SUM(p.commission_paise), 0) AS comm, COALESCE(SUM(p.creator_paise), 0) AS creator FROM purchases p JOIN templates t ON t.id = p.template_id WHERE t.creator_id = ?",
  ).get(creatorId) as Row;
  const payouts = db.prepare(
    "SELECT COALESCE(SUM(amount_paise), 0) AS paid FROM payouts WHERE creator_id = ? AND status = 'paid'",
  ).get(creatorId) as Row;
  const pendingPaid = db.prepare(
    "SELECT COALESCE(SUM(amount_paise), 0) AS cr FROM earnings WHERE creator_id = ? AND status = 'paid'",
  ).get(creatorId) as Row;
  void pendingPaid;
  const totalEarnings = Number(totals.creator ?? 0);
  const paid = Number(payouts.paid ?? 0);
  return {
    totalSalesPaise: Number(totals.total ?? 0),
    commissionPaise: Number(totals.comm ?? 0),
    earningsPaise: totalEarnings,
    pendingPayoutPaise: Math.max(0, totalEarnings - paid),
    availablePaise: paid,
    salesCount: Number(sales.c ?? 0),
  };
}

export function requestPayout(creatorId: string, amountPaise: number, method = "account_balance"): boolean {
  if (amountPaise <= 0) return false;
  db.prepare(
    "INSERT INTO payouts (id, creator_id, amount_paise, method, status, created_at) VALUES (?, ?, ?, ?, 'processing', ?)",
  ).run(genId("pay"), creatorId, amountPaise, method, now());
  return true;
}

export function listCreatorPayouts(creatorId: string): Row[] {
  return db.prepare("SELECT * FROM payouts WHERE creator_id = ? ORDER BY created_at DESC").all(creatorId) as Row[];
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "template";
}

/** Owner check helper for creator-only endpoints. */
export function isCreator(user: Row): boolean {
  const role = String(user.role ?? "user");
  return role === "creator" || role === "admin";
}