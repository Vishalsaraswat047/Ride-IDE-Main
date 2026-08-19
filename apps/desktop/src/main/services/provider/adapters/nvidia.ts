import type { ProviderAdapter, ProviderConfig, ProviderModel, ProviderTestResult, ModelTestResult, ProviderCapabilities } from "../index";

const NVIDIA_CAPABILITIES: ProviderCapabilities = {
  chat: true,
  completion: true,
  embeddings: false,
  images: false,
  audio: false,
  fineTuning: false,
  batch: false,
};

const NVIDIA_KNOWN_MODELS: ProviderModel[] = [
  {
    id: "nvidia/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    providerId: "",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "nvidia/nemotron-3-ultra",
    name: "Nemotron 3 Ultra",
    providerId: "",
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  {
    id: "nvidia/nemotron-4-340b-instruct",
    name: "Nemotron 4 340B Instruct",
    providerId: "",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: true,
  },
  {
    id: "nvidia/glm-4-9b-chat",
    name: "GLM-4 9B Chat",
    providerId: "",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
  },
  {
    id: "nvidia/qwen2.5-coder-32b-instruct",
    name: "Qwen2.5 Coder 32B Instruct",
    providerId: "",
    contextWindow: 131072,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
    supportsReasoning: false,
  },
];

export class NVIDIAAdapter implements ProviderAdapter {
  readonly id = "nvidia";
  readonly name = "NVIDIA NIM";
  readonly displayName = "NVIDIA NIM";
  readonly defaultBaseUrl = "https://integrate.api.nvidia.com/v1";
  readonly kind = "remote" as const;
  readonly capabilities = NVIDIA_CAPABILITIES;
  readonly requiresApiKey = true;
  readonly apiKeyEnvVar = "RIDE_NVIDIA_KEY";
  readonly modelsEndpoint = "/models";

  getHeaders(config: ProviderConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
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
        console.warn(`[NVIDIAAdapter] Model discovery failed: ${response.status}`);
        return NVIDIA_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      const data: any = await response.json();
      
      if (!data || typeof data !== "object" || !Array.isArray(data.data)) {
        return NVIDIA_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
      }
      
      return data.data
        .filter((item: any) => 
          item !== null && typeof item === "object" && "id" in item
        )
        .map((item: any) => ({
          id: String(item.id),
          name: String(item.name ?? item.id),
          providerId: config.id,
          contextWindow: typeof item.context_length === "number" ? item.context_length : 
                         typeof item.context_window === "number" ? item.context_window : 131072,
          maxOutputTokens: typeof item.max_output_tokens === "number" ? item.max_output_tokens : 8192,
          supportsStreaming: true,
          supportsTools: Boolean(item.supports_tools ?? item.tool_calling ?? true),
          supportsVision: Boolean(item.vision ?? item.supports_vision ?? false),
          supportsReasoning: Boolean(item.reasoning ?? item.supports_reasoning ?? false),
          metadata: item,
        }));
    } catch (error) {
      console.warn(`[NVIDIAAdapter] Model discovery failed, using known models:`, error);
      return NVIDIA_KNOWN_MODELS.map(m => ({ ...m, providerId: config.id }));
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
        details: `Connected to NVIDIA NIM. Found ${models.length} models.`,
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

export const nvidiaAdapter = new NVIDIAAdapter();