import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { db, now, type Row } from "./dbenv.js";
import { verifyPassword } from "@ride/backend/security";
import {
  bootstrapAdmin, createSession, destroySession, currentAdmin, listAdmins, listSessions,
  requireAdmin, setSessionCookie, clearSessionCookie, type Admin,
} from "./auth.js";
import { dashboardData, funnelData } from "./analytics.js";
import {
  listUsers, userDetail, listLogins, studentVerifications, setStudentStatus,
  listFeedback, updateFeedback, submitFeedback,
} from "./people.js";
import { listOrders, orderDetail, refundOrder, planSales, shipments } from "./commerce.js";
import {
  listListings, moderateListing, marketplaceOverview, creatorRows, payoutRows, markPayoutPaid,
} from "./marketplace.js";
import {
  listDeployments, deploymentDetail, projectsOverview, hostingData, domainData,
  releasesList, createRelease, publishRelease, rollbackRelease, downloadsStats, systemHealth, aiUsage,
} from "./operations.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function audit(adminId: string, action: string, detail: string): void {
  db.prepare("INSERT INTO audit_log (user_id, action, detail, ip, created_at) VALUES (?, ?, ?, 'master', ?)").run(adminId, action, detail, now());
}

function adminView(admin: Admin): Record<string, unknown> {
  return { id: admin.id, email: admin.email, name: String(admin.display_name ?? ""), role: admin.role };
}

export async function buildMasterApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
  await app.register(cors, { origin: true, credentials: true });

  const webDir = join(__dirname, "..", "..", "out", "web");
  try {
    await app.register(fastifyStatic, { root: webDir, wildcard: false });
  } catch {
    app.log.warn("Web bundle not found — run `pnpm build` for the SPA");
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  app.post("/api/master/auth/login", async (req, reply) => {
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email) as Row | undefined;
    if (!admin || !verifyPassword(String(body.password ?? ""), String(admin.password_hash))) {
      audit("system", "admin.login.failed", `email=${email}`);
      return reply.code(401).send({ error: "Invalid credentials" });
    }
    const token = createSession(String(admin.id), req.ip ?? "", String(req.headers["user-agent"] ?? ""));
    setSessionCookie(reply, token);
    audit(String(admin.id), "admin.login", `email=${email}`);
    return { admin: adminView(admin as unknown as Admin) };
  });

  app.post("/api/master/auth/logout", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const raw = req.headers.cookie ?? "";
    for (const part of raw.split(";")) {
      const [k, ...rest] = part.trim().split("=");
      if (k === "ride_master" && rest.length) destroySession(decodeURIComponent(rest.join("=")));
    }
    clearSessionCookie(reply);
    audit(admin.id, "admin.logout", `email=${admin.email}`);
    return { ok: true };
  });

  app.get("/api/master/auth/me", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    return { admin: adminView(admin), sessions: listSessions(), admins: listAdmins() };
  });

  // ── Dashboard ───────────────────────────────────────────────────────────
  app.get("/api/master/dashboard", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return dashboardData();
  });

  app.get("/api/master/analytics", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return { ...dashboardData(), funnel: funnelData() };
  });

  // ── People ──────────────────────────────────────────────────────────────
  app.get("/api/master/users", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listUsers(req.query as Record<string, unknown>);
  });

  app.get("/api/master/users/:id", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const detail = userDetail(id);
    if (!detail) return reply.code(404).send({ error: "User not found" });
    return detail;
  });

  app.get("/api/master/logins", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listLogins(req.query as Record<string, unknown>);
  });

  app.get("/api/master/student/verifications", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return studentVerifications(req.query as Record<string, unknown>);
  });

  app.post("/api/master/student/verifications/:userId/:status", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { userId, status } = req.params as { userId: string; status: string };
    if (!["active", "revoked", "expired"].includes(status)) return reply.code(400).send({ error: "Invalid status" });
    const ok = setStudentStatus(admin.id, userId, status);
    if (!ok) return reply.code(404).send({ error: "Verification not found" });
    audit(admin.id, `admin.student.${status}`, `user=${userId}`);
    return { ok: true };
  });

  app.get("/api/master/feedback", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listFeedback(req.query as Record<string, unknown>);
  });

  app.post("/api/master/feedback", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const body = req.body as { email?: string; category?: string; message?: string; priority?: string };
    const id = submitFeedback(adminIdOf(req), String(body.email ?? ""), String(body.category ?? "other"), String(body.message ?? ""), String(body.priority ?? "medium"));
    return { ok: true, id };
  });

  app.post("/api/master/feedback/:id/status", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const body = req.body as { status?: string; priority?: string };
    const ok = updateFeedback(admin.id, id, body.status, body.priority);
    if (!ok) return reply.code(404).send({ error: "Feedback not found" });
    return { ok: true };
  });

  // ── Commerce ────────────────────────────────────────────────────────────
  app.get("/api/master/orders", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listOrders(req.query as Record<string, unknown>);
  });

  app.get("/api/master/orders/:id", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const detail = orderDetail(id);
    if (!detail) return reply.code(404).send({ error: "Order not found" });
    return detail;
  });

  app.post("/api/master/orders/:id/refund", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const ok = refundOrder(admin.id, id);
    if (!ok) return reply.code(400).send({ error: "Order is not refundable" });
    return { ok: true };
  });

  app.get("/api/master/plans", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return planSales();
  });

  app.get("/api/master/shipments", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return shipments();
  });

  // ── Marketplace ─────────────────────────────────────────────────────────
  app.get("/api/master/marketplace/overview", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return marketplaceOverview();
  });

  app.get("/api/master/marketplace/listings", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listListings(req.query as Record<string, unknown>);
  });

  app.post("/api/master/marketplace/listings/:kind/:id/:action", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { kind, id, action } = req.params as { kind: "template" | "plugin"; id: string; action: string };
    if (!["approve", "reject", "suspend", "remove"].includes(action)) return reply.code(400).send({ error: "Invalid action" });
    const ok = moderateListing(admin.id, kind, id, action as "approve" | "reject" | "suspend" | "remove");
    if (!ok) return reply.code(404).send({ error: "Listing not found" });
    audit(admin.id, `admin.marketplace.${action}`, `${kind}=${id}`);
    return { ok: true };
  });

  app.get("/api/master/marketplace/creators", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return creatorRows();
  });

  app.get("/api/master/marketplace/payouts", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return payoutRows();
  });

  app.post("/api/master/marketplace/payouts/:id/paid", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const ok = markPayoutPaid(admin.id, id);
    if (!ok) return reply.code(400).send({ error: "Payout not payable" });
    return { ok: true };
  });

  // ── Operations ──────────────────────────────────────────────────────────
  app.get("/api/master/projects", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return projectsOverview();
  });

  app.get("/api/master/deployments", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return listDeployments(req.query as Record<string, unknown>);
  });

  app.get("/api/master/deployments/:id", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const { id } = req.params as { id: string };
    const detail = deploymentDetail(id);
    if (!detail) return reply.code(404).send({ error: "Deployment not found" });
    return detail;
  });

  app.get("/api/master/hosting", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return hostingData();
  });

  app.get("/api/master/domains", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return domainData();
  });

  app.get("/api/master/releases", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return releasesList();
  });

  app.post("/api/master/releases", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const body = req.body as { version?: string; title?: string; notes?: string };
    const created = createRelease(admin.id, body);
    if (!created) return reply.code(400).send({ error: "Version required" });
    return created;
  });

  app.post("/api/master/releases/:id/publish", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const ok = publishRelease(admin.id, id);
    if (!ok) return reply.code(404).send({ error: "Release not found" });
    return { ok: true };
  });

  app.post("/api/master/releases/:id/rollback", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { id } = req.params as { id: string };
    const ok = rollbackRelease(admin.id, id);
    if (!ok) return reply.code(404).send({ error: "Release not found" });
    return { ok: true };
  });

  app.get("/api/master/downloads", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return downloadsStats();
  });

  app.get("/api/master/health", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return systemHealth();
  });

  app.get("/api/master/ai", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    return aiUsage();
  });

  app.get("/api/master/audit", async (req, reply) => {
    if (!requireAdmin(req, reply)) return;
    const q = String((req.query as Record<string, unknown>).q ?? "").toLowerCase();
    const rows = (db.prepare("SELECT a.*, u.email AS user_email FROM audit_log a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 1000").all() as Row[])
      .filter((a) => !q || String(a.action).toLowerCase().includes(q) || String(a.detail).toLowerCase().includes(q))
      .map((a) => ({
        id: Number(a.id),
        action: String(a.action),
        detail: String(a.detail ?? ""),
        userId: a.user_id ? String(a.user_id) : null,
        userEmail: String(a.user_email ?? ""),
        ip: String(a.ip ?? ""),
        createdAt: Number(a.created_at),
      }));
    return { events: rows };
  });

  app.get("/api/master/settings", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    return {
      admin: adminView(admin),
      admins: listAdmins(),
      sessions: listSessions(),
      gatewayProvider: await (async () => {
        try {
          const { getGateway } = await import("@ride/backend/gateway");
          return getGateway().provider;
        } catch {
          return "unknown";
        }
      })(),
      commissionRate: 0.3,
      dataDir: process.env.RIDE_DATA_DIR ?? "default",
    };
  });

  app.post("/api/master/sessions/:token/revoke", async (req, reply) => {
    const admin = requireAdmin(req, reply);
    if (!admin) return;
    const { token } = req.params as { token: string };
    destroySession(token);
    audit(admin.id, "admin.session.revoke", `token=${token.slice(0, 8)}…`);
    return { ok: true };
  });

  return app;
}

function adminIdOf(req: FastifyRequest): string {
  const admin = currentAdmin(req);
  return admin?.id ?? "system";
}

export async function startMasterServer(): Promise<FastifyInstance> {
  const port = Number(process.env.MASTER_PORT ?? 9000);
  bootstrapAdmin();
  const app = await buildMasterApp();
  await app.listen({ port, host: process.env.MASTER_HOST ?? "127.0.0.1" });
  console.log(`🛡  RIDE Master Panel → http://localhost:${port}`);
  return app;
}

const isMain =
  process.argv[1] &&
  (import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href ||
    import.meta.url.endsWith("index.ts") && Boolean(process.argv[1].endsWith("index.ts")));

if (isMain || process.env.MASTER_START) {
  const app = await startMasterServer();
  app.log.info("RIDE Master Panel started");
}