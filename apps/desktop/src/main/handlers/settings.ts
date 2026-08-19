import { ipcMain } from "electron";
import { IpcChannel, type RideSettings } from "@ride/contracts";
import { settingsManager } from "../services/settings";

export function registerSettingsHandlers(): void {
  ipcMain.handle(IpcChannel.settings.get, () => settingsManager.get());

  ipcMain.handle(IpcChannel.settings.set, async (_e, patch: Partial<RideSettings>) => {
    return settingsManager.set(patch);
  });

  ipcMain.handle(IpcChannel.settings.setNvidiaKey, async (_e, key: string) => {
    await settingsManager.setNvidiaKey(String(key ?? ""));
    return settingsManager.get();
  });

  // Reset a single settings group to defaults
  ipcMain.handle("settings:reset-group", async (_e, group: string) => {
    return settingsManager.resetGroup(String(group));
  });

  // Reset all settings to factory defaults
  ipcMain.handle("settings:reset-all", async () => {
    return settingsManager.resetAll();
  });

  // Export settings as a JSON string
  ipcMain.handle("settings:export", () => {
    return JSON.stringify(settingsManager.get(), null, 2);
  });

  // Import settings from a JSON string
  ipcMain.handle("settings:import", async (_e, json: string) => {
    return settingsManager.importJson(String(json));
  });

  // Workspace-scoped settings (persisted to <root>/.ride/settings.json)
  ipcMain.handle(IpcChannel.settings.getWorkspace, async (_e, root: string) => {
    return settingsManager.getWorkspace(String(root));
  });

  ipcMain.handle(IpcChannel.settings.setWorkspace, async (_e, root: string, patch: Partial<RideSettings>) => {
    return settingsManager.setWorkspace(String(root), patch);
  });

  ipcMain.handle(IpcChannel.settings.resetWorkspace, async (_e, root: string) => {
    return settingsManager.resetWorkspace(String(root));
  });
}