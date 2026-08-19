import { ipcMain } from "electron";
import { IpcChannel } from "@ride/contracts";
import type { RideTemplate, TemplateCreateRequest, TemplateSaveRequest } from "@ride/contracts";
import type { WorkspaceManager } from "../services/workspace";
import { getBuiltinTemplate, getBuiltinTemplates } from "../services/templates/catalog";
import { generateTemplate } from "../services/templates/engine/pipeline";
import { previewFor } from "../services/templates/previews";
import { listUserTemplates, saveUserTemplate, deleteUserTemplate } from "../services/templates/store";
import { installDependencies } from "../services/deps";
import { settingsManager } from "../services/settings";
import { sendToRenderer } from "../index";
import { openWorkspace } from "./workspace";
import { autoStartPreview } from "./preview";

/** Install the scaffold's libraries up front unless the user turned it off. */
export async function installScaffoldDeps(dir: string): Promise<void> {
  if (!settingsManager.get().templates.autoInstallLibraries) return;
  const result = await installDependencies(dir);
  sendToRenderer(IpcChannel.template.progress, {
    phase: "installed",
    pm: result.pm,
    ok: result.ok,
    error: result.error,
    durationMs: result.durationMs,
  });
}

export function registerTemplateHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.template.list, async () => {
    const builtin: RideTemplate[] = getBuiltinTemplates().map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      section: t.section,
      tags: t.tags,
      framework: t.framework,
      styling: t.styling,
      ui: t.ui,
      icons: t.icons,
      animation: t.animation,
      features: t.features,
      aiCompatible: t.aiCompatible,
      userGenerated: false,
      questions: t.questions,
      hasPreview: t.hasPreview,
      customPrompt: t.customPrompt,
      files: [],
    }));
    return { builtin, users: await listUserTemplates() };
  });

  ipcMain.handle(IpcChannel.template.create, async (_e, req: TemplateCreateRequest) => {
    const tpl = getBuiltinTemplate(req.templateId);
    if (!tpl) throw new Error(`Unknown template: ${req.templateId}`);
    sendToRenderer(IpcChannel.template.progress, { phase: "starting" });
    const result = await generateTemplate(req.templateId, req.dest, req.answers?.prompt, (step) =>
      sendToRenderer(IpcChannel.template.progress, step),
    );
    if (settingsManager.get().templates.autoInstallLibraries) {
      sendToRenderer(IpcChannel.template.progress, { phase: "installing", pm: "detecting" });
    }
    await installScaffoldDeps(result.dest);
    autoStartPreview(result.dest);
    return openWorkspace(workspace, result.dest);
  });

  ipcMain.handle(IpcChannel.template.save, async (_e, req: TemplateSaveRequest) => {
    if (!workspace.root) return { ok: false, error: "No workspace open" } as const;
    try {
      const template = await saveUserTemplate(req, workspace.root);
      return { ok: true, template };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  ipcMain.handle(IpcChannel.template.delete, async (_e, id: string) => {
    try {
      await deleteUserTemplate(id);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

  ipcMain.handle(IpcChannel.template.preview, (_e, id: string) => {
    const tpl = getBuiltinTemplate(id);
    if (!tpl) return null;
    return previewFor(tpl);
  });
}