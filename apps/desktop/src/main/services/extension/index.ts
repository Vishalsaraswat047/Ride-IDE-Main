import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, readdir, rm, cp } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { app } from "electron";

export interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description: string;
  categories: string[];
  keywords: string[];
  engines: { ride: string; vscode?: string };
  main: string;
  contributes?: ExtensionContributes;
  activationEvents?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  repository?: { type: string; url: string };
  bugs?: { url: string };
  license?: string;
  icon?: string;
  galleryBanner?: { color: string; theme: "light" | "dark" };
  preview?: boolean;
  qna?: string;
  capabilities?: ExtensionCapabilities;
}

export interface ExtensionContributes {
  commands?: ExtensionCommand[];
  menus?: Record<string, ExtensionMenuItem[]>;
  keybindings?: ExtensionKeybinding[];
  languages?: ExtensionLanguage[];
  grammars?: ExtensionGrammar[];
  themes?: ExtensionTheme[];
  snippets?: ExtensionSnippet[];
  views?: Record<string, ExtensionView[]>;
  viewsContainers?: Record<string, ExtensionViewContainer>;
  configuration?: ExtensionConfiguration;
  debuggers?: ExtensionDebugger[];
  taskDefinitions?: ExtensionTaskDefinition[];
  problemMatchers?: ExtensionProblemMatcher[];
}

export interface ExtensionCapabilities {
  untrustedWorkspaces?: { supported: boolean };
  virtualWorkspaces?: { supported: boolean };
  restrictedWorkspaces?: { supported: boolean };
}

export interface ExtensionCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string;
  enablement?: string;
}

export interface ExtensionMenuItem {
  command: string;
  when?: string;
  group?: string;
  order?: number;
}

export interface ExtensionKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface ExtensionLanguage {
  id: string;
  aliases: string[];
  extensions: string[];
  filenames?: string[];
  configuration?: string;
  icon?: { light: string; dark: string };
}

export interface ExtensionGrammar {
  language: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
}

export interface ExtensionTheme {
  label: string;
  uiTheme: "vs" | "vs-dark" | "hc-black" | "hc-light";
  path: string;
}

export interface ExtensionSnippet {
  language: string;
  path: string;
}

export interface ExtensionView {
  id: string;
  name: string;
  icon?: string;
  when?: string;
  contextualTitle?: string;
  visibility?: "visible" | "hidden" | "collapsed";
}

export interface ExtensionViewContainer {
  id: string;
  title: string;
  icon?: string;
}

export interface ExtensionConfiguration {
  title: string;
  properties: Record<string, ExtensionConfigProperty>;
}

export interface ExtensionConfigProperty {
  type: "string" | "number" | "boolean" | "array" | "object" | "enum";
  description: string;
  default?: unknown;
  enum?: unknown[];
  enumDescriptions?: string[];
  items?: ExtensionConfigProperty;
  properties?: Record<string, ExtensionConfigProperty>;
}

export interface ExtensionDebugger {
  type: string;
  label: string;
  languages: string[];
  initialConfigurations?: unknown[];
  configurationAttributes?: Record<string, unknown>;
  variables?: unknown;
}

export interface ExtensionTaskDefinition {
  type: string;
  required: string[];
  properties: Record<string, unknown>;
}

export interface ExtensionProblemMatcher {
  base?: string;
  owner: string;
  fileLocation?: "relative" | "absolute" | "autoDetect";
  pattern?: ExtensionProblemPattern | ExtensionProblemPattern[];
  background?: ExtensionProblemPattern;
}

export interface ExtensionProblemPattern {
  regexp: string;
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message?: number;
  loop?: boolean;
}

export interface InstalledExtension {
  id: string;
  manifest: ExtensionManifest;
  path: string;
  enabled: boolean;
  installedAt: number;
  updatedAt: number;
  isBuiltin: boolean;
  compatibility: ExtensionCompatibility;
  lastError?: string;
}

export interface ExtensionCompatibility {
  status: "compatible" | "partial" | "incompatible" | "unknown";
  issues: CompatibilityIssue[];
  apiVersion: string;
  supportedApis: string[];
  unsupportedApis: string[];
}

export interface CompatibilityIssue {
  severity: "error" | "warning" | "info";
  message: string;
  api?: string;
  suggestion?: string;
}

export interface ExtensionHost {
  id: string;
  extensionId: string;
  process?: any;
  status: "starting" | "running" | "stopped" | "crashed";
  startTime: number;
  restartCount: number;
}

export class ExtensionService extends EventEmitter {
  private extensions = new Map<string, InstalledExtension>();
  private hosts = new Map<string, ExtensionHost>();
  private extensionsDir: string;
  private builtinExtensionsDir: string;

  constructor() {
    super();
    this.extensionsDir = join(app.getPath("userData"), "extensions");
    this.builtinExtensionsDir = join(__dirname, "..", "..", "..", "builtin-extensions");
    this.initialize();
  }

  private async initialize(): Promise<void> {
    await mkdir(this.extensionsDir, { recursive: true });
    await this.loadExtensions();
    await this.loadBuiltinExtensions();
  }

  private async loadExtensions(): Promise<void> {
    try {
      const entries = await readdir(this.extensionsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const extPath = join(this.extensionsDir, entry.name);
        const manifestPath = join(extPath, "package.json");
        
        try {
          const manifestContent = await readFile(manifestPath, "utf8");
          const manifest = JSON.parse(manifestContent) as ExtensionManifest;
          
          const installed: InstalledExtension = {
            id: `${manifest.publisher}.${manifest.name}`,
            manifest,
            path: extPath,
            enabled: true,
            installedAt: Date.now(),
            updatedAt: Date.now(),
            isBuiltin: false,
            compatibility: await this.checkCompatibility(manifest),
          };
          
          this.extensions.set(installed.id, installed);
        } catch (error) {
          console.warn(`[ExtensionService] Failed to load extension ${entry.name}:`, error);
        }
      }
    } catch {
      // No extensions directory
    }
  }

  private async loadBuiltinExtensions(): Promise<void> {
    try {
      const entries = await readdir(this.builtinExtensionsDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const extPath = join(this.builtinExtensionsDir, entry.name);
        const manifestPath = join(extPath, "package.json");
        
        try {
          const manifestContent = await readFile(manifestPath, "utf8");
          const manifest = JSON.parse(manifestContent) as ExtensionManifest;
          
          const installed: InstalledExtension = {
            id: `${manifest.publisher}.${manifest.name}`,
            manifest,
            path: extPath,
            enabled: true,
            installedAt: Date.now(),
            updatedAt: Date.now(),
            isBuiltin: true,
            compatibility: await this.checkCompatibility(manifest),
          };
          
          this.extensions.set(installed.id, installed);
        } catch (error) {
          console.warn(`[ExtensionService] Failed to load builtin extension ${entry.name}:`, error);
        }
      }
    } catch {
      // No builtin extensions
    }
  }

  async checkCompatibility(manifest: ExtensionManifest): Promise<ExtensionCompatibility> {
    const issues: CompatibilityIssue[] = [];
    const supportedApis: string[] = [];
    const unsupportedApis: string[] = [];
    
    // Check engine compatibility
    const rideVersion = app.getVersion();
    const requiredVersion = manifest.engines?.ride;
    
    if (requiredVersion && !this.versionSatisfies(rideVersion, requiredVersion)) {
      issues.push({
        severity: "error",
        message: `Requires RIDE ${requiredVersion}, current version is ${rideVersion}`,
        api: "engine",
        suggestion: "Update RIDE or contact extension author",
      });
    }

    // Check VS Code engine if specified
    if (manifest.engines?.vscode) {
      issues.push({
        severity: "warning",
        message: `Extension specifies VS Code engine ${manifest.engines.vscode}. Some VS Code APIs may not be available.`,
        api: "vscode-engine",
        suggestion: "Extension may have limited functionality",
      });
    }

    // Check contributes for known compatible APIs
    if (manifest.contributes) {
      const contributes = manifest.contributes;
      
      if (contributes.commands) supportedApis.push("commands");
      if (contributes.menus) supportedApis.push("menus");
      if (contributes.keybindings) supportedApis.push("keybindings");
      if (contributes.languages) supportedApis.push("languages");
      if (contributes.grammars) supportedApis.push("grammars");
      if (contributes.themes) supportedApis.push("themes");
      if (contributes.snippets) supportedApis.push("snippets");
      if (contributes.views) supportedApis.push("views");
      if (contributes.configuration) supportedApis.push("configuration");
      if (contributes.debuggers) supportedApis.push("debuggers");
      if (contributes.taskDefinitions) supportedApis.push("tasks");
      if (contributes.problemMatchers) supportedApis.push("problemMatchers");
    }

    // Check activation events for unsupported patterns
    if (manifest.activationEvents) {
      for (const event of manifest.activationEvents) {
        if (event.startsWith("onLanguage:") || event.startsWith("onFileSystem:")) {
          supportedApis.push(`activation:${event}`);
        } else if (event === "*" || event.startsWith("workspaceContains:")) {
          unsupportedApis.push(`activation:${event}`);
          issues.push({
            severity: "warning",
            message: `Activation event "${event}" may not work as expected`,
            api: "activationEvents",
            suggestion: "Use specific activation events when possible",
          });
        }
      }
    }

    // Determine overall compatibility
    const hasErrors = issues.some(i => i.severity === "error");
    const hasWarnings = issues.some(i => i.severity === "warning");
    
    let status: ExtensionCompatibility["status"] = "compatible";
    if (hasErrors) status = "incompatible";
    else if (hasWarnings) status = "partial";

    return {
      status,
      issues,
      apiVersion: "1.0.0",
      supportedApis,
      unsupportedApis,
    };
  }

  private versionSatisfies(current: string, required: string): boolean {
    // Simple semver check
    const currentParts = current.split(".").map(Number);
    const requiredParts = required.replace(/[\^~]/, "").split(".").map(Number);
    
    for (let i = 0; i < Math.max(currentParts.length, requiredParts.length); i++) {
      const c = currentParts[i] ?? 0;
      const r = requiredParts[i] ?? 0;
      if (c > r) return true;
      if (c < r) return false;
    }
    return true;
  }

  getExtensions(): InstalledExtension[] {
    return Array.from(this.extensions.values());
  }

  getExtension(id: string): InstalledExtension | undefined {
    return this.extensions.get(id);
  }

  getEnabledExtensions(): InstalledExtension[] {
    return Array.from(this.extensions.values()).filter(e => e.enabled);
  }

  async installExtension(vsixPath: string): Promise<InstalledExtension> {
    const extractDir = join(this.extensionsDir, randomUUID());
    await mkdir(extractDir, { recursive: true });
    
    // TODO: Extract VSIX file (it's a zip)
    // For now, assume it's already extracted
    
    const manifestPath = join(extractDir, "package.json");
    const manifestContent = await readFile(manifestPath, "utf8");
    const manifest = JSON.parse(manifestContent) as ExtensionManifest;
    
    const finalDir = join(this.extensionsDir, `${manifest.publisher}.${manifest.name}-${manifest.version}`);
    await cp(extractDir, finalDir, { recursive: true });
    await rm(extractDir, { recursive: true, force: true });
    
    const compatibility = await this.checkCompatibility(manifest);
    
    const installed: InstalledExtension = {
      id: `${manifest.publisher}.${manifest.name}`,
      manifest,
      path: finalDir,
      enabled: true,
      installedAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltin: false,
      compatibility,
    };
    
    this.extensions.set(installed.id, installed);
    this.emit("extensionInstalled", installed);
    return installed;
  }

  async uninstallExtension(id: string): Promise<boolean> {
    const extension = this.extensions.get(id);
    if (!extension) return false;
    if (extension.isBuiltin) {
      throw new Error("Cannot uninstall built-in extensions");
    }

    await this.disableExtension(id);
    await rm(extension.path, { recursive: true, force: true });
    this.extensions.delete(id);
    this.emit("extensionUninstalled", id);
    return true;
  }

  async enableExtension(id: string): Promise<boolean> {
    const extension = this.extensions.get(id);
    if (!extension) return false;
    if (extension.enabled) return true;

    extension.enabled = true;
    extension.updatedAt = Date.now();
    await this.startExtensionHost(extension);
    this.emit("extensionEnabled", extension);
    return true;
  }

  async disableExtension(id: string): Promise<boolean> {
    const extension = this.extensions.get(id);
    if (!extension) return false;
    if (!extension.enabled) return true;

    extension.enabled = false;
    extension.updatedAt = Date.now();
    await this.stopExtensionHost(id);
    this.emit("extensionDisabled", extension);
    return true;
  }

  private async startExtensionHost(extension: InstalledExtension): Promise<void> {
    // TODO: Start extension host process
    const host: ExtensionHost = {
      id: randomUUID(),
      extensionId: extension.id,
      status: "starting",
      startTime: Date.now(),
      restartCount: 0,
    };
    
    this.hosts.set(extension.id, host);
    
    // Simulate startup
    setTimeout(() => {
      host.status = "running";
      this.emit("extensionHostStarted", host);
    }, 100);
  }

  private async stopExtensionHost(extensionId: string): Promise<void> {
    const host = this.hosts.get(extensionId);
    if (host) {
      host.status = "stopped";
      this.hosts.delete(extensionId);
      this.emit("extensionHostStopped", host);
    }
  }

  async updateExtension(id: string, vsixPath: string): Promise<InstalledExtension> {
    const extension = this.extensions.get(id);
    if (!extension) throw new Error("Extension not found");
    if (extension.isBuiltin) throw new Error("Cannot update built-in extensions");

    await this.uninstallExtension(id);
    return this.installExtension(vsixPath);
  }

  getExtensionHost(extensionId: string): ExtensionHost | undefined {
    return this.hosts.get(extensionId);
  }

  getAllHosts(): ExtensionHost[] {
    return Array.from(this.hosts.values());
  }

  async getExtensionManifest(id: string): Promise<ExtensionManifest | null> {
    const extension = this.extensions.get(id);
    return extension?.manifest ?? null;
  }

  async searchExtensions(query: string): Promise<InstalledExtension[]> {
    const lowerQuery = query.toLowerCase();
    return this.getExtensions().filter(ext => 
      ext.manifest.name.toLowerCase().includes(lowerQuery) ||
      ext.manifest.displayName.toLowerCase().includes(lowerQuery) ||
      ext.manifest.description.toLowerCase().includes(lowerQuery) ||
      ext.manifest.keywords?.some(k => k.toLowerCase().includes(lowerQuery)) ||
      ext.manifest.categories?.some(c => c.toLowerCase().includes(lowerQuery))
    );
  }
}

export const extensionService = new ExtensionService();