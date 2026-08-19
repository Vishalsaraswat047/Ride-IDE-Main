import { useEffect, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { languages } from "monaco-editor";
import type { RideSettings } from "@ride/contracts";
import { workspace, detectLang, useSettings } from "../lib/hooks";
import { monacoThemeName } from "../lib/theme";
import { Save, FileCode2 } from "lucide-react";

/** Per-buffer suggestion cache: path + tail hash → {result, expires}. */
const completionCache = new Map<string, { text: string | null; expires: number }>();

function completionCacheKey(path: string, beforeCursor: string): string {
  const tail = beforeCursor.slice(-400);
  let h = 0;
  for (let i = 0; i < tail.length; i++) h = (h * 31 + tail.charCodeAt(i)) | 0;
  return `${path}:${h}`;
}

export function EditorPane() {
  const [, force] = useState(0);
  const { settings } = useSettings();
  const settingsRef = useRef<RideSettings | null>(settings);
  settingsRef.current = settings;
  useEffect(() => workspace.subscribe(() => force((n) => n + 1)), []);

  const active = workspace.activeTab;
  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-canvas text-mute">
        <FileCode2 className="h-10 w-10" />
        <p className="text-sm">Select a file from the explorer.</p>
      </div>
    );
  }

  const value = workspace.contentFor(active.path);
  const ed = settings?.editor;
  const theme = settings ? monacoThemeName(settings.workbench.theme) : "ride-ride-dark";

  // ─── RIDE AI inline completion: ghost text + Tab-to-accept ───
  const onMount: OnMount = (editor, monaco) => {
    const provider: languages.InlineCompletionsProvider = {
      provideInlineCompletions: async (model, position) => {
        const s = settingsRef.current;
        if (!s?.ai.autocomplete || position.lineNumber < 1) return { items: [] };

        const beforeCursor = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        if (!beforeCursor.trim()) return { items: [] };

        const key = completionCacheKey(model.uri.path, beforeCursor);
        const cached = completionCache.get(key);
        const cachedText = cached && cached.expires > Date.now() ? cached.text : undefined;
        if (cachedText !== undefined) {
          if (!cachedText) return { items: [] };
          return makeItems(cachedText, position);
        }

        const started = Date.now();
        const result = await window.ride.editor.inlineCompletion({
          path: model.uri.path,
          content: model.getValue(),
          position: { lineNumber: position.lineNumber, column: position.column },
        });
        const elapsed = Date.now() - started;

        let text = result.text ?? "";
        // Guard: model echoed text we already typed on the same line.
        const lineText = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
        if (lineText && text.startsWith(lineText.slice(-32))) {
          text = text.slice(lineText.slice(-32).length);
        }
        text = text.replace(/\s+$/, "");
        if (!text || text.length > 2048) text = "";

        completionCache.set(key, { text: text || null, expires: Date.now() + Math.max(15_000, elapsed * 2) });
        if (!text) return { items: [] };

        return makeItems(text, position);
      },
      freeInlineCompletions: () => {
        completionCache.clear();
      },
    };

    const disposable = monaco.languages.registerInlineCompletionsProvider(
      { pattern: "**", scheme: "file", hasAccessToAllModels: true },
      provider,
    );
    editor.onDidDispose(() => disposable.dispose());
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-hairline bg-canvas-soft px-3">
        <span className="truncate text-xs text-body">{active.path}</span>
        <button
          onClick={() => {
            void window.ride.editor.saveFile(active.path, value).then(() => workspace.markSaved(active.path));
          }}
          disabled={!active.dirty}
          className="flex h-6 items-center gap-1 rounded-sm bg-primary px-2 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          <Save className="h-3 w-3" /> Save
        </button>
      </div>
      <div className="ride-monaco-host min-h-0 flex-1">
        <Editor
          path={active.path}
          value={value}
          language={detectLang(active.path)}
          theme={theme}
          onMount={onMount}
          onChange={(v) => workspace.updateContent(active.path, v ?? "")}
          options={{
            fontSize: settings?.workbench.fontSize ?? 13,
            fontFamily: settings?.workbench.fontFamily ?? '"JetBrains Mono", ui-monospace, monospace',
            minimap: { enabled: ed?.minimap ?? false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: ed?.tabSize ?? 2,
            insertSpaces: ed?.insertSpaces ?? true,
            wordWrap: ed?.wordWrap ?? "off",
            cursorBlinking: ed?.cursorBlinking ?? "blink",
            stickyScroll: { enabled: ed?.stickyScroll ?? false },
            renderWhitespace: "selection",
            inlineSuggest: { enabled: settings?.ai.autocomplete ?? true },
            suggest: { preview: true },
          }}
        />
      </div>
    </div>
  );
}

function makeItems(
  text: string,
  position: { lineNumber: number; column: number },
): {
  items: { insertText: string; range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number } }[];
  commands: { id: string; title: string; tooltip?: string }[];
} {
  return {
    items: [
      {
        insertText: text,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        },
      },
    ],
    commands: [{ id: "editor.action.inlineSuggest.commit", title: "Accept inline completion", tooltip: "Tab" }],
  };
}