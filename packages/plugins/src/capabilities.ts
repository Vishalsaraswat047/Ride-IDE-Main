import type { PluginCapability, PluginCategory } from "./schema.js";

/**
 * ─── Capability taxonomy ────────────────────────────────────────────────────
 *
 * The shared vocabulary between user prompts, plugin manifests and the agent
 * planner. `detectCapabilities(prompt)` is deterministic keyword matching so
 * the AI recommendation step stays cheap and runs before any LLM call.
 */

export const CAPABILITIES: PluginCapability[] = [
  // payments
  { id: "payments.checkout", label: "Checkout & payments", category: "payments", keywords: ["checkout", "payment", "payments", "pay", "card payment", "upi", "accept payment", "buy now", "pay button", "payment gateway", "collect payment"] },
  { id: "payments.subscriptions", label: "Subscriptions & billing", category: "payments", keywords: ["subscription", "subscriptions", "recurring", "monthly fee", "billing", "membership", "plan", "tier", "renewal", "saas pricing"] },
  { id: "payments.refunds", label: "Refunds", category: "payments", keywords: ["refund", "refunds", "money back", "chargeback"] },
  { id: "payments.wallet", label: "Wallet / credits", category: "payments", keywords: ["wallet", "credits", "top up", "balance", "prepaid", "in-app purchase"] },
  { id: "payments.invoices", label: "Invoices & receipts", category: "payments", keywords: ["invoice", "receipt", "gst", "tax invoice", "billing summary"] },
  // authentication
  { id: "auth.login", label: "Login & signup", category: "authentication", keywords: ["login", "signup", "sign up", "log in", "register", "account", "create an account", "password"] },
  { id: "auth.oauth", label: "Social login (OAuth)", category: "authentication", keywords: ["google login", "google sign in", "oauth", "sign in with google", "sign in with github", "apple login", "social login", "sso", "single sign-on"] },
  { id: "auth.passwordReset", label: "Password reset", category: "authentication", keywords: ["password reset", "forgot password", "reset password", "otp", "verification code", "email verification", "verify email"] },
  { id: "auth.mfa", label: "Two-factor auth", category: "authentication", keywords: ["two-factor", "2fa", "mfa", "authenticator", "totp", "passkey", "biometric"] },
  { id: "auth.rbac", label: "Roles & permissions", category: "authentication", keywords: ["roles", "permissions", "rbac", "admin", "authorization", "access control", "user roles", "privileges", "moderator"] },
  // database
  { id: "database.postgres", label: "PostgreSQL", category: "database", keywords: ["postgres", "postgresql", "neon", "supabase database", "elephantsql"] },
  { id: "database.mysql", label: "MySQL", category: "database", keywords: ["mysql", "mariadb"] },
  { id: "database.mongodb", label: "MongoDB", category: "database", keywords: ["mongodb", "mongo", "document database", "nosql"] },
  { id: "database.sqlite", label: "SQLite", category: "database", keywords: ["sqlite", "better-sqlite3", "embedded database"] },
  { id: "database.orm", label: "ORM / migrations", category: "database", keywords: ["orm", "prisma", "drizzle", "sequelize", "knex", "migration", "schema", "tables", "crud", "models"] },
  { id: "database.managed", label: "Managed database", category: "database", keywords: ["supabase", "firebase database", "planetscale", "turso", "vercel postgres"] },
  // email
  { id: "email.transactional", label: "Transactional email", category: "email", keywords: ["email", "send email", "transactional email", "welcome email", "email template", "newsletter", "mailer", "smtp", "order confirmation", "confirmation email"] },
  { id: "email.otp", label: "OTP / magic links", category: "email", keywords: ["otp", "magic link", "one-time password", "email code", "pin"] },
  { id: "email.marketing", label: "Marketing email", category: "email", keywords: ["marketing email", "campaign", "email blast", "broadcast", "drip campaign"] },
  // storage
  { id: "storage.files", label: "File uploads", category: "storage", keywords: ["upload", "file upload", "profile picture", "profile photo", "avatar", "images", "image upload", "attachments", "file", "video upload", "pdf upload", "media"] },
  { id: "storage.s3", label: "S3-compatible storage", category: "storage", keywords: ["s3", "r2", "object storage", "bucket", "cloudflare r2", "gcs", "google cloud storage"] },
  { id: "storage.cdn", label: "CDN / images", category: "storage", keywords: ["cdn", "image optimization", "resize image", "thumbnail", "cloudinary", "uploadthing"] },
  // ai
  { id: "ai.chat", label: "AI chat / assistant", category: "ai", keywords: ["chatbot", "chat bot", "ai assistant", "chatgpt", "gpt", "llm", "ai chat", "copilot", "assistant", "chat with ai"] },
  { id: "ai.embeddings", label: "Embeddings & RAG", category: "ai", keywords: ["embeddings", "rag", "semantic search", "vector", "retrieval", "knowledge base", "qa bot"] },
  { id: "ai.generation", label: "AI generation", category: "ai", keywords: ["ai generate", "ai writing", "content generation", "ai image", "text generation", "ai summary", "summarize with ai", "translate"] },
  // communication
  { id: "comm.whatsapp", label: "WhatsApp", category: "communication", keywords: ["whatsapp", "wa message", "whatsapp confirmation", "whatsapp notification"] },
  { id: "comm.sms", label: "SMS", category: "communication", keywords: ["sms", "text message", "twilio sms", "send sms"] },
  { id: "comm.push", label: "Push notifications", category: "communication", keywords: ["push notification", "notify", "notification", "alerts", "reminders"] },
  { id: "comm.messaging", label: "Team messaging", category: "communication", keywords: ["discord", "slack", "telegram", "send message to", "webhook to discord", "discord notification"] },
  // analytics
  { id: "analytics.tracking", label: "Analytics", category: "analytics", keywords: ["analytics", "tracking", "page views", "track events", "usage stats", "metrics", "posthog", "mixpanel", "amplitude", "google analytics", "plausible"] },
  { id: "analytics.conversions", label: "Conversion funnels", category: "analytics", keywords: ["funnel", "conversion", "conversion tracking", "signup tracking", "purchase tracking"] },
  // maps
  { id: "maps.geocoding", label: "Maps & geocoding", category: "maps", keywords: ["map", "maps", "location", "geocoding", "address lookup", "store locator", "delivery location", "tracking map", "routes", "directions"] },
  // search
  { id: "search.fulltext", label: "Search", category: "search", keywords: ["search", "product search", "search bar", "filter", "sorting", "find products", "searchable", "typeahead", "autocomplete", "full-text", "algolia", "meilisearch"] },
  // documents
  { id: "documents.pdf", label: "PDF & documents", category: "documents", keywords: ["pdf", "pdf generation", "pdf export", "generate invoice pdf", "excel", "csv export", "import csv", "spreadsheet", "ocr", "scan", "document conversion", "resume pdf"] },
  // infrastructure
  { id: "infra.hosting", label: "Hosting & deploy", category: "infrastructure", keywords: ["deploy", "hosting", "hostinger", "vercel", "netlify", "host", "go live", "publish", "production build", "domain"] },
  { id: "infra.dns", label: "DNS & edge", category: "infrastructure", keywords: ["dns", "cloudflare", "ssl", "custom domain", "cdn"] },
  // git
  { id: "git.repo", label: "GitHub / repos", category: "git", keywords: ["github", "gitlab", "bitbucket", "repository", "repo", "push to github", "pull request", "pr", "git"] },
  { id: "git.cicd", label: "CI/CD", category: "git", keywords: ["ci/cd", "ci cd", "github actions", "pipeline", "automated tests on push", "deploy on push"] },
  // crm
  { id: "crm.leads", label: "CRM & leads", category: "crm", keywords: ["crm", "leads", "lead", "contact form", "capture leads", "hubspot", "salesforce", "zoho", "pipedrive", "deal", "pipeline"] },
  // ecommerce
  { id: "ecommerce.catalog", label: "Products & cart", category: "ecommerce", keywords: ["product catalog", "products", "cart", "add to cart", "shop", "store", "inventory", "stock", "coupons", "discount code", "wishlist"] },
  { id: "ecommerce.orders", label: "Orders & shipping", category: "ecommerce", keywords: ["orders", "order management", "shipping", "shipment", "track order", "shiprocket", "easyship", "fulfilment", "delivery"] },
  // automation
  { id: "automation.webhooks", label: "Webhooks & automation", category: "automation", keywords: ["automation", "automate", "webhook", "zapier", "make.com", "n8n", "integration", "connect to", "when a customer", "when someone", "workflow"] },
  // security
  { id: "security.basic", label: "Security hardening", category: "security", keywords: ["rate limit", "rate limiting", "captcha", "recaptcha", "bot protection", "honeypot", "spam protection", "input validation", "sanitize", "security headers", "audit log", "encryption"] },
];

export function getCapability(id: string): PluginCapability | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}

export function capabilitiesByCategory(category: PluginCategory): PluginCapability[] {
  return CAPABILITIES.filter((c) => c.category === category);
}

/**
 * Deterministic keyword detection. Returns matched capabilities, scored.
 * Multi-word keywords require an exact substring match; short single words
 * match word-boundaries to avoid false positives.
 */
export function detectCapabilities(prompt: string): Array<{ capability: PluginCapability; score: number }> {
  const lower = prompt.toLowerCase();
  const hits: Array<{ capability: PluginCapability; score: number }> = [];
  for (const cap of CAPABILITIES) {
    let score = 0;
    for (const kw of cap.keywords) {
      if (kw.length <= 3) {
        if (new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(lower)) score += 1;
      } else if (lower.includes(kw)) {
        score += kw.length > 12 ? 2 : 1;
      }
    }
    if (score > 0) hits.push({ capability: cap, score });
  }
  return hits.sort((a, b) => b.score - a.score);
}