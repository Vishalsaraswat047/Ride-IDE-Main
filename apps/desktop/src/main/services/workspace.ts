import { readdir, stat, readFile } from "node:fs/promises";
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, extname } from "node:path";
import type { FileNode } from "@ride/contracts";
import { ProjectDb, langForPath, toPosix } from "@ride/project-db";
import { GitEngine } from "@ride/git";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".vite",
  ".ride",
  ".turbo",
  "coverage",
  "release",
  ".cache",
]);

const TEXT_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".scss", ".html", ".md",
  ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp", ".yaml", ".yml", ".toml",
  ".sh", ".bat", ".ps1", ".sql", ".xml", ".txt", ".env", ".vue", ".svelte", ".astro",
]);

export class WorkspaceManager {
  root: string | null = null;
  projectDb: ProjectDb | null = null;
  git: GitEngine | null = null;

  setRoot(root: string): { fileCount: number; gitRepo: boolean } {
    this.root = root;
    this.projectDb = new ProjectDb(root);
    this.git = new GitEngine(root);
    const fileCount = this.scanIndex();
    let gitRepo = false;
    void this.git.isRepo().then((r) => (gitRepo = r));
    return { fileCount, gitRepo };
  }

  get db(): ProjectDb {
    if (!this.projectDb) throw new Error("No workspace open");
    return this.projectDb;
  }

  get engine(): GitEngine {
    if (!this.git) throw new Error("No workspace open");
    return this.git;
  }

  async listTree(): Promise<FileNode[]> {
    if (!this.root) return [];
    return this.walk(this.root, 0);
  }

  private async walk(dir: string, depth: number): Promise<FileNode[]> {
    if (depth > 6) return [];
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const nodes: FileNode[] = [];
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const children = await this.walk(full, depth + 1);
        nodes.push({ name: entry.name, path: toPosix(full), type: "dir", children });
      } else if (entry.isFile()) {
        nodes.push({ name: entry.name, path: toPosix(full), type: "file" });
      }
    }
    return nodes;
  }

  /** Walk the tree once, index text files into the project DB with a quick symbol pass. */
  scanIndex(): number {
    if (!this.root || !this.projectDb) return 0;
    let count = 0;
    const visit = (dir: string, depth: number): void => {
      if (depth > 6) return;
      let entries;
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(full, depth + 1);
        } else if (entry.isFile() && TEXT_EXTS.has(extname(entry.name).toLowerCase())) {
          try {
            const content = readFileSync(full, "utf8");
            const lang = langForPath(entry.name);
            const { symbols, imports } = quickParse(content, lang);
            this.projectDb!.upsertFile(full, lang, content, symbols, imports);
            count++;
          } catch {
            /* binary or unreadable */
          }
        }
      }
    };
    visit(this.root, 0);
    return count;
  }

  async readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  async readFileInfo(path: string): Promise<{ size: number; mtime: number }> {
    const s = await stat(path);
    return { size: s.size, mtime: s.mtimeMs };
  }
}

export interface QuickSymbol {
  name: string;
  kind: "function" | "class" | "method" | "variable" | "import" | "type";
  path: string;
  line: number;
  column: number;
}

export interface QuickImport {
  from: string;
  names: string[];
  line: number;
}

/** Lightweight regex symbol extractor (v1; tree-sitter grammars land after). */
export function quickParse(
  content: string,
  lang: string,
): { symbols: QuickSymbol[]; imports: QuickImport[] } {
  const symbols: QuickSymbol[] = [];
  const imports: QuickImport[] = [];
  const lines = content.split("\n");
  const basePath = "";

  const patterns: { re: RegExp; kind: QuickSymbol["kind"] }[] =
    lang === "python"
      ? [
          { re: /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/, kind: "function" },
          { re: /^\s*async\s+def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/, kind: "function" },
          { re: /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)/, kind: "class" },
        ]
      : lang === "rust"
        ? [
            { re: /^\s*(?:pub\s+)?fn\s+([A-Za-z_][A-Za-z0-9_]*)/, kind: "function" },
            { re: /^\s*(?:pub\s+)?struct\s+([A-Za-z_][A-Za-z0-9_]*)/, kind: "type" },
            { re: /^\s*(?:pub\s+)?enum\s+([A-Za-z_][A-Za-z0-9_]*)/, kind: "type" },
          ]
        : [
            { re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "function" },
            { re: /^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\s*)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/, kind: "function" },
            { re: /^\s*class\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "class" },
            { re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "type" },
            { re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][A-Za-z0-9_$]*)/, kind: "type" },
          ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const p of patterns) {
      const m = line.match(p.re);
      if (m) {
        symbols.push({ name: m[1]!, kind: p.kind, path: basePath, line: i + 1, column: line.indexOf(m[1]!) });
        break;
      }
    }
    const imp = line.match(/^\s*(?:import\s+|from\s+["']([^"']+)["']\s+import\s+|import\s+["']([^"']+)["'])/);
    if (imp) {
      const from = imp[1] ?? imp[2] ?? "";
      const names: string[] = [];
      const namesMatch = line.match(/^\s*import\s+\{([^}]+)\}/);
      if (namesMatch) {
        for (const n of namesMatch[1]!.split(",")) {
          const t = n.trim().split(/\s+as\s+/)[0];
          if (t) names.push(t);
        }
      }
      if (names.length === 0 && from) names.push("*");
      imports.push({ from, names, line: i + 1 });
    }
  }

  return { symbols, imports };
}

export { basename as pathBaseName };
