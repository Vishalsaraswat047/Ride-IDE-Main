import { loader } from "@monaco-editor/react";
import { applyThemeToDom, getTheme, listThemes, toMonacoTheme, type RideTheme } from "@ride/theme";

let monacoReady: Promise<void> | null = null;

/** Define every registered theme in Monaco (idempotent, called once at startup). */
export function initMonacoThemes(): Promise<void> {
  if (!monacoReady) {
    monacoReady = loader.init().then((monaco) => {
      for (const theme of listThemes()) {
        monaco.editor.defineTheme(`ride-${theme.id}`, toMonacoTheme(theme));
      }
      return undefined;
    });
  }
  return monacoReady;
}

/** Apply a theme id: DOM custom properties + Monaco definition (re-defined on change). */
export function applyRideTheme(themeId: string): void {
  const theme = getTheme(themeId);
  applyThemeToDom(theme);
  void initMonacoThemes().then((/* monaco */) => {
    loader.init().then((monaco) => {
      monaco.editor.defineTheme(`ride-${theme.id}`, toMonacoTheme(theme));
    });
  });
}

/** Monaco theme name for an EditorPane `theme` prop. */
export function monacoThemeName(themeId: string): string {
  return `ride-${themeId}`;
}

export type { RideTheme };