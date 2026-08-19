import { db, genId, now, type Row } from "./dbenv.js";
import { fmtTime, pageFrom, sliceRows } from "./helpers.js";
import { getGateway } from "@ride/backend/gateway";

export function listDeployments(query: Record<string, unknown>): Record<string, unknown> {
  const status = String(query.status ?? "");
  const { page, pageSize, offset } = pageFrom(query);
  const rows = (db.prepare(
    "SELECT d.*, u.email AS user_email FROM deployments d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.created_at DESC LIMIT 5000",
  ).all() as Row[]).filter((d) => !status || String(d.status) === status);
  const enriched = rows.map((d) => ({
    id: String(d.id),
    userId: String(d.user_id),
    email: String(d.user_email ?? ""),
    projectId: String(d.project_id),
    projectName: String(d.project_name),
    version: Number(d.version),
    status: String(d.status),
    subdomain: String(d.subdomain),
    url: d.url ? String(d.url) : null,
    buildSizeBytes: Number(d.build_size_bytes ?? 0),
    createdAt: Number(d.created_at),
    updatedAt: Number(d.updated_at),
  }));
  const sliced = sliceRows(enriched, offset, pageSize);
  const counts = { live: enriched.filter((d) => d.status === "live").length, failed: enriched.filter((d) => d.status === "failed").length, building: enriched.filter((d) => d.status === "building").length, rolledBack: enriched.filter((d) => d.status === "rolled_back").length };
  return { ...sliced, page, pageSize, counts };
}

export function deploymentDetail(id: string): Record<string, unknown> | null {
  const d = db.prepare(
    "SELECT d.*, u.email AS user_email FROM deployments d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?",
  ).get(id) as Row | undefined;
  if (!d) return null;
  const logs = (db.prepare("SELECT level, message, created_at FROM deploy_logs WHERE deployment_id = ? ORDER BY id").all(id) as Row[]).map((l) => ({
    level: String(l.level),
    message: String(l.message),
    createdAt: Number(l.created_at),
  }));
  return {
    id: String(d.id),
    userId: String(d.user_id),
    email: String(d.user_email ?? ""),
    projectId: String(d.project_id),
    projectName: String(d.project_name),
    version: Number(d.version),
    status: String(d.status),
    subdomain: String(d.subdomain),
    url: d.url ? String(d.url) : null,
    buildSizeBytes: Number(d.build_size_bytes ?? 0),
    healthCheck: d.health_check ? String(d.health_check) : null,
    createdAt: Number(d.created_at),
    updatedAt: Number(d.updated_at),
    logs,
  };
}

export function projectsOverview(): Record<string, unknown> {
  const deploys = db.prepare("SELECT * FROM deployments ORDER BY created_at DESC").all() as Row[];
  const teamProjects = db.prepare("SELECT * FROM team_projects ORDER BY created_at DESC LIMIT 500").all() as Row[];
  const byProject = new Map<string, Row[]>();
  for (const d of deploys) {
    const key = String(d.project_id);
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(d);
  }
  const items = [...byProject.entries()].map(([projectId, ds]) => {
    const latest = ds[0];
    const user = db.prepare("SELECT email, display_name FROM users WHERE id = ?").get(String(latest!.user_id)) as Row | undefined;
    return {
      id: projectId,
      projectId,
      name: String(latest!.project_name),
      ownerEmail: String(user?.email ?? ""),
      ownerName: String(user?.display_name ?? ""),
      ships: ds.length,
      live: ds.filter((d) => d.status === "live").length,
      failed: ds.filter((d) => d.status === "failed").length,
      lastShipAt: Number(latest!.created_at),
      status: ds.some((d) => d.status === "live") ? "live" : ds.some((d) => d.status === "failed") ? "error" : "idle",
      source: "deployments",
    };
  });
  return {
    projects: items,
    teamProjects: teamProjects.map((t) => ({
      id: String(t.id),
      name: String(t.name),
      description: String(t.description ?? ""),
      createdAt: Number(t.created_at),
      updatedAt: Number(t.updated_at),
    })),
    note: "RIDE does not sync IDE projects to the server yet — project rows here are derived from shipped deployments + team projects. Framework/dependency tracking unavailable.",
  };
}

export function hostingData(): Record<string, unknown> {
  const deploys = db.prepare("SELECT * FROM deployments").all() as Row[];
  const live = deploys.filter((d) => d.status === "live");
  return {
    activeDeployments: live.length,
    liveSites: live.map((d) => ({ id: String(d.id), subdomain: String(d.subdomain), url: d.url ? String(d.url) : null, project: String(d.project_name), updatedAt: Number(d.updated_at) })),
    hostingerConnections: {
      available: false,
      note: "Hostinger tokens are held in-memory by the backend process. Cross-process connection count is unavailable; the count is shown only by the backend's own /api/hostinger/status. Affiliate tracking not implemented yet — no referral/commission data exists.",
    },
  };
}

export function domainData(): Record<string, unknown> {
  const deploys = db.prepare("SELECT * FROM deployments").all() as Row[];
  const domains = new Map<string, Row[]>();
  for (const d of deploys) {
    const key = String(d.subdomain);
    if (!domains.has(key)) domains.set(key, []);
    domains.get(key)!.push(d);
  }
  return {
    domains: [...domains.entries()].map(([subdomain, ds]) => ({
      id: subdomain,
      subdomain,
      url: ds.find((d) => d.url) ? String(ds.find((d) => d.url)!.url) : null,
      status: ds.some((d) => d.status === "live") ? "live" : "error",
      deployments: ds.length,
      lastActiveAt: Number(ds[0]!.updated_at),
    })),
    note: "Custom domain + DNS/SSL tracking requires Hostinger integration data. Only RIDE subdomains from deployments are listed here.",
  };
}

export function releasesList(): Record<string, unknown> {
  const rows = (db.prepare("SELECT * FROM releases ORDER BY released_at DESC, created_at DESC LIMIT 200").all() as Row[]).map((r) => ({
    id: String(r.id),
    version: String(r.version),
    title: String(r.title),
    notes: String(r.notes),
    status: String(r.status),
    usersAffected: Number(r.users_affected ?? 0),
    releasedAt: r.released_at ? Number(r.released_at) : null,
    createdAt: Number(r.created_at),
  }));
  const adoption = (db.prepare(
    "SELECT r.version, SUM(CASE WHEN u.kind = 'download' THEN u.count ELSE 0 END) AS downloads, SUM(CASE WHEN u.kind = 'install' THEN u.count ELSE 0 END) AS installs, SUM(CASE WHEN u.kind = 'update' THEN u.count ELSE 0 END) AS updates FROM update_stats u JOIN releases r ON r.id = u.release_id GROUP BY r.id ORDER BY r.released_at DESC",
  ).all() as Row[]).map((a) => ({
    version: String(a.version),
    downloads: Number(a.downloads),
    installs: Number(a.installs),
    updates: Number(a.updates),
  }));
  return { releases: rows, adoption };
}

export function createRelease(adminId: string, input: { version?: string; title?: string; notes?: string }): Record<string, unknown> | null {
  const version = String(input.version ?? "").trim();
  if (!version) return null;
  const id = genId("rel");
  db.prepare("INSERT INTO releases (id, version, title, notes, status, created_at) VALUES (?, ?, ?, ?, 'draft', ?)").run(id, version, String(input.title ?? ""), String(input.notes ?? ""), now());
  db.prepare("INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)").run(adminId, "admin.release.create", `version=${version}`, now());
  return { id, version };
}

export function publishRelease(adminId: string, id: string): boolean {
  const r = db.prepare("SELECT * FROM releases WHERE id = ?").get(id) as Row | undefined;
  if (!r) return false;
  db.prepare("UPDATE releases SET status = 'released', released_at = ?, users_affected = (SELECT COUNT(*) FROM users) WHERE id = ?").run(now(), id);
  db.prepare("INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)").run(adminId, "admin.release.publish", `release=${id} version=${String(r.version)}`, now());
  return true;
}

export function rollbackRelease(adminId: string, id: string): boolean {
  const r = db.prepare("SELECT * FROM releases WHERE id = ?").get(id) as Row | undefined;
  if (!r) return false;
  db.prepare("UPDATE releases SET status = 'rolled_back' WHERE id = ?").run(id);
  db.prepare("INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)").run(adminId, "admin.release.rollback", `release=${id} version=${String(r.version)}`, now());
  return true;
}

export function downloadsStats(): Record<string, unknown> {
  const rows = db.prepare(
    "SELECT platform, kind, SUM(count) AS total, MAX(day) AS last_day FROM update_stats GROUP BY platform, kind ORDER BY platform, kind",
  ).all() as Row[];
  const platforms = ["windows", "macos", "linux"];
  return {
    platforms: platforms.map((p) => ({
      platform: p,
      downloads: Number((rows.find((r) => r.platform === p && r.kind === "download") as Row | undefined)?.total ?? 0),
      installs: Number((rows.find((r) => r.platform === p && r.kind === "install") as Row | undefined)?.total ?? 0),
      updates: Number((rows.find((r) => r.platform === p && r.kind === "update") as Row | undefined)?.total ?? 0),
    })),
    note: "No update telemetry is recorded yet — counts stay 0 until the IDE reports version events.",
  };
}

export function recordUpdateStat(releaseId: string, platform: string, kind: string, count = 1): void {
  const day = Math.floor(Date.now() / 86400000);
  const row = db.prepare("SELECT id, count FROM update_stats WHERE release_id = ? AND platform = ? AND kind = ? AND day = ?").get(releaseId, platform, kind, day) as Row | undefined;
  if (row) db.prepare("UPDATE update_stats SET count = count + ? WHERE id = ?").run(count, String(row.id));
  else db.prepare("INSERT INTO update_stats (id, release_id, platform, kind, count, day) VALUES (?, ?, ?, ?, ?, ?)").run(genId("ust"), releaseId, platform, kind, count, day);
}

export function systemHealth(): Record<string, unknown> {
  const checks: Array<{ name: string; status: "ok" | "error" | "unknown"; detail: string }> = [];
  try {
    db.prepare("SELECT 1").get();
    checks.push({ name: "Database", status: "ok", detail: "SQLite reachable" });
  } catch (err) {
    checks.push({ name: "Database", status: "error", detail: err instanceof Error ? err.message : "unreachable" });
  }
  let gatewayProvider = "unknown";
  try {
    gatewayProvider = getGateway().provider;
    checks.push({ name: "Payments", status: "ok", detail: `Gateway: ${gatewayProvider}` });
  } catch (err) {
    checks.push({ name: "Payments", status: "error", detail: err instanceof Error ? err.message : "gateway error" });
  }
  checks.push({ name: "API", status: "ok", detail: "Master panel responding" });
  checks.push({ name: "AI Agent", status: "unknown", detail: "No server-side AI telemetry; agent runs in the desktop app" });
  checks.push({ name: "Deployment", status: "ok", detail: "Local hosting runtime" });
  checks.push({ name: "Marketplace", status: "ok", detail: `${Number(db.prepare("SELECT COUNT(*) AS c FROM templates").get()?.c ?? 0)} templates` });
  checks.push({ name: "Builds", status: "unknown", detail: "Builds run in the IDE locally" });
  const errors = db.prepare("SELECT COUNT(*) AS c FROM audit_log WHERE action LIKE '%failed%' AND created_at >= ?").get(Date.now() - 86400000) as Row;
  return { checks, failedActions24h: Number(errors.c), at: now() };
}

export function aiUsage(): Record<string, unknown> {
  return {
    available: false,
    note: "QUINN runs inside the desktop IDE — no server-side AI usage telemetry exists yet. Token counts, latency and per-model breakdowns will appear here once telemetry is added.",
    requests: null,
    sessions: null,
    tokens: null,
  };
}