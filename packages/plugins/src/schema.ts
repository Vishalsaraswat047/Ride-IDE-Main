import { z } from "zod";

/**
 * ─── RIDE Plugin contract ──────────────────────────────────────────────────
 *
 * A plugin is a reusable, tested integration module (Stripe payments, Resend
 * email, Supabase auth…). Unlike a VS Code-style extension, a plugin carries
 * enough knowledge for the RIDE agent to implement the full integration:
 * provider SDKs, authentication, webhooks, DB schema, UI components, security
 * rules, tests and AI instructions.
 *
 * This contract is deliberately SEPARATE from ExtensionManifest — extensions
 * add IDE features; plugins add product capabilities.
 */

// ─── Categories ─────────────────────────────────────────────────────────────

export const PluginCategorySchema = z.enum([
  "payments",
  "authentication",
  "database",
  "email",
  "storage",
  "ai",
  "communication",
  "analytics",
  "maps",
  "search",
  "documents",
  "infrastructure",
  "git",
  "crm",
  "ecommerce",
  "automation",
  "security",
]);
export type PluginCategory = z.infer<typeof PluginCategorySchema>;

export const PLUGIN_CATEGORY_META: Record<PluginCategory, { label: string; description: string }> = {
  payments: { label: "Payments", description: "Checkout, subscriptions, refunds, payment verification and webhooks." },
  authentication: { label: "Authentication", description: "Login, signup, OAuth, sessions, roles and permissions." },
  database: { label: "Database", description: "Schema, migrations, CRUD APIs, validation and seed data." },
  email: { label: "Email", description: "Welcome emails, OTP, invoices, notifications and marketing." },
  storage: { label: "Storage", description: "Images, videos, PDFs and user uploads." },
  ai: { label: "AI", description: "External AI providers, embeddings and local models." },
  communication: { label: "Communication", description: "WhatsApp, SMS and team messaging." },
  analytics: { label: "Analytics", description: "Page views, events, funnels and conversion tracking." },
  maps: { label: "Maps & Location", description: "Maps, geocoding and location for delivery / logistics apps." },
  search: { label: "Search", description: "Full-text product search with filters and sorting." },
  documents: { label: "Documents", description: "PDF generation, OCR, Excel/CSV and document conversion." },
  infrastructure: { label: "Infrastructure", description: "Hosting, DNS and edge deployment." },
  git: { label: "Git & DevOps", description: "Repositories, PRs, CI/CD and automation." },
  crm: { label: "CRM", description: "Leads, contacts and deal pipelines." },
  ecommerce: { label: "E-commerce", description: "Products, cart, orders, inventory, shipping and coupons." },
  automation: { label: "Automation", description: "Zapier, Make, n8n, webhooks and MCP servers." },
  security: { label: "Security", description: "Rate limiting, CAPTCHA, secrets and audit logs." },
};

// ─── Capabilities ───────────────────────────────────────────────────────────

/**
 * Capabilities are the product-language vocabulary shared by the recommender,
 * the agent planner and plugin manifests. Detecting "subscriptions" in a
 * prompt selects the `payments.subscriptions` capability, which in turn maps
 * to payment plugins.
 */
export const PluginCapabilitySchema = z.object({
  id: z.string(),
  label: z.string(),
  category: PluginCategorySchema,
  keywords: z.array(z.string()),
});
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

// ─── Providers ──────────────────────────────────────────────────────────────

export const PluginAuthKindSchema = z.enum(["oauth", "api_key", "none"]);
export type PluginAuthKind = z.infer<typeof PluginAuthKindSchema>;

export const PluginConfigFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "secret", "url", "select"]).default("text"),
  placeholder: z.string().optional(),
  secret: z.boolean().default(false),
  required: z.boolean().default(true),
  options: z.array(z.string()).optional(),
});
export type PluginConfigField = z.infer<typeof PluginConfigFieldSchema>;

/** A concrete service a plugin can connect to (Stripe, Razorpay, Resend…). */
export const PluginProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: PluginCategorySchema,
  auth: z.array(PluginAuthKindSchema).default(["api_key"]),
  /** Environment variables the integration expects (used for scaffold + .env). */
  envVars: z.array(z.string()).default([]),
  /** Extra config the user fills in while connecting. */
  config: z.array(PluginConfigFieldSchema).default([]).optional(),
  /** Region bias — "in" providers are surfaced first for INR prompts. */
  region: z.enum(["intl", "in"]).default("intl").optional(),
  docsUrl: z.string().optional(),
  /** Official RIDE-verified provider (free, supported). */
  official: z.boolean().default(true).optional(),
  notes: z.string().optional(),
});
export type PluginProvider = z.infer<typeof PluginProviderSchema>;

// ─── Manifest ───────────────────────────────────────────────────────────────

export const PluginFileSpecSchema = z.object({
  /** Project-relative path the plugin contributes (e.g. "src/lib/stripe.ts"). */
  path: z.string(),
  kind: z.enum(["sdk", "backend-module", "ui-component", "db-schema", "webhook", "security-rule", "test", "example", "env"]),
  description: z.string().optional(),
});
export type PluginFileSpec = z.infer<typeof PluginFileSpecSchema>;

/** Structured rule the agent must follow when implementing this plugin. */
export const PluginRuleSchema = z.object({
  severity: z.enum(["must", "must-not", "should"]).default("must"),
  rule: z.string(),
});
export type PluginRule = z.infer<typeof PluginRuleSchema>;

export const PluginManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  displayName: z.string(),
  version: z.string(),
  publisher: z.string().default("ride"),
  category: PluginCategorySchema,
  description: z.string(),
  /** Capabilities this plugin fulfills (see PluginCapability). */
  capabilities: z.array(z.string()).default([]),
  /** Provider ids from the catalog this plugin can connect to (e.g. "stripe"). */
  providers: z.array(z.string()).default([]),
  /** Other plugins this one depends on (e.g. payments → database). */
  requires: z.array(z.string()).default([]).optional(),
  /** Price in paise. Official RIDE plugins are free (0). */
  pricePaise: z.number().default(0),
  currency: z.string().default("INR").optional(),
  license: z.string().default("MIT").optional(),
  verified: z.boolean().default(true).optional(),
  /** Files the plugin contributes to the generated project. */
  files: z.array(PluginFileSpecSchema).default([]).optional(),
  /** Hard rules injected into the agent's instructions (section 21 of the brief). */
  rules: z.array(PluginRuleSchema).default([]),
  /** Free-text guidance block fed to the model with the manifest. */
  aiInstructions: z.string().default(""),
  tags: z.array(z.string()).default([]),
});
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// ─── Connections & installations ────────────────────────────────────────────

export const PluginConnectionStatusSchema = z.enum(["pending", "connected", "configured", "failed"]);
export type PluginConnectionStatus = z.infer<typeof PluginConnectionStatusSchema>;

export const PluginConnectionSchema = z.object({
  id: z.string(),
  pluginId: z.string(),
  providerId: z.string(),
  status: PluginConnectionStatusSchema,
  /** Field keys that have been set (values live in the credential store). */
  configuredFields: z.array(z.string()).default([]),
  account: z.string().optional(),
  connectedAt: z.number().optional(),
  lastError: z.string().nullable().default(null),
});
export type PluginConnection = z.infer<typeof PluginConnectionSchema>;

export const PluginInstallationStatusSchema = z.enum(["installed", "active", "disabled"]);
export type PluginInstallationStatus = z.infer<typeof PluginInstallationStatusSchema>;

export const PluginInstallationSchema = z.object({
  id: z.string(),
  manifestId: z.string(),
  version: z.string(),
  status: PluginInstallationStatusSchema,
  connections: z.array(PluginConnectionSchema).default([]),
  installedAt: z.number(),
  updatedAt: z.number(),
  /** Where this came from: "catalog" | "marketplace:<listingId>" */
  source: z.string().default("catalog"),
});
export type PluginInstallation = z.infer<typeof PluginInstallationSchema>;

// ─── Agent integration ──────────────────────────────────────────────────────

/** A plugin recommendation produced from a user prompt (section 23 of the brief). */
export const PluginRecommendationSchema = z.object({
  manifestId: z.string(),
  displayName: z.string(),
  category: PluginCategorySchema,
  reason: z.string(),
  required: z.boolean().default(true),
  alternatives: z.array(z.string()).default([]),
  providers: z.array(z.string()).default([]),
});
export type PluginRecommendation = z.infer<typeof PluginRecommendationSchema>;

/** Full capability analysis of a prompt. */
export const CapabilityAnalysisSchema = z.object({
  capabilities: z.array(PluginCapabilitySchema),
  modules: z.array(z.string()),
  recommendations: z.array(PluginRecommendationSchema),
  /** Concatenated AI instruction block to inject into the agent frame. */
  instructionBlock: z.string(),
});
export type CapabilityAnalysis = z.infer<typeof CapabilityAnalysisSchema>;

// ─── Scaffold output ────────────────────────────────────────────────────────

export const ScaffoldFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  /** true when the file should overwrite an existing project file. */
  overwrite: z.boolean().default(false),
});
export type ScaffoldFile = z.infer<typeof ScaffoldFileSchema>;

/** Steps the install flow reports back to the UI (section 22 of the brief). */
export const PluginInstallStepSchema = z.object({
  step: z.string(),
  ok: z.boolean(),
  detail: z.string().optional(),
});
export type PluginInstallStep = z.infer<typeof PluginInstallStepSchema>;