import { db, Row, genId, now } from "../db.js";

/**
 * Plugin marketplace — mirrors the template marketplace exactly (30% RIDE /
 * 70% creator). Official RIDE plugins seed as free listings; creators submit
 * their own paid plugins for review.
 */

export interface MarketPlugin {
  id: string;
  creatorId: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  manifestId: string;
  pricePaise: number;
  rating: number;
  ratingCount: number;
  version: string;
  status: "pending" | "published" | "rejected";
  reviewNote: string | null;
  tags: string[];
  downloadCount: number;
  createdAt: number;
  updatedAt: number;
  creatorName?: string;
}

function pluginFromRow(row: Row): MarketPlugin {
  let tags: string[] = [];
  try {
    tags = JSON.parse(String(row.tags ?? "[]")) as string[];
  } catch {
    tags = [];
  }
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    category: String(row.category ?? "payments"),
    manifestId: String(row.manifest_id ?? ""),
    pricePaise: Number(row.price_paise),
    rating: Number(row.rating),
    ratingCount: Number(row.rating_count),
    version: String(row.version ?? "1.0.0"),
    status: String(row.status) as MarketPlugin["status"],
    reviewNote: row.review_note == null ? null : String(row.review_note),
    tags,
    downloadCount: Number(row.download_count),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    creatorName: row.creator_name == null ? undefined : String(row.creator_name),
  };
}

/** Official free plugins seeded so the store ships with working integrations. */
const OFFICIAL_SEED: Array<{ title: string; slug: string; description: string; category: string; manifestId: string; tags: string[] }> = [
  { title: "Stripe Payments", slug: "stripe-payments", description: "Checkout, subscriptions, refunds and verified webhooks for Stripe.", category: "payments", manifestId: "ride.payments-stripe", tags: ["payments", "checkout"] },
  { title: "Razorpay Payments", slug: "razorpay-payments", description: "UPI, cards and subscriptions via Razorpay — the INR-first gateway.", category: "payments", manifestId: "ride.payments-razorpay", tags: ["payments", "india", "upi"] },
  { title: "Supabase Auth", slug: "supabase-auth", description: "Email/password, OAuth, sessions, roles and Row Level Security.", category: "authentication", manifestId: "ride.auth-supabase", tags: ["auth", "oauth"] },
  { title: "Clerk Auth", slug: "clerk-auth", description: "Managed auth: email, social login, MFA, sessions and orgs.", category: "authentication", manifestId: "ride.auth-clerk", tags: ["auth", "mfa"] },
  { title: "PostgreSQL", slug: "postgresql", description: "Self/managed Postgres via DATABASE_URL with migrations and CRUD.", category: "database", manifestId: "ride.database-postgres", tags: ["database"] },
  { title: "Resend Email", slug: "resend-email", description: "Welcome emails, OTPs, invoices and order confirmations.", category: "email", manifestId: "ride.email-resend", tags: ["email"] },
  { title: "Cloudflare R2 Storage", slug: "cloudflare-r2", description: "Object storage for images, videos and PDFs with presigned URLs.", category: "storage", manifestId: "ride.storage-r2", tags: ["storage"] },
  { title: "OpenAI", slug: "openai", description: "Chat completions, embeddings and assistants for your product.", category: "ai", manifestId: "ride.ai-openai", tags: ["ai"] },
  { title: "WhatsApp Notifications", slug: "whatsapp-notifications", description: "Order confirmations, OTPs and alerts via WhatsApp Business API.", category: "communication", manifestId: "ride.comm-whatsapp", tags: ["whatsapp"] },
  { title: "PostHog Analytics", slug: "posthog-analytics", description: "Page views, signups, purchases, funnels and feature flags.", category: "analytics", manifestId: "ride.analytics-posthog", tags: ["analytics"] },
  { title: "Meilisearch", slug: "meilisearch", description: "Fast typo-tolerant product search with filters and sorting.", category: "search", manifestId: "ride.search-meilisearch", tags: ["search"] },
  { title: "HubSpot CRM", slug: "hubspot-crm", description: "Create leads from forms, sync contacts and deals.", category: "crm", manifestId: "ride.crm-hubspot", tags: ["crm", "leads"] },
  { title: "Security Core", slug: "security-core", description: "Rate limiting, input validation, security headers, audit log and secrets.", category: "security", manifestId: "ride.security-core", tags: ["security"] },
  { title: "Webhook Automation", slug: "webhook-automation", description: "Pipe product events into Zapier/Make/n8n or outbound HTTP.", category: "automation", manifestId: "ride.automation-webhooks", tags: ["automation", "webhooks"] },
];

export function seedPlugins(): void {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM plugins").get() as Row).c as number;
  if (count > 0) return;

  let creator = db.prepare("SELECT * FROM users WHERE email = ?").get("store@ride.app") as Row | undefined;
  if (!creator) {
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'creator', ?, ?)",
    ).run("usr-store", "store@ride.app", "", "RIDE Store", now(), now());
  }
  const creatorId = "usr-store";
  const stamp = now();
  const insert = db.prepare(
    `INSERT INTO plugins (id, creator_id, title, slug, description, category, manifest_id, price_paise, rating, rating_count, version, status, tags, download_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, '1.0.0', 'published', ?, ?, ?, ?)`,
  );
  OFFICIAL_SEED.forEach((p, i) => {
    insert.run(
      `plg-${p.slug}`, creatorId, p.title, p.slug, p.description, p.category, p.manifestId,
      4.9 - (i % 5) * 0.1, 90 + i * 23, JSON.stringify(p.tags), 200 + i * 47, stamp, stamp,
    );
  });
}

export function listPublishedPlugins(category?: string, q?: string): MarketPlugin[] {
  let sql = "SELECT p.*, u.display_name AS creator_name FROM plugins p LEFT JOIN users u ON u.id = p.creator_id WHERE p.status = 'published'";
  const params: string[] = [];
  if (category && category !== "all") {
    sql += " AND p.category = ?";
    params.push(category);
  }
  if (q) {
    sql += " AND (p.title LIKE ? OR p.description LIKE ?)";
    params.push(`%${q}%`, `%${q}%`);
  }
  sql += " ORDER BY p.download_count DESC LIMIT 80";
  return (db.prepare(sql).all(...params) as Row[]).map(pluginFromRow);
}

export function getPlugin(id: string): MarketPlugin | null {
  const row = db
    .prepare("SELECT p.*, u.display_name AS creator_name FROM plugins p LEFT JOIN users u ON u.id = p.creator_id WHERE p.id = ?")
    .get(id) as Row | undefined;
  return row ? pluginFromRow(row) : null;
}

export function getPluginBySlug(slug: string): MarketPlugin | null {
  const row = db
    .prepare("SELECT p.*, u.display_name AS creator_name FROM plugins p LEFT JOIN users u ON u.id = p.creator_id WHERE p.slug = ?")
    .get(slug) as Row | undefined;
  return row ? pluginFromRow(row) : null;
}

export function listCreatorPlugins(creatorId: string): MarketPlugin[] {
  return (
    db.prepare("SELECT p.*, u.display_name AS creator_name FROM plugins p LEFT JOIN users u ON u.id = p.creator_id WHERE p.creator_id = ? ORDER BY p.created_at DESC").all(creatorId) as Row[]
  ).map(pluginFromRow);
}

export function listPendingPlugins(): MarketPlugin[] {
  return (
    db.prepare("SELECT p.*, u.display_name AS creator_name FROM plugins p LEFT JOIN users u ON u.id = p.creator_id WHERE p.status = 'pending' ORDER BY p.created_at ASC").all() as Row[]
  ).map(pluginFromRow);
}

export function createPlugin(input: {
  creatorId: string;
  title: string;
  description: string;
  category: string;
  manifestId?: string;
  pricePaise: number;
  tags?: string[];
}): MarketPlugin | null {
  const slugBase = slugify(input.title);
  const slug = `${slugBase}-${Date.now().toString(36).slice(-4)}`;
  const id = genId("plg");
  const stamp = now();
  db.prepare(
    `INSERT INTO plugins (id, creator_id, title, slug, description, category, manifest_id, price_paise, version, status, tags, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '1.0.0', 'pending', ?, ?, ?)`,
  ).run(id, input.creatorId, input.title, slug, input.description, input.category, input.manifestId ?? "", input.pricePaise, JSON.stringify(input.tags ?? []), stamp, stamp);
  return getPlugin(id);
}

export function approvePlugin(id: string, approve: boolean, note = ""): MarketPlugin | null {
  db.prepare("UPDATE plugins SET status = ?, review_note = ?, updated_at = ? WHERE id = ?").run(
    approve ? "published" : "rejected", note, now(), id,
  );
  return getPlugin(id);
}

export function hasPurchasedPlugin(userId: string, pluginId: string): boolean {
  const row = db.prepare("SELECT COUNT(*) AS c FROM plugin_purchases WHERE user_id = ? AND plugin_id = ?").get(userId, pluginId) as Row;
  return Number(row.c) > 0;
}

/** Purchase a plugin → RIDE 30% / creator 70% + download grant. */
export function purchasePlugin(userId: string, pluginId: string, orderId: string, paidPaise: number, commissionPaise: number): boolean {
  const existing = db.prepare("SELECT COUNT(*) AS c FROM plugin_purchases WHERE user_id = ? AND plugin_id = ?").get(userId, pluginId) as Row;
  if (Number(existing.c) > 0) return false;

  const id = genId("ppu");
  const stamp = now();
  db.prepare(
    `INSERT INTO plugin_purchases (id, user_id, plugin_id, order_id, price_paise, commission_paise, creator_paise, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, userId, pluginId, orderId, paidPaise, commissionPaise, paidPaise - commissionPaise, stamp);

  const plugin = getPlugin(pluginId);
  if (plugin) {
    db.prepare("UPDATE plugins SET download_count = download_count + 1, updated_at = ? WHERE id = ?").run(stamp, pluginId);
    db.prepare(
      "INSERT INTO earnings (id, creator_id, purchase_id, amount_paise, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
    ).run(genId("earn"), plugin.creatorId, id, paidPaise - commissionPaise, stamp);
  }
  return true;
}

export function listPluginPurchases(userId: string): Array<{ purchase: Row; plugin?: MarketPlugin }> {
  const rows = db.prepare("SELECT p.* FROM plugin_purchases p WHERE p.user_id = ? ORDER BY p.created_at DESC").all(userId) as Row[];
  return rows.map((purchase) => ({
    purchase,
    plugin: getPlugin(String(purchase.plugin_id)) ?? undefined,
  }));
}

export function pluginCreatorStats(creatorId: string): {
  totalSalesPaise: number;
  commissionPaise: number;
  earningsPaise: number;
  salesCount: number;
} {
  const sales = db.prepare("SELECT COUNT(*) AS c FROM plugin_purchases p JOIN plugins t ON t.id = p.plugin_id WHERE t.creator_id = ?").get(creatorId) as Row;
  const totals = db.prepare(
    "SELECT COALESCE(SUM(p.price_paise), 0) AS total, COALESCE(SUM(p.commission_paise), 0) AS comm, COALESCE(SUM(p.creator_paise), 0) AS creator FROM plugin_purchases p JOIN plugins t ON t.id = p.plugin_id WHERE t.creator_id = ?",
  ).get(creatorId) as Row;
  return {
    totalSalesPaise: Number(totals.total ?? 0),
    commissionPaise: Number(totals.comm ?? 0),
    earningsPaise: Number(totals.creator ?? 0),
    salesCount: Number(sales.c ?? 0),
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "plugin";
}