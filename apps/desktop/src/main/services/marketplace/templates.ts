import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, copyFile, access, stat } from "node:fs/promises";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import { app, dialog } from "electron";
import AdmZip from "adm-zip";
import {
  MarketplaceStore,
  type MarketplaceListing,
  type MarketplacePersistence,
  type PurchaseRecord,
  type EarningsRecord,
} from "@ride/marketplace";

/**
 * ─── Template marketplace service (main process) ────────────────────────────
 *
 * Persists the marketplace store to disk (listings, purchases, earnings) and
 * handles the real template lifecycle:
 *
 *   upload (workspace / folder / zip) → staged bundle + stack detection
 *   submit → pending listing with a bundleRef on disk
 *   purchase → buyer owns the bundle
 *   import → bundle extracted into a chosen destination folder
 *
 * Bundles live under userData/marketplace/bundles/<id>.zip and are never
 * extracted next to RIDE's own files — buyers pick where templates land.
 */

export type BundleSource =
  | { type: "workspace" }
  | { type: "folder"; path: string }
  | { type: "zip"; path: string };

export interface BundleInfo {
  bundleId: string;
  zipPath: string;
  rootName: string;
  framework: string;
  language: string;
  fileCount: number;
  sizeBytes: number;
  deps: string[];
}

export interface StackInfo {
  framework: string;
  language: string;
  deps: string[];
}

/** Directories never shipped inside a marketplace bundle. */
const EXCLUDED_DIRS = new Set([
  "node_modules", ".git", "dist", "out", "build", ".next", ".turbo", ".vite",
  ".cache", "__pycache__", ".venv", "venv", ".idea", ".vscode", "coverage",
  "output", "win-unpacked", "release",
]);

/** Node package.json → framework detection (deterministic, no LLM). */
const FRAMEWORK_HINTS: Array<[string, string[]]> = [
  ["Next.js", ["next"]],
  ["Nuxt", ["nuxt"]],
  ["Vite React", ["vite", "react"]],
  ["React", ["react"]],
  ["Vue", ["vue"]],
  ["SvelteKit", ["@sveltejs/kit"]],
  ["Svelte", ["svelte"]],
  ["Astro", ["astro"]],
  ["Angular", ["@angular/core"]],
  ["Remix", ["@remix-run/react"]],
  ["Gatsby", ["gatsby"]],
  ["Express", ["express"]],
  ["Fastify", ["fastify"]],
  ["Electron", ["electron"]],
  ["Node.js", []],
];

const LANG_HINTS: Array<[string, RegExp]> = [
  ["TypeScript", /\.(ts|tsx)$/],
  ["JavaScript", /\.(js|jsx|mjs|cjs)$/],
  ["Python", /\.py$/],
  ["Java", /\.java$/],
  ["C++", /\.(cpp|cc|hpp)$/],
  ["C#", /\.cs$/],
  ["Go", /\.go$/],
  ["Rust", /\.rs$/],
  ["Ruby", /\.rb$/],
  ["PHP", /\.php$/],
];

/** Sync JSON persistence — the MarketplaceStore interface is synchronous. */
export class JsonMarketplacePersistence implements MarketplacePersistence {
  private dir: string;

  constructor(dir?: string) {
    this.dir = dir ?? join(app.getPath("userData"), "marketplace");
    mkdirSync(this.dir, { recursive: true });
  }

  private load<T>(file: string): T[] {
    try {
      const raw = readFileSync(join(this.dir, file), "utf8");
      const parsed = JSON.parse(raw) as T[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private save(file: string, data: unknown[]): void {
    writeFileSync(join(this.dir, file), JSON.stringify(data, null, 2), "utf8");
  }

  loadPurchases(): PurchaseRecord[] {
    return this.load<PurchaseRecord>("purchases.json");
  }
  savePurchases(purchases: PurchaseRecord[]): void {
    this.save("purchases.json", purchases);
  }
  loadEarnings(): EarningsRecord[] {
    return this.load<EarningsRecord>("earnings.json");
  }
  saveEarnings(earnings: EarningsRecord[]): void {
    this.save("earnings.json", earnings);
  }
  loadListings(): MarketplaceListing[] {
    return this.load<MarketplaceListing>("listings.json");
  }
  saveListings(listings: MarketplaceListing[]): void {
    this.save("listings.json", listings);
  }
}

export class TemplateMarketplaceService {
  readonly store: MarketplaceStore;
  private uploadsDir: string;
  private bundlesDir: string;

  constructor(store?: MarketplaceStore) {
    this.store = store ?? new MarketplaceStore(new JsonMarketplacePersistence());
    this.uploadsDir = join(app.getPath("userData"), "marketplace", "uploads");
    this.bundlesDir = join(app.getPath("userData"), "marketplace", "bundles");
  }

  async init(): Promise<void> {
    await mkdir(this.uploadsDir, { recursive: true });
    await mkdir(this.bundlesDir, { recursive: true });
  }

  // ── Native dialogs ───────────────────────────────────────────────────────

  async pickSourceFolder(): Promise<string | null> {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  }

  async pickSourceZip(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "ZIP archives", extensions: ["zip"] }],
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  }

  async pickImportDestination(): Promise<string | null> {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory", "createDirectory"] });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  }

  // ── Upload preparation ───────────────────────────────────────────────────

  /**
   * Stage an upload: copy (workspace/folder) or extract (zip) into an upload
   * sandbox, detect the stack, and zip the result into bundles/<id>.zip.
   */
  async prepareBundle(source: BundleSource, workspaceRoot?: string): Promise<BundleInfo> {
    const bundleId = `bnd-${randomUUID().slice(0, 12)}`;
    const workDir = join(this.uploadsDir, bundleId);
    await mkdir(workDir, { recursive: true });

    let rootName = "project";
    if (source.type === "workspace") {
      if (!workspaceRoot) throw new Error("No workspace open");
      rootName = basename(workspaceRoot);
      await copyTree(workspaceRoot, join(workDir, rootName));
    } else if (source.type === "folder") {
      rootName = basename(source.path);
      await copyTree(source.path, join(workDir, rootName));
    } else if (source.type === "zip") {
      const zip = new AdmZip(source.path);
      const first = zip.getEntries()[0]?.entryName ?? "";
      rootName = first.split("/")[0] || "project";
      zip.extractAllTo(workDir, true);
    } else {
      throw new Error("Unsupported upload source");
    }

    const stack = await detectStack(workDir);
    const fileCount = await countFiles(workDir);
    const sizeBytes = await dirSize(workDir);

    const zipPath = join(this.bundlesDir, `${bundleId}.zip`);
    await mkdir(this.bundlesDir, { recursive: true });
    const zip = new AdmZip();
    zip.addLocalFolder(workDir, basename(workDir));
    zip.addFile(
      "ride-bundle.json",
      Buffer.from(
        JSON.stringify(
          { id: bundleId, rootName, framework: stack.framework, language: stack.language, createdAt: Date.now() },
          null,
          2,
        ),
        "utf8",
      ),
    );
    zip.writeZip(zipPath);

    return { bundleId, zipPath, rootName, ...stack, fileCount, sizeBytes };
  }

  /** Import a purchased (or free) template bundle into a destination folder. */
  async importBundle(listing: MarketplaceListing, buyerId: string, dest?: string): Promise<string> {
    if (listing.status !== "published") throw new Error("Listing is not published");
    if (listing.pricePaise > 0 && !this.store.hasPurchased(listing.id, buyerId)) {
      throw new Error("Purchase required before importing this template");
    }
    const bundleRef = listing.bundleRef;
    if (!bundleRef) throw new Error("This listing has no downloadable bundle");

    const target = dest ?? (await this.pickImportDestination());
    if (!target) throw new Error("No destination chosen");

    const zipPath = join(this.bundlesDir, `${bundleRef}.zip`);
    try {
      await access(zipPath);
    } catch {
      throw new Error("Bundle missing on disk — please contact the creator");
    }

    const outDir = join(target, slug(listing.title));
    await mkdir(outDir, { recursive: true });
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(outDir, true);
    return outDir;
  }
}

// ── Stack detection (deterministic) ────────────────────────────────────────

export async function detectStack(root: string): Promise<StackInfo> {
  const depNames: string[] = [];
  let framework = "";
  let language = "";

  const pkgPath = join(root, "package.json");
  try {
    const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const all = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    depNames.push(...Object.keys(all));
    for (const [name, hints] of FRAMEWORK_HINTS) {
      if (hints.length === 0) break;
      if (hints.every((h) => h in all)) {
        framework = name;
        break;
      }
    }
    if (!framework) framework = "Node.js";
  } catch {
    /* no package.json */
  }

  if (!framework) {
    if (await exists(join(root, "requirements.txt"))) {
      framework = "Python";
      try {
        depNames.push(
          ...(await readFile(join(root, "requirements.txt"), "utf8"))
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter((l) => l && !l.startsWith("#"))
            .map((l) => l.split(/[<>=!~[]/)[0]!),
        );
      } catch {
        /* ignore */
      }
    } else if (await exists(join(root, "pyproject.toml"))) {
      framework = "Python";
    } else if (await exists(join(root, "go.mod"))) {
      framework = "Go";
    } else if (await exists(join(root, "Cargo.toml"))) {
      framework = "Rust";
    } else if (await exists(join(root, "composer.json"))) {
      framework = "PHP";
    } else {
      framework = "Plain HTML/CSS/JS";
    }
  }

  for (const [lang, re] of LANG_HINTS) {
    const found = await findFile(root, re, 4000);
    if (found) {
      language = lang;
      break;
    }
  }
  if (!language) language = "Unknown";

  return { framework, language, deps: depNames.slice(0, 60) };
}

// ── Filesystem helpers ─────────────────────────────────────────────────────

async function copyTree(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const s = join(src, entry.name);
    const d = join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyTree(s, d);
    } else {
      await copyFile(s, d);
    }
  }
}

async function countFiles(root: string): Promise<number> {
  let count = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) await walk(join(dir, entry.name));
      } else {
        count++;
      }
    }
  };
  await walk(root);
  return count;
}

async function dirSize(root: string): Promise<number> {
  let total = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) await walk(join(dir, entry.name));
      } else {
        const st = await stat(join(dir, entry.name));
        total += st.size;
      }
    }
  };
  await walk(root);
  return total;
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function findFile(root: string, re: RegExp, limit: number): Promise<string | null> {
  let checked = 0;
  let found: string | null = null;
  const walk = async (dir: string): Promise<void> => {
    if (found || checked >= limit) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (found || checked >= limit) return;
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) await walk(join(dir, entry.name));
      } else {
        checked++;
        if (re.test(entry.name)) {
          found = join(dir, entry.name);
          return;
        }
      }
    }
  };
  await walk(root);
  return found;
}

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "template"
  );
}

export function hasFiles(dir: string): boolean {
  return existsSync(dir);
}