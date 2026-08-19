import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const OPENAI_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: true,
  images: true,
  audio: true,
  fineTuning: true,
  batch: true,
};

const OPENAI_KNOWN_MODELS: ProviderModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    pricing: { inputPer1M: 2.5, outputPer1M: 10, currency: "USD" },
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    pricing: { inputPer1M: 0.15, outputPer1M: 0.6, currency: "USD" },
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    pricing: { inputPer1M: 10, outputPer1M: 30, currency: "USD" },
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    providerId: "",
    contextWindow: 16384,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: { inputPer1M: 0.5, outputPer1M: 1.5, currency: "USD" },
  },
  {
    id: "o1-preview",
    name: "o1 Preview",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 32768,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: true,
    pricing: { inputPer1M: 15, outputPer1M: 60, currency: "USD" },
  },
  {
    id: "o1-mini",
    name: "o1 Mini",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 65536,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: true,
    pricing: { inputPer1M: 3, outputPer1M: 12, currency: "USD" },
  },
];

export class OpenAIAdapter implements ProviderAdapter {
  readonly id = "openai";
  readonly name = "OpenAI";
  readonly displayName = "OpenAI";
  readonly defaultBaseUrl = "https://api.openai.com/v1";
  readonly kind = "byok" as const;
  readonly capabilities = OPENAI_CAPABILITIES;
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
    
    if (config.project) {
      headers["OpenAI-Project"] = config.project;
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
        console.warn(`[OpenAIAdapter] Model discovery failed: ${response.status}`);
        return OPENAI_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      const data: any = await response.json();
      
      if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
        return OPENAI_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      const knownModels = new Map(OPENAI_KNOWN_MODELS.map(m => [m.id, m]));
      
      return data.data
        .filter((item: any) => 
          item !== null && typeof item === "object" && "id" in item
        )
        .map((item: any) => {
          const id = String(item.id);
          const known = knownModels.get(id);
          
          return {
            id,
            name: known?.name ?? id,
            providerId: config.id,
            contextWindow: known?.contextWindow ?? 128000,
            maxOutputTokens: known?.maxOutputTokens ?? 4096,
            supportsStreaming: true,
            supportsTools: known?.supportsTools ?? true,
            supportsVision: known?.supportsVision ?? false,
            supportsReasoning: known?.supportsReasoning ?? false,
            pricing: known?.pricing,
            metadata: item,
          };
        });
    } catch (error) {
      console.warn(`[OpenAIAdapter] Model discovery failed, using known models:`, error);
      return OPENAI_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
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
        details: `Connected to OpenAI. Found ${models.length} models.`,
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

export const openaiAdapter = new OpenAIAdapter();