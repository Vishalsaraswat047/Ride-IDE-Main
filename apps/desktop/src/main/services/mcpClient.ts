import type { McpServer } from "@ride/contracts";

const MCP_PROTOCOL_VERSION = "2025-03-26";
const REQUEST_TIMEOUT_MS = 15_000;

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: unknown;
  error?: { code?: number; message?: string };
}

/**
 * Minimal Model Context Protocol client (Streamable HTTP transport).
 * Speaks JSON-RPC 2.0 over POST, enough to initialize a session, list tools,
 * and call a tool — exactly what the agent needs through the `mcp` tool.
 */
export class McpClient {
  private nextId = 1;
  private serverVersion: string | null = null;

  constructor(private readonly server: McpServer) {}

  get name(): string {
    return this.server.name;
  }

  private async request(method: string, params: Record<string, unknown> = {}, signal?: AbortSignal): Promise<unknown> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...this.server.headers,
    };
    if (this.serverVersion) headers["mcp-protocol-version"] = this.serverVersion;

    const res = await fetch(this.server.url, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: this.nextId++,
        method,
        params,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`MCP ${method} failed: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    const raw = await res.text();

    // Streamable HTTP can return SSE events; we only deal with single responses.
    if (!contentType.includes("text/event-stream") && !raw.includes("\n\n") && !raw.includes("\r\n\r\n")) {
      const parsed = JSON.parse(raw) as JsonRpcResponse;
      if (parsed.error) throw new Error(parsed.error.message ?? `MCP error ${parsed.error.code ?? "unknown"}`);
      return parsed.result;
    }

    // Parse SSE: data: {json-rpc-response...}
    const lines = raw.split(/\r?\n/);
    const dataLines = lines
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    let last: JsonRpcResponse | null = null;
    for (const line of dataLines) {
      try {
        const evt = JSON.parse(line) as JsonRpcResponse | { jsonrpc?: string; method?: string };
        if ("method" in evt && evt.method) continue; // server notification
        if ("result" in evt || "error" in evt) last = evt as JsonRpcResponse;
      } catch {
        /* skip malformed events */
      }
    }
    if (!last) throw new Error("MCP server returned no usable response");
    if (last.error) throw new Error(last.error.message ?? "MCP error");
    return last.result;
  }

  /** initialize + tools/list. Populates the cached tool list. */
  async connect(signal?: AbortSignal): Promise<{ tools: McpServer["tools"]; version: string | null }> {
    const init = (await this.request(
      "initialize",
      {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        clientInfo: { name: "ride", version: "0.1.0" },
      },
      signal,
    )) as { protocolVersion?: string };
    this.serverVersion = init.protocolVersion ?? MCP_PROTOCOL_VERSION;
    await this.request("notifications/initialized", {}, signal);
    const raw = (await this.request("tools/list", {}, signal)) as { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
    const tools = (raw.tools ?? []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));
    return { tools, version: this.serverVersion };
  }

  async listToolsRaw(signal?: AbortSignal): Promise<McpServer["tools"]> {
    const raw = (await this.request("tools/list", {}, signal)) as { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> };
    return (raw.tools ?? []).map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }));
  }

  async callTool(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
    const result = (await this.request("tools/call", { name, arguments: args }, signal)) as {
      content?: Array<{ type?: string; text?: string; content?: string }>;
      isError?: boolean;
    };
    const pieces = (result.content ?? [])
      .map((c) => c.text ?? c.content ?? "")
      .filter(Boolean)
      .join("\n");
    if (result.isError) throw new Error(pieces || `MCP tool ${name} returned an error`);
    return pieces || `(tool ${name} returned no text)`;
  }

  withTimeout<T>(p: Promise<T>, ms = REQUEST_TIMEOUT_MS): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("MCP request timed out")), ms)),
    ]);
  }
}