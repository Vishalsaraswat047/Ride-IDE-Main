import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const OPENAI_COMPATIBLE_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: true,
  images: false,
  audio: false,
  fineTuning: false,
  batch: true,
};

function parseModelsResponse(data: unknown): ProviderModel[] {
  if (!data || typeof data !== "object") return [];
  
  const obj = data as { data?: unknown[]; models?: unknown[]; object?: string };
  const items = obj.data ?? obj.models ?? [];
  
  if (!Array.isArray(items)) return [];
  
  return items
    .filter((item: any) => 
      item !== null && typeof item === "object" && "id" in item
    )
    .map((item: any) => ({
      id: String(item.id),
      name: String(item.name ?? item.id),
      providerId: "",
      contextWindow: typeof item.context_length === "number" ? item.context_length : 
                     typeof item.context_window === "number" ? item.context_window : 4096,
      maxOutputTokens: typeof item.max_output_tokens === "number" ? item.max_output_tokens : 4096,
      supportsStreaming: true,
      supportsTools: Boolean(item.supports_tools ?? item.tool_calling ?? true),
      supportsVision: Boolean(item.vision ?? item.supports_vision ?? false),
      supportsReasoning: Boolean(item.reasoning ?? item.supports_reasoning ?? false),
      metadata: item,
    }));
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  readonly id = "openai-compatible";
  readonly name = "OpenAI Compatible";
  readonly displayName = "OpenAI-Compatible Endpoint";
  readonly kind = "byok" as const;
  readonly capabilities = OPENAI_COMPATIBLE_CAPABILITIES;
  readonly requiresApiKey = true;
  readonly apiKeyEnvVar = "OPENAI_API_KEY";
  readonly modelsEndpoint = "/models";

  getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }
    
    if (config.organization) {
      headers["OpenAI-Organization"] = config.organization;
    }
    
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }
    
    return headers;
  }

  transformRequest(config: ProviderConfig, request: unknown): unknown {
    return request;
  }

  transformResponse(response: unknown): unknown {
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
      const models = parseModelsResponse(data);
      
      return models.map(m => ({ ...m, providerId: config.id }));
    } catch (error) {
      console.warn(`[OpenAICompatibleAdapter] Model discovery failed:`, error);
      return [];
    }
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
        details: `Connected successfully. Found ${models.length} models.`,
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async testModel(config: ProviderConfig, modelId: string): Promise<ModelTestResult> {
    const start = Date.now();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 5,
          temperature: 0,
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
      const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
      
      return {
        success: true,
        latency,
        tokensUsed: (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0),
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

export const openaiCompatibleAdapter = new OpenAICompatibleAdapter();