import { EventEmitter } from "node:events";
import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  PluginRegistry,
  catalogManifests,
  generateScaffold,
  getManifest,
  getProvider,
  analyzePrompt,
  type PluginInstallation,
  type PluginManifest,
  type ScaffoldFile,
} from "@ride/plugins";
import { MarketplaceStore, type MarketplaceListing, type PurchaseRecord } from "@ride/marketplace";
import { credentialService } from "../credential/index.js";
import { JsonMarketplacePersistence, TemplateMarketplaceService, type BundleInfo, type BundleSource } from "../marketplace/templates.js";

/**
 * RIDE plugin service (main process).
 *
 * Owns the local plugin registry + the marketplace store, persisted under
 * userData. Provider credentials are held in the encrypted credential vault —
 * only "which fields are configured" is exposed to the renderer.
 */

interface PersistedState {
  installations: PluginInstallation[];
}

function statePath(): string {
  return join(app.getPath("userData"), "plugins", "state.json");
}

export class PluginService extends EventEmitter {
  registry = new PluginRegistry({ credentials: this.syncCredentialStore() });
  marketplace = new MarketplaceStore(new JsonMarketplacePersistence());
  /** Template upload/import service sharing the same persisted store. */
  templates = new TemplateMarketplaceService(this.marketplace);
  private credentialValues = new Map<string, string>();
  private ready = false;

  private syncCredentialStore() {
    return {
      get: (key: string) => this.credentialValues.get(key),
      set: (key: string, value: string) => {
        this.credentialValues.set(key, value);
        void this.saveCredential(key, value);
      },
      delete: (key: string) => {
        this.credentialValues.delete(key);
        void this.deleteCredential(key);
      },
    };
  }

  async init(): Promise<void> {
    if (this.ready) return;
    await mkdir(join(app.getPath("userData"), "plugins"), { recursive: true });
    try {
      const raw = await readFile(statePath(), "utf8");
      const state = JSON.parse(raw) as PersistedState;
      for (const inst of state.installations ?? []) {
        if (this.registry.installationFor(inst.manifestId)) continue;
        this.registry.install(getManifest(inst.manifestId) ?? stubManifest(inst), { source: inst.source });
      }
    } catch {
      /* first run — no state yet */
    }
    await this.loadCredentials();
    await this.templates.init();
    this.ready = true;
  }

  private async persist(): Promise<void> {
    const state: PersistedState = { installations: this.registry.list() };
    await mkdir(join(app.getPath("userData"), "plugins"), { recursive: true });
    await writeFile(statePath(), JSON.stringify(state, null, 2), "utf8");
  }

  private async loadCredentials(): Promise<void> {
    try {
      const stored = await credentialService.list();
      for (const cred of stored) {
        if (cred.key.startsWith("plugin:")) {
          this.credentialValues.set(cred.key.slice("plugin:".length), cred.value);
        }
      }
    } catch {
      /* vault unavailable — credentials stay in-session */
    }
  }

  private async saveCredential(key: string, value: string): Promise<void> {
    try {
      await credentialService.set(`plugin:${key}`, value, { scope: "plugin" });
    } catch {
      /* session-only */
    }
  }

  private async deleteCredential(key: string): Promise<void> {
    try {
      await credentialService.delete(`plugin:${key}`);
    } catch {
      /* noop */
    }
  }

  // ── Catalog & install ────────────────────────────────────────────────────

  catalog(): PluginManifest[] {
    return catalogManifests();
  }

  installed(): PluginInstallation[] {
    return this.registry.list();
  }

  install(manifestId: string): { installation: PluginInstallation; checklist: Array<{ step: string; ok: boolean }> } {
    const manifest = getManifest(manifestId);
    if (!manifest) throw new Error(`Plugin ${manifestId} not found in catalog`);
    const result = this.registry.install(manifest);
    void this.persist();
    this.emit("changed", { type: "installed", manifestId });
    return result;
  }

  uninstall(manifestId: string): boolean {
    const ok = this.registry.uninstall(manifestId);
    void this.persist();
    if (ok) this.emit("changed", { type: "uninstalled", manifestId });
    return ok;
  }

  setEnabled(manifestId: string, enabled: boolean) {
    const next = this.registry.setStatus(manifestId, enabled ? "active" : "disabled");
    void this.persist();
    if (next) this.emit("changed", { type: enabled ? "enabled" : "disabled", manifestId });
    return next;
  }

  // ── Connect ──────────────────────────────────────────────────────────────

  connect(manifestId: string, providerId: string, values: Record<string, string>) {
    const next = this.registry.connect(manifestId, providerId, values);
    void this.persist();
    if (next) this.emit("changed", { type: "connected", manifestId, providerId });
    return next;
  }

  disconnect(manifestId: string, providerId: string) {
    const next = this.registry.disconnect(manifestId, providerId);
    void this.persist();
    if (next) this.emit("changed", { type: "disconnected", manifestId, providerId });
    return next;
  }

  verify(manifestId: string, providerId: string) {
    return this.registry.verify(manifestId, providerId);
  }

  /** Which provider fields the UI must collect (labels + secret flags). */
  providerFields(providerId: string) {
    const provider = getProvider(providerId);
    return provider
      ? {
          id: provider.id,
          name: provider.name,
          auth: provider.auth ?? [],
          envVars: provider.envVars,
          config: provider.config ?? [],
          docsUrl: provider.docsUrl,
        }
      : null;
  }

  // ── Scaffold & agent ─────────────────────────────────────────────────────

  scaffold(manifestId: string, opts?: { framework?: "react" | "node"; serverDir?: string; clientDir?: string }): ScaffoldFile[] {
    const manifest = getManifest(manifestId);
    const installation = this.registry.installationFor(manifestId);
    if (!manifest || !installation) throw new Error(`Plugin ${manifestId} is not installed`);
    return generateScaffold(manifest, installation, opts);
  }

  /** Deterministic prompt → capability/plugin analysis for the agent + UI. */
  analyze(prompt: string) {
    return analyzePrompt(prompt);
  }

  // ── Marketplace ──────────────────────────────────────────────────────────

  browse(opts: { query?: string; category?: string; kind?: string; freeOnly?: boolean; verifiedOnly?: boolean } = {}) {
    return this.marketplace.search(opts);
  }

  purchase(listingId: string, buyerId: string) {
    const record = this.marketplace.purchase(listingId, buyerId);
    if (record) this.emit("changed", { type: "purchased", listingId });
    return record;
  }

  hasPurchased(listingId: string, buyerId: string) {
    return this.marketplace.hasPurchased(listingId, buyerId);
  }

  purchases(buyerId: string) {
    return this.marketplace.purchasesBy(buyerId);
  }

  submit(input: {
    creatorId: string;
    creatorName?: string;
    kind: MarketplaceListing["kind"];
    title: string;
    description: string;
    category: string;
    pricePaise: number;
    framework?: string;
    manifestId?: string;
    bundleRef?: string;
    version?: string;
    tags?: string[];
  }) {
    const listing = this.marketplace.submitListing({ ...input, version: input.version });
    this.emit("changed", { type: "submitted", listingId: listing.id });
    return listing;
  }

  /** Stage an upload (workspace/folder/zip) and detect the template stack. */
  prepareBundle(source: BundleSource, workspaceRoot?: string): Promise<BundleInfo> {
    return this.templates.prepareBundle(source, workspaceRoot);
  }

  /** Import a purchased/free template bundle into a chosen folder. */
  importBundle(listingId: string, buyerId: string, dest?: string): Promise<string> {
    const listing = this.marketplace.getListing(listingId);
    if (!listing) return Promise.reject(new Error("Listing not found"));
    return this.templates.importBundle(listing, buyerId, dest);
  }

  deleteListing(listingId: string): boolean {
    const ok = this.marketplace.deleteListing(listingId);
    if (ok) this.emit("changed", { type: "deleted", listingId });
    return ok;
  }

  pickSourceFolder(): Promise<string | null> {
    return this.templates.pickSourceFolder();
  }

  pickSourceZip(): Promise<string | null> {
    return this.templates.pickSourceZip();
  }

  pickImportDestination(): Promise<string | null> {
    return this.templates.pickImportDestination();
  }

  pendingSubmissions() {
    return this.marketplace.pendingSubmissions();
  }

  approve(listingId: string, approve: boolean, note?: string) {
    return this.marketplace.reviewSubmission(listingId, approve, note);
  }

  earnings(creatorId: string) {
    return this.marketplace.earningsFor(creatorId);
  }
}

function stubManifest(inst: PluginInstallation): PluginManifest {
  return {
    id: inst.manifestId,
    name: inst.manifestId,
    displayName: inst.manifestId,
    version: inst.version,
    publisher: "ride",
    category: "payments",
    description: "Restored plugin",
    capabilities: [],
    providers: [],
    pricePaise: 0,
    rules: [{ severity: "must", rule: "This plugin was restored from disk — re-run its setup checklist." }],
    aiInstructions: "",
    tags: ["restored"],
  };
}

export const pluginService = new PluginService();