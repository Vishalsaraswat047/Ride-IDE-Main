import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  publisherDisplayName: string;
  description: string;
  categories: string[];
  tags: string[];
  iconUrl?: string;
  repositoryUrl?: string;
  homepageUrl?: string;
  license?: string;
  installCount: number;
  rating: number;
  ratingCount: number;
  updatedAt: number;
  publishedAt: number;
  versions: MarketplaceVersion[];
  latestVersion: MarketplaceVersion;
  compatibility: MarketplaceCompatibility;
  flags: MarketplaceFlags;
}

export interface MarketplaceVersion {
  version: string;
  lastUpdated: number;
  changelog?: string;
  assetUri: string;
  targetPlatform?: string;
  size: number;
  files?: MarketplaceFile[];
}

export interface MarketplaceFile {
  name: string;
  size: number;
  downloadUrl: string;
}

export interface MarketplaceCompatibility {
  ride: string;
  vscode?: string;
  platform?: string[];
  architecture?: string[];
}

export interface MarketplaceFlags {
  verified: boolean;
  sponsored: boolean;
  deprecated: boolean;
  malicious: boolean;
  preview: boolean;
}

export interface SearchOptions {
  query?: string;
  category?: string;
  tag?: string;
  sortBy?: "relevance" | "installs" | "rating" | "updated" | "published";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  includePreRelease?: boolean;
  compatibleOnly?: boolean;
}

export interface SearchResult {
  extensions: MarketplaceExtension[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  extensionCount: number;
}

export class MarketplaceService extends EventEmitter {
  private baseUrl = "https://open-vsx.org/api";
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super();
  }

  async search(options: SearchOptions = {}): Promise<SearchResult> {
    const cacheKey = `search:${JSON.stringify(options)}`;
    const cached = this.getCached<SearchResult>(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (options.query) params.set("q", options.query);
    if (options.category) params.set("category", options.category);
    if (options.tag) params.set("tag", options.tag);
    if (options.sortBy) params.set("sortBy", options.sortBy);
    if (options.sortOrder) params.set("sortOrder", options.sortOrder);
    if (options.page) params.set("page", String(options.page));
    if (options.pageSize) params.set("pageSize", String(options.pageSize));
    if (options.includePreRelease) params.set("preRelease", "true");

    try {
      const response = await fetch(`${this.baseUrl}/search?${params.toString()}`, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const result = this.transformSearchResult(data);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error("[MarketplaceService] Search failed:", error);
      return { extensions: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
    }
  }

  async getExtension(extensionId: string): Promise<MarketplaceExtension | null> {
    const cacheKey = `extension:${extensionId}`;
    const cached = this.getCached<MarketplaceExtension>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/extension/${extensionId}`, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get extension: ${response.status}`);
      }

      const data = await response.json();
      const extension = this.transformExtension(data);
      this.setCache(cacheKey, extension);
      return extension;
    } catch (error) {
      console.error("[MarketplaceService] Get extension failed:", error);
      return null;
    }
  }

  async getExtensionVersions(extensionId: string): Promise<MarketplaceVersion[]> {
    const cacheKey = `versions:${extensionId}`;
    const cached = this.getCached<MarketplaceVersion[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/extension/${extensionId}/versions`, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to get versions: ${response.status}`);
      }

      const data = await response.json();
      const versions = this.transformVersions(Array.isArray(data) ? data : []);
      this.setCache(cacheKey, versions);
      return versions;
    } catch (error) {
      console.error("[MarketplaceService] Get versions failed:", error);
      return [];
    }
  }

  async downloadExtension(extensionId: string, version?: string): Promise<Buffer> {
    const extension = await this.getExtension(extensionId);
    if (!extension) throw new Error("Extension not found");

    const targetVersion = version ?? extension.latestVersion.version;
    const versionInfo = extension.versions.find(v => v.version === targetVersion);
    if (!versionInfo) throw new Error(`Version ${targetVersion} not found`);

    try {
      const response = await fetch(versionInfo.assetUri, {
        headers: { "Accept": "application/octet-stream" },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error("[MarketplaceService] Download failed:", error);
      throw error;
    }
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const cacheKey = "categories";
    const cached = this.getCached<CategoryInfo[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.baseUrl}/categories`, {
        headers: { "Accept": "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to get categories: ${response.status}`);
      }

      const data = await response.json();
      const categories = this.transformCategories(Array.isArray(data) ? data : []);
      this.setCache(cacheKey, categories);
      return categories;
    } catch (error) {
      console.error("[MarketplaceService] Get categories failed:", error);
      return this.getDefaultCategories();
    }
  }

  async getFeatured(limit = 10): Promise<MarketplaceExtension[]> {
    const result = await this.search({ sortBy: "rating", sortOrder: "desc", pageSize: limit });
    return result.extensions;
  }

  async getPopular(limit = 10): Promise<MarketplaceExtension[]> {
    const result = await this.search({ sortBy: "installs", sortOrder: "desc", pageSize: limit });
    return result.extensions;
  }

  async getRecent(limit = 10): Promise<MarketplaceExtension[]> {
    const result = await this.search({ sortBy: "published", sortOrder: "desc", pageSize: limit });
    return result.extensions;
  }

  async getRecommendations(extensionId: string, limit = 5): Promise<MarketplaceExtension[]> {
    // TODO: Implement recommendations based on installed extensions
    return this.getPopular(limit);
  }

  private transformSearchResult(data: any): SearchResult {
    return {
      extensions: (data.extensions ?? []).map((e: any) => this.transformExtension(e)),
      total: data.total ?? 0,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 20,
      totalPages: data.totalPages ?? 0,
    };
  }

  private transformExtension(data: any): MarketplaceExtension {
    const versions = (data.versions ?? []).map((v: any) => this.transformVersion(v));
    const latestVersion = versions[0] ?? this.transformVersion(data);

    return {
      id: `${data.publisher}.${data.name}`,
      name: data.name,
      displayName: data.displayName ?? data.name,
      version: latestVersion.version,
      publisher: data.publisher,
      publisherDisplayName: data.publisherDisplayName ?? data.publisher,
      description: data.description ?? "",
      categories: data.categories ?? [],
      tags: data.tags ?? [],
      iconUrl: data.icon ?? data.iconUrl,
      repositoryUrl: data.repository?.url,
      homepageUrl: data.homepage,
      license: data.license,
      installCount: data.installCount ?? 0,
      rating: data.rating ?? 0,
      ratingCount: data.ratingCount ?? 0,
      updatedAt: new Date(data.lastUpdated ?? data.updatedAt ?? Date.now()).getTime(),
      publishedAt: new Date(data.publishedAt ?? Date.now()).getTime(),
      versions,
      latestVersion,
      compatibility: {
        ride: "*",
        vscode: data.engines?.vscode,
        platform: data.platform,
        architecture: data.architecture,
      },
      flags: {
        verified: data.flags?.verified ?? false,
        sponsored: data.flags?.sponsored ?? false,
        deprecated: data.flags?.deprecated ?? false,
        malicious: data.flags?.malicious ?? false,
        preview: data.flags?.preview ?? false,
      },
    };
  }

  private transformVersion(data: any): MarketplaceVersion {
    return {
      version: data.version,
      lastUpdated: new Date(data.lastUpdated ?? Date.now()).getTime(),
      changelog: data.changelog,
      assetUri: data.files?.download ?? data.assetUri ?? `https://open-vsx.org/api/${data.publisher}/${data.name}/${data.version}/file/${data.publisher}.${data.name}-${data.version}.vsix`,
      targetPlatform: data.targetPlatform,
      size: data.files?.size ?? data.size ?? 0,
      files: data.files ? [{
        name: `${data.publisher}.${data.name}-${data.version}.vsix`,
        size: data.files.size ?? 0,
        downloadUrl: data.files.download ?? "",
      }] : undefined,
    };
  }

  private transformVersions(data: any[]): MarketplaceVersion[] {
    return data.map(v => this.transformVersion(v)).sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  private transformCategories(data: any[]): CategoryInfo[] {
    return data.map(c => ({
      id: c.id ?? c.name.toLowerCase().replace(/\s+/g, "-"),
      name: c.name,
      description: c.description ?? "",
      icon: c.icon ?? "package",
      extensionCount: c.extensionCount ?? 0,
    }));
  }

  private getDefaultCategories(): CategoryInfo[] {
    return [
      { id: "ai", name: "AI", description: "AI-powered development tools", icon: "bot", extensionCount: 0 },
      { id: "languages", name: "Languages", description: "Programming language support", icon: "code", extensionCount: 0 },
      { id: "themes", name: "Themes", description: "Color themes and icon themes", icon: "paintbrush", extensionCount: 0 },
      { id: "debuggers", name: "Debuggers", description: "Debugging extensions", icon: "bug", extensionCount: 0 },
      { id: "formatters", name: "Formatters", description: "Code formatting tools", icon: "format", extensionCount: 0 },
      { id: "linters", name: "Linters", description: "Code quality and linting", icon: "check-circle", extensionCount: 0 },
      { id: "git", name: "Git", description: "Git integration and tools", icon: "git-branch", extensionCount: 0 },
      { id: "testing", name: "Testing", description: "Test runners and frameworks", icon: "test-tube", extensionCount: 0 },
      { id: "database", name: "Database", description: "Database tools and clients", icon: "database", extensionCount: 0 },
      { id: "docker", name: "Docker", description: "Container and Docker tools", icon: "docker", extensionCount: 0 },
      { id: "cloud", name: "Cloud", description: "Cloud provider integrations", icon: "cloud", extensionCount: 0 },
      { id: "web", name: "Web Development", description: "Web development tools", icon: "globe", extensionCount: 0 },
      { id: "python", name: "Python", description: "Python development tools", icon: "python", extensionCount: 0 },
      { id: "cpp", name: "C++", description: "C++ development tools", icon: "cplusplus", extensionCount: 0 },
      { id: "java", name: "Java", description: "Java development tools", icon: "coffee", extensionCount: 0 },
      { id: "rust", name: "Rust", description: "Rust development tools", icon: "rust", extensionCount: 0 },
      { id: "go", name: "Go", description: "Go development tools", icon: "go", extensionCount: 0 },
      { id: "vlsi", name: "VLSI/RTL", description: "Hardware design and verification", icon: "cpu", extensionCount: 0 },
      { id: "productivity", name: "Productivity", description: "Productivity enhancements", icon: "zap", extensionCount: 0 },
    ];
  }

  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, expiresAt: Date.now() + this.cacheTTL });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const marketplaceService = new MarketplaceService();