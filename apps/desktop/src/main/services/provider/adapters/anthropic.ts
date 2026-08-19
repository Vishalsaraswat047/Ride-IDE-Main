import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const ANTHROPIC_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: false,
  images: false,
  audio: false,
  fineTuning: false,
  batch: true,
};

const ANTHROPIC_KNOWN_MODELS: ProviderModel[] = [
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    providerId: "",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    providerId: "",
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    providerId: "",
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: false,
  },
];

export class AnthropicAdapter implements ProviderAdapter {
  readonly id = "anthropic";
  readonly name = "Anthropic";
  readonly displayName = "Anthropic";
  readonly defaultBaseUrl = "https://api.anthropic.com";
  readonly kind = "byok" as const;
  readonly capabilities = ANTHROPIC_CAPABILITIES;
  readonly requiresApiKey = true;
  readonly apiKeyEnvVar = "ANTHROPIC_API_KEY";

  getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    
    if (config.apiKey) {
      headers["x-api-key"] = config.apiKey;
    }
    
    if (config.customHeaders) {
      Object.assign(headers, config.customHeaders);
    }
    
    return headers;
  }

  transformRequest(config: ProviderConfig, request: unknown): unknown {
    const req = request as Record<string, unknown>;
    
    if (req.messages && Array.isArray(req.messages)) {
      const systemMessages = req.messages.filter((m: any) => m.role === "system");
      const otherMessages = req.messages.filter((m: any) => m.role !== "system");
      
      return {
        ...req,
        system: systemMessages.map((m: any) => m.content).join("\n\n"),
        messages: otherMessages,
      };
    }
    
    return request;
  }

  transformResponse(response: unknown): unknown {
    return response;
  }

  async discoverModels(config: ProviderConfig): Promise<ProviderModel[]> {
    return ANTHROPIC_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
  }

  async testConnection(config: ProviderConfig): Promise<ProviderTestResult> {
    const start = Date.now();
    const baseUrl = config.baseUrl.replace(/\/+$/, "");
    
    try {
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 5,
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
      
      return {
        success: true,
        latency,
        modelsFound: ANTHROPIC_KNOWN_MODELS.length,
        details: `Connected to Anthropic. ${ANTHROPIC_KNOWN_MODELS.length} known models available.`,
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
      const response = await fetch(`${baseUrl}/v1/messages`, {
        method: "POST",
        headers: this.getHeaders(config),
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: "user", content: "Test" }],
          max_tokens: 5,
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
      const usage = data.usage as { input_tokens?: number; output_tokens?: number } | undefined;
      
      return {
        success: true,
        latency,
        tokensUsed: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
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

export const anthropicAdapter = new AnthropicAdapter();