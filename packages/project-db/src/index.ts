import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";

export interface SymbolEntry {
  name: string;
  kind: "function" | "class" | "method" | "variable" | "import" | "type";
  path: string;
  line: number;
  column: number;
}

export interface ProjectIndex {
  files: string[];
  symbols: SymbolEntry[];
  imports: { from: string; names: string[]; path: string; line: number }[];
  deps: Record<string, string>;
  tests: string[];
  agentDecisions: { id: number; ts: number; sessionID: string; decision: string }[];
}

export interface SearchHit {
  path: string;
  line: number;
  snippet: string;
  score?: number;
}

const LANGUAGE_HINTS: Record<string, "javascript" | "python" | "rust" | "go" | "typescript" | null> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".py": "python",
  ".rs": "rust",
  ".go": "go",
};

export class ProjectDb {
  readonly db: DatabaseSync;

  constructor(private readonly workspaceRoot: string) {
    const dir = join(workspaceRoot, ".ride");
    mkdirSync(dir, { recursive: true });
    this.db = new DatabaseSync(join(dir, "index.db"));
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;

      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        lang TEXT,
        size INTEGER,
        mtime INTEGER,
        content TEXT
      );

      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(path, content, tokenize = 'unicode61');

      CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        path TEXT NOT NULL,
        line INTEGER NOT NULL,
        column INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
      CREATE INDEX IF NOT EXISTS idx_symbols_path ON symbols(path);

      CREATE TABLE IF NOT EXISTS imports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_path TEXT NOT NULL,
        names TEXT NOT NULL,
        path TEXT NOT NULL,
        line INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deps (
        workspace TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tests (
        path TEXT PRIMARY KEY,
        name TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS agent_decisions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ts INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        decision TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS agent_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cwd TEXT NOT NULL,
        model TEXT,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS agent_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'message',
        ts INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON agent_messages(session_id);
    `);
  }

  /** Upsert a parsed file + its symbol/import rows. Callers own parsing; we own storage. */
  upsertFile(path: string, lang: string, content: string, symbols: SymbolEntry[], imports: { from: string; names: string[]; line: number }[]): void {
    const rel = toPosix(relative(this.workspaceRoot, path));
    const mtime = Date.now();
    this.db.prepare("INSERT OR REPLACE INTO files (path, lang, size, mtime, content) VALUES (?, ?, ?, ?, ?)").run(
      rel,
      lang,
      Buffer.byteLength(content, "utf8"),
      mtime,
      content,
    );
    this.db.prepare("INSERT INTO files_fts (path, content) VALUES (?, ?)").run(rel, content);

    this.db.prepare("DELETE FROM symbols WHERE path = ?").run(rel);
    const insSym = this.db.prepare("INSERT INTO symbols (name, kind, path, line, column) VALUES (?, ?, ?, ?, ?)");
    for (const s of symbols) insSym.run(s.name, s.kind, rel, s.line, s.column);

    this.db.prepare("DELETE FROM imports WHERE path = ?").run(rel);
    const insImp = this.db.prepare("INSERT INTO imports (from_path, names, path, line) VALUES (?, ?, ?, ?)");
    for (const i of imports) insImp.run(i.from, JSON.stringify(i.names), rel, i.line);
  }

  removeFile(path: string): void {
    const rel = toPosix(relative(this.workspaceRoot, path));
    this.db.prepare("DELETE FROM files WHERE path = ?").run(rel);
    this.db.prepare("DELETE FROM files_fts WHERE path = ?").run(rel);
    this.db.prepare("DELETE FROM symbols WHERE path = ?").run(rel);
    this.db.prepare("DELETE FROM imports WHERE path = ?").run(rel);
  }

  setDeps(deps: Record<string, string>): void {
    this.db
      .prepare("INSERT OR REPLACE INTO deps (workspace, data, updated_at) VALUES (?, ?, ?)")
      .run(this.workspaceRoot, JSON.stringify(deps), Date.now());
  }

  getDeps(): Record<string, string> {
    const row = this.db.prepare("SELECT data FROM deps WHERE workspace = ?").get(this.workspaceRoot) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as Record<string, string>) : {};
  }

  setTest(path: string, name: string, status: string): void {
    this.db.prepare("INSERT OR REPLACE INTO tests (path, name, status) VALUES (?, ?, ?)").run(path, name, status);
  }

  recordAgentDecision(sessionID: string, decision: string): void {
    this.db.prepare("INSERT INTO agent_decisions (ts, session_id, decision) VALUES (?, ?, ?)").run(Date.now(), sessionID, decision);
  }

  getAgentDecisions(limit = 50): { id: number; ts: number; sessionID: string; decision: string }[] {
    return this.db
      .prepare("SELECT id, ts, session_id as sessionID, decision FROM agent_decisions ORDER BY id DESC LIMIT ?")
      .all(limit) as { id: number; ts: number; sessionID: string; decision: string }[];
  }

  // ─── Agent session memory ────────────────────────────────────────────────

  saveSession(session: { id: string; title: string; cwd: string; model?: string; status: string; createdAt: number; updatedAt: number; messageCount: number }): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO agent_sessions (id, title, cwd, model, status, created_at, updated_at, message_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(session.id, session.title, session.cwd, session.model ?? null, session.status, session.createdAt, session.updatedAt, session.messageCount);
  }

  getSessions(limit = 50): { id: string; title: string; cwd: string; model?: string; status: string; createdAt: number; updatedAt: number; messageCount: number }[] {
    return this.db
      .prepare(
        `SELECT id, title, cwd, model, status, created_at as createdAt, updated_at as updatedAt, message_count as messageCount
         FROM agent_sessions ORDER BY updated_at DESC LIMIT ?`,
      )
      .all(limit) as { id: string; title: string; cwd: string; model?: string; status: string; createdAt: number; updatedAt: number; messageCount: number }[];
  }

  appendMessage(sessionId: string, role: string, content: string, kind = "message"): void {
    this.db
      .prepare("INSERT INTO agent_messages (session_id, role, content, kind, ts) VALUES (?, ?, ?, ?, ?)")
      .run(sessionId, role, content.slice(0, 64_000), kind, Date.now());
  }

  getMessages(sessionId: string, limit = 200): { id: number; role: string; content: string; kind: string; ts: number }[] {
    return this.db
      .prepare("SELECT id, role, content, kind, ts FROM agent_messages WHERE session_id = ? ORDER BY id DESC LIMIT ?")
      .all(sessionId, limit)
      .reverse() as { id: number; role: string; content: string; kind: string; ts: number }[];
  }

  /** Recent durable memory for prompt injection: decisions + last session summaries. */
  getMemoryContext(opts: { decisionLimit?: number; summaryCount?: number } = {}): { decisions: string[]; summaries: string[] } {
    const decisionLimit = opts.decisionLimit ?? 5;
    const summaryCount = opts.summaryCount ?? 3;
    let decisions: string[] = [];
    let summaries: string[] = [];
    try {
      decisions = this.getAgentDecisions(decisionLimit).map((d) => d.decision);
    } catch {
      /* best-effort */
    }
    try {
      const rows = this.db
        .prepare("SELECT content FROM agent_messages WHERE kind = 'summary' ORDER BY id DESC LIMIT ?")
        .all(summaryCount) as { content: string }[];
      summaries = rows.map((r) => r.content);
    } catch {
      /* best-effort */
    }
    return { decisions, summaries };
  }

  deleteSession(sessionId: string): void {
    this.db.prepare("DELETE FROM agent_sessions WHERE id = ?").run(sessionId);
    this.db.prepare("DELETE FROM agent_messages WHERE session_id = ?").run(sessionId);
  }

  findSymbol(name: string): SymbolEntry[] {
    return this.db
      .prepare(
        "SELECT name, kind, path, line, column FROM symbols WHERE name = ? OR name LIKE ? ORDER BY name LIMIT 50",
      )
      .all(name, `%${name}%`) as unknown as SymbolEntry[];
  }

  findImport(from: string): { from: string; names: string; path: string; line: number }[] {
    return this.db
      .prepare("SELECT from_path as from, names, path, line FROM imports WHERE from_path = ? OR from_path LIKE ?")
      .all(from, `%${from}%`) as { from: string; names: string; path: string; line: number }[];
  }

  /** FTS5 full-text search over file contents. */
  searchContent(query: string, limit = 20): SearchHit[] {
    const escaped = query.replace(/"/g, '""');
    const rows = this.db
      .prepare(
        `SELECT path, snippet(files_fts, 1, '…', '…', '…', 24) AS snippet, bm25(files_fts) AS score
         FROM files_fts WHERE files_fts MATCH ? ORDER BY score LIMIT ?`,
      )
      .all(`"${escaped}"`, limit) as { path: string; snippet: string; score: number }[];
    return rows.map((r) => ({ path: r.path, line: 0, snippet: r.snippet, score: r.score }));
  }

  /** Which files reference a symbol (via imports or direct name hits). */
  contextForTask(keywords: string[], limit = 15): { path: string; snippet: string }[] {
    const out: { path: string; snippet: string }[] = [];
    const seen = new Set<string>();
    for (const kw of keywords.slice(0, 4)) {
      for (const hit of this.searchContent(kw, limit)) {
        if (!seen.has(hit.path)) {
          seen.add(hit.path);
          out.push({ path: hit.path, snippet: hit.snippet });
        }
      }
    }
    return out.slice(0, limit);
  }

  getFiles(limit = 5000): string[] {
    return (this.db.prepare("SELECT path FROM files LIMIT ?").all(limit) as { path: string }[]).map((r) => r.path);
  }

  getFileContent(path: string): string | undefined {
    const row = this.db.prepare("SELECT content FROM files WHERE path = ?").get(toPosix(relative(this.workspaceRoot, path))) as { content: string } | undefined;
    return row?.content;
  }

  close(): void {
    this.db.close();
  }
}

export function langForPath(path: string): string {
  const ext = path.slice(path.lastIndexOf(".")).toLowerCase();
  return LANGUAGE_HINTS[ext] ?? "text";
}

export function toPosix(p: string): string {
  return p.split("\\").join("/");
}

export { LANGUAGE_HINTS };
