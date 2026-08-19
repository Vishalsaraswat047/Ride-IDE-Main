import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import type { WorkspaceManager } from "../services/workspace";
import { AiGit } from "@ride/git";

export function registerGitHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.git.status, async () => {
    if (!workspace.root) return null;
    return workspace.engine.status();
  });

  ipcMain.handle(IpcChannel.git.diff, async (_e, path?: string) => {
    if (!workspace.root) return [];
    return workspace.engine.diff(path);
  });

  ipcMain.handle(IpcChannel.git.diffStaged, async () => {
    if (!workspace.root) return [];
    return workspace.engine.diffStaged();
  });

  ipcMain.handle(IpcChannel.git.stage, async (_e, paths: string[]) => {
    await workspace.engine.stage(paths);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.unstage, async (_e, paths: string[]) => {
    await workspace.engine.unstage(paths);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.commit, async (_e, message: string) => {
    await workspace.engine.commit(message);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.log, async () => {
    if (!workspace.root) return [];
    return workspace.engine.log();
  });

  ipcMain.handle(IpcChannel.git.branches, async () => {
    if (!workspace.root) return { current: "", branches: [] };
    return workspace.engine.branches();
  });

  ipcMain.handle(IpcChannel.git.checkout, async (_e, branch: string) => {
    await workspace.engine.checkout(branch);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.init, async () => {
    if (!workspace.root) return { ok: false, error: "No workspace" };
    await workspace.engine.init();
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.aiCommit, async (_e, paths: string[], message: string) => {
    const ai = new AiGit(workspace.root!);
    await ai.commitGrouped(paths, message);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.git.aiExplain, async (_e, path: string, ref = "HEAD") => {
    const ai = new AiGit(workspace.root!);
    const [blob, diff] = await Promise.all([ai.blob(path, ref), ai.diff(path)]);
    return { blob, diff };
  });

  ipcMain.handle(IpcChannel.git.aiUndoHunk, async (_e, paths: string[]) => {
    const ai = new AiGit(workspace.root!);
    await ai.undoOnlyPaths(paths);
    return { ok: true };
  });
}
