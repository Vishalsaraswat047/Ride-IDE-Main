import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const OLLAMA_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: true,
  images: false,
  audio: false,
  fineTuning: false,
  batch: false,
};

export class OllamaAdapter implements ProviderAdapter {
  readonly id = "ollama";
  readonly name = "Ollama";
  readonly displayName = "Ollama (Local)";
  readonly defaultBaseUrl = "http://localhost:11434";
  readonly kind = "local" as const;
  readonly capabilities = OLLAMA_CAPABILITIES;
  readonly requiresApiKey = false;
  readonly modelsEndpoint = "/api/tags";

  getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }
    
    return headers;
  }

  transformRequest(config: ProviderConfig, request: unknown): unknown {
    const req = request as Record<string, unknown>;
    
    if (req.messages && Array.isArray(req.messages)) {
      return {
        ...req,
        messages: req.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream: req.stream ?? false,
      };
    }
    
    return request;
  }

  transformResponse(response: unknown): unknown {
    const res = response as Record<string, unknown>;
    
    if (res.message && typeof res.message === "object") {
      const message = res.message as { content?: string; role?: string };
      
      return {
        choices: [{
          message: { content: message.content ?? "", role: message.role ?? "assistant" },
          finish_reason: res.done ? "stop" : "length",
        }],
      };
    }
    
    if (res.models && Array.isArray(res.models)) {
      return { data: res.models };
    }
    
    return response;
  }

  async discoverModels(config: ProviderConfig): Promise<ProviderModel[]> {
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const url = `${baseUrl}${this.modelsEndpoint}`;
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(config),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      if (!data || typeof data !== "object" || !Array.isArray(data.models)) {
        return [];
      }
      
      return data.models
        .filter((item: any) => 
          item !== null && typeof item === "object" && "name" in item
        )
        .map((item: any) => {
          const name = String(item.name);
          const size = typeof item.size === "number" ? item.size : 0;
          const paramSize = this.estimateParams(size);
          
          return {
            id: name,
            name: name,
            providerId: config.id,
            contextWindow: this.estimateContextWindow(name, paramSize),
            maxOutputTokens: 4096,
            supportsStreaming: true,
            supportsTools: this.supportsTools(name),
            supportsVision: this.supportsVision(name),
            supportsReasoning: this.supportsReasoning(name),
            metadata: item,
          };
        });
    } catch (error) {
      console.warn(`[OllamaAdapter] Model discovery failed:`, error);
      return [];
    }
  }

  private estimateParams(sizeBytes: number): number {
    if (sizeBytes <= 0) return 0;
    return Math.round(sizeBytes / 1e9 * 2);
  }

  private estimateContextWindow(name: string, paramSize: number): number {
    const lower = name.toLowerCase();
    
    if (lower.includes("llama3") || lower.includes("llama-3")) return 131072;
    if (lower.includes("llama2") || lower.includes("llama-2")) return 4096;
    if (lower.includes("codellama")) return 16384;
    if (lower.includes("mistral")) return 32768;
    if (lower.includes("mixtral")) return 32768;
    if (lower.includes("qwen2.5") || lower.includes("qwen-2.5")) return 131072;
    if (lower.includes("qwen2") || lower.includes("qwen-2")) return 32768;
    if (lower.includes("gemma2") || lower.includes("gemma-2")) return 8192;
    if (lower.includes("phi3") || lower.includes("phi-3")) return 131072;
    if (lower.includes("nemotron")) return 128000;
    if (lower.includes("command-r")) return 131072;
    
    if (paramSize >= 70) return 131072;
    if (paramSize >= 30) return 32768;
    if (paramSize >= 7) return 8192;
    
    return 4096;
  }

  private supportsTools(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.includes("llama3") || lower.includes("llama-3") ||
           lower.includes("mistral") || lower.includes("mixtral") ||
           lower.includes("qwen2.5") || lower.includes("qwen-2.5") ||
           lower.includes("nemotron") || lower.includes("command-r") ||
           lower.includes("hermes") || lower.includes("functionary");
  }

  private supportsVision(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.includes("llava") || lower.includes("bakllava") ||
           lower.includes("vision") || lower.includes("moondream") ||
           lower.includes("qwen-vl") || lower.includes("cogvlm");
  }

  private supportsReasoning(name: string): boolean {
    const lower = name.toLowerCase();
    return lower.includes("nemotron") || lower.includes("o1") ||
           lower.includes("r1") || lower.includes("deepseek-r1") ||
           lower.includes("qwq") || lower.includes("marco");
  }

  async testConnection(config: ProviderConfig): Promise<ProviderTestResult> {
    const start = Date.now();
    
    try {
      const models = await this.discoverModels(config);
      const latency = Date.now() - start;
      
      return {
        success: true,
        latency,
        modelsFound: models.length,
        details: `Connected to Ollama. Found ${models.length} local models.`,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
        details: "Make sure Ollama is running (ollama serve) and accessible at the configured URL.",
      };
    }
  }

  async testModel(config: ProviderConfig, modelId: string): Promise<ModelTestResult> {
    const start = Date.now();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "Test" }],
          stream: false,
          options: { num_predict: 5, temperature: 0 },
        }),
      });
      
      const latency = Date.now() - start;
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        return {
          success: false,
          latency,
          error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        };
      }
      
      const data: any = await response.json().catch(() => ({}));
      const evalCount = data.eval_count as number | undefined;
      
      return {
        success: true,
        latency,
        tokensUsed: evalCount ?? 0,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const ollamaAdapter = new OllamaAdapter();