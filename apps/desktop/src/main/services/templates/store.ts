import { app } from "electron";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import type { RideTemplate, TemplateSaveRequest } from "@ride/contracts";

const EXCLUDED_DIRS = new Set(["node_modules", ".git", "dist", "out", ".vite", ".turbo", "coverage", ".DS_Store"]);
const MAX_FILES = 500;

export function userTemplatesDir(): string {
  return join(app.getPath("userData"), "templates");
}

export async function listUserTemplates(): Promise<RideTemplate[]> {
  const dir = userTemplatesDir();
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: RideTemplate[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    try {
      const meta = JSON.parse(await readFile(join(dir, e.name, "template.json"), "utf8")) as RideTemplate;
      out.push(meta);
    } catch {
      /* not a template dir */
    }
  }
  return out.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

async function collectFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  let scan: string[] = [""];
  while (scan.length > 0 && files.length < MAX_FILES) {
    const dir = scan.pop()!;
    const entries = await readdir(join(root, dir), { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      if (EXCLUDED_DIRS.has(e.name)) continue;
      const rel = dir ? `${dir}/${e.name}` : e.name;
      if (e.isDirectory()) scan.push(rel);
      else files.push(rel);
    }
  }
  return files;
}

export async function saveUserTemplate(req: TemplateSaveRequest, root: string): Promise<RideTemplate> {
  const now = Date.now();
  const slug = req.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "template";
  const dir = join(userTemplatesDir(), `${slug}-${now.toString(36)}`);
  await mkdir(dir, { recursive: true });

  const files = await collectFiles(root);
  for (const rel of files) {
    const src = join(root, ...rel.split("/"));
    const dst = join(dir, ...rel.split("/"));
    await mkdir(dirname(dst), { recursive: true });
    await cp(src, dst);
  }

  const template: RideTemplate = {
    id: `user-${now.toString(36)}`,
    name: req.name,
    description: req.description,
    category: req.category,
    section: "starter",
    tags: req.tags,
    framework: "User-defined",
    styling: "—",
    ui: "—",
    icons: "—",
    animation: "—",
    features: ["Custom scaffold", "Agent compatible"],
    aiCompatible: true,
    userGenerated: true,
    questions: [],
    hasPreview: false,
    customPrompt: "",
    files,
    createdAt: now,
  };
  await writeFile(
    join(dir, "template.json"),
    JSON.stringify({ ...template, id: basename(dir) }, null, 2),
    "utf8",
  );
  return { ...template, id: basename(dir) };
}

export async function deleteUserTemplate(id: string): Promise<void> {
  const dir = join(userTemplatesDir(), id);
  if (!dir.startsWith(userTemplatesDir())) return;
  await rm(dir, { recursive: true, force: true });
}