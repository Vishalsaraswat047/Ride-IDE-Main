import type { McpServer } from "@ride/contracts";
import { settingsManager } from "./settings";
import { McpClient } from "./mcpClient";

export interface McpToolRef {
  serverName: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface ConnectedServer {
  server: McpServer;
  client: McpClient;
}

/** Registry of connected MCP servers. */
class McpRegistry {
  private clients = new Map<string, ConnectedServer>();

  sync(): void {
    const servers = settingsManager.get().ai.mcpServers;
    const seen = new Set<string>();
    for (const server of servers) {
      seen.add(server.id);
      if (!server.enabled) continue;
      const existing = this.clients.get(server.id);
      if (existing) {
        // keep using the last client; config changes apply on next reconnect
        continue;
      }
      this.clients.set(server.id, { server, client: new McpClient(server) });
    }
    for (const [id] of this.clients) {
      if (!seen.has(id)) {
        this.clients.delete(id);
      }
    }
  }

  async connectAll(): Promise<void> {
    this.sync();
    const results: Array<{ id: string; tools: McpServer["tools"]; error?: string }> = [];
    for (const [id, entry] of this.clients) {
      try {
        const { tools } = await entry.client.withTimeout(entry.client.connect());
        results.push({ id, tools });
      } catch (err) {
        results.push({ id, tools: [], error: err instanceof Error ? err.message : String(err) });
      }
    }
    if (results.length === 0) return;

    const cur = settingsManager.get();
    const next = cur.ai.mcpServers.map((s) => {
      const result = results.find((r) => r.id === s.id);
      if (!result) return s;
      return {
        ...s,
        connected: !result.error,
        lastError: result.error ?? null,
        tools: result.tools,
      } as McpServer;
    });
    if (JSON.stringify(next) !== JSON.stringify(cur.ai.mcpServers)) {
      await settingsManager.set({ ai: { ...cur.ai, mcpServers: next } });
    }
  }

  /** Refresh a single server immediately (used by UI add/edit). */
  async reconnect(id: string): Promise<{ ok: boolean; error?: string; tools?: McpServer["tools"] }> {
    this.sync();
    const entry = this.clients.get(id);
    if (!entry) return { ok: false, error: "Server not configured" };
    try {
      const { tools } = await entry.client.withTimeout(entry.client.connect());
      return { ok: true, tools };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async addServer(input: { name: string; url: string; headers?: Record<string, string> }): Promise<McpServer | null> {
    const server: McpServer = {
      id: `mcp-${Date.now().toString(36)}`,
      name: input.name.trim(),
      url: input.url.trim(),
      headers: input.headers ?? {},
      enabled: true,
      tools: [],
      connected: false,
      lastError: null,
    };
    this.clients.set(server.id, { server, client: new McpClient(server) });
    const self = this;
    try {
      const { tools } = await self.clients.get(server.id)!.client.withTimeout(self.clients.get(server.id)!.client.connect());
      server.connected = true;
      server.tools = tools;
    } catch (err) {
      server.lastError = err instanceof Error ? err.message : String(err);
    }
    const cur = settingsManager.get();
    await settingsManager.set({ ai: { ...cur.ai, mcpServers: [...cur.ai.mcpServers, server] } });
    return server;
  }

  async updateServer(id: string, patch: Partial<Pick<McpServer, "name" | "url" | "headers" | "enabled">>): Promise<McpServer | null> {
    const cur = settingsManager.get();
    const target = cur.ai.mcpServers.find((s) => s.id === id);
    if (!target) return null;
    let server: McpServer = { ...target, ...patch };
    // Reconnect if url or headers changed
    if (patch.url || patch.headers) {
      this.clients.set(id, { server, client: new McpClient(server) });
      try {
        const { tools } = await this.clients.get(id)!.client.withTimeout(this.clients.get(id)!.client.connect());
        server = { ...server, connected: true, lastError: null, tools };
      } catch (err) {
        server = { ...server, connected: false, lastError: err instanceof Error ? err.message : String(err) };
      }
    }
    const next = cur.ai.mcpServers.map((s) => (s.id === id ? server : s));
    await settingsManager.set({ ai: { ...cur.ai, mcpServers: next } });
    this.sync();
    return server;
  }

  async removeServer(id: string): Promise<boolean> {
    const cur = settingsManager.get();
    const before = cur.ai.mcpServers.length;
    const next = cur.ai.mcpServers.filter((s) => s.id !== id);
    if (next.length === before) return false;
    await settingsManager.set({ ai: { ...cur.ai, mcpServers: next } });
    this.clients.delete(id);
    return true;
  }

  /** All tools from all connected servers (for the `mcp` agent tool). */
  allTools(): McpToolRef[] {
    const out: McpToolRef[] = [];
    for (const entry of this.clients.values()) {
      for (const t of entry.server.tools ?? []) {
        out.push({ serverName: entry.server.name, name: t.name, description: t.description, inputSchema: t.inputSchema });
      }
    }
    return out;
  }

  async call(serverName: string, toolName: string, args: Record<string, unknown>): Promise<string> {
    const entry = [...this.clients.values()].find((c) => c.server.name === serverName || c.server.id === serverName);
    if (!entry) throw new Error(`MCP server "${serverName}" not found`);
    return entry.client.withTimeout(entry.client.callTool(toolName, args));
  }

  listClients(): Array<{ id: string; name: string; url: string; enabled: boolean; connected: boolean; lastError: string | null }> {
    return [...this.clients.values()].map((c) => ({
      id: c.server.id,
      name: c.server.name,
      url: c.server.url,
      enabled: c.server.enabled,
      connected: c.server.connected,
      lastError: c.server.lastError,
    }));
  }
}

export const mcpRegistry = new McpRegistry();