import { ipcMain, dialog, app } from "electron";
import { writeFile, mkdir, rename, rm } from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { IpcChannel, type WorkspaceOpenResult } from "@ride/contracts";
import type { WorkspaceManager } from "../services/workspace";
import { PolicyEngine } from "@ride/permissions";
import { getBuiltinTemplates } from "../services/templates/catalog";
import { scaffoldTemplate } from "../services/templates/scaffold";
import { settingsManager } from "../services/settings";
import { installDependencies } from "../services/deps";
import { sendToRenderer } from "../index";

let policy: PolicyEngine | null = null;

export function getPolicy(): PolicyEngine {
  if (!policy) throw new Error("Policy engine not initialized");
  return policy;
}

export function setPolicy(p: PolicyEngine): void {
  policy = p;
}

export function registerWorkspaceHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.workspace.openProjectDialog, async () => {
    const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || !result.filePaths[0]) return null;
    return openWorkspace(workspace, result.filePaths[0]);
  });

  ipcMain.handle(IpcChannel.workspace.open, async (_e, root: string) => {
    return openWorkspace(workspace, root);
  });

  ipcMain.handle(IpcChannel.workspace.listFiles, async () => {
    return workspace.listTree();
  });

  ipcMain.handle(IpcChannel.workspace.readFile, async (_e, path: string) => {
    return workspace.readText(path);
  });

  ipcMain.handle(IpcChannel.workspace.writeFile, async (_e, path: string, content: string) => {
    await writeFile(path, content, "utf8");
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.workspace.createFile, async (_e, path: string, content: string) => {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content ?? "", "utf8");
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.workspace.createDirectory, async (_e, path: string) => {
    await mkdir(path, { recursive: true });
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.workspace.rename, async (_e, from: string, to: string) => {
    await rename(from, to);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.workspace.delete, async (_e, path: string) => {
    const engine = getPolicy();
    if (engine && !engine.isInsideWorkspace(path)) {
      return { ok: false, error: "Outside workspace" };
    }
    await rm(path, { recursive: true, force: true });
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.workspace.projectCards, async () => {
    return getBuiltinTemplates().map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      tags: b.tags,
      category: b.category,
    }));
  });

  ipcMain.handle(IpcChannel.workspace.newFile, async () => {
    const scratch = join(app.getPath("userData"), "scratch");
    await mkdir(scratch, { recursive: true });
    const w = await openWorkspace(workspace, scratch, { touchRecent: false });
    return { filePath: join(scratch, "untitled"), workspace: w };
  });

  ipcMain.handle(IpcChannel.workspace.createFromBlueprint, async (_e, blueprintId: string, dest: string) => {
    const dir = await scaffoldTemplate(blueprintId, dest);
    if (settingsManager.get().templates.autoInstallLibraries) {
      sendToRenderer(IpcChannel.template.progress, { phase: "installing", pm: "detecting" });
      const result = await installDependencies(dir);
      sendToRenderer(IpcChannel.template.progress, {
        phase: "installed",
        pm: result.pm,
        ok: result.ok,
        error: result.error,
        durationMs: result.durationMs,
      });
    }
    return openWorkspace(workspace, dir);
  });
}

export async function openWorkspace(
  workspace: WorkspaceManager,
  root: string,
  opts: { touchRecent?: boolean } = {},
): Promise<WorkspaceOpenResult> {
  const info = workspace.setRoot(root);
  const tree = await workspace.listTree();
  const result: WorkspaceOpenResult = {
    root,
    name: root.split(/[\\/]/).pop() ?? root,
    fileCount: info.fileCount,
    gitRepo: info.gitRepo,
  };
  void tree;
  if (opts.touchRecent !== false) await settingsManager.touchRecent(root, result.name);
  setPolicy(
    new PolicyEngine({
      workspaceRoot: root,
      allowCommands: ["^pnpm", "^npm", "^npx", "^node ", "^git status", "^git diff", "^ls", "^dir", "^cat ", "^type "],
      denyCommands: ["rm -rf /", "format c:", "rd /s /q c:", "shutdown", "del /f /s /q c:"],
      highImpactCommandPatterns: [
        /rm\s+-rf\s+(\/|[a-z]:[\\/])/i,
        /git\s+push\s+(-f|--force)/i,
        /git\s+clean\s+-f[dx]?/i,
        /shutdown|reboot|format\s+[a-z]:/i,
        /net\s+user|reg\s+delete\s+HKLM/i,
      ],
      maxBatchDelete: 50,
      alwaysAllow: ["read", "list", "search", "grep", "browse", "webfetch"],
      alwaysDeny: ["docker_run_privileged"],
    }),
  );
  return result;
}
