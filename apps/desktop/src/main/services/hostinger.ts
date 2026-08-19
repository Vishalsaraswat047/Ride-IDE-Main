import { createHostingerClient, type HostingerWebsite, type HostingerDatabase, type HostingerDomain, type HostingerDNSZone, type HostingerDeployment, type HostingerNodeJSBuild, type MyDashboardData } from "./hostinger-client";

class HostingerService {
  private clients = new Map<string, ReturnType<typeof createHostingerClient>>();
  private tokenStore = new Map<string, string>();

  setToken(userId: string, token: string): void {
    this.tokenStore.set(userId, token);
    this.clients.set(userId, createHostingerClient(token));
  }

  getToken(userId: string): string | undefined {
    return this.tokenStore.get(userId);
  }

  hasToken(userId: string): boolean {
    return this.tokenStore.has(userId);
  }

  removeToken(userId: string): void {
    this.tokenStore.delete(userId);
    this.clients.delete(userId);
  }

  private getClient(userId: string): ReturnType<typeof createHostingerClient> | null {
    return this.clients.get(userId) ?? null;
  }

  async testConnection(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const client = createHostingerClient(token);
      await client.listWebsites();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.response?.data?.message || error?.message || "Connection failed" };
    }
  }

  async getWebsites(userId: string): Promise<HostingerWebsite[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized. Call setToken first.");
    return client.listWebsites();
  }

  async getWebsiteDetails(userId: string, websiteId: string): Promise<HostingerWebsite | null> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return client.getWebsite(websiteId);
  }

  async getDatabases(userId: string): Promise<HostingerDatabase[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return [];
  }

  async getDomains(userId: string): Promise<HostingerDomain[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return client.listDomains();
  }

  async getDNSZone(userId: string, domain: string): Promise<HostingerDNSZone | null> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return client.getDNSZone(domain);
  }

  async getAllDNSZones(userId: string, domains: string[]): Promise<HostingerDNSZone[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    const zones: HostingerDNSZone[] = [];
    for (const domain of domains) {
      const zone = await client.getDNSZone(domain);
      if (zone) zones.push(zone);
    }
    return zones;
  }

  async getDeployments(userId: string, websiteId: string): Promise<HostingerDeployment[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return client.listWebsiteDeployments(websiteId);
  }

  async getNodeJSBuilds(userId: string, websiteId: string): Promise<HostingerNodeJSBuild[]> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");
    return client.listWebsiteNodeJSBuilds(websiteId);
  }

  async getVPServers(userId: string): Promise<any[]> {
    return [];
  }

  async getFullDashboardData(userId: string): Promise<MyDashboardData> {
    const client = this.getClient(userId);
    if (!client) throw new Error("Hostinger client not initialized.");

    const [websites, domains] = await Promise.all([
      client.listWebsites(),
      client.listDomains(),
    ]);

    const domainNames = domains.map((d: HostingerDomain) => d.domain);
    const dnsZones = await this.getAllDNSZones(userId, domainNames);

    const allDeployments: HostingerDeployment[] = [];
    const allNodeJSBuilds: HostingerNodeJSBuild[] = [];

    for (const website of websites) {
      const [deployments, builds] = await Promise.all([
        client.listWebsiteDeployments(website.id),
        client.listWebsiteNodeJSBuilds(website.id),
      ]);
      allDeployments.push(...deployments);
      allNodeJSBuilds.push(...builds);
    }

    return {
      websites,
      databases: [],
      domains,
      dnsZones,
      deployments: allDeployments,
      nodejsBuilds: allNodeJSBuilds,
      vpsServers: [],
      connected: true,
      lastSync: Date.now(),
    };
  }
}

export const hostingerService = new HostingerService();