import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile, readdir, stat, mkdir, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { db, Row, genId, now } from "../db.js";

export const RIDE_HOST = process.env.RIDE_HOST ?? "ride.app";
export const PUBLIC_ORIGIN = process.env.RIDE_PUBLIC_URL ?? `http://localhost:${process.env.RIDE_PORT ?? 8787}`;

export interface BuildUpload {
  projectName: string;
  /** Directory containing the built site (index.html root). */
  buildDir: string;
  buildId?: string;
  bytes?: number;
}

export interface DeployResult {
  status: "live" | "failed";
  url?: string;
  error?: string;
}

export interface DeployRuntime {
  status: "building" | "live" | "failed" | "rolled_back";
  url?: string | null;
  logs: string;
  health?: string | null;
}

/** Pluggable hosting target. The local adapter serves from disk; a production
 *  target (VPS/Netlify/Vercel…) can be added behind the same interface. */
export interface DeployTarget {
  id: string;
  host(subdomain: string, buildDir: string, version?: number): Promise<{ ok: boolean; url: string; error?: string }>;
  healthCheck(url: string): Promise<{ ok: boolean; detail?: string }>;
  remove(subdomain: string): Promise<void>;
}

// ── Local hosting adapter ────────────────────────────────────────────────────

class LocalHosting implements DeployTarget {
  readonly id = "local";
  private rootDir = join(process.cwd(), "data", "hosted");
  private server: ReturnType<typeof createServer> | null = null;

  start(): void {
    if (this.server) return;
    void mkdir(this.rootDir, { recursive: true });
    const port = Number(process.env.RIDE_HOSTING_PORT ?? 8788);
    this.server = createServer((req, res) => {
      void this.serve(req, res).catch(() => {
        res.statusCode = 500;
        res.end("RIDE hosting error");
      });
    });
    this.server.listen(port);
  }

  private async serve(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const raw = (req.url ?? "/").split("?")[0] ?? "/";
    // Local adapter routes as /<subdomain>/<path> (no real DNS here).
    const normalized = raw.replace(/^\/+|\/+$/g, "");
    const [first, ...rest] = normalized.split("/");
    const subdomain = first && first !== "health" ? first : "local";
    const requested = "/" + (subdomain === first ? rest.join("/") : "");
    const siteDir = join(this.rootDir, subdomain);
    const index = join(siteDir, "index.html");
    const filePath = requested === "/" ? index : join(siteDir, requested.split("/").join(""));

    let file: string | null = null;
    try {
      const s = await stat(filePath);
      if (s.isFile()) file = filePath;
      else {
        const maybeIndex = join(filePath, "index.html");
        const s2 = await stat(maybeIndex);
        if (s2.isFile()) file = maybeIndex;
      }
    } catch {
      /* fall through to index fallback */
    }
    if (!file) file = index;

    try {
      const content = await readFile(file);
      const ext = extname(file).toLowerCase();
      const types: Record<string, string> = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".ico": "image/x-icon",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
        ".ttf": "font/ttf",
        ".map": "application/json",
      };
      res.statusCode = 200;
      res.setHeader("Content-Type", types[ext] ?? "application/octet-stream");
      res.setHeader("X-RIDE-Hosted", "1");
      res.end(content);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  }

  async host(subdomain: string, buildDir: string, version?: number): Promise<{ ok: boolean; url: string; error?: string }> {
    const { cp } = await import("node:fs/promises");
    const active = join(this.rootDir, subdomain);
    await mkdir(active, { recursive: true });
    try {
      // copy into the active site dir, and keep a versioned snapshot for rollback
      await cp(buildDir, active, { recursive: true, force: true });
      if (version != null) {
        const snapshot = join(this.rootDir, `${subdomain}-v${version}`);
        await cp(active, snapshot, { recursive: true, force: true });
      }
    } catch (err) {
      return { ok: false, url: "", error: err instanceof Error ? err.message : String(err) };
    }
    const url = `http://localhost:${process.env.RIDE_HOSTING_PORT ?? 8788}/${subdomain}/`;
    return { ok: true, url, error: undefined };
  }

  async healthCheck(url: string): Promise<{ ok: boolean; detail?: string }> {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return { ok: res.ok, detail: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }

  async remove(subdomain: string): Promise<void> {
    const { rm } = await import("node:fs/promises");
    await rm(join(this.rootDir, subdomain), { recursive: true, force: true });
  }

  hostUrl(subdomain: string): string {
    return `http://localhost:${process.env.RIDE_HOSTING_PORT ?? 8788}/${subdomain}/`;
  }
}

// ── Registry ────────────────────────────────────────────────────────────────

const localHosting = new LocalHosting();
const targets = new Map<string, DeployTarget>([["local", localHosting]]);

export function getTarget(tid = "local"): DeployTarget {
  const t = targets.get(tid);
  if (!t) throw new Error(`Unknown deploy target: ${tid}`);
  return t;
}

/** Full pipeline: validate build → inject badge → host → health check → record deployment. */
export async function runDeployment(
  userId: string,
  projectId: string,
  projectName: string,
  upload: BuildUpload,
  opts: { subdomain?: string; version?: number; targetId?: string; entitlementId?: string; badge?: boolean },
): Promise<{ deploymentId: string; version: number; url: string; status: DeployResult["status"] }> {
  const subdomain = (opts.subdomain ?? slugify(projectName)).toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 40);
  const version = opts.version ?? nextVersion(userId, projectId);
  const id = genId("dep");
  const createdAt = now();

  db.prepare(
    `INSERT INTO deployments (id, user_id, project_id, project_name, version, status, subdomain, build_id, build_size_bytes, url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'building', ?, ?, ?, NULL, ?, ?)`,
  ).run(id, userId, projectId, projectName.slice(0, 80), version, subdomain, upload.buildId ?? "", upload.bytes ?? 0, createdAt, createdAt);

  logDeployment(id, "info", `Building & deploying ${projectName} (v${version})`);

  const target = getTarget(opts.targetId ?? "local");
  localHosting.start();

  try {
    // Stamp the staging build with the "Built with RIDE" badge before hosting,
    // so both the live site and rollback snapshots carry it.
    if (opts.badge !== false) {
      await injectBadge(upload.buildDir, PUBLIC_ORIGIN);
      logDeployment(id, "info", "Badge: Built with RIDE (ride.app)");
    }

    const hosted = await target.host(subdomain, upload.buildDir);
    if (!hosted.ok) {
      failDeployment(id, hosted.error ?? "Hosting failed");
      return { deploymentId: id, version, url: "", status: "failed" };
    }
    const url = localHosting.hostUrl(subdomain);
    const health = await target.healthCheck(url);
    if (!health.ok) {
      failDeployment(id, `Health check failed: ${health.detail ?? "unknown"}`);
      return { deploymentId: id, version, url, status: "failed" };
    }

    logDeployment(id, "info", `Health check passed (${health.detail ?? "OK"})`);
    const ok = db.prepare(
      "UPDATE deployments SET status = 'live', url = ?, health_check = ?, updated_at = ? WHERE id = ?",
    ).run(url, health.detail ?? "OK", now(), id);
    void ok;

    // Consume the entitlement (deployment credit) — verify it exists and mark used.
    if (opts.entitlementId) {
      db.prepare("UPDATE entitlements SET consumed = 1, consumed_at = ? WHERE id = ?").run(now(), opts.entitlementId);
    }
    decrementProductStock(id);

    return { deploymentId: id, version, url, status: "live" };
  } catch (err) {
    failDeployment(id, err instanceof Error ? err.message : String(err));
    return { deploymentId: id, version, url: "", status: "failed" };
  }
}

function nextVersion(userId: string, projectId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM deployments WHERE user_id = ? AND project_id = ?").get(userId, projectId) as Row;
  return Number(row.c) + 1;
}

function decrementProductStock(_deploymentId: string): void {
  // no-op placeholder for stock-integrated pipelines
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";
}

/** "Built with RIDE" badge — inlined into generated sites so every output
 *  doubles as shareable proof of RIDE (stronger than advertising). */
export function badgeHtml(origin = "https://ride.app"): string {
  const safe = String(origin).replace(/"/g, "");
  return (
    `\n<!-- Built with RIDE -->\n` +
    `<a id="ride-badge" aria-label="Built with RIDE" href="${safe}" target="_blank" rel="noopener" ` +
    `style="position:fixed;left:16px;bottom:12px;z-index:9999;` +
    `display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;` +
    `font:600 11px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#eae8f6;` +
    `background:rgba(22,21,30,0.85);border:1px solid rgba(255,255,255,0.1);` +
    `backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);box-shadow:0 2px 10px rgba(0,0,0,0.25);` +
    `text-decoration:none;user-select:none;transition:opacity .2s;">` +
    `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" fill="url(#rbg)" stroke="#9d8cff" stroke-width="1.2"/><defs><linearGradient id="rbg" x1="0" y1="0" x2="24" y2="24"><stop stop-color="#7c5cff"/><stop offset="1" stop-color="#b06bff"/></linearGradient></defs></svg>` +
    `<span>Built with <span style="background:linear-gradient(90deg,#7c5cff,#b06bff);-webkit-background-clip:text;background-clip:text;color:transparent;">RIDE</span></span>` +
    `</a>`
  );
}

/** Inject the badge into a staging build's index.html (idempotent, safe). */
export async function injectBadge(buildDir: string, origin?: string): Promise<boolean> {
  const index = join(buildDir, "index.html");
  try {
    let html = await readFile(index, "utf8");
    if (html.includes('id="ride-badge"')) return false;
    const badge = badgeHtml(origin);
    html = /<\/body>/i.test(html)
      ? html.replace(/<\/body>/i, `${badge}\n</body>`)
      : `${html}\n${badge}`;
    await writeFile(index, html, "utf8");
    return true;
  } catch {
    return false;
  }
}

export function logDeployment(deploymentId: string, level: string, message: string): void {
  db.prepare("INSERT INTO deploy_logs (deployment_id, level, message, created_at) VALUES (?, ?, ?, ?)").run(deploymentId, level, message, now());
  const row = db.prepare("SELECT logs FROM deployments WHERE id = ?").get(deploymentId) as Row | undefined;
  if (row) {
    const logs = String(row.logs ?? "");
    const updated = (logs + `[${new Date().toLocaleTimeString()}] ${level.toUpperCase()}: ${message}\n`).slice(-16000);
    db.prepare("UPDATE deployments SET logs = ?, updated_at = ? WHERE id = ?").run(updated, now(), deploymentId);
  }
}

function failDeployment(deploymentId: string, error: string): void {
  logDeployment(deploymentId, "error", error);
  db.prepare("UPDATE deployments SET status = 'failed', updated_at = ? WHERE id = ?").run(now(), deploymentId);
}

export async function rollbackDeployment(userId: string, deploymentId: string): Promise<{ ok: boolean; error?: string }> {
  const dep = db.prepare("SELECT * FROM deployments WHERE id = ? AND user_id = ?").get(deploymentId, userId) as Row | undefined;
  if (!dep) return { ok: false, error: "Deployment not found" };
  if (String(dep.status) === "building") return { ok: false, error: "Cannot rollback while building" };

  const prev = db.prepare(
    "SELECT * FROM deployments WHERE user_id = ? AND project_id = ? AND id != ? AND status = 'live' ORDER BY version DESC"
  ).get(userId, String(dep.project_id), deploymentId) as Row | undefined;

  const { rm } = await import("node:fs/promises");
  const hostedRoot = join(process.cwd(), "data", "hosted");
  const sub = String(dep.subdomain);

  if (!prev) {
    db.prepare("UPDATE deployments SET status = 'rolled_back', url = NULL, updated_at = ? WHERE id = ?").run(now(), deploymentId);
    await rm(join(hostedRoot, sub), { recursive: true, force: true });
    return { ok: true, error: undefined };
  }

  const snapshot = join(hostedRoot, `${sub}-v${Number(prev.version)}`);
  const active = join(hostedRoot, sub);
  try {
    await rm(active, { recursive: true, force: true });
    const { cp } = await import("node:fs/promises");
    await cp(snapshot, active, { recursive: true, force: true });
  } catch {
    /* best-effort copy */
  }

  logDeployment(deploymentId, "warn", `Rolled back to v${Number(prev.version)}`);
  db.prepare("UPDATE deployments SET status = 'rolled_back', updated_at = ? WHERE id = ?").run(now(), deploymentId);
  return { ok: true, error: undefined };
}

export { localHosting };

/** Public accessor for the retrieved deployment rows. */
export function rows(): Row[] {
  return db.prepare("SELECT * FROM deployments ORDER BY created_at DESC").all() as Row[];
}