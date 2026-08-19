import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { access } from "node:fs/promises";
import { join } from "node:path";

const exec = promisify(execFile);
const INSTALL_TIMEOUT = 600_000;

export interface InstallResult {
  ok: boolean;
  pm: string;
  durationMs: number;
  error?: string;
}

async function detectPackageManager(dir: string): Promise<string> {
  const candidates: Array<[string, string]> = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"],
  ];
  for (const [file, pm] of candidates) {
    try {
      await access(join(dir, file));
      return pm;
    } catch {
      /* keep looking */
    }
  }
  return "pnpm";
}

async function hasBin(bin: string): Promise<boolean> {
  try {
    await exec(bin, ["--version"], { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Install a project's dependencies (npm/pnpm/yarn/bun) so every language
 * library the scaffold declares is present when the agent starts working.
 */
export async function installDependencies(dir: string): Promise<InstallResult> {
  const t0 = Date.now();
  let pm = await detectPackageManager(dir);
  if (!(await hasBin(pm))) pm = "npm";
  if (!(await hasBin(pm))) return { ok: false, pm, durationMs: Date.now() - t0, error: `${pm} is not installed` };

  const args = pm === "npm" ? ["install", "--no-audit", "--no-fund"] : pm === "yarn" ? ["install"] : pm === "bun" ? ["install"] : ["install", "--no-frozen-lockfile", "--silent"];
  try {
    await exec(pm, args, { cwd: dir, timeout: INSTALL_TIMEOUT, maxBuffer: 16 * 1024 * 1024 });
    return { ok: true, pm, durationMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      pm,
      durationMs: Date.now() - t0,
      error: err instanceof Error ? shortLines(err.message) : String(err),
    };
  }
}

function shortLines(msg: string): string {
  const lines = msg.split("\n").filter((l) => /err|fail|not found|cannot|ENOENT|ETIMEDOUT|404/i.test(l)).slice(0, 3);
  return (lines[0] ?? msg.slice(0, 200)).slice(0, 300);
}