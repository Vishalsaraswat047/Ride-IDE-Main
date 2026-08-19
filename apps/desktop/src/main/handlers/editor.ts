import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { dialog, ipcMain } from "electron";
import { IpcChannel, type InlineCompletionRequest, type InlineCompletionResult } from "@ride/contracts";
import { resolveEndpoint } from "@ride/model-router";
import type { WorkspaceManager } from "../services/workspace";
import { settingsManager } from "../services/settings";

const COMPLETE_SYSTEM =
  "You are RIDE's inline code-completion engine. Given a file and the text before the cursor, " +
  "produce ONLY the code that should be inserted right after the cursor (the continuation). " +
  "Rules: output raw code with no explanation, no markdown fences, no leading label. " +
  "Match the file's existing indentation and style. If nothing meaningful can complete, reply with a single space.";

export function registerEditorHandlers(workspace: WorkspaceManager): void {
  ipcMain.handle(IpcChannel.editor.openFile, async (_e, path: string) => {
    const content = await readFile(path, "utf8");
    return { path, content };
  });

  ipcMain.handle(IpcChannel.editor.getFileContent, async (_e, path: string) => {
    return readFile(path, "utf8");
  });

  ipcMain.handle(IpcChannel.editor.saveFile, async (_e, path: string, content: string) => {
    await writeFile(path, content, "utf8");
    await indexFile(workspace, path, content);
    return { ok: true };
  });

  ipcMain.handle(IpcChannel.editor.saveFileAs, async (_e, content: string) => {
    const suggested = workspace.root ? join(workspace.root, "untitled.ts") : join(process.env.USERPROFILE ?? ".", "untitled.ts");
    const result = await dialog.showSaveDialog({
      title: "Save file",
      defaultPath: suggested,
      buttonLabel: "Save",
      filters: [{ name: "All files", extensions: ["*"] }],
    });
    if (result.canceled || !result.filePath) return { ok: false };
    const path = result.filePath;
    await writeFile(path, content, "utf8");
    await indexFile(workspace, path, content);
    return { ok: true, path };
  });

  // ─── AI inline completion (ghost text, Tab-to-accept) ───
  ipcMain.handle(
    IpcChannel.editor.inlineCompletion,
    async (_e, req: InlineCompletionRequest): Promise<InlineCompletionResult> => {
      const started = Date.now();
      const ai = settingsManager.get().ai;
      if (!ai.autocomplete) return { text: null };
      if (!req.content || req.position.lineNumber < 1) return { text: null };

      // Fast path: Featherless Qwen when a key exists, otherwise the bundled NVIDIA Nemotron endpoint.
      const useFast = ai.featherlessApiKey
        ? resolveEndpoint("huihui-ai/Qwen2.5-Coder-7B-Instruct-abliterated", ai)
        : resolveEndpoint("nvidia/nemotron-3-super-120b-a12b", ai);
      if (!useFast) return { text: null, ms: Date.now() - started };

      const lines = req.content.split("\n");
      const cursorLineIndex = req.position.lineNumber - 1;
      const before = lines.slice(0, cursorLineIndex).join("\n");
      const currentLine = (lines[cursorLineIndex] ?? "").slice(0, req.position.column - 1);
      const after = lines.slice(cursorLineIndex, cursorLineIndex + 8).join("\n");
      const context = before.length > 9000 ? "…" + before.slice(-9000) : before;

      const prompt = [
        `FILE: ${req.path.split(/[\\/]/).pop()}`,
        "",
        "```",
        context,
        currentLine + "‹CURSOR›",
        "```",
        "",
        "Complete the code at ‹CURSOR›. Return only the text to insert.",
      ].join("\n");

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);
        const res = await fetch(`${useFast.baseURL}/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${useFast.apiKey}`,
          },
          body: JSON.stringify({
            model: useFast.model,
            messages: [
              { role: "system", content: COMPLETE_SYSTEM },
              { role: "user", content: prompt },
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 180,
          }),
        });

        if (!res.ok) {
          clearTimeout(timer);
          return { text: null, ms: Date.now() - started };
        }

        const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        clearTimeout(timer);
        let text = (data.choices?.[0]?.message?.content ?? "").trim();
        if (!text || text === ".") return { text: null, ms: Date.now() - started };

        // Never return content that duplicates the current line already typed.
        if (currentLine && text.startsWith(currentLine.slice(-16))) {
          text = text.slice(currentLine.slice(-16).length);
        }
        if (!text.trim()) return { text: null, ms: Date.now() - started };
        text = text.replace(/\n{4,}/g, "\n\n\n");
        return { text, model: useFast.model, ms: Date.now() - started };
      } catch {
        return { text: null, ms: Date.now() - started };
      }
    },
  );
}

async function indexFile(workspace: WorkspaceManager, path: string, content: string): Promise<void> {
  workspace.projectDb?.removeFile(path);
  const { quickParse } = await import("../services/workspace");
  const { langForPath } = await import("@ride/project-db");
  const lang = langForPath(path);
  const { symbols, imports } = quickParse(content, lang);
  workspace.projectDb?.upsertFile(path, lang, content, symbols, imports);
}