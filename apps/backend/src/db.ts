import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const DATA_DIR = process.env.RIDE_DATA_DIR ?? join(process.cwd(), "data");
mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(join(DATA_DIR, "ride.db"));

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA busy_timeout = 5000");
db.exec("PRAGMA wal_autocheckpoint = 1");
db.exec("PRAGMA wal_checkpoint(RESTART)");

void (() => {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user',           -- user | creator | admin
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,                          -- website_deploy | app_build | template | credits
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_paise INTEGER NOT NULL,                -- 9900 = ₹99
    tax_paise INTEGER NOT NULL DEFAULT 0,        -- GST share
    currency TEXT NOT NULL DEFAULT 'INR',
    active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    tax_paise INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',      -- pending | captured | failed | refunded | cancelled
    gateway TEXT NOT NULL,
    gateway_txn_id TEXT,
    payment_id TEXT,                             -- provider payment id (created, paid)
    extra TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    captured_at INTEGER,
    refunded_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS entitlements (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    kind TEXT NOT NULL,                          -- deployment | app_build | template
    granted_at INTEGER NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,         -- deployment consumed / template downloaded
    consumed_at INTEGER,
    data TEXT DEFAULT '{}'
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    number TEXT UNIQUE NOT NULL,                 -- RIDE-2026-0001
    subtotal_paise INTEGER NOT NULL,
    tax_paise INTEGER NOT NULL,
    total_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'issued',       -- issued | paid | refunded
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,                    -- user project id (from IDE)
    project_name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'building',     -- building | live | failed | rolled_back
    subdomain TEXT NOT NULL,
    build_id TEXT,
    build_size_bytes INTEGER DEFAULT 0,
    url TEXT,
    health_check TEXT,
    logs TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS deploy_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deployment_id TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',          -- info | warn | error
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'web',
    price_paise INTEGER NOT NULL,                -- 0 = free
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'pending',      -- pending | published | rejected
    review_note TEXT,
    framework TEXT DEFAULT '',
    preview_url TEXT,
    archive_path TEXT,                           -- validated bundle on disk
    download_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS template_reviews (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    price_paise INTEGER NOT NULL,
    commission_paise INTEGER NOT NULL,           -- RIDE 30%
    creator_paise INTEGER NOT NULL,              -- creator 70%
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS earnings (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    purchase_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',      -- pending | paid | refunded
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    method TEXT NOT NULL,                        -- upi | bank | account_balance
    reference TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'processing',   -- processing | paid | failed
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  -- ── Plugin marketplace ──────────────────────────────────────────────────
  -- Sellable integration plugins (Stripe, Razorpay, Resend…). Official RIDE
  -- plugins are free; third-party creators price their own (30% RIDE / 70%
  -- creator split recorded on purchase, same as templates).
  CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'payments',              -- payments | authentication | database | email | …
    manifest_id TEXT DEFAULT '',                   -- rides an official plugin bundle when set
    price_paise INTEGER NOT NULL,                  -- 0 = free
    rating REAL DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    version TEXT DEFAULT '1.0.0',
    status TEXT NOT NULL DEFAULT 'pending',        -- pending | published | rejected
    review_note TEXT,
    tags TEXT DEFAULT '[]',
    download_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plugin_purchases (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plugin_id TEXT NOT NULL,
    order_id TEXT NOT NULL,
    price_paise INTEGER NOT NULL,
    commission_paise INTEGER NOT NULL,             -- RIDE 30%
    creator_paise INTEGER NOT NULL,                -- creator 70%
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);
  CREATE INDEX IF NOT EXISTS idx_plugin_purchases_user ON plugin_purchases(user_id);

  -- ── Student verification ───────────────────────────────────────────────
  -- Maintained verified-institution database. Never trust an arbitrary
  -- ".edu-looking" domain — institutions are seeded and periodically
  -- re-validated (status flips to 'pending_review' to force re-checks).
  CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'IN',
    verified_domains TEXT NOT NULL DEFAULT '[]',   -- JSON array, e.g. ["galgotiasuniversity.edu.in"]
    sso_provider TEXT DEFAULT '',                  -- e.g. "saml", "oidc", "" (none yet)
    verification_method TEXT NOT NULL DEFAULT 'email', -- email | sso | id | campus
    status TEXT NOT NULL DEFAULT 'verified',       -- verified | pending_review | suspended
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  -- University/campus workshop codes ("ABC-RIDE-2026"). Code alone is not
  -- enough — it also requires a matching institutional email.
  CREATE TABLE IF NOT EXISTS campuses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,                     -- e.g. "ABC-RIDE-2026"
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  -- One-time OTP for university-email verification.
  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'student',       -- student | campus
    used INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  -- Active student status. Only metadata is stored — never ID images.
  -- student_verified=true, institution_id, verification_method,
  -- verified_at, expires_at (12 months), then re-verification.
  CREATE TABLE IF NOT EXISTS student_verifications (
    user_id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    verification_method TEXT NOT NULL,            -- email | sso | id | campus
    institution_email TEXT DEFAULT '',             -- verified university email (email/campus method)
    verified_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',         -- active | expired | revoked
    updated_at INTEGER NOT NULL
  );

  -- ── Teams ──────────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    owner_id TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'team',             -- team | agency
    seat_limit INTEGER NOT NULL DEFAULT 2,
    workspace_url TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'developer',        -- owner | admin | developer | designer | reviewer | viewer
    status TEXT NOT NULL DEFAULT 'invited',        -- invited | active | suspended
    invited_at INTEGER NOT NULL,
    joined_at INTEGER,
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS team_invitations (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'developer',
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',        -- pending | accepted | declined | revoked
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    accepted_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS team_projects (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_env_vars (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value_enc TEXT NOT NULL,                       -- encrypted at rest (XOR+base64; wire-safe)
    env TEXT NOT NULL DEFAULT 'development',       -- development | staging | production
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(team_id, key, env)
  );

  CREATE TABLE IF NOT EXISTS team_tasks (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    project_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    assignee_id TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',       -- low | medium | high | urgent
    status TEXT NOT NULL DEFAULT 'backlog',        -- backlog | todo | in_progress | review | done
    labels TEXT DEFAULT '[]',
    milestone TEXT DEFAULT '',
    due_date INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_comments (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    project_id TEXT,
    file_path TEXT DEFAULT '',                     -- code comments: "Dashboard.tsx"
    line INTEGER,                                  -- code comments: 142
    body TEXT NOT NULL,
    author_id TEXT NOT NULL,
    parent_id TEXT,                                -- thread replies
    resolved INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    actor_id TEXT,
    action TEXT NOT NULL,
    detail TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  -- Team-wide shared AI context (decisions, conventions, architecture notes).
  CREATE TABLE IF NOT EXISTS team_ai_context (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'decision',         -- decision | convention | architecture | docs
    note TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements(user_id);
  CREATE INDEX IF NOT EXISTS idx_deployments_user ON deployments(user_id, project_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
  CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
  CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
  CREATE INDEX IF NOT EXISTS idx_members_team ON team_members(team_id);
  CREATE INDEX IF NOT EXISTS idx_members_user ON team_members(user_id);
  CREATE INDEX IF NOT EXISTS idx_invitations_team ON team_invitations(team_id);
  CREATE INDEX IF NOT EXISTS idx_invitations_token ON team_invitations(token);
  CREATE INDEX IF NOT EXISTS idx_team_projects_team ON team_projects(team_id);
  CREATE INDEX IF NOT EXISTS idx_team_tasks_team ON team_tasks(team_id, status);
  CREATE INDEX IF NOT EXISTS idx_team_comments_team ON team_comments(team_id);
  CREATE INDEX IF NOT EXISTS idx_team_activity_team ON team_activity(team_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_team_env_team ON team_env_vars(team_id);

  -- ── Master admin panel (separate app, same database) ───────────────────
  CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT DEFAULT 'Admin',
    role TEXT NOT NULL DEFAULT 'super_admin',   -- super_admin | analyst | moderator
    created_at INTEGER NOT NULL,
    last_login_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip TEXT DEFAULT '',
    user_agent TEXT DEFAULT '',
    revoked INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'feature',   -- bug | feature | ui | ai | deployment | marketplace | payment | performance | other
    message TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',    -- low | medium | high | urgent
    status TEXT NOT NULL DEFAULT 'new',         -- new | in_review | planned | in_development | completed | rejected
    screenshot_path TEXT DEFAULT '',
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS releases (
    id TEXT PRIMARY KEY,
    version TEXT UNIQUE NOT NULL,
    title TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    released_at INTEGER,
    users_affected INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft',       -- draft | released | rolled_back
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS update_stats (
    id TEXT PRIMARY KEY,
    release_id TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'windows',   -- windows | macos | linux
    kind TEXT NOT NULL DEFAULT 'update',        -- download | install | update
    count INTEGER NOT NULL DEFAULT 0,
    day INTEGER NOT NULL,
    UNIQUE(release_id, platform, kind, day)
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
  CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id);
  `);
})();

export interface Row {
  [k: string]: unknown;
}

export function now(): number {
  return Date.now();
}

export function genId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}${rnd}`;
}

export function randToken(n = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}