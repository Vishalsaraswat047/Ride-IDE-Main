import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { RideModel, ProviderKind, AgentProviderMode } from "@ride/contracts";
import { credentialService } from "../credential";

export interface AIProvider {
  id: string;
  name: string;
  displayName: string;
  kind: ProviderKind;
  endpoint?: string;
  baseUrl?: string;
  authentication: ProviderAuthentication;
  models: ProviderModel[];
  capabilities: ProviderCapabilities;
  streaming: boolean;
  toolCalling: boolean;
  vision: boolean;
  reasoning: boolean;
  enabled: boolean;
  priority: number;
  metadata: Record<string, unknown>;
}

export interface ProviderAuthentication {
  type: "api_key" | "oauth" | "none" | "custom";
  apiKeyName?: string;
  oauthConfig?: OAuthConfig;
  customHeaders?: Record<string, string>;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export interface ProviderModel {
  id: string;
  name: string;
  providerId: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
  supportsReasoning: boolean;
  pricing?: ModelPricing;
  metadata?: Record<string, unknown>;
}

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
  currency: string;
}

export interface ProviderCapabilities {
  chat: boolean;
  completion: boolean;
  embeddings: boolean;
  images: boolean;
  audio: boolean;
  fineTuning: boolean;
  batch: boolean;
}

export interface ProviderTestResult {
  success: boolean;
  latency?: number;
  modelsFound?: number;
  error?: string;
  details?: string;
}

export interface ModelTestResult {
  success: boolean;
  latency?: number;
  tokensUsed?: number;
  error?: string;
}

export interface ProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly displayName: string;
  readonly defaultBaseUrl?: string;
  readonly kind: ProviderKind;
  readonly capabilities: ProviderCapabilities;
  readonly requiresApiKey: boolean;
  readonly apiKeyEnvVar?: string;
  readonly modelsEndpoint?: string;
  
  discoverModels(config: ProviderConfig): Promise<ProviderModel[]>;
  testConnection(config: ProviderConfig): Promise<ProviderTestResult>;
  testModel(config: ProviderConfig, modelId: string): Promise<ModelTestResult>;
  getHeaders(config: ProviderConfig): Record<string, string>;
  transformRequest(config: ProviderConfig, request: unknown): unknown;
  transformResponse(response: unknown): unknown;
}

export interface ProviderConfig {
  id: string;
  baseUrl: string;
  apiKey?: string;
  customHeaders?: Record<string, string>;
  organization?: string;
  project?: string;
}

export class ProviderRegistry extends EventEmitter {
  private adapters = new Map<string, ProviderAdapter>();
  private providers = new Map<string, AIProvider>();
  private providerOrder: string[] = [];

  registerAdapter(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
    this.emit("adapterRegistered", adapter.id);
  }

  getAdapter(id: string): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  listAdapters(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  async createProvider(
    adapterId: string,
    config: Partial<ProviderConfig> & { name: string; displayName?: string }
  ): Promise<AIProvider> {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new Error(`Unknown provider adapter: ${adapterId}`);
    }

    const fullConfig: ProviderConfig = {
      id: randomUUID(),
      baseUrl: config.baseUrl ?? adapter.defaultBaseUrl ?? "",
      apiKey: config.apiKey,
      customHeaders: config.customHeaders,
      organization: config.organization,
      project: config.project,
    };

    if (adapter.requiresApiKey && !fullConfig.apiKey) {
      const keyName = adapter.apiKeyEnvVar ?? `RIDE_${adapter.id.toUpperCase()}_KEY`;
      fullConfig.apiKey = await credentialService.get(keyName) ?? "";
    }

    const models = await this.discoverModels(adapter, fullConfig);

    const provider: AIProvider = {
      id: fullConfig.id,
      name: config.name,
      displayName: config.displayName ?? config.name,
      kind: adapter.kind,
      baseUrl: fullConfig.baseUrl,
      authentication: {
        type: adapter.requiresApiKey ? "api_key" : "none",
        apiKeyName: adapter.apiKeyEnvVar,
      },
      models,
      capabilities: adapter.capabilities,
      streaming: true,
      toolCalling: models.some(m => m.supportsTools),
      vision: models.some(m => m.supportsVision),
      reasoning: models.some(m => m.supportsReasoning),
      enabled: true,
      priority: this.providerOrder.length,
      metadata: {
        adapterId,
        organization: fullConfig.organization,
        project: fullConfig.project,
      },
    };

    this.providers.set(provider.id, provider);
    this.providerOrder.push(provider.id);
    this.emit("providerCreated", provider);
    
    return provider;
  }

  async discoverModels(adapter: ProviderAdapter, config: ProviderConfig): Promise<ProviderModel[]> {
    try {
      return await adapter.discoverModels(config);
    } catch (error) {
      console.warn(`[ProviderRegistry] Failed to discover models for ${adapter.id}:`, error);
      return [];
    }
  }

  async testProvider(providerId: string): Promise<ProviderTestResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    const adapter = this.adapters.get(provider.metadata.adapterId as string);
    if (!adapter) {
      return { success: false, error: "Adapter not found" };
    }

    const config: ProviderConfig = {
      id: provider.id,
      baseUrl: provider.baseUrl ?? "",
      apiKey: provider.authentication.type === "api_key" 
        ? await credentialService.get(provider.authentication.apiKeyName ?? "") ?? ""
        : undefined,
      customHeaders: provider.authentication.customHeaders,
      organization: provider.metadata.organization as string,
      project: provider.metadata.project as string,
    };

    return adapter.testConnection(config);
  }

  async testModel(providerId: string, modelId: string): Promise<ModelTestResult> {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: "Provider not found" };
    }

    const adapter = this.adapters.get(provider.metadata.adapterId as string);
    if (!adapter) {
      return { success: false, error: "Adapter not found" };
    }

    const config: ProviderConfig = {
      id: provider.id,
      baseUrl: provider.baseUrl ?? "",
      apiKey: provider.authentication.type === "api_key" 
        ? await credentialService.get(provider.authentication.apiKeyName ?? "") ?? ""
        : undefined,
      customHeaders: provider.authentication.customHeaders,
      organization: provider.metadata.organization as string,
      project: provider.metadata.project as string,
    };

    return adapter.testModel(config, modelId);
  }

  getProvider(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  listProviders(): AIProvider[] {
    return this.providerOrder
      .map(id => this.providers.get(id))
      .filter((p): p is AIProvider => p !== undefined)
      .sort((a, b) => a.priority - b.priority);
  }

  listEnabledProviders(): AIProvider[] {
    return this.listProviders().filter(p => p.enabled);
  }

  async updateProvider(id: string, updates: Partial<AIProvider>): Promise<AIProvider | undefined> {
    const provider = this.providers.get(id);
    if (!provider) return undefined;

    const updated = { ...provider, ...updates };
    this.providers.set(id, updated);
    this.emit("providerUpdated", updated);
    return updated;
  }

  async deleteProvider(id: string): Promise<boolean> {
    const provider = this.providers.get(id);
    if (!provider) return false;

    if (provider.authentication.type === "api_key" && provider.authentication.apiKeyName) {
      await credentialService.delete(provider.authentication.apiKeyName);
    }

    this.providers.delete(id);
    this.providerOrder = this.providerOrder.filter(pid => pid !== id);
    this.emit("providerDeleted", id);
    return true;
  }

  async reorderProviders(ids: string[]): Promise<void> {
    this.providerOrder = ids;
    ids.forEach((id, index) => {
      const provider = this.providers.get(id);
      if (provider) {
        provider.priority = index;
      }
    });
    this.emit("providersReordered", this.listProviders());
  }

  getAllModels(): ProviderModel[] {
    const models: ProviderModel[] = [];
    for (const provider of this.listEnabledProviders()) {
      for (const model of provider.models) {
        models.push({ ...model, providerId: provider.id });
      }
    }
    return models;
  }

  getModelsForProvider(providerId: string): ProviderModel[] {
    const provider = this.providers.get(providerId);
    return provider?.models ?? [];
  }

  findModel(modelId: string): { provider: AIProvider; model: ProviderModel } | undefined {
    for (const provider of this.listEnabledProviders()) {
      const model = provider.models.find(m => m.id === modelId);
      if (model) return { provider, model };
    }
    return undefined;
  }

  async refreshModels(providerId: string): Promise<ProviderModel[]> {
    const provider = this.providers.get(providerId);
    if (!provider) return [];

    const adapter = this.adapters.get(provider.metadata.adapterId as string);
    if (!adapter) return [];

    const config: ProviderConfig = {
      id: provider.id,
      baseUrl: provider.baseUrl ?? "",
      apiKey: provider.authentication.type === "api_key" 
        ? await credentialService.get(provider.authentication.apiKeyName ?? "") ?? ""
        : undefined,
      customHeaders: provider.authentication.customHeaders,
      organization: provider.metadata.organization as string,
      project: provider.metadata.project as string,
    };

    const models = await this.discoverModels(adapter, config);
    provider.models = models;
    provider.streaming = models.some(m => m.supportsStreaming);
    provider.toolCalling = models.some(m => m.supportsTools);
    provider.vision = models.some(m => m.supportsVision);
    provider.reasoning = models.some(m => m.supportsReasoning);
    
    this.emit("providerModelsRefreshed", provider);
    return models;
  }
}

export const providerRegistry = new ProviderRegistry();