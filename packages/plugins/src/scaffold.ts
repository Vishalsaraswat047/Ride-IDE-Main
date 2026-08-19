import { getProvider } from "./catalog.js";
import type { PluginInstallation, PluginManifest, ScaffoldFile } from "./schema.js";

/**
 * ─── Scaffold generator ─────────────────────────────────────────────────────
 *
 * Turns an installed + connected plugin into project files the agent can
 * extend rather than reinvent: env template, backend module, webhook route,
 * DB schema, security rules, UI components and a test plan. The generated
 * code is deliberately provider-agnostic where possible — it reads the
 * provider's env vars and uses placeholder logic the agent completes.
 */

export interface ScaffoldOptions {
  /** Project framework — "react" (Vite SPA + Express) or "node". */
  framework?: "react" | "node";
  /** Base dir for server routes, e.g. "server" or "src/server". */
  serverDir?: string;
  /** Base dir for client components. */
  clientDir?: string;
}

export function generateScaffold(manifest: PluginManifest, installation: PluginInstallation, opts?: ScaffoldOptions): ScaffoldFile[] {
  const files: ScaffoldFile[] = [];
  const framework = opts?.framework ?? "react";
  const serverDir = opts?.serverDir ?? (framework === "react" ? "server" : "src");
  const clientDir = opts?.clientDir ?? "src";

  const envFile = buildEnvFile(manifest, installation);
  if (envFile) files.push(envFile);

  const backend = buildBackendModule(manifest, installation, serverDir);
  if (backend) files.push(backend);

  const webhook = buildWebhookRoute(manifest, serverDir);
  if (webhook) files.push(webhook);

  const schema = buildDbSchema(manifest);
  if (schema) files.push(schema);

  const ui = buildUiComponents(manifest, clientDir);
  if (ui) files.push(ui);

  const security = buildSecurityRules(manifest);
  if (security) files.push(security);

  const tests = buildTestPlan(manifest);
  if (tests) files.push(tests);

  return files;
}

// ── env ─────────────────────────────────────────────────────────────────────

function buildEnvFile(manifest: PluginManifest, installation: PluginInstallation): ScaffoldFile | null {
  const lines = new Set<string>();
  for (const conn of installation.connections) {
    const provider = getProvider(conn.providerId);
    if (!provider) continue;
    for (const env of provider.envVars) {
      const isConfigured = conn.configuredFields.includes(env);
      lines.add(`${env}=${isConfigured ? "<configured>" : ""}`);
    }
  }
  // Default to the first provider's env even before connecting, so the agent
  // sees what to ask for.
  if (!lines.size) {
    for (const pid of manifest.providers) {
      const provider = getProvider(pid);
      for (const env of provider?.envVars ?? []) lines.add(`${env}=`);
    }
  }
  if (!lines.size) return null;
  return {
    path: ".env.example",
    content: `# ${manifest.displayName} (${manifest.id}) — RIDE plugin\n${[...lines].sort().join("\n")}\n`,
    overwrite: false,
  };
}

// ── backend module ──────────────────────────────────────────────────────────

function buildBackendModule(manifest: PluginManifest, installation: PluginInstallation, serverDir: string): ScaffoldFile | null {
  const provider = getProvider(installation.connections[0]?.providerId ?? manifest.providers[0] ?? "");
  if (!provider) return null;

  const envReads = provider.envVars.map((e) => `${e}: process.env.${e} ?? ""`).join(",\n    ");
  const guard = provider.envVars.length
    ? `if (!process.env.${provider.envVars[0]}) throw new Error("${manifest.displayName}: missing ${provider.envVars[0]} — add it to .env");`
    : "";

  const categoryLogic: Record<string, string> = {
    payments:
      `export async function createPaymentIntent(order: { id: string; amountPaise: number; currency: string }) {
  // Server-side payment creation ONLY. Never trust client-side status.
  const session = await paymentsProvider.checkout.create({
    amount: order.amountPaise,
    currency: order.currency,
    orderId: order.id,
  });
  return session; // { url | clientSecret | paymentId, status }
}

export async function verifyPayment(paymentId: string): Promise<{ paid: boolean; transactionId: string }> {
  // Always re-verify server-side before granting access.
  return paymentsProvider.verify(paymentId);
}

export async function refundPayment(transactionId: string, amountPaise?: number) {
  return paymentsProvider.refund(transactionId, amountPaise);
}`,
    authentication:
      `export async function signUp(input: { email: string; password: string; name?: string }) {
  const user = await authProvider.signUp(input);
  await sendWelcome(input.email, input.name);
  return user;
}

export async function signIn(input: { email: string; password: string }) {
  return authProvider.signIn(input); // session token
}

export async function requireUser(req: { headers: Record<string, string> }) {
  const session = await authProvider.verifySession(req.headers);
  if (!session) throw new Error("Unauthorized");
  return session.user;
}`,
    database:
      `export const db = databaseProvider.client();

export async function findById<T>(table: string, id: string): Promise<T | null> {
  return db.from(table).where("id", id).first();
}`,
    email:
      `export async function sendMail(input: { to: string; subject: string; html: string; text?: string }) {
  return mailProvider.send(input);
}

export async function sendOtp(to: string): Promise<{ expiresAt: number }> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // Store SHA-256 hash + expiry — never the plaintext code.
  await otpStore.create(to, hash(code), Date.now() + 10 * 60 * 1000);
  await sendMail({ to, subject: "Your verification code", html: \`Your code is <b>\${code}</b>\` });
  return { expiresAt: Date.now() + 10 * 60 * 1000 };
}`,
    storage:
      `export async function createUploadUrl(input: { userId: string; filename: string; contentType: string; size: number }) {
  // Validate type/size BEFORE signing. Never proxy large files through this server.
  const key = \`uploads/\${input.userId}/\${crypto.randomUUID()}-\${input.filename}\`;
  return storageProvider.presignPut(key, { contentType: input.contentType, size: input.size });
}

export async function deleteObject(key: string) {
  return storageProvider.delete(key);
}`,
    ai:
      `export async function aiChat(messages: Array<{ role: "user" | "assistant"; content: string }>, userId: string) {
  // Server-side proxy only — the provider key never ships to the client.
  await usageGuard(userId); // per-user token cap
  return aiProvider.chat(messages);
}`,
    communication:
      `export async function notifyUser(input: { userId: string; template: string; params: Record<string, string> }) {
  // Use pre-approved templates for business-initiated messages.
  return commProvider.sendTemplate(input);
}`,
    analytics:
      `export async function trackEvent(userId: string, event: string, props?: Record<string, unknown>) {
  // Server-side tracking for purchases/signups (webhook path) — never PII as props.
  analyticsProvider.capture(userId, event, props ?? {});
}`,
    maps:
      `export async function geocode(address: string) {
  return mapsProvider.geocode(address);
}`,
    search:
      `export async function searchIndex(documents: Array<Record<string, unknown>>) {
  return searchProvider.index(documents);
}

export async function search(query: string, filters?: Record<string, unknown>) {
  return searchProvider.search(query, filters ?? {});
}`,
    documents:
      `export async function generatePdf(html: string): Promise<Buffer> {
  return documentsProvider.pdf(html);
}`,
    infrastructure:
      `export async function deployProject(input: { dir: string; name: string }) {
  return infraProvider.deploy(input);
}`,
    git:
      `export async function createRepo(input: { name: string; private: boolean }) {
  return gitProvider.createRepo(input);
}

export async function openPullRequest(input: { repo: string; title: string; body: string; head: string }) {
  return gitProvider.createPr(input);
}`,
    crm:
      `export async function createLead(input: { email: string; name?: string; source?: string; data?: Record<string, unknown> }) {
  // Dedupe by email before creating.
  if (await crmProvider.findByEmail(input.email)) return { deduped: true };
  return crmProvider.createContact(input);
}`,
    ecommerce:
      `export async function createOrder(input: { items: Array<{ productId: string; qty: number }>; userId: string }) {
  const order = await db.from("orders").insert(input).returning("*").first();
  await inventoryProvider.reserve(order.id, input.items);
  return order;
}`,
    automation:
      `export async function emit(event: string, payload: Record<string, unknown>) {
  // HMAC-signed outbound webhook with retry; never block the primary flow.
  return webhookBus.emit(event, payload);
}`,
    security:
      `export async function audit(userId: string, action: string, detail?: string) {
  return auditLog.append({ userId, action, detail });
}`,
  };

  const logic = categoryLogic[manifest.category] ?? `export const ${manifest.category}Provider = providers.${manifest.category};`;

  return {
    path: `${serverDir}/plugins/${manifest.id}.ts`,
    overwrite: false,
    content: `// ${manifest.displayName} — generated by RIDE plugin scaffold (${manifest.id})
// Provider: ${provider.name} · env: ${provider.envVars.join(", ") || "none"}
import { ${provider.id.replace(/-/g, "_")}_client as paymentsProvider } from "./providers"; // ← agent: complete this import per the plugin SDK

const ${provider.id.replace(/-/g, "_")}_client = {};

${guard}

${logic}

export default ${provider.id.replace(/-/g, "_")}_client;
`,
  };
}

// ── webhook route ───────────────────────────────────────────────────────────

function buildWebhookRoute(manifest: PluginManifest, serverDir: string): ScaffoldFile | null {
  const hasWebhooks = manifest.providers.some((pid) => getProvider(pid)?.envVars.some((v) => v.toUpperCase().includes("WEBHOOK")));
  if (!hasWebhooks) return null;

  const provider = getProvider(manifest.providers[0] ?? "");
  const secretEnv = provider?.envVars.find((v) => v.toUpperCase().includes("WEBHOOK")) ?? "WEBHOOK_SECRET";
  const eventNames = manifest.category === "payments" ? ["payment.captured", "payment.failed", "refund.completed"] : ["event.created"];

  return {
    path: `${serverDir}/routes/webhooks.${manifest.category}.ts`,
    overwrite: false,
    content: `// ${manifest.displayName} webhook receiver — ALWAYS verify the signature.
import { verifySignature } from "../lib/webhookVerify";

const secret = process.env.${secretEnv} ?? "";

export async function handleWebhook(req: Request, res: Response) {
  const raw = await req.text();
  const ok = verifySignature(raw, req.headers["x-signature"] ?? "", secret);
  if (!ok) return res.status(401).json({ error: "Invalid signature" });

  const event = JSON.parse(raw);
  // Idempotent processing: the provider may redeliver the same event.
  if (await alreadyProcessed(event.id)) return res.status(200).json({ ok: true, deduped: true });

  switch (event.type) {
${eventNames.map((n) => `    case "${n}":\n      await onEvent("${n}", event.data);\n      break;`).join("\n")}
  }
  await markProcessed(event.id);
  res.status(200).json({ ok: true });
}

async function onEvent(type: string, data: unknown) {
  // TODO(agent): update orders/transactions/subscriptions from ${provider?.name ?? "provider"} data.
  void type; void data;
}
`,
  };
}

// ── DB schema ───────────────────────────────────────────────────────────────

function buildDbSchema(manifest: PluginManifest): ScaffoldFile | null {
  const schemas: Record<string, string> = {
    payments: `-- ${manifest.displayName} — transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL,               -- stripe | razorpay | …
  provider_transaction_id TEXT UNIQUE,  -- idempotency key for webhooks
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | captured | failed | refunded
  type TEXT NOT NULL DEFAULT 'payment',    -- payment | subscription | refund
  metadata TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- Subscriptions (recurring billing)
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  provider_subscription_id TEXT UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',  -- active | past_due | cancelled | expired
  current_period_end INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);`,
    authentication: `-- ${manifest.displayName} — sessions + roles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,              -- maps to provider user id
  email TEXT UNIQUE NOT NULL,
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user', -- user | admin | moderator
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  token_hash TEXT NOT NULL,          -- never store raw tokens
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);`,
    database: `-- ${manifest.displayName} — base schema (extend per product)`,
    email: `-- ${manifest.displayName} — otp store
CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,               -- email or phone
  code_hash TEXT NOT NULL,            -- SHA-256, never plaintext
  purpose TEXT NOT NULL DEFAULT 'verify',
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_otps_target ON otps(target);`,
    storage: `-- ${manifest.displayName} — uploads
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  key TEXT NOT NULL,                  -- object key, not a user-supplied path
  content_type TEXT DEFAULT '',
  size_bytes INTEGER DEFAULT 0,
  public INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(user_id);`,
    analytics: `-- ${manifest.displayName} — analytics events (server-side fallback)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event TEXT NOT NULL,
  properties TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event);`,
    communication: `-- ${manifest.displayName} — outbound messages
CREATE TABLE IF NOT EXISTS outbound_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  channel TEXT NOT NULL,              -- whatsapp | sms | email | telegram | discord
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed
  error TEXT,
  created_at INTEGER NOT NULL
);`,
    crm: `-- ${manifest.displayName} — leads
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  source TEXT DEFAULT 'contact_form',
  data TEXT DEFAULT '{}',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);`,
    ecommerce: `-- ${manifest.displayName} — commerce
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  stock INTEGER DEFAULT 0,
  image_key TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | shipped | delivered | cancelled
  total_paise INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  qty INTEGER NOT NULL,
  price_paise INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_paise INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);`,
  };

  const sql = schemas[manifest.category];
  if (!sql) return null;
  return {
    path: `db/migrations/001_${manifest.category}.sql`,
    content: `-- ${manifest.displayName} (${manifest.id}) — generated schema\n${sql}\n`,
    overwrite: false,
  };
}

// ── UI components ───────────────────────────────────────────────────────────

function buildUiComponents(manifest: PluginManifest, clientDir: string): ScaffoldFile | null {
  const ui: Record<string, ScaffoldFile | null> = {
    payments: {
      path: `${clientDir}/components/CheckoutButton.tsx`,
      overwrite: false,
      content: `// Checkout — loading + error states are mandatory.
import { useState } from "react";

export function CheckoutButton({ amountPaise, label = "Pay now" }: { amountPaise: number; label?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState("");

  async function checkout() {
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url; // provider checkout / redirect
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return (
    <div>
      <button onClick={checkout} disabled={state === "loading"} className="btn-primary">
        {state === "loading" ? "Processing…" : label}
      </button>
      {state === "error" && <p className="text-error">{error}</p>}
    </div>
  );
}`,
    },
    authentication: {
      path: `${clientDir}/components/AuthForm.tsx`,
      overwrite: false,
      content: `// Sign-in / sign-up with error + loading states.
import { useState } from "react";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError("");
    try {
      const res = await fetch(\`/api/auth/\${mode}\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Auth failed");
      window.location.reload();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  }

  return (
    <form onSubmit={submit} className="auth-card">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" required />
      <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" required />
      <button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
      </button>
      {state === "error" && <p className="text-error">{error}</p>}
    </form>
  );
}`,
    },
    storage: {
      path: `${clientDir}/components/FileUpload.tsx`,
      overwrite: false,
      content: `// Upload via presigned URL — never proxy large files through the app server.
import { useRef, useState } from "react";

export function FileUpload({ onUploaded }: { onUploaded: (key: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "error">("idle");

  async function onFile(file: File) {
    setState("uploading");
    try {
      const res = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type, size: file.size }),
      });
      const { url, key } = await res.json();
      await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      onUploaded(key);
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <input ref={inputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <button onClick={() => inputRef.current?.click()} disabled={state === "uploading"}>
        {state === "uploading" ? "Uploading…" : "Choose file"}
      </button>
      {state === "error" && <p className="text-error">Upload failed</p>}
    </div>
  );
}`,
    },
  };

  const base = ui[manifest.category];
  if (!base) return null;
  // Success + failure pages for payments (brief section 3).
  if (manifest.category === "payments") {
    return {
      path: `${clientDir}/components/PaymentResult.tsx`,
      overwrite: false,
      content: `// Success / failure pages — always verify status server-side.
export function PaymentResult({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div className={ok ? "payment-success" : "payment-failure"}>
      <h1>{ok ? "Payment successful" : "Payment failed"}</h1>
      <p>{message}</p>
      {!ok && (
        <a href="/checkout" className="btn-primary">
          Try again
        </a>
      )}
    </div>
  );
}`,
    };
  }
  return base;
}

// ── security rules ──────────────────────────────────────────────────────────

function buildSecurityRules(manifest: PluginManifest): ScaffoldFile | null {
  const lines = [
    `# Security rules — ${manifest.displayName} (${manifest.id})`,
    "",
    "## Non-negotiable",
    ...manifest.rules.map((r) => `- ${r.severity === "must-not" ? "NEVER" : r.severity === "must" ? "ALWAYS" : "SHOULD"} ${r.rule}`),
    "",
    "## Keys",
    "- Secret keys live in `.env` only; never in committed files or client bundles.",
    "- Rotate keys on the provider dashboard; verify webhook secrets match.",
  ];
  return {
    path: `docs/security.${manifest.category}.md`,
    overwrite: false,
    content: lines.join("\n") + "\n",
  };
}

// ── test plan ───────────────────────────────────────────────────────────────

function buildTestPlan(manifest: PluginManifest): ScaffoldFile | null {
  return {
    path: `tests/plugins/${manifest.id}.test.ts`,
    overwrite: false,
    content: `// ${manifest.displayName} — generated test plan (vitest)
import { describe, expect, it } from "vitest";

describe("${manifest.displayName}", () => {
  it("rejects missing credentials with a clear error", async () => {
    // TODO(agent): call the plugin module without env set and expect a throw.
    expect(true).toBe(true);
  });

  it("verifies the payment/webhook signature path", async () => {
    // TODO(agent): sign a payload with the test secret, assert acceptance;
    // tamper and assert rejection.
  });

  it("stores the provider transaction id as idempotency key", async () => {
    // TODO(agent): deliver the same event twice, assert one row.
  });
});
`,
  };
}