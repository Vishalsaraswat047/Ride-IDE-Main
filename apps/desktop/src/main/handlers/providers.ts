import { ipcMain } from "electron";
import { IpcChannel, type CreateProviderRequest } from "@ride/contracts";
import { providerRegistry } from "../services/provider";
import { registerBuiltinAdapters } from "../services/provider/adapters";
import { modelService } from "../services/model";
import { credentialService } from "../services/credential";
import { sendToRenderer } from "../index";

let adaptersRegistered = false;

function ensureAdapters(): void {
  if (!adaptersRegistered) {
    registerBuiltinAdapters();
    adaptersRegistered = true;
  }
}

export function wireProviderBroadcasts(): void {
  providerRegistry.on("providerCreated", (p) => sendToRenderer(IpcChannel.providers.changed, { type: "created", provider: p }));
  providerRegistry.on("providerUpdated", (p) => sendToRenderer(IpcChannel.providers.changed, { type: "updated", provider: p }));
  providerRegistry.on("providerDeleted", (id) => sendToRenderer(IpcChannel.providers.changed, { type: "deleted", id }));
  providerRegistry.on("providerModelsRefreshed", (p) => sendToRenderer(IpcChannel.providers.changed, { type: "models-refreshed", provider: p }));

  modelService.on("synced", (data) => sendToRenderer(IpcChannel.models.changed, { type: "synced", ...data }));
  modelService.on("configurationCreated", (c) => sendToRenderer(IpcChannel.models.changed, { type: "created", configuration: c }));
  modelService.on("configurationUpdated", (c) => sendToRenderer(IpcChannel.models.changed, { type: "updated", configuration: c }));
  modelService.on("configurationDeleted", (id) => sendToRenderer(IpcChannel.models.changed, { type: "deleted", id }));
  modelService.on("defaultModelChanged", (id) => sendToRenderer(IpcChannel.models.changed, { type: "default-changed", id }));
  modelService.on("agentProfileCreated", (p) => sendToRenderer(IpcChannel.models.changed, { type: "profile-created", profile: p }));
  modelService.on("agentProfileUpdated", (p) => sendToRenderer(IpcChannel.models.changed, { type: "profile-updated", profile: p }));
  modelService.on("agentProfileDeleted", (id) => sendToRenderer(IpcChannel.models.changed, { type: "profile-deleted", id }));
}

export function registerProviderHandlers(): void {
  ensureAdapters();
  wireProviderBroadcasts();

  ipcMain.handle(IpcChannel.providers.list, () => providerRegistry.listProviders());

  ipcMain.handle(IpcChannel.providers.listAdapters, () =>
    providerRegistry.listAdapters().map((a) => ({
      id: a.id,
      name: a.name,
      displayName: a.displayName,
      kind: a.kind,
      requiresApiKey: a.requiresApiKey,
      defaultBaseUrl: a.defaultBaseUrl,
      capabilities: a.capabilities,
    })),
  );

  ipcMain.handle(IpcChannel.providers.create, async (_e, req: CreateProviderRequest) => {
    const provider = await providerRegistry.createProvider(req.adapterId, req);
    await modelService.syncWithProviders();
    return provider;
  });

  ipcMain.handle(IpcChannel.providers.update, async (_e, id: string, updates: Record<string, unknown>) => {
    return providerRegistry.updateProvider(id, updates);
  });

  ipcMain.handle(IpcChannel.providers.delete, async (_e, id: string) => {
    return providerRegistry.deleteProvider(id);
  });

  ipcMain.handle(IpcChannel.providers.test, (_e, id: string) => providerRegistry.testProvider(id));

  ipcMain.handle(IpcChannel.providers.testModel, (_e, providerId: string, modelId: string) =>
    providerRegistry.testModel(providerId, modelId),
  );

  ipcMain.handle(IpcChannel.providers.refreshModels, async (_e, id: string) => {
    const models = await providerRegistry.refreshModels(id);
    await modelService.syncWithProviders();
    return models;
  });

  ipcMain.handle(IpcChannel.providers.enabled, () => providerRegistry.listEnabledProviders());

  // ─── Models ───

  ipcMain.handle(IpcChannel.models.list, async () => {
    await modelService.syncWithProviders();
    return modelService.getConfigurations();
  });

  ipcMain.handle(IpcChannel.models.create, (_e, providerId: string, modelId: string, overrides?: Record<string, unknown>) =>
    modelService.createConfiguration(providerId, modelId, overrides),
  );

  ipcMain.handle(IpcChannel.models.update, (_e, id: string, updates: Record<string, unknown>) =>
    modelService.updateConfiguration(id, updates),
  );

  ipcMain.handle(IpcChannel.models.delete, (_e, id: string) => modelService.deleteConfiguration(id));

  ipcMain.handle(IpcChannel.models.setDefault, (_e, id: string) => modelService.setDefaultModel(id));

  ipcMain.handle(IpcChannel.models.getDefault, () => modelService.getDefaultModel());

  ipcMain.handle(IpcChannel.models.getFallbacks, () => modelService.getFallbacks());

  ipcMain.handle(IpcChannel.models.createFallback, (_e, fallback: Record<string, unknown>) =>
    modelService.createFallback(fallback as never),
  );

  ipcMain.handle(IpcChannel.models.updateFallback, (_e, id: string, updates: Record<string, unknown>) =>
    modelService.updateFallback(id, updates),
  );

  ipcMain.handle(IpcChannel.models.deleteFallback, (_e, id: string) => modelService.deleteFallback(id));

  ipcMain.handle(IpcChannel.models.getRoutingRules, () => modelService.getRoutingRules());

  ipcMain.handle(IpcChannel.models.createRoutingRule, (_e, rule: Record<string, unknown>) =>
    modelService.createRoutingRule(rule as never),
  );

  ipcMain.handle(IpcChannel.models.updateRoutingRule, (_e, id: string, updates: Record<string, unknown>) =>
    modelService.updateRoutingRule(id, updates),
  );

  ipcMain.handle(IpcChannel.models.deleteRoutingRule, (_e, id: string) => modelService.deleteRoutingRule(id));

  ipcMain.handle(IpcChannel.models.getProfiles, () => modelService.getAgentProfiles());

  ipcMain.handle(IpcChannel.models.createProfile, (_e, profile: Record<string, unknown>) =>
    modelService.createAgentProfile(profile as never),
  );

  ipcMain.handle(IpcChannel.models.updateProfile, (_e, id: string, updates: Record<string, unknown>) =>
    modelService.updateAgentProfile(id, updates),
  );

  ipcMain.handle(IpcChannel.models.deleteProfile, (_e, id: string) => modelService.deleteAgentProfile(id));

  // ─── Credentials ───

  ipcMain.handle(IpcChannel.credentials.list, async () => {
    const stored = await credentialService.list();
    return stored.map((c) => ({
      key: c.key,
      hasValue: c.value.length > 0,
      updatedAt: c.updatedAt,
    }));
  });

  ipcMain.handle(IpcChannel.credentials.getStatus, async () => ({
    vaultType: credentialService.getVaultType(),
    secure: credentialService.getVaultType() === "os",
  }));

  ipcMain.handle(IpcChannel.credentials.set, async (_e, key: string, value: string) => {
    await credentialService.set(key, value);
    sendToRenderer(IpcChannel.credentials.changed, { type: "set", key });
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.credentials.delete, async (_e, key: string) => {
    await credentialService.delete(key);
    sendToRenderer(IpcChannel.credentials.changed, { type: "deleted", key });
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.credentials.test, async (_e, key: string) => {
    const value = await credentialService.get(key);
    return { ok: value !== null && value.length > 0 };
  });
}