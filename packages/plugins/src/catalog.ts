import type { PluginManifest, PluginProvider } from "./schema.js";

/**
 * ─── Provider catalog ───────────────────────────────────────────────────────
 *
 * Every service RIDE can connect (section 2–20 of the plugin brief). A
 * provider is pure metadata: env-var conventions, auth mode and config fields.
 * The scaffold generator turns this metadata into real integration code.
 */

export const PROVIDERS: PluginProvider[] = [
  // ── Payments · International ─────────────────────────────────────────────
  { id: "stripe", name: "Stripe", category: "payments", auth: ["oauth", "api_key"], envVars: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"], docsUrl: "https://docs.stripe.com", notes: "Global cards + Apple/Google Pay, subscriptions, Connect." },
  { id: "paypal", name: "PayPal", category: "payments", auth: ["oauth", "api_key"], envVars: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "PAYPAL_WEBHOOK_ID"], docsUrl: "https://developer.paypal.com" },
  { id: "paddle", name: "Paddle", category: "payments", auth: ["api_key"], envVars: ["PADDLE_API_KEY", "PADDLE_WEBHOOK_SECRET"], docsUrl: "https://developer.paddle.com" },
  { id: "lemonsqueezy", name: "Lemon Squeezy", category: "payments", auth: ["api_key"], envVars: ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_WEBHOOK_SECRET"], docsUrl: "https://docs.lemonsqueezy.com" },
  { id: "adyen", name: "Adyen", category: "payments", auth: ["api_key"], envVars: ["ADYEN_API_KEY", "ADYEN_MERCHANT_ACCOUNT", "ADYEN_CLIENT_KEY", "ADYEN_HMAC_KEY"], docsUrl: "https://docs.adyen.com" },
  { id: "square", name: "Square", category: "payments", auth: ["oauth", "api_key"], envVars: ["SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID", "SQUARE_WEBHOOK_SIGNATURE"], docsUrl: "https://developer.squareup.com" },
  { id: "braintree", name: "Braintree", category: "payments", auth: ["api_key"], envVars: ["BRAINTREE_MERCHANT_ID", "BRAINTREE_PUBLIC_KEY", "BRAINTREE_PRIVATE_KEY"], docsUrl: "https://developer.paypal.com/braintree" },
  // ── Payments · India ─────────────────────────────────────────────────────
  { id: "razorpay", name: "Razorpay", category: "payments", auth: ["api_key"], envVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"], region: "in", docsUrl: "https://razorpay.com/docs", notes: "UPI, cards, netbanking, wallets, subscriptions — INR first." },
  { id: "cashfree", name: "Cashfree", category: "payments", auth: ["api_key"], envVars: ["CASHFREE_CLIENT_ID", "CASHFREE_CLIENT_SECRET", "CASHFREE_WEBHOOK_SECRET"], region: "in", docsUrl: "https://docs.cashfree.com" },
  { id: "payu", name: "PayU", category: "payments", auth: ["api_key"], envVars: ["PAYU_MERCHANT_KEY", "PAYU_MERCHANT_SALT", "PAYU_WEBHOOK_SECRET"], region: "in", docsUrl: "https://payu.in" },
  { id: "phonepe", name: "PhonePe Gateway", category: "payments", auth: ["api_key"], envVars: ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY", "PHONEPE_SALT_INDEX"], region: "in", docsUrl: "https://developer.phonepe.com" },
  { id: "paytm", name: "Paytm Payments", category: "payments", auth: ["api_key"], envVars: ["PAYTM_MID", "PAYTM_MERCHANT_KEY", "PAYTM_WEBSITE"], region: "in", docsUrl: "https://developer.paytm.com" },
  { id: "ccavenue", name: "CCAvenue", category: "payments", auth: ["api_key"], envVars: ["CCAVENUE_MERCHANT_ID", "CCAVENUE_ACCESS_CODE", "CCAVENUE_WORKING_KEY"], region: "in", docsUrl: "https://developer.ccavenue.com" },
  // ── Authentication ───────────────────────────────────────────────────────
  { id: "google-oauth", name: "Google (OAuth)", category: "authentication", auth: ["oauth"], envVars: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], docsUrl: "https://developers.google.com/identity" },
  { id: "github-oauth", name: "GitHub (OAuth)", category: "authentication", auth: ["oauth"], envVars: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"], docsUrl: "https://docs.github.com/apps" },
  { id: "apple-oauth", name: "Apple Sign-In", category: "authentication", auth: ["oauth"], envVars: ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"], docsUrl: "https://developer.apple.com/sign-in-with-apple" },
  { id: "microsoft-oauth", name: "Microsoft Entra", category: "authentication", auth: ["oauth"], envVars: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET", "MICROSOFT_TENANT_ID"], docsUrl: "https://learn.microsoft.com/entra" },
  { id: "auth0", name: "Auth0", category: "authentication", auth: ["api_key"], envVars: ["AUTH0_DOMAIN", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"], docsUrl: "https://auth0.com/docs" },
  { id: "clerk", name: "Clerk", category: "authentication", auth: ["api_key"], envVars: ["CLERK_SECRET_KEY", "CLERK_PUBLISHABLE_KEY"], docsUrl: "https://clerk.com/docs" },
  { id: "firebase-auth", name: "Firebase Auth", category: "authentication", auth: ["api_key"], envVars: ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT"], docsUrl: "https://firebase.google.com/docs/auth" },
  { id: "supabase-auth", name: "Supabase Auth", category: "authentication", auth: ["api_key"], envVars: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"], docsUrl: "https://supabase.com/docs/guides/auth" },
  { id: "workos", name: "WorkOS", category: "authentication", auth: ["api_key"], envVars: ["WORKOS_API_KEY", "WORKOS_CLIENT_ID"], docsUrl: "https://workos.com/docs" },
  // ── Database ─────────────────────────────────────────────────────────────
  { id: "postgres", name: "PostgreSQL", category: "database", auth: ["api_key"], envVars: ["DATABASE_URL"], docsUrl: "https://www.postgresql.org/docs" },
  { id: "mysql", name: "MySQL", category: "database", auth: ["api_key"], envVars: ["DATABASE_URL"], docsUrl: "https://dev.mysql.com/doc" },
  { id: "sqlite", name: "SQLite", category: "database", auth: ["none"], envVars: [], notes: "Zero-config local database." },
  { id: "mongodb", name: "MongoDB", category: "database", auth: ["api_key"], envVars: ["MONGODB_URI"], docsUrl: "https://www.mongodb.com/docs" },
  { id: "supabase-db", name: "Supabase (Postgres)", category: "database", auth: ["api_key"], envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"], docsUrl: "https://supabase.com/docs" },
  { id: "firebase-db", name: "Firebase", category: "database", auth: ["api_key"], envVars: ["FIREBASE_PROJECT_ID", "FIREBASE_SERVICE_ACCOUNT"], docsUrl: "https://firebase.google.com/docs/firestore" },
  { id: "neon", name: "Neon", category: "database", auth: ["api_key"], envVars: ["DATABASE_URL", "NEON_API_KEY"], docsUrl: "https://neon.tech/docs" },
  { id: "planetscale", name: "PlanetScale", category: "database", auth: ["api_key"], envVars: ["DATABASE_URL", "PLANETSCALE_TOKEN"], docsUrl: "https://planetscale.com/docs" },
  { id: "turso", name: "Turso", category: "database", auth: ["api_key"], envVars: ["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"], docsUrl: "https://docs.turso.tech" },
  // ── Email ────────────────────────────────────────────────────────────────
  { id: "resend", name: "Resend", category: "email", auth: ["api_key"], envVars: ["RESEND_API_KEY", "EMAIL_FROM"], docsUrl: "https://resend.com/docs" },
  { id: "sendgrid", name: "SendGrid", category: "email", auth: ["api_key"], envVars: ["SENDGRID_API_KEY", "EMAIL_FROM"], docsUrl: "https://docs.sendgrid.com" },
  { id: "mailgun", name: "Mailgun", category: "email", auth: ["api_key"], envVars: ["MAILGUN_API_KEY", "MAILGUN_DOMAIN"], docsUrl: "https://documentation.mailgun.com" },
  { id: "amazon-ses", name: "Amazon SES", category: "email", auth: ["api_key"], envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "EMAIL_FROM"], docsUrl: "https://docs.aws.amazon.com/ses" },
  { id: "postmark", name: "Postmark", category: "email", auth: ["api_key"], envVars: ["POSTMARK_API_KEY", "EMAIL_FROM"], docsUrl: "https://postmarkapp.com/developer" },
  // ── Storage ──────────────────────────────────────────────────────────────
  { id: "cloudflare-r2", name: "Cloudflare R2", category: "storage", auth: ["api_key"], envVars: ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"], docsUrl: "https://developers.cloudflare.com/r2" },
  { id: "amazon-s3", name: "Amazon S3", category: "storage", auth: ["api_key"], envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"], docsUrl: "https://docs.aws.amazon.com/s3" },
  { id: "gcs", name: "Google Cloud Storage", category: "storage", auth: ["api_key"], envVars: ["GCS_PROJECT_ID", "GCS_SERVICE_ACCOUNT", "GCS_BUCKET"], docsUrl: "https://cloud.google.com/storage/docs" },
  { id: "supabase-storage", name: "Supabase Storage", category: "storage", auth: ["api_key"], envVars: ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_STORAGE_BUCKET"], docsUrl: "https://supabase.com/docs/guides/storage" },
  { id: "uploadthing", name: "UploadThing", category: "storage", auth: ["api_key"], envVars: ["UPLOADTHING_TOKEN"], docsUrl: "https://docs.uploadthing.com" },
  // ── AI ───────────────────────────────────────────────────────────────────
  { id: "openai", name: "OpenAI", category: "ai", auth: ["api_key"], envVars: ["OPENAI_API_KEY"], docsUrl: "https://platform.openai.com/docs" },
  { id: "google-gemini", name: "Google Gemini", category: "ai", auth: ["api_key"], envVars: ["GEMINI_API_KEY"], docsUrl: "https://ai.google.dev" },
  { id: "anthropic", name: "Anthropic Claude", category: "ai", auth: ["api_key"], envVars: ["ANTHROPIC_API_KEY"], docsUrl: "https://docs.anthropic.com" },
  { id: "nvidia-nim", name: "NVIDIA NIM", category: "ai", auth: ["api_key"], envVars: ["NVIDIA_API_KEY"], docsUrl: "https://build.nvidia.com", notes: "Open-model inference; RIDE's default remote tier." },
  { id: "groq", name: "Groq", category: "ai", auth: ["api_key"], envVars: ["GROQ_API_KEY"], docsUrl: "https://console.groq.com/docs" },
  { id: "mistral", name: "Mistral", category: "ai", auth: ["api_key"], envVars: ["MISTRAL_API_KEY"], docsUrl: "https://docs.mistral.ai" },
  { id: "together", name: "Together AI", category: "ai", auth: ["api_key"], envVars: ["TOGETHER_API_KEY"], docsUrl: "https://docs.together.ai" },
  { id: "openrouter", name: "OpenRouter", category: "ai", auth: ["api_key"], envVars: ["OPENROUTER_API_KEY"], docsUrl: "https://openrouter.ai/docs" },
  { id: "ollama", name: "Ollama (local)", category: "ai", auth: ["none"], envVars: ["OLLAMA_URL"], notes: "Local models — free, offline, private." },
  // ── Communication ────────────────────────────────────────────────────────
  { id: "whatsapp-business", name: "WhatsApp Business API", category: "communication", auth: ["api_key"], envVars: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID"], docsUrl: "https://developers.facebook.com/docs/whatsapp" },
  { id: "twilio", name: "Twilio", category: "communication", auth: ["api_key"], envVars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER"], docsUrl: "https://www.twilio.com/docs" },
  { id: "vonage", name: "Vonage", category: "communication", auth: ["api_key"], envVars: ["VONAGE_API_KEY", "VONAGE_API_SECRET", "VONAGE_FROM"], docsUrl: "https://developer.vonage.com" },
  { id: "plivo", name: "Plivo", category: "communication", auth: ["api_key"], envVars: ["PLIVO_AUTH_ID", "PLIVO_AUTH_TOKEN", "PLIVO_FROM"], docsUrl: "https://www.plivo.com/docs" },
  { id: "telegram", name: "Telegram Bot", category: "communication", auth: ["api_key"], envVars: ["TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"], docsUrl: "https://core.telegram.org/bots" },
  { id: "discord", name: "Discord Webhook", category: "communication", auth: ["api_key"], envVars: ["DISCORD_WEBHOOK_URL"], docsUrl: "https://discord.com/developers/docs" },
  { id: "slack", name: "Slack", category: "communication", auth: ["oauth", "api_key"], envVars: ["SLACK_BOT_TOKEN", "SLACK_CHANNEL"], docsUrl: "https://api.slack.com" },
  // ── Analytics ────────────────────────────────────────────────────────────
  { id: "google-analytics", name: "Google Analytics", category: "analytics", auth: ["api_key"], envVars: ["GA_MEASUREMENT_ID"], docsUrl: "https://developers.google.com/analytics" },
  { id: "posthog", name: "PostHog", category: "analytics", auth: ["api_key"], envVars: ["POSTHOG_API_KEY", "POSTHOG_HOST"], docsUrl: "https://posthog.com/docs" },
  { id: "mixpanel", name: "Mixpanel", category: "analytics", auth: ["api_key"], envVars: ["MIXPANEL_TOKEN", "MIXPANEL_SERVICE_ACCOUNT"], docsUrl: "https://docs.mixpanel.com" },
  { id: "amplitude", name: "Amplitude", category: "analytics", auth: ["api_key"], envVars: ["AMPLITUDE_API_KEY", "AMPLITUDE_SECRET"], docsUrl: "https://amplitude.com/docs" },
  { id: "plausible", name: "Plausible", category: "analytics", auth: ["api_key"], envVars: ["PLAUSIBLE_SITE", "PLAUSIBLE_API_KEY"], docsUrl: "https://plausible.io/docs" },
  { id: "clarity", name: "Microsoft Clarity", category: "analytics", auth: ["api_key"], envVars: ["CLARITY_PROJECT_ID"], docsUrl: "https://learn.microsoft.com/clarity" },
  // ── Maps & Location ──────────────────────────────────────────────────────
  { id: "google-maps", name: "Google Maps", category: "maps", auth: ["api_key"], envVars: ["GOOGLE_MAPS_API_KEY"], docsUrl: "https://developers.google.com/maps" },
  { id: "mapbox", name: "Mapbox", category: "maps", auth: ["api_key"], envVars: ["MAPBOX_TOKEN"], docsUrl: "https://docs.mapbox.com" },
  { id: "here", name: "HERE", category: "maps", auth: ["api_key"], envVars: ["HERE_API_KEY"], docsUrl: "https://www.here.com/docs" },
  { id: "openstreetmap", name: "OpenStreetMap", category: "maps", auth: ["none"], envVars: [], notes: "Free, no key. Leaflet + Nominatim geocoding." },
  // ── Search ───────────────────────────────────────────────────────────────
  { id: "algolia", name: "Algolia", category: "search", auth: ["api_key"], envVars: ["ALGOLIA_APP_ID", "ALGOLIA_API_KEY", "ALGOLIA_INDEX"], docsUrl: "https://www.algolia.com/doc" },
  { id: "elasticsearch", name: "Elasticsearch", category: "search", auth: ["api_key"], envVars: ["ELASTICSEARCH_URL", "ELASTICSEARCH_API_KEY"], docsUrl: "https://www.elastic.co/docs" },
  { id: "meilisearch", name: "Meilisearch", category: "search", auth: ["api_key"], envVars: ["MEILI_HOST", "MEILI_MASTER_KEY"], docsUrl: "https://www.meilisearch.com/docs" },
  { id: "typesense", name: "Typesense", category: "search", auth: ["api_key"], envVars: ["TYPESENSE_HOST", "TYPESENSE_API_KEY"], docsUrl: "https://typesense.org/docs" },
  // ── Documents ────────────────────────────────────────────────────────────
  { id: "cloudconvert", name: "CloudConvert", category: "documents", auth: ["api_key"], envVars: ["CLOUDCONVERT_API_KEY"], docsUrl: "https://cloudconvert.com/api" },
  { id: "pdfco", name: "PDF.co", category: "documents", auth: ["api_key"], envVars: ["PDFCO_API_KEY"], docsUrl: "https://apidocs.pdf.co" },
  { id: "tesseract", name: "Tesseract OCR", category: "documents", auth: ["none"], envVars: [], notes: "Local OCR, no API key required." },
  { id: "google-vision", name: "Google Vision", category: "documents", auth: ["api_key"], envVars: ["GOOGLE_VISION_API_KEY"], docsUrl: "https://cloud.google.com/vision/docs" },
  // ── Infrastructure ───────────────────────────────────────────────────────
  { id: "hostinger", name: "Hostinger", category: "infrastructure", auth: ["api_key"], envVars: ["HOSTINGER_API_KEY"], docsUrl: "https://developers.hostinger.com", notes: "RIDE's primary deployment partner." },
  { id: "cloudflare", name: "Cloudflare", category: "infrastructure", auth: ["api_key"], envVars: ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ZONE_ID"], docsUrl: "https://developers.cloudflare.com" },
  { id: "vercel", name: "Vercel", category: "infrastructure", auth: ["api_key"], envVars: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"], docsUrl: "https://vercel.com/docs" },
  { id: "netlify", name: "Netlify", category: "infrastructure", auth: ["api_key"], envVars: ["NETLIFY_AUTH_TOKEN"], docsUrl: "https://docs.netlify.com" },
  { id: "aws", name: "AWS", category: "infrastructure", auth: ["api_key"], envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"], docsUrl: "https://docs.aws.amazon.com" },
  { id: "gcp", name: "Google Cloud", category: "infrastructure", auth: ["api_key"], envVars: ["GCP_PROJECT_ID", "GCP_SERVICE_ACCOUNT"], docsUrl: "https://cloud.google.com/docs" },
  { id: "azure", name: "Azure", category: "infrastructure", auth: ["api_key"], envVars: ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"], docsUrl: "https://learn.microsoft.com/azure" },
  // ── Git & Development ────────────────────────────────────────────────────
  { id: "github", name: "GitHub", category: "git", auth: ["oauth", "api_key"], envVars: ["GITHUB_TOKEN"], docsUrl: "https://docs.github.com/rest" },
  { id: "gitlab", name: "GitLab", category: "git", auth: ["oauth", "api_key"], envVars: ["GITLAB_TOKEN"], docsUrl: "https://docs.gitlab.com" },
  { id: "bitbucket", name: "Bitbucket", category: "git", auth: ["api_key"], envVars: ["BITBUCKET_TOKEN"], docsUrl: "https://developer.atlassian.com/cloud/bitbucket" },
  // ── CRM ──────────────────────────────────────────────────────────────────
  { id: "hubspot", name: "HubSpot", category: "crm", auth: ["oauth", "api_key"], envVars: ["HUBSPOT_API_KEY"], docsUrl: "https://developers.hubspot.com" },
  { id: "salesforce", name: "Salesforce", category: "crm", auth: ["oauth"], envVars: ["SALESFORCE_INSTANCE", "SALESFORCE_CLIENT_ID", "SALESFORCE_CLIENT_SECRET"], docsUrl: "https://developer.salesforce.com" },
  { id: "zoho", name: "Zoho CRM", category: "crm", auth: ["oauth"], envVars: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"], docsUrl: "https://www.zoho.com/crm/developer" },
  { id: "pipedrive", name: "Pipedrive", category: "crm", auth: ["api_key"], envVars: ["PIPEDRIVE_API_TOKEN"], docsUrl: "https://pipedrive.readme.io" },
  // ── E-commerce ───────────────────────────────────────────────────────────
  { id: "shopify", name: "Shopify", category: "ecommerce", auth: ["oauth", "api_key"], envVars: ["SHOPIFY_STORE", "SHOPIFY_ACCESS_TOKEN"], docsUrl: "https://shopify.dev/docs" },
  { id: "woocommerce", name: "WooCommerce", category: "ecommerce", auth: ["api_key"], envVars: ["WOO_URL", "WOO_CONSUMER_KEY", "WOO_CONSUMER_SECRET"], docsUrl: "https://woocommerce.com/document/woocommerce-rest-api" },
  { id: "shiprocket", name: "Shiprocket", category: "ecommerce", auth: ["api_key"], envVars: ["SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD", "SHIPROCKET_TOKEN"], region: "in", docsUrl: "https://apidocs.shiprocket.in" },
  { id: "easyship", name: "Easyship", category: "ecommerce", auth: ["api_key"], envVars: ["EASYSHIP_API_KEY"], docsUrl: "https://www.easyship.com/docs" },
  // ── Automation ───────────────────────────────────────────────────────────
  { id: "zapier", name: "Zapier", category: "automation", auth: ["api_key"], envVars: ["ZAPIER_API_KEY"], docsUrl: "https://platform.zapier.com" },
  { id: "make", name: "Make", category: "automation", auth: ["api_key"], envVars: ["MAKE_API_TOKEN"], docsUrl: "https://www.make.com/en/api-documentation" },
  { id: "n8n", name: "n8n", category: "automation", auth: ["api_key"], envVars: ["N8N_HOST", "N8N_API_KEY"], docsUrl: "https://docs.n8n.io" },
  { id: "webhooks", name: "Webhooks (generic)", category: "automation", auth: ["none"], envVars: [], notes: "Outbound HTTP calls to any endpoint." },
  { id: "mcp", name: "MCP Server", category: "automation", auth: ["api_key"], envVars: ["MCP_URL", "MCP_AUTH_HEADER"], notes: "Model Context Protocol — tools RIDE can call directly." },
  // ── Security ─────────────────────────────────────────────────────────────
  { id: "security-core", name: "Security core (built-in)", category: "security", auth: ["none"], envVars: [], notes: "Rate limiting, validation, headers, audit log — zero-config module." },
  { id: "hcaptcha", name: "hCaptcha", category: "security", auth: ["api_key"], envVars: ["HCAPTCHA_SITE_KEY", "HCAPTCHA_SECRET_KEY"], docsUrl: "https://docs.hcaptcha.com" },
  { id: "recaptcha", name: "reCAPTCHA", category: "security", auth: ["api_key"], envVars: ["RECAPTCHA_SITE_KEY", "RECAPTCHA_SECRET_KEY"], docsUrl: "https://developers.google.com/recaptcha" },
  { id: "cloudflare-turnstile", name: "Cloudflare Turnstile", category: "security", auth: ["api_key"], envVars: ["TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY"], docsUrl: "https://developers.cloudflare.com/turnstile" },
];

export function getProvider(id: string): PluginProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function providersByCategory(category: PluginProvider["category"]): PluginProvider[] {
  return PROVIDERS.filter((p) => p.category === category);
}

export function providersByPlugin(manifest: PluginManifest): PluginProvider[] {
  return PROVIDERS.filter((p) => manifest.providers.includes(p.id));
}

/**
 * ─── Official RIDE plugins ─────────────────────────────────────────────────
 *
 * Verified, free, supported by the RIDE team. Each carries the AI instruction
 * rules that let a small local model implement the integration correctly
 * without rediscovering provider conventions (section 21 of the brief).
 */
export const OFFICIAL_PLUGINS: PluginManifest[] = [
  {
    id: "ride.payments-stripe",
    name: "payments-stripe",
    displayName: "Stripe Payments",
    version: "1.0.0",
    publisher: "ride",
    category: "payments",
    description: "Checkout, subscriptions, refunds and verified webhooks for Stripe.",
    capabilities: ["payments.checkout", "payments.subscriptions", "payments.refunds", "payments.invoices"],
    providers: ["stripe"],
    pricePaise: 0,
    tags: ["payments", "checkout", "subscriptions"],
    rules: [
      { severity: "must-not", rule: "Never expose secret keys in frontend code. Use the publishable key on the client only." },
      { severity: "must", rule: "Create all payments server-side; never trust client-side payment status." },
      { severity: "must", rule: "Verify webhook signatures (Stripe-Signature header) with the webhook secret before processing." },
      { severity: "must", rule: "Store transaction IDs and status in the database (transactions table)." },
      { severity: "must", rule: "Handle failed/cancelled payments: show an error page and retry option." },
      { severity: "must", rule: "Implement loading and error states on every checkout surface." },
      { severity: "must", rule: "On webhook, update order status idempotently — same event may arrive twice." },
    ],
    aiInstructions:
      "STRIPE PAYMENTS IMPLEMENTATION\n" +
      "1. Server: create a Checkout Session (or PaymentIntent) with `STRIPE_SECRET_KEY`.\n" +
      "2. Client: load Stripe.js with the publishable key; redirect to the checkout URL.\n" +
      "3. Success page: verify the session server-side before granting access.\n" +
      "4. Webhook: verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET`, handle `checkout.session.completed` and `charge.refunded`, update the transactions table idempotently.\n" +
      "5. Never log or expose card data; rely on Stripe Elements / hosted pages.\n" +
      "6. Provide a refund action from the admin UI using the stored payment intent id.",
  },
  {
    id: "ride.payments-razorpay",
    name: "payments-razorpay",
    displayName: "Razorpay Payments",
    version: "1.0.0",
    publisher: "ride",
    category: "payments",
    description: "UPI, cards and subscriptions via Razorpay — the INR-first gateway.",
    capabilities: ["payments.checkout", "payments.subscriptions", "payments.refunds", "payments.wallet"],
    providers: ["razorpay"],
    pricePaise: 0,
    tags: ["payments", "india", "upi", "inr"],
    rules: [
      { severity: "must-not", rule: "Never expose the key secret (RAZORPAY_KEY_SECRET) in the browser; client uses the key id only." },
      { severity: "must", rule: "Create orders server-side with `razorpay.orders.create` and verify payment server-side with `razorpay.payments.fetch` before granting access." },
      { severity: "must", rule: "Verify the webhook signature with the Razorpay signature helper using RAZORPAY_WEBHOOK_SECRET." },
      { severity: "must", rule: "Persist razorpay_order_id, razorpay_payment_id and razorpay_signature in the transactions table." },
      { severity: "must", rule: "Handle payment.failed events: mark the order failed and email the user." },
    ],
    aiInstructions:
      "RAZORPAY PAYMENTS IMPLEMENTATION (INR)\n" +
      "1. Server: `razorpay.orders.create({ amount, currency: 'INR', receipt })` with RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET.\n" +
      "2. Client: checkout.js with the key id; on success callback capture the payment id + signature.\n" +
      "3. Server verification: `razorpay.utils.validatePaymentSignature` before granting access.\n" +
      "4. Webhook: verify signature from RAZORPAY_WEBHOOK_SECRET; handle payment.captured / payment.failed.\n" +
      "5. Store the three ids + status in transactions; update subscription status on recurring success.",
  },
  {
    id: "ride.auth-supabase",
    name: "auth-supabase",
    displayName: "Supabase Auth",
    version: "1.0.0",
    publisher: "ride",
    category: "authentication",
    description: "Email/password, OAuth (Google, GitHub, Apple), sessions, roles and RLS.",
    capabilities: ["auth.login", "auth.oauth", "auth.passwordReset", "auth.mfa", "auth.rbac"],
    providers: ["supabase-auth"],
    requires: ["ride.database-supabase"],
    pricePaise: 0,
    tags: ["auth", "oauth", "sessions", "rbac"],
    rules: [
      { severity: "must", rule: "Use the anon key client-side only; service role key stays server-side." },
      { severity: "must", rule: "Secure every table with Row Level Security policies; never disable RLS." },
      { severity: "must", rule: "Verify the session token (JWT) on every authenticated request." },
      { severity: "must", rule: "Map roles to app-level permissions; never trust a client-claimed role." },
    ],
    aiInstructions:
      "SUPABASE AUTH IMPLEMENTATION\n" +
      "1. Client SDK with SUPABASE_URL + SUPABASE_ANON_KEY.\n" +
      "2. Sign up / sign in with email+password; enable Google/GitHub OAuth via the Supabase dashboard redirects.\n" +
      "3. Server routes use `createClient` with the service role key for privileged actions.\n" +
      "4. Create a `profiles` table keyed to auth.users and enable RLS with a `select/insert/update` policy scoped to `auth.uid()`.\n" +
      "5. Add a `roles` column (user/admin) checked on the server, not the client.",
  },
  {
    id: "ride.auth-clerk",
    name: "auth-clerk",
    displayName: "Clerk Auth",
    version: "1.0.0",
    publisher: "ride",
    category: "authentication",
    description: "Managed auth: email, social login, MFA, sessions and orgs.",
    capabilities: ["auth.login", "auth.oauth", "auth.mfa", "auth.rbac"],
    providers: ["clerk"],
    pricePaise: 0,
    tags: ["auth", "oauth", "mfa"],
    rules: [
      { severity: "must", rule: "Keep CLERK_SECRET_KEY server-side; CLERK_PUBLISHABLE_KEY may ship to the client." },
      { severity: "must", rule: "Verify Clerk JWTs with the Clerk backend SDK on API routes." },
      { severity: "must", rule: "Use webhooks (user.created) to sync users into your own database." },
    ],
    aiInstructions: "CLERK AUTH: add <ClerkProvider> at the app root, gate routes with `auth()`, sync users into the DB via the `user.created` webhook (verify svix signature).",
  },
  {
    id: "ride.database-supabase",
    name: "database-supabase",
    displayName: "Supabase Database",
    version: "1.0.0",
    publisher: "ride",
    category: "database",
    description: "Managed Postgres with schema, migrations, CRUD and storage.",
    capabilities: ["database.postgres", "database.managed", "database.orm", "storage.s3"],
    providers: ["supabase-db", "supabase-storage"],
    pricePaise: 0,
    tags: ["database", "postgres", "crud"],
    rules: [
      { severity: "must", rule: "Define the schema as SQL migrations checked into the repo." },
      { severity: "must", rule: "Create a typed data layer (row types + query helpers) — no raw dynamic SQL in components." },
      { severity: "must", rule: "Validate input with zod on the server before writing." },
    ],
    aiInstructions: "SUPABASE DB: write migrations under `supabase/migrations`, a typed client module, seed data, and RLS policies per table.",
  },
  {
    id: "ride.database-postgres",
    name: "database-postgres",
    displayName: "PostgreSQL",
    version: "1.0.0",
    publisher: "ride",
    category: "database",
    description: "Self/managed Postgres via DATABASE_URL with migrations and CRUD.",
    capabilities: ["database.postgres", "database.orm"],
    providers: ["postgres", "neon"],
    pricePaise: 0,
    tags: ["database", "postgres"],
    rules: [
      { severity: "must", rule: "Use a connection pool; never open a connection per request." },
      { severity: "must", rule: "Parameterize every query — never interpolate user input into SQL." },
      { severity: "must", rule: "Add indexes for every foreign key and hot lookup path." },
    ],
    aiInstructions: "POSTGRES: pool from DATABASE_URL, migrations folder, parameterized queries only, index FKs.",
  },
  {
    id: "ride.email-resend",
    name: "email-resend",
    displayName: "Resend Email",
    version: "1.0.0",
    publisher: "ride",
    category: "email",
    description: "Transactional email: welcome, OTP, password reset, order confirmations, invoices.",
    capabilities: ["email.transactional", "email.otp", "email.marketing"],
    providers: ["resend"],
    pricePaise: 0,
    tags: ["email", "transactional"],
    rules: [
      { severity: "must", rule: "Send email only from the server; never embed the API key in the client." },
      { severity: "must", rule: "Use React Email or HTML templates; include a plain-text fallback." },
      { severity: "must", rule: "Never log email contents or tokens; store OTPs hashed." },
    ],
    aiInstructions: "RESEND: `resend.emails.send` with React Email templates. OTP flow: generate 6-digit code, store SHA-256 hash + expiry (10 min), resend cooldown 60 s.",
  },
  {
    id: "ride.email-sendgrid",
    name: "email-sendgrid",
    displayName: "SendGrid Email",
    version: "1.0.0",
    publisher: "ride",
    category: "email",
    description: "Transactional + marketing email via Twilio SendGrid.",
    capabilities: ["email.transactional", "email.otp", "email.marketing"],
    providers: ["sendgrid"],
    pricePaise: 0,
    tags: ["email"],
    rules: [
      { severity: "must", rule: "Server-side sends only; API key never in the client bundle." },
      { severity: "must", rule: "Handle send failures with retry and a logged error path." },
    ],
    aiInstructions: "SENDGRID: `sendgrid.mail.send` with dynamic templates; implement retry + failure logging; verify webhook (Event Webhook) if tracking bounces.",
  },
  {
    id: "ride.storage-r2",
    name: "storage-r2",
    displayName: "Cloudflare R2 Storage",
    version: "1.0.0",
    publisher: "ride",
    category: "storage",
    description: "Object storage for images, videos and PDFs with presigned URLs.",
    capabilities: ["storage.files", "storage.s3", "storage.cdn"],
    providers: ["cloudflare-r2"],
    pricePaise: 0,
    tags: ["storage", "uploads", "s3"],
    rules: [
      { severity: "must", rule: "Validate file type and size server-side before upload; scan with the RIDE document plugin when required." },
      { severity: "must", rule: "Use presigned PUT URLs for uploads — never proxy large files through the app server." },
      { severity: "must", rule: "Store only the object key in the database; derive public URLs, never user paths." },
      { severity: "must", rule: "Enforce a public-read bucket for avatars or a signed URL layer for private files." },
    ],
    aiInstructions: "R2: presigned upload URL endpoint, key = `uploads/<userId>/<uuid>.<ext>`, size/type limits, store key in DB, serve via public bucket or signed GET.",
  },
  {
    id: "ride.storage-s3",
    name: "storage-s3",
    displayName: "Amazon S3 Storage",
    version: "1.0.0",
    publisher: "ride",
    category: "storage",
    description: "S3 object storage with presigned URLs and thumbnails.",
    capabilities: ["storage.files", "storage.s3"],
    providers: ["amazon-s3"],
    pricePaise: 0,
    tags: ["storage"],
    rules: [
      { severity: "must", rule: "Never embed AWS keys in the client." },
      { severity: "must", rule: "Use presigned URLs for both uploads and private downloads." },
    ],
    aiInstructions: "S3: `PutObjectCommand` presigned PUT, bucket policy public for public assets, key scheme `uploads/<userId>/<uuid>.<ext>`.",
  },
  {
    id: "ride.ai-openai",
    name: "ai-openai",
    displayName: "OpenAI",
    version: "1.0.0",
    publisher: "ride",
    category: "ai",
    description: "Chat completions, embeddings and assistants for your product.",
    capabilities: ["ai.chat", "ai.embeddings", "ai.generation"],
    providers: ["openai"],
    pricePaise: 0,
    tags: ["ai", "chat", "embeddings"],
    rules: [
      { severity: "must", rule: "Proxy AI calls through your own backend; never call the provider from the browser with the key." },
      { severity: "must", rule: "Cap token usage per user and stream responses when latency matters." },
      { severity: "must", rule: "Sanitize and limit prompt length; never send secrets or other users' data." },
    ],
    aiInstructions: "OPENAI: server route `/api/ai/chat` with the API key; stream with `stream: true`; add a per-user usage cap; embeddings route for RAG with a vector column.",
  },
  {
    id: "ride.ai-gemini",
    name: "ai-gemini",
    displayName: "Google Gemini",
    version: "1.0.0",
    publisher: "ride",
    category: "ai",
    description: "Gemini chat + vision + embeddings for your product.",
    capabilities: ["ai.chat", "ai.embeddings", "ai.generation"],
    providers: ["google-gemini"],
    pricePaise: 0,
    tags: ["ai"],
    rules: [
      { severity: "must", rule: "Server-side calls only; the key never ships to the client." },
      { severity: "must", rule: "Set responseMimeType and safetySettings explicitly." },
    ],
    aiInstructions: "GEMINI: `@google/generative-ai`, server proxy route, safetySettings blocked, per-user rate limit.",
  },
  {
    id: "ride.ai-ollama",
    name: "ai-ollama",
    displayName: "Ollama (local AI)",
    version: "1.0.0",
    publisher: "ride",
    category: "ai",
    description: "Local, free, offline LLM inference for your product.",
    capabilities: ["ai.chat", "ai.generation"],
    providers: ["ollama"],
    pricePaise: 0,
    tags: ["ai", "local", "offline"],
    rules: [
      { severity: "must", rule: "Detect the model's absence and return a clear setup error." },
      { severity: "must", rule: "Keep OLLAMA_URL server-side configurable; default localhost:11434." },
    ],
    aiInstructions: "OLLAMA: `POST /api/generate` on OLLAMA_URL; model check first; stream tokens; fallback message when the runtime is down.",
  },
  {
    id: "ride.comm-whatsapp",
    name: "comm-whatsapp",
    displayName: "WhatsApp Notifications",
    version: "1.0.0",
    publisher: "ride",
    category: "communication",
    description: "Order confirmations, OTPs and alerts via WhatsApp Business API.",
    capabilities: ["comm.whatsapp", "comm.sms"],
    providers: ["whatsapp-business", "twilio"],
    pricePaise: 0,
    tags: ["whatsapp", "notifications"],
    rules: [
      { severity: "must", rule: "Use pre-approved message templates for business-initiated messages." },
      { severity: "must", rule: "Never send PII like OTPs or payment IDs to unverified logs." },
      { severity: "must", rule: "Queue sends; retry with exponential backoff on 429/5xx." },
    ],
    aiInstructions: "WHATSAPP: Cloud API `POST /<phone-id>/messages` with a template; fall back to SMS via Twilio when the number isn't on WhatsApp; send confirmation after payment webhook.",
  },
  {
    id: "ride.comm-twilio",
    name: "comm-twilio",
    displayName: "Twilio SMS & Voice",
    version: "1.0.0",
    publisher: "ride",
    category: "communication",
    description: "SMS OTPs, alerts and phone verification via Twilio.",
    capabilities: ["comm.sms", "comm.push"],
    providers: ["twilio"],
    pricePaise: 0,
    tags: ["sms", "otp"],
    rules: [
      { severity: "must", rule: "Store OTPs hashed with expiry; never in plaintext." },
      { severity: "must", rule: "Rate-limit OTP sends per number (e.g. 5/hour) to prevent abuse." },
    ],
    aiInstructions: "TWILIO: `messages.create` with the from number; OTP hash + expiry; send cooldown; verify endpoint compares hashes.",
  },
  {
    id: "ride.analytics-posthog",
    name: "analytics-posthog",
    displayName: "PostHog Analytics",
    version: "1.0.0",
    publisher: "ride",
    category: "analytics",
    description: "Page views, signups, purchases, funnels and feature flags.",
    capabilities: ["analytics.tracking", "analytics.conversions"],
    providers: ["posthog"],
    pricePaise: 0,
    tags: ["analytics", "funnels"],
    rules: [
      { severity: "must", rule: "Track server-side events for purchases (webhook), never client-side only." },
      { severity: "must", rule: "Never send PII as event properties." },
    ],
    aiInstructions: "POSTHOG: client `posthog.init(POSTHOG_API_KEY)`, pageview autocapture, `capture('purchase_completed', { amount })` from the server webhook path.",
  },
  {
    id: "ride.search-meilisearch",
    name: "search-meilisearch",
    displayName: "Meilisearch",
    version: "1.0.0",
    publisher: "ride",
    category: "search",
    description: "Fast typo-tolerant product search with filters and sorting.",
    capabilities: ["search.fulltext"],
    providers: ["meilisearch"],
    pricePaise: 0,
    tags: ["search"],
    rules: [
      { severity: "must", rule: "Sync the index from the database (webhook or job) — never search the DB directly for the catalog." },
      { severity: "must", rule: "Expose a server proxy route for search keys; the master key never ships to the client." },
    ],
    aiInstructions: "MEILISEARCH: index products on create/update, search API on the server with a scoped search key, filterableAttributes + sortableAttributes set, empty-state UI.",
  },
  {
    id: "ride.crm-hubspot",
    name: "crm-hubspot",
    displayName: "HubSpot CRM",
    version: "1.0.0",
    publisher: "ride",
    category: "crm",
    description: "Create leads from forms, sync contacts and deals.",
    capabilities: ["crm.leads"],
    providers: ["hubspot"],
    pricePaise: 0,
    tags: ["crm", "leads"],
    rules: [
      { severity: "must", rule: "Create leads server-side on form submit; never call the CRM from the client with a private key." },
      { severity: "must", rule: "Debounce duplicate creates by email (dedupe)." },
    ],
    aiInstructions: "HUBSPOT: on form submit POST to `/crm/v3/objects/contacts` server-side; dedupe by email via search API; log failures to the audit log.",
  },
  {
    id: "ride.ecommerce-shopify",
    name: "ecommerce-shopify",
    displayName: "Shopify Storefront",
    version: "1.0.0",
    publisher: "ride",
    category: "ecommerce",
    description: "Products, cart, checkout and orders through Shopify.",
    capabilities: ["ecommerce.catalog", "ecommerce.orders"],
    providers: ["shopify"],
    requires: ["ride.payments-stripe"],
    pricePaise: 0,
    tags: ["ecommerce", "shop"],
    rules: [
      { severity: "must", rule: "Use the Storefront API token in the client, the admin token server-side only." },
      { severity: "must", rule: "Never render prices from user input; always from the API." },
    ],
    aiInstructions: "SHOPIFY: Storefront GraphQL for products/cart, server proxy for orders, webhooks for order created/fulfilled.",
  },
  {
    id: "ride.automation-webhooks",
    name: "automation-webhooks",
    displayName: "Webhook Automation",
    version: "1.0.0",
    publisher: "ride",
    category: "automation",
    description: "Pipe product events (payment, signup, form) into Zapier/Make/n8n or outbound HTTP.",
    capabilities: ["automation.webhooks"],
    providers: ["webhooks", "zapier", "make", "n8n"],
    pricePaise: 0,
    tags: ["automation", "webhooks"],
    rules: [
      { severity: "must", rule: "Add an HMAC signature or shared secret to every outbound webhook." },
      { severity: "must", rule: "Retry with backoff and log failures; never block the primary flow on automation." },
    ],
    aiInstructions: "WEBHOOK AUTOMATION: `emit(event, payload)` helper signs payloads (HMAC-SHA256, shared secret), sends with 3 retries, records delivery in the audit log; wire payment → WhatsApp/CRM/email chains through it.",
  },
  {
    id: "ride.security-core",
    name: "security-core",
    displayName: "Security Core",
    version: "1.0.0",
    publisher: "ride",
    category: "security",
    description: "Rate limiting, input validation, security headers, audit log and secrets handling.",
    capabilities: ["security.basic"],
    providers: ["security-core", "cloudflare-turnstile", "hcaptcha"],
    pricePaise: 0,
    tags: ["security"],
    rules: [
      { severity: "must", rule: "Rate-limit all public endpoints, tighter on auth and payment callbacks." },
      { severity: "must", rule: "Validate every input with zod; reject unknown fields." },
      { severity: "must", rule: "Set security headers (CSP, HSTS, X-Frame-Options, nosniff)." },
      { severity: "must", rule: "Keep secrets out of logs, env files committed, and client bundles." },
      { severity: "must", rule: "Audit-log auth, payment and permission events." },
    ],
    aiInstructions: "SECURITY CORE: apply middleware in this order — helmet-style headers → rate limiter (per-IP, per-user for auth) → zod validation → auth → audit log; turnstile on public forms.",
  },
];

export function getOfficialPlugin(id: string): PluginManifest | undefined {
  return OFFICIAL_PLUGINS.find((p) => p.id === id);
}

export function getManifest(id: string): PluginManifest | undefined {
  return getOfficialPlugin(id);
}

export function allManifests(): PluginManifest[] {
  return [...OFFICIAL_PLUGINS];
}

/** Manifest ids that fulfil a capability id, in priority order. */
export function pluginsForCapability(capabilityId: string): PluginManifest[] {
  return OFFICIAL_PLUGINS.filter((p) => p.capabilities.includes(capabilityId));
}