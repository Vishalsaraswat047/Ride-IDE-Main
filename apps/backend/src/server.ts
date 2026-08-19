import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { db, Row, genId, now } from "./db.js";
import { hashPassword, verifyPassword, signToken, verifyToken, authLimiter, type Claims } from "./security.js";
import { listProducts, getProduct, seedProducts, computeTax, pricingLadder, seatExamples } from "./catalog.js";
import { regionFor, priceFor } from "./pricing.js";
import {
  seedInstitutions, listInstitutions, findInstitutionByEmail, sendStudentCode, verifyStudentCode,
  verifyCampusCode, verifyWithStudentId, getStudentStatus, revokeStudentStatus, studentDaysRemaining, studentExpiresSoon,
} from "./student.js";
import {
  createTeam, getTeam, getTeamBySlug, listTeamsForUser, updateTeam, deleteTeam,
  listMembers, setMemberRole, suspendMember, reactivateMember, removeMember, transferOwnership,
  createInvitation, getInvitation, getInvitationByToken, listInvitations, revokeInvitation, resendInvitation, acceptInvitation,
  createTeamProject, getTeamProject, listTeamProjects, updateTeamProject, deleteTeamProject,
  createTask, getTask, listTasks, updateTask, deleteTask, TASK_STATUSES,
  addComment, listComments, resolveComment, deleteComment,
  setEnvVar, listEnvVars, deleteEnvVar,
  addAiContext, listAiContext, deleteAiContext,
  listActivity, teamStats, requestDeploymentApproval, decideDeploymentApproval, listDeploymentApprovals,
  projectPricePaise, hasRole, getMembership,
} from "./teams/index.js";
import {
  seedTemplates, listPublishedTemplates, listPendingTemplates, listCreatorTemplates, getTemplate,
  createTemplate, approveTemplate, purchaseTemplate, hasPurchased, listPurchases, addReview,
  creatorStats, requestPayout, listCreatorPayouts, isCreator,
} from "./marketplace/index.js";
import {
  seedPlugins, listPublishedPlugins, listPendingPlugins, listCreatorPlugins, getPlugin,
  createPlugin, approvePlugin, purchasePlugin, hasPurchasedPlugin, listPluginPurchases, pluginCreatorStats,
} from "./plugin-marketplace/index.js";
import { runDeployment, rollbackDeployment, localHosting } from "./deploy/index.js";
import { getGateway, captureOrder, audit, handleWebhook, type MockGatewayLike } from "./gateway/index.js";
import { hostingerService } from "./hostinger.js";

interface AuthUser extends Row {
  id: string;
  email: string;
  display_name: string;
  role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthUser;
    auth?: Claims;
  }
}

const STAGING_ROOT = process.env.RIDE_STAGING_ROOT ?? join(process.cwd(), "data", "staging");

/** Server-side build of products, entitlements, deployments, marketplace. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
  await app.register(cors, { origin: true });
  await mkdir(STAGING_ROOT, { recursive: true });

  seedProducts();
  seedTemplates();
  seedPlugins();
  seedInstitutions();
  localHosting.start();

  app.addHook("onRequest", async (req) => {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      const claims = verifyToken(auth.slice(7));
      if (claims) {
        req.auth = claims;
        const row = db.prepare("SELECT * FROM users WHERE id = ?").get(claims.sub) as Row | undefined;
        if (row) req.user = row as AuthUser;
      }
    }
  });

  app.get("/health", async () => ({ ok: true, service: "ride-backend", at: now() }));

  // ── Auth ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/register", async (req, reply) => {
    const lim = authLimiter.check(req.ip ?? "anon");
    if (!lim.allowed) return reply.code(429).send({ error: `Too many attempts, retry in ${lim.retryAfterSec}s` });
    const body = req.body as { email?: string; password?: string; displayName?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply.code(400).send({ error: "Invalid email" });
    if (password.length < 8) return reply.code(400).send({ error: "Password must be at least 8 characters" });
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as Row | undefined;
    if (existing) return reply.code(409).send({ error: "Account already exists" });

    const id = genId("usr");
    const stamp = now();
    db.prepare(
      "INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES (?, ?, ?, ?, 'user', ?, ?)",
    ).run(id, email, hashPassword(password), String(body.displayName ?? email.split("@")[0] ?? "User"), stamp, stamp);
    audit(id, "auth.register", `email=${email}`);
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Row;
    return { token: signToken({ sub: id, email, role: "user" }), user: publicUser(row) };
  });

  app.post("/api/auth/login", async (req, reply) => {
    const lim = authLimiter.check(req.ip ?? "anon");
    if (!lim.allowed) return reply.code(429).send({ error: `Too many attempts, retry in ${lim.retryAfterSec}s` });
    const body = req.body as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as Row | undefined;
    if (!row || !verifyPassword(String(body.password ?? ""), String(row.password_hash))) {
      audit(null, "auth.login.failed", `email=${email}`);
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    audit(String(row.id), "auth.login", `email=${email}`);
    return { token: signToken({ sub: String(row.id), email, role: String(row.role) }), user: publicUser(row) };
  });

  // dev short-circuit: expose a local account for the IDE to pair with
  app.post("/api/dev/token", async (_req, reply) => {
    if (process.env.NODE_ENV === "production") return reply.code(403).send({ error: "Disabled in production" });
    let row = db.prepare("SELECT * FROM users WHERE email = ?").get("local@ride.app") as Row | undefined;
    if (!row) {
      db.prepare(
        "INSERT INTO users (id, email, password_hash, display_name, role, created_at, updated_at) VALUES ('usr-local', 'local@ride.app', '', 'Local Rider', 'creator', ?, ?)",
      ).run(now(), now());
      row = db.prepare("SELECT * FROM users WHERE email = ?").get("local@ride.app") as Row | undefined;
    }
    return {
      token: signToken({ sub: String(row!.id), email: "local@ride.app", role: String(row!.role) }),
      user: publicUser(row!),
    };
  });

  app.get("/api/me", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    return publicUser(req.user);
  });

  // ── Pricing ──────────────────────────────────────────────────────────────
  app.get("/api/pricing", async (req) => {
    const region = regionFor(req);
    return { region, plans: pricingLadder(region), teamSeats: seatExamples(region) };
  });

  // ── Catalog ───────────────────────────────────────────────────────────────
  app.get("/api/catalog", async () => ({ products: listProducts() }));

  // ── Checkout ──────────────────────────────────────────────────────────────
  app.post("/api/checkout", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { productId?: string };
    const region = regionFor(req);
    let product = getProduct(String(body.productId ?? ""));
    if (!product) return reply.code(404).send({ error: "Unknown product" });

    // Student-aware pricing: verified students ship projects at ₹49 instead of
    // ₹99; international users get the USD price tier. Server decides — the
    // client can never claim a cheaper price by passing a product id.
    if (product.kind === "website_deploy") {
      const student = getStudentStatus(req.user.id);
      if (student.verified) {
        product = getProduct("prod-website-deploy-student") ?? product;
      } else if (region === "intl") {
        product = getProduct("prod-website-deploy-intl") ?? product;
      }
    } else if (product.kind === "app_build" && region === "intl") {
      product = getProduct("prod-app-build-intl") ?? product;
    } else if (product.kind === "team_seat" && region === "intl") {
      product = getProduct("prod-team-seat-intl") ?? product;
    } else if (product.kind === "agency" && region === "intl") {
      product = getProduct("prod-agency-intl") ?? product;
    }

    const gateway = getGateway();
    const orderId = genId("ord");
    db.prepare(
      "INSERT INTO orders (id, user_id, product_id, amount_paise, tax_paise, status, gateway, extra, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, '{}', ?)",
    ).run(orderId, req.user.id, product.id, product.pricePaise, product.taxPaise, String(gateway.provider), now());

    try {
      const intent = await gateway.createIntent({
        orderId,
        amountPaise: product.pricePaise + product.taxPaise,
        currency: product.currency,
        description: `${product.title} — RIDE`,
        customerEmail: req.user.email,
      });
      db.prepare("UPDATE orders SET payment_id = ? WHERE id = ?").run(intent.paymentId, orderId);
      return { orderId, intent };
    } catch (err) {
      db.prepare("UPDATE orders SET status = 'failed' WHERE id = ?").run(orderId);
      return reply.code(502).send({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Verify is the ONLY trusted path: the client reports nothing — the server
  // asks the gateway for the authoritative payment status, then issues the
  // entitlement and starts the deployment service only after that.
  app.post("/api/checkout/verify", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { orderId?: string; paymentId?: string };
    const orderId = String(body.orderId ?? "");
    const paymentId = String(body.paymentId ?? "");
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?").get(orderId, req.user.id) as Row | undefined;
    if (!order) return reply.code(404).send({ error: "Order not found" });

    const gateway = getGateway();
    const status = await gateway.verifyPayment(paymentId || String(order.payment_id ?? ""));
    if (!status.paid) return reply.code(402).send({ error: "Payment not completed" });

    captureOrder(orderId, status);
    const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as Row;
    return {
      order: { id: String(updated.id), status: String(updated.status) },
      entitlement: entitlementFor(String(req.user.id), String(updated.product_id)),
    };
  });

  // Mock gateway simulator (dev/test only)
  app.post("/api/mock/pay", async (req, reply) => {
    const body = req.body as { paymentId?: string; success?: boolean };
    const mock = getGateway() as unknown as MockGatewayLike | null;
    if (!mock || typeof mock.simulate !== "function") {
      return reply.code(400).send({ error: "Mock gateway inactive (set RIDE_GATEWAY=mock)" });
    }
    return mock.simulate(String(body.paymentId ?? ""), body.success !== false)
      ? { ok: true }
      : reply.code(404).send({ error: "Unknown paymentId" });
  });

  // Provider webhook (Razorpay configurable; mock auto)
  app.post("/api/webhooks/payments", async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const provider = String(body.provider ?? "mock");
    const gateway = getGateway();
    if (gateway.provider !== provider && provider !== "mock") {
      return { ok: false };
    }
    if (!gateway.verifyWebhook(JSON.stringify(req.body), req.headers as Record<string, string | string[] | undefined>)) {
      audit(null, "webhook.verify.failed", `provider=${provider}`);
      return reply.code(401).send({ ok: false });
    }
    const result = await handleWebhook(body, provider);
    return result;
  });

  // ── Billing summary (RIDE Wallet / Purchases) ────────────────────────────
  app.get("/api/billing/summary", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const uid = req.user.id;

    const orders = (db.prepare(
      "SELECT o.*, p.title AS product_title FROM orders o LEFT JOIN products p ON p.id = o.product_id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 100",
    ).all(uid) as Row[]).map((o) => ({
      id: String(o.id),
      productId: String(o.product_id),
      productTitle: String(o.product_title ?? o.product_id),
      amountPaise: Number(o.amount_paise),
      taxPaise: Number(o.tax_paise),
      status: String(o.status),
      gatewayTxnId: o.gateway_txn_id ? String(o.gateway_txn_id) : null,
      createdAt: Number(o.created_at),
      paidAt: o.captured_at ? Number(o.captured_at) : null,
    }));

    const entitlements = (db.prepare(
      "SELECT e.*, p.title AS title FROM entitlements e LEFT JOIN products p ON p.id = e.product_id WHERE e.user_id = ? ORDER BY e.granted_at DESC",
    ).all(uid) as Row[]).map((e) => ({
      id: String(e.id),
      kind: String(e.kind),
      title: String(e.title ?? e.kind),
      consumed: Boolean(e.consumed),
      grantedAt: Number(e.granted_at),
    }));

    const invoices = (db.prepare(
      "SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
    ).all(uid) as Row[]).map((i) => ({
      id: String(i.id),
      number: String(i.number),
      subtotalPaise: Number(i.subtotal_paise),
      taxPaise: Number(i.tax_paise),
      totalPaise: Number(i.total_paise),
      status: String(i.status),
      createdAt: Number(i.created_at),
    }));

    const deployments = (db.prepare(
      "SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
    ).all(uid) as Row[]).map((d) => ({
      id: String(d.id),
      projectId: String(d.project_id),
      projectName: String(d.project_name),
      version: Number(d.version),
      status: String(d.status),
      url: d.url ? String(d.url) : null,
      createdAt: Number(d.created_at),
    }));

    return { user: publicUser(req.user), orders, entitlements, invoices, deployments };
  });

  // ── Deployments ───────────────────────────────────────────────────────────
  app.post("/api/deployments", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { projectId?: string; projectName?: string; buildId?: string };
    const entitlement = db.prepare(
      "SELECT * FROM entitlements WHERE user_id = ? AND kind = 'website_deploy' AND consumed = 0 ORDER BY granted_at DESC LIMIT 1",
    ).get(req.user.id) as Row | undefined;
    if (!entitlement) {
      const student = getStudentStatus(req.user.id);
      return reply.code(402).send({
        error: student.verified
          ? "Website deployment requires a ₹49 student deployment credit. Purchase one to continue."
          : "Website deployment requires a ₹99 deployment credit (₹49 for verified students). Purchase one to continue.",
        checkout: true,
        productId: student.verified ? "prod-website-deploy-student" : "prod-website-deploy",
      });
    }

    const projectName = String(body.projectName ?? "site");
    const projectId = String(body.projectId ?? projectName);
    const buildId = String(body.buildId ?? "");
    if (!buildId) return reply.code(400).send({ error: "buildId required (upload build first)" });
    const buildDir = join(STAGING_ROOT, buildId);
    const { stat } = await import("node:fs/promises");
    try {
      const s = await stat(join(buildDir, "index.html"));
      if (!s.isFile()) throw new Error("no index.html");
    } catch {
      return reply.code(400).send({ error: "Build not found or missing index.html in staging" });
    }

    const result = await runDeployment(req.user.id, projectId, projectName, {
      projectName, buildId, buildDir,
    }, {
      subdomain: slugify(projectName),
      entitlementId: String(entitlement.id),
      version: nextVersion(req.user.id, projectId),
    });

    audit(req.user.id, "deploy.create", `project=${projectName}`);
    return { ok: result.status === "live", ...result };
  });

  // Upload a build archive (multi-part-ish JSON map of files) to staging
  app.post("/api/deployments/build", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { files: Record<string, string> };
    const files = body.files ?? {};
    if (!files || Object.keys(files).length === 0) return reply.code(400).send({ error: "No files" });
    const buildId = genId("bld");
    const buildDir = join(STAGING_ROOT, buildId);
    await mkdir(buildDir, { recursive: true });
    const fs = await import("node:fs/promises");
    for (const [rel, content] of Object.entries(files)) {
      const safe = rel.replace(/^\/+/, "").split("/").map((seg) => (seg === ".." ? "" : seg)).filter(Boolean).join("\\");
      if (!safe) continue;
      const dest = join(buildDir, safe);
      await fs.mkdir(dest.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
      await fs.writeFile(dest, content, "utf8");
    }
    return { ok: true, buildId };
  });

  app.get("/api/deployments", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    return listDeployments(req.user.id);
  });

  app.get("/api/deployments/:id/logs", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const dep = db.prepare("SELECT * FROM deployments WHERE id = ? AND user_id = ?").get(id, req.user.id) as Row | undefined;
    if (!dep) return reply.code(404).send({ error: "Deployment not found" });
    return {
      logs: (db.prepare("SELECT level, message, created_at FROM deploy_logs WHERE deployment_id = ? ORDER BY id").all(id) as Row[]).map((l) => ({
        level: String(l.level), message: String(l.message), createdAt: Number(l.created_at),
      })),
    };
  });

  app.post("/api/deployments/:id/rollback", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    return rollbackDeployment(req.user.id, id);
  });

  // ── Template marketplace ──────────────────────────────────────────────────
  app.get("/api/marketplace/templates", async (req) => {
    const q = (req.query as { q?: string }).q;
    const category = (req.query as { category?: string }).category;
    return { templates: listPublishedTemplates(category, q) };
  });

  app.get("/api/marketplace/pending", async (req, reply) => {
    if (!req.user || req.user.role !== "admin") return reply.code(403).send({ error: "Admins only" });
    return { templates: listPendingTemplates() };
  });

  app.get("/api/marketplace/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const tpl = getTemplate(id);
    if (!tpl || tpl.status !== "published") return reply.code(404).send({ error: "Template not found" });
    return tpl;
  });

  app.post("/api/marketplace/templates", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { title?: string; description?: string; category?: string; pricePaise?: number; framework?: string };
    const price = Number(body.pricePaise ?? 0);
    if (price < 0) return reply.code(400).send({ error: "Invalid price" });
    if (!String(body.title ?? "").trim()) return reply.code(400).send({ error: "Title required" });
    const tpl = await createTemplate({
      creatorId: req.user.id,
      title: String(body.title).trim().slice(0, 80),
      description: String(body.description ?? "").slice(0, 2000),
      category: String(body.category ?? "web"),
      pricePaise: price,
      framework: String(body.framework ?? "").slice(0, 60),
    });
    audit(req.user.id, "marketplace.submit", `template=${tpl?.id}`);
    return { template: tpl };
  });

  app.post("/api/marketplace/templates/:id/approve", async (req, reply) => {
    if (!req.user || req.user.role !== "admin") return reply.code(403).send({ error: "Admins only" });
    const { id } = req.params as { id: string };
    const body = req.body as { approve?: boolean; note?: string };
    return { template: await approveTemplate(id, body.approve !== false, String(body.note ?? "")) };
  });

  app.post("/api/marketplace/templates/:id/purchase", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const tpl = getTemplate(id);
    if (!tpl || tpl.status !== "published") return reply.code(404).send({ error: "Template not found" });
    if (tpl.pricePaise === 0) {
      db.prepare(
        "INSERT INTO purchases (id, user_id, template_id, order_id, price_paise, commission_paise, creator_paise, created_at) VALUES (?, ?, ?, 'free', 0, 0, 0, ?)",
      ).run(genId("pur"), req.user.id, tpl.id, now());
      return { ok: true, free: true, templateId: tpl.id };
    }
    if (hasPurchased(req.user.id, tpl.id)) return reply.code(409).send({ error: "Already purchased" });

    const gateway = getGateway();
    const orderId = genId("ord");
    db.prepare(
      "INSERT INTO orders (id, user_id, product_id, amount_paise, tax_paise, status, gateway, extra, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
    ).run(orderId, req.user.id, tpl.id, tpl.pricePaise, computeTax(tpl.pricePaise), String(gateway.provider), JSON.stringify({ templateId: tpl.id }), now());
    const intent = await gateway.createIntent({
      orderId,
      amountPaise: tpl.pricePaise + computeTax(tpl.pricePaise),
      currency: "INR",
      description: `Template: ${tpl.title} — RIDE`,
      customerEmail: req.user.email,
    });
    db.prepare("UPDATE orders SET payment_id = ? WHERE id = ?").run(intent.paymentId, orderId);
    return { orderId, intent, template: tpl };
  });

  app.post("/api/marketplace/templates/:id/confirm", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { orderId?: string; paymentId?: string };
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'").get(String(body.orderId ?? ""), req.user.id) as Row | undefined;
    if (!order) return reply.code(404).send({ error: "Order not found" });
    const gateway = getGateway();
    const status = await gateway.verifyPayment(String(body.paymentId ?? String(order.payment_id ?? "")));
    if (!status.paid) return reply.code(402).send({ error: "Payment not completed" });
    captureOrder(String(order.id), status);
    const tpl = getTemplate(id);
    if (!tpl) return reply.code(404).send({ error: "Template not found" });
    const commission = Math.round(tpl.pricePaise * 0.3);
    purchaseTemplate(req.user.id, tpl.id, String(order.id), tpl.pricePaise, commission);
    audit(req.user.id, "marketplace.purchase", `template=${tpl.id}`);
    return { ok: true, templateId: tpl.id, template: tpl };
  });

  app.post("/api/marketplace/templates/:id/review", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { rating?: number; comment?: string };
    addReview(req.user.id, id, Math.max(1, Math.min(5, Number(body.rating ?? 5))), String(body.comment ?? "").slice(0, 1000));
    return { ok: true };
  });

  app.get("/api/marketplace/my", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    return {
      purchases: listPurchases(req.user.id),
      pluginPurchases: listPluginPurchases(req.user.id),
    };
  });

  // ── Plugin marketplace ─────────────────────────────────────────────────────
  app.get("/api/marketplace/plugins", async (req) => {
    const q = (req.query as { q?: string }).q;
    const category = (req.query as { category?: string }).category;
    return { plugins: listPublishedPlugins(category, q) };
  });

  app.get("/api/marketplace/plugins/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const plugin = getPlugin(id);
    if (!plugin || plugin.status !== "published") return reply.code(404).send({ error: "Plugin not found" });
    return plugin;
  });

  app.post("/api/marketplace/plugins", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { title?: string; description?: string; category?: string; manifestId?: string; pricePaise?: number; tags?: string[] };
    const price = Number(body.pricePaise ?? 0);
    if (price < 0) return reply.code(400).send({ error: "Invalid price" });
    if (!String(body.title ?? "").trim()) return reply.code(400).send({ error: "Title required" });
    const plugin = createPlugin({
      creatorId: req.user.id,
      title: String(body.title).trim().slice(0, 80),
      description: String(body.description ?? "").slice(0, 2000),
      category: String(body.category ?? "payments"),
      manifestId: String(body.manifestId ?? ""),
      pricePaise: price,
      tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [],
    });
    audit(req.user.id, "marketplace.plugin.submit", `plugin=${plugin?.id}`);
    return { plugin };
  });

  app.post("/api/marketplace/plugins/:id/approve", async (req, reply) => {
    if (!req.user || req.user.role !== "admin") return reply.code(403).send({ error: "Admins only" });
    const { id } = req.params as { id: string };
    const body = req.body as { approve?: boolean; note?: string };
    return { plugin: await approvePlugin(id, body.approve !== false, String(body.note ?? "")) };
  });

  app.post("/api/marketplace/plugins/:id/purchase", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const plugin = getPlugin(id);
    if (!plugin || plugin.status !== "published") return reply.code(404).send({ error: "Plugin not found" });
    if (plugin.pricePaise === 0) {
      db.prepare(
        "INSERT INTO plugin_purchases (id, user_id, plugin_id, order_id, price_paise, commission_paise, creator_paise, created_at) VALUES (?, ?, ?, 'free', 0, 0, 0, ?)",
      ).run(genId("ppu"), req.user.id, plugin.id, now());
      return { ok: true, free: true, pluginId: plugin.id };
    }
    if (hasPurchasedPlugin(req.user.id, plugin.id)) return reply.code(409).send({ error: "Already purchased" });

    const gateway = getGateway();
    const orderId = genId("ord");
    db.prepare(
      "INSERT INTO orders (id, user_id, product_id, amount_paise, tax_paise, status, gateway, extra, created_at) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)",
    ).run(orderId, req.user.id, plugin.id, plugin.pricePaise, computeTax(plugin.pricePaise), String(gateway.provider), JSON.stringify({ pluginId: plugin.id }), now());
    const intent = await gateway.createIntent({
      orderId,
      amountPaise: plugin.pricePaise + computeTax(plugin.pricePaise),
      currency: "INR",
      description: `Plugin: ${plugin.title} — RIDE`,
      customerEmail: req.user.email,
    });
    db.prepare("UPDATE orders SET payment_id = ? WHERE id = ?").run(intent.paymentId, orderId);
    return { orderId, intent, plugin };
  });

  app.post("/api/marketplace/plugins/:id/confirm", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { orderId?: string; paymentId?: string };
    const order = db.prepare("SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'pending'").get(String(body.orderId ?? ""), req.user.id) as Row | undefined;
    if (!order) return reply.code(404).send({ error: "Order not found" });
    const gateway = getGateway();
    const status = await gateway.verifyPayment(String(body.paymentId ?? String(order.payment_id ?? "")));
    if (!status.paid) return reply.code(402).send({ error: "Payment not completed" });
    captureOrder(String(order.id), status);
    const plugin = getPlugin(id);
    if (!plugin) return reply.code(404).send({ error: "Plugin not found" });
    const commission = Math.round(plugin.pricePaise * 0.3);
    purchasePlugin(req.user.id, plugin.id, String(order.id), plugin.pricePaise, commission);
    audit(req.user.id, "marketplace.plugin.purchase", `plugin=${plugin.id}`);
    return { ok: true, pluginId: plugin.id, plugin };
  });

  // ── Creator dashboard ─────────────────────────────────────────────────────
  app.get("/api/creator/stats", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    if (!isCreator(req.user)) return reply.code(403).send({ error: "Creator account required" });
    return {
      stats: creatorStats(req.user.id),
      pluginStats: pluginCreatorStats(req.user.id),
      templates: listCreatorTemplates(req.user.id),
      plugins: listCreatorPlugins(req.user.id),
      payouts: listCreatorPayouts(req.user.id),
    };
  });

  app.post("/api/creator/payout", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    if (!isCreator(req.user)) return reply.code(403).send({ error: "Creator account required" });
    const body = req.body as { amountPaise?: number; method?: string };
    const stats = creatorStats(req.user.id);
    const amount = Math.max(0, Number(body.amountPaise ?? stats.pendingPayoutPaise));
    if (amount > stats.pendingPayoutPaise) return reply.code(400).send({ error: "Amount exceeds pending earnings" });
    requestPayout(req.user.id, amount, String(body.method ?? "account_balance"));
    audit(req.user.id, "creator.payout.request", `amount=${amount}`);
    return { ok: true };
  });

  // ── Student verification ────────────────────────────────────────────────
  app.get("/api/student/status", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const status = getStudentStatus(req.user.id);
    return {
      ...status,
      daysRemaining: studentDaysRemaining(req.user.id),
      expiresSoon: studentExpiresSoon(req.user.id),
      reVerifyUrl: "/api/student/status",
    };
  });

  // Institutions database (public list of verified universities, no domains for non-authed)
  app.get("/api/student/institutions", async (req, reply) => {
    const insts = listInstitutions();
    if (!req.user) {
      return { institutions: insts.map((i) => ({ id: i.id, name: i.name, country: i.country, verificationMethod: i.verificationMethod })) };
    }
    return { institutions: insts };
  });

  // Look up which institution owns an email domain (no OTP needed to check)
  app.post("/api/student/lookup", async (req) => {
    const body = req.body as { email?: string };
    const inst = findInstitutionByEmail(String(body.email ?? ""));
    return { institution: inst ? { id: inst.id, name: inst.name, country: inst.country, verificationMethod: inst.verificationMethod } : null };
  });

  // Level 1 — university email: request an OTP
  app.post("/api/student/send-code", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const lim = authLimiter.check(`student:${req.user.id}`);
    if (!lim.allowed) return reply.code(429).send({ error: `Too many attempts, retry in ${lim.retryAfterSec}s` });
    const body = req.body as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return reply.code(400).send({ error: "Invalid email" });
    const result = sendStudentCode(email);
    if (!result.ok) return reply.code(422).send({ error: result.error });
    return { ok: true, institution: result.institution, devCode: process.env.NODE_ENV === "production" ? undefined : result.devCode };
  });

  // Level 1 — verify the OTP → 12 months of student status
  app.post("/api/student/verify-code", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { email?: string; code?: string };
    const result = verifyStudentCode(req.user.id, String(body.email ?? ""), String(body.code ?? ""));
    if (!result.ok) return reply.code(422).send({ error: result.error });
    audit(req.user.id, "student.verified", `method=email`);
    return { ok: true, status: result.status };
  });

  // Level 4 — campus/workshop code + institution email
  app.post("/api/student/campus-code", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const lim = authLimiter.check(`student-campus:${req.user.id}`);
    if (!lim.allowed) return reply.code(429).send({ error: `Too many attempts, retry in ${lim.retryAfterSec}s` });
    const body = req.body as { email?: string; code?: string };
    const result = verifyCampusCode(req.user.id, String(body.email ?? ""), String(body.code ?? ""));
    if (!result.ok) return reply.code(422).send({ error: result.error });
    audit(req.user.id, "student.verified", "method=campus");
    return { ok: true, status: result.status };
  });

  // Level 3 — student ID verification. RIDE does NOT retain the document —
  // only verification metadata (institution, method, dates) is stored.
  app.post("/api/student/verify-id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { institutionId?: string; name?: string; academicYear?: string };
    const result = verifyWithStudentId(req.user.id, String(body.institutionId ?? ""), {
      name: String(body.name ?? ""),
      academicYear: String(body.academicYear ?? ""),
    });
    if (!result.ok) return reply.code(422).send({ error: result.error });
    audit(req.user.id, "student.verified", "method=id");
    return { ok: true, status: result.status };
  });

  // Graduation / voluntary downgrade — projects stay, only pricing changes.
  app.post("/api/student/revoke", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    revokeStudentStatus(req.user.id);
    audit(req.user.id, "student.revoked", "user requested downgrade");
    return { ok: true };
  });

  // ── Teams ────────────────────────────────────────────────────────────────
  app.get("/api/teams", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    return { teams: listTeamsForUser(req.user.id) };
  });

  app.post("/api/teams", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { name?: string; description?: string; plan?: "team" | "agency" };
    try {
      const team = createTeam(req.user.id, { name: body.name ?? "", description: body.description, plan: body.plan });
      audit(req.user.id, "team.created", `team=${team.id}`);
      return { team };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get("/api/teams/:id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const team = getTeam(id);
    if (!team) return reply.code(404).send({ error: "Team not found" });
    const membership = getMembership(id, req.user.id);
    if (!membership || membership.status !== "active") return reply.code(403).send({ error: "Not a member" });
    return { team, membership, stats: teamStats(id) };
  });

  app.patch("/api/teams/:id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const team = getTeam(id);
    if (!team) return reply.code(404).send({ error: "Team not found" });
    if (!hasRole(id, req.user.id, "admin")) return reply.code(403).send({ error: "Admin role required" });
    const body = req.body as { name?: string; description?: string; logoUrl?: string; plan?: "team" | "agency" };
    return { team: updateTeam(id, body) };
  });

  app.delete("/api/teams/:id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const team = getTeam(id);
    if (!team) return reply.code(404).send({ error: "Team not found" });
    if (!hasRole(id, req.user.id, "owner")) return reply.code(403).send({ error: "Owner role required" });
    deleteTeam(id);
    audit(req.user.id, "team.deleted", `team=${id}`);
    return { ok: true };
  });

  // Members
  app.get("/api/teams/:id/members", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    return { members: listMembers(id) };
  });

  app.patch("/api/teams/:id/members/:userId/role", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, userId } = req.params as { id: string; userId: string };
    const body = req.body as { role?: string };
    try {
      return { member: setMemberRole(id, req.user.id, userId, body.role as never) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/members/:userId/suspend", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, userId } = req.params as { id: string; userId: string };
    try {
      return { ok: suspendMember(id, req.user.id, userId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/members/:userId/reactivate", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, userId } = req.params as { id: string; userId: string };
    try {
      return { ok: reactivateMember(id, req.user.id, userId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/members/:userId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, userId } = req.params as { id: string; userId: string };
    try {
      return { ok: removeMember(id, req.user.id, userId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/transfer", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { userId?: string };
    try {
      return { ok: transferOwnership(id, req.user.id, String(body.userId ?? "")) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Invitations
  app.get("/api/teams/:id/invitations", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!hasRole(id, req.user.id, "admin")) return reply.code(403).send({ error: "Admin role required" });
    return { invitations: listInvitations(id) };
  });

  app.post("/api/teams/:id/invitations", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { email?: string; role?: string };
    try {
      const invitation = createInvitation(id, req.user.id, String(body.email ?? ""), (body.role ?? "developer") as never);
      return invitation ? { invitation } : reply.code(404).send({ error: "Team not found" });
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/invitations/:invitationId/revoke", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, invitationId } = req.params as { id: string; invitationId: string };
    try {
      return { ok: revokeInvitation(id, req.user.id, invitationId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/invitations/:invitationId/resend", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, invitationId } = req.params as { id: string; invitationId: string };
    try {
      return { invitation: resendInvitation(id, req.user.id, invitationId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Public accept link: /api/teams/join/:token (auth required — the accepting user is the actor)
  app.post("/api/teams/join/:token", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { token } = req.params as { token: string };
    const result = acceptInvitation(token, req.user.id);
    if (!result.ok) return reply.code(422).send({ error: result.error });
    audit(req.user.id, "team.joined", `team=${result.team?.id}`);
    return { ok: true, team: result.team };
  });

  // Projects
  app.get("/api/teams/:id/projects", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    return { projects: listTeamProjects(id) };
  });

  app.post("/api/teams/:id/projects", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { name?: string; description?: string };
    try {
      return { project: createTeamProject(id, req.user.id, { name: body.name ?? "", description: body.description }) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.patch("/api/teams/:id/projects/:projectId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, projectId } = req.params as { id: string; projectId: string };
    const body = req.body as { name?: string; description?: string };
    try {
      return { project: updateTeamProject(id, req.user.id, projectId, body) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/projects/:projectId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, projectId } = req.params as { id: string; projectId: string };
    try {
      return { ok: deleteTeamProject(id, req.user.id, projectId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Tasks (Kanban)
  app.get("/api/teams/:id/tasks", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    const q = req.query as { projectId?: string; status?: string };
    return { statuses: TASK_STATUSES, tasks: listTasks(id, q.projectId, q.status) };
  });

  app.post("/api/teams/:id/tasks", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as {
      title?: string; description?: string; projectId?: string; assigneeId?: string;
      priority?: string; status?: string; labels?: string[]; milestone?: string; dueDate?: number;
    };
    try {
      return { task: createTask(id, req.user.id, {
        title: body.title ?? "", description: body.description, projectId: body.projectId,
        assigneeId: body.assigneeId, priority: body.priority as never, status: body.status as never,
        labels: body.labels, milestone: body.milestone, dueDate: body.dueDate,
      }) };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.patch("/api/teams/:id/tasks/:taskId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, taskId } = req.params as { id: string; taskId: string };
    const body = req.body as Record<string, unknown>;
    try {
      return { task: updateTask(id, req.user.id, taskId, body) };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/tasks/:taskId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, taskId } = req.params as { id: string; taskId: string };
    try {
      return { ok: deleteTask(id, req.user.id, taskId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Comments / code review
  app.get("/api/teams/:id/comments", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    const q = req.query as { projectId?: string; filePath?: string };
    return { comments: listComments(id, { projectId: q.projectId, filePath: q.filePath, thread: true }) };
  });

  app.post("/api/teams/:id/comments", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { body?: string; projectId?: string; filePath?: string; line?: number; parentId?: string };
    try {
      return { comment: addComment(id, req.user.id, { ...body, body: body.body ?? "" }) };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.patch("/api/teams/:id/comments/:commentId/resolve", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, commentId } = req.params as { id: string; commentId: string };
    const body = req.body as { resolved?: boolean };
    try {
      return { comment: resolveComment(id, req.user.id, commentId, body.resolved !== false) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/comments/:commentId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, commentId } = req.params as { id: string; commentId: string };
    try {
      return { ok: deleteComment(id, req.user.id, commentId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Shared environment variables (secrets stay encrypted; values only revealed to developers)
  app.get("/api/teams/:id/env", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    try {
      const q = req.query as { reveal?: string };
      return { variables: listEnvVars(id, req.user.id, q.reveal === "true") };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/env", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { key?: string; value?: string; env?: string };
    try {
      return { variable: setEnvVar(id, req.user.id, { key: body.key ?? "", value: body.value ?? "", env: body.env as never }) };
    } catch (e) {
      return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/env/:variableId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, variableId } = req.params as { id: string; variableId: string };
    try {
      return { ok: deleteEnvVar(id, req.user.id, variableId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Shared AI context (team memory)
  app.get("/api/teams/:id/ai-context", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    return { notes: listAiContext(id) };
  });

  app.post("/api/teams/:id/ai-context", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { note?: string; kind?: string };
    try {
      return { note: addAiContext(id, req.user.id, { note: body.note ?? "", kind: body.kind }) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete("/api/teams/:id/ai-context/:noteId", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, noteId } = req.params as { id: string; noteId: string };
    try {
      return { ok: deleteAiContext(id, req.user.id, noteId) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Activity feed
  app.get("/api/teams/:id/activity", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    const q = req.query as { limit?: string };
    return { activity: listActivity(id, Math.min(500, Math.max(1, Number(q.limit ?? 100)))) };
  });

  // Deployment approval (2-person approval for production)
  app.get("/api/teams/:id/deploy-approvals", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    if (!getMembership(id, req.user.id)) return reply.code(403).send({ error: "Not a member" });
    return { approvals: listDeploymentApprovals(id) };
  });

  app.post("/api/teams/:id/deploy-approvals", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id } = req.params as { id: string };
    const body = req.body as { projectId?: string };
    try {
      return { approval: requestDeploymentApproval(id, req.user.id, String(body.projectId ?? "project")) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.post("/api/teams/:id/deploy-approvals/:approvalId/decide", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const { id, approvalId } = req.params as { id: string; approvalId: string };
    const body = req.body as { approve?: boolean };
    try {
      return { approval: decideDeploymentApproval(id, req.user.id, approvalId, body.approve !== false) };
    } catch (e) {
      return reply.code(403).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // ── Hostinger My Dashboard ──────────────────────────────────────────────────
  app.post("/api/hostinger/connect", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const body = req.body as { apiToken?: string };
    const token = String(body.apiToken ?? "").trim();
    if (!token) return reply.code(400).send({ error: "API token required" });

    const result = await hostingerService.testConnection(token);
    if (!result.success) {
      return reply.code(401).send({ error: result.error || "Invalid Hostinger API token" });
    }

    hostingerService.setToken(req.user.id, token);
    return { ok: true, connected: true };
  });

  app.post("/api/hostinger/disconnect", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    hostingerService.removeToken(req.user.id);
    return { ok: true, connected: false };
  });

  app.get("/api/hostinger/status", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const connected = hostingerService.hasToken(req.user.id);
    return { connected };
  });

  app.get("/api/hostinger/dashboard", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    try {
      const data = await hostingerService.getFullDashboardData(req.user.id);
      return data;
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch dashboard data" });
    }
  });

  app.get("/api/hostinger/websites", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    try {
      const websites = await hostingerService.getWebsites(req.user.id);
      return { websites };
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch websites" });
    }
  });

  app.get("/api/hostinger/website/:id", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    const { id } = req.params as { id: string };
    try {
      const website = await hostingerService.getWebsiteDetails(req.user.id, id);
      if (!website) return reply.code(404).send({ error: "Website not found" });
      return website;
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch website" });
    }
  });

  app.get("/api/hostinger/website/:id/deployments", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    const { id } = req.params as { id: string };
    try {
      const deployments = await hostingerService.getDeployments(req.user.id, id);
      return { deployments };
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch deployments" });
    }
  });

  app.get("/api/hostinger/website/:id/nodejs-builds", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    const { id } = req.params as { id: string };
    try {
      const builds = await hostingerService.getNodeJSBuilds(req.user.id, id);
      return { builds };
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch Node.js builds" });
    }
  });

  app.get("/api/hostinger/domains", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    try {
      const domains = await hostingerService.getDomains(req.user.id);
      return { domains };
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch domains" });
    }
  });

  app.get("/api/hostinger/dns/:domain", async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: "Not authenticated" });
    const token = hostingerService.getToken(req.user.id);
    if (!token) return reply.code(401).send({ error: "Hostinger not connected" });

    const { domain } = req.params as { domain: string };
    try {
      const zone = await hostingerService.getDNSZone(req.user.id, domain);
      if (!zone) return reply.code(404).send({ error: "DNS zone not found" });
      return zone;
    } catch (error: any) {
      return reply.code(502).send({ error: error?.message || "Failed to fetch DNS zone" });
    }
  });

  return app;
}

function publicUser(row: Row): Record<string, unknown> {
  const userId = String(row.id);
  const student = getStudentStatus(userId);
  return {
    id: userId,
    email: String(row.email),
    displayName: String(row.display_name ?? ""),
    role: String(row.role ?? "user"),
    student: {
      verified: student.verified,
      status: student.status,
      institutionId: student.institutionId,
      institutionName: student.institutionName,
      verificationMethod: student.verificationMethod,
      verifiedAt: student.verifiedAt,
      expiresAt: student.expiresAt,
      daysRemaining: studentDaysRemaining(userId),
      expiresSoon: studentExpiresSoon(userId),
    },
  };
}

function entitlementFor(userId: string, productId: string): unknown {
  const ent = db.prepare("SELECT * FROM entitlements WHERE user_id = ? AND product_id = ? ORDER BY granted_at DESC LIMIT 1").get(userId, productId) as Row | undefined;
  return ent
    ? { id: String(ent.id), kind: String(ent.kind), consumed: Boolean(ent.consumed), grantedAt: Number(ent.granted_at) }
    : null;
}

function nextVersion(userId: string, projectId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM deployments WHERE user_id = ? AND project_id = ?").get(userId, projectId) as Row;
  return Number(row.c) + 1;
}

function listDeployments(userId: string): Array<Record<string, unknown>> {
  return (db.prepare("SELECT * FROM deployments WHERE user_id = ? ORDER BY created_at DESC").all(userId) as Row[]).map((d) => ({
    id: String(d.id),
    projectId: String(d.project_id),
    projectName: String(d.project_name),
    version: Number(d.version),
    status: String(d.status),
    url: d.url ? String(d.url) : null,
    subdomain: String(d.subdomain ?? ""),
    createdAt: Number(d.created_at),
    updatedAt: Number(d.updated_at),
  }));
}

function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "site";
}

// ── CLI entry ────────────────────────────────────────────────────────────────

const isMain =
  process.argv[1] &&
  (import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href ||
    import.meta.url.endsWith("index.ts") && Boolean(process.argv[1].endsWith("index.ts")));

export async function startServer(): Promise<FastifyInstance> {
  const port = Number(process.env.RIDE_PORT ?? 8787);
  const app = await buildApp();
  await app.listen({ port, host: process.env.RIDE_HOST ?? "127.0.0.1" });
  const gateway = getGateway();
  console.log(`🎛  RIDE backend → http://localhost:${port}`);
  console.log(`💳  Gateway: ${gateway.provider}`);
  return app;
}

if (isMain || process.env.RIDE_START) {
  const app = await startServer();
  app.log.info("RIDE backend started");
}