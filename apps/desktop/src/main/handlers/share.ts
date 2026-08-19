import { ipcMain, dialog, BrowserWindow } from "electron";
import { IpcChannel } from "@ride/contracts";
import { downloadWorkspaceZip, exportToGitHub, badgeHtml } from "../services/share";

export function registerShareHandlers(): void {
  ipcMain.handle(IpcChannel.share.badgeHtml, (_e, origin?: string) => {
    return badgeHtml(origin);
  });

  ipcMain.handle(IpcChannel.share.downloadZip, async (e, workspacePath: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    const name = (workspacePath.split(/[\\/]/).filter(Boolean).pop() ?? "project").toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "project";
    const opts: Electron.SaveDialogOptions = {
      title: "Download project",
      defaultPath: `${name}.zip`,
      filters: [{ name: "ZIP archive", extensions: ["zip"] }],
    };
    const result = win
      ? await dialog.showSaveDialog(win, opts)
      : await dialog.showSaveDialog(opts);
    if (result.canceled || !result.filePath) return { ok: false, error: "canceled" };
    return downloadWorkspaceZip(workspacePath, result.filePath);
  });

  ipcMain.handle(IpcChannel.share.exportToGitHub, async (_e, input: { workspacePath: string; repoName: string; visibility?: "public" | "private" }) => {
    return exportToGitHub(input.workspacePath, input.repoName, { visibility: input.visibility });
  });
}
