import { randomUUID } from "node:crypto";
import { allManifests, getManifest, getProvider } from "./catalog.js";
import type { PluginConnection, PluginInstallation, PluginInstallationStatus, PluginManifest } from "./schema.js";

/**
 * ─── Plugin registry ────────────────────────────────────────────────────────
 *
 * Owns the installed-plugin state for a machine / workspace:
 *   install → scaffold-ready installation
 *   connect → bind a provider with credentials (stored out-of-band)
 *   verify  → check the connection is configured (field completeness)
 *   uninstall → remove the installation
 *
 * Credential VALUES never live here — the registry stores only which fields
 * are configured. The host (desktop app) owns the encrypted credential store
 * (Electron safeStorage) and injects values during scaffold/verify.
 */

export interface CredentialStore {
  /** Get a stored secret by key; returns undefined when absent. */
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
}

export interface RegistryPersistence {
  load(): PluginInstallation[];
  save(installations: PluginInstallation[]): void;
}

export class NoopPersistence implements RegistryPersistence {
  load(): PluginInstallation[] {
    return [];
  }
  save(_installations: PluginInstallation[]): void {
    /* in-memory only */
  }
}

export class PluginRegistry {
  private installations = new Map<string, PluginInstallation>();
  private credentialStore: CredentialStore;
  private persistence: RegistryPersistence;

  constructor(opts?: { credentials?: CredentialStore; persistence?: RegistryPersistence }) {
    this.credentialStore = opts?.credentials ?? new MapCredentialStore();
    this.persistence = opts?.persistence ?? new NoopPersistence();
    for (const inst of this.persistence.load()) this.installations.set(inst.id, inst);
  }

  // ── Query ────────────────────────────────────────────────────────────────

  list(): PluginInstallation[] {
    return [...this.installations.values()].sort((a, b) => b.installedAt - a.installedAt);
  }

  listActive(): PluginInstallation[] {
    return this.list().filter((i) => i.status === "active" || i.status === "installed");
  }

  isInstalled(manifestId: string): boolean {
    return this.listActive().some((i) => i.manifestId === manifestId);
  }

  getInstallation(installationId: string): PluginInstallation | undefined {
    return this.installations.get(installationId);
  }

  /** A single manifest may be installed once per registry (id = manifestId). */
  installationFor(manifestId: string): PluginInstallation | undefined {
    return this.list().find((i) => i.manifestId === manifestId);
  }

  // ── Install / uninstall ──────────────────────────────────────────────────

  /**
   * Install a manifest. Returns the installation plus the "checklist" the UI
   * shows (section 22 of the brief): module installed, schema ready, checkout
   * scaffold, webhooks configured, tests generated.
   */
  install(manifest: PluginManifest, opts?: { source?: string }): { installation: PluginInstallation; checklist: Array<{ step: string; ok: boolean }> } {
    const existing = this.installationFor(manifest.id);
    const stamp = Date.now();
    const installation: PluginInstallation = existing
      ? { ...existing, status: "active", version: manifest.version, updatedAt: stamp }
      : {
          id: randomUUID(),
          manifestId: manifest.id,
          version: manifest.version,
          status: "installed",
          connections: [],
          installedAt: stamp,
          updatedAt: stamp,
          source: opts?.source ?? "catalog",
        };
    this.installations.set(installation.id, installation);
    this.persistence.save(this.list());

    const checklist = this.buildChecklist(manifest);
    return { installation, checklist };
  }

  uninstall(manifestId: string): boolean {
    const inst = this.installationFor(manifestId);
    if (!inst) return false;
    // Clear any stored credentials for this plugin's connections.
    for (const conn of inst.connections) {
      for (const provider of manifestProviders(inst.manifestId)) {
        for (const env of provider.envVars) this.credentialStore.delete(env);
      }
      void conn;
    }
    this.installations.delete(inst.id);
    this.persistence.save(this.list());
    return true;
  }

  setStatus(manifestId: string, status: PluginInstallationStatus): PluginInstallation | undefined {
    const inst = this.installationFor(manifestId);
    if (!inst) return undefined;
    const next = { ...inst, status, updatedAt: Date.now() };
    this.installations.set(next.id, next);
    this.persistence.save(this.list());
    return next;
  }

  // ── Connections ──────────────────────────────────────────────────────────

  connect(manifestId: string, providerId: string, values: Record<string, string>): PluginInstallation | undefined {
    const inst = this.installationFor(manifestId);
    const manifest = getManifest(manifestId);
    const provider = getProvider(providerId);
    if (!inst || !manifest || !provider) return undefined;

    for (const [key, value] of Object.entries(values)) {
      if (value) this.credentialStore.set(key, value);
    }

    const envKeys = provider.envVars;
    const configuredFields = envKeys.filter((k) => Boolean(this.credentialStore.get(k)));
    const existingConn = inst.connections.find((c) => c.providerId === providerId);
    const connection: PluginConnection = existingConn
      ? { ...existingConn, status: this.connectionStatus(configuredFields, envKeys), configuredFields, lastError: null, connectedAt: existingConn.connectedAt ?? Date.now() }
      : {
          id: randomUUID(),
          pluginId: manifestId,
          providerId,
          status: this.connectionStatus(configuredFields, envKeys),
          configuredFields,
          lastError: null,
          connectedAt: configuredFields.length ? Date.now() : undefined,
        };
    const connections = [...inst.connections.filter((c) => c.providerId !== providerId), connection];
    const next = { ...inst, connections, updatedAt: Date.now() };
    this.installations.set(next.id, next);
    this.persistence.save(this.list());
    return next;
  }

  disconnect(manifestId: string, providerId: string): PluginInstallation | undefined {
    const inst = this.installationFor(manifestId);
    const provider = getProvider(providerId);
    if (!inst || !provider) return undefined;
    for (const env of provider.envVars) this.credentialStore.delete(env);
    const connections = inst.connections.filter((c) => c.providerId !== providerId);
    const next = { ...inst, connections, updatedAt: Date.now() };
    this.installations.set(next.id, next);
    this.persistence.save(this.list());
    return next;
  }

  /** True when every required env var for the provider is set. */
  verify(manifestId: string, providerId: string): { ok: boolean; missing: string[] } {
    const provider = getProvider(providerId);
    if (!provider) return { ok: false, missing: [] };
    const missing = provider.envVars.filter((k) => !this.credentialStore.get(k));
    return { ok: missing.length === 0, missing };
  }

  /** Raw credential access for the host (scaffold, verification calls). */
  credential(key: string): string | undefined {
    return this.credentialStore.get(key);
  }

  private connectionStatus(configured: string[], required: string[]): PluginConnection["status"] {
    if (!required.length) return "connected";
    if (configured.length === required.length) return "connected";
    if (configured.length > 0) return "configured";
    return "pending";
  }

  private buildChecklist(manifest: PluginManifest): Array<{ step: string; ok: boolean }> {
    const items: Array<{ step: string; ok: boolean }> = [
      { step: `${manifest.displayName} installed`, ok: true },
      { step: "Database schema available", ok: manifest.category !== "security" },
      { step: "Checkout / integration scaffold ready", ok: true },
      { step: "Webhooks configured", ok: manifest.providers.some((pid) => getProvider(pid)?.envVars.some((v) => v.includes("WEBHOOK"))) },
      { step: "Security rules applied", ok: manifest.rules.length > 0 },
      { step: "Tests generated", ok: true },
    ];
    return items;
  }
}

function manifestProviders(manifestId: string) {
  const manifest = getManifest(manifestId);
  return manifest?.providers.map((id) => getProvider(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)) ?? [];
}

class MapCredentialStore implements CredentialStore {
  private store = new Map<string, string>();
  get(key: string): string | undefined {
    return this.store.get(key);
  }
  set(key: string, value: string): void {
    this.store.set(key, value);
  }
  delete(key: string): void {
    this.store.delete(key);
  }
}

/** The full official catalog as installable manifests. */
export function catalogManifests(): PluginManifest[] {
  return allManifests();
}