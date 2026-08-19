import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AuthFlow, PageSpec, PageState, ProductArchetypeArchitecture } from "./engine/product-architecture";
import { briefFor } from "./engine/briefs";
import { getBuiltinTemplate } from "./catalog";
import { 
  enrichContentWithArchitecture, 
  getArchitectureOps,
  userContextFromPrompt 
} from "./engine/content";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ride-app";
}

function reactBase(name: string): Record<string, string> {
  const slugged = slug(name);
  return {
    "package.json": JSON.stringify(
      {
        name: slugged,
        private: true,
        version: "0.1.0",
        type: "module",
        scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
        dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "lucide-react": "^0.475.0" },
        devDependencies: {
          "@tailwindcss/vite": "^4.1.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          "@vitejs/plugin-react": "^4.4.0",
          tailwindcss: "^4.1.0",
          typescript: "^5.9.0",
          vite: "^7.0.0",
        },
      },
      null,
      2,
    ),
    "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>\${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    "vite.config.ts": 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n});\n',
    "tsconfig.json":
      '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "jsx": "react-jsx",\n    "strict": true,\n    "skipLibCheck": true,\n    "noEmit": true,\n    "lib": ["ES2022", "DOM", "DOM.Iterable"]\n  },\n  "include": ["src"]\n}\n',
    "src/main.tsx":
      'import { StrictMode } from "react";\nimport { createRoot } from "react-dom/client";\nimport "./index.css";\nimport App from "./App";\n\ncreateRoot(document.getElementById("root")!).render(\n  <StrictMode>\n    <App />\n  </StrictMode>,\n);\n',
    "src/index.css": `@import "tailwindcss";

:root {
  --ink: #171717;
  --body: #4d4d4d;
  --mute: #888888;
  --hairline: #ebebeb;
  --canvas: #ffffff;
  --canvas-soft: #fafafa;
  --link: #0070f3;
  --primary: #171717;
  --on-primary: #ffffff;
  --accent: #0070f3;
  --success: #16a34a;
  --error: #dc2626;
}
${GALAXY_KIT_CSS}
html {
  color-scheme: light;
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}
@view-transition { navigation: auto; }
body {
  margin: 0;
  font-family: "Inter", system-ui, -apple-system, sans-serif;
  background: var(--canvas);
  color: var(--ink);
  text-rendering: optimizeLegibility;
}
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 99px; border: 3px solid var(--canvas); }
::-webkit-scrollbar-thumb:hover { background: var(--hairline-strong); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`,
    ".gitignore": "node_modules/\ndist/\n",
  };
}

interface FamilyCtx {
  /** Variant display name, e.g. "Minimal Developer" */
  name: string;
  /** Accent hex from the catalog, e.g. "#4d94ff" */
  accent: string;
  emoji: string;
}

interface FamilyPalette {
  canvas: string;
  soft: string;
  ink: string;
  body: string;
  mute: string;
  hairline: string;
  accent: string;
  primary: string;
  onPrimary: string;
  font?: string;
  /** Distinct design language applied on top of the shared visual kit. */
  skin?: "editorial" | "brutal" | "neon" | "paper" | "terminal" | "glass" | "bento" | "luxe";
}

/** Design languages: each one owns typography, edges, surface rules and signature motifs. */
const SKIN_CSS: Record<NonNullable<FamilyPalette["skin"]>, string> = {
  editorial: `
/* ── Skin: editorial ────── */
.vk-display { font-family: ${'"Georgia", "Times New Roman", serif'}; font-weight: 700; letter-spacing: -.01em; }
.vk-rule { height: 1px; background: linear-gradient(90deg, var(--ink) 0 40%, var(--hairline) 40% 100%); }
.vk-idx { font-family: ${'"Georgia", serif'}; color: color-mix(in srgb, var(--ink) 30%, transparent); }
.vk-kicker { letter-spacing: .22em; text-transform: uppercase; font-size: 11px; font-weight: 600; }
`,
  brutal: `
/* ── Skin: brutal ────── */
.vk-display { font-weight: 900; text-transform: uppercase; letter-spacing: -.02em; line-height: .95; }
.vk-hard { border: 2px solid var(--ink); box-shadow: 5px 5px 0 var(--ink); }
.vk-hard-hover { border: 2px solid var(--ink); box-shadow: 5px 5px 0 var(--ink); transition: transform .15s, box-shadow .15s; }
.vk-hard-hover:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0 var(--ink); }
.vk-tag-brutal { font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-size: 10px; }
`,
  neon: `
/* ── Skin: neon ────── */
.vk-neon { text-shadow: 0 0 22px color-mix(in srgb, var(--accent) 70%, transparent); }
.vk-neon-line { box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 50%, transparent); }
.vk-chartbar { border-radius: 4px 4px 0 0; background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 85%, white 15%), var(--accent)); box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 45%, transparent); }
`,
  paper: `
/* ── Skin: paper ────── */
body { background-image: radial-gradient(color-mix(in srgb, var(--ink) 5%, transparent) 1px, transparent 1px); background-size: 22px 22px; }
.vk-paper { border: 1px solid var(--hairline); border-radius: 18px; box-shadow: 0 1px 2px rgba(0,0,0,.04), 0 10px 24px -12px color-mix(in srgb, var(--ink) 18%, transparent); }
.vk-doodle { position: absolute; opacity: .35; pointer-events: none; font-family: ${'"Comic Sans MS", cursive'}; }
`,
  terminal: `
/* ── Skin: terminal ────── */
.vk-mono { font-family: ${'"SFMono-Regular", "Cascadia Code", "JetBrains Mono", Consolas, monospace'}; }
.vk-term { border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--canvas) 90%, var(--ink) 10%); box-shadow: inset 0 0 0 1px rgba(255,255,255,.04); }
.vk-term-title { font-family: ${'"SFMono-Regular", "Cascadia Code", Consolas, monospace'}; font-size: 11px; letter-spacing: .08em; }
.vk-bracket { color: var(--accent); font-weight: 700; }
.vk-cursor { display: inline-block; width: .6em; height: 1.05em; background: var(--accent); animation: vk-blink 1.1s steps(1) infinite; vertical-align: text-bottom; }
@keyframes vk-blink { 50% { opacity: 0; } }
`,
  glass: `
/* ── Skin: glass ────── */
.vk-glass-panel { background: linear-gradient(145deg, rgba(255,255,255,.24), rgba(255,255,255,.06)); border: 1px solid rgba(255,255,255,.28); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); box-shadow: 0 18px 50px -20px rgba(0,0,0,.5); }
.vk-grad-text { background: linear-gradient(120deg, var(--accent), color-mix(in srgb, var(--accent) 40%, #ffffff)); -webkit-background-clip: text; background-clip: text; color: transparent; }
`,
  bento: `
/* ── Skin: bento ────── */
.vk-bento { border-radius: 22px; border: 1px solid var(--hairline); background: linear-gradient(160deg, var(--canvas-soft), var(--canvas)); box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 16px 40px -24px color-mix(in srgb, var(--ink) 30%, transparent); transition: transform .3s, box-shadow .3s; }
.vk-bento:hover { transform: translateY(-4px); box-shadow: 0 4px 8px rgba(0,0,0,.06), 0 26px 60px -28px color-mix(in srgb, var(--accent) 40%, transparent); }
.vk-bento-fill { border-radius: 22px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 4%, transparent)); border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--hairline)); }
`,
  luxe: `
/* ── Skin: luxe ────── */
.vk-display { font-family: ${'"Playfair Display", "Georgia", serif'}; letter-spacing: -.015em; }
.vk-thin-rule { height: 1px; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ink) 22%, transparent), transparent); }
.vk-cap { letter-spacing: .3em; text-transform: uppercase; font-size: 10px; font-weight: 600; color: var(--mute); }
`,
};

/**
 * Galaxy UI Kit — adapted from uiverse.io (MIT) open-source components,
 * restyled on the RIDE / Vercel DESIGN.md token system (ink #171717 on
 * near-white canvas, hairlines, stacked shadows, pill CTAs, mono eyebrows).
 * Every generated template ships this kit + web-design-guidelines
 * compliance (focus-visible rings, reduced motion, touch targets).
 */
const GALAXY_KIT_CSS = `
/* ── Design tokens (Vercel DESIGN.md surface + semantic set) ──────────── */
:root {
  --canvas-soft-2: #f5f5f5;
  --hairline-strong: #a1a1a1;
  --link-deep: #0761d1;
  --link-bg-soft: #d3e5ff;
  --warning: #f5a623;
  --warning-soft: #ffefcf;
  --error-soft: #f7d4d6;
  --success-soft: #d1fae5;
  --selection-bg: #171717;
  --selection-fg: #f2f2f2;
  --r-xs: 4px;
  --r-sm: 6px;
  --r-md: 8px;
  --r-lg: 12px;
  --r-xl: 16px;
  --r-pill: 100px;
  /* Stacked shadows — never a single heavy drop (DESIGN.md elevation) */
  --ds-1: 0 0 0 1px rgba(0,0,0,.08) inset;
  --ds-2: 0 1px 1px rgba(0,0,0,.03), 0 2px 2px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.08) inset;
  --ds-3: 0 2px 2px rgba(0,0,0,.06), 0 8px 8px -8px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.08) inset;
  --ds-4: 0 2px 2px rgba(0,0,0,.06), 0 8px 16px -4px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.08) inset;
  --ds-5: 0 1px 1px rgba(0,0,0,.03), 0 8px 16px -4px rgba(0,0,0,.06), 0 24px 32px -8px rgba(0,0,0,.09), 0 0 0 1px rgba(0,0,0,.08) inset;
}

::selection { background: var(--selection-bg); color: var(--selection-fg); }

/* ── Galaxy buttons (uiverse.io adapted) ─────────────────────────────── */
.gk-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 44px; padding: 0 20px; border: 1px solid transparent;
  border-radius: var(--r-pill); font-weight: 500; font-size: 14px; line-height: 20px;
  font-family: inherit; text-decoration: none; cursor: pointer; user-select: none;
  white-space: nowrap; transition: background-color .15s, border-color .15s, color .15s,
    box-shadow .15s, opacity .15s, transform .1s;
}
.gk-btn:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.gk-btn:active { transform: translateY(1px); }
.gk-btn:disabled { opacity: .5; cursor: not-allowed; }
.gk-btn-primary { background: var(--primary); color: var(--on-primary); }
.gk-btn-primary:hover { opacity: .85; }
.gk-btn-secondary { background: var(--canvas); color: var(--ink); border-color: var(--hairline); }
.gk-btn-secondary:hover { background: var(--canvas-soft); }
.gk-btn-ghost { background: transparent; color: var(--ink); }
.gk-btn-ghost:hover { background: var(--canvas-soft); }
.gk-btn-sm { height: 32px; padding: 0 12px; font-size: 13px; }
.gk-btn-lg { height: 48px; padding: 0 24px; font-size: 16px; }
.gk-btn-icon { width: 40px; height: 40px; padding: 0; border-radius: 9999px; }
.gk-btn-shine { position: relative; overflow: hidden; }
.gk-btn-shine::after { content: ""; position: absolute; top: 0; left: -75%; width: 50%; height: 100%; background: linear-gradient(105deg, transparent, rgba(255,255,255,.35), transparent); transform: skewX(-20deg); transition: left .5s ease; }
.gk-btn-shine:hover::after { left: 125%; }

/* ── Galaxy inputs (uiverse.io adapted) ──────────────────────────────── */
.gk-field { display: grid; gap: 6px; }
.gk-field > label { font-size: 12px; font-weight: 500; color: var(--body); }
.gk-input {
  width: 100%; height: 40px; padding: 0 14px;
  background: var(--canvas); color: var(--ink);
  border: 1px solid var(--hairline); border-radius: var(--r-sm);
  font-family: inherit; font-size: 14px; line-height: 20px;
  transition: border-color .15s, box-shadow .15s;
}
.gk-input::placeholder { color: var(--mute); }
.gk-input:focus { outline: none; border-color: var(--link); box-shadow: 0 0 0 3px color-mix(in srgb, var(--link) 15%, transparent); }
.gk-input-sm { height: 32px; padding: 0 10px; font-size: 13px; }
.gk-input-lg { height: 48px; padding: 0 16px; font-size: 16px; }
textarea.gk-input { height: auto; min-height: 96px; padding: 10px 14px; resize: vertical; }
select.gk-input { appearance: none; background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 34px; }

/* ── Galaxy cards (stacked shadows, hairline rings) ──────────────────── */
.gk-card { background: var(--canvas); color: var(--ink); border-radius: var(--r-md); box-shadow: var(--ds-2); }
.gk-card-lg { border-radius: var(--r-lg); }
.gk-card-xl { border-radius: var(--r-xl); }
.gk-card-soft { background: var(--canvas-soft); color: var(--ink); border-radius: var(--r-md); box-shadow: none; }
.gk-card-hover { transition: box-shadow .25s, transform .25s; }
.gk-card-hover:hover { box-shadow: var(--ds-3); transform: translateY(-2px); }
.gk-card-flat { background: var(--canvas); color: var(--ink); border-radius: var(--r-md); box-shadow: var(--ds-1); }

/* ── Galaxy toggle switch (uiverse.io adapted) ───────────────────────── */
.gk-toggle { position: relative; display: inline-flex; width: 44px; height: 24px; flex: none; }
.gk-toggle input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
.gk-toggle .gk-track { position: absolute; inset: 0; border-radius: 9999px; background: var(--hairline-strong); transition: background .2s; }
.gk-toggle .gk-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 9999px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform .2s; }
.gk-toggle input:checked + .gk-track { background: var(--accent); }
.gk-toggle input:checked + .gk-track + .gk-knob { transform: translateX(20px); }
.gk-toggle input:focus-visible + .gk-track { box-shadow: 0 0 0 3px color-mix(in srgb, var(--link) 25%, transparent); }

/* ── Galaxy loaders & skeletons (uiverse.io adapted) ─────────────────── */
.gk-loader { width: 32px; height: 32px; border-radius: 9999px; border: 3px solid var(--hairline); border-top-color: var(--accent); animation: gk-spin .8s linear infinite; }
@keyframes gk-spin { to { transform: rotate(360deg); } }
.gk-loader-sm { width: 18px; height: 18px; border-width: 2px; }
.gk-loader-dots { display: inline-flex; gap: 6px; }
.gk-loader-dots span { width: 8px; height: 8px; border-radius: 9999px; background: var(--accent); animation: gk-dot 1.2s ease-in-out infinite; }
.gk-loader-dots span:nth-child(2) { animation-delay: .15s; }
.gk-loader-dots span:nth-child(3) { animation-delay: .3s; }
@keyframes gk-dot { 0%, 100% { transform: scale(.6); opacity: .5; } 50% { transform: scale(1); opacity: 1; } }
.gk-skeleton { border-radius: 8px; background: linear-gradient(90deg, var(--canvas-soft) 25%, var(--canvas-soft-2) 50%, var(--canvas-soft) 75%); background-size: 200% 100%; animation: gk-shimmer 1.4s infinite; }
@keyframes gk-shimmer { to { background-position: -200% 0; } }

/* ── Galaxy notifications / toasts (uiverse.io adapted) ──────────────── */
.gk-toast { display: flex; gap: 10px; align-items: flex-start; background: var(--canvas); color: var(--ink); border-radius: var(--r-md); box-shadow: var(--ds-4); padding: 12px 16px; font-size: 14px; line-height: 20px; border-left: 3px solid var(--link); animation: gk-msg .3s cubic-bezier(.2,.8,.2,1) both; }
.gk-toast-success { border-left-color: var(--success); }
.gk-toast-error { border-left-color: var(--error); }
.gk-toast-warning { border-left-color: var(--warning); }
@keyframes gk-msg { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* ── Galaxy tooltip (uiverse.io adapted) ─────────────────────────────── */
.gk-tooltip { position: relative; }
.gk-tooltip::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) scale(.96); opacity: 0; pointer-events: none; background: var(--ink); color: var(--on-primary); font-size: 11px; font-weight: 500; line-height: 1.4; padding: 6px 10px; border-radius: 6px; white-space: nowrap; transition: opacity .15s, transform .15s; z-index: 50; }
.gk-tooltip:hover::after, .gk-tooltip:focus-visible::after { opacity: 1; transform: translateX(-50%) scale(1); }

/* ── Galaxy checkbox / radio / progress / badge / tab (adapted) ──────── */
.gk-checkbox { appearance: none; width: 18px; height: 18px; border: 1px solid var(--hairline-strong); border-radius: var(--r-xs); background: var(--canvas); cursor: pointer; display: inline-grid; place-content: center; transition: background .15s, border-color .15s; }
.gk-checkbox:checked { background: var(--accent); border-color: var(--accent); }
.gk-checkbox:checked::after { content: ""; width: 10px; height: 6px; border-left: 2px solid #fff; border-bottom: 2px solid #fff; transform: rotate(-45deg) translate(1px, -1px); }
.gk-checkbox:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.gk-radio { appearance: none; width: 18px; height: 18px; border: 1px solid var(--hairline-strong); border-radius: 9999px; background: var(--canvas); cursor: pointer; display: inline-grid; place-content: center; }
.gk-radio::after { content: ""; width: 8px; height: 8px; border-radius: 9999px; background: var(--accent); transform: scale(0); transition: transform .15s; }
.gk-radio:checked { border-color: var(--accent); }
.gk-radio:checked::after { transform: scale(1); }
.gk-progress { height: 6px; border-radius: 9999px; background: var(--canvas-soft-2); overflow: hidden; }
.gk-progress > span { display: block; height: 100%; border-radius: 9999px; background: var(--accent); transition: width .4s ease; }
.gk-badge { display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px; border-radius: 9999px; background: var(--canvas-soft); color: var(--body); font-size: 12px; font-weight: 500; line-height: 20px; }
.gk-badge-strong { background: var(--ink); color: var(--on-primary); }
.gk-badge-dot { width: 6px; height: 6px; border-radius: 9999px; background: var(--accent); }
.gk-tab { display: inline-flex; align-items: center; height: 32px; padding: 0 16px; border-radius: 64px; border: 0; background: transparent; color: var(--body); font-family: inherit; font-size: 14px; font-weight: 500; line-height: 20px; cursor: pointer; transition: background .15s, color .15s, box-shadow .15s; }
.gk-tab:hover { color: var(--ink); background: var(--canvas-soft); }
.gk-tab:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.gk-tab.is-active { background: var(--canvas); color: var(--ink); box-shadow: var(--ds-2); }

/* ── Typography (DESIGN.md display voice: 600 weight, negative tracking) */
.vk-eyebrow { font-family: var(--mono, "SFMono-Regular", "Cascadia Code", "JetBrains Mono", Consolas, monospace); font-size: 12px; letter-spacing: .08em; text-transform: uppercase; font-weight: 500; color: var(--mute); }

/* ── Advanced modern utilities ──────────────────────────────────────────── */
.gk-logo { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -.01em; }
.gk-logo-mark { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px; background: var(--primary); color: var(--on-primary); font-weight: 700; font-size: 15px; flex-shrink: 0; box-shadow: var(--ds-2); }
.gk-chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 10px; border-radius: var(--r-pill); border: 1px solid var(--hairline); background: var(--canvas-soft); color: var(--body); font-size: 12px; font-weight: 500; white-space: nowrap; }
.gk-avatar { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, var(--ink))); color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.gk-divider { height: 1px; border: 0; background: linear-gradient(90deg, transparent, var(--hairline) 18%, var(--hairline) 82%, transparent); }
.gk-glass { background: color-mix(in srgb, var(--canvas) 64%, transparent); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.gk-sticky-nav { position: sticky; top: 0; z-index: 40; background: color-mix(in srgb, var(--canvas) 72%, transparent); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); }
.gk-grid-bg { background-image: linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px); background-size: 44px 44px; }
.gk-gradient-text { background: linear-gradient(100deg, var(--ink) 30%, var(--accent) 120%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.gk-spotlight { position: relative; overflow: hidden; }
.gk-spotlight::before { content: ""; position: absolute; inset: 0; background: radial-gradient(420px 240px at 50% -20%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 72%); pointer-events: none; }
.gk-reveal { animation: gk-rise .7s cubic-bezier(.22, 1, .36, 1) both; animation-timeline: view(block 92%); animation-range: entry 0% entry 60%; }
@keyframes gk-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@supports not (animation-timeline: view()) {
  .gk-reveal { animation: none; }
}
.gk-marquee { display: flex; gap: 2.5rem; overflow: hidden; -webkit-mask-image: linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent); mask-image: linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent); }
.gk-marquee-track { display: flex; gap: 2.5rem; width: max-content; animation: gk-marquee 28s linear infinite; }
@keyframes gk-marquee { to { transform: translateX(-50%); } }

/* ── Web guidelines: reduced motion ──────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .gk-btn-shine::after, .gk-loader, .gk-loader-dots span, .gk-skeleton, .gk-toast, .gk-marquee-track { animation: none !important; transition: none !important; }
  .gk-card-hover:hover { transform: none; }
  .gk-reveal { animation: none !important; }
}
`;

/** Shared index.css generator with the token names the family apps are built against. */
function familyCss(p: FamilyPalette): string {
  return `@import "tailwindcss";

:root {
  --canvas: ${p.canvas};
  --canvas-soft: ${p.soft};
  --ink: ${p.ink};
  --body: ${p.body};
  --mute: ${p.mute};
  --hairline: ${p.hairline};
  --link: ${p.accent};
  --primary: ${p.primary};
  --on-primary: ${p.onPrimary};
  --accent: ${p.accent};
  --success: #16a34a;
  --error: #dc2626;
}
${GALAXY_KIT_CSS}
body {
  font-family: ${p.font ?? "\"Inter\", system-ui, sans-serif"};
  background: var(--canvas);
  color: var(--ink);
  margin: 0;
}

button { cursor: pointer; }

/* ── Visual kit: image scenes, 3D, glass ─────────────────────────────── */
.vk-scene { position: relative; overflow: hidden; }
.vk-grid { background-image: linear-gradient(rgba(127,127,127,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(127,127,127,.09) 1px, transparent 1px); background-size: 34px 34px; }
.vk-grid-faint { background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px); background-size: 30px 30px; }
.vk-orb { position: absolute; border-radius: 9999px; filter: blur(70px); pointer-events: none; }
.vk-glass { backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.vk-tilt { transition: transform .45s cubic-bezier(.2,.8,.2,1); transform-style: preserve-3d; will-change: transform; }
.vk-tilt:hover { transform: rotateX(7deg) rotateY(-7deg) scale(1.03); }
.vk-float { animation: vk-float 6s ease-in-out infinite; }
.vk-float-slow { animation: vk-float 9s ease-in-out infinite; }
@keyframes vk-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
.vk-cube-wrap { perspective: 1000px; display: flex; align-items: center; justify-content: center; }
.vk-cube { --c: 10rem; position: relative; width: var(--c); height: var(--c); transform-style: preserve-3d; animation: vk-spin 20s linear infinite; }
@keyframes vk-spin { 0% { transform: rotateX(-16deg) rotateY(0deg); } 100% { transform: rotateX(-16deg) rotateY(360deg); } }
.vk-face { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; border: 1px solid var(--hairline); background: color-mix(in srgb, var(--canvas) 78%, var(--accent) 22%); box-shadow: inset 0 0 40px color-mix(in srgb, var(--accent) 18%, transparent); font-size: .6rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: color-mix(in srgb, var(--ink) 85%, var(--accent) 15%); }
.vk-photo { position: relative; overflow: hidden; }
.vk-photo::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(255,255,255,0) 55%, color-mix(in srgb, var(--ink) 42%, transparent)); }
.vk-photo-sheen { position: absolute; inset: -40% -20%; transform: rotate(18deg); background: linear-gradient(90deg, rgba(255,255,255,0) 30%, rgba(255,255,255,.22) 50%, rgba(255,255,255,0) 70%); }
.vk-ring { border-radius: 9999px; border: 3px solid color-mix(in srgb, var(--accent) 55%, transparent); }
.vk-dot { border-radius: 9999px; background: var(--accent); }
.vk-marquee { display: flex; gap: 2.5rem; overflow: hidden; white-space: nowrap; }
.vk-marquee-track { display: flex; gap: 2.5rem; animation: vk-marquee 22s linear infinite; }
@keyframes vk-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.vk-spot { background: conic-gradient(from 10deg at 50% 0%, transparent 38%, color-mix(in srgb, var(--accent) 26%, transparent) 50%, transparent 62%); }
.vk-dish::before { content: ""; position: absolute; inset: 8%; border-radius: 9999px; border: 2px dashed rgba(255,255,255,.5); }
.vk-sweep { background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,.5) 38%, transparent 56%); }
.vk-scanlines { background: repeating-linear-gradient(0deg, rgba(0,0,0,.14) 0 1px, transparent 1px 3px); mix-blend-mode: multiply; }
.vk-glow { text-shadow: 0 0 18px color-mix(in srgb, var(--accent) 65%, transparent), 0 0 44px color-mix(in srgb, var(--accent) 32%, transparent); }
.vk-msg { animation: vk-msg .45s cubic-bezier(.2,.8,.2,1) both; }
@keyframes vk-msg { from { opacity: 0; transform: translateY(10px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
.vk-typing span { display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: var(--mute); margin-right: 3px; animation: vk-bounce 1.2s infinite; }
.vk-typing span:nth-child(2) { animation-delay: .15s; }
.vk-typing span:nth-child(3) { animation-delay: .3s; }
@keyframes vk-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; } 30% { transform: translateY(-5px); opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .vk-cube, .vk-float, .vk-float-slow, .vk-marquee-track, .vk-msg, .vk-typing span { animation: none; } }
${p.skin ? SKIN_CSS[p.skin] : ""}`;
}

/** Per-family themed React apps, keyed by family id. Falls back to the archetype app. */
const FAMILY_SOURCES: Record<string, (ctx: FamilyCtx) => Record<string, string>> = {
  // ─── Websites: portfolio ─────────────────────────────────────────────────────
  portfolio: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fafafa", soft: "#f2f2f2", ink: "#171717", body: "#525252",
      mute: "#a1a1a1", hairline: "#e5e5e5", accent, primary: "#171717", onPrimary: "#fafafa",
    }),
    "src/App.tsx": `import { useState } from "react";
import { ArrowUpRight, Github, Mail, MapPin, Menu, X } from "lucide-react";

const projects = [
  { title: "Replace with a project", note: "Replace with a one-line description.", tag: "2026" },
  { title: "Replace with a project", note: "Replace with a one-line description.", tag: "2025" },
  { title: "Replace with a project", note: "Replace with a one-line description.", tag: "2025" },
];

const roles = [
  { org: "Replace with employer", role: "Replace with role", years: "2022 — present" },
  { org: "Replace with employer", role: "Replace with role", years: "2020 — 2022" },
  { org: "Replace with employer", role: "Replace with role", years: "2018 — 2020" },
];

const links = [
  { label: "Work", to: "/work" },
  { label: "About", to: "/about" },
  { label: "Contact", to: "/contact" },
];

const ACCENT_COLORS = [
  "linear-gradient(140deg,#7dd3fc,#6366f1)",
  "linear-gradient(140deg,#fcd34d,#f97316)",
  "linear-gradient(140deg,#6ee7b7,#0ea5e9)",
  "linear-gradient(140deg,#a855f7,#ec4899)",
  "linear-gradient(140deg,#14b8a6,#06b6d4)",
];

const CUBE_FACES = ["Work", "About", "Mail", "GitHub", "Hello", "RIDE"];
const FACE_TURNS = ["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(270deg)", "rotateX(90deg)", "rotateX(-90deg)"];

function Cube3D() {
  return (
    <div className="vk-cube-wrap">
      <div className="vk-cube">
        {CUBE_FACES.map((f, i) => (
          <div key={f} className="vk-face" style={{ transform: \`\${FACE_TURNS[i]} translateZ(calc(var(--c) / 2))\` }}>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="sticky top-0 z-50 border-b border-[var(--hairline)] bg-[var(--canvas)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-sm font-bold">Your Name</span>
          <nav className="hidden items-center gap-6 text-sm text-[var(--body)] md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-[var(--ink)]">{l.label}</a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-md border border-[var(--hairline)] p-2 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav className="border-t border-[var(--hairline)] bg-[var(--canvas)] px-4 py-3 md:hidden">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm text-[var(--body)] hover:text-[var(--ink)]"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-[1.15fr_1fr] md:items-center">
        <div>
          <span className="gk-badge">
            <span className="vk-dot h-1.5 w-1.5" /> Available for work · 2026
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">${name}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[var(--body)] sm:text-lg">
            Replace with a two-sentence intro: what you build, who you build it for, and what makes your work distinctive.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
            <a href="#work" className="gk-btn gk-btn-primary gk-btn-sm">See my work</a>
            <a href="#contact" className="gk-btn gk-btn-secondary gk-btn-sm">
              <Mail className="h-4 w-4" /> Contact
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-sm">
          <div
            className="vk-scene vk-grid absolute inset-0 rounded-2xl"
            style={{ background: "linear-gradient(160deg,#dbeafe,#ede9fe 55%,#fce7f3)" }}
          />
          <div className="vk-orb h-44 w-44" style={{ top: "-14%", right: "-18%", background: "var(--accent)" }} />
          <div className="relative flex items-center justify-center py-20">
            <div className="vk-float">
              <Cube3D />
            </div>
          </div>
          <div
            className="vk-photo vk-tilt absolute bottom-5 left-4 hidden w-32 overflow-hidden rounded-xl border border-white/70 shadow-xl sm:block"
            style={{ background: "linear-gradient(150deg,#fda4af,#fb7185)" }}
          >
            <div className="vk-photo-sheen" />
            <div className="relative p-3">
              <div className="text-2xl">🗺️</div>
              <div className="mt-1 text-[11px] font-semibold text-white">Field notes</div>
              <div className="text-[10px] text-white/80">Replace with a caption</div>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="border-t border-[var(--hairline)]">
        <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Selected work</h2>
          <div className="mt-6 grid gap-3">
            {projects.map((p, i) => (
              <div key={p.title} className="group overflow-hidden gk-card gk-card-hover">
                <div className="vk-photo relative h-24 sm:h-28" style={{ background: COVERS[i % COVERS.length] }}>
                  <div className="vk-photo-sheen" />
                  <div className="vk-grid-faint absolute inset-0" />
                  <span className="absolute top-3 right-3 rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur">{p.tag}</span>
                  <ArrowUpRight className="absolute bottom-3 left-4 h-5 w-5 text-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="text-base font-semibold">{p.title}</div>
                    <div className="mt-1 text-sm text-[var(--body)]">{p.note}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="border-t border-[var(--hairline)]">
        <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">About</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--body)]">Replace with what you focus on: the problems you solve, the tools you reach for, and the work you're proud of.</p>
            <div className="vk-photo vk-tilt mt-5 h-36 rounded-xl" style={{ background: "linear-gradient(140deg,#a5b4fc,#818cf8 50%,#c4b5fd)" }}>
              <div className="vk-photo-sheen" />
              <div className="vk-grid-faint absolute inset-0" />
              <div className="absolute bottom-3 left-4 text-[11px] font-semibold text-white/90">Your desk · 2026</div>
            </div>
          </div>
          <div className="text-sm">
            <div className="flex items-center gap-2 text-[var(--mute)]"><MapPin className="h-4 w-4" /> Replace with your location</div>
            <a href="https://github.com" className="mt-3 flex items-center gap-2 text-[var(--body)] hover:text-[var(--ink)]"><Github className="h-4 w-4" /> github.com/you</a>
            <div className="mt-8 space-y-5">
              {roles.map((r) => (
                <div key={r.org} className="border-l border-[var(--hairline)] pl-4">
                  <div className="font-semibold">{r.role}</div>
                  <div className="mt-0.5 text-sm text-[var(--body)]">{r.org}</div>
                  <div className="mt-0.5 text-xs text-[var(--mute)]">{r.years}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-[var(--hairline)]">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-start gap-3 px-4 py-10 text-sm sm:px-6 sm:py-12">
          <a href="mailto:you@example.com" className="text-lg font-semibold underline-offset-4 hover:underline">you@example.com</a>
          <div className="flex flex-wrap gap-4 text-[var(--body)] sm:gap-6">
            <a href="https://github.com" className="hover:text-[var(--ink)]">GitHub</a>
            <a href="https://linkedin.com" className="hover:text-[var(--ink)]">LinkedIn</a>
            <a href="https://x.com" className="hover:text-[var(--ink)]">X</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: agency ───────────────────────────────────────────────────────
  agency: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0f1115", soft: "#171a21", ink: "#f5f5f4", body: "#a3a8b4",
      mute: "#6b7280", hairline: "#23262e", accent, primary: accent, onPrimary: "#0f1115",
    }),
    "src/App.tsx": `import { ArrowRight, Megaphone, PenTool, Rocket, Star } from "lucide-react";
import { Link } from "react-router-dom";

const services = [
  { icon: Megaphone, title: "Brand & positioning", note: "Replace with what this service covers." },
  { icon: PenTool, title: "Web & product design", note: "Replace with what this service covers." },
  { icon: Rocket, title: "Growth marketing", note: "Replace with what this service covers." },
];

const clients = ["Replace with client", "Replace with client", "Replace with client", "Replace with client", "Replace with client", "Replace with client"];

const ACCENT_COLORS = [
  "linear-gradient(140deg,#7dd3fc,#6366f1)",
  "linear-gradient(140deg,#fcd34d,#f97316)",
  "linear-gradient(140deg,#6ee7b7,#0ea5e9)",
  "linear-gradient(140deg,#a855f7,#ec4899)",
  "linear-gradient(140deg,#14b8a6,#06b6d4)",
];

const CUBE_TURNS = ["rotateY(0deg)", "rotateY(90deg)", "rotateY(180deg)", "rotateY(270deg)", "rotateX(90deg)", "rotateX(-90deg)"];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Studio Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="/work" className="hover:text-[var(--ink)]">Work</a>
            <a href="/services" className="hover:text-[var(--ink)]">Services</a>
            <a href="/contact" className="hover:text-[var(--ink)]">Contact</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene vk-grid-faint absolute inset-0" />
        <div className="vk-orb h-72 w-72" style={{ top: "-20%", left: "-10%", background: accent }} />
        <div className="vk-orb h-64 w-64" style={{ bottom: "-26%", right: "-8%", background: "#3b82f6" }} />
        <div className="relative mx-auto grid w-full max-w-5xl gap-12 px-6 py-16 sm:py-24 md:grid-cols-2 md:items-center">
          <div>
            <span className="gk-badge backdrop-blur">
              <span className="vk-dot h-1.5 w-1.5" /> Accepting new projects · 2026
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">${name}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--body)]">
              Replace with the promise you make: who you help, the outcome you deliver, and why you're the team for it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/contact" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Start a project <ArrowRight className="h-4 w-4" /></a>
              <a href="/work" className="gk-btn gk-btn-secondary">See the work</a>
            </div>
          </div>
          <div className="relative mx-auto h-72 w-full max-w-sm sm:h-80">
            <div className="vk-cube-wrap absolute inset-0">
              <div className="vk-cube">
                {["Brand", "Web", "Motion", "Social", "Launch", "Growth"].map((f, i) => (
                  <div key={f} className="vk-face" style={{ transform: \`\${CUBE_TURNS[i]} translateZ(calc(var(--c) / 2))\` }}>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="vk-glass vk-tilt absolute -bottom-2 left-0 w-40 rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-[10px] text-[var(--mute)]">Launch score</div>
              <div className="mt-1 text-lg font-bold text-[var(--ink)]">98<span className="text-xs text-[var(--mute)]">/100</span></div>
              <div className="mt-1.5 gk-progress"><div className="h-full w-[98%] rounded-full" style={{ background: accent }} /></div>
            </div>
            <div className="vk-glass vk-tilt vk-float absolute -top-2 right-0 w-40 rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-[10px] text-[var(--mute)]">Cases shipped</div>
              <div className="mt-1 text-lg font-bold text-[var(--ink)]">48<span className="text-xs text-[var(--mute)]">+</span></div>
              <div className="mt-1 text-[10px] text-[var(--body)]">across 12 industries</div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="vk-marquee [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
            <div className="vk-marquee-track">
              {[...clients, ...clients].map((c, i) => <span key={i} className="text-sm font-medium tracking-wide text-[var(--mute)]">{c}</span>)}
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto w-full max-w-5xl px-6 py-20">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">What we do</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {services.map((s) => (
            <div key={s.title} className="vk-tilt group gk-card-flat p-6 transition-colors hover:bg-[var(--canvas-soft)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg" style={{ background: \`color-mix(in srgb, var(--accent) 16%, transparent)\` }}>
                <s.icon className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="work" className="border-t border-[var(--hairline)]">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Selected work</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {["Project one", "Project two", "Project three"].map((t, i) => (
<Link key={t} to="/work" className="group block overflow-hidden gk-card gk-card-hover">
<div className="vk-photo relative aspect-[4/3]" style={{ background: ["linear-gradient(140deg,#f472b6,#8b5cf6)", "linear-gradient(140deg,#fbbf24,#f43f5e)", "linear-gradient(140deg,#22d3ee,#6366f1)"][i] }}>
<div className="vk-photo-sheen" />
<div className="vk-grid-faint absolute inset-0" />
<span className="absolute bottom-3 left-4 text-lg font-bold text-white/90">{["01", "02", "03"][i]}</span>
</div>
<div className="p-5">
<h3 className="text-base font-semibold group-hover:text-[var(--accent)]">{t}</h3>
<p className="mt-1 text-sm text-[var(--body)]">Replace with the outcome for this client.</p>
</div>
</Link>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto flex max-w-4xl flex-col items-start gap-4 px-6 py-16">
          <div className="flex items-center gap-1 text-[var(--accent)]">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
          <p className="max-w-xl text-lg leading-7 text-[var(--body)]">"Replace with a client testimonial about the work and the outcome."</p>
          <a href="mailto:hello@studio.com" className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">hello@studio.com</a>
        </div>
      </section>
    </div>
  );
}
`,
  }),

  // ─── Websites: startup ──────────────────────────────────────────────────────
  startup: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f8fafc", ink: "#0f172a", body: "#475569",
      mute: "#94a3b8", hairline: "#e2e8f0", accent, primary: accent, onPrimary: "#ffffff",
    }),
    "src/App.tsx": `import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useState } from "react";

const features = [
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
  { title: "Replace with a feature", note: "Replace with the benefit for the user." },
];

const plans = [
  { name: "Starter", price: "$0", note: "Replace with what's included." },
  { name: "Pro", price: "$19", note: "Replace with what's included.", featured: true },
  { name: "Team", price: "$49", note: "Replace with what's included." },
];

const ACCENT_COLORS = [
  "linear-gradient(140deg,#7dd3fc,#6366f1)",
  "linear-gradient(140deg,#fcd34d,#f97316)",
  "linear-gradient(140deg,#6ee7b7,#0ea5e9)",
  "linear-gradient(140deg,#a855f7,#ec4899)",
  "linear-gradient(140deg,#14b8a6,#06b6d4)",
];

export default function App() {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Product Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="/features" className="hover:text-[var(--ink)]">Features</a>
            <a href="/pricing" className="hover:text-[var(--ink)]">Pricing</a>
            <a href="/waitlist" className="hover:text-[var(--ink)]">Waitlist</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene vk-grid absolute inset-0" style={{ background: "linear-gradient(180deg,#eff6ff,var(--canvas) 70%)" }} />
        <div className="vk-orb h-80 w-80" style={{ top: "-24%", left: "20%", background: "var(--accent)" }} />
        <div className="vk-orb h-64 w-64" style={{ top: "10%", right: "-12%", background: "#a78bfa" }} />
        <div className="relative mx-auto max-w-4xl px-6 pt-20 pb-4 text-center sm:pt-24">
          <div className="mx-auto gk-badge w-fit backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> Now in private beta
          </div>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">${name}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--body)]">
            Replace with the one-liner: the problem you solve, the audience, and the outcome.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/waitlist" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Join the waitlist <ArrowRight className="h-4 w-4" /></a>
            <a href="#features" className="gk-btn gk-btn-secondary">Explore features</a>
          </div>
        </div>
        <div className="relative mx-auto max-w-3xl px-6 pb-20 pt-12">
          <div className="vk-scene3d relative h-64 sm:h-72">
            <div className="vk-tilt absolute inset-0 mx-auto max-w-xl gk-card-flat gk-card-xl overflow-hidden bg-[var(--canvas)] shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-[var(--hairline)] bg-[var(--canvas-soft)] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57]" /><span className="h-2 w-2 rounded-full bg-[#febc2e]" /><span className="h-2 w-2 rounded-full bg-[#28c840]" />
                <span className="ml-2 text-[10px] text-[var(--mute)]">app.product.com</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="gk-progress w-24" />
                  <div className="flex gap-1.5"><div className="gk-progress w-8" /><div className="h-2 w-8 rounded-full" style={{ background: accent }} /></div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="flex h-14 flex-col items-center justify-center gap-1.5 rounded-md border border-[var(--hairline)]">
                      <div className="h-4 w-4 rounded-full" style={{ background: ["#fecaca", "#bfdbfe", "#fde68a", "#bbf7d0", "#ddd6fe", "#fed7aa"][n] }} />
                      <div className="gk-progress w-10" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="vk-glass vk-float absolute -top-4 -right-4 hidden gk-card-flat bg-[var(--canvas)]/90 px-3 py-2 text-xs shadow-lg sm:block">
                <span className="font-semibold" style={{ color: accent }}>↑ +38%</span> <span className="text-[var(--mute)]">this week</span>
              </div>
            </div>
            <div className="vk-glass vk-tilt vk-float-slow absolute -bottom-6 -left-6 hidden w-44 rounded-xl border border-[var(--hairline)] bg-[var(--canvas)]/90 p-3 shadow-xl sm:block">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: \`color-mix(in srgb, var(--accent) 15%, transparent)\` }}><Sparkles className="h-3.5 w-3.5" style={{ color: accent }} /></div>
                <div>
                  <div className="text-[10px] font-semibold">Pro tip</div>
                  <div className="text-[9px] text-[var(--mute)]">Replace with a user win</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Features</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {features.map((f, i) => (
              <div key={f.title} className="group overflow-hidden gk-card gk-card-hover">
                <div className="vk-photo relative h-20" style={{ background: ["linear-gradient(135deg,#bfdbfe,#818cf8)", "linear-gradient(135deg,#fde68a,#f97316)", "linear-gradient(135deg,#bbf7d0,#0ea5e9)", "linear-gradient(135deg,#ddd6fe,#ec4899)", "linear-gradient(135deg,#fecaca,#ef4444)", "linear-gradient(135deg,#a5f3fc,#6366f1)"][i] }}>
                  <div className="vk-photo-sheen" />
                  <div className="vk-grid-faint absolute inset-0" />
                  <Check className="absolute bottom-2.5 left-3.5 h-4 w-4 text-white" />
                </div>
                <div className="p-5">
                  <h3 className="text-sm font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{f.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Pricing</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.name} className={\`rounded-lg border p-6 \${p.featured ? "border-[var(--accent)] bg-[var(--canvas-soft)]" : "border-[var(--hairline)]"}\`}>
              <div className="text-sm font-medium text-[var(--body)]">{p.name}</div>
              <div className="mt-2 text-3xl font-bold">{p.price}<span className="text-sm font-normal text-[var(--mute)]">/mo</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--body)]">{p.note}</p>
              <button className={\`mt-5 w-full rounded-md py-2 text-sm font-medium \${p.featured ? "bg-[var(--primary)] text-[var(--on-primary)]" : "border border-[var(--hairline)] text-[var(--body)] hover:text-[var(--ink)]"}\`}>
                Choose {p.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section id="waitlist" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Join the waitlist</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with what early users get: launch access, founder support, special pricing.</p>
          <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="gk-input h-10 min-w-0 flex-1" />
            <button className="h-10 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Notify me</button>
          </form>
        </div>
      </section>
    </div>
  );
}
`,
  }),

  // ─── Websites: blog ─────────────────────────────────────────────────────────
  blog: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fbfaf7", soft: "#f3f1ea", ink: "#1c1917", body: "#57534e",
      mute: "#a8a29e", hairline: "#e7e5e4", accent, primary: "#1c1917", onPrimary: "#fbfaf7",
      font: "\"Georgia\", serif",
    }),
    "src/App.tsx": `import { Mail, PenLine, Search } from "lucide-react";
import { Link } from "react-router-dom";

const posts = [
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Jan 12, 2026", tag: "Essays" },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Dec 28, 2025", tag: "Guides" },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Nov 30, 2025", tag: "News" },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Oct 14, 2025", tag: "Essays" },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Sep 2, 2025", tag: "Guides" },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary.", date: "Aug 19, 2025", tag: "News" },
];

const COVERS = [
  "linear-gradient(140deg,#fef3c7,#f59e0b)",
  "linear-gradient(140deg,#dbeafe,#3b82f6)",
  "linear-gradient(140deg,#fee2e2,#ef4444)",
  "linear-gradient(140deg,#dcfce7,#10b981)",
  "linear-gradient(140deg,#f3e8ff,#8b5cf6)",
  "linear-gradient(140deg,#cffafe,#0891b2)",
];

const ACCENT_COLORS = [
  "linear-gradient(140deg,#7dd3fc,#6366f1)",
  "linear-gradient(140deg,#fcd34d,#f97316)",
  "linear-gradient(140deg,#6ee7b7,#0ea5e9)",
  "linear-gradient(140deg,#a855f7,#ec4899)",
  "linear-gradient(140deg,#14b8a6,#06b6d4)",
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
          <div>
            <span className="text-lg font-bold tracking-tight">${name}</span>
            <span className="ml-2 text-xs text-[var(--mute)]">A column on…</span>
          </div>
          <nav className="flex items-center gap-5 text-sm text-[var(--body)]">
            <a href="#posts" className="hover:text-[var(--ink)]">Archive</a>
            <a href="#newsletter" className="hover:text-[var(--ink)]">Newsletter</a>
            <button aria-label="Search"><Search className="h-4 w-4" /></button>
          </nav>
        </div>
      </header>

      <main id="posts" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <article className="grid gap-6 border-b border-[var(--hairline)] pb-10 md:grid-cols-[1.25fr_1fr] md:items-center">
          <div>
            <div className="flex items-center gap-3 text-xs text-[var(--mute)]">
              <span className="gk-badge">Featured</span>
              <span>{posts[0].date}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{posts[0].title}</h1>
            <p className="mt-3 text-base leading-7 text-[var(--body)]">
              {posts[0].excerpt} Replace the featured story with your best recent piece — the one you'd hand to a new reader.
            </p>
            <Link to="/post/1" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--link)]"><PenLine className="h-4 w-4" /> Read the essay</Link>
          </div>
          <div className="vk-photo vk-tilt vk-float-slow relative aspect-[4/3] overflow-hidden rounded-xl shadow-xl" style={{ background: COVERS[0] }}>
            <div className="vk-photo-sheen" />
            <div className="vk-grid-faint absolute inset-0" />
            <span className="absolute bottom-3 left-4 text-xs font-semibold tracking-wide text-white/90">Issue № {posts[0].tag}</span>
          </div>
        </article>

        <div className="mt-10 grid gap-7 sm:grid-cols-2">
          {posts.slice(1).map((p, i) => (
            <article key={p.title} className="group">
              <div className="vk-photo relative h-36 overflow-hidden rounded-lg" style={{ background: COVERS[(i + 1) % COVERS.length] }}>
                <div className="vk-photo-sheen" />
                <div className="vk-grid-faint absolute inset-0" />
                <span className="absolute top-3 right-3 rounded-full bg-black/20 px-2 py-0.5 text-[10px] text-white backdrop-blur">{p.tag}</span>
              </div>
              <div className="mt-3 text-xs text-[var(--mute)]">{p.date}</div>
              <h2 className="mt-1.5 text-lg font-bold tracking-tight"><Link to={\`/post/\${i + 1}\`} className="hover:text-[var(--link)]">{p.title}</Link></h2>
              <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </main>

      <section id="newsletter" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">The newsletter</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with a short pitch for subscribing — what arrives, how often, why it's worth it.</p>
          <form className="mx-auto mt-6 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@example.com" className="gk-input h-10 min-w-0 flex-1" />
            <button className="flex h-10 items-center gap-1.5 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--on-primary)] hover:opacity-85"><Mail className="h-4 w-4" /> Subscribe</button>
          </form>
        </div>
      </section>

      <footer className="py-10 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} ${name} — Replace with an about line.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: documentation ────────────────────────────────────────────────
  documentation: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0f1117", soft: "#171a22", ink: "#e6e9ef", body: "#9aa3b5",
      mute: "#5d6678", hairline: "#232734", accent, primary: accent, onPrimary: "#0f1117",
      skin: "terminal",
    }),
    "src/App.tsx": `import { BookOpen, ChevronRight, Copy, Menu, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const nav: { group: string; items: string[] }[] = [
  { group: "Getting started", items: ["Introduction", "Installation", "Quickstart"] },
  { group: "Guides", items: ["Configuration", "Deployment", "Migrating"] },
  { group: "Reference", items: ["CLI", "API", "Changelog"] },
];

const code = \`$ npm create ride@latest my-app
$ cd my-app
$ npm run dev
➜  Local:   http://localhost:5173/\`;

export default function App() {
  const [copied, setCopied] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--hairline)] p-5 lg:block">
        <div className="vk-mono flex items-center gap-2 text-sm font-bold"><span className="vk-bracket">[</span><BookOpen className="h-4 w-4 text-[var(--accent)]" /> ${name}<span className="vk-bracket">]</span></div>
        {nav.map((g) => (
          <div key={g.group} className="mt-6">
            <div className="vk-mono text-[10px] font-semibold tracking-[.18em] text-[var(--mute)] uppercase">::{g.group}</div>
            <div className="mt-2 space-y-1.5">
{g.items.map((it) => (
<Link key={it} to="/docs" className={\`vk-mono block rounded border px-2.5 py-1.5 text-[13px] \${it === "Introduction" ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 font-medium text-[var(--accent)]" : "border-transparent text-[var(--body)] hover:border-[var(--hairline)] hover:text-[var(--ink)]"}\`}>
{it === "Introduction" ? "> " : "  "}{it}
</Link>
))}
            </div>
          </div>
        ))}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex h-12 items-center gap-3 border-b border-[var(--hairline)] px-4 lg:hidden">
          <button onClick={() => setMobileNav(!mobileNav)}><Menu className="h-5 w-5" /></button>
          <span className="vk-mono text-sm font-bold">${name}</span>
        </header>
        {mobileNav && (
          <div className="border-b border-[var(--hairline)] bg-[var(--canvas)] px-4 py-2 text-sm text-[var(--body)]">
            {nav.flatMap((g) => g.items).map((it) => <div key={it} className="py-1">{it}</div>)}
          </div>
        )}

        <main className="mx-auto max-w-2xl px-6 py-12">
          <div className="vk-term vk-mono mb-8 flex items-center gap-3 px-4 py-2 text-xs text-[var(--mute)]">
            <Search className="h-3.5 w-3.5" /> Search docs… <kbd className="rounded border border-[var(--hairline)] bg-[var(--canvas)] px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
          </div>
          <h1 className="vk-mono text-2xl font-bold tracking-tight"><span className="vk-bracket">#</span> Introduction</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--body)]">
            Replace this page with real documentation: what the product does, who it is for, and how to get started in under five minutes.
          </p>
          <h2 className="vk-mono mt-10 text-lg font-bold"><span className="vk-bracket">##</span> Installation</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--body)]">Replace with the exact install steps, prerequisites, and any version notes.</p>
          <div className="vk-term vk-mono relative mt-4 overflow-hidden bg-[#0b0d12] text-[13px] text-[#c8d3e8]">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </div>
              <span className="vk-term-title text-[var(--mute)]">terminal — ${name}</span>
              <button onClick={() => { void navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-white/10">
                <Copy className="h-3 w-3" /> {copied ? "copied" : "copy"}
              </button>
            </div>
            <pre className="overflow-x-auto p-4">{code}<span className="vk-cursor" /></pre>
          </div>
          <h2 className="vk-mono mt-10 text-lg font-bold"><span className="vk-bracket">##</span> Next steps</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--body)]">
{["Quickstart guide", "Configuration reference", "Deployment"].map((s, i) => (
<li key={s} className="vk-mono flex items-center gap-2"><span className="text-[var(--accent)]">$ {i + 1}</span><Link to="/docs" className="text-[var(--link)] hover:underline">{s}</Link></li>
))}
</ul>
<div className="mt-10 flex items-center justify-between border-t border-[var(--hairline)] pt-6 text-sm">
<Link to="/docs" className="vk-mono text-[var(--mute)] hover:text-[var(--ink)]">�+? previous</Link>
<Link to="/docs" className="vk-mono flex items-center gap-1 text-[var(--link)]">Quickstart <ChevronRight className="h-4 w-4" /></Link>
</div>
        </main>
      </div>
    </div>
  );
}
`,
  }),

  // ─── Websites: personal ─────────────────────────────────────────────────────
  personal: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fbfaf7", soft: "#f3f1ea", ink: "#1c1a17", body: "#5f5a51",
      mute: "#a39d91", hairline: "#e6e2d8", accent, primary: "#1c1a17", onPrimary: "#fbfaf7",
      skin: "editorial",
      font: "\"Georgia\", serif",
    }),
    "src/App.tsx": `import { ArrowUpRight, Coffee, Music, PenLine, Rss } from "lucide-react";
import { Link } from "react-router-dom";

const links = [
  { title: "Replace with a link", note: "What it is / where it goes." },
  { title: "Replace with a link", note: "What it is / where it goes." },
  { title: "Replace with a link", note: "What it is / where it goes." },
  { title: "Replace with a link", note: "What it is / where it goes." },
  { title: "Replace with a link", note: "What it is / where it goes." },
  { title: "Replace with a link", note: "What it is / where it goes." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-lg items-center justify-between px-6 py-6">
        <span className="vk-display text-lg">${name}</span>
        <span className="vk-kicker text-[var(--mute)]">Now: Replace with what you're up to</span>
      </header>
      <div className="vk-rule mx-auto max-w-lg" />

      <section className="mx-auto max-w-lg px-6 pt-12 pb-10">
        <div className="flex items-baseline gap-3">
          <span className="vk-idx text-3xl">01</span>
          <div>
            <h1 className="vk-display text-4xl">${name}</h1>
            <p className="gk-card-flat gk-card-soft p-4 text-sm leading-6 text-[var(--body)]">
              Replace with a short intro: who you are, the work you do, and one interesting thing about you.
            </p>
          </div>
        </div>
        <div className="mt-6 gk-card gk-card-hover">
          <div className="flex gap-6 text-sm text-[var(--body)]">
            <a href="#links" className="gk-btn">Links</a>
            <a href="#now" className="gk-btn gk-btn-secondary">Now</a>
            <a href="mailto:you@example.com" className="gk-btn">Email</a>
          </div>
        </div>
      </section>

      <main id="links" className="mx-auto max-w-lg px-6 pb-14">
        <div className="vk-kicker text-[var(--mute)]">Index — Personal links</div>
        <div className="mt-4 divide-y divide-[var(--hairline)] border-t border-b border-[var(--hairline)]">
{links.map((l, i) => (
<a key={l.title} href={l.href ?? "/work"} className="group flex items-baseline justify-between gap-4 py-4 transition-colors hover:bg-[var(--canvas-soft)]">
              <span className="flex min-w-0 items-baseline gap-3">
                <span className="vk-idx w-6 shrink-0 text-sm">0{i + 2}</span>
                <span className="vk-display truncate text-lg">{l.title}</span>
              </span>
              <span className="hidden items-center gap-2 text-xs text-[var(--mute)] sm:flex">{l.note} <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
            </a>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-[var(--mute)]">One of {links.length + 1} · Replace with what the number means to you</p>
      </main>

      <section id="now" className="border-t border-[var(--hairline)]">
        <div className="mx-auto max-w-lg px-6 py-12 text-sm leading-7 text-[var(--body)]">
          <h2 className="vk-display flex items-center gap-2 text-xl text-[var(--ink)]"><Coffee className="h-4 w-4 text-[var(--accent)]" /> Now</h2>
          <div className="vk-rule mt-4 max-w-md" />
          <p className="mt-4">Replace with your current projects, habits, and the things you're exploring. This page is for people who want the latest version of you.</p>
          <div className="mt-6 flex flex-wrap gap-6 text-[var(--mute)]">
            <span className="flex items-center gap-1.5"><Music className="h-4 w-4" /> Replace with current obsession</span>
            <span className="flex items-center gap-1.5"><PenLine className="h-4 w-4" /> Writing about…</span>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8">
        <div className="mx-auto flex max-w-lg items-center justify-between px-6 text-xs text-[var(--mute)]">
          <span>© {new Date().getFullYear()} You</span>
          <Link to="/blog" className="flex items-center gap-1.5 hover:text-[var(--ink)]"><Rss className="h-3.5 w-3.5" /> RSS</Link>
        </div>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: restaurant ───────────────────────────────────────────────────
  restaurant: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fdfaf6", soft: "#f6efe6", ink: "#1f1a16", body: "#6b5d4f",
      mute: "#a89a8a", hairline: "#e8dfd3", accent, primary: "#1f1a16", onPrimary: "#fdfaf6",
      font: "\"Georgia\", serif",
    }),
    "src/App.tsx": `import { CalendarDays, Clock, MapPin, Phone } from "lucide-react";

const menu = [
  { name: "To start", items: ["Replace with a dish", "Replace with a dish", "Replace with a dish", "Replace with a dish"] },
  { name: "Mains", items: ["Replace with a dish", "Replace with a dish", "Replace with a dish", "Replace with a dish"] },
  { name: "Dessert", items: ["Replace with a dish", "Replace with a dish"] },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight">${name}</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#menu" className="hover:text-[var(--ink)]">Menu</a>
            <a href="#visit" className="hover:text-[var(--ink)]">Visit</a>
            <a href="#reserve" className="hover:text-[var(--ink)]">Reserve</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene absolute inset-0" style={{ background: "linear-gradient(165deg,#fde8d7,#f7d9c4 45%,#fdfaf6 90%)" }} />
        <div className="vk-grid-faint absolute inset-0" />
        <div className="vk-orb h-72 w-72" style={{ top: "-22%", right: "-10%", background: accent }} />
        <div className="relative mx-auto grid max-w-4xl items-center gap-10 px-6 py-20 sm:py-24 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="text-xs tracking-[0.25em] text-[var(--mute)] uppercase">Replace with cuisine · City</div>
            <h1 className="mt-4 text-4xl font-bold tracking-tight">${name}</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-[var(--body)]">
              Replace with the story of the kitchen: the fires, the produce, the regulars.
            </p>
            <div className="mt-6 gk-card gk-card-hover">
              <div className="text-xs tracking-[0.25em] text-[var(--mute)] uppercase">Replace with cuisine · City</div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight">${name}</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[var(--body)]">
                Replace with the story of the kitchen: the fires, the produce, the regulars.
              </p>
<div className="mt-6 gk-card gk-card-hover gk-card-xl">
              <div className="text-xs tracking-[0.25em] text-[var(--mute)] uppercase">Replace with cuisine · City</div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight">${name}</h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[var(--body)]">
                Replace with the story of the kitchen: the fires, the produce, the regulars.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#reserve" className="gk-btn gk-btn-primary">Book a table</a>
                <a href="#menu" className="gk-btn gk-btn-secondary">See the menu</a>
              </div>
            </div>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-sm">
            <div className="vk-dish relative aspect-square w-full rounded-full" style={{ background: "radial-gradient(circle at 32% 28%, #fff 4%, transparent 5%), radial-gradient(circle at 50% 42%, #fef3c7 0%, #fde68a 38%, #f59e0b 55%, #b45309 78%, #78350f 100%)", boxShadow: "0 30px 60px -25px rgba(120,53,15,.55)" }}>
              <div className="vk-dish absolute inset-[14%]" style={{ borderRadius: "9999px" }} />
              <div className="vk-sweep absolute inset-0 rounded-full opacity-60" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="translate-y-10 text-5xl drop-shadow-lg">🍋</span>
              </div>
            </div>
            <div className="vk-glass vk-tilt vk-float absolute -right-4 top-6 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-xs shadow-lg">
              <span className="font-semibold">Chef's tasting</span> <span className="text-[var(--mute)]">· $--</span>
            </div>
            <div className="vk-glass vk-tilt vk-float-slow absolute -left-5 bottom-8 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-xs shadow-lg">
              <span className="text-[var(--mute)]">Reserve a seat →</span>
            </div>
          </div>
        </div>
      </section>

      <section id="visit" className="border-y border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6 text-sm text-[var(--body)] sm:flex-row sm:justify-between">
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Tue–Sun · 5pm–11pm</span>
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Replace with the address</span>
          <span className="flex items-center gap-2"><Phone className="h-4 w-4" /> (555) 000-0000</span>
        </div>
      </section>

      <section id="menu" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight">The menu</h2>
        <div className="mt-8 grid gap-10 md:grid-cols-3">
          {menu.map((section, si) => (
            <div key={section.name} className="gk-card-flat gk-card-xl overflow-hidden">
              <div className="vk-photo relative h-24" style={{ background: ["linear-gradient(140deg,#fde68a,#d97706)", "linear-gradient(140deg,#fca5a5,#b91c1c)", "linear-gradient(140deg,#fbcfe8,#be185d)"][si % 3] }}>
                <div className="vk-photo-sheen" />
                <div className="vk-grid-faint absolute inset-0" />
                <span className="absolute bottom-2.5 left-3.5 text-xs font-semibold tracking-[0.2em] text-white uppercase">{section.name}</span>
              </div>
              <div className="space-y-3.5 p-5">
                {section.items.map((item) => (
                  <div key={item} className="flex items-baseline justify-between gap-3 border-b border-dotted border-[var(--hairline)] pb-1.5">
                    <span className="text-sm">{item}</span>
                    <span className="text-xs text-[var(--mute)]">$$</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="reserve" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Reservations</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with booking policy: party size, notice window, walk-ins.</p>
          <form className="mt-6 grid grid-cols-2 gap-2 text-left" onSubmit={(e) => e.preventDefault()}>
            <input type="date" className="gk-input" />
            <input type="time" defaultValue="19:00" className="gk-input" />
            <input type="number" placeholder="Guests" min={1} className="gk-input" />
            <input type="text" placeholder="Name" className="gk-input" />
            <button className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">
              <CalendarDays className="h-4 w-4" /> Request a table
            </button>
          </form>
        </div>
      </section>

      <footer className="py-10 text-center text-xs text-[var(--mute)]">
        Replace with hours, address, and social handles.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: hotel ────────────────────────────────────────────────────────
  hotel: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fbfaf7", soft: "#f2f0ea", ink: "#23211c", body: "#6b665c",
      mute: "#a9a397", hairline: "#e5e1d6", accent, primary: "#23211c", onPrimary: "#fbfaf7",
      skin: "luxe",
    }),
    "src/App.tsx": `import { BedDouble, CalendarCheck, MapPin, Sparkles, Wifi } from "lucide-react";

const rooms = [
  { name: "Replace with a room type", note: "View, size, and what makes it special.", price: "$---" },
  { name: "Replace with a room type", note: "View, size, and what makes it special.", price: "$---" },
  { name: "Replace with a room type", note: "View, size, and what makes it special.", price: "$---" },
];

const amenities = [
  { icon: Wifi, label: "Replace with amenity" },
  { icon: BedDouble, label: "Replace with amenity" },
  { icon: Sparkles, label: "Replace with amenity" },
  { icon: CalendarCheck, label: "Replace with amenity" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="vk-cap text-sm">${name}</span>
          <nav className="flex items-center gap-8 text-xs text-[var(--body)] uppercase tracking-[0.2em]">
            <a href="#rooms" className="hover:text-[var(--ink)]">Rooms</a>
            <a href="#amenities" className="hover:text-[var(--ink)]">Amenities</a>
            <a href="#stay" className="hover:text-[var(--ink)]">Stay</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden text-center">
        <div className="vk-scene absolute inset-0" style={{ background: "linear-gradient(175deg,#efe9dc,#e4dbc9 55%,#fbfaf7 92%)" }} />
        <div className="vk-orb h-80 w-80" style={{ top: "-30%", left: "50%", transform: "translateX(-50%)", background: "color-mix(in srgb, var(--accent) 55%, transparent)" }} />
        <div className="relative mx-auto max-w-3xl px-6 py-28">
          <div className="vk-thin-rule mx-auto max-w-xs" />
          <div className="vk-cap mt-6 text-[var(--mute)]">Since MCMXX · Replace with city</div>
          <h1 className="vk-display mt-4 text-5xl font-bold sm:text-6xl">${name}</h1>
          <div className="vk-thin-rule mx-auto mt-7 max-w-xs" />
          <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-[var(--body)]">
            Replace with the pitch: where you are, what the stay feels like, and who it's for.
          </p>
          <div className="mt-9 flex justify-center gap-4">
            <a href="#stay" className="rounded-none border border-[var(--ink)] bg-[var(--ink)] px-7 py-3 text-xs font-medium tracking-[0.18em] text-[var(--on-primary)] uppercase hover:opacity-85">Check availability</a>
            <a href="#rooms" className="rounded-none border border-[var(--ink)]/30 px-7 py-3 text-xs tracking-[0.18em] text-[var(--body)] uppercase hover:text-[var(--ink)]">View rooms</a>
          </div>
          <div className="mt-12 flex items-center justify-center gap-8 text-[11px] tracking-[0.2em] text-[var(--mute)] uppercase">
            <span>✦ 4-star boutique</span>
            <span>✦ Replace with a seascape</span>
            <span>✦ Est. MCMXX</span>
          </div>
        </div>
      </section>

      <section id="rooms" className="mx-auto max-w-4xl px-6 py-20">
        <div className="flex items-baseline justify-between">
          <h2 className="vk-display text-3xl">Rooms & suites</h2>
          <span className="vk-cap text-[var(--mute)]">01 — Accommodation</span>
        </div>
        <div className="vk-thin-rule mt-4" />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {rooms.map((r, i) => (
            <div key={r.name} className="group">
              <div className="vk-photo relative flex aspect-[16/10] items-end justify-center overflow-hidden" style={{ background: ["linear-gradient(140deg,#d6c9ae,#a08d6e)", "linear-gradient(140deg,#c3d0cf,#7d8f8c)", "linear-gradient(140deg,#dfd3c0,#b3a283)"][i % 3] }}>
                <div className="vk-photo-sheen" />
                <span className="mb-3 text-4xl drop-shadow-md">🛏️</span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="vk-display text-lg">{r.name}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--mute)]">{r.note}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{r.price}</div>
                  <div className="text-[10px] text-[var(--mute)]">/night</div>
                </div>
              </div>
              <div className="mt-3 border-t border-[var(--hairline)] pt-3 text-xs tracking-[0.15em] text-[var(--body)] uppercase"><a href="#stay" className="group-hover:text-[var(--accent)]">Reserve →</a></div>
            </div>
          ))}
        </div>
      </section>

      <section id="amenities" className="border-y border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="flex items-baseline justify-between">
            <h2 className="vk-display text-3xl">Amenities</h2>
            <span className="vk-cap text-[var(--mute)]">02 — At your service</span>
          </div>
          <div className="vk-thin-rule mt-4" />
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
            {amenities.map((a, i) => (
              <div key={a.label} className="text-center">
                <span className="vk-idx text-xs">0{i + 1}</span>
                <a.icon className="mx-auto mt-3 h-6 w-6 text-[var(--accent)]" />
                <div className="mt-2 text-xs tracking-[0.14em] text-[var(--body)] uppercase">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="stay" className="mx-auto max-w-2xl px-6 py-20 text-center">
        <span className="vk-cap text-[var(--mute)]">03 — Reservations</span>
        <h2 className="vk-display mt-3 text-3xl">Plan your stay</h2>
        <p className="mt-3 text-sm text-[var(--body)]">Replace with check-in/check-out times, breakfast, and cancellation policy.</p>
        <form className="mt-8 grid grid-cols-2 gap-3 text-left" onSubmit={(e) => e.preventDefault()}>
          <input type="date" className="rounded-none border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
          <input type="date" className="rounded-none border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
          <input type="number" placeholder="Guests" min={1} className="rounded-none border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
          <button className="rounded-none bg-[var(--primary)] py-3 text-xs font-medium tracking-[0.18em] text-[var(--on-primary)] uppercase hover:opacity-85">Check availability</button>
        </form>
      </section>

      <footer className="border-t border-[var(--hairline)] py-10 text-center">
        <div className="vk-cap mb-3 text-[var(--mute)]">${name}</div>
        <div className="text-xs text-[var(--body)]">Replace with address, phone, and booking links.</div>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: event ────────────────────────────────────────────────────────
  event: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0d0f1a", soft: "#161a2e", ink: "#f4f4f8", body: "#a6abbf",
      mute: "#6b7089", hairline: "#252a45", accent, primary: accent, onPrimary: "#0d0f1a",
    }),
    "src/App.tsx": `import { CalendarDays, MapPin, Ticket } from "lucide-react";

const agenda = [
  { time: "09:00", title: "Replace with a session", speaker: "Replace with a speaker" },
  { time: "10:30", title: "Replace with a session", speaker: "Replace with a speaker" },
  { time: "12:00", title: "Lunch", speaker: "—" },
  { time: "13:30", title: "Replace with a session", speaker: "Replace with a speaker" },
  { time: "15:30", title: "Replace with a session", speaker: "Replace with a speaker" },
  { time: "17:00", title: "Networking drinks", speaker: "All attendees" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Event Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#agenda" className="hover:text-[var(--ink)]">Agenda</a>
            <a href="#venue" className="hover:text-[var(--ink)]">Venue</a>
            <a href="#tickets" className="hover:text-[var(--ink)]">Tickets</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene vk-grid-faint absolute inset-0" style={{ background: "linear-gradient(180deg,#131736,#0d0f1a 65%)" }} />
        <div className="vk-spot absolute -top-4 left-[18%] h-[420px] w-[260px] opacity-70" />
        <div className="vk-spot absolute -top-4 right-[18%] h-[420px] w-[260px] opacity-70" />
        <div className="vk-spot absolute -top-4 left-1/2 h-[420px] w-[300px] -translate-x-1/2 opacity-50" />
        <div className="vk-orb h-72 w-72" style={{ bottom: "-30%", left: "50%", transform: "translateX(-50%)", background: accent }} />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <div className="text-xs tracking-[0.25em] text-[var(--mute)] uppercase">Replace with date · City</div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">${name}</h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--body)]">
            Replace with what attendees get: the theme, the crowd, the one thing they'll leave with.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="#tickets" className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85"><Ticket className="h-4 w-4" /> Get tickets</a>
            <a href="#agenda" className="gk-btn gk-btn-secondary">See the agenda</a>
          </div>
          <div className="vk-glass vk-tilt vk-float mx-auto mt-12 flex max-w-sm items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-left backdrop-blur">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[var(--mute)] uppercase">Countdown</div>
              <div className="mt-1 font-mono text-2xl font-bold tracking-tight">03 : 14 : 09 : 27</div>
              <div className="mt-0.5 text-[10px] text-[var(--mute)]">days · hours · min · sec</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: \`color-mix(in srgb, var(--accent) 18%, transparent)\` }}>
              <CalendarDays className="h-5 w-5" style={{ color: accent }} />
            </div>
          </div>
        </div>
      </section>

      <section id="Agenda" className="mx-auto max-w-2xl px-6 py-16">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Agenda</h2>
        <div className="mt-6 gk-card gk-card-hover gk-card-flat p-4">
              <span className="w-12 shrink-0 text-sm font-semibold text-[var(--accent)]">{s.time}</span>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <div className="mt-0.5 text-xs text-[var(--mute)]">{s.speaker}</div>
              </div>
            </div>
      </section>

      <section id="venue" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Venue</h2>
          <div className="mt-4 flex items-start gap-3 text-sm text-[var(--body)]">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
            <p className="leading-6">Replace with the venue name, address, and travel tips.</p>
          </div>
        </div>
      </section>

      <section id="tickets" className="border-t border-[var(--hairline)]">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Tickets</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { name: "General", price: "$---" },
              { name: "Pro", price: "$---", featured: true },
              { name: "Team", price: "$---" },
            ].map((t) => (
              <div key={t.name} className={\`rounded-lg border p-6 \${t.featured ? "border-[var(--accent)] bg-[var(--canvas-soft)]" : "border-[var(--hairline)]"}\`}>
                <div className="text-sm text-[var(--body)]">{t.name}</div>
                <div className="mt-2 text-3xl font-bold">{t.price}</div>
                <p className="mt-2 text-xs text-[var(--mute)]">Replace with what's included</p>
                <button className={\`mt-4 w-full rounded-md py-2 text-sm font-medium \${t.featured ? "bg-[var(--primary)] text-[var(--on-primary)]" : "border border-[var(--hairline)] text-[var(--body)] hover:text-[var(--ink)]"}\`}>
                  <CalendarDays className="mr-1 inline h-4 w-4" /> Register
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with contact, code of conduct, and hashtag.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: education ────────────────────────────────────────────────────
  education: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fffdf7", soft: "#f7f3e8", ink: "#2b2416", body: "#64583f",
      mute: "#a99d80", hairline: "#e8e0cc", accent, primary: "#2b2416", onPrimary: "#fffdf7",
      skin: "paper",
    }),
    "src/App.tsx": `import { ArrowRight, BookOpen, GraduationCap, PenLine } from "lucide-react";

const programs = [
  { title: "Replace with a program", level: "Beginner", note: "Replace with what students learn." },
  { title: "Replace with a program", level: "Intermediate", note: "Replace with what students learn." },
  { title: "Replace with a program", level: "Advanced", note: "Replace with what students learn." },
  { title: "Replace with a program", level: "Beginner", note: "Replace with what students learn." },
  { title: "Replace with a program", level: "Intermediate", note: "Replace with what students learn." },
  { title: "Replace with a program", level: "Advanced", note: "Replace with what students learn." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-bold"><GraduationCap className="h-4 w-4 text-[var(--accent)]" /> School Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#programs" className="hover:text-[var(--ink)]">Programs</a>
            <a href="#why" className="hover:text-[var(--ink)]">Why us</a>
            <a href="#admissions" className="hover:text-[var(--ink)]">Admissions</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight">${name}</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--body)]">
          Replace with the school's promise: what students become, how they get there, and why this place fits.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="#admissions" className="gk-btn gk-btn-primary">Apply now</a>
          <a href="#programs" className="gk-btn gk-btn-secondary">Explore programs</a>
        </div>
        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-3 gap-4">
          {[
            { e: "📚", t: "Replace with a stat", s: "Students" },
            { e: "🎓", t: "Replace with a stat", s: "Graduation" },
            { e: "🏅", t: "Replace with a stat", s: "Placement" },
          ].map((x) => (
            <div key={x.s} className="vk-paper bg-[var(--canvas)]/80 p-5">
              <div className="text-2xl">{x.e}</div>
              <div className="mt-2 text-lg font-bold">{x.t}</div>
              <div className="text-xs text-[var(--mute)]">{x.s}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="programs" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <div className="flex items-center gap-4">
            <span className="vk-doodle text-3xl rotate-[-8deg]">🎨</span>
            <div>
              <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Programs</h2>
              <p className="text-xs text-[var(--mute)]">Curated paths · Real teachers · Learn by doing</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <div className="mt-6 gk-card gk-card-hover gk-card-flat p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{p.title}</h3>
                <span className="rounded-full bg-[var(--canvas-soft)] px-2.5 py-0.5 text-xs text-[var(--body)]">{p.level}</span>
              </div>
              <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{p.note}</p>
            </div>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Why students choose us</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Replace with a stat", note: "Replace with meaning" },
            { label: "Replace with a stat", note: "Replace with meaning" },
            { label: "Replace with a stat", note: "Replace with meaning" },
            { label: "Replace with a stat", note: "Replace with meaning" },
          ].map((s, i) => (
            <div key={s.label} className="vk-paper bg-[var(--canvas)] p-5 text-center">
              <div className="vk-doodle text-sm">{["✦", "☘", "✧", "☼"][i]}</div>
              <div className="mt-1 text-2xl font-bold text-[var(--accent)]">{s.label}</div>
              <div className="mt-1 text-xs text-[var(--mute)]">{s.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="admissions" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="vk-paper bg-[var(--canvas)] p-8">
            <h2 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight"><PenLine className="h-5 w-5 text-[var(--accent)]" /> Admissions</h2>
            <p className="mt-2 text-sm text-[var(--body)]">Replace with the process: deadlines, requirements, scholarships.</p>
            <a href="mailto:admissions@school.com" className="mt-6 gk-btn gk-btn-primary">admissions@school.com <ArrowRight className="h-4 w-4" /></a>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with address, hours, and contact details.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: healthcare ───────────────────────────────────────────────────
  healthcare: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f7fbfa", soft: "#e8f4f1", ink: "#0b2a24", body: "#3c635c",
      mute: "#86a8a1", hairline: "#d7ebe6", accent, primary: "#0b2a24", onPrimary: "#f7fbfa",
      skin: "glass",
    }),
    "src/App.tsx": `import { Activity, CalendarCheck, HeartPulse, ShieldCheck, Stethoscope } from "lucide-react";

const services = [
  { icon: HeartPulse, title: "Replace with a service", note: "Replace with what it covers." },
  { icon: Stethoscope, title: "Replace with a service", note: "Replace with what it covers." },
  { icon: Activity, title: "Replace with a service", note: "Replace with what it covers." },
  { icon: ShieldCheck, title: "Replace with a service", note: "Replace with what it covers." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Clinic Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#services" className="hover:text-[var(--ink)]">Services</a>
            <a href="#team" className="hover:text-[var(--ink)]">Team</a>
            <a href="#appointment" className="hover:text-[var(--ink)]">Appointments</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene absolute inset-0" style={{ background: "linear-gradient(170deg,#e6f4f0,#f7fbfa 55%,#f7fbfa)" }} />
        <div className="vk-orb h-72 w-72" style={{ top: "-28%", right: "-8%", background: "color-mix(in srgb, var(--accent) 45%, transparent)" }} />
        <div className="vk-orb h-64 w-64" style={{ bottom: "-34%", left: "-10%", background: "color-mix(in srgb, var(--accent) 30%, transparent)" }} />
        <div className="relative mx-auto grid max-w-4xl items-center gap-10 px-6 py-20 md:grid-cols-[1.05fr_1fr]">
          <div>
            <div className="inline-gk-badge"><HeartPulse className="h-3.5 w-3.5 text-[var(--accent)]" /> Care that starts with listening</div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight">${name}</h1>
            <p className="mt-3 max-w-md text-base leading-7 text-[var(--body)]">
              Replace with the practice's focus: who's cared for, how, and what a first visit looks like.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#appointment" className="gk-btn gk-btn-primary">Book an appointment</a>
              <a href="#services" className="gk-btn gk-btn-secondary">Our services</a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-[var(--body)]">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[var(--accent)]" /> Insured & walk-in friendly</span>
              <span className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-[var(--accent)]" /> 24h response line</span>
            </div>
          </div>
          <div className="relative">
            <div className="vk-glass-panel relative overflow-hidden rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)" }}>
                  <Stethoscope className="h-5 w-5" style={{ color: accent }} />
                </div>
                <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>Open today</span>
              </div>
              <div className="mt-5 text-2xl font-bold">Next appointment</div>
              <div className="mt-1 text-sm text-[var(--body)]">Today · Replace with available times</div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {["09:30", "11:15", "13:00", "16:45"].map((t, i) => (
                  <div key={t} className="rounded-xl border border-[var(--hairline)] bg-[var(--canvas)]/60 px-3 py-2 text-center text-xs font-medium" style={i === 0 ? { borderColor: "color-mix(in srgb, var(--accent) 45%, transparent)", color: accent } : undefined}>{t}</div>
                ))}
              </div>
            </div>
            <div className="vk-glass vk-float absolute -top-5 -right-3 rounded-xl border border-white/50 bg-white/70 px-3 py-2 text-xs shadow-lg">
              <span className="font-semibold">⭐ 4.9</span> <span className="text-[var(--mute)]">from 800+ patients</span>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Services</h2>
          <div className="mt-6 gk-card gk-card-hover gk-card-xl p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
                  <s.icon className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{s.note}</p>
              </div>
          </div>
        </div>
      </section>

      <section id="team" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Meet the team</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {["Replace with a name", "Replace with a name", "Replace with a name"].map((n, i) => (
            <div key={n} className="gk-card-flat gk-card-xl p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}>{["🧑‍⚕️", "👩‍⚕️", "🧑‍⚕️"][i]}</div>
              <div className="mt-3 text-sm font-semibold">{n}</div>
              <div className="mt-0.5 text-xs text-[var(--mute)]">Replace with specialty</div>
            </div>
          ))}
        </div>
      </section>

      <section id="appointment" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Appointments</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with how to book: phone, portal, or walk-in hours.</p>
          <form className="mt-6 grid grid-cols-2 gap-2 text-left" onSubmit={(e) => e.preventDefault()}>
            <input type="date" className="gk-input" />
            <select className="gk-input">
              <option>Replace with provider</option>
            </select>
            <input type="text" placeholder="Name" className="gk-input" />
            <input type="tel" placeholder="Phone" className="gk-input" />
            <button className="col-span-2 mt-1 flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">
              <CalendarCheck className="h-4 w-4" /> Request appointment
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with hours, address, and insurance information.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Websites: real-estate ──────────────────────────────────────────────────
  "real-estate": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fafaf9", soft: "#f0f1f0", ink: "#131313", body: "#4c4c4c",
      mute: "#9d9d9d", hairline: "#e3e3e1", accent, primary: "#131313", onPrimary: "#fafaf9",
      skin: "bento",
    }),
    "src/App.tsx": `import { BedDouble, Bath, MapPin, Ruler } from "lucide-react";
import { Link } from "react-router-dom";

const listings = [
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
  { title: "Replace with a listing", note: "Neighborhood, size, standout features.", price: "$---" },
];

const LISTING_PHOTOS = [
  "linear-gradient(140deg,#d9cbb2,#8f7d63)",
  "linear-gradient(140deg,#bcd2cf,#5f7f7b)",
  "linear-gradient(140deg,#e3d3c0,#a08a6f)",
  "linear-gradient(140deg,#c3cede,#6e7f9e)",
  "linear-gradient(140deg,#e0d0c8,#9a7366)",
  "linear-gradient(140deg,#cfe0d0,#6f9476)",
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Agency Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#listings" className="hover:text-[var(--ink)]">Listings</a>
            <a href="#agents" className="hover:text-[var(--ink)]">Agents</a>
            <a href="#contact" className="hover:text-[var(--ink)]">Contact</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="vk-scene absolute inset-0" style={{ background: "linear-gradient(180deg,#efece6,#fafaf9 80%)" }} />
        <div className="vk-grid absolute inset-0 opacity-50" />
        <div className="relative grid gap-8 px-6 py-16 lg:grid-cols-[1fr_1.2fr] lg:items-center lg:py-20">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <span className="gk-badge">Replace with your market · Est. year</span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">${name}</h1>
            <p className="mt-4 text-base leading-7 text-[var(--body)]">
              Replace with the market you cover and the promise you make to buyers and sellers.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#listings" className="gk-btn gk-btn-primary">Browse listings</a>
              <a href="#agents" className="gk-btn gk-btn-secondary">Meet the agents</a>
            </div>
            <div className="mt-8 flex gap-8">
              {[
                { l: "Sold", v: "Replace with a stat" },
                { l: "Avg. days on market", v: "Replace with a stat" },
                { l: "Coverage", v: "Replace with an area" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="text-xl font-bold text-[var(--accent)]">{s.v}</div>
                  <div className="text-xs text-[var(--mute)]">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[{ t: "Featured property", s: "Replace with street + price", i: 0, big: true }, { t: "New to market", s: "Replace with street + price", i: 1, big: false }, { t: "Open house this weekend", s: "Replace with street + time", i: 2, big: false }, { t: "Sold recently", s: "Replace with street + price", i: 3, big: false }].map((c) => (
              <div key={c.t} className={\`vk-bento vk-photo relative overflow-hidden p-5 \${c.big ? "col-span-2 row-span-2 min-h-64" : "min-h-36"}\`} style={{ background: LISTING_PHOTOS[c.i] }}>
                <div className="vk-photo-sheen" />
                <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,.55))" }} />
                <span className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#131313]">{c.t}</span>
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-sm font-semibold">{c.s}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-white/80">
                    <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> --</span>
                    <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> --</span>
                    <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> -- ft²</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="listings" className="mx-auto max-w-5xl px-6 py-16">
        <div className="flex items-center justify-between">
<h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Featured listings</h2>
          <Link to="/work" className="flex items-center gap-1 text-sm text-[var(--accent)]">View all <span>→</span></Link>
        </div>
        <div className="mt-6 gk-card gk-card-hover gk-card-xl">
          {listings.map((l, i) => (
            <div key={l.title} className="p-4 border-b border-[var(--hairline)]">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold">{l.title}</h3>
                <span className="text-xs text-[var(--mute)]">{l.note}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--body)]">
                <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> --</span>
                <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> --</span>
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> District</span>
              </div>
              <div className="mt-2 text-sm font-medium text-[var(--accent)]">{l.price}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="agents" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Our agents</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {["Replace with a name", "Replace with a name", "Replace with a name"].map((n, i) => (
              <div key={n} className="vk-bento bg-[var(--canvas)] p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)" }}>{["🧑‍💼", "👩‍💼", "🧑‍💼"][i]}</div>
                <div className="mt-3 text-sm font-semibold">{n}</div>
                <div className="mt-0.5 text-xs text-[var(--mute)]">Replace with specialty</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="contact" className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with office address, phone, and listing portal links.
      </footer>
    </div>
  );
}
`,
  }),

// ─── Websites: finance ──────────────────────────────────────────────────────
  finance: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0b1220", soft: "#101a2e", ink: "#f3f6fb", body: "#93a1b8",
      mute: "#5f6d8a", hairline: "#1f2a42", accent, primary: accent, onPrimary: "#0b1220",
      skin: "neon",
    }),
    "src/App.tsx": `import { ArrowDownRight, ArrowUpRight, CreditCard, Landmark, Lock, TrendingUp } from "lucide-react";

const accounts = [
  { name: "Replace with an account", balance: "$---", note: "Replace with a note" },
  { name: "Replace with an account", balance: "$---", note: "Replace with a note" },
  { name: "Replace with an account", balance: "$---", note: "Replace with a note" },
];

const rates = [
  { label: "Replace with a product", rate: "Replace with a %" },
  { label: "Replace with a product", rate: "Replace with a %" },
  { label: "Replace with a product", rate: "Replace with a %" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-bold"><Landmark className="h-4 w-4 text-[var(--accent)]" /> Bank Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#accounts" className="hover:text-[var(--ink)]">Accounts</a>
            <a href="#rates" className="hover:text-[var(--ink)]">Rates</a>
            <a href="#open" className="hover:text-[var(--ink)]">Open account</a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden text-center">
        <div className="vk-scene vk-grid-faint absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 55% at 50% 0%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, var(--canvas) 62%)" }} />
        <div className="vk-spot absolute -top-6 left-[14%] h-[380px] w-[240px] opacity-60" />
        <div className="vk-spot absolute -top-6 right-[14%] h-[380px] w-[240px] opacity-60" />
        <div className="vk-orb h-80 w-80" style={{ bottom: "-40%", left: "50%", transform: "translateX(-50%)", background: accent }} />
        <div className="relative mx-auto max-w-4xl px-6 py-24">
          <div className="mx-auto gk-badge w-fit backdrop-blur">
            <Lock className="h-3.5 w-3.5 text-[var(--accent)]" /> FDIC insured · Replace with regulator
          </div>
          <h1 className="vk-neon mx-auto mt-6 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">${name}</h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--body)]">
            Replace with the pitch: who the bank serves, the products that matter, and why it's a better home for money.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <a href="#open" className="rounded-md bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Open an account</a>
            <a href="#rates" className="gk-btn gk-btn-secondary">See rates</a>
          </div>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-8 items-end gap-2">
            {[28, 46, 38, 62, 54, 78, 66, 92].map((h, i) => (
              <div key={i} className="vk-chartbar" style={{ height: \`\${h}px\` }} />
            ))}
          </div>
          <div className="mt-3 text-[10px] tracking-[.2em] text-[var(--mute)] uppercase">Replace with a growth chart label</div>
        </div>
      </section>

      <section id="accounts" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Highlighted products</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {accounts.map((a) => (
              <div className="mt-6 gk-card gk-card-hover gk-card-flat p-5">
                <CreditCard className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="mt-3 text-base font-semibold">{a.name}</h3>
                <div className="mt-2 text-2xl font-bold">{a.balance}</div>
                <p className="mt-1 text-xs text-[var(--mute)]">{a.note}</p>
                <div className="mt-2 gk-progress w-full" style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="rates" className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-end justify-between">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Rates & offers</h2>
          <div className="flex items-center gap-2 text-[11px] text-[var(--mute)]">
            <span className="vk-dot h-1.5 w-1.5" style={{ background: "var(--success)" }} /> Live rates
          </div>
        </div>
        <div className="mt-6 gk-card-flat overflow-hidden">
          {rates.map((r, i) => (
            <div key={r.label} className={\`group flex items-center justify-between px-5 py-4 text-sm transition-colors hover:bg-[var(--canvas-soft)] \${i > 0 ? "border-t border-[var(--hairline)]" : ""}\`}>
              <span className="text-[var(--body)]">{r.label}</span>
              <span className="font-mono font-semibold text-[var(--accent)]">{r.rate}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="open" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <div className="flex items-center justify-center gap-4 text-[var(--mute)]">
            <span className="flex items-center gap-1.5 text-xs"><ArrowUpRight className="h-4 w-4 text-[var(--success)]" /> Earn more</span>
            <span className="flex items-center gap-1.5 text-xs"><ArrowDownRight className="h-4 w-4 text-[var(--error)]" /> Pay less</span>
            <span className="flex items-center gap-1.5 text-xs"><TrendingUp className="h-4 w-4 text-[var(--accent)]" /> Grow</span>
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">Open an account in minutes</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with the application steps and requirements.</p>
          <button className="mt-6 rounded-md bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Get started</button>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with legal name, routing number, and support contact.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Webapps: saas ──────────────────────────────────────────────────────────
  saas: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f7f9fc", soft: "#eef2f8", ink: "#14213d", body: "#4c5b78",
      mute: "#96a3b8", hairline: "#dde5ef", accent, primary: accent, onPrimary: "#ffffff",
      skin: "bento",
    }),
    "src/App.tsx": `import { BarChart3, Check, CreditCard, LayoutGrid, Users } from "lucide-react";
import { useState } from "react";

const apps = [
  { icon: LayoutGrid, title: "Replace with a module", note: "Replace with what it helps teams do." },
  { icon: Users, title: "Replace with a module", note: "Replace with what it helps teams do." },
  { icon: BarChart3, title: "Replace with a module", note: "Replace with what it helps teams do." },
];

export default function App() {
  const [tab, setTab] = useState("monthly");
  const price = tab === "monthly" ? "$19" : "$15";
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="text-sm font-bold">Product Name</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#modules" className="hover:text-[var(--ink)]">Platform</a>
            <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
            <a href="#cta" className="hover:text-[var(--ink)]">Sign up</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight">${name}</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--body)]">
          Replace with the value proposition: the workflow you replace, the outcome teams measure.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <a href="#cta" className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Start free trial</a>
          <a href="#modules" className="gk-btn gk-btn-secondary">View platform</a>
        </div>
      </section>

      <section id="modules" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Platform</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {apps.map((m) => (
              <div key={m.title} className="gk-card p-5">
                <m.icon className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="mt-3 text-base font-semibold">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{m.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Pricing</h2>
        <div className="mt-6 flex justify-center gap-2 rounded-full border border-[var(--hairline)] p-1 text-sm w-fit mx-auto">
          <button onClick={() => setTab("monthly")} className={\`rounded-full px-4 py-1.5 \${tab === "monthly" ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--body)]"}\`}>Monthly</button>
          <button onClick={() => setTab("annual")} className={\`rounded-full px-4 py-1.5 \${tab === "annual" ? "bg-[var(--ink)] text-[var(--canvas)]" : "text-[var(--body)]"}\`}>Annual · save 20%</button>
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl gap-4 md:grid-cols-3">
          {[
            { name: "Starter", note: "Replace with what's included" },
            { name: "Growth", note: "Replace with what's included", featured: true },
            { name: "Scale", note: "Replace with what's included" },
          ].map((p) => (
            <div key={p.name} className={\`rounded-lg border p-6 \${p.featured ? "border-[var(--accent)] bg-[var(--canvas-soft)]" : "border-[var(--hairline)]"}\`}>
              <div className="text-sm text-[var(--body)]">{p.name}</div>
              <div className="mt-2 text-3xl font-bold">{price}<span className="text-sm font-normal text-[var(--mute)]">/mo</span></div>
              <p className="mt-3 text-sm text-[var(--body)]">{p.note}</p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--body)]">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--accent)]" /> Replace with a feature</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--accent)]" /> Replace with a feature</li>
              </ul>
              <button className={\`mt-5 flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium \${p.featured ? "bg-[var(--primary)] text-[var(--on-primary)]" : "border border-[var(--hairline)] text-[var(--body)] hover:text-[var(--ink)]"}\`}><CreditCard className="h-4 w-4" /> Choose {p.name}</button>
            </div>
          ))}
        </div>
      </section>

      <section id="cta" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Ready when you are</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with trial terms, onboarding, and migration help.</p>
          <button className="mt-6 rounded-md bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Start free</button>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with legal links and support channels.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Webapps: crm ───────────────────────────────────────────────────────────
crm: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f8fafc", soft: "#eef2f6", ink: "#0f172a", body: "#475569",
      mute: "#94a3b8", hairline: "#e2e8f0", accent, primary: accent, onPrimary: "#ffffff",
      skin: "glass",
    }),
    "src/App.tsx": `import { Phone, User, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

const board = [
  { stage: "New", deals: ["Replace with a deal", "Replace with a deal"], value: "$---" },
  { stage: "Qualified", deals: ["Replace with a deal", "Replace with a deal", "Replace with a deal"], value: "$---" },
  { stage: "Proposal", deals: ["Replace with a deal"], value: "$---" },
  { stage: "Won", deals: ["Replace with a deal", "Replace with a deal"], value: "$---" },
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-52 shrink-0 border-r border-[var(--hairline)] p-4 md:block">
        <div className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-[var(--accent)]" /> ${name}</div>
        <nav className="mt-6 space-y-1 text-sm text-[var(--body)]">
          {[
            { label: "Dashboard", to: "/" },
            { label: "Pipeline", to: "/projects" },
            { label: "Contacts", to: "/team" },
            { label: "Activities", to: "/analytics" },
            { label: "Reports", to: "/analytics" },
          ].map((i) => (
            <Link key={i.label} to={i.to} className={\`block rounded-md px-3 py-2 \${i.label === "Pipeline" ? "bg-[var(--canvas-soft)] font-medium text-[var(--ink)]" : "hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"}\`}>{i.label}</Link>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
          <div>
            <h1 className="text-lg font-bold">Pipeline</h1>
            <p className="text-xs text-[var(--mute)]">Replace with the current quarter summary</p>
          </div>
          <div className="flex items-center gap-3 text-sm text-[var(--body)]">
            <span className="flex items-center gap-1.5"><Wallet className="h-4 w-4 text-[var(--accent)]" /> $---</span>
            <button className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">+ New deal</button>
          </div>
        </header>

        <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-4">
          {board.map((c) => (
            <div key={c.stage} className="gk-card-soft p-3">
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-[var(--mute)]">
                <span>{c.stage}</span>
                <span>{c.value}</span>
              </div>
              <div className="mt-2 space-y-2">
                {c.deals.map((d) => (
                  <div key={d} className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-3">
                    <div className="text-sm font-medium">{d}</div>
                    <div className="mt-1 text-xs text-[var(--mute)]">Replace with contact</div>
                    <div className="mt-2 flex items-center gap-2 text-[var(--mute)]">
                      <User className="h-3.5 w-3.5" />
                      <Phone className="h-3.5 w-3.5" />
                      <span className="ml-auto text-xs">$---</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: erp ───────────────────────────────────────────────────────────
erp: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#101418", soft: "#181d23", ink: "#e8edf2", body: "#97a1ad",
      mute: "#5b6672", hairline: "#242b33", accent, primary: accent, onPrimary: "#101418",
      skin: "terminal",
    }),
    "src/App.tsx": `import { Boxes, Factory, Package, Truck } from "lucide-react";

const stats = [
  { icon: Boxes, label: "Replace with a stat", value: "---" },
  { icon: Factory, label: "Replace with a stat", value: "---" },
  { icon: Package, label: "Replace with a stat", value: "---" },
  { icon: Truck, label: "Replace with a stat", value: "---" },
];

const orders = [
  { id: "#0001", product: "Replace with an item", qty: "---", supplier: "Replace with a supplier", status: "Pending" },
  { id: "#0002", product: "Replace with an item", qty: "---", supplier: "Replace with a supplier", status: "In transit" },
  { id: "#0003", product: "Replace with an item", qty: "---", supplier: "Replace with a supplier", status: "Received" },
  { id: "#0004", product: "Replace with an item", qty: "---", supplier: "Replace with a supplier", status: "Pending" },
  { id: "#0005", product: "Replace with an item", qty: "---", supplier: "Replace with a supplier", status: "In transit" },
];

const statusTone: Record<string, string> = {
  Pending: "bg-[#fff7e6] text-[#b26a00]",
  "In transit": "bg-[#e7f0ff] text-[#1d4ed8]",
  Received: "bg-[#e8f7ee] text-[#15803d]",
};

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold"><Factory className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <nav className="hidden items-center gap-6 text-sm text-[var(--body)] md:flex">
            <a href="#overview" className="hover:text-[var(--ink)]">Overview</a>
            <a href="#purchase-orders" className="hover:text-[var(--ink)]">Purchase orders</a>
            <a href="#inventory" className="hover:text-[var(--ink)]">Inventory</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section id="overview">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Operations overview</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="gk-card-flat p-5">
                <s.icon className="h-5 w-5 text-[var(--accent)]" />
                <div className="mt-3 text-2xl font-bold">{s.value}</div>
                <div className="mt-0.5 text-xs text-[var(--mute)]">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="purchase-orders" className="mt-10">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Purchase orders</h2>
          <div className="mt-4 gk-card-flat overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-[var(--canvas-soft)] text-xs text-[var(--mute)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Supplier</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-[var(--hairline)]">
                    <td className="px-4 py-3 font-medium">{o.id}</td>
                    <td className="px-4 py-3 text-[var(--body)]">{o.product}</td>
                    <td className="px-4 py-3 text-[var(--body)]">{o.qty}</td>
                    <td className="px-4 py-3 text-[var(--body)]">{o.supplier}</td>
                    <td className="px-4 py-3">
                      <span className={\`rounded-full px-2.5 py-0.5 text-xs \${statusTone[o.status]}\`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="inventory" className="mt-10">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Inventory alerts</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Replace with a low-stock item", "Replace with a low-stock item", "Replace with a low-stock item", "Replace with a low-stock item"].map((i) => (
              <div key={i} className="flex items-center justify-between gk-card-flat px-4 py-3 text-sm">
                <span>{i}</span>
                <span className="rounded-full bg-[#fdeaea] px-2.5 py-0.5 text-xs text-[#b91c1c]">Low</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: admin-panel ───────────────────────────────────────────────────
  "admin-panel": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#101014", soft: "#1a1a21", ink: "#f0f0f4", body: "#9b9ba8",
      mute: "#64646f", hairline: "#26262e", accent, primary: accent, onPrimary: "#101014",
      skin: "glass",
    }),
    "src/App.tsx": `import { BarChart3, LayoutDashboard, Settings, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

const nav = [
{ icon: LayoutDashboard, label: "Dashboard", to: "/" },
{ icon: Users, label: "Users", to: "/team" },
{ icon: BarChart3, label: "Analytics", to: "/analytics" },
{ icon: Shield, label: "Permissions", to: "/settings" },
{ icon: Settings, label: "Settings", to: "/settings" },
];

const users = [
  { name: "Replace with a name", email: "Replace with an email", role: "Admin", status: "Active" },
  { name: "Replace with a name", email: "Replace with an email", role: "Editor", status: "Active" },
  { name: "Replace with a name", email: "Replace with an email", role: "Viewer", status: "Invited" },
  { name: "Replace with a name", email: "Replace with an email", role: "Editor", status: "Active" },
  { name: "Replace with a name", email: "Replace with an email", role: "Viewer", status: "Disabled" },
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--hairline)] p-4">
        <div className="flex items-center gap-2 text-sm font-bold"><span className="text-[var(--accent)]">◈</span> ${name}</div>
        <nav className="mt-6 space-y-1 text-sm text-[var(--body)]">
{nav.map((n) => (
<Link key={n.label} to={n.to} className="flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]">
<n.icon className="h-4 w-4" /> {n.label}
</Link>
))}
        </nav>
        <div className="mt-auto gk-card-flat p-3 text-xs text-[var(--body)]">
          Replace with the current plan / usage summary
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Users</h1>
          <button className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">+ Invite user</button>
        </header>

        <div className="mt-5 grid gap-3 gk-card-soft p-4 sm:grid-cols-3">
          {[
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
          ].map((s) => (
            <div key={s.l} className="rounded-md bg-[var(--canvas)] p-4">
              <div className="text-xl font-bold">{s.v}</div>
              <div className="text-xs text-[var(--mute)]">{s.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 gk-card-flat overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[var(--canvas-soft)] text-xs text-[var(--mute)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-t border-[var(--hairline)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-[var(--mute)]">{u.email}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--body)]">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={\`rounded-full px-2.5 py-0.5 text-xs \${u.status === "Active" ? "bg-[#e8f7ee] text-[#15803d]" : u.status === "Disabled" ? "bg-[#fdeaea] text-[#b91c1c]" : "bg-[#e7f0ff] text-[#1d4ed8]"}\`}>{u.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: analytics ─────────────────────────────────────────────────────
analytics: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0d1117", soft: "#141a23", ink: "#e6edf3", body: "#8b949e",
      mute: "#565f6b", hairline: "#21262d", accent, primary: accent, onPrimary: "#0d1117",
      skin: "neon",
    }),
    "src/App.tsx": `import { Award, Radar, TrendingUp, Users } from "lucide-react";

const metrics = [
  { icon: Users, label: "Replace with a metric", value: "---", delta: "+12%" },
  { icon: Radar, label: "Replace with a metric", value: "---", delta: "+4%" },
  { icon: TrendingUp, label: "Replace with a metric", value: "---", delta: "-2%" },
  { icon: Award, label: "Replace with a metric", value: "---", delta: "+8%" },
];

const rows = [
  { label: "Replace with a row", a: "28%", b: "34%", c: "31%" },
  { label: "Replace with a row", a: "41%", b: "28%", c: "19%" },
  { label: "Replace with a row", a: "17%", b: "24%", c: "33%" },
  { label: "Replace with a row", a: "14%", b: "14%", c: "17%" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <nav className="hidden items-center gap-1 rounded-md border border-[var(--hairline)] p-1 text-xs text-[var(--body)] md:flex">
            {["7d", "30d", "90d"].map((t) => (
              <button key={t} className={\`rounded px-3 py-1 \${t === "30d" ? "bg-[var(--ink)] text-[var(--canvas)]" : "hover:text-[var(--ink)]"}\`}>{t}</button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="gk-card-flat p-5">
              <div className="flex items-center justify-between">
                <m.icon className="h-5 w-5 text-[var(--accent)]" />
                <span className={\`text-xs font-semibold \${m.delta.startsWith("-") ? "text-[#dc2626]" : "text-[#16a34a]"}\`}>{m.delta}</span>
              </div>
              <div className="mt-3 text-2xl font-bold">{m.value}</div>
              <div className="mt-0.5 text-xs text-[var(--mute)]">{m.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 gk-card-flat p-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Replace with a chart title</h2>
          <div className="mt-5 flex h-40 items-end gap-3">
            {[35, 55, 42, 68, 50, 78, 62].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md bg-[var(--accent)] opacity-90 transition-all hover:opacity-100" style={{ height: \`\${h}%\` }} />
            ))}
          </div>
          <div className="mt-3 text-xs text-[var(--mute)]">Replace the bars with a real chart or export link</div>
        </section>

        <section className="mt-8 gk-card-flat">
          <div className="border-b border-[var(--hairline)] px-5 py-3 text-sm font-semibold">Replace with a breakdown title</div>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--canvas-soft)] text-xs text-[var(--mute)]">
              <tr>
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Replace</th>
                <th className="px-5 py-3 font-medium">Replace</th>
                <th className="px-5 py-3 font-medium">Replace</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-t border-[var(--hairline)]">
                  <td className="px-5 py-3 font-medium">{r.label}</td>
                  <td className="px-5 py-3 text-[var(--body)]">{r.a}</td>
                  <td className="px-5 py-3 text-[var(--body)]">{r.b}</td>
                  <td className="px-5 py-3 text-[var(--body)]">{r.c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: project-management ────────────────────────────────────────────
  "project-management": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f2f4f8", ink: "#171a21", body: "#4b5263",
      mute: "#8e96a8", hairline: "#dcdfe7", accent, primary: "#171a21", onPrimary: "#ffffff",
      skin: "bento",
    }),
    "src/App.tsx": `import { Calendar, CheckSquare, Clock, ListTodo } from "lucide-react";
import { Link } from "react-router-dom";

const columns = [
  { name: "To do", tasks: ["Replace with a task", "Replace with a task", "Replace with a task"] },
  { name: "In progress", tasks: ["Replace with a task", "Replace with a task"] },
  { name: "Done", tasks: ["Replace with a task", "Replace with a task", "Replace with a task"] },
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-52 shrink-0 border-r border-[var(--hairline)] p-4 md:block">
        <div className="flex items-center gap-2 text-sm font-bold"><ListTodo className="h-4 w-4 text-[var(--accent)]" /> ${name}</div>
        <nav className="mt-6 space-y-1 text-sm text-[var(--body)]">
{[{ label: "Boards", to: "/" }, { label: "Timeline", to: "/projects" }, { label: "Tasks", to: "/projects" }, { label: "People", to: "/team" }, { label: "Reports", to: "/analytics" }].map((i) => (
<Link key={i.label} to={i.to} className={\`block rounded-md px-3 py-2 hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)] \${i.label === "Boards" ? "bg-[var(--canvas-soft)] font-medium text-[var(--ink)]" : ""}\`}>{i.label}</Link>
))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-4">
          <div>
            <h1 className="text-lg font-bold">Replace with a project name</h1>
            <div className="mt-1 flex items-center gap-4 text-xs text-[var(--mute)]">
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Replace with a due date</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Replace with a milestone</span>
            </div>
          </div>
          <button className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">+ New task</button>
        </header>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          {columns.map((c) => (
            <div key={c.name} className="gk-card-soft p-3">
              <div className="flex items-center justify-between px-1 text-sm font-semibold text-[var(--mute)]">
                <span>{c.name}</span>
                <span className="text-xs">{c.tasks.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {c.tasks.map((t) => (
                  <div key={t} className="rounded-md border border-[var(--hairline)] bg-[var(--canvas)] p-3">
                    <div className="flex items-start gap-2">
                      <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                      <div>
                        <div className="text-sm font-medium">{t}</div>
                        <div className="mt-1 text-xs text-[var(--mute)]">Replace with assignee</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: ecommerce ─────────────────────────────────────────────────────
  ecommerce: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fffdfa", soft: "#f6f2ea", ink: "#211a12", body: "#5f5547",
      mute: "#a09586", hairline: "#e9e2d6", accent, primary: "#211a12", onPrimary: "#fffdfa",
      skin: "paper",
    }),
    "src/App.tsx": `import { Heart, Search, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

const products = [
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
  { name: "Replace with a product", price: "$---", tag: "Replace" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight">${name}</span>
          <div className="hidden flex-1 max-w-sm items-center gap-2 gk-card-flat px-3 py-2 text-sm text-[var(--mute)] mx-6">
            <Search className="h-4 w-4" /> Search products…
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <a href="#shop" className="text-[var(--body)] hover:text-[var(--ink)]">Shop</a>
            <a href="#about" className="text-[var(--body)] hover:text-[var(--ink)]">About</a>
            <button aria-label="Wishlist"><Heart className="h-5 w-5" /></button>
            <button aria-label="Cart" className="relative"><ShoppingCart className="h-5 w-5" /><span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--on-primary)]">{3}</span></button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">${name}</h1>
        <p className="mt-4 text-base leading-7 text-[var(--body)]">
          Replace with the promise: what you sell, how it's made or sourced, and who it's for.
        </p>
      </section>

      <main id="shop" className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">All products</h2>
          <span className="text-xs text-[var(--mute)]">Replace with a count</span>
        </div>
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
          {products.map((p) => (
            <div key={p.name} className="group">
              <div className="relative">
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-[var(--canvas-soft)] text-3xl">📦</div>
                <span className="absolute top-2 left-2 rounded-full bg-[var(--canvas)] px-2 py-0.5 text-xs text-[var(--body)]">{p.tag}</span>
                <button aria-label="Add to cart" className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] opacity-0 transition-opacity group-hover:opacity-100"><ShoppingCart className="h-4 w-4" /></button>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{p.name}</h3>
              <div className="text-sm text-[var(--body)]">{p.price}</div>
            </div>
          ))}
        </div>
      </main>

      <section id="about" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Why shop here</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--body)]">
            Replace with the story behind the store: sourcing, values, shipping promises.
          </p>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with shipping, returns, and contact links.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Webapps: marketplace ───────────────────────────────────────────────────
  marketplace: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fafbfc", soft: "#f0f2f5", ink: "#1a1d24", body: "#4e5667",
      mute: "#9199a9", hairline: "#e0e3ea", accent, primary: "#1a1d24", onPrimary: "#fafbfc",
      skin: "bento",
    }),
    "src/App.tsx": `import { MapPin, Search, Star, User } from "lucide-react";

const listing = [
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "4.9" },
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "5.0" },
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "4.7" },
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "4.8" },
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "4.6" },
  { title: "Replace with a listing", note: "Replace with a short description.", where: "City", price: "$---", rating: "4.9" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight">${name}</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#explore" className="hover:text-[var(--ink)]">Explore</a>
            <a href="#list" className="hover:text-[var(--ink)]">List an item</a>
            <a href="#about" className="hover:text-[var(--ink)]">About</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight">${name}</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--body)]">
          Replace with the market you serve: who buys, who sells, and how trust is built here.
        </p>
        <div className="mx-auto mt-7 flex max-w-md items-center gap-2 gk-card-flat bg-[var(--canvas)] px-4 py-2.5 text-sm text-[var(--mute)]">
          <Search className="h-4 w-4" /> Search the marketplace…
        </div>
      </section>

      <main id="explore" className="mx-auto max-w-5xl px-6 pb-16">
        <div className="flex items-center justify-between py-4">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Featured listings</h2>
          <button className="gk-btn gk-btn-secondary gk-btn-sm">Filter</button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listing.map((l) => (
            <div key={l.title} className="gk-card-flat overflow-hidden">
              <div className="flex aspect-[16/10] items-center justify-center bg-[var(--canvas-soft)] text-3xl">🖼️</div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{l.title}</h3>
                  <span className="flex items-center gap-1 text-xs text-[var(--body)]"><Star className="h-3.5 w-3.5 fill-current text-[#f59e0b]" /> {l.rating}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--body)]">{l.note}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-[var(--mute)]"><MapPin className="h-3.5 w-3.5" /> {l.where}</span>
                  <span className="text-sm font-bold">{l.price}</span>
                </div>
                <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--primary)] py-2 text-xs font-medium text-[var(--on-primary)] hover:opacity-85"><User className="h-3.5 w-3.5" /> Contact seller</button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <section id="list" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-2xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">List something</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--body)]">Replace with the listing fees, review process, and safety tips.</p>
          <button className="mt-6 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Create a listing</button>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with trust and safety, support, and seller resources.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Webapps: social-network ────────────────────────────────────────────────
  "social-network": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f2f3f5", ink: "#111418", body: "#4a515c",
      mute: "#8b93a0", hairline: "#dce0e6", accent, primary: accent, onPrimary: "#ffffff",
    }),
    "src/App.tsx": `import { Heart, Image, MessageCircle, Repeat2, Send, Smile } from "lucide-react";

const posts = [
  { author: "Replace with a name", handle: "@handle", text: "Replace with a post: what people share in this community.", likes: "1.2k", comments: "84" },
  { author: "Replace with a name", handle: "@handle", text: "Replace with a post: what people share in this community.", likes: "856", comments: "62" },
  { author: "Replace with a name", handle: "@handle", text: "Replace with a post: what people share in this community.", likes: "2.4k", comments: "143" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="sticky top-0 z-10 border-b border-[var(--hairline)] bg-[var(--canvas)]">
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold tracking-tight">${name}</span>
          <button className="gk-btn gk-btn-primary gk-btn-sm">Post</button>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 pt-4">
        <div className="gk-card-flat p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--canvas-soft)] text-sm">{"👤"}</div>
            <textarea rows={2} placeholder="What's happening?" className="w-full resize-none text-sm outline-none placeholder:text-[var(--mute)]" />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--hairline)] pt-3">
            <div className="flex gap-3 text-[var(--mute)]">
              <Image className="h-5 w-5" />
              <Smile className="h-5 w-5" />
            </div>
            <button className="gk-btn gk-btn-primary gk-btn-sm"><Send className="h-3.5 w-3.5" /> Post</button>
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {posts.map((p) => (
            <article key={p.handle} className="gk-card-flat p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--canvas-soft)] text-sm">{"👤"}</div>
                <div>
                  <div className="text-sm font-semibold">{p.author}</div>
                  <div className="text-xs text-[var(--mute)]">{p.handle} · Replace with a time</div>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6">{p.text}</p>
              <div className="mt-3 flex gap-6 text-xs text-[var(--mute)]">
                <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {p.comments}</span>
                <span className="flex items-center gap-1.5"><Repeat2 className="h-4 w-4" /> Replace</span>
                <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {p.likes}</span>
              </div>
            </article>
          ))}
        </div>

        <footer className="py-10 text-center text-xs text-[var(--mute)]">
          Replace with community guidelines and moderation notes.
        </footer>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Webapps: learning-platform ─────────────────────────────────────────────
  "learning-platform": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f4f6fb", ink: "#12141d", body: "#4a5063",
      mute: "#8d93a8", hairline: "#dfe3ee", accent, primary: "#12141d", onPrimary: "#ffffff",
      skin: "paper",
    }),
    "src/App.tsx": `import { BookOpen, CheckCircle2, PlayCircle } from "lucide-react";

const courses = [
  { title: "Replace with a course", level: "Beginner", lessons: "---", progress: 40 },
  { title: "Replace with a course", level: "Intermediate", lessons: "---", progress: 70 },
  { title: "Replace with a course", level: "Advanced", lessons: "---", progress: 15 },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#courses" className="hover:text-[var(--ink)]">My courses</a>
            <a href="#continue" className="hover:text-[var(--ink)]">Continue learning</a>
            <a href="#goals" className="hover:text-[var(--ink)]">Goals</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Hi there, welcome back</h1>
        <p className="mt-2 text-sm text-[var(--body)]">Replace with a personal progress summary.</p>
        <div className="mt-5 flex items-center gap-3">
          <div className="gk-progress flex-1">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "55%" }} />
          </div>
          <span className="text-sm font-semibold text-[var(--accent)]">55%</span>
        </div>
      </section>

      <section id="continue" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Continue learning</h2>
          <div className="mt-4 gk-card p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-[var(--canvas-soft)]"><PlayCircle className="h-6 w-6 text-[var(--accent)]" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">Replace with the current lesson</div>
                <div className="mt-0.5 text-xs text-[var(--mute)]">Replace with the course name</div>
                <div className="mt-3 gk-progress">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "60%" }} />
                </div>
              </div>
              <button className="rounded-md bg-[var(--primary)] px-4 py-2 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">Resume</button>
            </div>
          </div>
        </div>
      </section>

      <section id="courses" className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">My courses</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {courses.map((c) => (
            <div key={c.title} className="gk-card-flat p-5">
              <CheckCircle2 className="h-5 w-5 text-[var(--accent)]" />
              <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
              <div className="mt-1 text-xs text-[var(--mute)]">{c.level} · {c.lessons} lessons</div>
              <div className="mt-3 gk-progress">
                <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: \`\${c.progress}%\` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="goals" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Your goals</h2>
          <div className="mt-4 space-y-2">
            {["Replace with a goal (e.g. 'Ship a project with X')", "Replace with a goal", "Replace with a goal"].map((g) => (
              <div key={g} className="flex items-center gap-3 gk-card-flat bg-[var(--canvas)] px-4 py-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)]" />
                {g}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
`,
  }),

  // ─── AI: ai-chatbot ─────────────────────────────────────────────────────────
  "ai-chatbot": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f4f5f7", ink: "#15161a", body: "#4b4f5a",
      mute: "#8d919c", hairline: "#e0e2e8", accent, primary: accent, onPrimary: "#ffffff",
      skin: "glass",
    }),
    "src/App.tsx": `import { ArrowUp, Bot, Send } from "lucide-react";
import { useState } from "react";

const messages = [
  { from: "bot" as const, text: "Replace with a welcome message describing what this assistant can help with." },
  { from: "user" as const, text: "Replace with a sample question a user might ask." },
  { from: "bot" as const, text: "Replace with a strong answer: specific, helpful, and structured." },
];

const suggestions = ["Replace with a prompt", "Replace with a prompt", "Replace with a prompt"];

export default function App() {
  const [input, setInput] = useState("");
  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <div className="vk-scene absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--canvas)) 0%, var(--canvas) 45%)" }} />
      <div className="vk-grid-faint absolute inset-0 opacity-60" />
      <div className="vk-orb h-72 w-72" style={{ top: "-24%", left: "-10%", background: accent }} />
      <div className="vk-orb h-80 w-80" style={{ bottom: "-32%", right: "-12%", background: accent }} />
      <header className="vk-glass relative z-10 flex items-center gap-2.5 border-b border-[var(--hairline)] bg-[var(--canvas)]/70 px-6 py-4">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-full" style={{ background: \`linear-gradient(135deg, color-mix(in srgb, var(--accent) 25%, transparent), transparent)\` }}>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)]"><Bot className="h-3.5 w-3.5 text-[var(--on-primary)]" /></div>
          <span className="vk-dot absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 border-2 border-[var(--canvas)]" style={{ background: "var(--success)" }} />
        </div>
        <div>
          <div className="text-sm font-bold">${name}</div>
          <div className="text-xs text-[var(--mute)]">Replace with the model name / status</div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.map((m, i) => (
          <div key={i} className={\`vk-msg flex gap-3 \${m.from === "user" ? "flex-row-reverse" : ""}\`} style={{ animationDelay: \`\${i * 90}ms\` }}>
            <div className={\`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs \${m.from === "user" ? "bg-[var(--canvas-soft)]" : "bg-[var(--primary)] text-[var(--on-primary)]"}\`}>
              {m.from === "user" ? "You" : "AI"}
            </div>
            <div className={\`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 \${m.from === "user" ? "text-[var(--on-primary)]" : "bg-[var(--canvas-soft)]"}\`} style={m.from === "user" ? { background: \`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 78%, var(--accent) 22%))\` } : undefined}>
              {m.text}
            </div>
          </div>
        ))}
        <div className="vk-msg flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs text-[var(--on-primary)]">AI</div>
          <div className="vk-typing rounded-2xl bg-[var(--canvas-soft)] px-4 py-3.5">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)} className="gk-btn gk-btn-secondary gk-btn-sm">
              {s}
            </button>
          ))}
        </div>
      </main>

      <footer className="relative z-10 border-t border-[var(--hairline)] bg-[var(--canvas)]/70 p-4 vk-glass">
        <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2 transition-shadow focus-within:border-[var(--accent)] focus-within:shadow-lg" style={{ boxShadow: "0 0 0 0 transparent" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message the assistant…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--mute)]" />
          <button aria-label="Send" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--on-primary)] transition-transform hover:scale-105" style={{ background: \`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, var(--accent) 30%))\` }}>
            {input.trim() ? <ArrowUp className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── AI: rag ────────────────────────────────────────────────────────────────
  rag: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f7f8fb", soft: "#eceef4", ink: "#131622", body: "#4a5166",
      mute: "#8f96a9", hairline: "#d9dde8", accent, primary: accent, onPrimary: "#f7f8fb",
      skin: "paper",
    }),
    "src/App.tsx": `import { BookOpen, FileSearch, FileText, Send, Upload } from "lucide-react";

const docs = [
  { name: "Replace with a document name", pages: "---", note: "Replace with a summary" },
  { name: "Replace with a document name", pages: "---", note: "Replace with a summary" },
  { name: "Replace with a document name", pages: "---", note: "Replace with a summary" },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-4">
          <BookOpen className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-bold">${name}</span>
          <span className="ml-2 gk-badge hidden sm:inline">Ask your documents</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="gk-card-soft gk-card-xl p-8 text-center">
          <FileSearch className="mx-auto h-8 w-8 text-[var(--accent)]" />
          <h1 className="mt-4 text-xl font-bold tracking-tight">Ask anything about your documents</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--body)]">
            Replace with what can be uploaded (formats, sizes) and what the knowledge base should contain.
          </p>
          <div className="mx-auto mt-6 flex max-w-lg items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] px-3 py-2.5">
            <input placeholder="e.g. Replace with a question" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--mute)]" />
            <button aria-label="Ask" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--on-primary)] hover:opacity-85"><Send className="h-4 w-4" /></button>
          </div>
          <button className="mx-auto mt-4 gk-btn gk-btn-secondary gk-btn-sm">
            <Upload className="h-4 w-4" /> Upload documents
          </button>
        </section>

        <section className="mt-10">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Knowledge base</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {docs.map((d) => (
              <div key={d.name} className="gk-card-flat p-4">
                <FileText className="h-5 w-5 text-[var(--accent)]" />
                <h3 className="mt-2 text-sm font-semibold">{d.name}</h3>
                <div className="mt-0.5 text-xs text-[var(--mute)]">{d.pages}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--body)]">{d.note}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--hairline)] py-6 text-center text-xs text-[var(--mute)]">
        Replace with the source docs, timestamps, and citation behavior.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── AI: ai-agent ───────────────────────────────────────────────────────────
  "ai-agent": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0c0c10", soft: "#17171e", ink: "#f1f1f4", body: "#9797a8",
      mute: "#5c5c6a", hairline: "#24242e", accent, primary: accent, onPrimary: "#0c0c10",
      skin: "terminal",
    }),
    "src/App.tsx": `import { Bot, ChevronRight, Play, Terminal } from "lucide-react";
import { Link } from "react-router-dom";

const runs = [
  { name: "Replace with a task", status: "Done", when: "2m ago", steps: 4 },
  { name: "Replace with a task", status: "Running", when: "now", steps: 2 },
  { name: "Replace with a task", status: "Failed", when: "1h ago", steps: 3 },
  { name: "Replace with a task", status: "Done", when: "Yesterday", steps: 6 },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <button className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85"><Play className="h-3.5 w-3.5" /> New run</button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          {[
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
          ].map((s) => (
            <div key={s.l} className="gk-card-flat p-5">
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="mt-0.5 text-xs text-[var(--mute)]">{s.l}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 gk-card-flat">
          <div className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
            <span className="text-sm font-semibold">Recent runs</span>
            <Link to="/analytics" className="flex items-center text-xs text-[var(--mute)] hover:text-[var(--ink)]">View all <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="divide-y divide-[var(--hairline)]">
            {runs.map((r) => (
              <div key={r.name} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <Terminal className="h-4 w-4 shrink-0 text-[var(--mute)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.name}</div>
                  <div className="text-xs text-[var(--mute)]">{r.when} · {r.steps} steps</div>
                </div>
                <span className={\`rounded-full px-2.5 py-0.5 text-xs \${r.status === "Done" ? "bg-[#e8f7ee] text-[#15803d]" : r.status === "Failed" ? "bg-[#fdeaea] text-[#b91c1c]" : "bg-[#e7f0ff] text-[#1d4ed8] animate-pulse"}\`}>{r.status}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--mute)]" />
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 gk-card-flat p-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">How to direct this agent</h2>
          <ol className="mt-3 space-y-2 text-sm text-[var(--body)]">
            <li>1. Replace with a typical task it should take on</li>
            <li>2. Replace with the tools or data it has access to</li>
            <li>3. Replace with a run's expected output</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── AI: ai-saas ────────────────────────────────────────────────────────────
  "ai-saas": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fbfafd", soft: "#f3f1f8", ink: "#191525", body: "#514b63",
      mute: "#9891ab", hairline: "#e2def0", accent, primary: accent, onPrimary: "#ffffff",
      skin: "bento",
    }),
    "src/App.tsx": `import { Bot, Check, Sparkles } from "lucide-react";
import { useState } from "react";

const cases = [
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
  { title: "Replace with a use case", note: "Replace with who it's for and what it automates." },
];

export default function App() {
  const [email, setEmail] = useState("");
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <nav className="flex items-center gap-6 text-sm text-[var(--body)]">
            <a href="#product" className="hover:text-[var(--ink)]">Product</a>
            <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
            <a href="#waitlist" className="hover:text-[var(--ink)]">Waitlist</a>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <div className="mx-auto gk-badge w-fit">
          <Bot className="h-3.5 w-3.5 text-[var(--accent)]" /> Replace with what the AI does better
        </div>
        <h1 className="mx-auto mt-6 max-w-2xl text-5xl font-bold tracking-tight">${name}</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--body)]">
          Replace with the outcome: what teams stop doing and what they start doing instead.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <a href="#waitlist" className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Join the waitlist</a>
          <a href="#product" className="gk-btn gk-btn-secondary">See it in action</a>
        </div>
      </section>

      <section id="product" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Use cases</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {cases.map((c) => (
              <div key={c.title} className="gk-card p-5">
                <Check className="h-4 w-4 text-[var(--accent)]" />
                <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Pricing</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { name: "Starter", price: "$0", note: "Replace with what's included" },
            { name: "Pro", price: "$29", note: "Replace with what's included", featured: true },
            { name: "Enterprise", price: "Custom", note: "Replace with what's included" },
          ].map((p) => (
            <div key={p.name} className={\`rounded-lg border p-6 \${p.featured ? "border-[var(--accent)] bg-[var(--canvas-soft)]" : "border-[var(--hairline)]"}\`}>
              <div className="text-sm font-medium text-[var(--body)]">{p.name}</div>
              <div className="mt-2 text-3xl font-bold">{p.price}<span className="text-sm font-normal text-[var(--mute)]">/mo</span></div>
              <p className="mt-3 text-sm leading-6 text-[var(--body)]">{p.note}</p>
              <button className={\`mt-5 w-full rounded-md py-2 text-sm font-medium \${p.featured ? "bg-[var(--primary)] text-[var(--on-primary)]" : "border border-[var(--hairline)] text-[var(--body)] hover:text-[var(--ink)]"}\`}>Get started</button>
            </div>
          ))}
        </div>
      </section>

      <section id="waitlist" className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Early access</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with what early customers receive and when access opens.</p>
          <form className="mt-6 flex gap-2" onSubmit={(e) => e.preventDefault()}>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="gk-input h-10 min-w-0 flex-1" />
            <button className="h-10 rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Request access</button>
          </form>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        Replace with trust notes: data handling, model choices, security.
      </footer>
    </div>
  );
}
`,
  }),

  // ─── AI: document-analyzer ──────────────────────────────────────────────────
  "document-analyzer": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f9f9fb", soft: "#efeff3", ink: "#17181d", body: "#4e515c",
      mute: "#91949f", hairline: "#dddee5", accent, primary: accent, onPrimary: "#f9f9fb",
      skin: "editorial",
    }),
    "src/App.tsx": `import { FileText, Lightbulb, ListChecks, ScanText, Upload } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-6 py-4">
          <ScanText className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-sm font-bold">${name}</span>
          <span className="ml-2 gk-badge hidden sm:inline">Upload · understand · export</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-xl border-2 border-dashed border-[var(--hairline)] bg-[var(--canvas-soft)] p-10 text-center">
          <Upload className="mx-auto h-8 w-8 text-[var(--accent)]" />
          <h1 className="mt-4 text-xl font-bold tracking-tight">Drop a document to analyze</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--body)]">
            Replace with supported formats, size limits, and what the analysis returns.
          </p>
          <button className="mt-6 rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Choose a file</button>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Lightbulb, t: "Replace with an insight", d: "Replace with the kind of finding highlighted." },
            { icon: ListChecks, t: "Replace with a next step", d: "Replace with the actions suggested." },
            { icon: FileText, t: "Replace with an export", d: "Replace with the output formats offered." },
          ].map((c) => (
            <div key={c.t} className="gk-card-flat p-5">
              <c.icon className="h-5 w-5 text-[var(--accent)]" />
              <h3 className="mt-3 text-sm font-semibold">{c.t}</h3>
              <p className="mt-1.5 text-sm leading-6 text-[var(--body)]">{c.d}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── AI: ai-customer-support ────────────────────────────────────────────────
  "ai-customer-support": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f2f4f7", ink: "#12151c", body: "#4a5160",
      mute: "#8b93a1", hairline: "#dde1e8", accent, primary: accent, onPrimary: "#ffffff",
      skin: "glass",
    }),
    "src/App.tsx": `import { Bot, Inbox, MessageSquare, Send, Sparkles, Tag } from "lucide-react";

const tickets = [
  { subject: "Replace with a ticket subject", status: "Resolved", tag: "Billing", ago: "5m ago", ai: true },
  { subject: "Replace with a ticket subject", status: "Needs review", tag: "Technical", ago: "32m ago", ai: false },
  { subject: "Replace with a ticket subject", status: "Resolved", tag: "Account", ago: "1h ago", ai: true },
  { subject: "Replace with a ticket subject", status: "Open", tag: "Feature request", ago: "3h ago", ai: false },
  { subject: "Replace with a ticket subject", status: "Resolved", tag: "Billing", ago: "Yesterday", ai: true },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold"><Bot className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <span className="gk-badge"><Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" /> AI drafts · Replace with a stat</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
            { l: "Replace with a stat", v: "---" },
          ].map((s) => (
            <div key={s.l} className="gk-card-flat p-5">
              <div className="text-2xl font-bold">{s.v}</div>
              <div className="mt-0.5 text-xs text-[var(--mute)]">{s.l}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 gk-card-flat">
          <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-5 py-3">
            <Inbox className="h-4 w-4 text-[var(--mute)]" />
            <span className="text-sm font-semibold">Inbox</span>
          </div>
          <div className="divide-y divide-[var(--hairline)]">
            {tickets.map((t) => (
              <div key={t.subject} className="flex items-center gap-3 px-5 py-3.5 text-sm">
                <MessageSquare className="h-4 w-4 shrink-0 text-[var(--mute)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{t.subject}</span>
                    {t.ai && <span className="gk-badge shrink-0"><Sparkles className="h-3 w-3 text-[var(--accent)]" /> AI draft</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-[var(--mute)]">{t.ago}</div>
                </div>
                <span className="gk-badge hidden sm:flex"><Tag className="h-3 w-3" /> {t.tag}</span>
                <span className={\`rounded-full px-2.5 py-0.5 text-xs \${t.status === "Resolved" ? "bg-[#e8f7ee] text-[#15803d]" : t.status === "Open" ? "bg-[#fffbeb] text-[#a16207]" : "bg-[#e7f0ff] text-[#1d4ed8] animate-pulse"}\`}>{t.status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 gk-card-flat p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--mute)] uppercase"><Send className="h-4 w-4" /> How the AI assists</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-[var(--body)]">
            <li>Replace with what triggers an AI draft</li>
            <li>Replace with who reviews before it ships</li>
            <li>Replace with the escalation path</li>
          </ol>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── AI: ai-search ──────────────────────────────────────────────────────────
  "ai-search": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0a0e1a", soft: "#111829", ink: "#eef1f9", body: "#8a93ab",
      mute: "#56607a", hairline: "#1d2740", accent, primary: accent, onPrimary: "#0a0e1a",
      skin: "neon",
    }),
    "src/App.tsx": `import { ArrowUpRight, Globe, Search, Sparkles } from "lucide-react";

const results = [
  { title: "Replace with a result", url: "Replace with a source domain", note: "Replace with a one-line explanation of why it answers the query." },
  { title: "Replace with a result", url: "Replace with a source domain", note: "Replace with a one-line explanation of why it answers the query." },
  { title: "Replace with a result", url: "Replace with a source domain", note: "Replace with a one-line explanation of why it answers the query." },
  { title: "Replace with a result", url: "Replace with a source domain", note: "Replace with a one-line explanation of why it answers the query." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--hairline)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <span className="flex items-center gap-2 text-sm font-bold"><Sparkles className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
          <span className="ml-2 hidden rounded-full border border-[var(--hairline)] px-2.5 py-0.5 text-xs text-[var(--body)] sm:inline">Search with citations</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pt-10">
        <form className="flex items-center gap-2 rounded-xl border border-[var(--hairline)] bg-[var(--canvas-soft)] px-4 py-3" onSubmit={(e) => e.preventDefault()}>
          <Search className="h-4 w-4 shrink-0 text-[var(--mute)]" />
          <input placeholder="Replace with a search query…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--mute)]" />
          <button className="rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">Search</button>
        </form>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Answer</h2>
          <p className="mt-3 gk-card-soft p-5 text-sm leading-7 text-[var(--body)]">
            Replace with a short synthesized answer citing the sources below. Keep it specific and up to date.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Sources</h2>
          <div className="mt-3 space-y-2">
            {results.map((r) => (
              <a key={r.title} href={r.url ?? "https://example.com"} target="_blank" rel="noreferrer" className="group flex items-start gap-3 gk-card-flat p-4 transition-colors hover:bg-[var(--canvas-soft)]">
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold group-hover:text-[var(--accent)]">
                    {r.title} <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-xs text-[var(--mute)]">{r.url}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--body)]">{r.note}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <footer className="py-10 text-center text-xs text-[var(--mute)]">
          Replace with coverage notes: date ranges, languages, domains.
        </footer>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-social ────────────────────────────────────────────
  "mobile-social": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0c0d12", soft: "#17181f", ink: "#f1f2f6", body: "#9c9eaa",
      mute: "#5f6270", hairline: "#24262f", accent, primary: accent, onPrimary: "#0c0d12",
      skin: "glass",
    }),
    "src/App.tsx": `import { Heart, Home, MessageCircle, PlusCircle, Search, User } from "lucide-react";

const posts = [
  { author: "Replace with a name", text: "Replace with what people share here.", likes: "214" },
  { author: "Replace with a name", text: "Replace with what people share here.", likes: "98" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="text-base font-bold">${name}</span>
        <div className="flex items-center gap-4 text-[var(--mute)]">
          <button aria-label="Search"><Search className="h-5 w-5" /></button>
          <button aria-label="Messages"><MessageCircle className="h-5 w-5" /></button>
        </div>
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto p-4">
        {[0, 1].map((row) => (
          <section key={row} className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className={\`flex h-14 w-14 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--canvas-soft)] text-xl\`}>🧑</span>
                <span className="truncate text-[10px] text-[var(--mute)]">Replace</span>
              </div>
            ))}
          </section>
        ))}

        {posts.map((p) => (
          <article key={p.author} className="gk-card-flat gk-card-xl p-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--canvas-soft)] text-sm">🧑</span>
              <span className="text-sm font-semibold">{p.author}</span>
              <span className="text-xs text-[var(--mute)]">· Replace with a time</span>
            </div>
            <p className="mt-2.5 text-sm leading-6">{p.text}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-[var(--mute)]">
              <span className="flex items-center gap-1.5"><Heart className="h-4 w-4" /> {p.likes}</span>
              <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> Replace</span>
            </div>
          </article>
        ))}
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6 text-[var(--accent)]" />
        <Search className="h-6 w-6" />
        <PlusCircle className="h-6 w-6" />
        <Heart className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-fitness ───────────────────────────────────────────
  "mobile-fitness": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f8fafb", soft: "#edf2f4", ink: "#12212b", body: "#48606e",
      mute: "#8ba0ab", hairline: "#dce6ea", accent, primary: accent, onPrimary: "#f8fafb",
      skin: "neon",
    }),
    "src/App.tsx": `import { Activity, Home, Plus, User } from "lucide-react";

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <main className="flex-1 overflow-y-auto p-5">
        <h1 className="text-xl font-bold">Good day 👋</h1>
        <p className="mt-1 text-xs text-[var(--mute)]">Replace with a daily message or streak</p>

        <section className="mt-5 gk-card-soft gk-card-xl p-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Move ring</h2>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full" style={{ background: "conic-gradient(var(--accent) 0 70%, var(--hairline) 70% 100%)" }}>
              <div className="flex h-[85%] w-[85%] flex-col items-center justify-center rounded-full bg-[var(--canvas)]">
                <span className="text-2xl font-bold">70%</span>
                <span className="text-[10px] text-[var(--mute)]">Replace with the daily goal</span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Workouts</h2>
            <button className="text-xs text-[var(--accent)]">See all</button>
          </div>
          <div className="mt-3 space-y-2">
            {["Replace with a workout", "Replace with a workout", "Replace with a workout"].map((w) => (
              <div key={w} className="flex items-center gap-3 gk-card-flat gk-card-xl p-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--canvas-soft)]"><Activity className="h-5 w-5 text-[var(--accent)]" /></span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{w}</div>
                  <div className="text-xs text-[var(--mute)]">Replace with duration · energy</div>
                </div>
                <span className="gk-btn gk-btn-icon"><Plus className="h-4 w-4" /></span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6" />
        <Activity className="h-6 w-6 text-[var(--accent)]" />
        <Plus className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-finance ───────────────────────────────────────────
  "mobile-finance": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0b1020", soft: "#131a30", ink: "#f2f5fc", body: "#8b97b5",
      mute: "#556182", hairline: "#1f2a47", accent, primary: accent, onPrimary: "#0b1020",
      skin: "neon",
    }),
    "src/App.tsx": `import { ArrowDownRight, ArrowUpRight, Home, PieChart, Plus, User } from "lucide-react";

const txns = [
  { label: "Replace with a merchant", amount: "-$--", tone: "down" },
  { label: "Replace with a label", amount: "+$--", tone: "up" },
  { label: "Replace with a merchant", amount: "-$--", tone: "down" },
  { label: "Replace with a label", amount: "+$--", tone: "up" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <main className="flex-1 overflow-y-auto p-5">
        <section className="rounded-2xl bg-[var(--canvas-soft)] p-5 ring-1 ring-[var(--hairline)]">
          <div className="text-xs text-[var(--mute)]">Replace with an account</div>
          <div className="mt-1 text-3xl font-bold">$ ---</div>
          <div className="mt-1 text-xs text-[var(--success)]">+ Replace with a delta this month</div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="gk-btn gk-btn-secondary gk-btn-sm"><ArrowUpRight className="h-4 w-4 text-[var(--error)]" /> Send</button>
            <button className="gk-btn gk-btn-secondary gk-btn-sm"><ArrowDownRight className="h-4 w-4 text-[var(--success)]" /> Request</button>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Budgets</h2>
            <button className="text-xs text-[var(--accent)]">Manage</button>
          </div>
          <div className="mt-3 space-y-3">
            {["Replace with a category", "Replace with a category"].map((c) => (
              <div key={c} className="gk-card-flat gk-card-xl p-3.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{c}</span>
                  <span className="text-xs text-[var(--mute)]">---% used</span>
                </div>
                <div className="mt-2 gk-progress">
                  <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "60%" }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Recent activity</h2>
          <div className="mt-3 space-y-2">
            {txns.map((t) => (
              <div key={t.label} className="flex items-center gap-3 gk-card-flat gk-card-xl px-3.5 py-3">
                <span className={\`flex h-9 w-9 items-center justify-center rounded-full \${t.tone === "up" ? "bg-[#e8f7ee] text-[#15803d]" : "bg-[#fdeaea] text-[#b91c1c]"}\`}>
                  {t.tone === "up" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </span>
                <span className="flex-1 text-sm">{t.label}</span>
                <span className="text-sm font-semibold">{t.amount}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6" />
        <PieChart className="h-6 w-6 text-[var(--accent)]" />
        <Plus className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-ecommerce ─────────────────────────────────────────
  "mobile-ecommerce": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fdfdfb", soft: "#f3f2ec", ink: "#1e1c17", body: "#5d594e",
      mute: "#a09b8d", hairline: "#e8e4d9", accent, primary: "#1e1c17", onPrimary: "#fdfdfb",
      skin: "paper",
    }),
    "src/App.tsx": `import { Heart, Home, Search, ShoppingBag, User } from "lucide-react";

const products = [
  { name: "Replace with a product", price: "$--" },
  { name: "Replace with a product", price: "$--" },
  { name: "Replace with a product", price: "$--" },
  { name: "Replace with a product", price: "$--" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="text-base font-bold">${name}</span>
        <div className="flex items-center gap-4 text-[var(--mute)]">
          <button aria-label="Search"><Search className="h-5 w-5" /></button>
          <button aria-label="Bag" className="relative"><ShoppingBag className="h-5 w-5" /><span className="absolute -top-2 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[var(--on-primary)]">2</span></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <div className="gk-card-flat gk-card-xl p-6">
          <h1 className="text-lg font-bold">Replace with a seasonal headline</h1>
          <p className="mt-1 text-xs text-[var(--mute)]">Replace with the offer or drop date</p>
          <button className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">Shop now</button>
        </div>

        <h2 className="mt-5 text-sm font-semibold text-[var(--mute)] uppercase">New in</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {products.map((p) => (
            <div key={p.name}>
              <div className="relative flex aspect-square items-center justify-center rounded-xl bg-[var(--canvas-soft)] text-2xl">📦</div>
              <div className="mt-1.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">{p.name}</div>
                  <div className="text-xs text-[var(--mute)]">{p.price}</div>
                </div>
                <button aria-label="Wishlist"><Heart className="h-4 w-4 text-[var(--mute)]" /></button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6 text-[var(--accent)]" />
        <Search className="h-6 w-6" />
        <Heart className="h-6 w-6" />
        <ShoppingBag className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-productivity ─────────────────────────────────────
  "mobile-productivity": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fbfbfd", soft: "#f0f1f5", ink: "#181a22", body: "#4c5060",
      mute: "#8e92a2", hairline: "#dcdde6", accent, primary: accent, onPrimary: "#fbfbfd",
      skin: "bento",
    }),
    "src/App.tsx": `import { Check, Home, Plus, Search, User } from "lucide-react";

const tasks = [
  { text: "Replace with a task", done: false },
  { text: "Replace with a task", done: true },
  { text: "Replace with a task", done: false },
  { text: "Replace with a task", done: false },
  { text: "Replace with a task", done: true },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <main className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Today</h1>
            <p className="mt-0.5 text-xs text-[var(--mute)]">Replace with a count of tasks left</p>
          </div>
          <button aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--hairline)] text-[var(--mute)]"><Search className="h-4 w-4" /></button>
        </div>

        <section className="mt-5 gk-card-soft gk-card-xl p-4">
          <div className="flex items-center justify-between text-xs text-[var(--mute)]">
            <span>Replace with a breakdown</span>
            <span>---%</span>
          </div>
          <div className="mt-2 gk-progress">
            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "60%" }} />
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Tasks</h2>
          <div className="mt-3 space-y-2">
            {tasks.map((t) => (
              <label key={t.text} className="flex cursor-pointer items-center gap-3 gk-card-flat gk-card-xl px-3.5 py-3">
                <span className={\`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 \${t.done ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--hairline)]"}\`}>
                  {t.done && <Check className="h-3 w-3 text-[var(--on-primary)]" />}
                </span>
                <span className={\`text-sm \${t.done ? "text-[var(--mute)] line-through" : ""}\`}>{t.text}</span>
              </label>
            ))}
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--hairline)] py-3 text-sm text-[var(--mute)] hover:text-[var(--ink)]">
            <Plus className="h-4 w-4" /> Add task
          </button>
        </section>
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6 text-[var(--accent)]" />
        <Plus className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Mobile (PWA): mobile-education ────────────────────────────────────────
  "mobile-education": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#ffffff", soft: "#f2f4f8", ink: "#131620", body: "#49506a",
      mute: "#8d94a8", hairline: "#dde1ea", accent, primary: accent, onPrimary: "#ffffff",
      skin: "paper",
    }),
    "src/App.tsx": `import { BookOpen, Home, Play, User } from "lucide-react";

const lessons = [
  { title: "Replace with a lesson", taken: true, mins: "10m" },
  { title: "Replace with a lesson", taken: false, mins: "12m" },
  { title: "Replace with a lesson", taken: false, mins: "8m" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-sm flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <main className="flex-1 overflow-y-auto p-5">
        <h1 className="text-xl font-bold">Keep going</h1>
        <p className="mt-0.5 text-xs text-[var(--mute)]">Replace with a personal milestone</p>

        <section className="mt-4 flex items-center gap-3 gk-card-soft gk-card-xl p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]"><BookOpen className="h-6 w-6 text-[var(--on-primary)]" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Replace with a course</div>
            <div className="mt-0.5 text-xs text-[var(--mute)]">Lesson 3 of ---</div>
            <div className="mt-2 gk-progress">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "55%" }} />
            </div>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Coming up</h2>
          <div className="mt-3 space-y-2">
            {lessons.map((l) => (
              <div key={l.title} className="flex items-center gap-3 gk-card-flat gk-card-xl px-3.5 py-3">
                <span className={\`flex h-9 w-9 shrink-0 items-center justify-center rounded-full \${l.taken ? "bg-[#e8f7ee] text-[#15803d]" : "bg-[var(--canvas-soft)] text-[var(--mute)]"}\`}>
                  <Play className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{l.title}</div>
                  <div className="text-xs text-[var(--mute)]">{l.mins}</div>
                </div>
                {l.taken && <span className="rounded-full bg-[#e8f7ee] px-2 py-0.5 text-xs text-[#15803d]">Done</span>}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--hairline)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--accent)]">---</div>
          <div className="mt-0.5 text-xs text-[var(--mute)]">Replace with a stat (e.g. day streak)</div>
        </section>
      </main>

      <footer className="flex items-center justify-around border-t border-[var(--hairline)] px-4 py-2.5 text-[var(--mute)]">
        <Home className="h-6 w-6 text-[var(--accent)]" />
        <BookOpen className="h-6 w-6" />
        <User className="h-6 w-6" />
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Desktop (PWA): dev-tools ──────────────────────────────────────────────
  "dev-tools": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0e1116", soft: "#181c24", ink: "#e6ebf2", body: "#8791a3",
      mute: "#4f5868", hairline: "#242b36", accent, primary: accent, onPrimary: "#0e1116",
      skin: "terminal",
      font: "\"SF Mono\", ui-monospace, monospace",
    }),
    "src/App.tsx": `import { Copy, Play, RefreshCw, Save, Terminal } from "lucide-react";

const snippets = [
  { name: "Replace with a snippet", lang: "ts", text: "export const answer = 42;  // replace me" },
  { name: "Replace with a snippet", lang: "sh", text: "curl https://example.com  // replace me" },
  { name: "Replace with a snippet", lang: "css", text: ".card { border: 1px solid; }  // replace me" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-bold"><Terminal className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
        <div className="flex items-center gap-2">
          <button className="gk-btn gk-btn-secondary gk-btn-sm"><Save className="h-3.5 w-3.5" /> Save</button>
        </div>
      </header>

      <main className="min-w-0 flex-1 space-y-4 overflow-y-auto p-5">
        <section className="grid gap-2">
          {snippets.map((s) => (
            <div key={s.name} className="gk-card-flat overflow-hidden">
              <div className="flex items-center justify-between bg-[var(--canvas-soft)] px-4 py-2 text-xs text-[var(--mute)]">
                <span>{s.name}</span>
                <span className="rounded bg-[var(--canvas)] px-1.5 py-0.5 text-[10px] uppercase">{s.lang}</span>
              </div>
              <pre className="overflow-x-auto px-4 py-3 text-xs leading-5 text-[var(--body)]">{s.text}</pre>
            </div>
          ))}
        </section>

        <section className="gk-card-flat">
          <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-2">
            <span className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
            <span className="ml-2 text-xs text-[var(--mute)]">Replace with a run target</span>
          </div>
          <pre className="overflow-x-auto px-4 py-3 text-xs leading-5 text-[var(--body)]">{"$> replace with sample output\\n✓ done in 0.00s"}</pre>
          <div className="flex items-center gap-2 border-t border-[var(--hairline)] px-4 py-2">
            <button className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-2.5 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85"><Play className="h-3.5 w-3.5" /> Run</button>
            <button aria-label="Copy" className="gk-btn gk-btn-icon"><Copy className="h-3.5 w-3.5" /></button>
            <button aria-label="Refresh" className="gk-btn gk-btn-icon"><RefreshCw className="h-3.5 w-3.5" /></button>
          </div>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Desktop (PWA): desktop-productivity ────────────────────────────────────
  "desktop-productivity": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#fafafc", soft: "#efeff4", ink: "#1a1b22", body: "#4d4f5e",
      mute: "#8f91a0", hairline: "#dcdce5", accent, primary: accent, onPrimary: "#fafafc",
      skin: "glass",
    }),
    "src/App.tsx": `import { CalendarDays, ListTodo, Paperclip, Plus, Search, User } from "lucide-react";

const notes = [
  { title: "Replace with a note title", body: "Replace with the first line of the note.", updated: "2m ago" },
  { title: "Replace with a note title", body: "Replace with the first line of the note.", updated: "1h ago" },
  { title: "Replace with a note title", body: "Replace with the first line of the note.", updated: "Yesterday" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="flex items-center gap-2 text-sm font-bold"><Paperclip className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
        <div className="gk-btn gk-btn-secondary gk-btn-sm">
          <Search className="h-3.5 w-3.5" /> Quick search…
        </div>
      </header>

      <main className="grid flex-1 min-h-0 grid-cols-2">
        <section className="min-h-0 overflow-y-auto border-r border-[var(--hairline)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Notes</h2>
            <button aria-label="Add note" className="gk-btn gk-btn-icon"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-3 space-y-2">
            {notes.map((n) => (
              <div key={n.title} className="gk-card-flat p-3">
                <div className="text-sm font-medium">{n.title}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-[var(--body)]">{n.body}</div>
                <div className="mt-1.5 text-[10px] text-[var(--mute)]">{n.updated}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="min-h-0 overflow-y-auto p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Today</h2>
            <span className="text-xs text-[var(--mute)]">Replace with a date</span>
          </div>
          <div className="mt-3 space-y-2">
            {["Replace with a to-do", "Replace with a to-do", "Replace with a to-do"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 gk-card-flat px-3 py-2.5 text-sm">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2 border-[var(--hairline)]" style={{ height: "18px", width: "18px" }} />
                {t}
              </div>
            ))}
            <div className="flex items-center gap-2.5 gk-card-flat border-dashed px-3 py-2.5 text-xs text-[var(--mute)]"><CalendarDays className="h-4 w-4" /> Add an event</div>
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-[var(--hairline)] px-5 py-2.5 text-[var(--mute)]">
        <span className="flex items-center gap-2 text-xs"><User className="h-4 w-4" /> Replace with a workspace</span>
        <span className="flex items-center gap-1.5 text-xs text-[var(--mute)]"><ListTodo className="h-4 w-4" /> Replaced</span>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Desktop (PWA): media ───────────────────────────────────────────────────
  media: ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0b0b0f", soft: "#14141a", ink: "#f0f0f5", body: "#8d8d9c",
      mute: "#52525f", hairline: "#1f1f28", accent, primary: accent, onPrimary: "#0b0b0f",
      skin: "neon",
    }),
    "src/App.tsx": `import { Heart, ListMusic, Pause, Play, Plus, Repeat, Shuffle, SkipBack, SkipForward } from "lucide-react";

const tracks = [
  { title: "Replace with a track", artist: "Replace with an artist", dur: "3:42" },
  { title: "Replace with a track", artist: "Replace with an artist", dur: "4:10" },
  { title: "Replace with a track", artist: "Replace with an artist", dur: "2:58" },
  { title: "Replace with a track", artist: "Replace with an artist", dur: "3:21" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="text-sm font-bold">${name}</span>
        <div className="flex items-center gap-2 text-[var(--mute)]">
          <Repeat className="h-4 w-4" />
          <Shuffle className="h-4 w-4" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-5">
        <section className="flex items-center gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-4">
          <div className="flex aspect-square w-24 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas)] text-4xl">🎵</div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">Replace with the current album / playlist</div>
            <div className="mt-0.5 text-xs text-[var(--mute)]">Replace with the artist</div>
            <div className="mt-3 gk-progress">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: "38%" }} />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[var(--mute)]">
              <span>1:26</span>
              <span>Replace with duration</span>
            </div>
          </div>
        </section>

        <section className="mt-4 flex items-center justify-center gap-5 text-[var(--body)]">
          <SkipBack className="h-6 w-6" />
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)]"><Pause className="h-5 w-5" /></span>
          <SkipForward className="h-6 w-6" />
        </section>

        <section className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Up next</h2>
            <button aria-label="Add" className="gk-btn gk-btn-icon"><Plus className="h-3.5 w-3.5" /></button>
          </div>
          <div className="mt-3 space-y-1.5">
            {tracks.map((t) => (
              <div key={t.title} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-[var(--canvas-soft)]">
                <span className="w-8 text-center text-xs text-[var(--mute)]"><Play className="h-3.5 w-3.5 inline" /></span>
                <ListMusic className="h-4 w-4 text-[var(--mute)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{t.title}</div>
                  <div className="truncate text-xs text-[var(--mute)]">{t.artist}</div>
                </div>
                <Heart className="h-4 w-4 text-[var(--mute)]" />
                <span className="text-xs text-[var(--mute)]">{t.dur}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
`,
  }),

  // ─── Desktop (PWA): file-manager ────────────────────────────────────────────
  "file-manager": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f7f8fa", soft: "#eceef2", ink: "#171a20", body: "#4b515e",
      mute: "#8d93a1", hairline: "#d9dde4", accent, primary: accent, onPrimary: "#f7f8fa",
      skin: "paper",
    }),
    "src/App.tsx": `import { File, Folder, FolderOpen, HardDrive, Search, Upload } from "lucide-react";

const folders = ["Replace with a folder", "Replace with a folder", "Replace with a folder"];
const files = [
  { name: "replace-with-a-file.ext", size: "1.2 MB" },
  { name: "replace-with-a-file.ext", size: "480 KB" },
  { name: "replace-with-a-file.ext", size: "3.1 MB" },
  { name: "replace-with-a-file.ext", size: "12 KB" },
];

export default function App() {
  return (
    <div className="mx-auto flex h-screen max-w-3xl flex-col bg-[var(--canvas)] text-[var(--ink)]">
      <header className="flex items-center justify-between border-b border-[var(--hairline)] px-5 py-3">
        <span className="flex items-center gap-1.5 text-sm font-bold"><FolderOpen className="h-4 w-4 text-[var(--accent)]" /> ${name}</span>
        <div className="gk-btn gk-btn-secondary gk-btn-sm">
          <Search className="h-3.5 w-3.5" /> Replace with a query
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-5">
        <section className="flex items-center gap-2 text-xs text-[var(--mute)]">
          <HardDrive className="h-4 w-4" /> Replace with a drive
          <span className="text-[var(--hairline)]">/</span>
          <span className="text-[var(--ink)]">Replace with a folder</span>
        </section>

        <section className="mt-4">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Folders</h2>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {folders.map((f) => (
              <div key={f} className="flex flex-col items-center gap-1.5 gk-card-flat p-3 text-center">
                <Folder className="h-7 w-7 text-[var(--accent)]" />
                <span className="w-full truncate text-xs text-[var(--body)]">{f}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-[var(--mute)] uppercase">Files</h2>
          <div className="mt-3 divide-y divide-[var(--hairline)] gk-card-flat">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[var(--canvas-soft)]">
                <File className="h-4 w-4 shrink-0 text-[var(--mute)]" />
                <span className="min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-xs text-[var(--mute)]">{f.size}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-[var(--hairline)] px-5 py-2.5 text-xs text-[var(--mute)]">
        <span>Replace with a count of items</span>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85"><Upload className="h-3.5 w-3.5" /> Upload</button>
      </footer>
    </div>
  );
}
`,
  }),

  // ─── Games: game-puzzle ─────────────────────────────────────────────────────
  "game-puzzle": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0b0b14", soft: "#14141f", ink: "#f1f1f7", body: "#8f8fa3",
      mute: "#4f4f63", hairline: "#232330", accent, primary: accent, onPrimary: "#0b0b14",
      skin: "glass",
    }),
    "src/App.tsx": `import { useEffect, useState } from "react";
import { Apple, Carrot, Cherry, Corn, Grape, Lemon, Peach } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const EMOJIS: LucideIcon[] = [Cherry, Lemon, Grape, Peach, Carrot, Corn];

function deal(): LucideIcon[] {
  const items = [...EMOJIS, ...EMOJIS];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function CardFace({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="h-8 w-8 text-[var(--on-primary)]" strokeWidth={1.8} />;
}

export default function App() {
  const [cards] = useState(deal);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<boolean[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    if (open.length === 2) {
      const [a, b] = open;
      if (cards[a] === cards[b]) {
        setMatched((m) => { const n = [...m]; n[a] = n[b] = true; return n; });
      }
      const t = setTimeout(() => setOpen([]), 700);
      return () => clearTimeout(t);
    }
  }, [open, cards]);

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || matched[i]) return;
    setOpen((o) => (o.length ? [...o, i] : [i]));
    if (open.length === 1) setMoves((m) => m + 1);
  }

  const done = matched.length > 0 && matched.every(Boolean);

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col items-center justify-center bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <h1 className="text-xl font-bold">${name}</h1>
      <p className="mt-1 text-xs text-[var(--mute)]">Match the pairs · {moves} moves · {done ? "You win — replace the win message" : "Replace with instructions"}</p>

      <div className="mt-6 grid w-full grid-cols-4 gap-2.5">
        {cards.map((c, i) => {
          const up = open.includes(i) || matched[i];
          return (
            <button key={i} onClick={() => flip(i)} className={\`flex aspect-square items-center justify-center rounded-xl transition-transform \${up ? "bg-[var(--primary)]" : "bg-[var(--canvas-soft)] hover:scale-105"}\`}>
              {up ? <CardFace icon={c} /> : "?"}
            </button>
          );
        })}
      </div>

      <button onClick={() => { setMatched([]); setOpen([]); setMoves(0); }} className="mt-6 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Restart</button>
    </div>
  );
}
`,
  }),

  // ─── Games: game-arcade ─────────────────────────────────────────────────────
  "game-arcade": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0d0d1a", soft: "#17172a", ink: "#f5f2ff", body: "#9892c2",
      mute: "#52507a", hairline: "#25243f", accent, primary: accent, onPrimary: "#0d0d1a",
    }),
    "src/App.tsx": `import { useEffect, useState } from "react";
import { Circle, Crown, Diamond, Flower2, Hexagon, Moon, Star, Triangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Tile = { id: number; on: boolean };

const SYMBOLS: LucideIcon[] = [Star, Diamond, Circle, Triangle, Flower2, Moon, Crown, Hexagon];

function LitIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="h-8 w-8" strokeWidth={2.2} fill="currentColor" />;
}

export default function App() {
  const [must, setMust] = useState(Math.floor(Math.random() * 4));
  const [tiles, setTiles] = useState<Tile[]>(() =>
    Array.from({ length: 8 }, (_, i) => ({ id: i, on: false })),
  );
  const [score, setScore] = useState(0);
  const [high, setHigh] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (busy) return;
    let n = 1;
    const start = setTimeout(() => {
      setTiles((t) => t.map((x, i) => ({ ...x, on: i === must })));
      n = 2;
      const off = setTimeout(() => {
        setTiles((t) => t.map((x) => ({ ...x, on: false })));
        setBusy(true);
      }, 1400);
      return () => clearTimeout(off);
    }, 600);
    return () => { clearTimeout(start); void n; };
  }, [must, busy]);

  function pick(i: number) {
    if (!busy) return;
    const hit = i === must;
    setBusy(false);
    setScore((s) => {
      const ns = hit ? s + 1 : 0;
      setHigh((h) => Math.max(h, ns));
      return ns;
    });
    setMust(Math.floor(Math.random() * 8));
  }

  return (
    <div className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <div className="vk-scene absolute inset-0" style={{ background: "radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 14%, var(--canvas)) 0%, var(--canvas) 62%)" }} />
      <div className="vk-grid absolute inset-0 opacity-70" />
      <div className="vk-orb h-72 w-72" style={{ top: "-20%", left: "50%", transform: "translateX(-50%)", background: accent }} />
      <div className="vk-scanlines absolute inset-0" />
      <div className="relative flex flex-col items-center">
        <h1 className="vk-glow text-2xl font-black tracking-tight">${name}</h1>
        <div className="vk-glass mt-3 flex items-center gap-3 rounded-full border border-[var(--hairline)] bg-[var(--canvas)]/70 px-4 py-1.5 text-xs text-[var(--mute)]">
          <span>Score <span className="font-bold text-[var(--ink)]">{score}</span></span>
          <span className="h-3 w-px bg-[var(--hairline)]" />
          <span>Best <span className="font-bold text-[var(--ink)]">{high}</span></span>
          <span className="h-3 w-px bg-[var(--hairline)]" />
          <span className="flex items-center gap-1.5"><span className="vk-dot h-1.5 w-1.5" style={{ background: busy ? "var(--success)" : "var(--mute)" }} /> {busy ? "Go!" : "Watch…"}</span>
        </div>

        <div className="mt-6 grid w-full grid-cols-4 gap-2.5">
          {tiles.map((t, i) => (
            <button key={t.id} onClick={() => pick(i)} className={\`vk-tilt aspect-square rounded-xl transition-all duration-150 \${t.on ? "scale-110 " : ""} \${busy ? "hover:scale-105" : "opacity-60"}\`} style={t.on ? { background: \`linear-gradient(145deg, var(--accent), color-mix(in srgb, var(--accent) 55%, #ffffff))\`, color: "#0d0d1a", boxShadow: \`0 0 0 3px color-mix(in srgb, var(--accent) 45%, transparent), 0 0 34px color-mix(in srgb, var(--accent) 55%, transparent)\` } : { background: "var(--canvas-soft)", boxShadow: "inset 0 0 0 1px var(--hairline)" }}>
              {t.on ? <LitIcon icon={SYMBOLS[i]} /> : <span className="font-mono text-xs font-bold text-[var(--mute)]">?</span>}
            </button>
          ))}
        </div>

        <p className="mt-6 max-w-xs text-center text-xs leading-5 text-[var(--mute)]">
          Replace with instructions, difficulty options, and any power-ups.
        </p>
      </div>
    </div>
  );
}
`,
  }),

  // ─── Games: game-multiplayer ───────────────────────────────────────────────
  "game-multiplayer": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#101014", soft: "#1a1a21", ink: "#f2f1f4", body: "#9a99a4",
      mute: "#5f5e68", hairline: "#27272f", accent, primary: accent, onPrimary: "#101014",
      skin: "terminal",
    }),
    "src/App.tsx": `import { useState } from "react";

type Choice = "rock" | "paper" | "scissors";
const SYMBOL: Record<Choice, string> = { rock: "R", paper: "P", scissors: "S" };
const BEATS: Record<Choice, Choice> = { rock: "scissors", paper: "rock", scissors: "paper" };

const round = (a: Choice, b: Choice): 0 | 1 | 2 => (a === b ? 0 : BEATS[a] === b ? 1 : 2);

export default function App() {
  const [p1, setP1] = useState<Choice | null>(null);
  const [p2, setP2] = useState<Choice | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [log, setLog] = useState<boolean[]>([]);

  const result = p1 && p2 ? round(p1, p2) : null;

  function choose(me: 1 | 2, c: Choice) {
    if (me === 1 ? p1 !== null : p2 !== null) return;
    me === 1 ? setP1(c) : setP2(c);
  }

  function next() {
    if (result !== null) {
      const winner = result as 0 | 1 | 2;
      if (winner !== 0) {
        const s = [...score] as [number, number];
        s[winner - 1] += 1;
        setScore(s);
        setLog((l) => [...l, winner === 1]);
      }
    }
    setP1(null);
    setP2(null);
  }

  const choices = (Object.keys(SYMBOL) as Choice[]);

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col items-center justify-center bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <h1 className="text-xl font-bold">${name}</h1>
      <p className="mt-1 text-xs text-[var(--mute)]">Pass & play · {score[0]} – {score[1]} · {log.length} rounds</p>

      <div className="mt-6 grid w-full grid-cols-2 gap-3">
        {[1, 2].map((player) => (
          <div key={player} className="gk-card-flat gk-card-xl p-4">
            <div className="flex items-center justify-between text-xs text-[var(--mute)]">
              <span>Player {player}</span>
              <span>{player === 1 ? score[0] : score[1]}</span>
            </div>
            <div className="mt-3 text-center text-4xl font-black tracking-tight">{p1 && player === 1 ? SYMBOL[p1] : p2 && player === 2 ? SYMBOL[p2] : <span className="text-[var(--hairline)]">?</span>}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {choices.map((c) => (
                <button key={c} onClick={() => choose(player as 1 | 2, c)} disabled={(player === 1 ? p1 !== null : p2 !== null)} className="gk-btn gk-btn-secondary" title={c}>
                  <span className="font-mono text-sm font-black tracking-tight">{SYMBOL[c]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {result !== null && (
        <p className="mt-4 text-sm text-[var(--body)]">
          {result === 0 ? "Tie — replace the round message" : result === 1 ? "Player 1 takes it — replace copy" : "Player 2 takes it — replace copy"}
        </p>
      )}

      <button onClick={next} className="mt-5 rounded-md bg-[var(--primary)] px-5 py-2 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">
        Next round
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-[var(--mute)]">Replace with rules, best-of rounds, and who goes first.</p>
    </div>
  );
}
`,
  }),

  // ─── Games: game-2d ─────────────────────────────────────────────────────────
  "game-2d": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#0a0e16", soft: "#131a28", ink: "#eef2fa", body: "#8291ad",
      mute: "#4a5872", hairline: "#1e2838", accent, primary: accent, onPrimary: "#0a0e16",
      skin: "neon",
    }),
    "src/App.tsx": `import { useEffect, useState } from "react";
import { Balloon, Cactus, Clover, Gem, Pizza, ShoppingBasket, Star } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const DROPS: LucideIcon[] = [Star, Gem, Pizza, Cactus, Balloon, Clover];

type Drop = { id: number; x: number; y: number; icon: LucideIcon };

export default function App() {
  const [player, setPlayer] = useState(2);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const interval = setInterval(() => {
      setDrops((ds) =>
        ds
          .map((d) => ({ ...d, y: d.y + 5 }))
          .filter((d) => d.y < 92)
          .concat(
            Math.random() < 0.35
              ? [{ id: Date.now(), x: Math.floor(Math.random() * 5), y: -6, icon: DROPS[Math.floor(Math.random() * DROPS.length)] }]
              : [],
          ),
      );
    }, 120);
    return () => clearInterval(interval);
  }, [started]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setPlayer((p) => Math.max(0, p - 1));
      if (e.key === "ArrowRight") setPlayer((p) => Math.min(4, p + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    setDrops((ds) => {
      const caught = ds.filter((d) => d.y >= 82 && d.y < 92 && d.x === player);
      if (caught.length) setScore((s) => s + caught.length);
      const ids = new Set(caught.map((c) => c.id));
      return ds.filter((d) => !ids.has(d.id));
    });
  }, [player, drops.length]);

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col items-center justify-center bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <h1 className="text-xl font-bold">${name}</h1>
      <p className="mt-1 text-xs text-[var(--mute)]">Score {score} · Use the arrows or buttons to catch drops</p>

      <div className="relative mt-6 h-96 w-64 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)]">
        {drops.map((d) => {
          const Icon = d.icon;
          return (
            <span key={d.id} className="absolute transition-all duration-150" style={{ left: \`\${d.x * 20 + 8}%\`, top: \`\${d.y}%\` }}>
              <Icon className="h-7 w-7" strokeWidth={1.8} />
            </span>
          );
        })}
        <div className="absolute bottom-3 flex w-full justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-lg transition-transform" style={{ transform: \`translateX(\${(player - 2) * 40}px)\` }}>
            <ShoppingBasket className="h-5 w-5" strokeWidth={1.8} />
          </span>
        </div>
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--canvas)]/80">
            <button onClick={() => setStarted(true)} className="rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">Start</button>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-3">
        <button onClick={() => setPlayer((p) => Math.max(0, p - 1))} className="gk-btn gk-btn-secondary gk-btn-sm">◀</button>
        <button onClick={() => setPlayer((p) => Math.min(4, p + 1))} className="gk-btn gk-btn-secondary gk-btn-sm">▶</button>
        <button onClick={() => { setStarted(false); setDrops([]); setScore(0); }} className="gk-btn gk-btn-secondary gk-btn-sm">Restart</button>
      </div>

      <p className="mt-4 text-center text-xs leading-5 text-[var(--mute)]">
        Replace with level pacing, power-ups, and difficulty settings.
      </p>
    </div>
  );
}
`,
  }),

  // ─── Games: game-3d ─────────────────────────────────────────────────────────
  "game-3d": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#101018", soft: "#1a1a26", ink: "#f0eef7", body: "#9290ab",
      mute: "#55536e", hairline: "#26243a", accent, primary: accent, onPrimary: "#101018",
      skin: "glass",
    }),
    "src/App.tsx": `import { useState } from "react";

const FACES = ["Front", "Back", "Left", "Right", "Top", "Bottom"];

export default function App() {
  const [rx, setRx] = useState(-18);
  const [ry, setRy] = useState(38);
  const [spinning, setSpinning] = useState(false);
  const [shown, setShown] = useState(0);
  const [hint, setHint] = useState<null | boolean>(null);

  const turns: Record<string, () => void> = {
    ArrowUp: () => setRx((r) => r - 20),
    ArrowDown: () => setRx((r) => r + 20),
    ArrowLeft: () => { setRy((r) => r + 20); setShown((s) => (s + 1) % FACES.length); },
    ArrowRight: () => { setRy((r) => r - 20); setShown((s) => (s + 1) % FACES.length); },
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col items-center justify-center bg-[var(--canvas)] p-6 text-[var(--ink)]">
      <h1 className="text-xl font-bold">${name}</h1>
      <p className="mt-1 text-xs text-[var(--mute)]">Current face: {FACES[shown]} · Spin the cube with the arrows</p>

      <div className="mt-8 h-64 w-64" style={{ perspective: "700px" }}>
        <div
          className="relative h-full w-full transition-transform duration-200"
          style={{
            transformStyle: "preserve-3d",
            transform: spinning ? "rotateX(360deg) rotateY(360deg)" : \`rotateX(\${rx}deg) rotateY(\${ry}deg)\`,
            animation: spinning ? "spin 6s linear infinite" : undefined,
          }}
        >
          {[
            "rotateY(0deg) translateZ(128px)",
            "rotateY(180deg) translateZ(128px)",
            "rotateY(-90deg) translateZ(128px)",
            "rotateY(90deg) translateZ(128px)",
            "rotateX(90deg) translateZ(128px)",
            "rotateX(-90deg) translateZ(128px)",
          ].map((t, i) => (
            <div key={i} className="absolute flex h-full w-full items-center justify-center rounded-xl border-2 border-[var(--accent)] bg-[var(--canvas-soft)] text-sm font-bold" style={{ transform: t }}>
              {FACES[i]}
            </div>
          ))}
        </div>
      </div>
      {spinning && <style>{\`@keyframes spin { from { transform: rotateX(0) rotateY(0); } to { transform: rotateX(360deg) rotateY(360deg); } }\`}</style>}

      <div className="mt-8 flex gap-2">
        {(["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"] as const).map((k) => (
          <button key={k} onClick={() => { turns[k](); setHint(false); }} className="gk-btn gk-btn-secondary gk-btn-sm">
            {k === "ArrowUp" ? "▲" : k === "ArrowDown" ? "▼" : k === "ArrowLeft" ? "◀" : "▶"}
          </button>
        ))}
        <button onClick={() => { setSpinning((s) => !s); setHint(null); }} className="rounded-md bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-[var(--on-primary)] hover:opacity-85">{spinning ? "Stop" : "Spin"}</button>
      </div>

      {hint === false && <p className="mt-3 text-xs text-[var(--body)]">Find face "{FACES[(shown + 3) % FACES.length]}" — replace with the challenge description.</p>}

      <p className="mt-4 text-center text-xs leading-5 text-[var(--mute)]">
        Replace with the goal of the rotation puzzle and any win condition.
      </p>
    </div>
  );
}
`,
  }),

  // ─── Desktop (PWA): business-software ──────────────────────────────────────
  "business-software": ({ name, accent }) => ({
    "src/index.css": familyCss({
      canvas: "#f8f8fa", soft: "#ececf1", ink: "#17181e", body: "#4c4e5a",
      mute: "#8f92a0", hairline: "#d9dade", accent, primary: "#17181e", onPrimary: "#f8f8fa",
      skin: "bento",
    }),
    "src/App.tsx": `import { BarChart3, Building2, FileText, Home, Users } from "lucide-react";
import { Link } from "react-router-dom";

const kpis = [
  { l: "Replace with a KPI", v: "$---" },
  { l: "Replace with a KPI", v: "---" },
  { l: "Replace with a KPI", v: "---" },
  { l: "Replace with a KPI", v: "---" },
];

const invoices = [
  { id: "#0001", client: "Replace with a client", amount: "$--", due: "Replace with a date", status: "Paid" },
  { id: "#0002", client: "Replace with a client", amount: "$--", due: "Replace with a date", status: "Pending" },
  { id: "#0003", client: "Replace with a client", amount: "$--", due: "Replace with a date", status: "Overdue" },
  { id: "#0004", client: "Replace with a client", amount: "$--", due: "Replace with a date", status: "Paid" },
  { id: "#0005", client: "Replace with a client", amount: "$--", due: "Replace with a date", status: "Pending" },
];

const statusTone: Record<string, string> = {
  Paid: "bg-[#e8f7ee] text-[#15803d]",
  Pending: "bg-[#fffbeb] text-[#a16207]",
  Overdue: "bg-[#fdeaea] text-[#b91c1c]",
};

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-52 shrink-0 border-r border-[var(--hairline)] p-4 md:block">
        <div className="flex items-center gap-2 text-sm font-bold"><Building2 className="h-4 w-4 text-[var(--accent)]" /> ${name}</div>
        <nav className="mt-6 space-y-1 text-sm text-[var(--body)]">
{[{ icon: Home, label: "Overview", to: "/" }, { icon: Users, label: "Customers", to: "/team" }, { icon: FileText, label: "Invoices", to: "/billing" }, { icon: BarChart3, label: "Reports", to: "/analytics" }].map((i) => (
<Link key={i.label} to={i.to} className={\`flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)] \${i.label === "Invoices" ? "bg-[var(--canvas-soft)] font-medium text-[var(--ink)]" : ""}\`}>
<i.icon className="h-4 w-4" /> {i.label}
</Link>
))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Invoices</h1>
          <button className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--on-primary)] hover:opacity-85">+ New invoice</button>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.l} className="gk-card-flat p-4">
              <div className="text-xl font-bold">{k.v}</div>
              <div className="mt-0.5 text-xs text-[var(--mute)]">{k.l}</div>
            </div>
          ))}
        </section>

        <section className="mt-6 gk-card-flat overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-[var(--canvas-soft)] text-xs text-[var(--mute)]">
              <tr>
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-[var(--hairline)]">
                  <td className="px-4 py-3 font-medium">{inv.id}</td>
                  <td className="px-4 py-3 text-[var(--body)]">{inv.client}</td>
                  <td className="px-4 py-3 text-[var(--body)]">{inv.amount}</td>
                  <td className="px-4 py-3 text-[var(--body)]">{inv.due}</td>
                  <td className="px-4 py-3">
                    <span className={\`rounded-full px-2.5 py-0.5 text-xs \${statusTone[inv.status]}\`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
`,
  }),
};

const APP_SOURCES: Record<string, Record<string, string>> = {
  portfolio: {
    "src/components/ProjectCard.tsx": `export interface Project {
  title: string;
  description: string;
  tags: string[];
}

export default function ProjectCard({ title, description, tags }: Project) {
  return (
    <article className="gk-card p-5 transition-shadow hover:shadow-lg">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--body)]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="gk-badge">
            {t}
          </span>
        ))}
      </div>
    </article>
  );
}
`,
    "src/App.tsx": `import { ExternalLink, Github, Mail } from "lucide-react";
import ProjectCard, { type Project } from "./components/ProjectCard";

const projects: Project[] = [
  { title: "Placeholder project one", description: "Replace this with a real project description and outcome.", tags: ["TypeScript", "React"] },
  { title: "Placeholder project two", description: "Replace this with a real project description and outcome.", tags: ["Rust", "CLI"] },
  { title: "Placeholder project three", description: "Replace this with a real project description and outcome.", tags: ["Python", "Data"] },
];

const experience = [
  { role: "Senior placeholder", company: "Company A", period: "2022 — Present", note: "Replace with real responsibilities and impact." },
  { role: "Mid-level placeholder", company: "Company B", period: "2019 — 2022", note: "Replace with real responsibilities and impact." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold">Your Name</span>
        <nav className="hidden gap-6 text-sm text-[var(--body)] sm:flex">
          <a href="#about" className="hover:text-[var(--ink)]">About</a>
          <a href="#projects" className="hover:text-[var(--ink)]">Projects</a>
          <a href="#experience" className="hover:text-[var(--ink)]">Experience</a>
          <a href="#contact" className="hover:text-[var(--ink)]">Contact</a>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Your Name</h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[var(--body)]">
          Short tagline describing what you do and what you care about building.
        </p>
        <button className="mt-8 gk-btn gk-btn-primary">
          View my work
        </button>
      </section>

      <section id="about" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-xl font-semibold">About</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--body)]">
          Replace this paragraph with a real introduction: your background, what you work on, and what you enjoy.
        </p>
      </section>

      <section id="projects" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-xl font-semibold">Projects</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => <ProjectCard key={p.title} {...p} />)}
        </div>
      </section>

      <section id="experience" className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-xl font-semibold">Experience</h2>
        <div className="mt-6 space-y-5">
          {experience.map((e) => (
            <div key={e.role} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold">{e.role} · {e.company}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--body)]">{e.note}</p>
              </div>
              <span className="shrink-0 text-xs text-[var(--mute)]">{e.period}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-xl font-semibold">Get in touch</h2>
        <p className="mt-2 text-sm text-[var(--body)]">Replace with your real email and links.</p>
        <div className="mt-5 flex items-center justify-center gap-4">
          <a href="mailto:you@example.com" className="flex items-center gap-2 text-sm text-[var(--link)]"><Mail className="h-4 w-4" /> you@example.com</a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[var(--link)]"><Github className="h-4 w-4" /> GitHub</a>
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[var(--link)]"><ExternalLink className="h-4 w-4" /> LinkedIn</a>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} Your Name
      </footer>
    </div>
  );
}
`,
  },
  saas: {
    "src/components/PricingCard.tsx": `import { Check } from "lucide-react";
import { Link } from "react-router-dom";

export interface Tier {
  name: string;
  price: string;
  period: string;
  features: string[];
  featured?: boolean;
}

export default function PricingCard({ name, price, period, features, featured }: Tier) {
  return (
    <div className={\`flex flex-col rounded-lg border p-6 \${featured ? "border-[var(--ink)] shadow-lg" : "border-[var(--hairline)]"}\`}>
      <span className="text-sm font-semibold">{name}</span>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-bold">{price}</span>
        <span className="text-xs text-[var(--mute)]">{period}</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm text-[var(--body)]">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-600" /> {f}
          </li>
        ))}
      </ul>
<Link to="/signup" className={\`mt-6 flex items-center justify-center rounded-md py-2 text-sm font-medium \${featured ? "bg-[var(--ink)] text-[var(--canvas)]" : "border border-[var(--hairline)]"}\`}>
Get started
</Link>
    </div>
  );
}
`,
    "src/App.tsx": `import PricingCard, { type Tier } from "./components/PricingCard";
import { Link } from "react-router-dom";

const tiers: Tier[] = [
  { name: "Starter", price: "$0", period: "/ month", features: ["1 project", "Community support", "Basic analytics"] },
  { name: "Pro", price: "$19", period: "/ month", features: ["Unlimited projects", "Priority support", "Advanced analytics", "API access"], featured: true },
  { name: "Enterprise", price: "Custom", period: "", features: ["SSO & audit logs", "Dedicated manager", "SLA support", "Custom contracts"] },
];

const features = [
  { title: "Feature one", text: "Replace with a real benefit for your product." },
  { title: "Feature two", text: "Replace with a real benefit for your product." },
  { title: "Feature three", text: "Replace with a real benefit for your product." },
  { title: "Feature four", text: "Replace with a real benefit for your product." },
  { title: "Feature five", text: "Replace with a real benefit for your product." },
  { title: "Feature six", text: "Replace with a real benefit for your product." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-bold">Product</span>
        <nav className="hidden gap-6 text-sm text-[var(--body)] sm:flex">
          <a href="#features" className="hover:text-[var(--ink)]">Features</a>
          <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
<Link to="/login" className="hover:text-[var(--ink)]">Log in</Link>
</nav>
<Link to="/signup" className="gk-btn gk-btn-primary gk-btn-sm">Sign up</Link>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Replace with a headline</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--body)]">
          Replace with a one-sentence value proposition for your product.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="gk-btn gk-btn-primary">Get started free</button>
          <button className="gk-btn gk-btn-secondary">Book a demo</button>
        </div>
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-xs text-[var(--mute)]">
          {["Trusted by", "Acme", "Globex", "Initech", "Umbrella"].map((l) => <span key={l} className="text-base font-semibold tracking-tight">{l}</span>)}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Everything you need</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="gk-card-flat p-5">
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Simple pricing</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => <PricingCard key={t.name} {...t} />)}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-2xl font-semibold">Ready to get started?</h2>
        <button className="mt-6 gk-btn gk-btn-primary gk-btn-lg">Start your free trial</button>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} Product
      </footer>
    </div>
  );
}
`,
  },
  dashboard: {
    "src/components/KpiCard.tsx": `interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
}

export default function KpiCard({ label, value, delta }: KpiCardProps) {
  return (
    <div className="gk-card p-4">
      <div className="text-xs text-[var(--mute)]">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      <div className={\`mt-1 text-xs \${delta.startsWith("+") ? "text-green-600" : "text-red-600"}\`}>{delta}</div>
    </div>
  );
}
`,
    "src/components/BarChart.tsx": `interface BarChartProps {
  bars: { label: string; value: number }[];
}

export default function BarChart({ bars }: BarChartProps) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="flex h-40 items-end gap-3">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full justify-center text-xs font-medium">{b.value}</div>
          <div
            className="w-full rounded-t-sm bg-[var(--ink)]/80"
            style={{ height: \`\${Math.max((b.value / max) * 100, 4)}%\` }}
          />
          <div className="text-[10px] text-[var(--mute)]">{b.label}</div>
        </div>
      ))}
    </div>
  );
}
`,
    "src/App.tsx": `import { Activity, LayoutDashboard, Settings, Users } from "lucide-react";
import KpiCard from "./components/KpiCard";
import BarChart from "./components/BarChart";

const kpis = [
  { label: "Revenue", value: "$48,912", delta: "+12%" },
  { label: "Active users", value: "12,480", delta: "+8%" },
  { label: "Conversion", value: "3.42%", delta: "+0.4%" },
];

const bars = [
  { label: "Mon", value: 40 },
  { label: "Tue", value: 65 },
  { label: "Wed", value: 55 },
  { label: "Thu", value: 85 },
  { label: "Fri", value: 70 },
  { label: "Sat", value: 45 },
  { label: "Sun", value: 60 },
];

const rows = [
  { id: 1, company: "Acme Corp", plan: "Pro", status: "Active", spent: "$1,240" },
  { id: 2, company: "Globex", plan: "Enterprise", status: "Active", spent: "$8,900" },
  { id: 3, company: "Initech", plan: "Free", status: "Trial", spent: "$0" },
];

const nav = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Analytics", icon: Activity },
  { label: "Customers", icon: Users },
  { label: "Settings", icon: Settings },
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas-soft)]">
      <aside className="hidden w-56 border-r border-[var(--hairline)] bg-[var(--canvas)] p-4 md:block">
        <div className="text-sm font-bold">Dashboard</div>
        <nav className="mt-6 space-y-1 text-sm text-[var(--body)]">
          {nav.map((n) => (
            <a key={n.label} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]">
              <n.icon className="h-4 w-4" /> {n.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
        <div className="mt-6 gk-card p-5">
          <h2 className="text-sm font-semibold">Weekly activity</h2>
          <div className="mt-4"><BarChart bars={bars} /></div>
        </div>
        <div className="mt-6 gk-card p-5">
          <h2 className="text-sm font-semibold">Customers</h2>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--mute)]">
                <th className="pb-2">Company</th>
                <th className="pb-2">Plan</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Spent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-[var(--hairline)]">
                  <td className="py-2">{r.company}</td>
                  <td className="py-2">{r.plan}</td>
                  <td className="py-2">{r.status}</td>
                  <td className="py-2 text-right">{r.spent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
`,
  },
  landing: {
    "src/App.tsx": `const features = [
  { title: "Fast", text: "Replace with a real benefit." },
  { title: "Secure", text: "Replace with a real benefit." },
  { title: "Simple", text: "Replace with a real benefit." },
];

const tiers = [
  { name: "Basic", price: "$9", features: ["1 site", "Email support"] },
  { name: "Pro", price: "$29", features: ["10 sites", "Priority support"], featured: true },
  { name: "Scale", price: "$99", features: ["Unlimited", "Dedicated support"] },
];

const faqs = [
  { q: "Question one?", a: "Replace with a real answer." },
  { q: "Question two?", a: "Replace with a real answer." },
  { q: "Question three?", a: "Replace with a real answer." },
];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-bold">Brand</span>
        <nav className="hidden gap-6 text-sm text-[var(--body)] sm:flex">
          <a href="#features" className="hover:text-[var(--ink)]">Features</a>
          <a href="#pricing" className="hover:text-[var(--ink)]">Pricing</a>
          <a href="#faq" className="hover:text-[var(--ink)]">FAQ</a>
        </nav>
        <button className="gk-btn gk-btn-secondary gk-btn-sm">Get started</button>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Replace with a bold headline</h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[var(--body)]">
          Replace with a supporting sentence that explains the headline.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button className="gk-btn gk-btn-primary">Start free</button>
          <button className="gk-btn gk-btn-secondary">See how it works</button>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="gk-card-flat p-6">
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">Pricing</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={\`rounded-lg border p-6 \${t.featured ? "border-[var(--ink)] shadow-lg" : "border-[var(--hairline)]"}\`}>
              <div className="text-sm font-semibold">{t.name}</div>
              <div className="mt-2 text-3xl font-bold">{t.price}<span className="text-xs font-normal text-[var(--mute)]">/mo</span></div>
              <ul className="mt-4 space-y-2 text-sm text-[var(--body)]">
                {t.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              <button className="mt-6 w-full gk-btn gk-btn-secondary">Choose {t.name}</button>
            </div>
          ))}
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-center text-2xl font-semibold">FAQ</h2>
        <div className="mt-8 space-y-4">
          {faqs.map((f) => (
            <details key={f.q} className="gk-card-flat p-4">
              <summary className="cursor-pointer text-sm font-medium">{f.q}</summary>
              <p className="mt-2 text-sm leading-6 text-[var(--body)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} Brand
      </footer>
    </div>
  );
}
`,
  },
  ecommerce: {
    "src/components/ProductCard.tsx": `import type { LucideIcon } from "lucide-react";

export interface Product {
  title: string;
  price: string;
  icon: LucideIcon;
}

export default function ProductCard({ title, price, icon: Icon }: Product) {
  return (
    <div className="gk-card overflow-hidden">
      <div className="flex h-40 items-center justify-center bg-gradient-to-br from-[var(--canvas-soft)] to-[var(--canvas-soft-2)]">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--canvas)] shadow-[var(--ds-3)]">
          <Icon className="h-8 w-8 text-[var(--ink)]" strokeWidth={1.5} />
        </span>
      </div>
      <div className="p-4">
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-1 text-sm text-[var(--body)]">{price}</div>
        <button className="mt-3 w-full gk-btn gk-btn-secondary gk-btn-sm">
          Add to cart
        </button>
      </div>
    </div>
  );
}
`,
    "src/App.tsx": `import { Armchair, BookOpen, Headphones, Package, ShoppingCart, SprayCan, Watch } from "lucide-react";
import ProductCard, { type Product } from "./components/ProductCard";

const products: Product[] = [
  { title: "Placeholder product", price: "$24.00", icon: Package },
  { title: "Placeholder product", price: "$39.00", icon: Headphones },
  { title: "Placeholder product", price: "$12.50", icon: SprayCan },
  { title: "Placeholder product", price: "$89.00", icon: Watch },
  { title: "Placeholder product", price: "$19.00", icon: BookOpen },
  { title: "Placeholder product", price: "$59.00", icon: Armchair },
];

const categories = ["All", "New", "Best sellers", "Sale"];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-sm font-bold">Store</span>
        <nav className="hidden items-center gap-6 text-sm text-[var(--body)] sm:flex">
{categories.map((c) => (
<Link key={c} to="/shop" className="hover:text-[var(--ink)]">{c}</Link>
))}
        </nav>
        <button className="gk-btn gk-btn-icon relative">
          <ShoppingCart className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--ink)] text-[10px] text-[var(--canvas)]">0</span>
        </button>
      </header>

      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-lg bg-[var(--canvas-soft)] px-6 py-16 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Replace with a seasonal headline</h1>
          <p className="mt-3 text-sm text-[var(--body)]">Replace with a short promo message.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => <ProductCard key={p.title + p.price} {...p} />)}
        </div>
      </section>

      <footer className="mx-auto mt-16 max-w-6xl border-t border-[var(--hairline)] px-6 py-8 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} Store
      </footer>
    </div>
  );
}
`,
  },
  "ai-app": {
    "src/App.tsx": `import { Send } from "lucide-react";

const examples = [
  "Summarize my notes",
  "Draft an email about…",
  "Explain this code snippet",
];

export default function App() {
  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-60 flex-col border-r border-[var(--hairline)] p-4 md:flex">
        <div className="text-sm font-bold">Copilot</div>
        <div className="mt-6 text-xs font-medium text-[var(--mute)]">Example prompts</div>
        <div className="mt-2 space-y-2">
          {examples.map((e) => (
            <button key={e} className="w-full gk-btn gk-btn-secondary gk-btn-sm text-left">
              {e}
            </button>
          ))}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex justify-end">
            <div className="max-w-md rounded-lg rounded-br-sm bg-[var(--ink)] px-4 py-2.5 text-sm text-[var(--canvas)]">
              Hello! What can you help me with?
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-md rounded-lg rounded-bl-sm border border-[var(--hairline)] bg-[var(--canvas-soft)] px-4 py-2.5 text-sm">
              Greetings! I'm Copilot. Ask me anything — replace this welcome message with real onboarding copy.
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--hairline)] p-4">
          <div className="flex items-center gap-2 rounded-md border border-[var(--hairline)] px-3 py-2 focus-within:border-[var(--ink)]">
            <input
              placeholder="Ask anything…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--mute)]"
            />
            <button className="gk-btn gk-btn-icon gk-btn-primary">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
`,
  },
  arcade: {
    "src/game.ts": `export type Cell = "X" | "O" | null;
export type Board = Cell[];

export const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(b: Board): Cell {
  for (const [a, c, d] of WIN_LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}

export function emptyCells(b: Board): number[] {
  return b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
}

export function bestMove(b: Board, player: "X" | "O", difficulty: "easy" | "hard"): number {
  const cells = emptyCells(b);
  if (cells.length === 0) return -1;
  if (difficulty === "easy" && Math.random() < 0.4) {
    return cells[Math.floor(Math.random() * cells.length)]!;
  }
  let best = -1;
  let bestScore = -Infinity;
  for (const i of cells) {
    const next = [...b];
    next[i] = player;
    const score = minimax(next, player === "X" ? "O" : "X", player);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

function minimax(b: Board, turn: "X" | "O", ai: "X" | "O"): number {
  const w = winner(b);
  if (w === ai) return 10;
  if (w && w !== ai) return -10;
  const cells = emptyCells(b);
  if (cells.length === 0) return 0;
  const scores = cells.map((i) => {
    const next = [...b];
    next[i] = turn;
    return minimax(next, turn === "X" ? "O" : "X", ai);
  });
  return turn === ai ? Math.max(...scores) : Math.min(...scores);
}
`,
    "src/App.tsx": `import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { bestMove, winner, emptyCells, type Board } from "./game";

const SIZE = 3;

export default function App() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [human, setHuman] = useState<"X" | "O">("X");
  const [difficulty, setDifficulty] = useState<"easy" | "hard">("hard");
  const [scores, setScores] = useState({ human: 0, ai: 0 });
  const humanRef = useRef(human);
  const boardRef = useRef(board);

  useEffect(() => {
    humanRef.current = human;
    boardRef.current = board;
  });

  useEffect(() => {
    const w = winner(board);
    if (w || emptyCells(board).length === 0) return;
    const ai = human === "X" ? "O" : "X";
    if (emptyCells(board).length % 2 === (human === "X" ? 1 : 0)) return;
    const t = setTimeout(() => {
      const move = bestMove(boardRef.current, ai, difficulty);
      if (move < 0) return;
      setBoard((prev) => {
        const next = [...prev];
        next[move] = ai;
        return next;
      });
    }, 450);
    return () => clearTimeout(t);
  }, [board, human, difficulty]);

  const play = (i: number) => {
    if (board[i] || winner(board)) return;
    const next = [...board];
    next[i] = human;
    setBoard(next);
    const w = winner(next);
    if (w || emptyCells(next).length === 0) {
      if (w === human) setScores((s) => ({ ...s, human: s.human + 1 }));
      if (w && w !== human) setScores((s) => ({ ...s, ai: s.ai + 1 }));
    }
  };

  const restart = () => {
    setBoard(Array(9).fill(null));
    setScores({ human: 0, ai: 0 });
  };

  const status = winner(board)
    ? winner(board) === human ? "You win!" : "AI wins"
    : emptyCells(board).length === 0
      ? "Draw"
      : human === "X" ? "Your turn" : "AI is thinking…";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--canvas)] text-[var(--ink)]">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">Tic-tac-toe</h1>
        <p className="mt-1 text-xs text-[var(--mute)]">
          You: X · AI: O · {difficulty === "hard" ? "Unbeatable" : "Easy"} mode
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => play(i)}
            disabled={!!cell || !!winner(board)}
            className="flex h-20 w-20 items-center justify-center rounded-md border border-[var(--hairline)] text-3xl font-bold transition-colors hover:bg-[var(--canvas-soft)] disabled:cursor-default disabled:hover:bg-transparent"
          >
            {cell}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <span className="text-[var(--body)]">You <b>{scores.human}</b></span>
        <span className="text-sm font-semibold">{status}</span>
        <span className="text-[var(--body)]"><b>{scores.ai}</b> AI</span>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "easy" | "hard")}
          className="gk-input gk-input-sm"
        >
          <option value="easy">Easy</option>
          <option value="hard">Unbeatable</option>
        </select>
        <button onClick={restart} className="gk-btn gk-btn-primary gk-btn-sm">
          <RotateCcw className="h-3.5 w-3.5" /> Restart
        </button>
      </div>
    </div>
  );
}
`,
  },
  blog: {
    "src/components/PostCard.tsx": `export interface Post {
  title: string;
  excerpt: string;
  date: string;
  minutes: string;
  tags: string[];
}

export default function PostCard({ title, excerpt, date, minutes, tags }: Post) {
  return (
    <article className="gk-card-flat gk-card-hover p-5">
      <div className="flex items-center gap-2 text-xs text-[var(--mute)]">
        <span>{date}</span>
        <span>·</span>
        <span>{minutes} min read</span>
      </div>
      <h3 className="mt-2 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[var(--body)]">{excerpt}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="gk-badge">{t}</span>
        ))}
      </div>
    </article>
  );
}
`,
    "src/App.tsx": `import { Mail, PenLine } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import PostCard, { type Post } from "./components/PostCard";

const posts: Post[] = [
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary of the post.", date: "Jan 5, 2026", minutes: "6", tags: ["React", "Design"] },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary of the post.", date: "Dec 18, 2025", minutes: "4", tags: ["TypeScript"] },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary of the post.", date: "Nov 30, 2025", minutes: "9", tags: ["Career"] },
  { title: "Replace with a post title", excerpt: "Replace with a two-sentence summary of the post.", date: "Nov 2, 2025", minutes: "3", tags: ["Tools"] },
];

const topics = ["All", "React", "TypeScript", "Design", "Career", "Tools"];

export default function App() {
const [topic, setTopic] = useState("All");
return (
<div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
<header className="border-b border-[var(--hairline)]">
<div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
<span className="text-sm font-bold">The Blog</span>
<nav className="flex items-center gap-6 text-sm text-[var(--body)]">
<Link to="/blog" className="hover:text-[var(--ink)]">Articles</Link>
<Link to="/about" className="hover:text-[var(--ink)]">About</Link>
</nav>
</div>
</header>

      <section className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight">Replace with a blog name or tagline</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--body)]">
          Replace with a sentence about what you write about and for whom.
        </p>
<div className="mt-6 flex flex-wrap gap-2">
{topics.map((t) => (
<button key={t} onClick={() => setTopic(t)} className={\`gk-btn gk-btn-sm \${topic === t ? "gk-btn-primary" : "gk-btn-secondary"}\`}>{t}</button>
))}
</div>
</section>

<main className="mx-auto max-w-3xl px-6">
<div className="rounded-lg bg-[var(--canvas-soft)] p-6">
<div className="flex items-center gap-2 text-xs text-[var(--mute)]">
<PenLine className="h-3.5 w-3.5" /> Featured post
</div>
<h2 className="mt-2 text-xl font-semibold">Replace with the featured post title</h2>
<p className="mt-2 text-sm leading-6 text-[var(--body)]">Replace with a longer summary that draws readers in.</p>
</div>
<div className="mt-8 grid gap-4">
{posts.filter((p) => topic === "All" || p.tags.includes(topic)).map((p) => <PostCard key={p.title} {...p} />)}
</div>
</main>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="gk-card-flat p-6 text-center">
          <h2 className="text-lg font-semibold">Join the newsletter</h2>
          <p className="mt-2 text-sm text-[var(--body)]">Replace with a short pitch for subscribing.</p>
          <form className="mx-auto mt-4 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="you@example.com" className="gk-input flex-1" />
            <button className="gk-btn gk-btn-primary gk-btn-sm"><Mail className="h-4 w-4" /> Subscribe</button>
          </form>
        </div>
      </section>

      <footer className="border-t border-[var(--hairline)] py-8 text-center text-xs text-[var(--mute)]">
        © {new Date().getFullYear()} The Blog
      </footer>
    </div>
  );
}
`,
  },
  docs: {
    "src/App.tsx": `import { BookOpen, ChevronRight, Copy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

const nav = [
  { group: "Getting started", items: ["Introduction", "Installation", "Quickstart"] },
  { group: "Guides", items: ["Configuration", "Deployment", "Migrating"] },
  { group: "Reference", items: ["CLI", "API", "Changelog"] },
];

const code = \`npm create ride@latest my-app
cd my-app
npm run dev\`;

export default function App() {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-[var(--hairline)] p-5 lg:block">
        <div className="flex items-center gap-2 text-sm font-bold"><BookOpen className="h-4 w-4" /> Docs</div>
        {nav.map((g) => (
          <div key={g.group} className="mt-6">
            <div className="text-xs font-semibold text-[var(--mute)]">{g.group}</div>
            <div className="mt-2 space-y-1">
{g.items.map((i) => (
<Link key={i} to="/docs" className="block rounded-md px-2 py-1.5 text-sm text-[var(--body)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]">{i}</Link>
))}
            </div>
          </div>
        ))}
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <h1 className="text-3xl font-bold tracking-tight">Introduction</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--body)]">
            Replace this page with real documentation: what the product does, who it is for, and the first steps to get going.
          </p>
          <h2 className="mt-10 text-xl font-semibold">Installation</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--body)]">Replace with the actual install steps for your project.</p>
          <div className="relative mt-4 rounded-lg bg-[#171717] p-4 text-sm text-[#e5e5e5]">
            <pre className="overflow-x-auto">{\`\${code}\`}</pre>
            <button onClick={copy} className="absolute top-3 right-3 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs">
              <Copy className="h-3 w-3" /> {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <h2 className="mt-10 text-xl font-semibold">Next steps</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--body)]">Point readers at the next page to keep them moving.</p>
          <div className="mt-8 flex items-center justify-between border-t border-[var(--hairline)] pt-6 text-sm">
<Link to="/docs" className="text-[var(--link)]">← Previous</Link>
<Link to="/docs" className="flex items-center gap-1 text-[var(--link)]">Next page <ChevronRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </main>
    </div>
  );
}
`,
  },
  social: {
    "src/App.tsx": `import { Heart, MessageCircle, Repeat2, Search, Share2 } from "lucide-react";

const me = { name: "you", initials: "Y" };

const posts = [
  { id: 1, author: "Replace with a name", handle: "@handle", time: "2h", text: "Replace this post with real content for your community.", likes: 12, replies: 3, reposts: 1 },
  { id: 2, author: "Replace with a name", handle: "@handle", time: "5h", text: "Another placeholder post to be replaced.", likes: 8, replies: 1, reposts: 0 },
  { id: 3, author: "Replace with a name", handle: "@handle", time: "1d", text: "One more placeholder post to be replaced.", likes: 24, replies: 6, reposts: 2 },
];

const suggested = [
  { name: "Suggest follow", handle: "@handle" },
  { name: "Suggest follow", handle: "@handle" },
  { name: "Suggest follow", handle: "@handle" },
];

const tabs = ["For you", "Following"];

export default function App() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
        <span className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)]">{me.initials}</span><span className="text-base font-bold">{me.name}</span></span>
        <div className="flex items-center gap-4 text-[var(--body)]">
          <button className="gk-btn gk-btn-icon"><Search className="h-4 w-4" /></button>
          <button className="gk-btn gk-btn-primary gk-btn-sm">Post</button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl">
        <div className="flex gap-6 border-b border-[var(--hairline)] px-4 text-sm">
          {tabs.map((t, i) => (
            <button key={t} className={\`-mb-px border-b-2 py-3 \${i === 0 ? "border-[var(--ink)] font-semibold" : "border-transparent text-[var(--mute)]"}\`}>{t}</button>
          ))}
        </div>

        <div className="border-b border-[var(--hairline)] p-4">
          <textarea placeholder="What's happening?" className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[var(--mute)]" rows={3} />
          <div className="flex justify-end">
            <button className="gk-btn gk-btn-primary gk-btn-sm">Post</button>
          </div>
        </div>

        {posts.map((p) => (
          <article key={p.id} className="border-b border-[var(--hairline)] p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{p.author}</span>
              <span className="text-xs text-[var(--mute)]">{p.handle} · {p.time}</span>
            </div>
            <p className="mt-2 text-sm leading-6">{p.text}</p>
            <div className="mt-3 flex items-center gap-8 text-xs text-[var(--mute)]">
              <button className="flex items-center gap-1.5 hover:text-[var(--ink)]"><MessageCircle className="h-4 w-4" /> {p.replies}</button>
              <button className="flex items-center gap-1.5 hover:text-[var(--ink)]"><Repeat2 className="h-4 w-4" /> {p.reposts}</button>
              <button className="flex items-center gap-1.5 hover:text-[var(--ink)]"><Heart className="h-4 w-4" /> {p.likes}</button>
              <button className="flex items-center gap-1.5 hover:text-[var(--ink)]"><Share2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </div>

      <aside className="fixed top-16 right-4 hidden w-64 gk-card-flat p-4 lg:block">
        <div className="text-sm font-semibold">Who to follow</div>
        <div className="mt-3 space-y-3">
          {suggested.map((s) => (
            <div key={s.handle} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-[var(--mute)]">{s.handle}</div>
              </div>
              <button className="gk-btn gk-btn-secondary gk-btn-sm">Follow</button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
`,
  },
  pwa: {
    "src/App.tsx": `import { Armchair, Battery, BookOpen, Headphones, Home, Package, Search, Settings, ShoppingBag, SprayCan, MessageSquare, Watch } from "lucide-react";
import { useState } from "react";

const tabs = [
  { id: "home", label: "Home", icon: Home },
  { id: "search", label: "Search", icon: Search },
  { id: "cart", label: "Cart", icon: ShoppingBag },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "more", label: "More", icon: Settings },
];

const items = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  title: \`Replace with item \${i + 1}\`,
  note: "Replace with a short description.",
  icon: [Package, Headphones, SprayCan, Watch, BookOpen, Armchair, Settings, Battery][i % 8],
}));

export default function App() {
  const [tab, setTab] = useState("home");

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col border-x border-[var(--hairline)]">
      <header className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--on-primary)]">R</span><span className="text-base font-bold">Ride App</span></span>
        <span className="text-xs text-[var(--mute)]">Offline-ready</span>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <h1 className="text-xl font-bold tracking-tight">Replace with a headline</h1>
        <p className="mt-1 text-sm leading-6 text-[var(--body)]">Replace with a one-line description of this app.</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="gk-card-flat p-3">
                <Icon className="h-7 w-7 text-[var(--primary)]" strokeWidth={1.6} />
                <div className="mt-2 text-sm font-medium">{item.title}</div>
                <div className="mt-0.5 text-xs text-[var(--body)]">{item.note}</div>
                <button className="mt-3 w-full gk-btn gk-btn-primary gk-btn-sm">Action</button>
              </div>
            );
          })}
        </div>
      </main>

      <nav className="fixed bottom-0 left-1/2 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-[var(--hairline)] bg-[var(--canvas)] py-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={\`flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] \${tab === t.id ? "text-[var(--ink)]" : "text-[var(--mute)]"}\`}>
            <t.icon className="h-5 w-5" /> {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
`,
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   Multi-page product shell — end-to-end templates
   Every React web template ships as a complete product: the family's
   signature design becomes the home page (src/home.tsx) and a shared
   router shell (src/App.tsx) adds real, working secondary pages — auth,
   dashboard, settings, billing, and category-specific experiences.
   ═══════════════════════════════════════════════════════════════════════ */

/** Single-screen archetypes (games, PWAs) keep their focused frame. */
const SHELL_EXCLUDED = new Set(["pwa", "arcade"]);

const PACK_BY_FAMILY: Record<string, string[]> = {
  portfolio: ["core", "work", "publish", "app"],
  personal: ["core", "work", "publish", "app"],
  agency: ["core", "work", "app"],
  startup: ["core", "app"],
  saas: ["core", "app"],
  finance: ["core", "app"],
  healthcare: ["core", "app"],
  event: ["core", "app"],
  blog: ["core", "publish", "app"],
  documentation: ["core", "docs", "app"],
  restaurant: ["core", "food", "app"],
  hotel: ["core", "food", "app"],
  education: ["core", "learn", "app"],
  "real-estate": ["core", "work", "app"],
  ecommerce: ["core", "store", "app"],
  marketplace: ["core", "store", "app"],
  crm: ["core", "workspace", "app"],
  erp: ["core", "workspace", "app"],
  "admin-panel": ["core", "workspace", "app"],
  analytics: ["core", "workspace", "app"],
  "project-management": ["core", "workspace", "app"],
  "business-software": ["core", "workspace", "app"],
  "learning-platform": ["core", "learn", "app"],
  rag: ["core", "app"],
};

const PACK_BY_ARCHETYPE: Record<string, string[]> = {
  portfolio: ["core", "work", "publish", "app"],
  landing: ["core", "app"],
  saas: ["core", "app"],
  dashboard: ["core", "workspace", "app"],
  ecommerce: ["core", "store", "app"],
  blog: ["core", "publish", "app"],
  docs: ["core", "docs", "app"],
  social: ["core", "app"],
  "ai-app": ["core", "app"],
};

const DEFAULT_PACK = ["core", "app"];

function shellPacksFor(familyId: string, archetype: string): string[] | null {
  if (SHELL_EXCLUDED.has(archetype)) return null;
  return PACK_BY_FAMILY[familyId] ?? PACK_BY_ARCHETYPE[archetype] ?? DEFAULT_PACK;
}

/** Secondary-navigation links for the shell pages, derived from the page packs. */
function shellNav(name: string, packs: string[]): Array<{ to: string; label: string }> {
  const nav: Array<{ to: string; label: string }> = [{ to: "/about", label: "About" }];
  if (packs.includes("work")) nav.push({ to: "/work", label: "Work" });
  if (packs.includes("publish")) nav.push({ to: "/blog", label: "Journal" });
  if (packs.includes("docs")) nav.push({ to: "/docs", label: "Docs" });
  if (packs.includes("learn")) nav.push({ to: "/courses", label: "Courses" });
  if (packs.includes("store")) nav.push({ to: "/shop", label: "Shop" });
  if (packs.includes("food")) nav.push({ to: "/menu", label: "Menu" });
  if (packs.includes("workspace")) nav.push({ to: "/projects", label: "Projects" });
  if (packs.includes("app")) nav.push({ to: "/dashboard", label: "Dashboard" });
  nav.push({ to: "/contact", label: "Contact" });
  return nav;
}

const SHELL_MAIN = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`;

function shellPackageJson(name: string): string {
  return JSON.stringify(
    {
      name: slug(name),
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: { dev: "vite", build: "tsc -b && vite build", preview: "vite preview" },
      dependencies: { react: "^19.0.0", "react-dom": "^19.0.0", "react-router-dom": "^7.1.0", "lucide-react": "^0.475.0" },
      devDependencies: {
        "@tailwindcss/vite": "^4.1.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.4.0",
        tailwindcss: "^4.1.0",
        typescript: "^5.9.0",
        vite: "^7.0.0",
      },
    },
    null,
    2,
  );
}

const SHELL_CSS = `
/* ── Multi-page shell primitives ─────────────────────────────────── */
.gk-skeleton { position: relative; overflow: hidden; border-radius: 8px; background: var(--canvas-soft); }
.gk-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent); animation: gk-shimmer 1.4s infinite; }
@keyframes gk-shimmer { 100% { transform: translateX(100%); } }
.page-hero { position: relative; overflow: hidden; }
.page-hero::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle at 1px 1px, var(--hairline) 1px, transparent 0); background-size: 24px 24px; -webkit-mask-image: linear-gradient(to bottom, black, transparent 85%); mask-image: linear-gradient(to bottom, black, transparent 85%); pointer-events: none; }
.page-hero::after { content: ""; position: absolute; top: -45%; left: 50%; width: 620px; height: 620px; transform: translateX(-50%); background: radial-gradient(circle, color-mix(in srgb, var(--accent) 15%, transparent), transparent 65%); pointer-events: none; }
.gk-prose { line-height: 1.75; color: var(--body); }
.gk-prose h2 { color: var(--ink); font-size: 1.25rem; font-weight: 700; margin: 2rem 0 0.75rem; }
.gk-prose h3 { color: var(--ink); font-size: 1.05rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
.gk-prose p { margin: 0.75rem 0; }
.gk-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.75rem 0; }
.gk-prose li { margin: 0.35rem 0; }
.gk-prose code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875em; background: var(--canvas-soft); border: 1px solid var(--hairline); border-radius: 6px; padding: 0.1em 0.35em; }
.gk-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; background: var(--canvas-soft); border: 1px solid var(--hairline); border-radius: 12px; padding: 1rem 1.25rem; overflow-x: auto; color: var(--body); }
.gk-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.gk-table th { text-align: left; font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--hairline); padding: 0.6rem 0.75rem; }
.gk-table td { border-bottom: 1px solid var(--hairline); padding: 0.6rem 0.75rem; color: var(--body); }
.gk-chip { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 999px; border: 1px solid var(--hairline); background: var(--canvas); padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 500; color: var(--body); transition: all 0.15s ease; }
.gk-chip-active { border-color: var(--ink); background: var(--ink); color: var(--on-primary); }
.gk-progress-bar { height: 8px; border-radius: 999px; background: var(--canvas-soft); overflow: hidden; }
.gk-progress-bar > div { height: 100%; border-radius: 999px; background: var(--ink); transition: width 0.6s ease; }
.gk-tile { display: flex; align-items: center; justify-content: center; border-radius: 14px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--canvas)), color-mix(in srgb, var(--accent) 6%, var(--canvas-soft))); border: 1px solid var(--hairline); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .gk-skeleton::after { animation: none; } }
`;

const PAGES_LIB = `import { Component, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X } from "lucide-react";

export interface NavLink {
  to: string;
  label: string;
}

/* Scroll-reveal: unobtrusive entrance with IntersectionObserver. */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("gk-reveal-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("gk-reveal-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={\`gk-reveal \${className}\`} style={delay ? { animationDelay: \`\${delay}ms\` } : undefined}>
      {children}
    </div>
  );
}

/* Full-page frame: sticky glass nav with mobile menu, content, footer. */
export function PageShell({ brand, nav, children }: { brand: string; nav: NavLink[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="gk-sticky-nav sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--canvas)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Home">
            <span className="gk-logo-mark">{brand.charAt(0).toUpperCase()}</span>
            <span className="gk-logo">{brand}</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {nav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/login" className="gk-btn gk-btn-ghost gk-btn-sm">
              Log in
            </Link>
            <Link to="/signup" className="gk-btn gk-btn-primary gk-btn-sm">
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="gk-btn gk-btn-icon md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <nav aria-label="Mobile" className="border-t border-[var(--hairline)] px-4 pb-4 pt-2 md:hidden">
            {nav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-[var(--body)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex gap-2">
              <Link to="/login" onClick={() => setOpen(false)} className="gk-btn gk-btn-ghost flex-1">
                Log in
              </Link>
              <Link to="/signup" onClick={() => setOpen(false)} className="gk-btn gk-btn-primary flex-1">
                Get started
              </Link>
            </div>
          </nav>
        )}
      </header>
      <main className="min-h-[60vh]">{children}</main>
      <footer className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="gk-logo-mark">{brand.charAt(0).toUpperCase()}</span>
              <span className="gk-logo">{brand}</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-[var(--mute)]">
              Built to feel like a real product from the first click. Pages, auth, and flows included.
            </p>
          </div>
          <div>
            <h3 className="gk-chip">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {nav.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="gk-chip">Product</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/dashboard" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Dashboard</Link></li>
              <li><Link to="/settings" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Settings</Link></li>
              <li><Link to="/billing" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Billing</Link></li>
              <li><Link to="/login" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Log in</Link></li>
              <li><Link to="/signup" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Get started</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="gk-chip">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">About</Link></li>
              <li><Link to="/contact" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Contact</Link></li>
              <li><Link to="/privacy" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Privacy</Link></li>
              <li><Link to="/terms" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[var(--hairline)]">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[var(--mute)] sm:px-6">
            © {new Date().getFullYear()} {brand}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* Page hero with grid + glow backdrop. */
export function PageHero({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <section className="page-hero relative px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-20">
      <div className="relative mx-auto max-w-3xl">
        <p className="gk-chip">{eyebrow}</p>
        <h1 className="gk-gradient-text mt-5 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {sub && <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--body)]">{sub}</p>}
        {children}
      </div>
    </section>
  );
}

export function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="gk-chip">{eyebrow}</p>
      <h2 className="mt-4 text-3xl font-bold tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-base leading-7 text-[var(--body)]">{sub}</p>}
    </div>
  );
}

/* Labelled form field with hint + validation error. */
export function Field({
  label, id, error, hint, ...rest
}: { label: string; id: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)]">{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? \`\${id}-error\` : hint ? \`\${id}-hint\` : undefined}
        className="gk-input w-full"
        {...rest}
      />
      {hint && !error && <p id={\`\${id}-hint\`} className="text-xs text-[var(--mute)]">{hint}</p>}
      {error && <p id={\`\${id}-error\`} className="text-xs font-medium text-[var(--error)]">{error}</p>}
    </div>
  );
}

/* Loading / empty / error states. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={\`gk-skeleton \${className}\`} />;
}

export function EmptyState({ title, body, icon, action }: { title: string; body: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="gk-card flex flex-col items-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--canvas-soft)] text-[var(--mute)]">{icon}</div>}
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--body)]">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="gk-card flex flex-col items-center px-6 py-12 text-center" role="alert">
      <h3 className="text-base font-semibold text-[var(--error)]">Something went wrong</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-[var(--body)]">{message}</p>
      <button type="button" onClick={onRetry} className="gk-btn gk-btn-ghost mt-4 gk-btn-sm">
        Try again
      </button>
    </div>
  );
}

export function Stat({ label, value, delta, icon }: { label: string; value: string; delta?: string; icon?: ReactNode }) {
  return (
    <div className="gk-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--mute)]">{label}</p>
        {icon && <span className="text-[var(--mute)]">{icon}</span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {delta && <p className="mt-1 text-xs font-medium text-[var(--success)]">{delta}</p>}
    </div>
  );
}

export function SuccessBanner({ title, body }: { title: string; body: string }) {
  return (
    <div className="gk-card gk-card-accent flex items-start gap-3 border border-[var(--success)]/30 p-4" role="status">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2 6.5L4.5 9L10 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm leading-6 text-[var(--body)]">{body}</p>
      </div>
    </div>
  );
}

/* Data-loading hook: loading skeleton → data or error with retry. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    setError(null);
    fn()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading, reload };
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] px-4">
          <div className="gk-card max-w-md p-8 text-center">
            <h1 className="text-lg font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--body)]">
              The page hit an unexpected error. Go back home and try again.
            </p>
            <Link to="/" className="gk-btn gk-btn-primary mt-5 gk-btn-sm">
              Back to home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
`;

/** Core product pages shared by every multi-page template. */
const PAGES_CORE = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Globe, Lock, Mail, MapPin, MessageSquare, Phone, Send, ShieldCheck } from "lucide-react";
import { PageShell, PageHero, SectionHead, Field, Reveal, Stat, SuccessBanner, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const emailOk = (v: string) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(v);

export function AboutPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="About us" title="Built to be used, not just admired" sub="A real product in every template: working pages, working flows, working details." />
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <p className="gk-chip">Our story</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Why ${name} exists</h2>
            <p className="mt-4 leading-7 text-[var(--body)]">
              Replace with a short line about the company's story.
            </p>
            <p className="mt-4 leading-7 text-[var(--body)]">
              Every section on this page ships complete: copy, states, and links that go somewhere real.
              Nothing here is decorative, and nothing breaks when you click it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/contact" className="gk-btn gk-btn-primary">
                Talk to us
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/work" className="gk-btn gk-btn-ghost">See what we do</Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Projects shipped" value="120+" delta="+18 this year" />
              <Stat label="Team members" value="24" delta="6 new this quarter" />
              <Stat label="Avg. satisfaction" value="4.9/5" delta="Across 800+ reviews" />
              <Stat label="Support response" value="< 2h" delta="Measured weekly" />
            </div>
          </Reveal>
        </div>
      </section>
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHead eyebrow="Values" title="How we work" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Quality over speed", body: "Done well beats done fast. We take the extra pass on every detail that matters." },
              { icon: Globe, title: "Open by default", body: "Transparent decisions, public roadmaps, and changelogs you can actually read." },
              { icon: Lock, title: "Privacy first", body: "Your data belongs to you. We collect the minimum and protect everything we hold." },
            ].map((v) => (
              <Reveal key={v.title} delay={80}>
                <article className="gk-card gk-card-hover h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--on-primary)]">
                    <v.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{v.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--body)]">{v.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="px-4 pb-14 pt-6 sm:px-6">
        <div className="gk-card mx-auto max-w-4xl p-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Want to work with us?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[var(--body)]">
            We reply to every message within one business day.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link to="/signup" className="gk-btn gk-btn-primary">Get started</Link>
            <Link to="/contact" className="gk-btn gk-btn-ghost">Contact sales</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function ContactPage() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: "", email: "", subject: "General enquiry", message: "" });
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!emailOk(form.email)) errs.email = "Enter a valid email address.";
    if (form.message.trim().length < 10) errs.message = "Tell us a little more (10+ characters).";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 900);
  };
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Contact" title="We reply within one business day" sub="Questions, feedback, or a project in mind — the form below lands directly in the team inbox." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-5">
          <Reveal className="lg:col-span-3">
            <div className="gk-card p-6 sm:p-8">
              {sent ? (
                <SuccessBanner title="Message sent" body="Thanks for reaching out. We read everything and will get back to you within one business day." />
              ) : (
                <form onSubmit={submit} noValidate className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Your name" id="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Ada Lovelace" autoComplete="name" />
                    <Field label="Email" id="email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="block text-sm font-medium text-[var(--ink)]">Subject</label>
                    <select id="subject" value={form.subject} onChange={set("subject")} className="gk-input w-full">
                      <option>General enquiry</option>
                      <option>Sales</option>
                      <option>Support</option>
                      <option>Partnerships</option>
                      <option>Press</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="block text-sm font-medium text-[var(--ink)]">Message</label>
                    <textarea id="message" rows={5} value={form.message} onChange={set("message")} aria-invalid={errors.message ? true : undefined} aria-describedby={errors.message ? "message-error" : undefined} className="gk-input w-full resize-y" placeholder="Tell us about the project or question…" />
                    {errors.message && <p id="message-error" className="text-xs font-medium text-[var(--error)]">{errors.message}</p>}
                  </div>
                  <button type="submit" disabled={sending} className="gk-btn gk-btn-primary gk-btn-lg w-full sm:w-auto">
                    {sending ? "Sending…" : "Send message"}
                    {!sending && <Send className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
          <Reveal delay={120} className="lg:col-span-2">
            <div className="space-y-4">
              {[
                { icon: Mail, title: "Email", body: "Replace with the support email address.", href: "mailto:hello@ride.dev" },
                { icon: Phone, title: "Phone", body: "Replace with the phone number.", href: "tel:+14155550132" },
                { icon: MapPin, title: "Office", body: "Replace with the full street address." },
                { icon: MessageSquare, title: "Live chat", body: "Available Mon–Fri, 9am–6pm.", href: "/dashboard" },
              ].map((c) => (
                <article key={c.title} className="gk-card gk-card-hover flex items-start gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas-soft)] text-[var(--ink)]">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    {c.href ? (
                      <a href={c.href} className="mt-0.5 block text-sm text-[var(--link)] hover:underline">{c.body}</a>
                    ) : (
                      <p className="mt-0.5 text-sm text-[var(--body)]">{c.body}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", terms: false });
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (mode === "signup" && form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!emailOk(form.email)) errs.email = "Enter a valid email address.";
    if (form.password.length < 8) errs.password = "Use at least 8 characters.";
    if (mode === "signup" && !form.terms) errs.terms = "Please accept the terms to continue.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setTimeout(() => navigate("/dashboard"), 800);
  };
  return (
    <div className="gk-card mx-auto w-full max-w-md p-6 sm:p-8">
      <div className="text-center">
        <span className="gk-logo-mark mx-auto flex h-12 w-12 items-center justify-center text-lg">${name.charAt(0).toUpperCase()}</span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1.5 text-sm text-[var(--mute)]">
          {mode === "login" ? "Log in to continue to the dashboard." : "Free to start. No credit card required."}
        </p>
      </div>
      <form onSubmit={submit} noValidate className="mt-7 space-y-5">
        {mode === "signup" && (
          <Field label="Full name" id="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Ada Lovelace" autoComplete="name" />
        )}
        <Field label="Email" id="email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--ink)]">Password</label>
            {mode === "login" && (
              <Link to="/contact" className="text-xs font-medium text-[var(--link)] hover:underline">Forgot password?</Link>
            )}
          </div>
          <input id="password" type="password" value={form.password} onChange={set("password")} aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? "password-error" : undefined} className="gk-input w-full" placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          {errors.password && <p id="password-error" className="text-xs font-medium text-[var(--error)]">{errors.password}</p>}
        </div>
        {mode === "signup" && (
          <div>
            <label className="flex items-start gap-2.5 text-sm text-[var(--body)]">
              <input type="checkbox" checked={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-[var(--ink)]" aria-describedby={errors.terms ? "terms-error" : undefined} />
              <span>
                I agree to the <Link to="/terms" className="font-medium text-[var(--link)] hover:underline">Terms of service</Link> and{" "}
                <Link to="/privacy" className="font-medium text-[var(--link)] hover:underline">Privacy policy</Link>.
              </span>
            </label>
            {errors.terms && <p id="terms-error" className="mt-1 text-xs font-medium text-[var(--error)]">{errors.terms}</p>}
          </div>
        )}
        <button type="submit" disabled={submitting} className="gk-btn gk-btn-primary gk-btn-lg w-full">
          {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[var(--mute)]">
        {mode === "login" ? (
          <>New here? <Link to="/signup" className="font-medium text-[var(--link)] hover:underline">Create an account</Link></>
        ) : (
          <>Already registered? <Link to="/login" className="font-medium text-[var(--link)] hover:underline">Log in</Link></>
        )}
      </p>
    </div>
  );
}

export function LoginPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <section className="px-4 py-16 sm:py-20">
        <AuthCard mode="login" />
      </section>
    </PageShell>
  );
}

export function SignupPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <section className="px-4 py-16 sm:py-20">
        <AuthCard mode="signup" />
      </section>
    </PageShell>
  );
}

const LEGAL = {
  privacy: [
    ["What we collect", "We collect the minimum needed to run the service: account details, usage data, and optional billing information. We never sell personal data, and we never will."],
    ["How we use it", "Your data powers the features you asked for: authentication, dashboards, billing, and support. We use anonymised aggregates to improve the product."],
    ["Your rights", "You can request a copy of your data, correct it, or delete it at any time. Requests are processed within 30 days."],
    ["Third parties", "We use trusted processors for hosting, payments, and email delivery. Each is bound by strict data-processing terms."],
    ["Security", "All traffic is encrypted in transit and at rest. Access to production data is logged, reviewed, and limited by role."],
  ],
  terms: [
    ["Acceptance", "By using ${name} you agree to these terms. If you are using the service on behalf of an organisation, you confirm you have the authority to bind it."],
    ["Your account", "Keep your credentials secure and notify us immediately of any unauthorised use. You are responsible for activity under your account."],
    ["Fair use", "Use the service lawfully and do not attempt to disrupt, reverse-engineer, or abuse it. We may suspend accounts that violate this."],
    ["Payments", "Plans are billed in advance on a monthly or annual basis and renew automatically until cancelled. Cancellations apply at the end of the current period."],
    ["Content", "You retain all rights to content you upload. We only use it to deliver the service you requested."],
    ["Liability", "The service is provided as-is. To the maximum extent permitted by law, our total liability is limited to the amount you paid in the last 12 months."],
  ],
};

function LegalPage({ kind }: { kind: "privacy" | "terms" }) {
  const title = kind === "privacy" ? "Privacy policy" : "Terms of service";
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Legal" title={title} sub="Last updated: January 2026. Plain language, no fine print required." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="gk-card mx-auto max-w-3xl p-6 sm:p-10">
          <div className="gk-prose">
            {LEGAL[kind].map(([h, body]) => (
              <div key={h}>
                <h2>{h}</h2>
                <p>{body}</p>
              </div>
            ))}
            <h2>Questions?</h2>
            <p>
              Reach the team any time via the <Link to="/contact" className="font-medium text-[var(--link)] hover:underline">contact page</Link> — we respond within one business day.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function PrivacyPage() {
  return <LegalPage kind="privacy" />;
}

export function TermsPage() {
  return <LegalPage kind="terms" />;
}

export function NotFoundPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <section className="page-hero flex min-h-[70vh] items-center justify-center px-4 text-center">
        <div>
          <p className="gk-chip">404</p>
          <h1 className="gk-gradient-text mt-5 text-5xl font-bold tracking-tight">Page not found</h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--body)]">
            The page you're looking for doesn't exist or has moved. Here's the front door:
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="gk-btn gk-btn-primary">Back to home</Link>
            <Link to="/contact" className="gk-btn gk-btn-ghost">Report a broken link</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Authenticated product area: dashboard, settings, billing. */
const PAGES_APP = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, Bell, CreditCard, FileText, Inbox, Lock, Mail, Settings, Shield, Sparkles, TrendingUp, Users, Zap } from "lucide-react";
import { PageShell, PageHero, Field, Reveal, Skeleton, EmptyState, ErrorState, Stat, SuccessBanner, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const DASHBOARD_STATS = [
  { label: "Active projects", value: "12", delta: "+3 this week", icon: Activity },
  { label: "Team members", value: "24", delta: "+2 this month", icon: Users },
  { label: "Task completion", value: "87%", delta: "+6% vs last sprint", icon: TrendingUp },
  { label: "Uptime", value: "99.98%", delta: "30-day rolling", icon: Zap },
];

const ACTIVITY = [
  { title: "Sprint 42 planning completed", meta: "2h ago · Project Atlas", tone: "done" },
  { title: "New teammate joined", meta: "5h ago · Product team", tone: "info" },
  { title: "Payment received — \$2,400", meta: "Yesterday · Acme Corp", tone: "money" },
  { title: "Build #1847 passed", meta: "Yesterday · CI pipeline", tone: "done" },
  { title: "Feature flag 'checkout-v3' enabled", meta: "2 days ago · Platform", tone: "info" },
];

function loadDashboard() {
  return new Promise<typeof ACTIVITY>((res) => setTimeout(() => res(ACTIVITY), 700));
}

export function DashboardPage() {
  const { data, loading, error, reload } = useAsync(loadDashboard, []);
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Dashboard" title="Good to see you" sub="Everything that matters, in one place — live data, quick actions, and the latest activity." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {DASHBOARD_STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 70}>
                <Stat label={s.label} value={s.value} delta={s.delta} icon={<s.icon className="h-4 w-4" />} />
              </Reveal>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <div className="gk-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Recent activity</h2>
                    <p className="mt-0.5 text-xs text-[var(--mute)]">From across all workspaces</p>
                  </div>
                  <span className="gk-badge gk-badge-ink">Live</span>
                </div>
                {loading ? (
                  <div className="mt-6 space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-3.5 w-2/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="mt-6"><ErrorState message={error} onRetry={reload} /></div>
                ) : (data ?? []).length === 0 ? (
                  <div className="mt-6">
                    <EmptyState
                      title="No activity yet"
                      body="Events from your projects, payments, and teammates will show up here."
                      icon={<Inbox className="h-5 w-5" />}
                      action={<Link to="/projects" className="gk-btn gk-btn-ghost gk-btn-sm">Explore projects</Link>}
                    />
                  </div>
                ) : (
                  <ul className="mt-6 divide-y divide-[var(--hairline)]">
                    {(data ?? []).map((a) => (
                      <li key={a.title} className="flex items-center gap-3 py-3.5">
                        <span className={\`h-2 w-2 shrink-0 rounded-full \${a.tone === "money" ? "bg-[var(--success)]" : a.tone === "info" ? "bg-[var(--link)]" : "bg-[var(--ink)]"}\`} aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{a.title}</p>
                          <p className="text-xs text-[var(--mute)]">{a.meta}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="space-y-6">
                <div className="gk-card p-6">
                  <h2 className="text-base font-semibold">Quick actions</h2>
                  <div className="mt-4 space-y-2.5">
                    <Link to="/projects" className="flex items-center justify-between rounded-xl border border-[var(--hairline)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--ink)]">
                      View projects <ArrowRight className="h-4 w-4 text-[var(--mute)]" />
                    </Link>
                    <Link to="/settings" className="flex items-center justify-between rounded-xl border border-[var(--hairline)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--ink)]">
                      Account settings <Settings className="h-4 w-4 text-[var(--mute)]" />
                    </Link>
                    <Link to="/billing" className="flex items-center justify-between rounded-xl border border-[var(--hairline)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--ink)]">
                      Manage billing <CreditCard className="h-4 w-4 text-[var(--mute)]" />
                    </Link>
                    <Link to="/contact" className="flex items-center justify-between rounded-xl border border-[var(--hairline)] px-4 py-3 text-sm font-medium transition-colors hover:border-[var(--ink)]">
                      Get help <Mail className="h-4 w-4 text-[var(--mute)]" />
                    </Link>
                  </div>
                </div>
                <div className="gk-card gk-card-accent p-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                    <h2 className="text-sm font-semibold">Sprint velocity</h2>
                  </div>
                  <p className="mt-2 text-3xl font-bold tracking-tight">42 pts</p>
                  <p className="mt-1 text-xs text-[var(--mute)]">18% above the 12-week average</p>
                  <div className="mt-4 space-y-2">
                    {[
                      { l: "This sprint", w: 78 },
                      { l: "Last sprint", w: 64 },
                      { l: "Average", w: 55 },
                    ].map((b) => (
                      <div key={b.l}>
                        <div className="flex items-center justify-between text-xs text-[var(--mute)]">
                          <span>{b.l}</span>
                          <span>{b.w}%</span>
                        </div>
                        <div className="gk-progress-bar mt-1">
                          <div style={{ width: \`\${b.w}%\` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, weekly: true, marketing: false });
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "Product" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(form.email)) errs.email = "Enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Settings" title="Your account" sub="Profile, notifications, and security — everything in one place." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <form onSubmit={save} noValidate className="gk-card space-y-5 p-6 sm:p-8">
              <h2 className="text-base font-semibold">Profile</h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" id="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Ada Lovelace" autoComplete="name" />
                <Field label="Email" id="email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
                <Field label="Company" id="company" value={form.company} onChange={set("company")} placeholder="Acme Inc." autoComplete="organization" />
                <div className="space-y-1.5">
                  <label htmlFor="role" className="block text-sm font-medium text-[var(--ink)]">Role</label>
                  <select id="role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} className="gk-input w-full">
                    <option>Product</option>
                    <option>Engineering</option>
                    <option>Design</option>
                    <option>Leadership</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              {saved && <SuccessBanner title="Saved" body="Your profile changes are live." />}
              <button type="submit" className="gk-btn gk-btn-primary">Save changes</button>
            </form>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-6">
              <div className="gk-card p-6">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <h2 className="text-base font-semibold">Notifications</h2>
                </div>
                <div className="mt-4 space-y-4">
                  {[
                    { key: "email" as const, label: "Email notifications", note: "Replies, mentions, and digests" },
                    { key: "weekly" as const, label: "Weekly summary", note: "A short recap every Monday" },
                    { key: "marketing" as const, label: "Product updates", note: "New features and changelogs" },
                  ].map((n) => (
                    <div key={n.key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{n.label}</p>
                        <p className="text-xs text-[var(--mute)]">{n.note}</p>
                      </div>
                      <label className="gk-toggle">
                        <input
                          type="checkbox"
                          checked={notifications[n.key]}
                          onChange={(e) => setNotifications((s) => ({ ...s, [n.key]: e.target.checked }))}
                        />
                        <span className="gk-track" aria-hidden="true" />
                        <span className="gk-knob" aria-hidden="true" />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="gk-card p-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <h2 className="text-base font-semibold">Security</h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--body)]">
                  Two-factor authentication is enabled on this account.
                </p>
                <button type="button" className="gk-btn gk-btn-ghost mt-4 gk-btn-sm">
                  <Lock className="h-3.5 w-3.5" />
                  Review security
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

const PLANS = [
  { name: "Starter", price: "$0", note: "For side projects", features: ["3 projects", "Community support", "1 GB storage"], featured: false },
  { name: "Pro", price: "$19", note: "per user / month", features: ["Unlimited projects", "Priority support", "100 GB storage", "Advanced analytics"], featured: true },
  { name: "Scale", price: "$49", note: "per user / month", features: ["Everything in Pro", "SSO & SAML", "Audit logs", "Dedicated success manager"], featured: false },
];

export function BillingPage() {
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const pay = (e: FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setPaid(true);
    }, 1200);
  };
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Billing" title="Simple, transparent pricing" sub="Replace with real pricing details." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => (
              <Reveal key={p.name} delay={i * 80}>
                <article className={\`gk-card relative flex h-full flex-col p-6 \${p.featured ? "gk-card-accent ring-2 ring-[var(--ink)]" : "gk-card-hover"}\`}>
                  {p.featured && <span className="gk-badge gk-badge-ink absolute -top-3 left-6">Most popular</span>}
                  <h2 className="text-sm font-semibold">{p.name}</h2>
                  <p className="mt-3 text-3xl font-bold tracking-tight">{p.price}</p>
                  <p className="text-xs text-[var(--mute)]">{p.note}</p>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[var(--body)]">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ink)]" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup" className={\`mt-6 gk-btn gk-btn-sm w-full \${p.featured ? "gk-btn-primary" : "gk-btn-ghost"}\`}>
                    {p.price === "$0" ? "Start free" : "Upgrade"}
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="gk-card p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  <h2 className="text-base font-semibold">Payment method</h2>
                </div>
                {paid ? (
                  <div className="mt-4">
                    <SuccessBanner title="Payment updated" body="Your new card is on file and will be used for the next invoice." />
                  </div>
                ) : (
                  <form onSubmit={pay} className="mt-5 space-y-5">
                    <Field label="Name on card" id="cardName" placeholder="Ada Lovelace" autoComplete="cc-name" />
                    <Field label="Card number" id="cardNumber" inputMode="numeric" placeholder="4242 4242 4242 4242" autoComplete="cc-number" />
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Expiry" id="expiry" placeholder="MM / YY" autoComplete="cc-exp" />
                      <Field label="CVC" id="cvc" inputMode="numeric" placeholder="123" autoComplete="cc-csc" />
                    </div>
                    <button type="submit" disabled={processing} className="gk-btn gk-btn-primary w-full">
                      {processing ? "Processing…" : "Save payment method"}
                    </button>
                  </form>
                )}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="gk-card p-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h2 className="text-base font-semibold">Invoices</h2>
                </div>
                <table className="gk-table mt-5">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th><span className="sr-only">Download</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { d: "Jul 1, 2026", a: "$228.00", s: "Paid" },
                      { d: "Jun 1, 2026", a: "$228.00", s: "Paid" },
                      { d: "May 1, 2026", a: "$228.00", s: "Paid" },
                    ].map((inv) => (
                      <tr key={inv.d}>
                        <td>{inv.d}</td>
                        <td>{inv.a}</td>
                        <td><span className="gk-badge gk-badge-ink">{inv.s}</span></td>
                        <td><button type="button" className="gk-btn gk-btn-ghost gk-btn-sm">Download</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Workspace pages for dashboard-style products (projects, analytics, team). */
const PAGES_WORKSPACE = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BarChart3, Briefcase, Calendar, CheckCircle2, Clock, Inbox, Plus, Users } from "lucide-react";
import { PageShell, PageHero, Reveal, Skeleton, EmptyState, ErrorState, Stat, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const PROJECTS = [
  { id: "atlas", name: "Project Atlas", status: "On track", progress: 72, team: 6, due: "Sep 12", tone: "ink" },
  { id: "nimbus", name: "Nimbus App", status: "At risk", progress: 41, team: 4, due: "Sep 28", tone: "link" },
  { id: "beacon", name: "Beacon CLI", status: "On track", progress: 88, team: 3, due: "Aug 30", tone: "ink" },
  { id: "harbor", name: "Harbor API", status: "On hold", progress: 23, team: 5, due: "Oct 5", tone: "mute" },
];

const TASKS = [
  { title: "Finalize onboarding copy", done: false, tag: "Design" },
  { title: "Ship billing webhook retries", done: false, tag: "Backend" },
  { title: "Land empty-state illustrations", done: true, tag: "Design" },
  { title: "Schema migration for v2", done: true, tag: "Backend" },
  { title: "Prepare sprint 43 kickoff", done: false, tag: "Planning" },
];

function loadProjects() {
  return new Promise<typeof PROJECTS>((res) => setTimeout(() => res(PROJECTS), 650));
}

export function ProjectsPage() {
  const { data, loading, error, reload } = useAsync(loadProjects, []);
  const [filter, setFilter] = useState("All");
  const filters = ["All", "On track", "At risk", "On hold"];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Projects" title="Every project, one view" sub="Status, progress, and owners at a glance — drill into any project for the full picture." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={\`gk-chip \${filter === f ? "gk-chip-active" : ""}\`}
                >
                  {f}
                </button>
              ))}
            </div>
            <button type="button" className="gk-btn gk-btn-primary gk-btn-sm">
              <Plus className="h-4 w-4" />
              New project
            </button>
          </div>
          {loading ? (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="gk-card space-y-3 p-6">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-8"><ErrorState message={error} onRetry={reload} /></div>
          ) : (data ?? []).length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No projects yet"
                body="Create your first project to start tracking work, owners, and progress."
                icon={<Briefcase className="h-5 w-5" />}
                action={<button type="button" className="gk-btn gk-btn-primary gk-btn-sm"><Plus className="h-4 w-4" /> New project</button>}
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {(data ?? [])
                .filter((p) => filter === "All" || p.status === filter)
                .map((p, i) => (
                  <Reveal key={p.id} delay={i * 60}>
                    <Link to={\`/project/\${p.id}\`} className="gk-card gk-card-hover block p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">{p.name}</h2>
                          <p className="mt-1 text-xs text-[var(--mute)]">Due {p.due} · {p.team} people</p>
                        </div>
                        <span className={\`gk-badge \${p.status === "On track" ? "gk-badge-ink" : p.status === "At risk" ? "gk-badge-accent" : "gk-badge-soft"}\`}>{p.status}</span>
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <div className="gk-progress-bar flex-1">
                          <div style={{ width: \`\${p.progress}%\` }} />
                        </div>
                        <span className="text-xs font-medium text-[var(--mute)]">{p.progress}%</span>
                      </div>
                      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--link)]">
                        View project <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </Reveal>
                ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function ProjectPage() {
  const { id } = useParams();
  const [tasks, setTasks] = useState(TASKS);
  const [draft, setDraft] = useState("");
  const project = PROJECTS.find((p) => p.id === id) ?? PROJECTS[0]!;
  const { data, loading, error, reload } = useAsync(loadProjects, [id]);
  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setTasks((s) => [{ title: t, done: false, tag: "New" }, ...s]);
    setDraft("");
  };
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow={project.status} title={project.name} sub={\`Due \${project.due} · \${project.team} people · \${project.progress}% complete\`} />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Open tasks" value={\`\${tasks.filter((t) => !t.done).length}\`} icon={<Clock className="h-4 w-4" />} />
            <Stat label="Completed" value={\`\${tasks.filter((t) => t.done).length}\`} delta="This sprint" icon={<CheckCircle2 className="h-4 w-4" />} />
            <Stat label="Progress" value={\`\${project.progress}%\`} icon={<BarChart3 className="h-4 w-4" />} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal className="lg:col-span-2">
              <div className="gk-card p-6">
                <h2 className="text-base font-semibold">Tasks</h2>
                <form onSubmit={add} className="mt-4 flex gap-2">
                  <label htmlFor="task" className="sr-only">New task</label>
                  <input
                    id="task"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="gk-input flex-1"
                    placeholder="Add a task and press enter…"
                  />
                  <button type="submit" className="gk-btn gk-btn-primary gk-btn-sm">
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </form>
                {loading ? (
                  <div className="mt-5 space-y-3">
                    {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : error ? (
                  <div className="mt-5"><ErrorState message={error} onRetry={reload} /></div>
                ) : tasks.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState title="No tasks yet" body="Add the first task above — it will show up here instantly." icon={<Inbox className="h-5 w-5" />} />
                  </div>
                ) : (
                  <ul className="mt-5 divide-y divide-[var(--hairline)]">
                    {tasks.map((t) => (
                      <li key={t.title} className="flex items-center gap-3 py-3">
                        <input
                          type="checkbox"
                          checked={t.done}
                          onChange={() => setTasks((s) => s.map((x) => (x.title === t.title ? { ...x, done: !x.done } : x)))}
                          className="h-4 w-4 accent-[var(--ink)]"
                          aria-label={\`Mark \${t.title} \${t.done ? "not done" : "done"}\`}
                        />
                        <p className={\`flex-1 text-sm \${t.done ? "text-[var(--mute)] line-through" : "font-medium"}\`}>{t.title}</p>
                        <span className="gk-chip">{t.tag}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="gk-card p-6">
                <h2 className="text-base font-semibold">Sprint</h2>
                <div className="mt-4 space-y-4">
                  {[
                    { l: "Planning", w: 100 },
                    { l: "In progress", w: 62 },
                    { l: "Review", w: 38 },
                    { l: "Shipped", w: 41 },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="flex items-center justify-between text-xs text-[var(--mute)]">
                        <span>{s.l}</span>
                        <span>{s.w}%</span>
                      </div>
                      <div className="gk-progress-bar mt-1">
                        <div style={{ width: \`\${s.w}%\` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-[var(--hairline)] pt-4 text-sm text-[var(--mute)]">
                  <Calendar className="h-4 w-4" />
                  Sprint ends {project.due}
                </div>
                <Link to="/team" className="mt-4 flex items-center gap-2 text-sm font-medium text-[var(--link)]">
                  <Users className="h-4 w-4" /> View team
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

const ANALYTICS_ROWS = [
  { m: "Jan", v: 42 },
  { m: "Feb", v: 55 },
  { m: "Mar", v: 48 },
  { m: "Apr", v: 71 },
  { m: "May", v: 66 },
  { m: "Jun", v: 89 },
  { m: "Jul", v: 82 },
  { m: "Aug", v: 96 },
];

export function AnalyticsPage() {
  const max = Math.max(...ANALYTICS_ROWS.map((r) => r.v));
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Analytics" title="Numbers without the noise" sub="Weekly active usage, conversion, and retention — tracked automatically across every workspace." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Active users" value="4,821" delta="+12.4% MoM" />
            <Stat label="Conversion" value="6.8%" delta="+1.1 pts" />
            <Stat label="Retention (D30)" value="43%" delta="+2.9 pts" />
          </div>
          <Reveal>
            <div className="gk-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Monthly active users</h2>
                  <p className="mt-0.5 text-xs text-[var(--mute)]">Last 8 months</p>
                </div>
                <span className="gk-badge gk-badge-ink">+128% YoY</span>
              </div>
              <div className="mt-8 flex h-52 items-end gap-3 sm:gap-5">
                {ANALYTICS_ROWS.map((r) => (
                  <div key={r.m} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-[var(--mute)]">{r.v}</span>
                    <div
                      className="w-full rounded-t-lg bg-[var(--ink)] transition-all hover:opacity-80"
                      style={{ height: \`\${Math.round((r.v / max) * 100)}%\` }}
                      role="img"
                      aria-label={\`\${r.m}: \${r.v} active users\`}
                    />
                    <span className="text-xs text-[var(--mute)]">{r.m}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <div className="gk-card p-6">
              <h2 className="text-base font-semibold">Top channels</h2>
              <table className="gk-table mt-5">
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Visitors</th>
                    <th>Conversion</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { c: "Organic search", v: "18,240", cv: "7.1%", s: 44 },
                    { c: "Direct", v: "12,860", cv: "5.4%", s: 31 },
                    { c: "Referrals", v: "6,410", cv: "8.9%", s: 16 },
                    { c: "Social", v: "3,905", cv: "4.2%", s: 9 },
                  ].map((r) => (
                    <tr key={r.c}>
                      <td className="font-medium text-[var(--ink)]">{r.c}</td>
                      <td>{r.v}</td>
                      <td>{r.cv}</td>
                      <td>
                        <div className="gk-progress-bar max-w-40">
                          <div style={{ width: \`\${r.s}%\` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

const MEMBERS = [
  { initials: "AL", name: "Ada Lovelace", role: "Founder", status: "Active" },
  { initials: "GK", name: "Grace Hopper", role: "Engineering", status: "Active" },
  { initials: "MK", name: "Margaret Knight", role: "Design", status: "Active" },
  { initials: "DN", name: "Dorothy Njemile", role: "Product", status: "Invited" },
  { initials: "JT", name: "Jorge Torres", role: "Growth", status: "Active" },
];

export function TeamPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Team" title="The people behind the product" sub="24 members across four functions — everyone can see the whole picture." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MEMBERS.map((m, i) => (
              <Reveal key={m.name} delay={i * 60}>
                <article className="gk-card gk-card-hover flex items-center gap-4 p-5">
                  <span className="gk-avatar">{m.initials}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold">{m.name}</h2>
                    <p className="text-xs text-[var(--mute)]">{m.role}</p>
                  </div>
                  <span className={\`gk-badge \${m.status === "Active" ? "gk-badge-ink" : "gk-badge-soft"}\`}>{m.status}</span>
                </article>
              </Reveal>
            ))}
            <Reveal delay={300}>
              <button type="button" className="gk-card gk-card-hover flex h-full min-h-24 flex-col items-center justify-center gap-2 border border-dashed p-5 text-sm font-medium text-[var(--mute)] transition-colors hover:border-[var(--ink)] hover:text-[var(--ink)]">
                <Plus className="h-5 w-5" />
                Invite a teammate
              </button>
            </Reveal>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Store pages: shop, product detail, cart, checkout — with a real cart state. */
const PAGES_STORE = (name: string, nav: Array<{ to: string; label: string }>): string => `import { createContext, useContext, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, CreditCard, Minus, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PageShell, PageHero, Reveal, Skeleton, EmptyState, ErrorState, Field, SuccessBanner, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const PRODUCTS = [
  { id: "p1", name: "Studio Headphones", price: 249, cat: "Audio", tone: "ink" },
  { id: "p2", name: "Mechanical Keyboard", price: 179, cat: "Accessories", tone: "link" },
  { id: "p3", name: "Ergo Mouse", price: 89, cat: "Accessories", tone: "ink" },
  { id: "p4", name: "27-inch 4K Display", price: 649, cat: "Displays", tone: "link" },
  { id: "p5", name: "Travel Backpack", price: 149, cat: "Carry", tone: "ink" },
  { id: "p6", name: "Desk Lamp", price: 119, cat: "Accessories", tone: "link" },
  { id: "p7", name: "USB-C Dock", price: 199, cat: "Accessories", tone: "ink" },
  { id: "p8", name: "Speaker Bar", price: 299, cat: "Audio", tone: "link" },
];

interface CartItem {
  id: string;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (id: string) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  total: number;
}

const CartContext = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const add = (id: string) =>
    setItems((s) => {
      const found = s.find((i) => i.id === id);
      return found ? s.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)) : [...s, { id, qty: 1 }];
    });
  const remove = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((s) => (qty <= 0 ? s.filter((i) => i.id !== id) : s.map((i) => (i.id === id ? { ...i, qty } : i))));
  const clear = () => setItems([]);
  const count = items.reduce((n, i) => n + i.qty, 0);
  const total = items.reduce((n, i) => n + i.qty * (PRODUCTS.find((p) => p.id === i.id)?.price ?? 0), 0);
  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, total }}>{children}</CartContext.Provider>
  );
}

function useCart(): CartCtx {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

function loadProducts() {
  return new Promise<typeof PRODUCTS>((res) => setTimeout(() => res(PRODUCTS), 650));
}

export function ShopPage() {
  const { data, loading, error, reload } = useAsync(loadProducts, []);
  const cart = useCart();
  const [filter, setFilter] = useState("All");
  const cats = ["All", ...new Set(PRODUCTS.map((p) => p.cat))];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Shop" title="Everything you need to do the work" sub="Gear we use ourselves — free shipping over \$150, 30-day returns." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => (
                <button key={c} type="button" onClick={() => setFilter(c)} className={\`gk-chip \${filter === c ? "gk-chip-active" : ""}\`}>
                  {c}
                </button>
              ))}
            </div>
            <Link to="/cart" className="gk-btn gk-btn-ghost gk-btn-sm">
              <ShoppingBag className="h-4 w-4" />
              Cart {cart.count > 0 && <span className="gk-badge gk-badge-ink">{cart.count}</span>}
            </Link>
          </div>
          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="gk-card space-y-3 p-5">
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-8"><ErrorState message={error} onRetry={reload} /></div>
          ) : (data ?? []).length === 0 ? (
            <div className="mt-8">
              <EmptyState title="Nothing in this category yet" body="New products land every week — check back soon." icon={<Package className="h-5 w-5" />} />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(data ?? [])
                .filter((p) => filter === "All" || p.cat === filter)
                .map((p, i) => (
                  <Reveal key={p.id} delay={i * 50}>
                    <article className="gk-card gk-card-hover flex h-full flex-col p-5">
                      <Link to={\`/product/\${p.id}\`} aria-label={p.name}>
                        <div className={\`gk-tile h-28 w-full \${p.tone === "link" ? "opacity-90" : ""}\`}>
                          <Package className="h-9 w-9" />
                        </div>
                      </Link>
                      <Link to={\`/product/\${p.id}\`} className="mt-4 text-sm font-semibold hover:text-[var(--link)]">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--mute)]">{p.cat}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-base font-bold">\${p.price}</p>
                        <button
                          type="button"
                          onClick={() => cart.add(p.id)}
                          className="gk-btn gk-btn-ghost gk-btn-sm"
                          aria-label={\`Add \${p.name} to cart\`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </article>
                  </Reveal>
                ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function ProductPage() {
  const { id } = useParams();
  const cart = useCart();
  const product = PRODUCTS.find((p) => p.id === id) ?? PRODUCTS[0]!;
  const related = PRODUCTS.filter((p) => p.id !== product.id && p.cat === product.cat).slice(0, 3);
  return (
    <PageShell brand="${name}" nav={NAV}>
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Link to="/shop" className="text-sm font-medium text-[var(--link)] hover:underline">← Back to shop</Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <Reveal>
              <div className={\`gk-tile aspect-square w-full\`}>
                <Package className="h-16 w-16" />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <p className="gk-chip">{product.cat}</p>
              <h1 className="mt-4 text-3xl font-bold tracking-tight">{product.name}</h1>
              <p className="mt-2 text-2xl font-bold">\${product.price}</p>
              <p className="mt-4 leading-7 text-[var(--body)]">
                Designed for long sessions and built to last. Replace with a product description.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[var(--body)]">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--success)]" /> Free shipping over \$150</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--success)]" /> 30-day returns, no questions</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[var(--success)]" /> 2-year warranty included</li>
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => cart.add(product.id)}
                  className="gk-btn gk-btn-primary gk-btn-lg"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add to cart — \${product.price}
                </button>
                <Link to="/checkout" className="gk-btn gk-btn-ghost gk-btn-lg">Buy now</Link>
              </div>
              <p className="mt-4 text-xs text-[var(--mute)]">
                In stock · Ships within 1–2 business days
              </p>
            </Reveal>
          </div>
          {related.length > 0 && (
            <div className="mt-16">
              <h2 className="text-xl font-bold tracking-tight">You may also like</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {related.map((p) => (
                  <Link key={p.id} to={\`/product/\${p.id}\`} className="gk-card gk-card-hover p-5">
                    <div className="gk-tile h-24 w-full"><Package className="h-7 w-7" /></div>
                    <p className="mt-3 text-sm font-semibold">{p.name}</p>
                    <p className="mt-1 text-sm font-bold">\${p.price}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function CartPage() {
  const cart = useCart();
  const lines = cart.items
    .map((i) => ({ item: i, product: PRODUCTS.find((p) => p.id === i.id)! }))
    .filter((l) => l.product);
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Cart" title={lines.length === 0 ? "Your cart is empty" : \`\${cart.count} item\${cart.count === 1 ? "" : "s"} in your cart\`} />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {lines.length === 0 ? (
            <EmptyState
              title="Nothing here yet"
              body="Browse the shop and add something you'll actually use."
              icon={<ShoppingBag className="h-5 w-5" />}
              action={<Link to="/shop" className="gk-btn gk-btn-primary gk-btn-sm">Browse products</Link>}
            />
          ) : (
            <div className="space-y-4">
              {lines.map(({ item, product }) => (
                <Reveal key={item.id}>
                  <article className="gk-card flex flex-wrap items-center gap-4 p-5">
                    <div className="gk-tile h-16 w-16"><Package className="h-6 w-6" /></div>
                    <div className="min-w-0 flex-1">
                      <Link to={\`/product/\${item.id}\`} className="text-sm font-semibold hover:text-[var(--link)]">{product.name}</Link>
                      <p className="text-xs text-[var(--mute)]">{product.cat}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => cart.setQty(item.id, item.qty - 1)} className="gk-btn gk-btn-ghost gk-btn-sm" aria-label={\`Decrease quantity of \${product.name}\`}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{item.qty}</span>
                      <button type="button" onClick={() => cart.setQty(item.id, item.qty + 1)} className="gk-btn gk-btn-ghost gk-btn-sm" aria-label={\`Increase quantity of \${product.name}\`}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="w-20 text-right text-sm font-bold">\${item.qty * product.price}</p>
                    <button type="button" onClick={() => cart.remove(item.id)} className="gk-btn gk-btn-icon text-[var(--error)]" aria-label={\`Remove \${product.name} from cart\`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </article>
                </Reveal>
              ))}
              <div className="gk-card p-6">
                <div className="flex items-center justify-between text-sm text-[var(--body)]">
                  <span>Subtotal</span>
                  <span className="font-medium text-[var(--ink)]">\${cart.total}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-[var(--body)]">
                  <span>Shipping</span>
                  <span className="font-medium text-[var(--ink)]">{cart.total >= 150 ? "Free" : "$9"}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-4">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold">\${cart.total + (cart.total >= 150 ? 0 : 9)}</span>
                </div>
                <Link to="/checkout" className="gk-btn gk-btn-primary gk-btn-lg mt-5 w-full">
                  Checkout <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ email: "", name: "", address: "", city: "", zip: "", card: "" });
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pay = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(form.email)) errs.email = "Enter a valid email address.";
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (form.address.trim().length < 5) errs.address = "Enter your street address.";
    if (form.city.trim().length < 2) errs.city = "Enter your city.";
    if (!/^[0-9A-Za-z\\s-]{3,}$/.test(form.zip)) errs.zip = "Enter a valid postcode.";
    if (form.card.replace(/\\s/g, "").length < 12) errs.card = "Enter a valid card number.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setDone(true);
      cart.clear();
    }, 1400);
  };
  if (done) {
    return (
      <PageShell brand="${name}" nav={NAV}>
        <section className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-lg">
            <SuccessBanner
              title="Order confirmed"
              body="Thanks! A receipt is on its way to your inbox, and your order will ship within 1–2 business days."
            />
            <div className="mt-4 text-center">
              <Link to="/shop" className="gk-btn gk-btn-primary">Continue shopping</Link>
            </div>
          </div>
        </section>
      </PageShell>
    );
  }
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Checkout" title="Almost there" sub="Secure checkout — payments are processed by a certified provider." />
      <section className="px-4 pb-16 sm:px-6">
        <form onSubmit={pay} noValidate className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
          <div className="gk-card space-y-5 p-6 lg:col-span-2">
            <h2 className="text-base font-semibold">Shipping details</h2>
            <Field label="Email" id="email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
            <Field label="Full name" id="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Ada Lovelace" autoComplete="name" />
            <Field label="Street address" id="address" value={form.address} onChange={set("address")} error={errors.address} placeholder="1234 Market Street" autoComplete="street-address" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="City" id="city" value={form.city} onChange={set("city")} error={errors.city} placeholder="San Francisco" autoComplete="address-level2" />
              <Field label="Postcode" id="zip" value={form.zip} onChange={set("zip")} error={errors.zip} placeholder="94103" autoComplete="postal-code" />
            </div>
            <div className="border-t border-[var(--hairline)] pt-5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                <h2 className="text-base font-semibold">Payment</h2>
              </div>
              <div className="mt-4">
                <Field label="Card number" id="card" inputMode="numeric" value={form.card} onChange={set("card")} error={errors.card} placeholder="4242 4242 4242 4242" autoComplete="cc-number" />
              </div>
            </div>
            <button type="submit" disabled={processing} className="gk-btn gk-btn-primary gk-btn-lg w-full">
              {processing ? "Processing payment…" : \`Pay \$\${cart.total + (cart.total >= 150 ? 0 : 9)}\`}
            </button>
          </div>
          <div className="gk-card h-fit p-6">
            <h2 className="text-base font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {cart.items.map((i) => {
                const p = PRODUCTS.find((x) => x.id === i.id);
                if (!p) return null;
                return (
                  <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-[var(--body)]">{p.name} × {i.qty}</span>
                    <span className="font-medium">\${i.qty * p.price}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-4 text-sm">
              <span className="text-[var(--body)]">Total</span>
              <span className="text-lg font-bold">\${cart.total + (cart.total >= 150 ? 0 : 9)}</span>
            </div>
          </div>
        </form>
      </section>
    </PageShell>
  );
}
`;

/** Food & hospitality pages: menu, reservations, locations, gallery. */
const PAGES_FOOD = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Clock, Leaf, MapPin, Phone, Users } from "lucide-react";
import { PageShell, PageHero, Reveal, Skeleton, EmptyState, ErrorState, Field, SuccessBanner, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const MENU = [
  { cat: "Starters", name: "Charred leek + hazelnut crostini", price: "$14", note: "Replace with the dish description.", tag: "Vegetarian" },
  { cat: "Starters", name: "Buckwheat sourdough, whipped lardo", price: "$11", note: "Replace with the dish description." },
  { cat: "Starters", name: "Coal-grilled octopus, salsa verde", price: "$18", note: "Replace with the dish description." },
  { cat: "Mains", name: "Wood-roasted duck, umeboshi glaze", price: "$32", note: "Replace with the dish description." },
  { cat: "Mains", name: "Spring garlic ravioli, brown butter", price: "$24", note: "Replace with the dish description.", tag: "Vegetarian" },
  { cat: "Mains", name: "Pork belly skewers, pickled mustard", price: "$27", note: "Replace with the dish description." },
  { cat: "Desserts", name: "Burnt honey panna cotta", price: "$12", note: "Replace with the dish description." },
  { cat: "Desserts", name: "Dark chocolate torte, olive oil salt", price: "$13", note: "Replace with the dish description.", tag: "Vegan" },
];

function loadMenu() {
  return new Promise<typeof MENU>((res) => setTimeout(() => res(MENU), 650));
}

export function MenuPage() {
  const { data, loading, error, reload } = useAsync(loadMenu, []);
  const [cat, setCat] = useState("All");
  const cats = ["All", ...new Set(MENU.map((m) => m.cat))];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Menu" title="Seasonal, considered, honest" sub="Everything changes with the season. Here is what is on the pass right now." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} className={\`gk-chip \${cat === c ? "gk-chip-active" : ""}\`}>
                {c}
              </button>
            ))}
          </div>
          {loading ? (
            <div className="mt-8 space-y-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="gk-card space-y-2 p-5">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-8"><ErrorState message={error} onRetry={reload} /></div>
          ) : (data ?? []).length === 0 ? (
            <div className="mt-8">
              <EmptyState title="Menu is being refreshed" body="The new seasonal menu lands shortly — check back soon." icon={<Clock className="h-5 w-5" />} />
            </div>
          ) : (
            <ul className="mt-8 space-y-3">
              {(data ?? [])
                .filter((m) => cat === "All" || m.cat === cat)
                .map((m, i) => (
                  <Reveal key={m.name} delay={i * 40}>
                    <li className="gk-card flex items-start justify-between gap-4 p-5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold">{m.name}</h2>
                          {m.tag && <span className="gk-chip">{m.tag}</span>}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[var(--body)]">{m.note}</p>
                      </div>
                      <p className="text-base font-bold">{m.price}</p>
                    </li>
                  </Reveal>
                ))}
            </ul>
          )}
          <div className="mt-10 text-center">
            <Link to="/reservations" className="gk-btn gk-btn-primary gk-btn-lg">
              Book a table <Calendar className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

export function ReservationsPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ date: "", time: "7:00 PM", guests: "2", name: "", email: "", notes: "" });
  const set = (k: string) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const book = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.date) errs.date = "Choose a date.";
    if (form.name.trim().length < 2) errs.name = "Please enter your name.";
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(form.email)) errs.email = "Enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setConfirmed(true);
    }, 1000);
  };
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Reservations" title="Book your table" sub="Walk-ins welcome, reservations recommended — especially on weekends." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="gk-card p-6 sm:p-8">
              {confirmed ? (
                <SuccessBanner
                  title="Reservation confirmed"
                  body={\`See you on \${form.date} at \${form.time} for \${form.guests} guest\${form.guests === "1" ? "" : "s"}. A confirmation email is on its way.\`}
                />
              ) : (
                <form onSubmit={book} noValidate className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="date" className="block text-sm font-medium text-[var(--ink)]">Date</label>
                      <input id="date" type="date" value={form.date} onChange={set("date")} aria-invalid={errors.date ? true : undefined} className="gk-input w-full" />
                      {errors.date && <p className="text-xs font-medium text-[var(--error)]">{errors.date}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="time" className="block text-sm font-medium text-[var(--ink)]">Time</label>
                      <select id="time" value={form.time} onChange={set("time")} className="gk-input w-full">
                        <option>5:30 PM</option>
                        <option>6:00 PM</option>
                        <option>6:30 PM</option>
                        <option>7:00 PM</option>
                        <option>7:30 PM</option>
                        <option>8:00 PM</option>
                        <option>8:30 PM</option>
                        <option>9:00 PM</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="guests" className="block text-sm font-medium text-[var(--ink)]">Party size</label>
                    <select id="guests" value={form.guests} onChange={set("guests")} className="gk-input w-full">
                      {["1", "2", "3", "4", "5", "6", "7", "8+"].map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Name" id="name" value={form.name} onChange={set("name")} error={errors.name} placeholder="Ada Lovelace" autoComplete="name" />
                    <Field label="Email" id="email" type="email" value={form.email} onChange={set("email")} error={errors.email} placeholder="you@example.com" autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="notes" className="block text-sm font-medium text-[var(--ink)]">Special requests <span className="font-normal text-[var(--mute)]">(optional)</span></label>
                    <textarea id="notes" rows={3} value={form.notes} onChange={set("notes")} className="gk-input w-full resize-y" placeholder="Allergies, celebrations, seating preferences…" />
                  </div>
                  <button type="submit" disabled={submitting} className="gk-btn gk-btn-primary gk-btn-lg w-full sm:w-auto">
                    {submitting ? "Confirming…" : "Confirm reservation"}
                    {!submitting && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                </form>
              )}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-4">
              {[
                { icon: Clock, title: "Hours", body: "Replace with the opening hours." },
                { icon: Phone, title: "Reservations", body: "Replace with the reservation phone number." },
                { icon: MapPin, title: "Find us", body: "Replace with the full street address." },
                { icon: Users, title: "Groups", body: "Parties of 8+ — we host private rooms for up to 24." },
              ].map((c) => (
                <article key={c.title} className="gk-card flex items-start gap-3.5 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--canvas-soft)] text-[var(--ink)]">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{c.title}</h2>
                    <p className="mt-0.5 text-sm leading-6 text-[var(--body)]">{c.body}</p>
                  </div>
                </article>
              ))}
              <div className="gk-card p-5 text-sm leading-6 text-[var(--body)]">
                <Leaf className="mb-2 h-4 w-4 text-[var(--success)]" />
                Dietary needs are second nature here — gluten-free, vegan, and nut-free options on every menu section.
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}

export function LocationsPage() {
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Locations" title="Three kitchens, one standard" sub="The same menu, the same service — in three neighbourhoods." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          {[
            { name: "Replace with the city name.", body: "Replace with the full street address.", phone: "Replace with the phone number.", hours: "Replace with the opening hours." },
            { name: "Replace with the city name.", body: "Replace with the full street address.", phone: "Replace with the phone number.", hours: "Replace with the opening hours." },
            { name: "Replace with the city name.", body: "Replace with the full street address.", phone: "Replace with the phone number.", hours: "Replace with the opening hours." },
          ].map((l, i) => (
            <Reveal key={i} delay={i * 80}>
              <article className="gk-card gk-card-hover flex h-full flex-col p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--ink)] text-[var(--on-primary)]">
                  <MapPin className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-base font-semibold">{l.name}</h2>
                <p className="mt-1 text-sm leading-6 text-[var(--body)]">{l.body}</p>
                <dl className="mt-4 space-y-1.5 text-sm text-[var(--body)]">
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[var(--mute)]" /> {l.phone}</div>
                  <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-[var(--mute)]" /> {l.hours}</div>
                </dl>
                <Link to="/reservations" className="mt-5 gk-btn gk-btn-ghost gk-btn-sm w-full">Book at this location</Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function GalleryPage() {
  const shots = [
    { label: "Dining room", tone: "ink" },
    { label: "The bar", tone: "link" },
    { label: "Chef's counter", tone: "ink" },
    { label: "Private room", tone: "link" },
    { label: "Seasonal plates", tone: "ink" },
    { label: "Evening service", tone: "link" },
  ];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Gallery" title="A look inside" sub="The room, the bar, and the plates — in no particular order." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shots.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <figure className={\`gk-tile gk-card-hover relative aspect-[4/3] overflow-hidden \`}>
                <span className={\`absolute inset-0 opacity-0 transition-opacity hover:opacity-100\`} aria-hidden="true" />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10 text-sm font-medium text-white">
                  {s.label}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Editorial pages: journal index + full article. */
const PAGES_PUBLISH = (name: string, nav: Array<{ to: string; label: string }>): string => `import { Link, useParams } from "react-router-dom";
import { ArrowRight, Clock, Tag } from "lucide-react";
import { PageShell, PageHero, Reveal, Skeleton, EmptyState, ErrorState, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const POSTS = [
  { id: "p1", title: "Designing for the first five seconds", excerpt: "First impressions are formed before a single click. Here is how we design for them on purpose.", date: "Jul 14, 2026", minutes: 6, tags: ["Design", "UX"] },
  { id: "p2", title: "Shipping a 3x faster release pipeline", excerpt: "Cutting build times without cutting corners — the playbook we use across every service.", date: "Jun 28, 2026", minutes: 9, tags: ["Engineering", "CI/CD"] },
  { id: "p3", title: "What our roadmap taught us about scope", excerpt: "Every feature we killed made the product better. A candid look at saying no.", date: "Jun 2, 2026", minutes: 5, tags: ["Product", "Strategy"] },
  { id: "p4", title: "The accessibility checklist we ship with", excerpt: "Replace with the article summary.", date: "May 11, 2026", minutes: 7, tags: ["Accessibility", "Engineering"] },
  { id: "p5", title: "Running the numbers on remote async work", excerpt: "What our internal metrics say about meetings, focus time, and delivery speed.", date: "Apr 20, 2026", minutes: 8, tags: ["Culture", "Research"] },
  { id: "p6", title: "From prototype to production in a week", excerpt: "A single-pager that became a core feature. The process, the trade-offs, the lessons.", date: "Mar 30, 2026", minutes: 6, tags: ["Engineering", "Design"] },
];

function loadPosts() {
  return new Promise<typeof POSTS>((res) => setTimeout(() => res(POSTS), 600));
}

export function BlogPage() {
  const { data, loading, error, reload } = useAsync(loadPosts, []);
  const featured = (data ?? [])[0];
  const rest = (data ?? []).slice(1);
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Journal" title="Notes from the team" sub="Engineering, design, and product writing — published when it is ready, not on a schedule." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-64 w-full" />
              <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-56 w-full" />
              </div>
            </div>
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : (data ?? []).length === 0 ? (
            <EmptyState title="No posts yet" body="The first essay is in progress — subscribe and it will land in your inbox." />
          ) : (
            <>
              {featured && (
                <Reveal>
                  <Link to={\`/post/\${featured.id}\`} className="gk-card gk-card-hover mb-10 block overflow-hidden sm:flex">
                    <div className="gk-tile flex aspect-[16/9] sm:w-1/2 sm:aspect-auto">
                      <ArrowRight className="h-8 w-8" />
                    </div>
                    <div className="p-6 sm:w-1/2 sm:p-8">
                      <p className="gk-chip">Latest</p>
                      <h2 className="mt-3 text-2xl font-bold tracking-tight hover:text-[var(--link)]">{featured.title}</h2>
                      <p className="mt-3 leading-7 text-[var(--body)]">{featured.excerpt}</p>
                      <p className="mt-4 text-xs text-[var(--mute)]">
                        {featured.date} · {featured.minutes} min read
                      </p>
                    </div>
                  </Link>
                </Reveal>
              )}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((p, i) => (
                  <Reveal key={p.id} delay={i * 60}>
                    <article className="gk-card gk-card-hover flex h-full flex-col p-6">
                      <div className="flex items-center gap-2 text-xs text-[var(--mute)]">
                        <Clock className="h-3.5 w-3.5" />
                        {p.date} · {p.minutes} min read
                      </div>
                      <Link to={\`/post/\${p.id}\`} className="mt-3 text-base font-semibold leading-6 hover:text-[var(--link)]">
                        {p.title}
                      </Link>
                      <p className="mt-2 flex-1 text-sm leading-6 text-[var(--body)]">{p.excerpt}</p>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {p.tags.map((t) => (
                          <span key={t} className="gk-chip"><Tag className="h-3 w-3" /> {t}</span>
                        ))}
                      </div>
                    </article>
                  </Reveal>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function ArticlePage() {
  const { id } = useParams();
  const post = POSTS.find((p) => p.id === id) ?? POSTS[0]!;
  const related = POSTS.filter((p) => p.id !== post.id).slice(0, 2);
  return (
    <PageShell brand="${name}" nav={NAV}>
      <section className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link to="/blog" className="text-sm font-medium text-[var(--link)] hover:underline">← All posts</Link>
          <p className="gk-chip mt-8">{post.tags.join(" · ")}</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{post.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--mute)]">
            <Clock className="h-4 w-4" />
            {post.date} · {post.minutes} min read
          </p>
          <div className="gk-prose mt-8">
            <p>
              {post.excerpt}
            </p>
            <h2>Start with the constraint</h2>
            <p>
              Every good design decision in this project started with a constraint we refused to paper over. Budgets,
              timelines, legacy systems — naming them early turned each into a guide rather than a surprise.
            </p>
            <h2>What we actually shipped</h2>
            <p>
              The first version shipped with a deliberately narrow surface: one flow, done completely, with every
              state accounted for. Empty, loading, error, and success were designed before the happy path was ever
              polished.
            </p>
            <ul>
              <li>One primary action per screen, always the ink button.</li>
              <li>Every link goes somewhere real — dead ends were removed in review.</li>
              <li>Motion that explains, never decorates.</li>
            </ul>
            <h2>The numbers</h2>
            <p>
              Six weeks after launch the flow was used by 81% of daily active teams, and support tickets about the
              area dropped by a third. Replace with real project metrics.
            </p>
            <h2>What we would do differently</h2>
            <p>
              We shipped the happy path first and paid for it in review time. Next time, the edge cases get built
              into the first draft.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-[var(--hairline)] bg-[var(--canvas-soft)] p-6">
            <h2 className="text-base font-semibold">Enjoyed this?</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--body)]">
              Join the journal — one email a month, zero spam.
            </p>
            <Link to="/signup" className="gk-btn gk-btn-primary gk-btn-sm mt-4">Subscribe</Link>
          </div>
          <div className="mt-10">
            <h2 className="text-lg font-bold tracking-tight">Related reading</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((p) => (
                <Link key={p.id} to={\`/post/\${p.id}\`} className="gk-card gk-card-hover p-5">
                  <p className="text-sm font-semibold leading-6 hover:text-[var(--link)]">{p.title}</p>
                  <p className="mt-1.5 text-xs text-[var(--mute)]">{p.date} · {p.minutes} min read</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Documentation: searchable sidebar + sections. */
const PAGES_DOCS = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { PageShell, PageHero, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const SECTIONS = [
  { id: "intro", group: "Getting started", title: "Introduction", body: "Welcome. This documentation covers installation, the core concepts, and the reference for every public API. Each section ends with a working example you can run as-is." },
  { id: "install", group: "Getting started", title: "Installation", body: "Install the package with your favourite package manager, then import it in a single line. Node 20+ is supported, and the package ships with TypeScript definitions out of the box." },
  { id: "quickstart", group: "Getting started", title: "Quickstart", body: "The fastest path to a working integration takes about five minutes: create a client, call one method, and handle the result. The example below is the complete, runnable version." },
  { id: "auth", group: "Core concepts", title: "Authentication", body: "Every request is authenticated with an API key sent in the Authorization header. Keys are scoped per environment and can be rotated without downtime." },
  { id: "pagination", group: "Core concepts", title: "Pagination", body: "List endpoints return a cursor-based page of results. Follow the next cursor to walk the full collection without page-size surprises." },
  { id: "errors", group: "Core concepts", title: "Errors", body: "Errors are consistent: an HTTP status, a machine-readable code, and a human message. Retry with exponential backoff on 429 responses." },
  { id: "webhooks", group: "Reference", title: "Webhooks", body: "Webhooks notify your servers about events as they happen. Verify signatures with the secret in your dashboard, and reply 200 within 10 seconds." },
  { id: "limits", group: "Reference", title: "Rate limits", body: "The default limit is 120 requests per minute per key. Limits are measured in rolling windows and reported in the response headers." },
];

export function DocsPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(SECTIONS[0]!.id);
  const q = query.trim().toLowerCase();
  const visible = SECTIONS.filter(
    (s) => !q || s.title.toLowerCase().includes(q) || s.group.toLowerCase().includes(q) || s.body.toLowerCase().includes(q),
  );
  const activeSection = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]!;
  const groups = [...new Set(visible.map((s) => s.group))];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Documentation" title="Everything you need to build" sub="Guides, reference, and examples — with a search that actually finds things." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-4">
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--mute)]" aria-hidden="true" />
              <label htmlFor="docs-search" className="sr-only">Search documentation</label>
              <input
                id="docs-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="gk-input w-full pl-10"
                placeholder="Search docs…"
              />
            </div>
            <nav aria-label="Documentation" className="mt-5 space-y-5">
              {groups.map((g) => (
                <div key={g}>
                  <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-[var(--mute)]">{g}</h2>
                  <ul className="mt-2 space-y-0.5">
                    {visible
                      .filter((s) => s.group === g)
                      .map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => setActive(s.id)}
                            aria-current={active === s.id ? "page" : undefined}
                            className={\`block w-full rounded-lg px-2.5 py-2 text-left text-sm transition-colors \${active === s.id ? "bg-[var(--ink)] font-medium text-[var(--on-primary)]" : "text-[var(--body)] hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"}\`}
                          >
                            {s.title}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
              {visible.length === 0 && (
                <p className="px-2 text-sm text-[var(--mute)]">No sections match "{query}".</p>
              )}
            </nav>
          </aside>
          <article className="lg:col-span-3">
            <div className="gk-card p-6 sm:p-10">
              <p className="gk-chip">{activeSection.group}</p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight">{activeSection.title}</h1>
              <div className="gk-prose mt-5">
                <p>{activeSection.body}</p>
                <h2>Example</h2>
                <pre className="gk-code">{\`import { Client } from "\${name.toLowerCase().replace(/\\s+/g, "-")}";

const client = new Client({ apiKey: process.env.API_KEY });

const result = await client.items.list({ limit: 20 });
console.log(result.items);\`}</pre>
                <h2>Next steps</h2>
                <ul>
                  <li>Follow the quickstart to build your first integration.</li>
                  <li>Read the authentication guide to secure your requests.</li>
                  <li>Join the community to ask questions and share patterns.</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                disabled={active === SECTIONS[0]!.id}
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.id === active);
                  if (i > 0) setActive(SECTIONS[i - 1]!.id);
                }}
                className="gk-btn gk-btn-ghost gk-btn-sm"
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={active === SECTIONS[SECTIONS.length - 1]!.id}
                onClick={() => {
                  const i = SECTIONS.findIndex((s) => s.id === active);
                  if (i < SECTIONS.length - 1) setActive(SECTIONS[i + 1]!.id);
                }}
                className="gk-btn gk-btn-primary gk-btn-sm"
              >
                Next <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-[var(--mute)]">
              <BookOpen className="h-4 w-4" />
              Missing something? Ask on the <Link to="/contact" className="font-medium text-[var(--link)] hover:underline">contact page</Link>.
            </p>
          </article>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Learning platform pages: courses + course detail. */
const PAGES_LEARN = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, GraduationCap, PlayCircle } from "lucide-react";
import { PageShell, PageHero, Reveal, Skeleton, EmptyState, ErrorState, Stat, useAsync, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const COURSES = [
  { id: "c1", title: "Product Design Foundations", lessons: 24, hours: 6, level: "Beginner", instructor: "Ada Lovelace", price: "$49", tone: "ink" },
  { id: "c2", title: "Advanced Frontend Systems", lessons: 31, hours: 9, level: "Advanced", instructor: "Grace Hopper", price: "$89", tone: "link" },
  { id: "c3", title: "Data Storytelling with Charts", lessons: 18, hours: 4, level: "Intermediate", instructor: "Margaret Knight", price: "$39", tone: "ink" },
  { id: "c4", title: "Shipping Accessible Products", lessons: 15, hours: 3.5, level: "Intermediate", instructor: "Ada Lovelace", price: "$29", tone: "link" },
  { id: "c5", title: "Systems Design for Scale", lessons: 27, hours: 8, level: "Advanced", instructor: "Dorothy Njemile", price: "$99", tone: "ink" },
  { id: "c6", title: "Motion Design Essentials", lessons: 12, hours: 2.5, level: "Beginner", instructor: "Jorge Torres", price: "$25", tone: "link" },
];

function loadCourses() {
  return new Promise<typeof COURSES>((res) => setTimeout(() => res(COURSES), 650));
}

export function CoursesPage() {
  const { data, loading, error, reload } = useAsync(loadCourses, []);
  const [level, setLevel] = useState("All");
  const levels = ["All", "Beginner", "Intermediate", "Advanced"];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Courses" title="Learn by building" sub="Project-based courses with real instructors, lifetime access, and certificates you can share." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {levels.map((l) => (
                <button key={l} type="button" onClick={() => setLevel(l)} className={\`gk-chip \${level === l ? "gk-chip-active" : ""}\`}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-sm text-[var(--mute)]">{(data ?? []).length} courses · new ones monthly</p>
          </div>
          {loading ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="gk-card space-y-3 p-6">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="mt-8"><ErrorState message={error} onRetry={reload} /></div>
          ) : (data ?? []).length === 0 ? (
            <div className="mt-8">
              <EmptyState title="No courses match this level" body="Try another filter — new courses are added every month." icon={<BookOpen className="h-5 w-5" />} />
            </div>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(data ?? [])
                .filter((c) => level === "All" || c.level === level)
                .map((c, i) => (
                  <Reveal key={c.id} delay={i * 60}>
                    <article className="gk-card gk-card-hover flex h-full flex-col p-6">
                      <div className="flex items-center justify-between">
                        <span className={\`gk-tile h-11 w-11\`}><GraduationCap className="h-5 w-5" /></span>
                        <span className="gk-chip">{c.level}</span>
                      </div>
                      <Link to={\`/course/\${c.id}\`} className="mt-4 text-base font-semibold leading-6 hover:text-[var(--link)]">
                        {c.title}
                      </Link>
                      <p className="mt-1.5 text-xs text-[var(--mute)]">
                        {c.lessons} lessons · {c.hours}h of video · {c.instructor}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-[var(--hairline)] pt-4">
                        <p className="text-base font-bold">\${c.price}</p>
                        <Link to={\`/course/\${c.id}\`} className="gk-btn gk-btn-ghost gk-btn-sm">
                          Details <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </article>
                  </Reveal>
                ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

export function CoursePage() {
  const { id } = useParams();
  const course = COURSES.find((c) => c.id === id) ?? COURSES[0]!;
  const { data, loading, error, reload } = useAsync(loadCourses, [id]);
  const lessons = [
    "Welcome and course roadmap",
    "The core principles, in practice",
    "Hands-on: your first build",
    "Common pitfalls and how to avoid them",
    "Review, refactor, and polish",
    "Final project and certificate",
  ];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow={course.level} title={course.title} sub={\`\${course.lessons} lessons · \${course.hours}h of video · taught by \${course.instructor}\`} />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="gk-card p-6 sm:p-8">
              <h2 className="text-lg font-bold tracking-tight">About this course</h2>
              <p className="mt-3 leading-7 text-[var(--body)]">
                Replace with a course description.
              </p>
              <h2 className="mt-8 text-lg font-bold tracking-tight">Curriculum</h2>
              {loading ? (
                <div className="mt-4 space-y-3">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : error ? (
                <div className="mt-4"><ErrorState message={error} onRetry={reload} /></div>
              ) : (
                <ol className="mt-4 divide-y divide-[var(--hairline)]">
                  {lessons.map((l, i) => (
                    <li key={l} className="flex items-center gap-3 py-3.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] text-xs font-semibold text-[var(--mute)]">
                        {i + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium">{l}</p>
                      {i === 0 && <PlayCircle className="h-4 w-4 text-[var(--link)]" aria-label="Preview available" />}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="space-y-6 lg:sticky lg:top-20">
              <div className="gk-card p-6 text-center">
                <p className="text-3xl font-bold tracking-tight">\${course.price}</p>
                <p className="mt-1 text-xs text-[var(--mute)]">One-time · lifetime access</p>
                <Link to="/signup" className="gk-btn gk-btn-primary gk-btn-lg mt-5 w-full">
                  Enroll now
                </Link>
                <p className="mt-3 text-xs text-[var(--mute)]">30-day money-back guarantee</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Stat label="Lessons" value={String(course.lessons)} icon={<BookOpen className="h-4 w-4" />} />
                <Stat label="Hours" value={String(course.hours)} icon={<Clock className="h-4 w-4" />} />
              </div>
              <div className="gk-card p-6">
                <h2 className="text-sm font-semibold">Your instructor</h2>
                <div className="mt-4 flex items-center gap-3">
                  <span className="gk-avatar">{course.instructor.split(" ").map((w) => w[0]).join("")}</span>
                  <div>
                    <p className="text-sm font-semibold">{course.instructor}</p>
                    <p className="text-xs text-[var(--mute)]">Replace with the instructor bio.</p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Portfolio / agency gallery pages. */
const PAGES_WORK = (name: string, nav: Array<{ to: string; label: string }>): string => `import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { PageShell, PageHero, Reveal, type NavLink } from "../lib/ui";

const NAV: NavLink[] = ${JSON.stringify(nav)};

const PROJECTS = [
  { title: "Atlas — design system", tag: "Brand & Web", note: "Replace with a project description." },
  { title: "Nimbus — mobile app", tag: "Product", note: "Replace with a project description." },
  { title: "Beacon — internal tooling", tag: "Engineering", note: "Replace with a project description." },
  { title: "Harbor — commerce build", tag: "E-commerce", note: "Replace with a project description." },
  { title: "Orbit — campaign", tag: "Campaign", note: "Replace with a project description." },
  { title: "Pine — identity refresh", tag: "Brand & Web", note: "Replace with a project description." },
];

export function WorkPage() {
  const [filter, setFilter] = useState("All");
  const tags = ["All", ...new Set(PROJECTS.map((p) => p.tag))];
  return (
    <PageShell brand="${name}" nav={NAV}>
      <PageHero eyebrow="Selected work" title="Work that shipped" sub="A few projects we are proud of — each with its own brief, constraints, and outcome." />
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <button key={t} type="button" onClick={() => setFilter(t)} className={\`gk-chip \${filter === t ? "gk-chip-active" : ""}\`}>
                {t}
              </button>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECTS.filter((p) => filter === "All" || p.tag === filter).map((p, i) => (
              <Reveal key={p.title} delay={i * 60}>
                <article className="gk-card gk-card-hover group h-full overflow-hidden">
                  <div className={\`gk-tile relative aspect-[4/3]\`}>
                    <span className="absolute right-4 top-4 flex h-9 w-9 translate-y-1 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--on-primary)] opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--mute)]">{p.tag}</p>
                    <h2 className="mt-1.5 text-base font-semibold">{p.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--body)]">{p.note}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="text-base text-[var(--body)]">Have a brief in mind?</p>
            <Link to="/contact" className="gk-btn gk-btn-primary gk-btn-lg mt-4">
              Start a project
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
`;

/** Builds the routed App.tsx that ties the home page and page packs together. */
function shellRouter(name: string, packs: string[]): string {
  const imports: string[] = [
    'import { Routes, Route } from "react-router-dom";',
    'import { ErrorBoundary } from "./lib/ui";',
    'import { HomePage } from "./home";',
  ];
  const routes: string[] = ['<Route path="/" element={<HomePage />} />'];
  const group: Record<string, string[]> = {
    core: ['import { AboutPage, ContactPage, LoginPage, SignupPage, PrivacyPage, TermsPage, NotFoundPage } from "./pages/core";'],
    app: ['import { DashboardPage, SettingsPage, BillingPage } from "./pages/app";'],
    workspace: ['import { ProjectsPage, ProjectPage, AnalyticsPage, TeamPage } from "./pages/workspace";'],
    store: ['import { CartProvider } from "./pages/store";', 'import { ShopPage, ProductPage, CartPage, CheckoutPage } from "./pages/store";'],
    food: ['import { MenuPage, ReservationsPage, LocationsPage, GalleryPage } from "./pages/food";'],
    publish: ['import { BlogPage, ArticlePage } from "./pages/publish";'],
    docs: ['import { DocsPage } from "./pages/docs";'],
    learn: ['import { CoursesPage, CoursePage } from "./pages/learn";'],
    work: ['import { WorkPage } from "./pages/work";'],
  };
  const routeDefs: Record<string, string[]> = {
    core: [
      '<Route path="/about" element={<AboutPage />} />',
      '<Route path="/contact" element={<ContactPage />} />',
      '<Route path="/login" element={<LoginPage />} />',
      '<Route path="/signup" element={<SignupPage />} />',
      '<Route path="/privacy" element={<PrivacyPage />} />',
      '<Route path="/terms" element={<TermsPage />} />',
    ],
    app: [
      '<Route path="/dashboard" element={<DashboardPage />} />',
      '<Route path="/settings" element={<SettingsPage />} />',
      '<Route path="/billing" element={<BillingPage />} />',
    ],
    workspace: [
      '<Route path="/projects" element={<ProjectsPage />} />',
      '<Route path="/project/:id" element={<ProjectPage />} />',
      '<Route path="/analytics" element={<AnalyticsPage />} />',
      '<Route path="/team" element={<TeamPage />} />',
    ],
    store: [
      '<Route path="/shop" element={<ShopPage />} />',
      '<Route path="/product/:id" element={<ProductPage />} />',
      '<Route path="/cart" element={<CartPage />} />',
      '<Route path="/checkout" element={<CheckoutPage />} />',
    ],
    food: [
      '<Route path="/menu" element={<MenuPage />} />',
      '<Route path="/reservations" element={<ReservationsPage />} />',
      '<Route path="/locations" element={<LocationsPage />} />',
      '<Route path="/gallery" element={<GalleryPage />} />',
    ],
    publish: ['<Route path="/blog" element={<BlogPage />} />', '<Route path="/post/:id" element={<ArticlePage />} />'],
    docs: ['<Route path="/docs" element={<DocsPage />} />'],
    learn: ['<Route path="/courses" element={<CoursesPage />} />', '<Route path="/course/:id" element={<CoursePage />} />'],
    work: ['<Route path="/work" element={<WorkPage />} />'],
  };
  for (const pack of packs) {
    if (group[pack]) imports.push(...group[pack]);
    if (routeDefs[pack]) routes.push(...routeDefs[pack]);
  }
  routes.push('<Route path="*" element={<NotFoundPage />} />');
  const wrap = packs.includes("store");
  const body = wrap
    ? ["<CartProvider>", "  <Routes>", ...routes.map((r) => `    ${r}`), "  </Routes>", "</CartProvider>"].join("\n")
    : ["<Routes>", ...routes.map((r) => `    ${r}`), "</Routes>"].join("\n");
  return `${imports.join("\n")}

export default function App() {
  return (
    <ErrorBoundary>
      ${body.replace(/\n/g, "\n      ")}
    </ErrorBoundary>
  );
}
`;
}

export async function scaffoldTemplate(templateId: string, dest: string): Promise<string> {
  const tpl = getBuiltinTemplate(templateId);
  if (!tpl) throw new Error(`Unknown template: ${templateId}`);
  await mkdir(dest, { recursive: true });

  const archetype = tpl.archetype;
  const name = dest.split(/[\\/]/).pop() ?? tpl.name;

  if (archetype === "custom") {
    await writeFile(join(dest, ".gitignore"), "node_modules/\ndist/\n", "utf8");
    await writeFile(join(dest, "RIDE_TEMPLATE.json"), rideTemplateJson(tpl, archetype, name), "utf8");
    await writeAgentsMd(dest, tpl);
    return dest;
  }

  if (archetype === "api") {
    await mkdir(join(dest, "src"), { recursive: true });
    await writeFile(join(dest, "package.json"), API_PACKAGE, "utf8");
    await writeFile(join(dest, "src/index.ts"), API_INDEX, "utf8");
    await writeFile(join(dest, "Dockerfile"), API_DOCKERFILE, "utf8");
    await writeFile(join(dest, ".gitignore"), "node_modules/\ndist/\n", "utf8");
    await writeFile(join(dest, "src/index.test.ts"), API_TEST(name), "utf8");
    await writeFile(join(dest, "RIDE_TEMPLATE.json"), rideTemplateJson(tpl, archetype, name), "utf8");
    await writeAgentsMd(dest, tpl);
    return dest;
  }

  if (archetype === "cli") {
    await writeFiles(dest, CLI_FILES(name));
    await writeFile(join(dest, "RIDE_TEMPLATE.json"), rideTemplateJson(tpl, archetype, name), "utf8");
    await writeAgentsMd(dest, tpl);
    return dest;
  }

  if (archetype === "package") {
    await writeFiles(dest, PACKAGE_FILES(name));
    await writeFile(join(dest, "RIDE_TEMPLATE.json"), rideTemplateJson(tpl, archetype, name), "utf8");
    await writeAgentsMd(dest, tpl);
    return dest;
  }

  if (archetype === "extension") {
    await writeFiles(dest, EXTENSION_FILES);
    await writeFile(join(dest, "RIDE_TEMPLATE.json"), rideTemplateJson(tpl, archetype, name), "utf8");
    await writeAgentsMd(dest, tpl);
    return dest;
  }

  const files: Record<string, string> = { ...reactBase(name) };
  const familyApp = FAMILY_SOURCES[tpl.familyId];
  const source = familyApp
    ? familyApp({
        name: tpl.name,
        accent: tpl.accent,
        emoji: tpl.emoji,
      })
    : (APP_SOURCES[tpl.archetype] ?? {});
  for (const [path, content] of Object.entries(source)) {
    files[path] = content;
  }
  applyBriefTokens(files, tpl.familyId, tpl.variantIndex);

  const packs = shellPacksFor(tpl.familyId, tpl.archetype);
  if (packs && files["src/App.tsx"]) {
    const nav = shellNav(tpl.name, packs);
    files["src/home.tsx"] = files["src/App.tsx"]!.replace("export default function App()", "export function HomePage()");
    delete files["src/App.tsx"];
    files["src/App.tsx"] = shellRouter(tpl.name, packs);
    files["src/main.tsx"] = SHELL_MAIN;
    files["package.json"] = shellPackageJson(name);
    files["src/lib/ui.tsx"] = PAGES_LIB;
    files["src/pages/core.tsx"] = PAGES_CORE(tpl.name, nav);
    if (packs.includes("app")) files["src/pages/app.tsx"] = PAGES_APP(tpl.name, nav);
    if (packs.includes("workspace")) files["src/pages/workspace.tsx"] = PAGES_WORKSPACE(tpl.name, nav);
    if (packs.includes("store")) files["src/pages/store.tsx"] = PAGES_STORE(tpl.name, nav);
    if (packs.includes("food")) files["src/pages/food.tsx"] = PAGES_FOOD(tpl.name, nav);
    if (packs.includes("publish")) files["src/pages/publish.tsx"] = PAGES_PUBLISH(tpl.name, nav);
    if (packs.includes("docs")) files["src/pages/docs.tsx"] = PAGES_DOCS(tpl.name, nav);
    if (packs.includes("learn")) files["src/pages/learn.tsx"] = PAGES_LEARN(tpl.name, nav);
    if (packs.includes("work")) files["src/pages/work.tsx"] = PAGES_WORK(tpl.name, nav);
    files["src/index.css"] = `${files["src/index.css"] ?? ""}${SHELL_CSS}`;
  }

  if (archetype === "pwa") {
    files["index.html"] = pwaIndexHtml(name);
    files["public/manifest.webmanifest"] = pwaManifest(name);
  }
  files["RIDE_TEMPLATE.json"] = rideTemplateJson(tpl, archetype, name);
  await writeFiles(dest, files);
  await writeAgentsMd(dest, tpl);
  return dest;
}

export interface MultiPageScaffoldOptions {
  name: string;
  accent: string;
  architecture: ProductArchetypeArchitecture;
  framework: string;
  styling: string;
}

/**
 * Scaffold a complete multi-page product template from a product architecture.
 * Generates routing, layouts, page components, auth state, and all required files.
 */
export async function scaffoldMultiPageTemplate(
  dest: string,
  architecture: ProductArchetypeArchitecture,
  templateInfo: { name: string; accent: string; framework: string; styling: string }
): Promise<void> {
  await mkdir(dest, { recursive: true });
  const { name, accent, framework, styling } = templateInfo;
  const arch = architecture;
  const isMobile = arch.section === "mobile";
  const isWebapp = arch.section === "webapps";
  const isWebsite = arch.section === "websites";
  const isAi = arch.section === "ai";
  const isDesktop = arch.section === "desktop";
  const isDeveloper = arch.section === "developer";
  const isGames = arch.section === "games";
  const isStarter = arch.section === "starter";
  const files: Record<string, string> = {};

  // ── 1. Design tokens CSS ──────────────────────────────────────────────
  const designLang = arch.designLanguage;
  const cssTokens = designLanguageTokens(designLang, accent);
  files["src/index.css"] = cssTokens;

  // ── 2. Shared UI library primitives ───────────────────────────────────
  files["src/lib/ui.tsx"] = multiPageUiLib(arch.requiredComponents, arch.states);

  // ── 3. Home page ──────────────────────────────────────────────────────
  const homeSpec: PageSpec =
    arch.pages["/"] ??
    Object.values(arch.pages)[0] ?? {
      path: "/",
      title: arch.name,
      component: "Home",
      requiresAuth: false,
      states: arch.states,
      sections: ["hero", "cards", "form"],
      actions: [],
    };
  files["src/home.tsx"] = multiPageHome(homeSpec, arch, name);

  // ── 4. Page components ────────────────────────────────────────────────
  const pagesDir = "src/pages";
  await mkdir(join(dest, pagesDir), { recursive: true });
  const pageKeys: string[] = [];
  const pageNames: string[] = [];
  const usedSections = new Set<string>();
  for (const [pathKey, pageSpec] of Object.entries(arch.pages)) {
    if (pathKey === "/") continue;
    const sanitized = pageKeyToFile(pathKey);
    const componentName = `Page${capitalizeComponentName(sanitized)}`;
    pageKeys.push(sanitized);
    pageNames.push(componentName);
    pageSpec.sections.forEach((s) => usedSections.add(s));
    files[`${pagesDir}/${sanitized}.tsx`] = multiPagePageComponent(componentName, pageSpec, arch, name);
  }

  // ── 4b. Auth pages (login / signup / dashboard) ───────────────────────
  if (arch.authFlow !== "none") {
    for (const kind of ["login", "signup", "dashboard"] as const) {
      if (arch.pages[`/${kind}`]) continue;
      const file = kind === "dashboard" ? "dashboard" : kind;
      pageKeys.push(file);
      pageNames.push(`${capitalizeComponentName(file)}Page`);
      files[`${pagesDir}/${file}.tsx`] = multiPageAuthPage(kind, name, arch);
    }
  }

  // ── 4c. Sections library (all sections referenced by pages + home) ────
  homeSpec.sections.forEach((s) => usedSections.add(s));
  files["src/sections.tsx"] = multiPageSections(usedSections);

  // ── 4d. Barrel export for pages ───────────────────────────────────────
  files[`${pagesDir}/index.ts`] = pageNames
    .map((n, i) => `export { default as ${n} } from "./${pageKeys[i]}";`)
    .join("\n");

  // ── 5. App shell with React Router ────────────────────────────────────
  const pageEntries: { path: string; component: string }[] = [];
  for (const [pathKey, pageSpec] of Object.entries(arch.pages)) {
    if (pathKey === "/") continue;
    pageEntries.push({ path: pageSpec.path, component: `Page${capitalizeComponentName(pageKeyToFile(pathKey))}` });
  }
  if (arch.authFlow !== "none") {
    pageEntries.push(
      { path: "/login", component: "LoginPage" },
      { path: "/signup", component: "SignupPage" },
      { path: "/dashboard", component: "DashboardPage" },
    );
  }
  files["src/App.tsx"] = multiPageAppShell(arch, name, pageEntries, pageNames);

  // ── 6. Main entry ─────────────────────────────────────────────────────
  files["src/main.tsx"] = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`;

  // ── 6b. Vite config + entry html ──────────────────────────────────────
  files["index.html"] = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
  files["vite.config.ts"] = 'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nimport tailwindcss from "@tailwindcss/vite";\n\nexport default defineConfig({\n  plugins: [react(), tailwindcss()],\n});\n';
  files["tsconfig.json"] =
    '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "jsx": "react-jsx",\n    "strict": true,\n    "skipLibCheck": true,\n    "noEmit": true,\n    "lib": ["ES2022", "DOM", "DOM.Iterable"]\n  },\n  "include": ["src"]\n}\n';

  // ── 7. Package.json ───────────────────────────────────────────────────
  files["package.json"] = multiPagePackageJson(name, framework, isMobile, isWebapp, isWebsite, isAi, isDesktop, isDeveloper, isGames, isStarter);

  // ── 8. RIDE_TEMPLATE.json ─────────────────────────────────────────────
  files["RIDE_TEMPLATE.json"] = rideTemplateJsonFromArchitecture(arch, name, framework, styling);

  // ── 9. AGENTS.md ──────────────────────────────────────────────────────
  await writeAgentsMd(dest, { name, description: arch.description, framework, styling, ui: "galaxy", icons: "lucide-react", animation: "none" });

  // ── 10. Write all files ───────────────────────────────────────────────
  await writeFiles(dest, files);
}

function pageKeyToFile(pathKey: string): string {
  return pathKey.replace(/^\/+/, "").replace(/[^a-z0-9-_]+/gi, "-") || "home";
}

/* ════════════════════════════════════════════════════════════════════════
   Helpers: design tokens, UI lib, page components, app shell, package json
   ════════════════════════════════════════════════════════════════════════ */

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1]!, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/* Design language → CSS token mapping */
function designLanguageTokens(designLang: string, accent: string): string {
  const accentRgb = hexToRgb(accent);
  const base = {
    editorial: {
      canvas: "#ffffff",
      "canvas-soft": "#fafafa",
      ink: "#171717",
      body: "#4a4a4a",
      mute: "#737373",
      hairline: "#ebebeb",
      link: accent,
      "on-primary": "#ffffff",
      success: "#16a34a",
      error: "#dc2626",
    },
    swiss: {
      canvas: "#f4f4f5",
      "canvas-soft": "#fafafa",
      ink: "#18181b",
      body: "#52525b",
      mute: "#86868b",
      hairline: "#e5e5e7",
      link: accent,
      "on-primary": "#0c0c0d",
      success: "#059669",
      error: "#ef4444",
    },
    "neo-brutalist": {
      canvas: "#000000",
      "canvas-soft": "#1f1f1f",
      ink: "#fafafa",
      body: "#e4e4e7",
      mute: "#a3a3a7",
      hairline: "#3f3f46",
      link: accent,
      "on-primary": "#000000",
      success: "#34d399",
      error: "#f87171",
    },
    "minimal-luxury": {
      canvas: "#fafaf9",
      "canvas-soft": "#f5f5f4",
      ink: "#18181b",
      body: "#4f4f56",
      mute: "#88888f",
      hairline: "#d0d0d5",
      link: accent,
      "on-primary": "#ffffff",
      success: "#059669",
      error: "#ef4444",
    },
    "glass-spatial": {
      canvas: "rgba(20, 25, 35, 0.8)",
      "canvas-soft": "rgba(30, 35, 50, 0.7)",
      ink: "#f8f9fa",
      body: "#a3a6ad",
      mute: "#6b7280",
      hairline: "rgba(255, 255, 255, 0.2)",
      link: accent,
      "on-primary": "#ffffff",
      success: "#10b981",
      error: "#f87171",
    },
    "digital-futurism": {
      canvas: "#0a0a0f",
      "canvas-soft": "#141421",
      ink: "#e8e8f0",
      body: "#9aa0a6",
      mute: "#5f6a78",
      hairline: "#2a2d38",
      link: accent,
      "on-primary": "#ffffff",
      success: "#06b6d4",
      error: "#f472b6",
    },
    organic: {
      canvas: "#fdf6f0",
      "canvas-soft": "#e8dad0",
      ink: "#2d3436",
      body: "#666666",
      mute: "#888888",
      hairline: "#a0a0a0",
      link: accent,
      "on-primary": "#ffffff",
      success: "#22c55e",
      error: "#ef4444",
    },
    "editorial-commerce": {
      canvas: "#fafbfc",
      "canvas-soft": "#f0f2f5",
      ink: "#1a1d24",
      body: "#4e5667",
      mute: "#9199a9",
      hairline: "#e0e3ea",
      link: accent,
      "on-primary": "#fafbfc",
      success: "#059669",
      error: "#ef4444",
    },
    industrial: {
      canvas: "#18181b",
      "canvas-soft": "#252526",
      ink: "#fafafa",
      body: "#e4e7ec",
      mute: "#a3a6ad",
      hairline: "#3f3f46",
      link: accent,
      "on-primary": "#000000",
      success: "#34d399",
      error: "#f87171",
    },
    cinematic: {
      canvas: "#0f0f0f",
      "canvas-soft": "#1e1e1e",
      ink: "#fafafa",
      body: "#e4e7ec",
      mute: "#a3a6ad",
      hairline: "#3f3f46",
      link: accent,
      "on-primary": "#ffffff",
      success: "#06b6d4",
      error: "#f472b6",
    },
    playful: {
      canvas: "#ffffff",
      "canvas-soft": "#fafafa",
      ink: "#111827",
      body: "#374151",
      mute: "#6b7280",
      hairline: "#d1d5db",
      link: accent,
      "on-primary": "#ffffff",
      success: "#10b981",
      error: "#f87171",
    },
    "data-dense": {
      canvas: "#0e0e12",
      "canvas-soft": "#18181b",
      ink: "#fafafa",
      body: "#e5e7eb",
      mute: "#9ca3af",
      hairline: "#3f3f46",
      link: accent,
      "on-primary": "#0f0f12",
      success: "#059669",
      error: "#ef4444",
    },
    architectural: {
      canvas: "#faf8f5",
      "canvas-soft": "#f5f0ea",
      ink: "#2d3748",
      body: "#64748b",
      mute: "#a0aec0",
      hairline: "#cbd5e1",
      link: accent,
      "on-primary": "#1a202c",
      success: "#059669",
      error: "#ef4444",
    },
    experimental: {
      canvas: "#1c1c1e",
      "canvas-soft": "#2a2a2d",
      ink: "#f5f6fa",
      body: "#718096",
      mute: "#a3b1bf",
      hairline: "#d5d8dc",
      link: accent,
      "on-primary": "#ffffff",
      success: "#06b6d4",
      error: "#f472b6",
    },
  }[designLang] ?? {
    canvas: "#ffffff",
    "canvas-soft": "#fafafa",
    ink: "#171717",
    body: "#4a4a4a",
    mute: "#737373",
    hairline: "#ebebeb",
    link: accent,
    "on-primary": "#ffffff",
    success: "#16a34a",
    error: "#dc2626",
  };

  const tokens: string[] = [];
  for (const [key, val] of Object.entries(base)) {
    tokens.push(`  --${key}: ${val};`);
  }
  tokens.push(`  --accent: ${accent};`);
  return `/* Product architecture design tokens ────────────────────────────────── */
@import "tailwindcss";

:root {
${tokens.join("\n")}
}
/* ── Component primitives ──────────────────────────────────────────── */
.gk-skeleton { position: relative; overflow: hidden; border-radius: 8px; background: var(--canvas-soft); }
.gk-skeleton::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent); animation: gk-shimmer 1.4s infinite; }
@keyframes gk-shimmer { 100% { transform: translateX(100%); } }
.gk-prose { line-height: 1.75; color: var(--body); }
.gk-prose h2 { color: var(--ink); font-size: 1.25rem; font-weight: 700; margin: 2rem 0 0.75rem; }
.gk-prose h3 { color: var(--ink); font-size: 1.05rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
.gk-prose p { margin: 0.75rem 0; }
.gk-prose ul { list-style: disc; padding-left: 1.25rem; margin: 0.75rem 0; }
.gk-prose li { margin: 0.35rem 0; }
.gk-prose code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875em; background: var(--canvas-soft); border: 1px solid var(--hairline); border-radius: 6px; padding: 0.1em 0.35em; }
.gk-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; line-height: 1.6; background: var(--canvas-soft); border: 1px solid var(--hairline); border-radius: 12px; padding: 1rem 1.25rem; overflow-x: auto; color: var(--body); }
.gk-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.gk-table th { text-align: left; font-weight: 600; color: var(--ink); border-bottom: 1px solid var(--hairline); padding: 0.6rem 0.75rem; }
.gk-table td { border-bottom: 1px solid var(--hairline); padding: 0.6rem 0.75rem; color: var(--body); }
.gk-chip { display: inline-flex; align-items: center; gap: 0.35rem; border-radius: 999px; border: 1px solid var(--hairline); background: var(--canvas); padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 500; color: var(--body); transition: all 0.15s ease; }
.gk-chip-active { border-color: var(--ink); background: var(--ink); color: var(--on-primary); }
.gk-progress-bar { height: 8px; border-radius: 999px; background: var(--canvas-soft); overflow: hidden; }
.gk-progress-bar > div { height: 100%; border-radius: 999px; background: var(--ink); transition: width 0.6s ease; }
.gk-tile { display: inline-flex; align-items: center; justify-content: center; border-radius: 14px; background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--canvas)), color-mix(in srgb, var(--accent) 6%, var(--canvas-soft))); border: 1px solid var(--hairline); color: var(--ink); }
@media (prefers-reduced-motion: reduce) { .gk-skeleton::after { animation: none; } }
/* ── Buttons, cards, forms, logo ────────────────────────────────────── */
.gk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; border-radius: 999px; font-weight: 500; font-size: 0.875rem; line-height: 1; padding: 0.65rem 1.1rem; border: 1px solid transparent; cursor: pointer; transition: all 0.15s ease; }
.gk-btn:focus-visible { outline: 2px solid var(--link); outline-offset: 2px; }
.gk-btn-primary { background: var(--ink); color: var(--on-primary); }
.gk-btn-primary:hover { opacity: 0.9; }
.gk-btn-secondary { background: var(--canvas-soft); border-color: var(--hairline); color: var(--ink); }
.gk-btn-secondary:hover { border-color: var(--ink); }
.gk-btn-ghost { background: transparent; color: var(--body); }
.gk-btn-ghost:hover { color: var(--ink); background: var(--canvas-soft); }
.gk-btn-danger { background: var(--error); color: #ffffff; }
.gk-btn-sm { padding: 0.45rem 0.85rem; font-size: 0.8125rem; }
.gk-btn-icon { padding: 0.55rem; border-radius: 999px; border-color: var(--hairline); background: var(--canvas); }
.gk-btn[disabled] { opacity: 0.55; cursor: not-allowed; }
.gk-card { border: 1px solid var(--hairline); border-radius: 16px; background: var(--canvas); }
.gk-input { width: 100%; border-radius: 12px; border: 1px solid var(--hairline); background: var(--canvas); padding: 0.6rem 0.85rem; font-size: 0.875rem; color: var(--ink); transition: border-color 0.15s ease; }
.gk-input:focus-visible { outline: none; border-color: var(--link); box-shadow: 0 0 0 3px color-mix(in srgb, var(--link) 18%, transparent); }
.gk-label { display: block; font-size: 0.8125rem; font-weight: 500; color: var(--body); margin-bottom: 0.35rem; }
.gk-logo-mark { display: inline-flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border-radius: 999px; background: var(--ink); color: var(--on-primary); font-size: 0.875rem; font-weight: 700; }
.gk-logo { font-weight: 700; font-size: 1rem; letter-spacing: -0.01em; }
.gk-sticky-nav { -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.gk-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.7rem; font-weight: 600; background: color-mix(in srgb, var(--accent) 16%, var(--canvas)); color: var(--link); }
.gk-badge-muted { background: var(--canvas-soft); color: var(--mute); border: 1px solid var(--hairline); }
.gk-section-title { font-size: 1.5rem; font-weight: 700; letter-spacing: -0.02em; color: var(--ink); }
.gk-section-eyebrow { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--link); }
@media (prefers-reduced-motion: reduce) { .gk-btn, .gk-card, .gk-chip, .gk-input { transition: none; } }
`;
}

/* Build the shared UI library for multi-page products */
function multiPageUiLib(requiredComponents: string[], states: PageState): string {
  const hasUnauthorized = states.unauthorized;

  return `import { Component, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle, X, Menu } from "lucide-react";

/* ── Page state ─────────────────────────────────────────────────────── */
export interface PageState {
  loading: boolean;
  loaded: boolean;
  empty: boolean;
  error: string | null;
  success: boolean;
  unauthorized: boolean;
  offline: boolean;
}

/* ── Error boundary ─────────────────────────────────────────────────── */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state: { error: string | null } = { error: null };
  static getDerivedStateFromError(err: unknown) {
    return { error: err instanceof Error ? err.message : "Unexpected error" };
  }
  componentDidCatch(err: unknown) {
    console.error("ErrorBoundary caught:", err);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-[var(--error)] mb-4" />
            <h1 className="text-base font-semibold text-[var(--ink)]">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--mute)]">{this.state.error}</p>
            <button
              type="button"
              className="mt-6 gk-btn gk-btn-primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.href = "/";
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ── State overlay ──────────────────────────────────────────────────── */
export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="gk-skeleton animate-pulse h-64 w-80 rounded-lg" />
    </div>
  );
}

export function EmptyState({ children, retry, retryLabel }: { children: ReactNode; retry?: () => void; retryLabel?: string }) {
  return (
    <div className="text-center py-12">
      <Loader2 className="mx-auto h-12 w-12 text-[var(--mute)] mb-4" />
      <h3 className="text-sm font-medium text-[var(--mute)]">{children}</h3>
      {retry && (
        <button onClick={retry} className="mt-4 gk-btn gk-btn-secondary gk-btn-sm">
          {retryLabel || "Retry"}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ children, error, retry, retryLabel }: { children: ReactNode; error: string; retry?: () => void; retryLabel?: string }) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="mx-auto h-12 w-12 text-[var(--error)] mb-4" />
      <h3 className="text-sm font-medium text-[var(--error)]">{children}</h3>
      {retry && (
        <button onClick={retry} className="mt-4 gk-btn gk-btn-secondary gk-btn-sm">
          {retryLabel || "Retry"}
        </button>
      )}
    </div>
  );
}

export function SuccessState({ children, confirmed }: { children: ReactNode; confirmed?: boolean }) {
  return (
    <div className="text-center py-8">
      <CheckCircle className="mx-auto h-12 w-12 text-[var(--success)] mb-4" />
      {children}
      {confirmed && <p className="mt-2 text-sm text-[var(--mute)]">Changes saved successfully</p>}
    </div>
  );
}

/* ── State-aware card ────────────────────────────────────────────────── */
export function StateAwareCard({ state, children, fallback, error, success }: { state?: PageState; children: ReactNode; fallback?: ReactNode; error?: ReactNode; success?: ReactNode }) {
  if (state?.loading) return fallback || <LoadingState>{children}</LoadingState>;
  if (state?.error) return error || <ErrorState error={state.error}>{children}</ErrorState>;
  if (state?.success) return success || <SuccessState>{children}</SuccessState>;
  return <div className="gk-card p-6">{children}</div>;
}

/* ── NavLink ─────────────────────────────────────────────────────────── */
export interface NavLink {
  to: string;
  label: string;
  icon?: string;
  requiresAuth?: boolean;
}

/* ── Page shell with navigation ──────────────────────────────────────── */
export function PageShell({ brand, nav, children }: { brand: string; nav: NavLink[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="gk-sticky-nav sticky top-0 z-40 border-b border-[var(--hairline)] bg-[var(--canvas)]/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Home">
            <span className="gk-logo-mark">{brand.charAt(0).toUpperCase()}</span>
            <span className="gk-logo">{brand}</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {nav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[var(--body)] transition-colors hover:bg-[var(--canvas-soft)] hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {nav.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="gk-btn gk-btn-ghost gk-btn-sm"
              >
                {l.label}
              </Link>
            ))}
            {hasUnauthorized && (
              <Link to="/login" className="gk-btn gk-btn-ghost gk-btn-sm">
                Log in
              </Link>
            )}
            {hasUnauthorized && (
              <Link to="/signup" className="gk-btn gk-btn-primary gk-btn-sm">
                Get started
              </Link>
            )}
          </div>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="gk-btn gk-btn-icon md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      <main className="min-h-[60vh] px-4 pb-4">{children}</main>
      <footer className="border-t border-[var(--hairline)] bg-[var(--canvas-soft)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div className="space-y-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="gk-logo-mark">{brand.charAt(0).toUpperCase()}</span>
              <span className="gk-logo">{brand}</span>
            </Link>
            <p className="max-w-xs text-sm leading-6 text-[var(--mute)]">
              Built to feel like a real product from the first click. Pages, auth, and flows included.
            </p>
          </div>
          <div>
            <h3 className="gk-chip">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {nav.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="gk-chip">Product</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/dashboard" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Dashboard</Link></li>
              <li><Link to="/settings" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Settings</Link></li>
              <li><Link to="/billing" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Billing</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="gk-chip">Company</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">About</Link></li>
              <li><Link to="/contact" className="text-[var(--body)] transition-colors hover:text-[var(--ink)]">Contact</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Notification dot ─────────────────────────────────────────────────── */
export function NotificationDot({ count }: { count?: number }) {
  return count && count > 0 ? (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--on-primary)]">
      {count}
    </span>
  ) : null;
}
`;
}

/* Generate the home page component based on architecture */
function multiPageHome(pageSpec: PageSpec, arch: ProductArchetypeArchitecture, name: string): string {
  const { title, sections } = pageSpec;
  const heroUsed = sections.some((s) => ["hero", "featured-work", "featured-dishes", "hero-banner"].includes(s));
  const cardsUsed = sections.some((s) => ["cards", "project-grid", "food-items", "product-cards", "post-feed"].includes(s));
  const formUsed = sections.some((s) => ["form", "write-review", "caption"].includes(s));
  const tableUsed = sections.some((s) => s === "table");
  const sectionImports = [
    heroUsed ? "Hero" : "",
    cardsUsed ? "Featured" : "",
    formUsed ? "Cta" : "",
  ]
    .filter(Boolean)
    .join(", ");
  const navJson = JSON.stringify(navLinks(arch.primaryNav));

  return `import { useState, useEffect } from "react";
import type { PageState } from "./lib/ui";
import { PageShell } from "./lib/ui";
import { LoadingState, EmptyState, ErrorState, SuccessState } from "./lib/ui";
${sectionImports ? `import { ${sectionImports} } from "./sections";` : ""}

export default function HomePage() {
  const [state, setState] = useState<PageState>({
    loading: ${JSON.stringify(arch.states.loading)},
    loaded: ${JSON.stringify(arch.states.loaded)},
    empty: ${JSON.stringify(arch.states.empty)},
    error: ${JSON.stringify(arch.states.error)},
    success: ${JSON.stringify(arch.states.success)},
    unauthorized: ${JSON.stringify(arch.states.unauthorized)},
    offline: ${JSON.stringify(arch.states.offline)},
  });

  useEffect(() => {
    setState((s) => ({ ...s, loading: false, loaded: true }));
  }, []);

  if (state.loading) return <LoadingState>Discovering ${title}…</LoadingState>;
  if (state.error) return <ErrorState error="${arch.states.error || "Failed to load"}">{state.error}</ErrorState>;
  if (state.unauthorized) return <ErrorState error="Session expired. Please log in.">{state.error}</ErrorState>;
  if (state.empty) return <EmptyState>${arch.states.empty || "No content yet"}</EmptyState>;

  return (
    <PageShell brand="${name}" nav={${navJson}}>
      <section className="page-hero">
        ${heroUsed ? `<Hero />` : ""}
        ${cardsUsed ? `<Featured />` : ""}
        ${formUsed ? `<Cta />` : ""}
      </section>
      <section className="py-12">
        ${tableUsed ? `<div className="gk-prose">{/* table content */}</div>` : ""}
      </section>
    </PageShell>
  );
}
`;
}

/* Section name → generated component name (kept in sync with multiPageSections) */
const SECTION_COMPONENT: Record<string, string> = {
  "hero": "Hero",
  "cards": "CardsGrid",
  "form": "FormState",
  "table": "TableState",
  "post-feed": "FeedPosts",
  "product-grid": "ProductGrid",
  "hero-banner": "HeroBanner",
  "categories": "CategoryFilter",
  "filter-sidebar": "FilterSidebar",
  "cart-badge": "CartBadge",
  "checkout-flow": "CheckoutFlow",
  "kpi-cards": "KpiCards",
  "charts": "ChartRenderer",
  "activity-feed": "ActivityFeed",
  "quick-actions": "QuickActions",
  "date-picker": "DatePicker",
  "time-slots": "TimeSlots",
  "party-size": "PartySize",
  "special-requests": "SpecialRequests",
  "map": "MapComponent",
  "gallery": "Gallery",
  "reviews-summary": "ReviewsSummary",
  "write-review": "WriteReview",
  "specials": "Specials",
  "post-media": "MediaSelector",
  "post-editor": "PostEditor",
  "caption": "CaptionInput",
  "hashtags": "HashtagTags",
  "media-viewer": "MediaViewer",
  "conversation-header": "ConversationHeader",
  "message-list": "MessageList",
  "composer": "MessageComposer",
  "profile-header": "ProfileHeader",
  "posts-grid": "PostsGrid",
  "followers": "Followers",
  "following": "Following",
  "edit-profile": "EditProfileForm",
  "balance-card": "BalanceCard",
  "recent-transactions": "RecentTransactions",
  "budget-progress": "BudgetProgress",
  "chart-widget": "ChartWidget",
  "progress-bar": "ProgressBar",
  "post-composer": "PostComposer",
};

/* Generate a page component based on the page specification */
function multiPagePageComponent(
  name: string,
  spec: PageSpec,
  arch: ProductArchetypeArchitecture,
  projectName: string
): string {
  const { path, title, sections, actions } = spec;
  const componentNames = [...new Set(sections.map((s) => SECTION_COMPONENT[s] ?? `Section${capitalizeComponentName(s)}`))];
  const navJson = JSON.stringify(navLinks(arch.primaryNav));
  const actionsJson = JSON.stringify(actions);

  const sectionRenderers = sections
    .map((section: string) => {
      switch (section) {
        case "hero":
          return `<Hero title="${title}" />`;
        case "caption":
          return `<CaptionInput />`;
        case "chart-widget":
          return `<ChartWidget />`;
        default:
          return `<${SECTION_COMPONENT[section] ?? `Section${capitalizeComponentName(section)}`} />`;
      }
    })
    .join("\n        ");

  return `import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { PageState } from "../lib/ui";
import { PageShell, LoadingState, EmptyState, ErrorState } from "../lib/ui";
${componentNames.length > 0 ? `import { ${componentNames.join(", ")} } from "./sections";` : ""}

export default function ${name}Page() {
  const [state, setState] = useState<PageState>({
    loading: ${JSON.stringify(spec.states.loading)},
    loaded: ${JSON.stringify(spec.states.loaded)},
    empty: ${JSON.stringify(spec.states.empty)},
    error: ${JSON.stringify(spec.states.error)},
    success: ${JSON.stringify(spec.states.success)},
    unauthorized: ${JSON.stringify(spec.states.unauthorized)},
    offline: ${JSON.stringify(spec.states.offline)},
  });
  const actions = ${actionsJson};

  useEffect(() => {
    setState((s) => ({ ...s, loading: false, loaded: true }));
  }, []);

  if (state.loading) return <LoadingState>Loading ${title}…</LoadingState>;
  if (state.error) return <ErrorState error="${spec.states.error || "Failed to load"}">{state.error}</ErrorState>;
  if (state.unauthorized) return <ErrorState error="Session expired. Please log in.">{state.error}</ErrorState>;
  if (state.empty) return <EmptyState>${spec.states.empty || "No content yet"}</EmptyState>;

  return (
    <PageShell brand="${projectName}" nav={${navJson}}>
      <section className="mx-auto max-w-6xl space-y-10 py-10">
        <div className="space-y-1.5">
          <h1 className="gk-section-title">${title}</h1>
          <p className="text-sm text-[var(--mute)]">A complete, working view of ${title.toLowerCase()} for this product.</p>
        </div>
        ${sectionRenderers}
        {actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {actions.map((a) =>
              a.handler === "navigate" && a.target ? (
                <Link key={a.label} to={a.target} className="gk-btn gk-btn-primary">
                  {a.label}
                </Link>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  className="gk-btn gk-btn-secondary"
                  onClick={() => setState((s) => ({ ...s, success: true, loading: false }))}
                >
                  {a.label}
                </button>
              )
            )}
          </div>
        )}
      </section>
    </PageShell>
  );
}
`;
}

/* Generate navigation links from primary nav */
function navLinks(nav: any[]): any {
  return nav.map((l: any) => ({ to: l.href || l.path || "/", label: l.label, icon: l.icon }));
}

/* Home-page section aliases → generated component names */
const HOME_SECTION_COMPONENT: Record<string, string> = {
  "hero": "Hero",
  "hero-banner": "HeroBanner",
  "featured-work": "Featured",
  "featured-dishes": "Featured",
  "food-items": "Featured",
  "product-cards": "Featured",
  "project-grid": "Featured",
  "post-feed": "Featured",
  "form": "Cta",
  "write-review": "Cta",
  "caption": "Cta",
};

/* Shared lucide icons used by generated sections */
const SECTIONS_ICONS =
  'import { Heart, MessageCircle, Star, ShoppingBag, MapPin, Send, User, Plus, Minus, ChevronRight, TrendingUp, DollarSign, ArrowRight, Image as ImageIcon, Upload, Search, Activity, BarChart3, Wallet, Phone, Mail } from "lucide-react";';

const SECTION_IMPLS: Record<string, string> = {
  Hero: `export function Hero({ title }: { title?: string }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--canvas-soft)]">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <p className="gk-section-eyebrow">Welcome</p>
        <h2 className="mt-4 text-4xl font-bold tracking-tight text-[var(--ink)] sm:text-5xl">
          {title || "Build something people love"}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--body)]">
          A complete, working product experience — every page, flow, and state is wired up.
        </p>
      </div>
    </section>
  );
}`,
  Featured: `export function Featured() {
  const items = [
    { title: "First feature", body: "A short, punchy summary of what this does for the user." },
    { title: "Second feature", body: "A short, punchy summary of what this does for the user." },
    { title: "Third feature", body: "A short, punchy summary of what this does for the user." },
  ];
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      {items.map((i) => (
        <article key={i.title} className="gk-card p-6">
          <h3 className="font-semibold text-[var(--ink)]">{i.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--body)]">{i.body}</p>
        </article>
      ))}
    </section>
  );
}`,
  Cta: `export function Cta() {
  return (
    <section className="rounded-3xl border border-[var(--hairline)] bg-[var(--ink)] px-6 py-14 text-center text-[var(--on-primary)]">
      <h2 className="text-3xl font-bold tracking-tight">Get started today</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 opacity-80">
        Join now and start using the product end-to-end — no setup required.
      </p>
      <button type="button" className="mt-6 gk-btn gk-btn-primary bg-[var(--accent)] text-white hover:opacity-90">
        Get started
      </button>
    </section>
  );
}`,
  CardsGrid: `export function CardsGrid() {
  const items = [1, 2, 3, 4].map((n) => ({
    title: "Item " + n,
    body: "A short description of this item, showing what the user gets.",
  }));
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((i) => (
        <article key={i.title} className="gk-card p-6">
          <h3 className="font-semibold text-[var(--ink)]">{i.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--body)]">{i.body}</p>
        </article>
      ))}
    </div>
  );
}`,
  FormState: `export function FormState() {
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  return (
    <div className="gk-card mx-auto max-w-md p-8">
      {done ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--success)]" />
          <p className="mt-3 text-sm font-medium text-[var(--ink)]">Submitted successfully</p>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            setTimeout(() => setDone(true), 600);
          }}
        >
          <div>
            <label className="gk-label" htmlFor="name">Name</label>
            <input id="name" className="gk-input" placeholder="Your name" required />
          </div>
          <div>
            <label className="gk-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="gk-input" placeholder="you@example.com" required />
          </div>
          <button type="submit" className="gk-btn gk-btn-primary w-full" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}`,
  TableState: `export function TableState() {
  const rows = [
    { name: "Alpha", status: "Active", updated: "2m ago" },
    { name: "Bravo", status: "Active", updated: "14m ago" },
    { name: "Charlie", status: "Paused", updated: "1h ago" },
  ];
  return (
    <div className="gk-card overflow-x-auto">
      <table className="gk-table">
        <thead>
          <tr><th>Name</th><th>Status</th><th>Updated</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td className="font-medium text-[var(--ink)]">{r.name}</td>
              <td><span className="gk-badge">{r.status}</span></td>
              <td>{r.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
  FeedPosts: `export function FeedPosts() {
  const [liked, setLiked] = useState<number[]>([]);
  const posts = [
    { id: 1, author: "Maya", body: "Morning coffee and a fresh idea. ☕", likes: 42, comments: 6 },
    { id: 2, author: "Leo", body: "Shipped the new onboarding flow today!", likes: 128, comments: 23 },
    { id: 3, author: "Aria", body: "Golden hour from the studio window.", likes: 87, comments: 9 },
  ];
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <article key={p.id} className="gk-card p-6">
          <p className="text-sm font-semibold text-[var(--ink)]">{p.author}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--body)]">{p.body}</p>
          <div className="mt-4 flex items-center gap-4 text-xs text-[var(--mute)]">
            <button type="button" className="inline-flex items-center gap-1" onClick={() => setLiked((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))}>
              <Heart className={"h-4 w-4 " + (liked.includes(p.id) ? "fill-[var(--accent)] text-[var(--accent)]" : "")} /> {p.likes + (liked.includes(p.id) ? 1 : 0)}
            </button>
            <span className="inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {p.comments}</span>
          </div>
        </article>
      ))}
    </div>
  );
}`,
  ProductGrid: `export function ProductGrid() {
  const products = [
    { name: "Classic tee", price: 24 },
    { name: "Canvas tote", price: 18 },
    { name: "Ceramic mug", price: 14 },
    { name: "Field notes", price: 9 },
    { name: "Desk lamp", price: 42 },
    { name: "Speaker", price: 68 },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <article key={p.name} className="gk-card p-5">
          <div className="gk-tile h-32 w-full text-2xl">{p.name.charAt(0)}</div>
          <div className="mt-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">{p.name}</h3>
            <span className="text-sm font-medium text-[var(--link)]">${"$"}{p.price}</span>
          </div>
          <button type="button" className="mt-4 gk-btn gk-btn-secondary gk-btn-sm w-full">Add to cart</button>
        </article>
      ))}
    </div>
  );
}`,
  HeroBanner: `export function HeroBanner() {
  return (
    <section className="rounded-3xl border border-[var(--hairline)] bg-gradient-to-r from-[color-mix(in_srgb,var(--accent)_20%,var(--canvas))] to-[var(--canvas-soft)] px-6 py-16">
      <h2 className="max-w-xl text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
        Everything you need, in one place
      </h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-[var(--body)]">
        Browse, compare, and take action without leaving the page.
      </p>
      <div className="mt-6 flex gap-3">
        <button type="button" className="gk-btn gk-btn-primary">Explore</button>
        <button type="button" className="gk-btn gk-btn-secondary">Learn more</button>
      </div>
    </section>
  );
}`,
  CategoryFilter: `export function CategoryFilter() {
  const [active, setActive] = useState("All");
  const categories = ["All", "Design", "Development", "Marketing", "Finance"];
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categories">
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          role="tab"
          aria-selected={active === c}
          onClick={() => setActive(c)}
          className={"gk-chip " + (active === c ? "gk-chip-active" : "")}
        >
          {c}
        </button>
      ))}
    </div>
  );
}`,
  FilterSidebar: `export function FilterSidebar() {
  const [selected, setSelected] = useState<string[]>([]);
  const options = ["In stock", "On sale", "New", "Popular"];
  return (
    <aside className="gk-card space-y-3 p-5">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Filters</h3>
      {options.map((o) => (
        <label key={o} className="flex items-center gap-2.5 text-sm text-[var(--body)]">
          <input
            type="checkbox"
            checked={selected.includes(o)}
            onChange={() => setSelected((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))}
            className="h-4 w-4 accent-[var(--accent)]"
          />
          {o}
        </label>
      ))}
    </aside>
  );
}`,
  CartBadge: `export function CartBadge() {
  const [count, setCount] = useState(2);
  return (
    <div className="inline-flex items-center gap-2 gk-chip">
      <ShoppingBag className="h-4 w-4" />
      <span>Cart</span>
      <span className="gk-badge">{count}</span>
      <button type="button" className="ml-1 text-xs underline" onClick={() => setCount((c) => c + 1)}>
        Add
      </button>
    </div>
  );
}`,
  CheckoutFlow: `export function CheckoutFlow() {
  const [step, setStep] = useState(1);
  const steps = ["Details", "Payment", "Confirm"];
  return (
    <div className="gk-card p-6">
      <ol className="mb-6 flex items-center gap-2 text-xs" aria-label="Checkout progress">
        {steps.map((s, i) => (
          <li key={s} className={"flex items-center gap-2 " + (i + 1 === step ? "text-[var(--ink)]" : "text-[var(--mute)]")}>
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={"gk-badge " + (i + 1 === step ? "bg-[var(--accent)]" : "gk-badge-muted")}>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      {step === 3 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="mx-auto h-12 w-12 text-[var(--success)]" />
          <p className="mt-3 text-sm font-medium text-[var(--ink)]">Order confirmed</p>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setStep((s) => s + 1); }}>
          {step === 1 && (
            <>
              <div>
                <label className="gk-label" htmlFor="addr">Address</label>
                <input id="addr" className="gk-input" placeholder="Street, city, ZIP" required />
              </div>
              <div>
                <label className="gk-label" htmlFor="phone">Phone</label>
                <input id="phone" className="gk-input" placeholder="+1 555 000 1234" required />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div>
                <label className="gk-label" htmlFor="card">Card number</label>
                <input id="card" className="gk-input" placeholder="4242 4242 4242 4242" inputMode="numeric" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input className="gk-input" placeholder="MM/YY" required />
                <input className="gk-input" placeholder="CVC" inputMode="numeric" required />
              </div>
            </>
          )}
          <button type="submit" className="gk-btn gk-btn-primary w-full">
            {step === 1 ? "Continue to payment" : "Place order"}
          </button>
        </form>
      )}
    </div>
  );
}`,
  KpiCards: `export function KpiCards() {
  const kpis = [
    { label: "Revenue", value: "$12,480", delta: "+8.2%" },
    { label: "Users", value: "3,102", delta: "+12.4%" },
    { label: "Orders", value: "486", delta: "+3.1%" },
    { label: "Conversion", value: "4.7%", delta: "-0.6%" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="gk-card p-5">
          <p className="text-xs font-medium text-[var(--mute)]">{k.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-[var(--ink)]">{k.value}</p>
          <p className={"mt-1 inline-flex items-center gap-1 text-xs " + (k.delta.startsWith("-") ? "text-[var(--error)]" : "text-[var(--success)]")}>
            <TrendingUp className="h-3 w-3" /> {k.delta}
          </p>
        </div>
      ))}
    </div>
  );
}`,
  ChartRenderer: `export function ChartRenderer() {
  const bars = [42, 68, 51, 80, 60, 92, 74];
  return (
    <div className="gk-card p-6">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Weekly activity</h3>
      <div className="mt-5 flex h-40 items-end gap-3">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t-md bg-[color-mix(in_srgb,var(--accent)_55%,var(--canvas))]" style={{ height: b + "%" }} title={b + ""} />
        ))}
      </div>
      <p className="mt-3 text-xs text-[var(--mute)]">Sample data — connect a real API later.</p>
    </div>
  );
}`,
  ActivityFeed: `export function ActivityFeed() {
  const items = [
    { who: "Noor", what: "commented on your post", when: "4m" },
    { who: "Sam", what: "followed you", when: "22m" },
    { who: "Rin", what: "shared your article", when: "1h" },
  ];
  return (
    <div className="gk-card divide-y divide-[var(--hairline)]">
      {items.map((i, idx) => (
        <div key={idx} className="flex items-center gap-3 px-5 py-4">
          <span className="gk-logo-mark">{i.who.charAt(0)}</span>
          <p className="flex-1 text-sm text-[var(--body)]">
            <span className="font-medium text-[var(--ink)]">{i.who}</span> {i.what}
          </p>
          <span className="text-xs text-[var(--mute)]">{i.when}</span>
        </div>
      ))}
    </div>
  );
}`,
  QuickActions: `export function QuickActions() {
  const [last, setLast] = useState("");
  const actions = ["New post", "Add member", "Create report", "Export data"];
  return (
    <div className="flex flex-wrap items-center gap-3">
      {actions.map((a) => (
        <button key={a} type="button" className="gk-btn gk-btn-secondary gk-btn-sm" onClick={() => setLast(a)}>
          {a}
        </button>
      ))}
      {last && <p className="text-xs text-[var(--mute)]">Last action: {last}</p>}
    </div>
  );
}`,
  DatePicker: `export function DatePicker() {
  const [value, setValue] = useState("");
  return (
    <div>
      <label className="gk-label" htmlFor="date">Pick a date</label>
      <input id="date" type="date" className="gk-input max-w-xs" value={value} onChange={(e) => setValue(e.target.value)} />
    </div>
  );
}`,
  TimeSlots: `export function TimeSlots() {
  const [active, setActive] = useState("");
  const slots = ["09:00", "11:30", "13:00", "15:30", "17:00", "19:30"];
  return (
    <div>
      <p className="gk-label">Available times</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button key={s} type="button" onClick={() => setActive(s)} className={"gk-chip " + (active === s ? "gk-chip-active" : "")}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}`,
  PartySize: `export function PartySize() {
  const [size, setSize] = useState(2);
  return (
    <div className="inline-flex items-center gap-3 gk-chip">
      <button type="button" aria-label="Fewer guests" onClick={() => setSize((s) => Math.max(1, s - 1))}><Minus className="h-4 w-4" /></button>
      <span className="min-w-8 text-center text-sm font-semibold text-[var(--ink)]">{size}</span>
      <button type="button" aria-label="More guests" onClick={() => setSize((s) => s + 1)}><Plus className="h-4 w-4" /></button>
    </div>
  );
}`,
  SpecialRequests: `export function SpecialRequests() {
  const [note, setNote] = useState("");
  return (
    <div>
      <label className="gk-label" htmlFor="note">Special requests</label>
      <textarea id="note" rows={3} className="gk-input" placeholder="Allergies, seating, notes…" value={note} onChange={(e) => setNote(e.target.value)} />
    </div>
  );
}`,
  MapComponent: `export function MapComponent() {
  return (
    <div className="gk-card flex h-64 items-center justify-center">
      <div className="text-center">
        <MapPin className="mx-auto h-8 w-8 text-[var(--accent)]" />
        <p className="mt-2 text-sm text-[var(--body)]">Map placeholder — wire a tiles provider later.</p>
      </div>
    </div>
  );
}`,
  Gallery: `export function Gallery() {
  const tiles = [1, 2, 3, 4, 5, 6];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <div key={t} className="gk-tile aspect-square text-2xl">{t}</div>
      ))}
    </div>
  );
}`,
  ReviewsSummary: `export function ReviewsSummary() {
  return (
    <div className="gk-card flex items-center gap-4 p-6">
      <div className="text-center">
        <p className="text-4xl font-bold text-[var(--ink)]">4.6</p>
        <div className="mt-1 flex justify-center gap-0.5" aria-label="4.6 out of 5 stars">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={"h-4 w-4 " + (s <= 4 ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--mute)]")} />
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-1.5 text-xs text-[var(--body)]">
        {[
          { label: "5 star", pct: 72 },
          { label: "4 star", pct: 18 },
          { label: "3 star", pct: 6 },
          { label: "2 star", pct: 3 },
          { label: "1 star", pct: 1 },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-12">{r.label}</span>
            <div className="gk-progress-bar flex-1"><div style={{ width: r.pct + "%" }} /></div>
            <span className="w-8 text-right text-[var(--mute)]">{r.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  WriteReview: `export function WriteReview() {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  return (
    <div className="gk-card max-w-lg p-6">
      {sent ? (
        <p className="text-center text-sm font-medium text-[var(--success)]">Review submitted — thank you!</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <div>
            <p className="gk-label">Your rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" aria-label={s + " stars"} onClick={() => setRating(s)}>
                  <Star className={"h-6 w-6 " + (s <= rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--mute)]")} />
                </button>
              ))}
            </div>
          </div>
          <textarea rows={3} className="gk-input" placeholder="Share your experience…" required />
          <button type="submit" className="gk-btn gk-btn-primary">Submit review</button>
        </form>
      )}
    </div>
  );
}`,
  Specials: `export function Specials() {
  const items = [
    { name: "Chef's tasting menu", price: 48 },
    { name: "Sunday brunch", price: 24 },
    { name: "Wine pairing", price: 32 },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((i) => (
        <article key={i.name} className="gk-card p-5">
          <h3 className="text-sm font-semibold text-[var(--ink)]">{i.name}</h3>
          <p className="mt-1 text-sm font-medium text-[var(--link)]">${"$"}{i.price}</p>
        </article>
      ))}
    </div>
  );
}`,
  MediaSelector: `export function MediaSelector() {
  const [selected, setSelected] = useState<string[]>([]);
  const options = ["Photo", "Video", "Audio"];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => setSelected((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))}
          className={"gk-chip " + (selected.includes(o) ? "gk-chip-active" : "")}
        >
          {o}
        </button>
      ))}
    </div>
  );
}`,
  PostEditor: `export function PostEditor() {
  const [body, setBody] = useState("");
  return (
    <div className="gk-card space-y-3 p-6">
      <textarea rows={4} className="gk-input" placeholder="What's on your mind?" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--mute)]">{body.length} characters</span>
        <button type="button" className="gk-btn gk-btn-primary gk-btn-sm">Publish</button>
      </div>
    </div>
  );
}`,
  CaptionInput: `export function CaptionInput() {
  const [caption, setCaption] = useState("");
  return (
    <div>
      <label className="gk-label" htmlFor="caption">Caption</label>
      <input id="caption" className="gk-input" placeholder="Write a caption…" value={caption} onChange={(e) => setCaption(e.target.value)} />
    </div>
  );
}`,
  HashtagTags: `export function HashtagTags() {
  const [tags, setTags] = useState(["design", "launch"]);
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <button key={t} type="button" className="gk-chip" onClick={() => setTags((s) => s.filter((x) => x !== t))}>
            #{t} ×
          </button>
        ))}
      </div>
      <form className="flex max-w-xs gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setTags((s) => [...s, draft.trim().replace(/^#/, "")]); setDraft(""); }}>
        <input className="gk-input" placeholder="Add hashtag" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="gk-btn gk-btn-secondary gk-btn-sm">Add</button>
      </form>
    </div>
  );
}`,
  MediaViewer: `export function MediaViewer() {
  return (
    <div className="gk-tile flex aspect-video w-full items-center justify-center text-5xl">
      <ImageIcon className="h-10 w-10" />
    </div>
  );
}`,
  ConversationHeader: `export function ConversationHeader() {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-5 py-4">
      <span className="gk-logo-mark">A</span>
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">Alex Rivera</p>
        <p className="text-xs text-[var(--success)]">Online</p>
      </div>
    </div>
  );
}`,
  MessageList: `export function MessageList() {
  const [reactions, setReactions] = useState<string[]>([]);
  const messages = [
    { id: 1, from: "them", text: "Hey! Did you see the new release notes?" },
    { id: 2, from: "me", text: "Yes — the dark mode fix is great." },
    { id: 3, from: "them", text: "Agreed. Shipping the update today." },
  ];
  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={"flex " + (m.from === "me" ? "justify-end" : "justify-start")}>
          <div className={"max-w-[75%] rounded-2xl px-4 py-2.5 text-sm " + (m.from === "me" ? "bg-[var(--accent)] text-white" : "bg-[var(--canvas-soft)] text-[var(--ink)]")}>
            {m.text}
            <button
              type="button"
              className="ml-2 align-middle"
              aria-label="React"
              onClick={() => setReactions((s) => (s.includes(m.id + "") ? s.filter((x) => x !== m.id + "") : [...s, m.id + ""]))}
            >
              <Heart className={"h-3.5 w-3.5 " + (reactions.includes(m.id + "") ? "fill-[var(--accent)]" : "opacity-60")} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}`,
  MessageComposer: `export function MessageComposer() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) { setSent((s) => [...s, draft.trim()]); setDraft(""); } }}>
        <input className="gk-input" placeholder="Type a message…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit" className="gk-btn gk-btn-primary" aria-label="Send"><Send className="h-4 w-4" /></button>
      </form>
      {sent.length > 0 && (
        <div className="space-y-2">
          {sent.map((s, i) => (
            <div key={i} className="ml-auto max-w-[75%] rounded-2xl bg-[var(--accent)] px-4 py-2.5 text-sm text-white">{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}`,
  ProfileHeader: `export function ProfileHeader() {
  return (
    <div className="gk-card flex flex-wrap items-center gap-5 p-6">
      <span className="gk-logo-mark h-16 w-16 text-2xl">M</span>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-[var(--ink)]">Maya Chen</h3>
        <p className="text-sm text-[var(--mute)]">Product designer · SF</p>
      </div>
      <div className="flex gap-6 text-center">
        <div><p className="text-lg font-bold text-[var(--ink)]">248</p><p className="text-xs text-[var(--mute)]">Posts</p></div>
        <div><p className="text-lg font-bold text-[var(--ink)]">1.2k</p><p className="text-xs text-[var(--mute)]">Followers</p></div>
        <div><p className="text-lg font-bold text-[var(--ink)]">310</p><p className="text-xs text-[var(--mute)]">Following</p></div>
      </div>
    </div>
  );
}`,
  PostsGrid: `export function PostsGrid() {
  const tiles = [1, 2, 3, 4, 5, 6];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {tiles.map((t) => (
        <button key={t} type="button" className="gk-tile aspect-square" aria-label={"Post " + t}>
          <ImageIcon className="h-6 w-6" />
        </button>
      ))}
    </div>
  );
}`,
  Followers: `export function Followers() {
  return (
    <div className="gk-card flex items-center gap-3 p-5">
      <span className="gk-logo-mark">N</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">Noor Ali</p>
        <p className="text-xs text-[var(--mute)]">@noor</p>
      </div>
      <button type="button" className="gk-btn gk-btn-secondary gk-btn-sm">Follow</button>
    </div>
  );
}`,
  Following: `export function Following() {
  return (
    <div className="gk-card flex items-center gap-3 p-5">
      <span className="gk-logo-mark">S</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">Sam Reyes</p>
        <p className="text-xs text-[var(--mute)]">@sam</p>
      </div>
      <button type="button" className="gk-btn gk-btn-secondary gk-btn-sm">Unfollow</button>
    </div>
  );
}`,
  EditProfileForm: `export function EditProfileForm() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="gk-card mx-auto max-w-lg p-6">
      {saved && <p className="mb-4 text-sm font-medium text-[var(--success)]">Profile updated</p>}
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setSaved(true); }}>
        <div>
          <label className="gk-label" htmlFor="display">Display name</label>
          <input id="display" className="gk-input" defaultValue="Maya Chen" required />
        </div>
        <div>
          <label className="gk-label" htmlFor="bio">Bio</label>
          <textarea id="bio" rows={3} className="gk-input" defaultValue="Product designer building things that ship." />
        </div>
        <button type="submit" className="gk-btn gk-btn-primary">Save changes</button>
      </form>
    </div>
  );
}`,
  BalanceCard: `export function BalanceCard() {
  return (
    <div className="gk-card bg-[var(--ink)] p-6 text-[var(--on-primary)]">
      <p className="text-xs opacity-70">Total balance</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">$4,238.10</p>
      <p className="mt-1 text-xs opacity-70">+$312.40 this month</p>
    </div>
  );
}`,
  RecentTransactions: `export function RecentTransactions() {
  const rows = [
    { label: "Coffee shop", amount: "-$4.50", kind: "spend" },
    { label: "Payroll", amount: "+$2,400.00", kind: "income" },
    { label: "Subscription", amount: "-$12.00", kind: "spend" },
  ];
  return (
    <div className="gk-card divide-y divide-[var(--hairline)]">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm text-[var(--body)]">{r.label}</span>
          <span className={"text-sm font-medium " + (r.kind === "income" ? "text-[var(--success)]" : "text-[var(--ink)]")}>{r.amount}</span>
        </div>
      ))}
    </div>
  );
}`,
  BudgetProgress: `export function BudgetProgress() {
  const goals = [
    { label: "Travel", pct: 65 },
    { label: "Savings", pct: 40 },
    { label: "Groceries", pct: 82 },
  ];
  return (
    <div className="gk-card space-y-4 p-6">
      {goals.map((g) => (
        <div key={g.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-[var(--ink)]">{g.label}</span>
            <span className="text-[var(--mute)]">{g.pct}%</span>
          </div>
          <div className="gk-progress-bar"><div style={{ width: g.pct + "%" }} /></div>
        </div>
      ))}
    </div>
  );
}`,
  ChartWidget: `export function ChartWidget() {
  const bars = [35, 55, 40, 70, 58, 85, 62];
  return (
    <div className="gk-card p-6">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Trend</h3>
      <div className="mt-4 flex h-32 items-end gap-2">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 rounded-t bg-[color-mix(in_srgb,var(--accent)_55%,var(--canvas))]" style={{ height: b + "%" }} />
        ))}
      </div>
    </div>
  );
}`,
  ProgressBar: `export function ProgressBar() {
  const [value, setValue] = useState(40);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--ink)]">Task progress</span>
        <span className="text-[var(--mute)]">{value}%</span>
      </div>
      <div className="gk-progress-bar"><div style={{ width: value + "%" }} /></div>
      <button type="button" className="gk-btn gk-btn-secondary gk-btn-sm" onClick={() => setValue((v) => Math.min(100, v + 10))}>
        Complete step
      </button>
    </div>
  );
}`,
  PostComposer: `export function PostComposer() {
  const [text, setText] = useState("");
  return (
    <div className="gk-card space-y-3 p-6">
      <textarea rows={3} className="gk-input" placeholder="Start a post…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button type="button" className="gk-chip" aria-label="Add photo"><ImageIcon className="h-4 w-4" /></button>
          <button type="button" className="gk-chip" aria-label="Upload file"><Upload className="h-4 w-4" /></button>
          <button type="button" className="gk-chip" aria-label="Search"><Search className="h-4 w-4" /></button>
        </div>
        <button type="button" className="gk-btn gk-btn-primary gk-btn-sm" disabled={!text.trim()}>Post</button>
      </div>
    </div>
  );
}`,
};

/* Generate the sections library (only sections referenced by pages/home) */
function multiPageSections(usedSections: Set<string>): string {
  const parts: string[] = [];
  for (const section of usedSections) {
    const compName = SECTION_COMPONENT[section] ?? HOME_SECTION_COMPONENT[section] ?? `Section${capitalizeComponentName(section)}`;
    const impl = SECTION_IMPLS[compName];
    if (impl) {
      parts.push(impl);
    } else {
      parts.push(`export function ${compName}() {
  return (
    <div className="gk-card p-6">
      <h3 className="text-sm font-semibold text-[var(--ink)]">${capitalizeComponentName(section)}</h3>
      <p className="mt-2 text-sm text-[var(--mute)]">Section placeholder — fill with real content.</p>
    </div>
  );
}`);
    }
  }
  return `import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
${SECTIONS_ICONS}

${parts.join("\n\n")}
`;
}

/* Generate login / signup / dashboard auth pages */
function multiPageAuthPage(
  kind: "login" | "signup" | "dashboard",
  name: string,
  arch: ProductArchetypeArchitecture
): string {
  const navJson = JSON.stringify(navLinks(arch.primaryNav));
  const componentName = `${capitalizeComponentName(kind)}Page`;
  const title = kind === "login" ? "Welcome back" : kind === "signup" ? "Create your account" : "Dashboard";

  if (kind === "dashboard") {
    return `import { useState } from "react";
import { PageShell } from "../lib/ui";
import { KpiCards, ActivityFeed } from "./sections";

export default function ${componentName}() {
  const [greeting] = useState("Good to see you");
  return (
    <PageShell brand="${name}" nav={${navJson}}>
      <section className="mx-auto max-w-6xl space-y-10 py-10">
        <div className="space-y-1.5">
          <h1 className="gk-section-title">${title}</h1>
          <p className="text-sm text-[var(--mute)]">{greeting}, ${name}.</p>
        </div>
        <KpiCards />
        <ActivityFeed />
      </section>
    </PageShell>
  );
}
`;
  }

  const fields =
    kind === "signup"
      ? `<div>
            <label className="gk-label" htmlFor="auth-name">Name</label>
            <input id="auth-name" className="gk-input" placeholder="Your name" required />
          </div>`
      : "";
  const submitLabel = kind === "login" ? "Log in" : "Create account";
  const altText = kind === "login" ? "New here?" : "Already have an account?";
  const altLink = kind === "login" ? "/signup" : "/login";
  const altLabel = kind === "login" ? "Create an account" : "Log in";

  return `import { useState } from "react";
import { Link } from "react-router-dom";

export default function ${componentName}() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="gk-card max-w-md p-8 text-center">
          <p className="text-sm font-medium text-[var(--success)]">Signed ${kind === "login" ? "in" : "up"} successfully</p>
          <p className="mt-2 text-sm text-[var(--mute)]">Head to your dashboard to get started.</p>
          <Link to="/dashboard" className="mt-6 gk-btn gk-btn-primary">Go to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--canvas)] p-6">
      <div className="gk-card w-full max-w-md p-8">
        <h1 className="gk-section-title text-2xl">${title}</h1>
        <p className="mt-1 text-sm text-[var(--mute)]">${arch.description}</p>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitting(true);
            setTimeout(() => {
              setSubmitting(false);
              setDone(true);
            }, 700);
          }}
        >
          ${fields}
          <div>
            <label className="gk-label" htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" className="gk-input" placeholder="you@example.com" required />
          </div>
          <div>
            <label className="gk-label" htmlFor="auth-pass">Password</label>
            <input id="auth-pass" type="password" className="gk-input" placeholder="••••••••" required />
          </div>
          <button type="submit" className="gk-btn gk-btn-primary w-full" disabled={submitting}>
            {submitting ? "Please wait…" : "${submitLabel}"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-[var(--mute)]">
          ${altText} <Link to="${altLink}" className="font-medium text-[var(--link)]">${altLabel}</Link>
        </p>
      </div>
    </div>
  );
}
`;
}

/* App shell with React Router routes for all architecture pages */
function multiPageAppShell(
  arch: ProductArchetypeArchitecture,
  name: string,
  pageEntries: { path: string; component: string }[],
  pageNames: string[]
): string {
  const { authFlow } = arch;

  const routeDefs = pageEntries
    .map((e) => `        <Route path="${e.path}" element={<${e.component} />} />`)
    .join("\n");

  const allImports = [...new Set(pageNames)];
  const pageImport = allImports.length > 0 ? `import { ${allImports.join(", ")} } from "./pages";` : "";

  return `import { Routes, Route } from "react-router-dom";
import HomePage from "./home";
import { ErrorBoundary, ErrorState } from "./lib/ui";
${pageImport}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HomePage />} />
${routeDefs}
        <Route path="*" element={<ErrorState error="Page not found">Nothing matches this route.</ErrorState>} />
      </Routes>
    </ErrorBoundary>
  );
}
`;
}

/* Generate package.json for multi-page products */
function multiPagePackageJson(
  name: string,
  framework: string,
  isMobile: boolean,
  isWebapp: boolean,
  isWebsite: boolean,
  isAi: boolean,
  isDesktop: boolean,
  isDeveloper: boolean,
  isGames: boolean,
  isStarter: boolean
): string {
  const baseDeps = [
    "react",
    "react-dom",
    "react-router-dom",
    "lucide-react",
    "class-variance-authority",
    "clsx",
    "date-fns",
  ];

  const aiDeps = isAi ? ["@radix-ui/react-slot", "leva"] : [];
  const chartDeps = isWebsite || isWebapp ? ["chart.js", "react-chartjs-2"] : [];
  const editorDeps = isAi ? ["monaco-editor"] : [];
  const socketDeps = isWebapp ? ["socket.io-client"] : [];

  const allDeps = [...baseDeps, ...aiDeps, ...chartDeps, ...editorDeps, ...socketDeps];
  const allDevDeps = [
    "@tailwindcss/vite",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "tailwindcss",
    "typescript",
    "vite",
  ];

  const DEP_VERSIONS: Record<string, string> = {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "lucide-react": "^0.475.0",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    "date-fns": "^4.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    leva: "^0.9.35",
    "chart.js": "^4.4.4",
    "react-chartjs-2": "^5.2.0",
    "monaco-editor": "^0.52.0",
    "socket.io-client": "^4.8.0",
    "@tailwindcss/vite": "^4.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    tailwindcss: "^4.1.0",
    typescript: "^5.9.0",
    vite: "^7.0.0",
  };

  const versionFor = (d: string): string => DEP_VERSIONS[d] ?? "^1.0.0";

  return JSON.stringify(
    {
      name: slug(name),
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc -b && vite build",
        preview: "vite preview",
      },
      dependencies: Object.fromEntries(allDeps.map((d) => [d, versionFor(d)])),
      devDependencies: Object.fromEntries(allDevDeps.map((d) => [d, versionFor(d)])),
    },
    null,
    2
  );
}

/* Generate RIDE_TEMPLATE.json from architecture */
function rideTemplateJsonFromArchitecture(
  arch: ProductArchetypeArchitecture,
  name: string,
  framework: string,
  styling: string
): string {
  const backendNeeded = arch.backendNeeded ? "true" : "false";
  const pageCount = Object.keys(arch.pages).length;
  const primaryNavCount = arch.primaryNav.length;
  const navSummary =
    primaryNavCount > 0
      ? arch.primaryNav.map((n) => `${n.label} (${n.href})`).join(", ")
      : "no top-level navigation";

  return JSON.stringify(
    {
      kind: "RIDE_TEMPLATE",
      version: 1,
      name,
      variant: name,
      category: arch.section,
      description: arch.description,
      framework,
      styling,
      ui: "galaxy",
      icons: "lucide-react",
      animation: "none",
      commands: framework === "react" ? ["dev", "build", "preview"] : [],
      aiInstructions:
        `This project was generated by RIDE from the template "${name}". ` +
        "Edit the files in place rather than re-scaffolding: keep the existing stack, structure and conventions, and make focused changes. " +
        "Placeholder copy marked with \"Replace…\" should be filled with real content as it becomes available. " +
        `This is a complete ${arch.section} product with multi-page architecture: ${pageCount} pages, navigation: ${navSummary}. ` +
        `Auth flow: ${authFlowToString(arch.authFlow)}. ` +
        `Backend needed: ${backendNeeded}. ` +
        `API routes: ${arch.apiRoutes.length} endpoints. ` +
        `Required components: ${arch.requiredComponents.join(", ")}. ` +
        `Design language: ${arch.designLanguage}. ` +
        "Keep the auth flow working (login/signup submit navigates to /dashboard). " +
        "Keep forms validated with loading and success states. " +
        "Reuse the shared page primitives in src/lib/ui.tsx (PageShell, LoadingState, EmptyState, ErrorState, SuccessState, ErrorBoundary) and the section components in src/sections.tsx instead of duplicating them. " +
        "Follow the Web Interface Guidelines (focus-visible states, prefers-reduced-motion, 44px touch targets, WCAG AA contrast). " +
        "See TEMPLATE_QUALITY_STANDARD.md for the full quality standard.",
    },
    null,
    2
  );
}

function authFlowToString(flow: AuthFlow): string {
  switch (flow) {
    case "none":
      return "none";
    case "email-passcode":
      return "email + passcode";
    case "email-otp":
      return "email OTP";
    case "social":
      return "social login";
    case "magic-link":
      return "magic link";
    default:
      return "none";
  }
}

/* ── Existing helpers (from original scaffold) ────────────────────────── */

function capitalizeComponentName(path: string): string {
  const key = path.startsWith("/") ? path.slice(1) : path;
  const camel = key
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  const safe = camel || "Home";
  return /^[0-9]/.test(safe) ? `P${safe}` : safe;
}

async function writeFiles(dest: string, files: Record<string, string>): Promise<void> {
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dest, path.split("/").slice(0, -1).join("/")), { recursive: true });
    await writeFile(join(dest, path), content, "utf8");
  }
}

/**
 * Rewrites the scaffolded CSS :root tokens to the variant's design-brief
 * palette and body font, so every variant ships with its own era-tuned
 * color system and typography — not just a different accent hue.
 */
function applyBriefTokens(files: Record<string, string>, familyId: string, variantIndex: number): void {
  const cssPath = Object.keys(files).find((p) => p.endsWith("index.css"));
  if (!cssPath) return;
  const brief = briefFor(familyId, variantIndex, "Variant");
  const css = files[cssPath];
  if (!css || !css.includes(":root")) return;
  const tokens = `:root {
  --canvas: ${brief.palette.canvas};
  --canvas-soft: ${brief.palette.surface};
  --ink: ${brief.palette.ink};
  --body: ${brief.palette.body};
  --mute: ${brief.palette.mute};
  --hairline: ${brief.palette.hairline};
  --link: ${brief.accent};
  --primary: ${brief.palette.ink};
  --on-primary: ${brief.palette.dark ? "#0b0d12" : "#ffffff"};
  --success: #16a34a;
  --error: #dc2626;
  --accent: ${brief.accent};
}`;
  const updated = css
    .replace(/:root\s*\{[^}]*\}/s, tokens)
    .replace(/body\s*\{[^}]*\}/s, (m) =>
      m.includes("font-family") ? m.replace(/font-family:\s*[^;]+;/, `font-family: ${brief.typography.body};`) : m,
    );
  files[cssPath] = updated;
}

// ─── RIDE_TEMPLATE.json metadata ────────────────────────────────────────────

const DEP_PACKAGES: Record<string, string[]> = {
  react: ["react", "react-dom", "lucide-react", "tailwindcss", "vite", "typescript"],
  api: ["express", "typescript", "tsx"],
  cli: ["typescript", "tsx"],
  package: ["typescript"],
  extension: [],
};

const PROJECT_COMMANDS: Record<string, { dev: string; build: string; test: string }> = {
  react: { dev: "npm run dev", build: "npm run build", test: "—" },
  api: { dev: "npm run dev", build: "npm run build", test: "npm test" },
  cli: { dev: "npm run dev", build: "npm run build", test: "npm test" },
  package: { dev: "—", build: "npm run build", test: "npm test" },
  extension: { dev: "—", build: "—", test: "—" },
  custom: { dev: "—", build: "—", test: "—" },
};

const ACRONYMS = new Set(["ai", "api", "sdk", "crm", "erp", "rest", "pwa", "cli", "2d", "3d"]);

function categoryLabel(id: string): string {
  return id
    .split("-")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : `${w.charAt(0).toUpperCase()}${w.slice(1)}`))
    .join(" ");
}

function rideTemplateJson(tpl: { name: string; category: string; description: string; framework: string; styling: string; ui: string; icons: string; animation: string }, archetype: string, projectName: string): string {
  const key = archetype === "custom" ? "custom" : PROJECT_COMMANDS[archetype] ? archetype : "react";
  return JSON.stringify(
    {
      kind: "RIDE_TEMPLATE",
      version: 1,
      name: tpl.name,
      variant: tpl.name,
      category: categoryLabel(tpl.category),
      description: tpl.description,
      framework: tpl.framework,
      dependencies: DEP_PACKAGES[key] ?? [],
      ui: tpl.ui,
      icons: tpl.icons,
      animation: tpl.animation,
      commands: PROJECT_COMMANDS[key],
      aiInstructions:
        `This project was generated by RIDE from the template "${tpl.name}". ` +
        "Edit the files in place rather than re-scaffolding: keep the existing stack, structure and conventions, and make focused changes. " +
        "Placeholder copy marked with \"Replace…\" should be filled with real content as it becomes available. " +
        `Always use the project's icon library (${tpl.icons}) for UI icons — never use emoji or unicode glyphs where an icon component fits. ` +
        "UI: this project ships the Galaxy component kit (gk-btn, gk-input, gk-card, gk-toggle, gk-loader, gk-toast, gk-tooltip, gk-badge, gk-progress) restyled on the Vercel DESIGN.md token system (ink #171717, canvas #ffffff, hairline #ebebeb, pill CTAs, stacked shadows). Use gk-* components for UI elements instead of hand-rolling new ones, and keep tokens in index.css as the single source of truth. Follow the Web Interface Guidelines (focus-visible states, reduced motion, 44px touch targets, contrast). " +
        "This template is a complete multi-page product (React Router): src/home.tsx is the home page and src/App.tsx routes to About, Contact, Login, Signup, Dashboard, Settings, Billing and category pages. Never leave a button or link pointing at a dead target — every CTA leads to a real page (Get started → /signup, Log in → /login, Dashboard → /dashboard). Keep the auth flow working (login/signup submit navigates to /dashboard), keep forms validated with loading and success states, and reuse the shared page primitives in src/lib/ui.tsx (PageShell, Field, useAsync, Skeleton, EmptyState, ErrorState) instead of duplicating them. See TEMPLATE_QUALITY_STANDARD.md for the full quality standard.",
    },
    null,
    2,
  );
}

async function writeAgentsMd(dest: string, tpl: { name: string; description: string; framework: string; styling: string; ui: string; icons: string; animation: string }): Promise<void> {
  const content = `# ${tpl.name}

${tpl.description}

## Project conventions
- Framework: ${tpl.framework}
- Styling: ${tpl.styling}
- UI: ${tpl.ui} — Galaxy (uiverse.io) gk-* component kit on Vercel DESIGN.md tokens
- Icons: ${tpl.icons}
- Always use the icon library (${tpl.icons}) for UI icons — never use emoji or unicode glyphs where an icon component fits.
- Animation: ${tpl.animation}
- Design system: Vercel DESIGN.md (see workspace DESIGN.md) — ink #171717 primary CTA, canvas #ffffff, hairline #ebebeb, pill 100px CTAs, stacked shadows, mono eyebrows; tokens live in src/index.css and are the single source of truth.
- UI components: prefer the Galaxy kit (gk-btn, gk-input, gk-card, gk-toggle, gk-loader, gk-toast, gk-tooltip, gk-badge, gk-progress) over hand-rolled primitives.
- Accessibility: Web Interface Guidelines — focus-visible rings, prefers-reduced-motion, 44px touch targets, WCAG AA contrast.
- Multi-page structure: this is a complete product, not a landing page. Home lives in src/home.tsx; src/App.tsx routes to About, Contact, Login, Signup, Dashboard, Settings, Billing and category pages. Every button and link must lead to a real route (never "#" or an empty href); login/signup must navigate to /dashboard; forms need validation plus loading and success states. Reuse the primitives in src/lib/ui.tsx (PageShell, Field, useAsync, Skeleton, EmptyState, ErrorState) — do not duplicate them.
- Quality standard: see TEMPLATE_QUALITY_STANDARD.md in the workspace root — end-to-end pages, working flows, no dead links, completion audit before done.
- Project metadata: see RIDE_TEMPLATE.json at the project root
- Prefer small, focused diffs. Read files before editing them.
- Keep placeholder copy marked with "Replace…" until the user's real content is provided.
`;
  await writeFile(join(dest, "AGENTS.md"), content, "utf8");
}

export { APP_SOURCES, FAMILY_SOURCES };

const API_PACKAGE = JSON.stringify(
  {
    name: "ride-api",
    private: true,
    version: "0.1.0",
    type: "module",
    scripts: { dev: "tsx watch src/index.ts", build: "tsc", start: "node dist/index.js", test: "node --test" },
    dependencies: { express: "^5.0.0" },
    devDependencies: {
      "@types/express": "^5.0.0",
      "@types/node": "^24.0.0",
      tsx: "^4.0.0",
      typescript: "^5.9.0",
    },
  },
  null,
  2,
);

const API_INDEX = `import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(\`API listening on http://localhost:\${port}\`);
});
`;

const API_TEST = (name: string) => `import test from "node:test";
import assert from "node:assert/strict";

test("${name} placeholder test", () => {
  assert.equal(1 + 1, 2);
});
`;

const API_DOCKERFILE = `FROM node:24-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
`;

const CLI_FILES = (name: string): Record<string, string> => ({
  "package.json": JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      bin: { [name]: "dist/index.js" },
      files: ["dist"],
      scripts: { dev: "tsx src/index.ts", build: "tsc", test: "node --test", prepublishOnly: "npm run build" },
      devDependencies: { "@types/node": "^24.0.0", tsx: "^4.0.0", typescript: "^5.9.0" },
    },
    null,
    2,
  ),
  "tsconfig.json":
    '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "outDir": "dist",\n    "strict": true,\n    "skipLibCheck": true,\n    "lib": ["ES2022"]\n  },\n  "include": ["src"]\n}\n',
  "src/index.ts": `#!/usr/bin/env node

const HELP = \`
Usage: ${name} <command> [options]

Commands:
  hello           Replace with a real command
  help            Show this help

Options:
  -h, --help      Show this help
\`;

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "help" || command === "-h" || command === "--help") {
  console.log(HELP.trim());
  process.exit(0);
}

if (command === "hello") {
  console.log("Replace this command with real behavior.");
  process.exit(0);
}

console.error(\`Unknown command: \${command}\`);
console.error(HELP.trim());
process.exit(1);
`,
  "src/index.test.ts": `import test from "node:test";
import assert from "node:assert/strict";

test("placeholder", () => {
  assert.equal(1 + 1, 2);
});
`,
  ".gitignore": "node_modules/\ndist/\n",
});

const PACKAGE_FILES = (name: string): Record<string, string> => ({
  "package.json": JSON.stringify(
    {
      name,
      private: true,
      version: "0.1.0",
      type: "module",
      main: "dist/index.js",
      types: "dist/index.d.ts",
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
      files: ["dist"],
      scripts: { build: "tsc", test: "node --test" },
      devDependencies: { "@types/node": "^24.0.0", typescript: "^5.9.0" },
    },
    null,
    2,
  ),
  "tsconfig.json":
    '{\n  "compilerOptions": {\n    "target": "ES2022",\n    "module": "ESNext",\n    "moduleResolution": "bundler",\n    "declaration": true,\n    "outDir": "dist",\n    "strict": true,\n    "skipLibCheck": true,\n    "lib": ["ES2022"]\n  },\n  "include": ["src"]\n}\n',
  "src/index.ts": `export interface Options {
  enabled?: boolean;
}

export function replaceMe(options: Options = {}): string {
  return options.enabled ? "Replace this with a real implementation." : "";
}
`,
  "src/index.test.ts": `import test from "node:test";
import assert from "node:assert/strict";
import { replaceMe } from "./index";

test("placeholder", () => {
  assert.equal(replaceMe(), "");
  assert.equal(replaceMe({ enabled: true }), "Replace this with a real implementation.");
});
`,
  ".gitignore": "node_modules/\ndist/\n",
});

const EXTENSION_FILES: Record<string, string> = {
  "manifest.json": JSON.stringify(
    {
      manifest_version: 3,
      name: "Ride extension",
      version: "0.1.0",
      description: "Replace with a short description of the extension.",
      action: { default_popup: "popup.html", default_title: "Ride extension" },
      content_scripts: [{ matches: ["<all_urls>"], js: ["content.js"], run_at: "document_idle" }],
      permissions: ["storage"],
    },
    null,
    2,
  ),
  "popup.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body { width: 280px; margin: 0; padding: 16px; font-family: system-ui, sans-serif; }
      h1 { font-size: 14px; margin: 0 0 8px; }
      p { font-size: 12px; color: #555; margin: 0 0 12px; }
      button { width: 100%; padding: 8px; border: 0; border-radius: 6px; background: #171717; color: #fff; font-size: 12px; cursor: pointer; }
    </style>
  </head>
  <body>
    <h1>Ride extension</h1>
    <p>Replace this popup with real extension UI.</p>
    <button id="go">Run action</button>
    <script src="popup.js"></script>
  </body>
</html>
`,
  "popup.js": `document.getElementById("go")?.addEventListener("click", () => {
  alert("Replace this action with real behavior.");
});
`,
  "content.js": `// Replace this content script with real page behavior.
console.log("Ride extension content script loaded");
`,
  ".gitignore": "node_modules/\ndist/\n",
};

function pwaIndexHtml(name: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#171717" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <title>${name}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function pwaManifest(name: string): string {
  return JSON.stringify(
    {
      name,
      short_name: name,
      display: "standalone",
      start_url: "/",
      theme_color: "#171717",
      background_color: "#ffffff",
      icons: [],
    },
    null,
    2,
  );
}