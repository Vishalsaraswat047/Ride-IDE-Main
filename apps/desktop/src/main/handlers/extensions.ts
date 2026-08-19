import { ipcMain, dialog } from "electron";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, basename } from "node:path";
import { app } from "electron";
import { IpcChannel } from "@ride/contracts";
import { extensionService } from "../services/extension";
import { marketplaceService } from "../services/marketplace";
import { sendToRenderer } from "../index";

export function wireExtensionBroadcasts(): void {
  extensionService.on("extensionInstalled", (ext) => sendToRenderer(IpcChannel.extensions.changed, { type: "installed", extension: ext }));
  extensionService.on("extensionUninstalled", (id) => sendToRenderer(IpcChannel.extensions.changed, { type: "uninstalled", id }));
  extensionService.on("extensionEnabled", (ext) => sendToRenderer(IpcChannel.extensions.changed, { type: "enabled", extension: ext }));
  extensionService.on("extensionDisabled", (ext) => sendToRenderer(IpcChannel.extensions.changed, { type: "disabled", extension: ext }));
  extensionService.on("extensionHostStarted", (host) => sendToRenderer(IpcChannel.extensions.changed, { type: "host-started", host }));
  extensionService.on("extensionHostStopped", (host) => sendToRenderer(IpcChannel.extensions.changed, { type: "host-stopped", host }));
}

export function registerExtensionHandlers(): void {
  wireExtensionBroadcasts();

  ipcMain.handle(IpcChannel.extensions.list, () => extensionService.getExtensions());

  ipcMain.handle(IpcChannel.extensions.install, async () => {
    const result = await dialog.showOpenDialog({
      title: "Install Extension",
      filters: [{ name: "VS Code Extensions", extensions: ["vsix", "zip"] }],
      properties: ["openFile"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const vsixPath = result.filePaths[0]!;
    const extension = await extensionService.installExtension(vsixPath);
    return extension;
  });

  ipcMain.handle(IpcChannel.extensions.uninstall, (_e, id: string) => extensionService.uninstallExtension(id));

  ipcMain.handle(IpcChannel.extensions.enable, (_e, id: string) => extensionService.enableExtension(id));

  ipcMain.handle(IpcChannel.extensions.disable, (_e, id: string) => extensionService.disableExtension(id));

  ipcMain.handle(IpcChannel.extensions.update, async (_e, id: string) => {
    const result = await dialog.showOpenDialog({
      title: "Update Extension",
      filters: [{ name: "VS Code Extensions", extensions: ["vsix", "zip"] }],
      properties: ["openFile"],
    });

    if (result.canceled || !result.filePaths.length) return null;

    const vsixPath = result.filePaths[0]!;
    const extension = await extensionService.updateExtension(id, vsixPath);
    return extension;
  });

  ipcMain.handle(IpcChannel.extensions.search, (_e, query: string) => extensionService.searchExtensions(query));

  ipcMain.handle(IpcChannel.extensions.getManifest, (_e, id: string) => extensionService.getExtensionManifest(id));

  ipcMain.handle(IpcChannel.extensions.checkCompatibility, async (_e, manifest: Record<string, unknown>) => {
    return extensionService.checkCompatibility(manifest as never);
  });

  // ─── Marketplace ───

  ipcMain.handle(IpcChannel.marketplace.search, (_e, options: Record<string, unknown>) =>
    marketplaceService.search(options as never),
  );

  ipcMain.handle(IpcChannel.marketplace.getExtension, (_e, id: string) => marketplaceService.getExtension(id));

  ipcMain.handle(IpcChannel.marketplace.getVersions, (_e, id: string) => marketplaceService.getExtensionVersions(id));

  ipcMain.handle(IpcChannel.marketplace.download, async (_e, id: string, version?: string) => {
    try {
      const buffer = await marketplaceService.downloadExtension(id, version);
      
      const extName = id.replace(".", "-");
      const destDir = join(app.getPath("userData"), "downloads", id);
      await mkdir(destDir, { recursive: true });
      const destPath = join(destDir, `${extName}-${version ?? "latest"}.vsix`);
      await writeFile(destPath, buffer);
      
      const installed = await extensionService.installExtension(destPath);
      return { ok: true, path: destPath, extension: installed };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IpcChannel.marketplace.getCategories, () => marketplaceService.getCategories());

  ipcMain.handle(IpcChannel.marketplace.getFeatured, (_e, limit?: number) => marketplaceService.getFeatured(limit));

  ipcMain.handle(IpcChannel.marketplace.getPopular, (_e, limit?: number) => marketplaceService.getPopular(limit));
}