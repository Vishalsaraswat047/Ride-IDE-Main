import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import { devServer } from "../services/preview/devServer";
import type { WorkspaceManager } from "../services/workspace";

export function registerPreviewHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.preview.status, () => devServer.status());

  ipcMain.handle(IpcChannel.preview.start, async (_e, root?: string) => {
    const target = root ?? workspace.root;
    if (!target) return devServer.status();
    return devServer.start(target);
  });

  ipcMain.handle(IpcChannel.preview.stop, () => devServer.stop());
}

export function autoStartPreview(root: string): void {
  void devServer.start(root).catch(() => undefined);
}