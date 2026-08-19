import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, readdir, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname, extname, basename, sep } from "node:path";
import { toPosix } from "@ride/project-db";
import type { ToolRuntime, McpBridge } from "@ride/agent-bridge";
import type { WorkspaceManager } from "./workspace";
import { devServer } from "./preview/devServer";
import { browserAgent } from "./browserAgent";
import { mcpRegistry } from "./mcpRegistry";

export function mcpBridge(): McpBridge {
  return {
    list: () =>
      mcpRegistry.allTools().map((t) => ({
        serverName: t.serverName,
        name: t.name,
        description: t.description,
      })),
    call: (serverName, toolName, args) => mcpRegistry.call(serverName, toolName, args),
  };
}

const exec = promisify(execFile) as (file: string, args?: string[], options?: { cwd?: string; timeout?: number; encoding?: string; env?: Record<string, string>; windowsHide?: boolean }) => Promise<{ stdout: string; stderr: string }>;

const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".html", ".md", ".mdx",
  ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".yaml", ".yml", ".toml", ".ini",
  ".sh", ".bat", ".ps1", ".sql", ".xml", ".txt", ".vue", ".svelte", ".astro", ".env", ".sv", ".v", ".vhd",
]);

function insideWorkspace(root: string, target: string): boolean {
  const resRoot = root.endsWith(sep) ? root : root + sep;
  return target === root || target.startsWith(resRoot);
}

async function webSearch(query: string, maxResults = 10): Promise<string> {
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "RIDE/0.1" } });
    const data = await res.json() as { Abstract?: string; AbstractText?: string; RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Result?: string }>; Results?: Array<{ text?: string; url?: string; title?: string }> };
    const results: string[] = [];
    if (data.AbstractText) results.push(`Summary: ${data.AbstractText}`);
    if (data.RelatedTopics?.length) {
      for (const topic of data.RelatedTopics.slice(0, maxResults)) {
        if (topic.Text && topic.FirstURL) results.push(`- ${topic.Text} (${topic.FirstURL})`);
        else if (topic.Result) results.push(`- ${topic.Result}`);
      }
    }
    if (data.Results?.length) {
      for (const r of data.Results.slice(0, maxResults)) {
        if (r.text && r.url) results.push(`- ${r.text} (${r.url})`);
      }
    }
    return results.length ? results.join("\n") : "No results found.";
  } catch (err) {
    return `Search failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function webFetch(url: string, maxLength = 8000): Promise<string> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "RIDE/0.1" }, redirect: "follow" });
    if (!res.ok) return `Fetch failed: HTTP ${res.status}`;
    const html = await res.text();
    // Simple extraction: remove scripts/styles, get text content
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
    return text || "No readable content extracted.";
  } catch (err) {
    return `Fetch failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export function buildToolResolver(workspace: WorkspaceManager): ToolRuntime {
  const root = workspace.root;
  if (!root) throw new Error("No workspace open");

  const resolve: ToolRuntime["resolve"] = async (tool, input) => {
    const req = (input ?? {}) as Record<string, unknown>;
    try {
      switch (tool) {
        case "read": {
          const filePath = String(req.filePath ?? "");
          if (!filePath) return { ok: false, error: "Missing filePath" };
          const content = await readFile(filePath, "utf8");
          return { ok: true, output: content.length > 200_000 ? content.slice(0, 200_000) + "\n…(truncated)" : content };
        }
        case "write": {
          const filePath = String(req.filePath ?? "");
          const content = String(req.content ?? "");
          if (!filePath) return { ok: false, error: "Missing filePath" };
          await mkdir(dirname(filePath), { recursive: true });
          await writeFile(filePath, content, "utf8");
          workspace.projectDb?.removeFile(filePath);
          const { quickParse } = await import("./workspace");
          const { langForPath } = await import("@ride/project-db");
          const lang = langForPath(filePath);
          const { symbols, imports } = quickParse(content, lang);
          workspace.projectDb?.upsertFile(filePath, lang, content, symbols, imports);
          return { ok: true, output: `wrote ${filePath} (${content.length} chars)` };
        }
        case "delete": {
          const paths = Array.isArray(req.paths) ? (req.paths as string[]) : req.path ? [String(req.path)] : [];
          if (paths.length === 0) return { ok: false, error: "Missing path" };
          const out: string[] = [];
          for (const p of paths) {
            if (!insideWorkspace(root, p)) return { ok: false, error: `Refusing to delete outside workspace: ${p}` };
            await rm(p, { recursive: true, force: true });
            workspace.projectDb?.removeFile(p);
            out.push(`deleted ${p}`);
          }
          return { ok: true, output: out.join("\n") };
        }
        case "rename": {
          const from = String(req.from ?? "");
          const to = String(req.to ?? "");
          if (!from || !to) return { ok: false, error: "Missing from/to" };
          if (!insideWorkspace(root, from)) return { ok: false, error: "Refusing to rename outside workspace" };
          await mkdir(dirname(to), { recursive: true });
          await rename(from, to);
          workspace.projectDb?.removeFile(from);
          return { ok: true, output: `renamed ${from} → ${to}` };
        }
        case "list": {
          const dir = String(req.path ?? root);
          const entries = await readdir(dir, { withFileTypes: true });
          const lines = entries.map((e) => `${e.isDirectory() ? "dir " : "file"} ${e.name}`);
          return { ok: true, output: `Contents of ${dir}:\n` + (lines.join("\n") || "(empty)") };
        }
        case "search": {
          const query = String(req.query ?? "");
          if (!workspace.projectDb) return { ok: false, error: "Project index not ready" };
          const hits = workspace.projectDb.searchContent(query, 20);
          if (hits.length === 0) return { ok: true, output: "No matches." };
          return {
            ok: true,
            output: hits.map((h) => `${h.path}: ${h.snippet}`).join("\n"),
          };
        }
        case "grep": {
          const pattern = String(req.pattern ?? "");
          const onlyDir = req.path ? String(req.path) : null;
          if (!pattern) return { ok: false, error: "Missing pattern" };
          let re: RegExp;
          try {
            re = new RegExp(pattern, "i");
          } catch {
            return { ok: false, error: "Invalid regex" };
          }
          const matches: string[] = [];
          const walk = (dir: string, depth: number): void => {
            if (depth > 5 || matches.length >= 40) return;
            let entries;
            try {
              entries = readdirSync(dir, { withFileTypes: true });
            } catch {
              return;
            }
            for (const e of entries) {
              const full = join(dir, e.name);
              if (e.isDirectory()) {
                if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name === ".vite" || e.name === "out" || e.name === ".turbo") continue;
                walk(full, depth + 1);
              } else if (e.isFile() && TEXT_EXTS.has(extname(e.name).toLowerCase())) {
                try {
                  const content = readFileSync(full, "utf8");
                  for (const line of content.split("\n")) {
                    if (re.test(line)) {
                      matches.push(`${toPosix(full)}:${line.slice(0, 200)}`);
                      if (matches.length >= 40) break;
                    }
                  }
                } catch {
                  /* binary/unreadable */
                }
              }
            }
          };
          walk(onlyDir ?? root, 0);
          return { ok: true, output: matches.length ? matches.join("\n") : "No matches." };
        }
        case "bash": {
          const command = String(req.command ?? "");
          if (!command) return { ok: false, error: "Missing command" };
          const cwd = req.cwd ? String(req.cwd) : root;
          const result = await exec(process.platform === "win32" ? "cmd.exe" : "sh", process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command], {
            cwd,
            timeout: 120_000,
            encoding: "utf8",
            windowsHide: true,
            env: { ...process.env, FORCE_COLOR: "0" },
          }).catch(async (e: { stdout?: string; stderr?: string; message?: string; killed?: boolean }) => {
            return {
              stdout: e.stdout ?? "",
              stderr: (e.stderr ?? e.message ?? "").slice(0, 2000),
              timedOut: Boolean(e.killed),
            };
          });
          const out = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
          return { ok: true, output: (out === "" ? "(no output)" : out).slice(0, 12000) };
        }
        case "git": {
          return gitOp(workspace, req);
        }
        case "preview": {
          const op = String(req.op ?? "status");
          if (op === "start") {
            const status = await devServer.start(root);
            return { ok: true, output: status.url ? `Preview running at ${status.url} (state: ${status.state})` : `Preview state: ${status.state} (${status.phase})` };
          }
          if (op === "stop") {
            devServer.stop();
            return { ok: true, output: "Preview stopped." };
          }
          const status = devServer.status();
          return { ok: true, output: `Preview state: ${status.state}${status.url ? ` at ${status.url}` : ""}${status.phase ? ` — ${status.phase}` : ""}` };
        }
        case "browse": {
          const query = String(req.query ?? "");
          const maxResults = typeof req.maxResults === "number" ? req.maxResults : 10;
          if (!query) return { ok: false, error: "Missing query" };
          const result = await webSearch(query, maxResults);
          return { ok: true, output: result };
        }
        case "webfetch": {
          const url = String(req.url ?? "");
          const maxLength = typeof req.maxLength === "number" ? req.maxLength : 8000;
          if (!url) return { ok: false, error: "Missing url" };
          try {
            new URL(url);
          } catch {
            return { ok: false, error: "Invalid URL" };
          }
          const result = await webFetch(url, maxLength);
          return { ok: true, output: result };
        }
        case "browser": {
          const op = String(req.op ?? "status");
          const url = req.url ? String(req.url) : "";
          const selector = req.selector ? String(req.selector) : "";
          const text = req.text ? String(req.text) : "";
          const value = req.value ? String(req.value) : "";
          const direction = String(req.direction ?? "down") as "down" | "up" | "top" | "bottom";
          const index = typeof req.index === "number" ? req.index : 0;
          switch (op) {
            case "open":
              return browserAgent.open(url);
            case "navigate":
              return browserAgent.navigate(url);
            case "click":
              return browserAgent.click(selector, index);
            case "type":
              return browserAgent.type(selector, text);
            case "select":
              return browserAgent.select(selector, value);
            case "scroll":
              return browserAgent.scroll(direction);
            case "extract":
              return browserAgent.extract(selector || undefined);
            case "screenshot": {
              const artifactsDir = join(root, ".ride", "artifacts");
              return browserAgent.screenshot(artifactsDir);
            }
            case "close":
              browserAgent.close();
              return { ok: true, output: "Browser closed." };
            case "status":
            default:
              return browserAgent.status();
          }
        }
        default:
          return { ok: false, error: `Unknown tool: ${tool}` };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  return { resolve };
}

async function gitOp(workspace: WorkspaceManager, req: Record<string, unknown>): Promise<{ ok: boolean; output?: string; error?: string }> {
  const op = String(req.op ?? "status");
  const arg = req.arg ? String(req.arg) : "";
  const engine = workspace.engine;
  try {
    switch (op) {
      case "status": {
        const s = await engine.status();
        const lines = [
          `branch: ${s.branch}`,
          `staged: ${s.staged.length ? s.staged.join(", ") : "—"}`,
          `unstaged: ${s.unstaged.length ? s.unstaged.join(", ") : "—"}`,
          `untracked: ${s.untracked.length ? s.untracked.join(", ") : "—"}`,
          `conflicts: ${s.conflicts.length ? s.conflicts.join(", ") : "—"}`,
        ];
        return { ok: true, output: lines.join("\n") };
      }
      case "diff": {
        const diffs = await engine.diff();
        return { ok: true, output: diffs.map((d) => `${d.status} ${d.path} (${d.hunks.length} hunks)`).join("\n") || "Working tree clean." };
      }
      case "staged": {
        const diffs = await engine.diffStaged();
        return { ok: true, output: diffs.map((d) => `${d.status} ${d.path}`).join("\n") || "Nothing staged." };
      }
      case "log": {
        const log = await engine.log(20);
        return { ok: true, output: log.map((l) => `${l.hash.slice(0, 8)} ${l.date} ${l.subject} (${l.author})`).join("\n") || "No commits." };
      }
      case "branches": {
        const { current, branches } = await engine.branches();
        return { ok: true, output: `current: ${current}\n` + branches.join("\n") };
      }
      case "checkout": {
        if (!arg) return { ok: false, error: "checkout requires a branch name" };
        await engine.checkout(arg);
        return { ok: true, output: `Switched to branch ${arg}` };
      }
      case "commit": {
        if (!arg) return { ok: false, error: "commit requires a message" };
        await engine.stage((await engine.status()).untracked.concat((await engine.status()).unstaged));
        await engine.commit(arg);
        return { ok: true, output: `Committed: ${arg}` };
      }
      case "init": {
        if (!(await engine.isRepo())) await engine.init();
        return { ok: true, output: "Initialized git repository (or it already exists)." };
      }
      case "stash": {
        await exec("git", ["stash", "push", "-u"], { cwd: workspace.root ?? undefined });
        return { ok: true, output: "Changes stashed." };
      }
      case "restore": {
        if (!arg) return { ok: false, error: "restore requires file paths" };
        const paths = arg.split(/\s+/).filter((p) => p && !p.includes(".."));
        await exec("git", ["restore", "--", ...paths], { cwd: workspace.root ?? undefined });
        return { ok: true, output: `Restored: ${paths.join(", ")}` };
      }
      default:
        return { ok: false, error: `Unknown git op: ${op}` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export { basename as pathBaseName };