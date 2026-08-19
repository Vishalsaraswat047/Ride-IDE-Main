import { db, Row } from "./db.js";
import { PLANS, priceFor, teamSeatExamples, type Region } from "./pricing.js";

export interface Product {
  id: string;
  kind: string;
  title: string;
  description: string;
  pricePaise: number;
  taxPaise: number;
  currency: string;
  active: boolean;
  metadata: Record<string, unknown>;
}

const GST_RATE = 0.18;

export function computeTax(amountPaise: number): number {
  return Math.round(amountPaise * GST_RATE);
}

export function productFromRow(row: Row): Product {
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    description: String(row.description),
    pricePaise: Number(row.price_paise),
    taxPaise: Number(row.tax_paise ?? computeTax(Number(row.price_paise))),
    currency: String(row.currency ?? "INR"),
    active: Boolean(row.active),
    metadata: JSON.parse(String(row.metadata ?? "{}")) as Record<string, unknown>,
  };
}

/**
 * Built-in catalog — mirrors the RIDE pricing ladder:
 *
 *   Student   → ₹49/project  (verified university students)
 *   Developer → ₹99/project  (₹99 IN · $2 intl)
 *   Team      → ₹399/seat/mo (₹399 IN · $5 intl, min 2 seats)
 *   Agency    → ₹4,999/mo    (₹4,999 IN · $59 intl)
 *   Enterprise→ custom
 *
 * Build is free. You pay when shipping a project to production/export,
 * or per seat/month for shared team workspaces.
 */
export function seedProducts(): void {
  const count = (db.prepare("SELECT COUNT(*) AS c FROM products").get() as Row).c as number;
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO products (id, kind, title, description, price_paise, tax_paise, currency, active, metadata, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const stamp = Date.now();
  const student = priceFor("student", "in");
  const dev = priceFor("developer", "in");
  const devIntl = priceFor("developer", "intl");
  const seat = priceFor("team", "in");
  const seatIntl = priceFor("team", "intl");
  const agency = priceFor("agency", "in");
  const agencyIntl = priceFor("agency", "intl");

  insert.run("prod-website-deploy", "website_deploy", "Project Deployment — Developer", "Ship this project to a live RIDE subdomain with HTTPS, health checks and logs. Build for free, pay per shipped project.", dev.priceMinor, dev.taxMinor, dev.currency, 1, JSON.stringify({ plan: "developer", period: "project" }), stamp);
  insert.run("prod-website-deploy-student", "website_deploy", "Project Deployment — Student", "Verified student pricing: ship this project to a live RIDE subdomain. Full product experience at half the developer price.", student.priceMinor, student.taxMinor, student.currency, 1, JSON.stringify({ plan: "student", period: "project", requiresStudent: true }), stamp);
  insert.run("prod-website-deploy-intl", "website_deploy", "Project Deployment — International", "Ship this project to a live RIDE subdomain with HTTPS, health checks and logs.", devIntl.priceMinor, devIntl.taxMinor, devIntl.currency, 1, JSON.stringify({ plan: "developer", period: "project", region: "intl" }), stamp);
  insert.run("prod-app-build", "app_build", "App Build (APK/AAB)", "Build this project into a signed Android APK/AAB artifact via the RIDE build service.", 14900, computeTax(14900), "INR", 1, "{}", stamp);
  insert.run("prod-app-build-intl", "app_build", "App Build (APK/AAB) — International", "Build this project into a signed Android APK/AAB artifact via the RIDE build service.", 300, Math.round(300 * GST_RATE), "USD", 1, JSON.stringify({ region: "intl" }), stamp);
  insert.run("prod-team-seat", "team_seat", "Team Seat — 1 seat / month", "Shared RIDE workspace seat: real-time collaboration, shared AI context, tasks, code review and deployment approval. Minimum 2 seats.", seat.priceMinor, seat.taxMinor, seat.currency, 1, JSON.stringify({ plan: "team", period: "seat_month" }), stamp);
  insert.run("prod-team-seat-intl", "team_seat", "Team Seat — 1 seat / month (intl)", "Shared RIDE workspace seat for international teams.", seatIntl.priceMinor, seatIntl.taxMinor, seatIntl.currency, 1, JSON.stringify({ plan: "team", period: "seat_month", region: "intl" }), stamp);
  insert.run("prod-agency", "agency", "Agency Workspace — 1 month", "Agency plan: up to 10 members, multiple client workspaces, white-label, client preview links, deployment management and priority support.", agency.priceMinor, agency.taxMinor, agency.currency, 1, JSON.stringify({ plan: "agency", period: "month" }), stamp);
  insert.run("prod-agency-intl", "agency", "Agency Workspace — 1 month (intl)", "Agency plan for international agencies.", agencyIntl.priceMinor, agencyIntl.taxMinor, agencyIntl.currency, 1, JSON.stringify({ plan: "agency", period: "month", region: "intl" }), stamp);
}

export function listProducts(): Product[] {
  const rows = db.prepare("SELECT * FROM products WHERE active = 1 ORDER BY price_paise ASC").all() as Row[];
  return rows.map(productFromRow);
}

export function getProduct(id: string): Product | null {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(id) as Row | undefined;
  return row ? productFromRow(row) : null;
}

/** The user-facing plan ladder for pricing pages (region-aware). */
export function pricingLadder(region: Region): ReturnType<typeof priceFor>[] {
  return PLANS.map((p) => priceFor(p.kind, region));
}

export function seatExamples(region: Region): Array<{ seats: number; label: string; total: string }> {
  return teamSeatExamples(region);
}

export function money(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}