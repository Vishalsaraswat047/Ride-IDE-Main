import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { hostingerService } from "../services/hostinger";
import { sendToRenderer } from "..";

export function registerHostingerHandlers(): void {
  ipcMain.handle(IpcChannel.hostinger.connect, async (_e, payload: { apiToken: string }) => {
    const token = String(payload.apiToken ?? "").trim();
    if (!token) return { ok: false, connected: false, error: "API token required" };

    const result = await hostingerService.testConnection(token);
    if (!result.success) {
      return { ok: false, connected: false, error: result.error || "Invalid Hostinger API token" };
    }

    // We don't have userId here in main process, so we'll use a default
    // In a real implementation, we'd get the current user from auth service
    hostingerService.setToken("default-user", token);
    return { ok: true, connected: true };
  });

  ipcMain.handle(IpcChannel.hostinger.disconnect, async () => {
    hostingerService.removeToken("default-user");
    return { ok: true, connected: false };
  });

  ipcMain.handle(IpcChannel.hostinger.getStatus, async () => {
    const connected = hostingerService.hasToken("default-user");
    return { connected };
  });

  ipcMain.handle(IpcChannel.hostinger.getDashboard, async () => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const data = await hostingerService.getFullDashboardData("default-user");
      return data;
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch dashboard data");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getWebsites, async () => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const websites = await hostingerService.getWebsites("default-user");
      return { websites };
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch websites");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getWebsite, async (_e, id: string) => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const website = await hostingerService.getWebsiteDetails("default-user", id);
      return website;
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch website");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getWebsiteDeployments, async (_e, id: string) => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const deployments = await hostingerService.getDeployments("default-user", id);
      return { deployments };
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch deployments");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getWebsiteNodeJSBuilds, async (_e, id: string) => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const builds = await hostingerService.getNodeJSBuilds("default-user", id);
      return { builds };
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch Node.js builds");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getDomains, async () => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const domains = await hostingerService.getDomains("default-user");
      return { domains };
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch domains");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getDNSZone, async (_e, domain: string) => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const zone = await hostingerService.getDNSZone("default-user", domain);
      return zone;
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch DNS zone");
    }
  });

  ipcMain.handle(IpcChannel.hostinger.getVPS, async () => {
    const token = hostingerService.getToken("default-user");
    if (!token) throw new Error("Hostinger not connected");

    try {
      const servers = await hostingerService.getVPServers("default-user");
      return { servers };
    } catch (error: any) {
      throw new Error(error?.message || "Failed to fetch VPS servers");
    }
  });
}