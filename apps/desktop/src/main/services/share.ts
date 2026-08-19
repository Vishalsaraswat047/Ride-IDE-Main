import { execFile } from "node:child_process";
import { readdir, stat, readFile } from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { promisify } from "node:util";
import AdmZip from "adm-zip";
import type { ShareExportResult, ShareDownloadResult } from "@ride/contracts";

const execFileP = promisify(execFile);

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "out", "target", ".rides", ".opencode", ".next", ".turbo", "coverage"]);
const SKIP_FILES = new Set([".DS_Store", "Thumbs.db"]);

/** "Built with RIDE" badge snippet — same markup the deploy pipeline injects. */
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

/** Share text — the easy "I built this with RIDE." line. */
export function shareText(projectName: string, url?: string | null): string {
  const line = `I built ${projectName} with RIDE.`;
  return url ? `${line}\n\n${url}` : line;
}

async function collectFiles(dir: string, out: Array<{ rel: string; abs: string }>, root: string): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      await collectFiles(join(dir, e.name), out, root);
    } else if (e.isFile()) {
      if (SKIP_FILES.has(e.name)) continue;
      const abs = join(dir, e.name);
      const s = await stat(abs);
      if (s.size > 25 * 1024 * 1024) continue;
      out.push({ rel: relative(root, abs).split("\\").join("/"), abs });
    }
  }
}

/** Zip the project (skipping node_modules/.git/dist) and resolve to a path. */
export async function downloadWorkspaceZip(workspacePath: string, saveTo: string): Promise<ShareDownloadResult> {
  try {
    const files: Array<{ rel: string; abs: string }> = [];
    await collectFiles(workspacePath, files, workspacePath);
    const zip = new AdmZip();
    for (const f of files) {
      zip.addFile(f.rel, await readFile(f.abs));
    }
    zip.writeZip(saveTo);
    return { ok: true, path: saveTo, sizeBytes: files.length ? undefined : 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function hasCommand(cmd: string): Promise<boolean> {
  try {
    await execFileP(cmd, ["--version"], { timeout: 8000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function runIn(cwd: string, cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileP(cmd, args, { cwd, timeout: 180000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
    return { code: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

/** Export a project to GitHub via the gh CLI. Falls back to exact commands
 *  when gh (or auth) is unavailable, so sharing never dead-ends. */
export async function exportToGitHub(workspacePath: string, repoName: string, opts: { visibility?: "public" | "private" } = {}): Promise<ShareExportResult> {
  const name = repoName.trim() || basename(workspacePath);
  const gitExists = await hasCommand("git");
  if (!gitExists) {
    return { ok: false, message: "git is not installed on this machine", commands: ["Install git from https://git-scm.com"] };
  }

  const ensure = await runIn(workspacePath, "git", ["rev-parse", "--is-inside-work-tree"]);
  if (ensure.code !== 0) {
    const init = await runIn(workspacePath, "git", ["init", "-b", "main"]);
    if (init.code !== 0) return { ok: false, message: `git init failed: ${init.stderr}` };
    const gignore = join(workspacePath, ".gitignore");
    try {
      await stat(gignore);
    } catch {
      await import("node:fs/promises").then((fs) => fs.writeFile(gignore, "node_modules/\ndist/\nout/\n", "utf8"));
    }
    await runIn(workspacePath, "git", ["add", "-A"]);
    await runIn(workspacePath, "git", ["-c", "user.name=RIDE", "-c", "user.email=ride@users.noreply.github.com", "commit", "-m", "Initial commit by RIDE"]);
  }

  const ghExists = await hasCommand("gh");
  if (!ghExists) {
    return {
      ok: false,
      message: "GitHub CLI (gh) is not installed — create the repo on github.com, then push:",
      needsAuth: true,
      commands: [
        `git remote add origin https://github.com/YOUR_USERNAME/${name}.git`,
        "git push -u origin main",
      ],
    };
  }

  const auth = await runIn(workspacePath, "gh", ["auth", "status"]);
  if (auth.code !== 0) {
    return { ok: false, message: "GitHub CLI is not signed in", needsAuth: true, commands: ["gh auth login"] };
  }

  const flag = opts.visibility === "private" ? "--private" : "--public";
  const create = await runIn(workspacePath, "gh", ["repo", "create", name, "--source", ".", "--push", flag]);
  if (create.code !== 0) {
    const stderr = create.stderr || create.stdout;
    if (/exists|already/i.test(stderr)) {
      const push = await runIn(workspacePath, "git", ["push", "-u", "origin", "main"]);
      const view = await runIn(workspacePath, "gh", ["repo", "view", "--json", "url", "--jq", ".url"]);
      return {
        ok: push.code === 0,
        repoUrl: view.code === 0 ? view.stdout.trim() : `https://github.com/${name}`,
        message: push.code === 0 ? "Pushed to existing remote" : push.stderr,
      };
    }
    return { ok: false, message: stderr || "gh repo create failed" };
  }

  const view = await runIn(workspacePath, "gh", ["repo", "view", "--json", "url", "--jq", ".url"]);
  const repoUrl = view.code === 0 ? view.stdout.trim() : `https://github.com/${name}`;
  return { ok: true, repoUrl, message: "Repository created and pushed to GitHub" };
}