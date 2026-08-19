import { app } from "electron";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import type { SkillLoader, SkillSpec } from "@ride/agent-bridge";
import type { WorkspaceManager } from "./workspace";

const SKILL_DIR_NAMES = ["skills", ".rides/skills"];

/** Scan a directory tree for SKILL.md files in `name/` folders. */
async function scanDir(base: string, depth = 0): Promise<SkillSpec[]> {
  if (depth > 3) return [];
  let entries;
  try {
    entries = await readdir(base, { withFileTypes: true });
  } catch {
    return [];
  }
  const specs: SkillSpec[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".") && entry.name !== ".ride") continue;
    const dir = join(base, entry.name);
    const skillFile = join(dir, "SKILL.md");
    try {
      const info = await stat(skillFile);
      if (info.isFile()) {
        const body = (await readFile(skillFile, "utf8")).slice(0, 32_000);
        const meta = parseFrontmatter(body);
        specs.push({
          name: entry.name,
          description: meta.description || meta.name || entry.name,
          path: skillFile,
          body,
        });
      }
    } catch {
      specs.push(...(await scanDir(dir, depth + 1)));
    }
  }
  return specs;
}

/** Quick `---` frontmatter parse for description/name keys. */
function parseFrontmatter(body: string): { name?: string; description?: string } {
  const out: { name?: string; description?: string } = {};
  const m = body.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (m && m[1]) {
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([a-zA-Z_-]+):\s*(.+)$/);
      if (kv && kv[2] && (kv[1] === "name" || kv[1] === "description")) out[kv[1] as "name" | "description"] = kv[2].trim();
    }
  }
  return out;
}

async function rootSkills(): Promise<SkillSpec[]> {
  const dirs = [join(app.getPath("home"), ".ride", "skills"), join(app.getPath("userData"), "skills")];
  const specs: SkillSpec[] = [];
  for (const dir of dirs) {
    specs.push(...(await scanDir(dir)));
  }
  return specs;
}

export function createSkillLoader(workspace: WorkspaceManager): SkillLoader {
  const cache = new Map<string, SkillSpec | null>();

  async function all(): Promise<SkillSpec[]> {
    const specs: SkillSpec[] = [];
    if (workspace.root) {
      for (const rel of SKILL_DIR_NAMES) {
        const skillRoot = join(workspace.root, rel);
        specs.push(...(await scanDir(skillRoot)));
      }
    }
    specs.push(...(await rootSkills()));
    return specs;
  }

  return {
    list: async () => {
      const specs = await all();
      return specs.map((s) => ({ name: s.name, description: s.description }));
    },
    load: async (name: string) => {
      const key = `${workspace.root ?? ""}::${name}`;
      if (cache.has(key)) return cache.get(key) ?? null;
      const specs = await all();
      const match = specs.find((s) => s.name === name || s.description.toLowerCase().includes(name.toLowerCase()));
      cache.set(key, match ?? null);
      return match ?? null;
    },
  };
}