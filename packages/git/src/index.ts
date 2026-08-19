import { execFile, type ExecFileOptions } from "node:child_process";
import { promisify } from "node:util";
import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { DiffHunk, FileDiff, GitStatus } from "@ride/contracts";

const exec = promisify(execFile) as (
  file: string,
  args?: string[],
  options?: ExecFileOptions & { input?: string },
) => Promise<{ stdout: string; stderr: string }>;

export class GitEngine {
  constructor(private readonly root: string) {}

  protected async run(args: string[], opts: { input?: string; allowFail?: boolean } = {}): Promise<string> {
    try {
      const { stdout } = await exec("git", args, {
        cwd: this.root,
        encoding: "utf8",
        input: opts.input,
        maxBuffer: 64 * 1024 * 1024,
      });
      return stdout;
    } catch (err) {
      if (opts.allowFail) return "";
      const e = err as { stdout?: string; stderr?: string; message?: string };
      throw new Error(e.stderr?.trim() || e.message);
    }
  }

  async isRepo(): Promise<boolean> {
    try {
      await this.run(["rev-parse", "--is-inside-work-tree"]);
      return true;
    } catch {
      return false;
    }
  }

  async init(): Promise<void> {
    await this.run(["init"]);
  }

  async status(): Promise<GitStatus> {
    const isRepo = await this.isRepo();
    if (!isRepo) {
      return { branch: "", ahead: 0, behind: 0, staged: [], unstaged: [], untracked: [], conflicts: [] };
    }
    const branch = (await this.run(["rev-parse", "--abbrev-ref", "HEAD"], { allowFail: true })).trim() || "detached";
    const staged = await this.run(["diff", "--name-only", "--cached"], { allowFail: true });
    const unstaged = await this.run(["diff", "--name-only"], { allowFail: true });
    const untracked = await this.run(["ls-files", "--others", "--exclude-standard"], { allowFail: true });
    const conflicts = await this.run(["diff", "--name-only", "--diff-filter=U"], { allowFail: true });
    const aheadBehind = (await this.run(["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], { allowFail: true })).trim();
    let ahead = 0;
    let behind = 0;
    if (aheadBehind) {
      const parts = aheadBehind.split(/\s+/);
      ahead = Number(parts[0] ?? 0);
      behind = Number(parts[1] ?? 0);
    }
    return {
      branch,
      ahead,
      behind,
      staged: splitLines(staged),
      unstaged: splitLines(unstaged),
      untracked: splitLines(untracked),
      conflicts: splitLines(conflicts),
    };
  }

  async diff(path?: string): Promise<FileDiff[]> {
    const args = ["diff", "--no-color", "--unified=3"];
    if (path) args.push("--", path);
    const raw = await this.run(args, { allowFail: true });
    return parseDiff(raw);
  }

  async diffStaged(): Promise<FileDiff[]> {
    const raw = await this.run(["diff", "--cached", "--no-color", "--unified=3"], { allowFail: true });
    return parseDiff(raw);
  }

  async stage(paths: string[]): Promise<void> {
    await this.run(["add", "--", ...paths]);
  }

  async unstage(paths: string[]): Promise<void> {
    await this.run(["restore", "--staged", "--", ...paths]);
  }

  async commit(message: string): Promise<string> {
    const hash = (await this.run(["commit", "-m", message], { allowFail: true })).trim();
    return hash.split("\n").pop() ?? "";
  }

  async checkout(branch: string): Promise<void> {
    await this.run(["checkout", branch]);
  }

  async branches(): Promise<{ current: string; branches: string[] }> {
    const status = await this.status();
    const raw = await this.run(["branch", "--list"], { allowFail: true });
    return { current: status.branch, branches: splitLines(raw) };
  }

  async log(max = 30): Promise<{ hash: string; subject: string; author: string; date: string }[]> {
    const raw = await this.run(
      ["log", `--max-count=${max}`, "--format=%H%x1f%s%x1f%an%x1f%ad", "--date=short"],
      { allowFail: true },
    );
    return raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, author, date] = line.split("\x1f");
        return { hash: hash ?? "", subject: subject ?? "", author: author ?? "", date: date ?? "" };
      });
  }

  async blob(path: string, ref = "HEAD"): Promise<string | null> {
    try {
      return await this.run(["show", `${ref}:${path}`]);
    } catch {
      return null;
    }
  }

  /** Create a checkpoint commit of the whole working tree (used by permissions/rollback). */
  async checkpoint(message = "ride-checkpoint"): Promise<string | null> {
    if (!(await this.isRepo())) return null;
    await this.run(["add", "-A"], { allowFail: true });
    const dirty = await this.run(["diff", "--cached", "--name-only"], { allowFail: true });
    if (!dirty.trim()) return null;
    const hash = await this.run(["commit", "--allow-empty", "-m", message], { allowFail: true });
    return hash.trim();
  }

  /** Hard-rollback to a checkpoint/commit hash. */
  async rollback(ref: string): Promise<void> {
    await this.run(["reset", "--hard", ref]);
  }

  async isIgnored(path: string): Promise<boolean> {
    try {
      await this.run(["check-ignore", path]);
      return true;
    } catch {
      return false;
    }
  }

  async readIgnorePatterns(): Promise<string[]> {
    try {
      const content = await readFile(join(this.root, ".gitignore"), "utf8");
      return content.split("\n").map((l) => l.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}

function splitLines(s: string): string[] {
  return s.split("\n").filter(Boolean);
}

export function parseDiff(raw: string): FileDiff[] {
  const diffs: FileDiff[] = [];
  let current: FileDiff | null = null;
  let currentHunk: DiffHunk | null = null;

  for (const line of raw.split("\n")) {
    if (line.startsWith("diff --git")) {
      current = null;
      const m = line.match(/^diff --git a\/(.*) b\/(.*)$/);
      if (m) {
        current = { path: m[2] ?? m[1] ?? "", status: "modified", hunks: [], full: "" };
        diffs.push(current);
      }
    } else if (current && line.startsWith("new file")) {
      current.status = "added";
    } else if (current && line.startsWith("deleted file")) {
      current.status = "deleted";
    } else if (current && line.startsWith("@@")) {
      const m = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if (m) {
        currentHunk = {
          oldStart: Number(m[1]),
          oldLines: Number(m[2] ?? 1),
          newStart: Number(m[3]),
          newLines: Number(m[4] ?? 1),
          content: "",
        };
        current.hunks.push(currentHunk);
      }
    } else if (currentHunk && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ") || line.startsWith("\\"))) {
      currentHunk.content += line + "\n";
    }
    if (current) current.full += line + "\n";
  }
  return diffs.filter((d) => d.path);
}

/** AI Git layer — natural-language git ops (prompt is executed by the agent, this prepares/executes the raw ops). */
export class AiGit extends GitEngine {
  constructor(root: string) {
    super(root);
  }

  /** "Undo only the auth changes" — revert hunks matching a path list, preserving the rest. */
  async undoOnlyPaths(paths: string[], targetRef = "HEAD"): Promise<void> {
    const safe = paths.filter((p) => !p.includes("..") && !p.startsWith("-"));
    if (safe.length === 0) return;
    const current = await this.run(["rev-parse", "HEAD"], { allowFail: true });
    if (!current.trim()) throw new Error("No HEAD to restore from");
    const tmpBranch = `ride-undo-${Date.now().toString(36)}`;
    await this.run(["checkout", "-b", tmpBranch, targetRef], { allowFail: true });
    await this.run(["checkout", current.trim()], { allowFail: true });
    await this.run(["restore", "--source", tmpBranch, "--", ...safe], { allowFail: true });
    await this.run(["branch", "-D", tmpBranch], { allowFail: true });
  }

  /** Stage grouped files and commit with a generated message. */
  async commitGrouped(files: string[], message: string): Promise<void> {
    await this.stage(files);
    await this.commit(message);
  }
}
