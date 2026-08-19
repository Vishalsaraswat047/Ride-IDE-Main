import { ipcMain, app, shell, dialog } from "electron";
import { IpcChannel } from "@ride/contracts";
import { checkForUpdatesNow, setReleaseChannel, getCurrentChannel } from "../updater";

export function registerAppHandlers(): void {
  ipcMain.handle(IpcChannel.app.getInfo, async () => {
    return {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      node: process.versions.node,
      electron: process.versions.electron,
    };
  });

  ipcMain.handle(IpcChannel.app.openExternal, async (_e, url: string) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.app.showItemInFolder, (_e, path: string) => {
    shell.showItemInFolder(path);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.app.pickFolder, async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  });

  ipcMain.handle(IpcChannel.app.pickZip, async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "ZIP archives", extensions: ["zip"] }],
    });
    return result.canceled || !result.filePaths[0] ? null : result.filePaths[0];
  });

  ipcMain.handle(IpcChannel.app.quitAndInstall, () => {
    app.quit();
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.app.checkForUpdates, async () => {
    const result = await checkForUpdatesNow();
    return { available: !!result?.updateInfo, version: result?.updateInfo?.version };
  });

  ipcMain.handle(IpcChannel.app.setReleaseChannel, async (_e, channel: "stable" | "beta" | "alpha") => {
    await setReleaseChannel(channel);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.app.getReleaseChannel, async () => {
    return getCurrentChannel();
  });
}
