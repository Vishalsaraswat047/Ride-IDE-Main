import { db, genId, now, type Row } from "./dbenv.js";
import { DAY_MS, fmtTime, pageFrom, sliceRows } from "./helpers.js";

function userType(u: Row, student: Row | undefined, teams: Set<string>): string {
  if (String(u.role) === "creator") return "Creator";
  if (student && String(student.status) === "active") return "Student";
  if (teams.has(String(u.id))) return "Team";
  return "Developer";
}

function userRow(u: Row): Record<string, unknown> {
  const student = db.prepare("SELECT * FROM student_verifications WHERE user_id = ?").get(String(u.id)) as Row | undefined;
  const teamRows = db.prepare("SELECT team_id FROM team_members WHERE user_id = ? AND status = 'active'").all(String(u.id)) as Row[];
  const lastLogin = db.prepare("SELECT MAX(created_at) AS last FROM audit_log WHERE user_id = ? AND action = 'auth.login'").get(String(u.id)) as Row;
  const ships = db.prepare("SELECT COUNT(*) AS c FROM deployments WHERE user_id = ?").get(String(u.id)) as Row;
  const projects = db.prepare("SELECT COUNT(DISTINCT project_id) AS c FROM deployments WHERE user_id = ?").get(String(u.id)) as Row;
  const spent = db.prepare("SELECT COALESCE(SUM(amount_paise), 0) AS s FROM orders WHERE user_id = ? AND status = 'captured'").get(String(u.id)) as Row;
  const orders = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE user_id = ?").get(String(u.id)) as Row;
  const purchases = db.prepare("SELECT COUNT(*) AS c FROM purchases WHERE user_id = ?").get(String(u.id)) as Row;
  const pluginPurchases = db.prepare("SELECT COUNT(*) AS c FROM plugin_purchases WHERE user_id = ?").get(String(u.id)) as Row;
  const uploads = db.prepare("SELECT COUNT(*) AS c FROM templates WHERE creator_id = ?").get(String(u.id)) as Row;

  return {
    id: String(u.id),
    email: String(u.email),
    name: String(u.display_name ?? ""),
    role: String(u.role),
    type: userType(u, student, new Set(teamRows.map((t) => String(t.team_id)))),
    joinedAt: Number(u.created_at),
    lastLoginAt: lastLogin?.last ? Number(lastLogin.last) : null,
    ships: Number(ships.c),
    projects: Number(projects.c),
    spentPaise: Number(spent.s),
    orderCount: Number(orders.c),
    purchases: Number(purchases.c) + Number(pluginPurchases.c),
    uploads: Number(uploads.c),
    studentStatus: student ? String(student.status) : null,
  };
}

export function listUsers(query: Record<string, unknown>): Record<string, unknown> {
  const q = String(query.q ?? "").trim().toLowerCase();
  const type = String(query.type ?? "").toLowerCase();
  const roleFilter = String(query.role ?? "").toLowerCase();
  const { page, pageSize, offset } = pageFrom(query);
  const rows = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as Row[];
  const enriched = rows
    .map(userRow)
    .filter((u) => {
      if (q && !String(u.email).toLowerCase().includes(q) && !String(u.name).toLowerCase().includes(q)) return false;
      if (type && String(u.type).toLowerCase() !== type) return false;
      if (roleFilter && String(u.role) !== roleFilter) return false;
      return true;
    });
  const sliced = sliceRows(enriched, offset, pageSize);
  const totals = {
    all: enriched.length,
    students: enriched.filter((u) => u.type === "Student").length,
    developers: enriched.filter((u) => u.type === "Developer").length,
    teams: enriched.filter((u) => u.type === "Team").length,
    agencies: enriched.filter((u) => u.type === "Agency").length,
    creators: enriched.filter((u) => u.type === "Creator").length,
  };
  return { ...sliced, page, pageSize, totals };
}

export function userDetail(id: string): Record<string, unknown> | null {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
  if (!u) return null;
  const profile = userRow(u);
  const student = db.prepare("SELECT * FROM student_verifications WHERE user_id = ?").get(id) as Row | undefined;
  const institution = student
    ? (db.prepare("SELECT name FROM institutions WHERE id = ?").get(String(student.institution_id)) as Row | undefined)
    : undefined;

  const orders = (db.prepare(
    "SELECT o.*, p.title AS product_title FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 100",
  ).all(id) as Row[]).map((o) => ({
    id: String(o.id),
    product: String(o.product_title ?? o.product_id),
    amountPaise: Number(o.amount_paise),
    taxPaise: Number(o.tax_paise),
    status: String(o.status),
    gateway: String(o.gateway),
    gatewayTxnId: o.gateway_txn_id ? String(o.gateway_txn_id) : null,
    createdAt: Number(o.created_at),
    capturedAt: o.captured_at ? Number(o.captured_at) : null,
  }));

  const deployments = (db.prepare("SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").all(id) as Row[]).map((d) => ({
    id: String(d.id),
    projectId: String(d.project_id),
    projectName: String(d.project_name),
    version: Number(d.version),
    status: String(d.status),
    subdomain: String(d.subdomain),
    url: d.url ? String(d.url) : null,
    createdAt: Number(d.created_at),
  }));

  const purchases = (db.prepare(
    "SELECT pu.*, t.title AS item FROM purchases pu LEFT JOIN templates t ON t.id = pu.template_id WHERE pu.user_id = ? ORDER BY pu.created_at DESC LIMIT 100",
  ).all(id) as Row[]).map((p) => ({
    id: String(p.id),
    item: String(p.item ?? p.template_id),
    pricePaise: Number(p.price_paise),
    createdAt: Number(p.created_at),
  }));
  const pluginPurchases = (db.prepare(
    "SELECT pu.*, p.title AS item FROM plugin_purchases pu LEFT JOIN plugins p ON p.id = pu.plugin_id WHERE pu.user_id = ? ORDER BY pu.created_at DESC LIMIT 100",
  ).all(id) as Row[]).map((p) => ({
    id: String(p.id),
    item: String(p.item ?? p.plugin_id),
    pricePaise: Number(p.price_paise),
    createdAt: Number(p.created_at),
  }));

  const uploads = (db.prepare("SELECT id, title, status, price_paise, created_at FROM templates WHERE creator_id = ? ORDER BY created_at DESC LIMIT 50").all(id) as Row[]).map((t) => ({
    id: String(t.id),
    title: String(t.title),
    status: String(t.status),
    pricePaise: Number(t.price_paise),
    createdAt: Number(t.created_at),
  }));

  const activity = (db.prepare("SELECT action, detail, created_at FROM audit_log WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(id) as Row[]).map((a) => ({
    action: String(a.action),
    detail: String(a.detail ?? ""),
    createdAt: Number(a.created_at),
  }));

  const teams = (db.prepare(
    "SELECT t.name, t.plan, m.role, m.status FROM team_members m JOIN teams t ON t.id = m.team_id WHERE m.user_id = ?",
  ).all(id) as Row[]).map((m) => ({
    name: String(m.name),
    plan: String(m.plan),
    role: String(m.role),
    status: String(m.status),
  }));

  return {
    ...profile,
    student: student
      ? {
          status: String(student.status),
          method: String(student.verification_method),
          institutionEmail: String(student.institution_email ?? ""),
          institution: institution ? String(institution.name) : "",
          verifiedAt: Number(student.verified_at),
          expiresAt: Number(student.expires_at),
        }
      : null,
    orders,
    deployments,
    purchases: [...purchases, ...pluginPurchases],
    uploads,
    activity,
    teams,
  };
}

export function listLogins(query: Record<string, unknown>): Record<string, unknown> {
  const { page, pageSize, offset } = pageFrom(query);
  const rows = db.prepare(
    "SELECT a.*, u.email AS user_email, u.display_name FROM audit_log a LEFT JOIN users u ON u.id = a.user_id WHERE a.action IN ('auth.login', 'auth.login.failed') ORDER BY a.id DESC LIMIT 1000",
  ).all() as Row[];
  const enriched = rows.map((a) => ({
    id: Number(a.id),
    action: String(a.action),
    userId: a.user_id ? String(a.user_id) : null,
    email: String(String(a.detail ?? "").replace(/^email=/, "")),
    name: String(a.display_name ?? ""),
    ip: String(a.ip ?? ""),
    createdAt: Number(a.created_at),
    success: String(a.action) === "auth.login",
  }));
  const sliced = sliceRows(enriched, offset, pageSize);
  return { ...sliced, page, pageSize };
}

export function studentVerifications(query: Record<string, unknown>): Record<string, unknown> {
  const status = String(query.status ?? "");
  const { page, pageSize, offset } = pageFrom(query);
  const rows = (db.prepare(
    "SELECT sv.*, u.email, u.display_name, i.name AS institution_name FROM student_verifications sv JOIN users u ON u.id = sv.user_id LEFT JOIN institutions i ON i.id = sv.institution_id ORDER BY sv.verified_at DESC",
  ).all() as Row[]).filter((r) => !status || String(r.status) === status);
  const counts = {
    active: rows.filter((r) => r.status === "active").length,
    expired: rows.filter((r) => r.status === "expired").length,
    revoked: rows.filter((r) => r.status === "revoked").length,
  };
  const sliced = (sliceRows(rows, offset, pageSize).items as Row[]).map((r) => ({ ...r, id: String(r.user_id) }));
  return { ...sliced, page, pageSize, counts };
}

export function setStudentStatus(adminId: string, userId: string, status: string): boolean {
  const row = db.prepare("SELECT user_id FROM student_verifications WHERE user_id = ?").get(userId) as Row | undefined;
  if (!row) return false;
  db.prepare("UPDATE student_verifications SET status = ?, updated_at = ? WHERE user_id = ?").run(status, now(), userId);
  db.prepare(
    "INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
  ).run(adminId, `admin.student.${status}`, `user=${userId}`, now());
  return true;
}

export function listFeedback(query: Record<string, unknown>): Record<string, unknown> {
  const status = String(query.status ?? "");
  const { page, pageSize, offset } = pageFrom(query);
  const rows = (db.prepare("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 2000").all() as Row[]).filter(
    (r) => !status || String(r.status) === status,
  );
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const s = String(r.status);
    counts[s] = (counts[s] ?? 0) + 1;
  }
  const enriched = rows.map((r) => ({
    id: String(r.id),
    userId: r.user_id ? String(r.user_id) : null,
    email: String(r.email ?? ""),
    category: String(r.category),
    message: String(r.message),
    priority: String(r.priority),
    status: String(r.status),
    createdAt: Number(r.created_at),
  }));
  const sliced = sliceRows(enriched, offset, pageSize);
  return { ...sliced, page, pageSize, counts };
}

export function updateFeedback(adminId: string, id: string, status?: string, priority?: string): boolean {
  const row = db.prepare("SELECT id FROM feedback WHERE id = ?").get(id) as Row | undefined;
  if (!row) return false;
  if (status) db.prepare("UPDATE feedback SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), id);
  if (priority) db.prepare("UPDATE feedback SET priority = ?, updated_at = ? WHERE id = ?").run(priority, now(), id);
  db.prepare(
    "INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)",
  ).run(adminId, `admin.feedback.update`, `feedback=${id}${status ? ` status=${status}` : ""}${priority ? ` priority=${priority}` : ""}`, now());
  return true;
}

export function submitFeedback(userId: string | null, email: string, category: string, message: string, priority = "medium"): string {
  const id = genId("fbk");
  const stamp = now();
  db.prepare(
    "INSERT INTO feedback (id, user_id, email, category, message, priority, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?)",
  ).run(id, userId, email, category, message, priority, stamp, stamp);
  return id;
}
