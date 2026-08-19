import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const GOOGLE_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: true,
  images: false,
  audio: false,
  fineTuning: false,
  batch: false,
};

const GOOGLE_KNOWN_MODELS: ProviderModel[] = [
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    providerId: "",
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    pricing: { inputPer1M: 3.5, outputPer1M: 10.5, currency: "USD" },
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    providerId: "",
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
    pricing: { inputPer1M: 0.075, outputPer1M: 0.3, currency: "USD" },
  },
  {
    id: "gemini-1.0-pro",
    name: "Gemini 1.0 Pro",
    providerId: "",
    contextWindow: 32768,
    maxOutputTokens: 2048,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
    pricing: { inputPer1M: 0.5, outputPer1M: 1.5, currency: "USD" },
  },
];

export class GoogleAdapter implements ProviderAdapter {
  readonly id = "google";
  readonly name = "Google";
  readonly displayName = "Google AI (Gemini)";
  readonly defaultBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
  readonly kind = "byok" as const;
  readonly capabilities = GOOGLE_CAPABILITIES;
  readonly requiresApiKey = true;
  readonly apiKeyEnvVar = "GOOGLE_API_KEY";
  readonly modelsEndpoint = "/models";

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
    const apiKey = config.apiKey;
    
    if (!apiKey) return request;
    
    const url = req.url as string;
    if (url) {
      req.url = `${url}?key=${apiKey}`;
    }
    
    const { messages, ...rest } = req;
    
    if (messages && Array.isArray(messages)) {
      return {
        ...rest,
        contents: messages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : m.role,
          parts: [{ text: m.content }],
        })),
      };
    }
    
    return request;
  }

  transformResponse(response: unknown): unknown {
    const res = response as Record<string, unknown>;
    
    if (res.candidates && Array.isArray(res.candidates)) {
      const candidate = res.candidates[0];
      if (candidate && typeof candidate === "object" && "content" in candidate) {
        const content = candidate.content as { parts?: Array<{ text?: string }> };
        const text = content.parts?.[0]?.text ?? "";
        
        const usage = res.usageMetadata as
          | { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number }
          | undefined;
        return {
          choices: [{
            message: { content: text, role: "assistant" },
            finish_reason: candidate.finishReason ?? "stop",
          }],
          usage: usage ? {
            prompt_tokens: usage.promptTokenCount,
            completion_tokens: usage.candidatesTokenCount,
            total_tokens: usage.totalTokenCount,
          } : undefined,
        };
      }
    }
    
    return response;
  }

  private getApiKey(config: ProviderConfig): string {
    return config.apiKey ?? "";
  }

  private buildUrl(config: ProviderConfig, path: string): string {
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    const apiKey = this.getApiKey(config);
    return `${baseUrl}${path}?key=${apiKey}`;
  }

  async discoverModels(config: ProviderConfig): Promise<ProviderModel[]> {
    const url = this.buildUrl(config, this.modelsEndpoint!);
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(config),
      });
      
      if (!response.ok) {
        console.warn(`[GoogleAdapter] Model discovery failed: ${response.status}`);
        return GOOGLE_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      const data: any = await response.json();
      
      if (!data || typeof data !== "object" || !Array.isArray(data.models)) {
        return GOOGLE_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      const knownModels = new Map(GOOGLE_KNOWN_MODELS.map(m => [m.id.replace("models/", ""), m]));
      
      return data.models
        .filter((item: any) => 
          item !== null && typeof item === "object" && "name" in item
        )
        .map((item: any) => {
          const name = String(item.name).replace("models/", "");
          const known = knownModels.get(name);
          
          return {
            id: name,
            name: known?.name ?? name,
            providerId: config.id,
            contextWindow: known?.contextWindow ?? 
              (typeof item.inputTokenLimit === "number" ? item.inputTokenLimit : 32768),
            maxOutputTokens: known?.maxOutputTokens ?? 
              (typeof item.outputTokenLimit === "number" ? item.outputTokenLimit : 2048),
            supportsStreaming: true,
            supportsTools: known?.supportsTools ?? true,
            supportsVision: known?.supportsVision ?? false,
            supportsReasoning: known?.supportsReasoning ?? false,
            pricing: known?.pricing,
            metadata: item,
          };
        });
    } catch (error) {
      console.warn(`[GoogleAdapter] Model discovery failed, using known models:`, error);
      return GOOGLE_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
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
        details: `Connected to Google AI. Found ${models.length} models.`,
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
    const url = this.buildUrl(config, `/models/${modelId}:generateContent`);
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Test" }] }],
          generationConfig: { maxOutputTokens: 5, temperature: 0 },
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
      const usage = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
      
      return {
        success: true,
        latency,
        tokensUsed: (usage?.promptTokenCount ?? 0) + (usage?.candidatesTokenCount ?? 0),
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

export const googleAdapter = new GoogleAdapter();