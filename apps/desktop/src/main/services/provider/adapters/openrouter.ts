import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const OPENROUTER_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: false,
  images: false,
  audio: false,
  fineTuning: false,
  batch: false,
};

export class OpenRouterAdapter implements ProviderAdapter {
  readonly id = "openrouter";
  readonly name = "OpenRouter";
  readonly displayName = "OpenRouter";
  readonly defaultBaseUrl = "https://openrouter.ai/api/v1";
  readonly kind = "byok" as const;
  readonly capabilities = OPENROUTER_CAPABILITIES;
  readonly requiresApiKey = true;
  readonly apiKeyEnvVar = "OPENROUTER_API_KEY";
  readonly modelsEndpoint = "/models";

  getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ride.ai",
      "X-Title": "RIDE",
    };
    
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
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
      
      if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
        return [];
      }
      
      return data.data
        .filter((item: any) => 
          item !== null && typeof item === "object" && "id" in item
        )
        .map((item: any) => {
          const id = String(item.id);
          const contextLength = typeof item.context_length === "number" ? item.context_length : 4096;
          
          return {
            id,
            name: String(item.name ?? id),
            providerId: config.id,
            contextWindow: contextLength,
            maxOutputTokens: Math.min(contextLength, 8192),
            supportsStreaming: true,
            supportsTools: Boolean(item.supports_tools ?? true),
            supportsVision: Boolean(item.architecture?.includes("vision") ?? false),
            supportsReasoning: Boolean(item.id?.includes("reasoning") ?? false),
            pricing: item.pricing ? {
              inputPer1M: parseFloat(item.pricing.prompt) * 1e6,
              outputPer1M: parseFloat(item.pricing.completion) * 1e6,
              currency: "USD",
            } : undefined,
            metadata: item,
          };
        });
    } catch (error) {
      console.warn(`[OpenRouterAdapter] Model discovery failed:`, error);
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
        details: `Connected to OpenRouter. Found ${models.length} models.`,
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

export const openrouterAdapter = new OpenRouterAdapter();