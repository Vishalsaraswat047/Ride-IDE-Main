import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

export interface HostingerWebsite {
  id: string;
  domain: string;
  name: string;
  isEnabled: boolean;
  ipAddress?: string;
  datacenter?: string;
  plan?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostingerDatabase {
  name: string;
  host: string;
  port: number;
  type: "mysql" | "postgresql";
  username: string;
  remoteConnections: boolean;
}

export interface HostingerDomain {
  domain: string;
  isConnected: boolean;
  isPrimary: boolean;
  sslStatus: "active" | "pending" | "error" | "none";
  dnsStatus: "configured" | "pending" | "error";
  expiresAt?: string;
}

export interface HostingerDNSRecord {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority?: number;
}

export interface HostingerDNSZone {
  domain: string;
  records: HostingerDNSRecord[];
}

export interface HostingerDeployment {
  id: string;
  websiteId: string;
  status: "pending" | "building" | "deploying" | "success" | "error";
  version: string;
  commitHash?: string;
  branch?: string;
  createdAt: string;
  completedAt?: string;
  logs?: string;
}

export interface HostingerNodeJSBuild {
  id: string;
  websiteId: string;
  status: "pending" | "building" | "success" | "error";
  nodeVersion: string;
  buildCommand: string;
  startCommand: string;
  createdAt: string;
  completedAt?: string;
  logs?: string;
}

export interface MyDashboardData {
  websites: HostingerWebsite[];
  databases: HostingerDatabase[];
  domains: HostingerDomain[];
  dnsZones: HostingerDNSZone[];
  deployments: HostingerDeployment[];
  nodejsBuilds: HostingerNodeJSBuild[];
  vpsServers: any[];
  connected: boolean;
  lastSync: number;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

class HostingerHostingClient {
  private client: AxiosInstance;

  constructor(token: string) {
    this.client = axios.create({
      baseURL: "https://developers.hostinger.com",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  private async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  // Websites
  async listWebsites(): Promise<HostingerWebsite[]> {
    const response = await this.get<PaginatedResponse<any>>("/api/hosting/v1/websites");
    const websites = response.data ?? [];
    return websites.map((w: any) => ({
      id: w.id || w.website_uid,
      domain: w.domain,
      name: w.name || w.domain,
      isEnabled: w.is_enabled ?? true,
      ipAddress: w.ip_address,
      datacenter: w.datacenter,
      plan: w.plan,
      createdAt: w.created_at,
      updatedAt: w.updated_at,
    }));
  }

  async getWebsite(websiteId: string): Promise<HostingerWebsite | null> {
    try {
      const response = await this.get<any>(`/api/hosting/v1/websites/${websiteId}`);
      const w = response.data;
      if (!w) return null;
      return {
        id: w.id || w.website_uid,
        domain: w.domain,
        name: w.name || w.domain,
        isEnabled: w.is_enabled ?? true,
        ipAddress: w.ip_address,
        datacenter: w.datacenter,
        plan: w.plan,
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      };
    } catch {
      return null;
    }
  }

  // Databases
  async listDatabases(username: string): Promise<HostingerDatabase[]> {
    try {
      const response = await this.get<PaginatedResponse<any>>(`/api/hosting/v1/accounts/${username}/databases`);
      const databases = response.data ?? [];
      return databases.map((db: any) => ({
        name: db.name,
        host: db.host,
        port: db.port,
        type: db.type,
        username: db.username,
        remoteConnections: db.remote_connections ?? false,
      }));
    } catch {
      return [];
    }
  }

  // Domains
  async listDomains(): Promise<HostingerDomain[]> {
    try {
      const response = await this.get<PaginatedResponse<any>>("/api/domains/v1/portfolio");
      const domains = response.data ?? [];
      return domains.map((d: any) => ({
        domain: d.domain,
        isConnected: d.is_connected ?? false,
        isPrimary: d.is_primary ?? false,
        sslStatus: d.ssl_status || "none",
        dnsStatus: d.dns_status || "pending",
        expiresAt: d.expires_at,
      }));
    } catch {
      return [];
    }
  }

  // DNS Zones
  async getDNSZone(domain: string): Promise<HostingerDNSZone | null> {
    try {
      const response = await this.get<any>(`/api/dns/v1/zones/${domain}`);
      const zone = response.data;
      if (!zone) return null;
      return {
        domain: zone.domain,
        records: (zone.records ?? []).map((r: any) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          value: r.value,
          ttl: r.ttl,
          priority: r.priority,
        })),
      };
    } catch {
      return null;
    }
  }

  // Deployments
  async listWebsiteDeployments(websiteId: string): Promise<HostingerDeployment[]> {
    try {
      const response = await this.get<PaginatedResponse<any>>(`/api/hosting/v1/websites/${websiteId}/deployments`);
      const deployments = response.data ?? [];
      return deployments.map((d: any) => ({
        id: d.id,
        websiteId,
        status: d.status,
        version: d.version,
        commitHash: d.commit_hash,
        branch: d.branch,
        createdAt: d.created_at,
        completedAt: d.completed_at,
        logs: d.logs,
      }));
    } catch {
      return [];
    }
  }

  // Node.js Builds
  async listWebsiteNodeJSBuilds(websiteId: string): Promise<HostingerNodeJSBuild[]> {
    try {
      const response = await this.get<PaginatedResponse<any>>(`/api/hosting/v1/websites/${websiteId}/nodejs/builds`);
      const builds = response.data ?? [];
      return builds.map((b: any) => ({
        id: b.id,
        websiteId,
        status: b.status,
        nodeVersion: b.node_version,
        buildCommand: b.build_command,
        startCommand: b.start_command,
        createdAt: b.created_at,
        completedAt: b.completed_at,
        logs: b.logs,
      }));
    } catch {
      return [];
    }
  }
}

export function createHostingerClient(token: string): HostingerHostingClient {
  return new HostingerHostingClient(token);
}