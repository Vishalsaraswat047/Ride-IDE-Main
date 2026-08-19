import { db, now, type Row } from "./dbenv.js";
import { DAY_MS, dayStart, daysAgo, moneyCompact } from "./helpers.js";
import type { SQLInputValue } from "node:sqlite";

function count(sql: string, ...params: SQLInputValue[]): number {
  const row = db.prepare(sql).get(...params) as Row;
  return Number(row?.c ?? 0);
}

function series(sql: string, since: number, params: SQLInputValue[] = []): Array<{ day: number; value: number }> {
  const rows = db.prepare(sql).all(DAY_MS, DAY_MS, ...params, since) as Row[];
  const byDay = new Map<number, number>();
  for (const r of rows) byDay.set(Number(r.day), Number(r.value));
  const out: Array<{ day: number; value: number }> = [];
  const start = dayStart(29);
  for (let i = 0; i < 30; i++) {
    const day = start + i * DAY_MS;
    out.push({ day, value: byDay.get(day) ?? 0 });
  }
  return out;
}

export function dashboardData(): Record<string, unknown> {
  const today = dayStart();
  const week = daysAgo(7);
  const month = daysAgo(30);

  const ordersCaptured = db.prepare("SELECT * FROM orders WHERE status = 'captured'").all() as Row[];
  const ordersFailed = db.prepare("SELECT * FROM orders WHERE status = 'failed'").all() as Row[];
  const purchases = db.prepare("SELECT * FROM purchases").all() as Row[];
  const pluginPurchases = db.prepare("SELECT * FROM plugin_purchases").all() as Row[];
  const payoutsAll = db.prepare("SELECT * FROM payouts").all() as Row[];

  const deployments = db.prepare("SELECT * FROM deployments").all() as Row[];
  const deployUsers = new Set(deployments.map((d) => String(d.user_id)));

  const revenue = ordersCaptured.reduce((a, o) => a + Number(o.amount_paise), 0);
  const revenueToday = ordersCaptured.filter((o) => Number(o.created_at) >= today).reduce((a, o) => a + Number(o.amount_paise), 0);
  const refunds = db.prepare("SELECT * FROM orders WHERE status = 'refunded'").all() as Row[];

  const gmv = purchases.reduce((a, p) => a + Number(p.price_paise), 0) + pluginPurchases.reduce((a, p) => a + Number(p.price_paise), 0);
  const commission = purchases.reduce((a, p) => a + Number(p.commission_paise), 0) + pluginPurchases.reduce((a, p) => a + Number(p.commission_paise), 0);
  const creatorEarned = purchases.reduce((a, p) => a + Number(p.creator_paise), 0) + pluginPurchases.reduce((a, p) => a + Number(p.creator_paise), 0);

  const activeUserIds = new Set<string>();
  for (const r of db.prepare("SELECT DISTINCT user_id FROM audit_log WHERE action = 'auth.login' AND created_at >= ?").all(daysAgo(30)) as Row[]) {
    if (r.user_id) activeUserIds.add(String(r.user_id));
  }

  return {
    at: now(),
    users: {
      total: count("SELECT COUNT(*) AS c FROM users"),
      newToday: count("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", today),
      newThisWeek: count("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", week),
      newThisMonth: count("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", month),
      active30d: activeUserIds.size,
      active7d: count("SELECT COUNT(DISTINCT user_id) AS c FROM audit_log WHERE action = 'auth.login' AND created_at >= ?", week),
      creators: count("SELECT COUNT(*) AS c FROM users WHERE role IN ('creator', 'admin')"),
      verifiedStudents: count("SELECT COUNT(*) AS c FROM student_verifications WHERE status = 'active'"),
      suspended: count("SELECT COUNT(*) AS c FROM users WHERE role = 'suspended'"),
    },
    logins: {
      total: count("SELECT COUNT(*) AS c FROM audit_log WHERE action = 'auth.login'"),
      today: count("SELECT COUNT(*) AS c FROM audit_log WHERE action = 'auth.login' AND created_at >= ?", today),
      failed: count("SELECT COUNT(*) AS c FROM audit_log WHERE action = 'auth.login.failed'"),
      failedToday: count("SELECT COUNT(*) AS c FROM audit_log WHERE action = 'auth.login.failed' AND created_at >= ?", today),
      dau: count("SELECT COUNT(DISTINCT user_id) AS c FROM audit_log WHERE action = 'auth.login' AND created_at >= ?", today),
      wau: count("SELECT COUNT(DISTINCT user_id) AS c FROM audit_log WHERE action = 'auth.login' AND created_at >= ?", week),
      mau: count("SELECT COUNT(DISTINCT user_id) AS c FROM audit_log WHERE action = 'auth.login' AND created_at >= ?", month),
    },
    projects: {
      total: count("SELECT COUNT(*) AS c FROM team_projects"),
      teamProjects: count("SELECT COUNT(*) AS c FROM team_projects"),
      shipped: deployments.length,
      distinctShippedUsers: deployUsers.size,
    },
    ships: {
      total: deployments.length,
      today: deployments.filter((d) => Number(d.created_at) >= today).length,
      thisWeek: deployments.filter((d) => Number(d.created_at) >= week).length,
      thisMonth: deployments.filter((d) => Number(d.created_at) >= month).length,
      live: deployments.filter((d) => d.status === "live").length,
      failed: deployments.filter((d) => d.status === "failed").length,
      rolledBack: deployments.filter((d) => d.status === "rolled_back").length,
      building: deployments.filter((d) => d.status === "building").length,
    },
    payments: {
      grossRevenue: revenue,
      revenueToday,
      successful: ordersCaptured.length,
      failed: ordersFailed.length,
      refunds: refunds.length,
      refundAmount: refunds.reduce((a, o) => a + Number(o.amount_paise), 0),
      pending: count("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'"),
    },
    marketplace: {
      gmv,
      commission,
      creatorEarned,
      purchases: purchases.length + pluginPurchases.length,
      templates: count("SELECT COUNT(*) AS c FROM templates"),
      templatesPending: count("SELECT COUNT(*) AS c FROM templates WHERE status = 'pending'"),
      plugins: count("SELECT COUNT(*) AS c FROM plugins"),
      pluginsPending: count("SELECT COUNT(*) AS c FROM plugins WHERE status = 'pending'"),
      pendingPayouts: payoutsAll.filter((p) => p.status === "processing").reduce((a, p) => a + Number(p.amount_paise), 0),
      paidOut: payoutsAll.filter((p) => p.status === "paid").reduce((a, p) => a + Number(p.amount_paise), 0),
    },
    deployments: {
      total: deployments.length,
      live: deployments.filter((d) => d.status === "live").length,
      failed: deployments.filter((d) => d.status === "failed").length,
      today: deployments.filter((d) => Number(d.created_at) >= today).length,
      thisMonth: deployments.filter((d) => Number(d.created_at) >= month).length,
    },
    feedback: {
      new: count("SELECT COUNT(*) AS c FROM feedback WHERE status = 'new'"),
      total: count("SELECT COUNT(*) AS c FROM feedback"),
    },
    ai: { available: false },
    releases: {
      total: count("SELECT COUNT(*) AS c FROM releases WHERE status = 'released'"),
      latest: (db.prepare("SELECT * FROM releases WHERE status = 'released' ORDER BY released_at DESC LIMIT 1").get() as Row | undefined) ?? null,
    },
    series: {
      revenue: series("SELECT (created_at / ?) * ? AS day, SUM(amount_paise) AS value FROM orders WHERE status = 'captured' AND created_at >= ? GROUP BY day", daysAgo(30)),
      signups: series("SELECT (created_at / ?) * ? AS day, COUNT(*) AS value FROM users WHERE created_at >= ? GROUP BY day", daysAgo(30)),
      ships: series("SELECT (created_at / ?) * ? AS day, COUNT(*) AS value FROM deployments WHERE created_at >= ? GROUP BY day", daysAgo(30)),
      gmv: series("SELECT (created_at / ?) * ? AS day, SUM(price_paise) AS value FROM purchases WHERE created_at >= ? GROUP BY day", daysAgo(30)),
    },
    recentActivity: (db.prepare("SELECT id, user_id, action, detail, created_at FROM audit_log ORDER BY id DESC LIMIT 12").all() as Row[]).map((a) => ({
      id: Number(a.id),
      action: String(a.action),
      detail: String(a.detail ?? ""),
      userId: a.user_id ? String(a.user_id) : null,
      createdAt: Number(a.created_at),
    })),
  };
}

export function funnelData(): Record<string, unknown> {
  const month = daysAgo(30);
  const signups = count("SELECT COUNT(*) AS c FROM users WHERE created_at >= ?", month);
  const deploymentsAll = db.prepare("SELECT * FROM deployments WHERE created_at >= ?").all(month) as Row[];
  const shipped = deploymentsAll.length;
  const live = deploymentsAll.filter((d) => d.status === "live").length;
  const paid = count("SELECT COUNT(*) AS c FROM orders WHERE status = 'captured' AND created_at >= ?", month);
  const projects = count("SELECT COUNT(*) AS c FROM team_projects WHERE created_at >= ?", month);

  const stage = (label: string, value: number | null, note = ""): Record<string, unknown> => ({ label, value, note });
  const stages = [
    stage("Visitors", null, "Not tracked — website analytics not connected"),
    stage("Signups", signups),
    stage("Projects created", projects, "Server-side project registry not live yet — team projects only"),
    stage("Shipped", shipped),
    stage("Paid", paid),
    stage("Deployed live", live),
  ];
  const steps: Array<Record<string, unknown>> = [];
  const known = stages.map((s) => (typeof s.value === "number" ? Number(s.value) : null)).filter((v) => v !== null) as number[];
  const first = known[0];
  const rates: Array<{ from: string; to: string; rate: number | null }> = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    if (from && to) {
      const f = typeof from.value === "number" ? Number(from.value) : null;
      const t = typeof to.value === "number" ? Number(to.value) : null;
      rates.push({ from: String(from.label), to: String(to.label), rate: f && t ? Math.round((t / f) * 1000) / 10 : null });
    }
  }
  void first;
  void steps;
  return { stages, rates, periodStart: month, generatedAt: now() };
}

export function moneyCompactPaise(paise: number): string {
  return moneyCompact(paise);
}
