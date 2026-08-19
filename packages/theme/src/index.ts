/**
 * RIDE theme engine — themes are configuration, never hardcoded colors.
 *
 * A theme defines semantic tokens (canvas, ink, accent, syntax colors…).
 * `applyThemeToDom` turns them into CSS custom properties on :root,
 * and `toMonacoTheme` maps them onto Monaco's color registry so the code
 * editor follows the same palette. New themes (e.g. from the extension
 * marketplace) are plain token objects registered via `registerTheme`.
 */

export interface RideThemeTokens {
  kind: "dark" | "light";
  canvas: string;
  canvasSoft: string;
  canvasSoft2: string;
  ink: string;
  body: string;
  mute: string;
  hairline: string;
  hairlineStrong: string;
  primary: string;
  onPrimary: string;
  link: string;
  linkDeep: string;
  success: string;
  error: string;
  errorDeep: string;
  warning: string;
  violet: string;
  cyan: string;
  highlightPink: string;
  selection: string;
  focusRing: string;
  syntax: {
    comment: string;
    keyword: string;
    string: string;
    number: string;
    function: string;
    className: string;
    variable: string;
    operator: string;
    punctuation: string;
    type: string;
  };
}

export interface RideTheme {
  id: string;
  name: string;
  tokens: RideThemeTokens;
}

const DARK: RideThemeTokens = {
  kind: "dark",
  canvas: "#171717",
  canvasSoft: "#1d1d1d",
  canvasSoft2: "#222222",
  ink: "#ededed",
  body: "#a1a1a1",
  mute: "#6f6f6f",
  hairline: "#2a2a2a",
  hairlineStrong: "#4d4d4d",
  primary: "#f2f2f2",
  onPrimary: "#171717",
  link: "#ff7a3d",
  linkDeep: "#e02040",
  success: "#4d94ff",
  error: "#ff5252",
  errorDeep: "#e03434",
  warning: "#ffb84d",
  violet: "#e06bb8",
  cyan: "#5eead4",
  highlightPink: "#ff8fbf",
  selection: "#264f78",
  focusRing: "#ff7a3d",
  syntax: {
    comment: "#6f6f6f",
    keyword: "#c586c0",
    string: "#ce9178",
    number: "#b5cea8",
    function: "#dcdcaa",
    className: "#4ec9b0",
    variable: "#9cdcfe",
    operator: "#d4d4d4",
    punctuation: "#808080",
    type: "#4ec9b0",
  },
};

const LIGHT: RideThemeTokens = {
  kind: "light",
  canvas: "#ffffff",
  canvasSoft: "#fafafa",
  canvasSoft2: "#f5f5f5",
  ink: "#171717",
  body: "#4d4d4d",
  mute: "#888888",
  hairline: "#ebebeb",
  hairlineStrong: "#a1a1a1",
  primary: "#171717",
  onPrimary: "#ffffff",
  link: "#ff5a1f",
  linkDeep: "#e02040",
  success: "#0070f3",
  error: "#ee0000",
  errorDeep: "#c50000",
  warning: "#f5a623",
  violet: "#c02080",
  cyan: "#0f9f86",
  highlightPink: "#ff0080",
  selection: "#add6ff",
  focusRing: "#ff5a1f",
  syntax: {
    comment: "#6a9955",
    keyword: "#0000ff",
    string: "#a31515",
    number: "#098658",
    function: "#795e26",
    className: "#267f99",
    variable: "#001080",
    operator: "#000000",
    punctuation: "#383838",
    type: "#267f99",
  },
};

const MIDNIGHT: RideThemeTokens = {
  kind: "dark",
  canvas: "#0b1020",
  canvasSoft: "#111631",
  canvasSoft2: "#171d3d",
  ink: "#e8ecf8",
  body: "#9aa3c4",
  mute: "#62698a",
  hairline: "#222b52",
  hairlineStrong: "#3a4580",
  primary: "#8ab4ff",
  onPrimary: "#0b1020",
  link: "#ffa05c",
  linkDeep: "#ff7a3d",
  success: "#7ee0c3",
  error: "#ff6b6b",
  errorDeep: "#e04444",
  warning: "#ffce7a",
  violet: "#e879b8",
  cyan: "#7ce8f5",
  highlightPink: "#ff9ecb",
  selection: "#2d3f77",
  focusRing: "#ffa05c",
  syntax: {
    comment: "#5f6a9c",
    keyword: "#c792ea",
    string: "#a3d977",
    number: "#f78c6c",
    function: "#82aaff",
    className: "#ffcb6b",
    variable: "#e8ecf8",
    operator: "#89ddff",
    punctuation: "#6f7bb3",
    type: "#7ce8f5",
  },
};

const CONTRAST: RideThemeTokens = {
  kind: "dark",
  canvas: "#000000",
  canvasSoft: "#0d0d0d",
  canvasSoft2: "#1a1a1a",
  ink: "#ffffff",
  body: "#e0e0e0",
  mute: "#b0b0b0",
  hairline: "#555555",
  hairlineStrong: "#ffffff",
  primary: "#ffffff",
  onPrimary: "#000000",
  link: "#ffa05c",
  linkDeep: "#ffb37a",
  success: "#5fd35f",
  error: "#ff5252",
  errorDeep: "#ff8080",
  warning: "#ffd166",
  violet: "#ff9ed6",
  cyan: "#6fffe9",
  highlightPink: "#ff9ed6",
  selection: "#264f78",
  focusRing: "#ffffff",
  syntax: {
    comment: "#a0a0a0",
    keyword: "#ff9cf9",
    string: "#ffd48a",
    number: "#a2ff9f",
    function: "#ffd48a",
    className: "#6fffe9",
    variable: "#ffffff",
    operator: "#ffffff",
    punctuation: "#d0d0d0",
    type: "#6fffe9",
  },
};

export const RIDE_THEMES: RideTheme[] = [
  { id: "ride-dark", name: "RIDE Dark", tokens: DARK },
  { id: "ride-light", name: "RIDE Light", tokens: LIGHT },
  { id: "ride-midnight", name: "RIDE Midnight", tokens: MIDNIGHT },
  { id: "ride-contrast", name: "RIDE High Contrast", tokens: CONTRAST },
];

const registry = new Map<string, RideTheme>(RIDE_THEMES.map((t) => [t.id, t]));

export function registerTheme(theme: RideTheme): void {
  registry.set(theme.id, theme);
}

export function getTheme(id: string): RideTheme {
  return registry.get(id) ?? RIDE_THEMES[0]!;
}

export function listThemes(): RideTheme[] {
  return [...registry.values()];
}

/** Token name → CSS custom property name (matches @ride/ui Tailwind theme). */
function cssVar(token: string): string {
  return `--color-${token}`;
}

/** Apply a theme to the DOM: sets CSS custom properties + data attributes. */
export function applyThemeToDom(theme: RideTheme): void {
  const root = document.documentElement;
  const t = theme.tokens;
  root.classList.toggle("dark", t.kind === "dark");
  root.classList.toggle("light", t.kind === "light");
  root.dataset["theme"] = theme.id;
  const map: Record<string, string> = {
    primary: t.primary,
    "on-primary": t.onPrimary,
    ink: t.ink,
    body: t.body,
    mute: t.mute,
    hairline: t.hairline,
    "hairline-strong": t.hairlineStrong,
    canvas: t.canvas,
    "canvas-soft": t.canvasSoft,
    "canvas-soft-2": t.canvasSoft2,
    link: t.link,
    "link-deep": t.linkDeep,
    success: t.success,
    error: t.error,
    "error-deep": t.errorDeep,
    warning: t.warning,
    violet: t.violet,
    cyan: t.cyan,
    "highlight-pink": t.highlightPink,
    selection: t.selection,
    "focus-ring": t.focusRing,
  };
  for (const [token, value] of Object.entries(map)) {
    root.style.setProperty(cssVar(token), value);
  }
  // Monaco token colors.
  const monacoVars: Record<string, string> = {
    "comment": t.syntax.comment,
    "keyword": t.syntax.keyword,
    "string": t.syntax.string,
    "number": t.syntax.number,
    "function": t.syntax.function,
    "class-name": t.syntax.className,
    "variable": t.syntax.variable,
    "operator": t.syntax.operator,
    "punctuation": t.syntax.punctuation,
    "type": t.syntax.type,
    "selection-background": t.selection,
  };
  for (const [k, value] of Object.entries(monacoVars)) {
    root.style.setProperty(`--monaco-${k}`, value);
  }
}

export interface MonacoThemeDefinition {
  base: "vs" | "vs-dark";
  inherit: boolean;
  rules: { token: string; foreground: string; fontStyle?: string }[];
  colors: Record<string, string>;
}

/** Convert theme tokens to a Monaco theme definition (theme-agnostic, no monaco import). */
export function toMonacoTheme(theme: RideTheme): MonacoThemeDefinition {
  const t = theme.tokens;
  return {
    base: t.kind === "dark" ? "vs-dark" : "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: t.syntax.comment, fontStyle: "italic" },
      { token: "keyword", foreground: t.syntax.keyword },
      { token: "string", foreground: t.syntax.string },
      { token: "number", foreground: t.syntax.number },
      { token: "identifier", foreground: t.syntax.variable },
      { token: "type", foreground: t.syntax.type },
      { token: "class", foreground: t.syntax.className },
      { token: "function", foreground: t.syntax.function },
      { token: "operator", foreground: t.syntax.operator },
      { token: "delimiter", foreground: t.syntax.punctuation },
      { token: "tag", foreground: t.syntax.keyword },
      { token: "attribute.name", foreground: t.syntax.variable },
      { token: "attribute.value", foreground: t.syntax.string },
      { token: "variable.predefined", foreground: t.syntax.variable },
      { token: "constant", foreground: t.syntax.number },
    ],
    colors: {
      "editor.background": t.canvas,
      "editor.foreground": t.ink,
      "editor.lineHighlightBackground": t.canvasSoft,
      "editor.selectionBackground": t.selection,
      "editorCursor.foreground": t.focusRing,
      "editorLineNumber.foreground": t.mute,
      "editorLineNumber.activeForeground": t.body,
      "editorIndentGuide.background1": t.hairline,
      "editorWidget.background": t.canvasSoft,
      "editorWidget.border": t.hairline,
      "editorSuggestWidget.background": t.canvasSoft,
      "editorSuggestWidget.selectedBackground": t.canvasSoft2,
      "editorHoverWidget.background": t.canvasSoft,
      "editorHoverWidget.border": t.hairline,
      "editorGutter.background": t.canvas,
      "editorOverviewRuler.border": t.hairline,
      "editorBracketHighlight.foreground1": t.link,
      "editorBracketHighlight.foreground2": t.warning,
      "editorBracketHighlight.foreground3": t.highlightPink,
      "scrollbarSlider.background": `${t.hairlineStrong}66`,
      "scrollbarSlider.hoverBackground": `${t.hairlineStrong}99`,
      "diffEditor.insertedTextBackground": `${t.success}22`,
      "diffEditor.removedTextBackground": `${t.error}22`,
    },
  };
}
