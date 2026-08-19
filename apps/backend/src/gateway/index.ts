import crypto from "node:crypto";
import { db, Row, genId, now } from "../db.js";

export type GatewayProvider = "mock" | "razorpay" | "stripe" | "cashfree";

export interface PaymentIntent {
  provider: GatewayProvider;
  orderId: string;
  /** ID of the payment on the provider side (or a mock id). */
  paymentId: string;
  /** Client-side payload (e.g. checkout session id / UPI QR reference). */
  checkoutData: Record<string, unknown>;
  totalPaise: number;
  currency: string;
}

export interface PaymentStatus {
  paid: boolean;
  paymentId?: string;
  txnId?: string;
  verifiedAt?: number;
  raw?: Record<string, unknown>;
}

/**
 * Payment gateway contract. The server is the ONLY trusted party: the IDE never
 * reports payment success — it only forwards the provider payment id, and the
 * server asks the gateway whether the payment is actually captured.
 */
export interface PaymentGateway {
  readonly provider: GatewayProvider;
  /** Create a payment intent server-side. The client renders the returned checkout UI. */
  createIntent(opts: { orderId: string; amountPaise: number; currency: string; description: string; customerEmail?: string }): Promise<PaymentIntent>;
  /** Ask the provider for the authoritative payment status. NEVER trust the client. */
  verifyPayment(paymentId: string): Promise<PaymentStatus>;
  /** Signature check of a webhook payload from the provider. */
  verifyWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean;
  refund?(orderId: string, paymentId: string, amountPaise: number): Promise<void>;
}

// ── Mock gateway (default; no keys needed) ──────────────────────────────────

const MOCK_WEBHOOK_SECRET = process.env.RIDE_MOCK_WEBHOOK_SECRET ?? "ride-mock-webhook";

class MockGateway implements PaymentGateway {
  readonly provider: GatewayProvider = "mock";
  private captured = new Map<string, { paid: boolean; txnId: string }>();

  async createIntent(opts: { orderId: string; amountPaise: number; currency: string; description: string; customerEmail?: string }): Promise<PaymentIntent> {
    const paymentId = `mockpay_${crypto.randomBytes(8).toString("hex")}`;
    this.captured.set(paymentId, { paid: false, txnId: "" });
    return {
      provider: "mock",
      orderId: opts.orderId,
      paymentId,
      checkoutData: {
        mode: "simulated",
        message: "Mock gateway: simulated UPI/Card/NetBanking checkout (no real money moves).",
        paymentId,
      },
      totalPaise: opts.amountPaise,
      currency: opts.currency,
    };
  }

  /** Simulate success/failure for testing: /api/mock/pay?paymentId=…&status=success */
  simulate(paymentId: string, paid: boolean): boolean {
    if (!this.captured.has(paymentId)) return false;
    this.captured.set(paymentId, { paid, txnId: paid ? `mocktxn_${crypto.randomBytes(6).toString("hex")}` : "" });
    return true;
  }

  async verifyPayment(paymentId: string): Promise<PaymentStatus> {
    const entry = this.captured.get(paymentId);
    if (!entry) return { paid: false };
    return { paid: entry.paid, paymentId, txnId: entry.txnId || undefined, verifiedAt: now() };
  }

  verifyWebhook(): boolean {
    return true;
  }

  async refund(orderId: string, paymentId: string): Promise<void> {
    this.captured.set(paymentId, { paid: false, txnId: "" });
    void orderId;
  }
}

// ── Razorpay adapter (needs RIDE_RAZORPAY_KEY_ID/SECRET; test mode works too) ─

class RazorpayGateway implements PaymentGateway {
  readonly provider: GatewayProvider = "razorpay";

  async createIntent(opts: { orderId: string; amountPaise: number; currency: string; description: string; customerEmail?: string }): Promise<PaymentIntent> {
    const keyId = process.env.RIDE_RAZORPAY_KEY_ID;
    const secret = process.env.RIDE_RAZORPAY_KEY_SECRET;
    if (!keyId || !secret) throw new Error("Razorpay not configured (set RIDE_RAZORPAY_KEY_ID / RIDE_RAZORPAY_KEY_SECRET)");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: opts.amountPaise,
        currency: opts.currency,
        receipt: opts.orderId,
        notes: { description: opts.description },
      }),
    });
    if (!res.ok) throw new Error(`Razorpay create order failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { id: string; amount: number; currency: string };
    return {
      provider: "razorpay",
      orderId: opts.orderId,
      paymentId: data.id,
      checkoutData: { key: keyId, orderId: data.id, amount: data.amount, currency: data.currency, options: {} },
      totalPaise: data.amount,
      currency: data.currency,
    };
  }

  async verifyPayment(paymentId: string): Promise<PaymentStatus> {
    const keyId = process.env.RIDE_RAZORPAY_KEY_ID;
    const secret = process.env.RIDE_RAZORPAY_KEY_SECRET ?? "";
    try {
      const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}` },
      });
      const data = (await res.json()) as { id?: string; status?: string; order_id?: string };
      const paid = data.status === "captured" || data.status === "authorized";
      return { paid, paymentId: data.id, raw: data as unknown as Record<string, unknown> };
    } catch (err) {
      return { paid: false, raw: { error: err instanceof Error ? err.message : String(err) } };
    }
  }

  verifyWebhook(_rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
    const secret = process.env.RIDE_RAZORPAY_WEBHOOK_SECRET ?? "";
    const signature = (headers["x-razorpay-signature"] ?? "") as string;
    if (!secret || !signature) return false;
    const expected = crypto.createHmac("sha256", secret).update(_rawBody).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async refund(orderId: string, paymentId: string): Promise<void> {
    const keyId = process.env.RIDE_RAZORPAY_KEY_ID ?? "";
    const secret = process.env.RIDE_RAZORPAY_KEY_SECRET ?? "";
    await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}` },
      body: JSON.stringify({ notes: { orderId } }),
    });
  }
}

class StripeGateway implements PaymentGateway {
  readonly provider: GatewayProvider = "stripe";
  async createIntent(): Promise<PaymentIntent> {
    throw new Error("Stripe adapter not configured — set RIDE_STRIPE_SECRET_KEY");
  }
  async verifyPayment(): Promise<PaymentStatus> {
    return { paid: false };
  }
  verifyWebhook(): boolean {
    return false;
  }
}

let activeGateway: PaymentGateway = new MockGateway();

export function getGateway(): PaymentGateway {
  return activeGateway;
}

/** Process-level control for tests and the /api/mock/simulate endpoint. */
export function routeToMock(): void {
  activeGateway = new MockGateway();
}

export interface MockGatewayLike {
  simulate(paymentId: string, paid: boolean): boolean;
  provider: GatewayProvider;
}

export function getMockGateway(): MockGatewayLike | null {
  return activeGateway instanceof MockGateway ? activeGateway : null;
}

// ── Webhook receiver (single endpoint, provider dispatch) ───────────────────

/** Handle a provider webhook → capture/refund the order. */
export async function handleWebhook(body: unknown, provider: string): Promise<{ ok: boolean; error?: string }> {
  const gateway = activeGateway;
  if (!body || typeof body !== "object") return { ok: false, error: "invalid body" };
  // Webhooks carry payment ids in provider-specific shapes.
  let paymentId = "";
  let eventOrderId = "";
  if (provider === "razorpay") {
    const b = body as Record<string, unknown>;
    const payload = (b.payload ?? {}) as Record<string, unknown>;
    const payment = (payload.payment ?? {}) as Record<string, unknown>;
    paymentId = String(payment.id ?? "");
    eventOrderId = String(payment.order_id ?? "");
  } else if (provider === "mock") {
    const b = body as Record<string, unknown>;
    paymentId = String(b.paymentId ?? "");
    eventOrderId = String(b.orderId ?? "");
  }
  if (!paymentId) return { ok: false, error: "no paymentId" };

  const order = db
    .prepare("SELECT * FROM orders WHERE (gateway_payment_id = ? OR payment_id = ?) AND status = 'pending'")
    .get(paymentId, paymentId) as Row | undefined;

  if (order) {
    const status = await gateway.verifyPayment(paymentId);
    captureOrder(String(order.id), status);
  }
  void eventOrderId;
  return { ok: true };
}

export function captureOrder(orderId: string, status: PaymentStatus): void {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as Row | undefined;
  if (!order || order.status !== "pending") return;
  if (!status.paid) return;

  const paidAt = now();
  db.prepare(
    "UPDATE orders SET status = 'captured', gateway_txn_id = ?, payment_id = ?, captured_at = ? WHERE id = ?",
  ).run(status.txnId ?? "", status.paymentId ?? "", paidAt, orderId);

  // invoice
  const number = `RIDE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  db.prepare(
    `INSERT INTO invoices (id, user_id, order_id, number, subtotal_paise, tax_paise, total_paise, currency, status, created_at, paid_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?, ?)`,
  ).run(
    genId("inv"), String(order.user_id), orderId, number,
    Number(order.amount_paise), Number(order.tax_paise), Number(order.amount_paise) + Number(order.tax_paise),
    String(order.currency ?? "INR"), paidAt, paidAt,
  );

  // entitlement
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(String(order.product_id)) as Row | undefined;
  const kind = product ? String(product.kind) : "credits";
  db.prepare(
    "INSERT INTO entitlements (id, user_id, product_id, order_id, kind, granted_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(genId("ent"), String(order.user_id), String(order.product_id), orderId, kind, paidAt, JSON.stringify({
    title: product ? String(product.title) : "Purchase",
  }));

  audit(String(order.user_id), "order.captured", `order=${orderId} txn=${status.txnId ?? ""}`);
}

// ── helpers ────────────────────────────────────────────────────────────────

/** Invoke a webhook handler body against the active gateway. */
export function audit(userId: string | null, action: string, detail = ""): void {
  db.prepare("INSERT INTO audit_log (user_id, action, detail, created_at) VALUES (?, ?, ?, ?)").run(userId, action, detail, now());
}