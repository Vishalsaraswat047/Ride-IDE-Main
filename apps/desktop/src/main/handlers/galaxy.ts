import { ipcMain } from "electron";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { IpcChannel, type GalaxyCategory, type GalaxyComponent } from "@ride/contracts";

const GALAXY_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "vendor", "galaxy");

const CATEGORY_LABEL: Record<string, string> = {
  Buttons: "Buttons",
  Cards: "Cards",
  Checkboxes: "Checkboxes",
  Forms: "Forms",
  Inputs: "Inputs",
  Notifications: "Notifications",
  Patterns: "Patterns",
  "Radio-buttons": "Radio buttons",
  "Toggle-switches": "Toggles",
  Tooltips: "Tooltips",
  loaders: "Loaders",
};

const CATEGORY_ORDER = [
  "Buttons",
  "Cards",
  "Inputs",
  "Forms",
  "Toggle-switches",
  "Checkboxes",
  "Radio-buttons",
  "Notifications",
  "Tooltips",
  "loaders",
  "Patterns",
];

function isCategoryDir(name: string): boolean {
  return name in CATEGORY_LABEL;
}

let cached: { components: GalaxyComponent[]; categories: GalaxyCategory[] } | null = null;

async function scan(): Promise<{ components: GalaxyComponent[]; categories: GalaxyCategory[] }> {
  if (cached) return cached;
  const entries = await readdir(GALAXY_ROOT, { withFileTypes: true });
  const components: GalaxyComponent[] = [];
  const categories: GalaxyCategory[] = [];
  for (const dir of entries) {
    if (!dir.isDirectory() || !isCategoryDir(dir.name)) continue;
    const files = (await readdir(join(GALAXY_ROOT, dir.name))).filter((f) => f.endsWith(".html"));
    for (const filename of files) {
      components.push({
        id: `${dir.name}/${filename}`,
        category: dir.name,
        filename,
        relPath: `${dir.name}/${filename}`,
      });
    }
    categories.push({ id: dir.name, name: CATEGORY_LABEL[dir.name] ?? dir.name, count: files.length });
  }
  categories.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.id);
    const ib = CATEGORY_ORDER.indexOf(b.id);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  cached = { components, categories };
  return cached;
}

export function registerGalaxyHandlers(): void {
  ipcMain.handle(IpcChannel.galaxy.list, async () => {
    try {
      return await scan();
    } catch {
      return { components: [], categories: [] };
    }
  });

  ipcMain.handle(IpcChannel.galaxy.read, async (_e, relPath: string) => {
    try {
      const normalized = relPath.replace(/^[\\/]+/, "");
      if (!isCategoryDir(normalized.split(/[\\/]/)[0] ?? "")) return { ok: false, error: "invalid path" };
      const abs = join(GALAXY_ROOT, normalized);
      const rel = relative(GALAXY_ROOT, abs);
      if (rel.startsWith("..") || rel.includes("..")) return { ok: false, error: "invalid path" };
      const content = await readFile(abs, "utf8");
      const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
      const attribution = firstLine.startsWith("<!--") ? firstLine.replace(/<!--|-->/g, "").trim() : undefined;
      return { ok: true, content, attribution };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
}