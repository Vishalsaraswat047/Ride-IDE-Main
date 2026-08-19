import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { pluginService } from "../services/plugins";
import { sendToRenderer } from "../index";

export function wirePluginBroadcasts(): void {
  pluginService.on("changed", (payload) => sendToRenderer(IpcChannel.plugins.changed, payload));
}

export function registerPluginHandlers(): void {
  wirePluginBroadcasts();

  ipcMain.handle(IpcChannel.plugins.catalog, () => pluginService.catalog());

  ipcMain.handle(IpcChannel.plugins.installed, () => pluginService.installed());

  ipcMain.handle(IpcChannel.plugins.install, (_e, manifestId: string) => pluginService.install(manifestId));

  ipcMain.handle(IpcChannel.plugins.uninstall, (_e, manifestId: string) => pluginService.uninstall(manifestId));

  ipcMain.handle(IpcChannel.plugins.enable, (_e, manifestId: string) => pluginService.setEnabled(manifestId, true));

  ipcMain.handle(IpcChannel.plugins.disable, (_e, manifestId: string) => pluginService.setEnabled(manifestId, false));

  ipcMain.handle(IpcChannel.plugins.connect, (_e, manifestId: string, providerId: string, values: Record<string, string>) =>
    pluginService.connect(manifestId, providerId, values),
  );

  ipcMain.handle(IpcChannel.plugins.disconnect, (_e, manifestId: string, providerId: string) =>
    pluginService.disconnect(manifestId, providerId),
  );

  ipcMain.handle(IpcChannel.plugins.verify, (_e, manifestId: string, providerId: string) =>
    pluginService.verify(manifestId, providerId),
  );

  ipcMain.handle(IpcChannel.plugins.recommend, (_e, prompt: string) => pluginService.analyze(prompt));

  ipcMain.handle(IpcChannel.plugins.scaffold, (_e, manifestId: string, opts?: Record<string, string>) =>
    pluginService.scaffold(manifestId, opts as never),
  );

  // Marketplace (local store)
  ipcMain.handle(IpcChannel.plugins.browse, (_e, opts: Record<string, unknown>) =>
    pluginService.browse(opts as never),
  );

  ipcMain.handle(IpcChannel.plugins.purchase, (_e, listingId: string, buyerId: string) =>
    pluginService.purchase(listingId, buyerId),
  );

  ipcMain.handle(IpcChannel.plugins.submit, (_e, input: Record<string, unknown>) =>
    pluginService.submit(input as never),
  );

  ipcMain.handle(IpcChannel.plugins.prepareBundle, (_e, source: Record<string, unknown>, workspaceRoot?: string) =>
    pluginService.prepareBundle(source as never, workspaceRoot),
  );

  ipcMain.handle(IpcChannel.plugins.importBundle, (_e, listingId: string, buyerId: string, dest?: string) =>
    pluginService.importBundle(listingId, buyerId, dest),
  );

  ipcMain.handle(IpcChannel.plugins.deleteListing, (_e, listingId: string) =>
    pluginService.deleteListing(listingId),
  );

  ipcMain.handle(IpcChannel.plugins.myListings, (_e, creatorId: string) => {
    // Local store keeps submissions in memory/persistence; expose via earnings.
    return pluginService.marketplace.submissionsBy(creatorId);
  });

  ipcMain.handle(IpcChannel.plugins.pending, () => pluginService.pendingSubmissions());

  ipcMain.handle(IpcChannel.plugins.approve, (_e, listingId: string, approve: boolean, note?: string) =>
    pluginService.approve(listingId, approve, note),
  );

  ipcMain.handle(IpcChannel.plugins.earnings, (_e, creatorId: string) => pluginService.earnings(creatorId));

  ipcMain.handle(IpcChannel.plugins.purchases, (_e, buyerId: string) => pluginService.purchases(buyerId));
}