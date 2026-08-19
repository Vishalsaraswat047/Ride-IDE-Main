import { useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { RideSettings } from "@ride/contracts";
import { listThemes } from "@ride/theme";
import {
  X,
  Monitor,
  Type,
  Cpu,
  GitBranch,
  ShieldCheck,
  BrainCircuit,
  Paintbrush,
  User,
  Search as SearchIcon,
  Keyboard,
  MousePointer2,
  Folder,
  Terminal,
  Languages,
  Puzzle,
  Boxes,
  LayoutTemplate,
  KeyRound,
  Cloud,
  Eye,
  FlaskConical,
  Bug,
  Rocket,
  Package,
  CircuitBoard,
  Lock,
  Database,
  Container,
  Ship,
  Users,
  Bell,
  Network,
  HardDrive,
  Accessibility,
  FlaskConical as TestTube,
  Gauge,
  Wrench,
  RefreshCw,
  FileBadge,
  Info,
  SlidersHorizontal,
  ChevronRight,
  Download,
  Upload,
  RotateCcw,
  Save,
  XCircle,
} from "lucide-react";
import { useSettings, useWorkspace, useAuth } from "../lib/hooks";
import { applyRideTheme } from "../lib/theme";
import rideLogo from "../assets/ride-logo.png";
import { AccountPane } from "./AccountPane";
import { ProvidersPane } from "./ProvidersPane";
import { ExtensionsPane } from "./ExtensionsPane";
import { AuthView } from "./AuthView";

type FieldDef =
  | { kind: "toggle"; key: string; label: string; hint?: string; keywords?: string }
  | { kind: "select"; key: string; label: string; hint?: string; options: { value: string; label: string }[]; keywords?: string }
  | { kind: "number"; key: string; label: string; hint?: string; min: number; max: number; step?: number; keywords?: string }
  | { kind: "text"; key: string; label: string; hint?: string; placeholder?: string; keywords?: string }
  | { kind: "custom"; key: string; label: string; hint?: string; render: string }
  | { kind: "static"; label: string; value: string; keywords?: string };

interface SectionDef {
  id: string;
  label: string;
  icon: React.ReactNode;
  group?: string;
  blurb: string;
  keywords?: string;
  fields?: FieldDef[];
  staticKind?: "keyboard" | "licenses" | "about" | "models" | "workspace" | "account" | "providers" | "extensions";
}

const LEVELS: Record<string, "beginner" | "advanced" | "expert"> = {
  "Account & Profile": "beginner",
  Appearance: "beginner",
  Workbench: "beginner",
  Editor: "beginner",
  Files: "beginner",
  "AI & Agent": "beginner",
  Models: "beginner",
  Templates: "beginner",
  Extensions: "beginner",
  Terminal: "beginner",
  "Live Preview": "beginner",
  "Language & Runtime": "advanced",
  "UI/UX Libraries": "advanced",
  "API Providers": "advanced",
  Cloud: "advanced",
  Testing: "advanced",
  Debugging: "advanced",
  "Git & Version Control": "advanced",
  "Build & Run": "advanced",
  "Package Management": "advanced",
  "VLSI / RTL": "advanced",
  Security: "advanced",
  Database: "advanced",
  "Containers & Docker": "advanced",
  Deployment: "advanced",
  "Project & Workspace": "advanced",
  Notifications: "beginner",
  Network: "advanced",
  "Storage & Sync": "advanced",
  Accessibility: "beginner",
  Privacy: "beginner",
  Experimental: "expert",
  Performance: "advanced",
  "Developer Tools": "expert",
  Updates: "beginner",
  Licenses: "beginner",
  "About RIDE": "beginner",
};

const SECTIONS: SectionDef[] = [
  {
    id: "account",
    label: "Account & Profile",
    icon: <User className="h-3.5 w-3.5" />,
    blurb: "Your RIDE identity, security, connected accounts and data.",
    keywords: "profile email sign in user account security two factor password sessions",
    staticKind: "account",
  },
  {
    id: "appearance",
    label: "Appearance",
    icon: <Paintbrush className="h-3.5 w-3.5" />,
    group: "appearance",
    blurb: "Theme, density, zoom and visual effects for the whole IDE.",
    keywords: "theme color dark light zoom scale density animations glass",
    fields: [
      { kind: "number", key: "uiScale", label: "UI scale", hint: "Interface density, in percent", min: 80, max: 150, keywords: "zoom size" },
      { kind: "number", key: "zoom", label: "Zoom", hint: "Whole-app zoom", min: 80, max: 200 },
      { kind: "toggle", key: "compactMode", label: "Compact mode", hint: "Tighter paddings and denser lists" },
      { kind: "toggle", key: "animations", label: "Animations" },
      { kind: "toggle", key: "roundedCorners", label: "Rounded corners" },
      { kind: "toggle", key: "glassEffects", label: "Glass / blur effects" },
      { kind: "toggle", key: "showActivityBar", label: "Show activity bar" },
      { kind: "toggle", key: "showStatusBar", label: "Show status bar" },
      { kind: "toggle", key: "showBreadcrumbs", label: "Show breadcrumbs" },
    ],
  },
  {
    id: "workbench",
    label: "Workbench",
    icon: <Monitor className="h-3.5 w-3.5" />,
    group: "workbench",
    blurb: "Top-level layout, theme, fonts and restore behaviour.",
    keywords: "theme layout panel sidebar font restore density",
    fields: [
      { kind: "custom", key: "theme", label: "Color theme", hint: "Applies to the whole IDE, including the code editor", render: "theme" },
      { kind: "toggle", key: "restoreLastWorkspace", label: "Restore last workspace on launch" },
      { kind: "number", key: "fontSize", label: "Interface font size", min: 9, max: 32 },
      { kind: "text", key: "fontFamily", label: "Interface font family", placeholder: "Inter, system-ui, sans-serif" },
    ],
  },
  {
    id: "editor",
    label: "Editor",
    icon: <Type className="h-3.5 w-3.5" />,
    group: "editor",
    blurb: "Code editing: tabs, wrapping, minimap, IntelliSense and formatting.",
    keywords: "tab size spaces wrap minimap format intellisense cursor",
    fields: [
      { kind: "number", key: "tabSize", label: "Tab size", min: 1, max: 8 },
      { kind: "toggle", key: "insertSpaces", label: "Use spaces for tabs" },
      { kind: "select", key: "wordWrap", label: "Word wrap", options: [{ value: "off", label: "Off" }, { value: "on", label: "On" }] },
      { kind: "toggle", key: "minimap", label: "Minimap" },
      { kind: "select", key: "cursorBlinking", label: "Cursor blinking", options: [
        { value: "blink", label: "Blink" }, { value: "smooth", label: "Smooth" }, { value: "phase", label: "Phase" },
        { value: "expand", label: "Expand" }, { value: "solid", label: "Solid" },
      ] },
      { kind: "toggle", key: "stickyScroll", label: "Sticky scroll" },
      { kind: "toggle", key: "formatOnSave", label: "Format on save" },
    ],
  },
  {
    id: "files",
    label: "Files",
    icon: <Folder className="h-3.5 w-3.5" />,
    group: "files",
    blurb: "Auto-save, encodings, line endings and file hygiene.",
    keywords: "auto save autosave delay encoding eol newline hot exit",
    fields: [
      { kind: "select", key: "autoSave", label: "Auto save", options: [
        { value: "off", label: "Off" }, { value: "afterDelay", label: "After delay" },
        { value: "onFocusChange", label: "On focus change" }, { value: "onWindowChange", label: "On window change" },
      ] },
      { kind: "number", key: "autoSaveDelay", label: "Auto-save delay (ms)", min: 100, max: 60000, step: 100 },
      { kind: "toggle", key: "hotExit", label: "Hot exit", hint: "Keep unsaved buffers across restarts" },
      { kind: "toggle", key: "trimTrailingWhitespace", label: "Trim trailing whitespace" },
      { kind: "toggle", key: "insertFinalNewline", label: "Insert final newline" },
      { kind: "select", key: "encoding", label: "File encoding", options: [{ value: "utf8", label: "UTF-8" }, { value: "utf16le", label: "UTF-16 LE" }] },
      { kind: "select", key: "eol", label: "End of line", options: [{ value: "auto", label: "Auto" }, { value: "lf", label: "LF" }, { value: "crlf", label: "CRLF" }] },
    ],
  },
  {
    id: "search",
    label: "Search",
    icon: <SearchIcon className="h-3.5 w-3.5" />,
    group: "search",
    blurb: "Find & Replace behaviour and exclusions.",
    keywords: "find replace regex case whole word exclude",
    fields: [
      { kind: "toggle", key: "caseSensitive", label: "Case sensitive" },
      { kind: "toggle", key: "wholeWord", label: "Match whole word" },
      { kind: "toggle", key: "regex", label: "Use regular expressions" },
      { kind: "toggle", key: "keepHistory", label: "Keep search history" },
      { kind: "text", key: "excludePatterns", label: "Exclude patterns", hint: "Comma-separated globs", placeholder: "node_modules, dist, .git" },
    ],
  },
  {
    id: "keyboard",
    label: "Keyboard Shortcuts",
    icon: <Keyboard className="h-3.5 w-3.5" />,
    blurb: "Default keybindings. A full editor with rebinding ships with the next release.",
    keywords: "shortcuts keys keybindings ctrl",
    staticKind: "keyboard",
  },
  {
    id: "mouse",
    label: "Mouse & Touch",
    icon: <MousePointer2 className="h-3.5 w-3.5" />,
    group: "mouse",
    blurb: "Pointer, wheel and multi-cursor behaviour.",
    keywords: "mouse wheel scroll cursor trackpad touch",
    fields: [
      { kind: "toggle", key: "wheelZoom", label: "Mouse wheel zoom" },
      { kind: "toggle", key: "smoothScrolling", label: "Smooth scrolling" },
      { kind: "select", key: "multiCursorModifier", label: "Multi-cursor modifier", options: [{ value: "alt", label: "Alt" }, { value: "ctrlCmd", label: "Ctrl / Cmd" }] },
      { kind: "toggle", key: "middleClickPaste", label: "Middle-click paste on Linux" },
    ],
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: <Terminal className="h-3.5 w-3.5" />,
    group: "terminal",
    blurb: "Shell, fonts and output behaviour for the integrated terminal.",
    keywords: "shell powershell cmd bash font scrollback",
    fields: [
      { kind: "text", key: "shell", label: "Default shell path", hint: "Empty = system default (PowerShell on Windows)" },
      { kind: "number", key: "fontSize", label: "Terminal font size", min: 8, max: 24 },
      { kind: "number", key: "scrollback", label: "Scrollback lines", min: 100, max: 100000 },
    ],
  },
  {
    id: "languages",
    label: "Language & Runtime",
    icon: <Languages className="h-3.5 w-3.5" />,
    group: "languages",
    blurb: "Managed runtimes, formatters and language servers for every language.",
    keywords: "python rust go java runtime interpreter formatter linter verilog",
    fields: [
      { kind: "toggle", key: "managedRuntime", label: "RIDE-managed runtimes", hint: "Auto-download interpreters & toolchains when missing" },
      { kind: "select", key: "pythonFormatter", label: "Python formatter", options: [{ value: "ruff", label: "Ruff" }, { value: "black", label: "Black" }] },
      { kind: "toggle", key: "prettierDefault", label: "Prettier as default JS/TS formatter" },
      { kind: "toggle", key: "languageServers", label: "Language servers (IntelliSense)" },
    ],
  },
  {
    id: "extensions",
    label: "Extensions",
    icon: <Puzzle className="h-3.5 w-3.5" />,
    blurb: "Installed extensions and the Open VSX marketplace.",
    keywords: "plugins marketplace vsix vs code install compatibility",
    staticKind: "extensions",
  },
  {
    id: "ui-libraries",
    label: "UI/UX Libraries",
    icon: <Boxes className="h-3.5 w-3.5" />,
    group: "uiLibraries",
    blurb: "React, Tailwind, shadcn/ui, lucide-react and friends — always preinstalled in scaffolds.",
    keywords: "ui ux icons lucide tailwind shadcn radix component library design",
    fields: [
      { kind: "toggle", key: "preinstallApproved", label: "Preinstall approved libraries", hint: "React, Tailwind, lucide-react, Radix" },
      { kind: "toggle", key: "autoDetectFramework", label: "Auto-detect framework in new projects" },
      { kind: "toggle", key: "aiRecommendations", label: "AI library recommendations" },
      { kind: "toggle", key: "licenseCheck", label: "Check licenses before installing" },
      { kind: "toggle", key: "versionManagement", label: "Manage versions centrally" },
    ],
  },
  {
    id: "templates",
    label: "Templates",
    icon: <LayoutTemplate className="h-3.5 w-3.5" />,
    group: "templates",
    blurb: "How RIDE scaffolds and manages your 520+ starter templates.",
    keywords: "scaffold starter studio preview variants install",
    fields: [
      { kind: "toggle", key: "autoInstallLibraries", label: "Auto-install libraries when scaffolding" },
      { kind: "toggle", key: "confirmScaffold", label: "Confirm before scaffolding into a folder" },
      { kind: "toggle", key: "showAllVariants", label: "Show all variants in the Studio" },
      { kind: "custom", key: "favoriteTemplates", label: "Favourites", render: "favoritesInfo" },
    ],
  },
  {
    id: "ai",
    label: "AI & Agent",
    icon: <BrainCircuit className="h-3.5 w-3.5" />,
    group: "ai",
    blurb: "Autocomplete, agent behaviour and autonomy.",
    keywords: "agent autocomplete assistant approve tools autonomy copilot",
    fields: [
      { kind: "toggle", key: "autocomplete", label: "Code autocomplete" },
      { kind: "toggle", key: "agentAutoApprove", label: "Auto-approve agent tool calls", hint: "Off is safer — permission prompts live in Security" },
      { kind: "custom", key: "autonomy", label: "Agent autonomy", render: "autonomyInfo" },
    ],
  },
  {
    id: "models",
    label: "Models",
    icon: <Cpu className="h-3.5 w-3.5" />,
    blurb: "Your model configuration: defaults, fallbacks, task routing and agent profiles.",
    keywords: "model llm gpt llama nvidia nemotron glm qwen routing fallback profile",
    staticKind: "models",
  },
  {
    id: "providers",
    label: "API Providers",
    icon: <KeyRound className="h-3.5 w-3.5" />,
    blurb: "Provider connections, API keys and model discovery. Keys are stored encrypted.",
    keywords: "api key nvidia ollama anthropic openai google openrouter endpoint nim credentials",
    staticKind: "providers",
  },
  {
    id: "cloud",
    label: "Cloud & VM",
    icon: <Cloud className="h-3.5 w-3.5" />,
    group: "cloud",
    blurb: "Managed cloud runtimes for heavy builds, VLSI simulation and AI runs.",
    keywords: "vm virtual machine gpu cpu ram disk region sleep",
    fields: [
      { kind: "select", key: "provider", label: "Provider", options: [
        { value: "ride-cloud", label: "RIDE Cloud" }, { value: "aws", label: "AWS" },
        { value: "azure", label: "Azure" }, { value: "gcp", label: "Google Cloud" }, { value: "custom", label: "Custom" },
      ] },
      { kind: "text", key: "region", label: "Region", placeholder: "auto" },
      { kind: "number", key: "cpu", label: "CPU cores", min: 1, max: 64 },
      { kind: "number", key: "ramGb", label: "RAM (GB)", min: 1, max: 256 },
      { kind: "number", key: "gpu", label: "GPUs (0 = none)", min: 0, max: 8 },
      { kind: "number", key: "diskGb", label: "Storage (GB)", min: 5, max: 1024 },
      { kind: "number", key: "idleTimeoutMin", label: "Idle auto-sleep (min)", min: 1, max: 120 },
      { kind: "toggle", key: "autoShutdown", label: "Auto shutdown when idle" },
      { kind: "toggle", key: "persistEnvironment", label: "Persist environment between sessions" },
    ],
  },
  {
    id: "preview",
    label: "Live Preview",
    icon: <Eye className="h-3.5 w-3.5" />,
    group: "preview",
    blurb: "The embedded browser preview: hot reload, device emulation, throttling.",
    keywords: "browser preview iframe port hot reload device mobile tablet",
    fields: [
      { kind: "toggle", key: "autoStart", label: "Auto-start preview" },
      { kind: "toggle", key: "hotReload", label: "Hot reload" },
      { kind: "toggle", key: "autoRefresh", label: "Auto refresh" },
      { kind: "select", key: "device", label: "Device emulation", options: [{ value: "desktop", label: "Desktop" }, { value: "tablet", label: "Tablet" }, { value: "mobile", label: "Mobile" }] },
      { kind: "number", key: "defaultPort", label: "Default dev port", min: 1024, max: 65535 },
      { kind: "select", key: "networkThrottling", label: "Network throttling", options: [{ value: "off", label: "Off" }, { value: "fast3g", label: "Fast 3G" }, { value: "slow3g", label: "Slow 3G" }] },
      { kind: "toggle", key: "showConsole", label: "Show preview console" },
    ],
  },
  {
    id: "testing",
    label: "Testing",
    icon: <TestTube className="h-3.5 w-3.5" />,
    group: "testing",
    blurb: "Test discovery, runners, coverage and AI-generated tests.",
    keywords: "test unit e2e coverage runner watch",
    fields: [
      { kind: "toggle", key: "autoDiscover", label: "Auto-discover tests" },
      { kind: "toggle", key: "watchMode", label: "Watch mode" },
      { kind: "toggle", key: "coverage", label: "Coverage reports" },
      { kind: "toggle", key: "aiTestGeneration", label: "AI test generation" },
      { kind: "toggle", key: "showExplorer", label: "Test explorer" },
    ],
  },
  {
    id: "debugging",
    label: "Debugging",
    icon: <Bug className="h-3.5 w-3.5" />,
    group: "debugging",
    blurb: "Breakpoints, watch, call stack and console behaviour.",
    keywords: "debugger breakpoint watch call stack console",
    fields: [
      { kind: "toggle", key: "sourceMaps", label: "Source maps" },
      { kind: "toggle", key: "inlineValues", label: "Inline variable values" },
      { kind: "toggle", key: "breakpointsPersist", label: "Persist breakpoints" },
      { kind: "toggle", key: "consoleColorize", label: "Colorize debug console" },
    ],
  },
  {
    id: "git",
    label: "Git & Version Control",
    icon: <GitBranch className="h-3.5 w-3.5" />,
    group: "git",
    blurb: "Repositories, staging, commits and AI commit messages.",
    keywords: "git commit branch stage push fetch github",
    fields: [
      { kind: "toggle", key: "autoFetch", label: "Auto-fetch remotes" },
      { kind: "toggle", key: "confirmStashPop", label: "Confirm before stash pop" },
    ],
  },
  {
    id: "build",
    label: "Build & Run",
    icon: <Rocket className="h-3.5 w-3.5" />,
    group: "build",
    blurb: "Default build and run tasks, pre/post commands and error handling.",
    keywords: "build run task command compile dev server",
    fields: [
      { kind: "toggle", key: "buildOnSave", label: "Build on save" },
      { kind: "toggle", key: "runOnSave", label: "Run on save" },
      { kind: "select", key: "defaultRunner", label: "Default package runner", options: [{ value: "npm", label: "npm" }, { value: "pnpm", label: "pnpm" }, { value: "yarn", label: "Yarn" }] },
      { kind: "text", key: "defaultBuildCommand", label: "Default build command", placeholder: "npm run build" },
      { kind: "toggle", key: "showErrorNotifications", label: "Notify on build errors" },
    ],
  },
  {
    id: "packages",
    label: "Package Management",
    icon: <Package className="h-3.5 w-3.5" />,
    group: "packages",
    blurb: "npm / pnpm / yarn, pip, uv, Cargo, Maven and Gradle behaviour.",
    keywords: "npm pnpm yarn pip cargo maven gradle install dependency",
    fields: [
      { kind: "select", key: "packageManager", label: "Preferred package manager", options: [
        { value: "auto", label: "Auto-detect" }, { value: "npm", label: "npm" },
        { value: "pnpm", label: "pnpm" }, { value: "yarn", label: "Yarn" },
      ] },
      { kind: "toggle", key: "autoInstall", label: "Auto-install new dependencies" },
      { kind: "toggle", key: "strictVersions", label: "Strict version pinning" },
      { kind: "toggle", key: "workspaceSupport", label: "Workspace / monorepo support" },
    ],
  },
  {
    id: "vlsi",
    label: "VLSI / RTL",
    icon: <CircuitBoard className="h-3.5 w-3.5" />,
    group: "vlsi",
    blurb: "Verilog / SystemVerilog / VHDL simulators, waveforms and linting.",
    keywords: "verilog systemverilog vhdl simulator icarus verilator waveform vcd fst rtl",
    fields: [
      { kind: "select", key: "simulator", label: "Default simulator", options: [
        { value: "icarus", label: "Icarus Verilog" }, { value: "verilator", label: "Verilator" }, { value: "custom", label: "Custom / commercial" },
      ] },
      { kind: "text", key: "simulatorPath", label: "Simulator path", hint: "Leave empty for a RIDE-managed install" },
      { kind: "select", key: "waveformFormat", label: "Waveform format", options: [{ value: "vcd", label: "VCD" }, { value: "fst", label: "FST" }] },
      { kind: "toggle", key: "compileOnSave", label: "Compile on save" },
      { kind: "toggle", key: "lintRtl", label: "Lint RTL on save" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: <Lock className="h-3.5 w-3.5" />,
    group: "security",
    blurb: "Workspace trust, permission prompts and secret detection.",
    keywords: "trust permissions sandbox secrets terminal commands allow deny",
    fields: [
      { kind: "select", key: "workspaceTrust", label: "Workspace trust", options: [
        { value: "ask", label: "Ask before trusting" }, { value: "always", label: "Trust all folders" }, { value: "never", label: "Never trust" },
      ] },
      { kind: "select", key: "terminalPermission", label: "Terminal commands", options: [
        { value: "askEveryTime", label: "Ask every time" }, { value: "destructiveOnly", label: "Allow safe, ask destructive" }, { value: "allowAll", label: "Allow all" },
      ] },
      { kind: "select", key: "agentPermission", label: "Agent autonomy", options: [
        { value: "askEveryAction", label: "Ask before every action" },
        { value: "destructiveOnly", label: "Ask before destructive actions" },
        { value: "allowSafe", label: "Allow safe actions automatically" },
        { value: "autonomous", label: "Autonomous mode" },
      ] },
      { kind: "toggle", key: "secretDetection", label: "Detect secrets in diffs & commits" },
      { kind: "toggle", key: "commandConfirmation", label: "Confirm before terminal commands" },
      { kind: "toggle", key: "sandbox", label: "Sandbox agent file access" },
    ],
  },
  {
    id: "database",
    label: "Database",
    icon: <Database className="h-3.5 w-3.5" />,
    group: "database",
    blurb: "SQLite, PostgreSQL, MySQL, MongoDB and Redis connections.",
    keywords: "sqlite postgres mysql mongodb redis connection",
    fields: [
      { kind: "select", key: "defaultEngine", label: "Default engine", options: [
        { value: "sqlite", label: "SQLite" }, { value: "postgres", label: "PostgreSQL" },
        { value: "mysql", label: "MySQL" }, { value: "mongodb", label: "MongoDB" },
      ] },
      { kind: "select", key: "agentDatabaseAccess", label: "Agent database access", options: [{ value: "ask", label: "Ask" }, { value: "allow", label: "Allow" }, { value: "deny", label: "Deny" }] },
      { kind: "number", key: "connectionTimeoutMs", label: "Connection timeout (ms)", min: 500, max: 60000 },
      { kind: "toggle", key: "showConnections", label: "Show connections panel" },
    ],
  },
  {
    id: "docker",
    label: "Containers & Docker",
    icon: <Container className="h-3.5 w-3.5" />,
    group: "docker",
    blurb: "Docker Engine, Compose, registries and volumes.",
    keywords: "docker container compose image registry volume",
    fields: [
      { kind: "select", key: "engine", label: "Docker engine", options: [{ value: "auto", label: "Auto-detect" }, { value: "dockerDesktop", label: "Docker Desktop" }, { value: "custom", label: "Custom" }] },
      { kind: "text", key: "enginePath", label: "Engine path", hint: "Empty = auto" },
      { kind: "toggle", key: "composeEnabled", label: "Docker Compose" },
      { kind: "select", key: "agentDockerAccess", label: "Agent Docker access", options: [{ value: "ask", label: "Ask" }, { value: "allow", label: "Allow" }, { value: "deny", label: "Deny" }] },
    ],
  },
  {
    id: "deployment",
    label: "Deployment",
    icon: <Ship className="h-3.5 w-3.5" />,
    group: "deployment",
    blurb: "Deploy your RIDE project using Hostinger.",
    keywords: "deploy hostinger hosting production",
    fields: [
      { kind: "static", label: "Deployment Provider", value: "Hostinger ● Recommended — Deploy your RIDE project using Hostinger." },
      { kind: "toggle", key: "autoDeploy", label: "Auto-deploy on push" },
      { kind: "toggle", key: "previewDeployments", label: "Preview deployments" },
      { kind: "select", key: "environment", label: "Environment", options: [{ value: "preview", label: "Preview" }, { value: "production", label: "Production" }] },
      { kind: "toggle", key: "ssl", label: "SSL certificates" },
    ],
  },
  {
    id: "collaboration",
    label: "Collaboration",
    icon: <Users className="h-3.5 w-3.5" />,
    group: "collaboration",
    blurb: "Live Share, presence, real-time editing and comments.",
    keywords: "live share team multi user presence comments",
    fields: [
      { kind: "toggle", key: "enabled", label: "Enable collaboration" },
      { kind: "toggle", key: "liveShare", label: "Live Share sessions" },
      { kind: "toggle", key: "realtimeEditing", label: "Real-time editing" },
      { kind: "toggle", key: "presence", label: "Presence indicators" },
      { kind: "toggle", key: "comments", label: "Comments & discussions" },
    ],
  },
  {
    id: "workspace",
    label: "Project & Workspace",
    icon: <SlidersHorizontal className="h-3.5 w-3.5" />,
    blurb: "Per-project conventions and AI rules that the agent always reads.",
    keywords: "project workspace ride.md rules conventions ai rules",
    staticKind: "workspace",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="h-3.5 w-3.5" />,
    group: "notifications",
    blurb: "What RIDE tells you about — and when.",
    keywords: "notify alerts build ai cloud security",
    fields: [
      { kind: "toggle", key: "enabled", label: "Enable notifications" },
      { kind: "toggle", key: "aiCompleted", label: "AI task completed" },
      { kind: "toggle", key: "buildCompleted", label: "Build completed" },
      { kind: "toggle", key: "testCompleted", label: "Tests completed" },
      { kind: "toggle", key: "deploymentCompleted", label: "Deployment completed" },
      { kind: "toggle", key: "cloudVm", label: "Cloud VM sleeping / errors" },
      { kind: "toggle", key: "securityWarnings", label: "Security warnings" },
      { kind: "toggle", key: "gitChanges", label: "Git changes" },
    ],
  },
  {
    id: "network",
    label: "Network",
    icon: <Network className="h-3.5 w-3.5" />,
    group: "network",
    blurb: "Proxy, timeouts, certificates and offline mode.",
    keywords: "proxy http https tls certificate offline timeout",
    fields: [
      { kind: "toggle", key: "proxyEnabled", label: "Proxy" },
      { kind: "text", key: "proxyUrl", label: "Proxy URL", placeholder: "http://proxy:8080" },
      { kind: "toggle", key: "offlineMode", label: "Offline mode" },
      { kind: "number", key: "timeoutMs", label: "Request timeout (ms)", min: 1000, max: 120000 },
    ],
  },
  {
    id: "storage",
    label: "Storage & Sync",
    icon: <HardDrive className="h-3.5 w-3.5" />,
    group: "storage",
    blurb: "Local and cloud storage, caches and settings sync.",
    keywords: "sync cache storage cloud disk",
    fields: [
      { kind: "toggle", key: "syncSettings", label: "Sync settings" },
      { kind: "toggle", key: "syncExtensions", label: "Sync extensions" },
      { kind: "toggle", key: "syncTemplates", label: "Sync templates" },
      { kind: "number", key: "aiContextCacheMb", label: "AI context cache (MB)", min: 0, max: 8192 },
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    icon: <Accessibility className="h-3.5 w-3.5" />,
    group: "accessibility",
    blurb: "Screen reader, motion, contrast and focus visibility.",
    keywords: "screen reader contrast motion focus a11y",
    fields: [
      { kind: "toggle", key: "screenReader", label: "Screen reader support" },
      { kind: "toggle", key: "reducedMotion", label: "Reduced motion" },
      { kind: "toggle", key: "highContrast", label: "High contrast" },
      { kind: "select", key: "fontScaling", label: "Font scaling", options: [{ value: "normal", label: "Normal" }, { value: "large", label: "Large" }, { value: "xlarge", label: "Extra large" }] },
      { kind: "toggle", key: "focusIndicators", label: "Focus indicators" },
      { kind: "toggle", key: "reducedTransparency", label: "Reduced transparency" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    group: "privacy",
    blurb: "Telemetry, analytics and where your data lives.",
    keywords: "telemetry analytics local data history",
    fields: [
      { kind: "toggle", key: "telemetry", label: "Telemetry", hint: "Anonymous usage data — off by default in RIDE" },
      { kind: "toggle", key: "analytics", label: "Analytics" },
      { kind: "toggle", key: "localOnly", label: "Local-first mode", hint: "Keeps all session history and indexes on this machine" },
      { kind: "toggle", key: "saveSessionHistory", label: "Save agent session history" },
    ],
  },
  {
    id: "experimental",
    label: "Experimental",
    icon: <FlaskConical className="h-3.5 w-3.5" />,
    group: "experimental",
    blurb: "Unstable features. Expect rough edges — that's the point.",
    keywords: "beta multi agent voice browser time machine graph",
    fields: [
      { kind: "toggle", key: "multiAgentMode", label: "Multi-agent mode" },
      { kind: "toggle", key: "aiBrowser", label: "AI browser control" },
      { kind: "toggle", key: "aiVoiceCoding", label: "AI voice coding" },
      { kind: "toggle", key: "aiDesignToCode", label: "AI design → code" },
      { kind: "toggle", key: "projectTimeMachine", label: "Project time machine" },
      { kind: "toggle", key: "aiArchitectureGraph", label: "AI architecture graph" },
      { kind: "toggle", key: "automaticDeployment", label: "Automatic deployment" },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: <Gauge className="h-3.5 w-3.5" />,
    group: "performance",
    blurb: "GPU acceleration, indexing and background process limits.",
    keywords: "gpu memory cpu indexing process fast",
    fields: [
      { kind: "toggle", key: "gpuAcceleration", label: "GPU acceleration" },
      { kind: "toggle", key: "fileIndexing", label: "File indexing" },
      { kind: "toggle", key: "lazyLoading", label: "Lazy-load views & panels" },
      { kind: "number", key: "maxBackgroundProcesses", label: "Max background processes", min: 1, max: 32 },
      { kind: "number", key: "maxExtensionHosts", label: "Max extension hosts", min: 1, max: 16 },
    ],
  },
  {
    id: "developer",
    label: "Developer Tools",
    icon: <Wrench className="h-3.5 w-3.5" />,
    group: "developer",
    blurb: "Logs, developer mode and extension host debugging.",
    keywords: "logs dev mode extension host profiler debug console",
    fields: [
      { kind: "toggle", key: "developerMode", label: "Developer mode" },
      { kind: "toggle", key: "extensionHostLogs", label: "Extension host logs" },
      { kind: "toggle", key: "agentLogs", label: "Agent logs" },
      { kind: "toggle", key: "aiRequestLogs", label: "AI request logs" },
      { kind: "toggle", key: "networkLogs", label: "Network logs" },
      { kind: "toggle", key: "showInternalErrors", label: "Show internal errors" },
    ],
  },
  {
    id: "updates",
    label: "Updates",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    group: "updates",
    blurb: "How RIDE, extensions, templates and runtimes update themselves.",
    keywords: "update channel stable beta alpha download install",
    fields: [
      { kind: "toggle", key: "autoCheck", label: "Automatically check for updates" },
      { kind: "toggle", key: "autoDownload", label: "Automatically download updates" },
      { kind: "toggle", key: "autoInstall", label: "Automatically install updates" },
      { kind: "select", key: "channel", label: "Update channel", options: [{ value: "stable", label: "Stable (recommended)" }, { value: "beta", label: "Beta (early access)" }, { value: "alpha", label: "Alpha (experimental)" }] },
    ],
  },
  {
    id: "licenses",
    label: "Licenses",
    icon: <FileBadge className="h-3.5 w-3.5" />,
    blurb: "Open-source licenses for everything RIDE bundles.",
    keywords: "license mit apache open source credits",
    staticKind: "licenses",
  },
  {
    id: "about",
    label: "About RIDE",
    icon: <Info className="h-3.5 w-3.5" />,
    blurb: "Version, build and documentation.",
    keywords: "version build about docs release",
    staticKind: "about",
  },
];

const KEYBINDING_GROUPS: { group: string; keys: [string, string][] }[] = [
  { group: "File & Navigation", keys: [["Ctrl+P", "Quick Open"], ["Ctrl+Shift+P", "Command Palette"], ["Ctrl+O", "Open Folder"], ["Ctrl+S", "Save"], ["Ctrl+B", "Reload active file"]] },
  { group: "View", keys: [["Ctrl+`", "Toggle Terminal"], ["Ctrl+Shift+T", "Open Template Studio"], ["Ctrl+,", "Open Settings"], ["Alt+Shift+F", "Format Document"]] },
  { group: "Agent", keys: [["Ctrl+Enter", "Send to Agent"], ["Ctrl+Shift+M", "Show Agent Panel"], ["Ctrl+Shift+V", "Show Browser Preview"]] },
];

const LICENSES: { name: string; license: string; url: string }[] = [
  { name: "React", license: "MIT", url: "https://github.com/facebook/react/blob/main/LICENSE" },
  { name: "Electron", license: "MIT", url: "https://github.com/electron/electron/blob/main/LICENSE" },
  { name: "Monaco Editor", license: "MIT", url: "https://github.com/microsoft/monaco-editor/blob/main/LICENSE.md" },
  { name: "lucide-react", license: "ISC", url: "https://github.com/lucide-icons/lucide/blob/main/LICENSE" },
  { name: "Tailwind CSS", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss/blob/next/LICENSE" },
  { name: "Radix UI", license: "MIT", url: "https://github.com/radix-ui/primitives/blob/main/LICENSE.md" },
  { name: "TypeScript", license: "Apache-2.0", url: "https://github.com/microsoft/TypeScript/blob/main/LICENSE.txt" },
  { name: "zod", license: "MIT", url: "https://github.com/colinhacks/zod/blob/master/LICENSE" },
  { name: "Turbo", license: "MIT", url: "https://github.com/vercel/turborepo/blob/main/LICENSE" },
  { name: "opencode", license: "Apache-2.0", url: "https://github.com/anomalyco/opencode" },
];

// Natural-language settings search: phrases users type map to a section + field.
const NL_ALIASES: { match: RegExp; section: string; hint?: string }[] = [
  { match: /auto.?save|save my files|save every/i, section: "files", hint: "Files → Auto save" },
  { match: /verilator|icarus|simulator|waveform|verilog|vhdl|systemverilog|rtl/i, section: "vlsi" },
  { match: /theme|dark mode|light mode|color/i, section: "appearance" },
  { match: /terminal command|run terminal|agent.*(terminal|command)|ask before/i, section: "security", hint: "Security → Agent autonomy / Terminal commands" },
  { match: /keyboard|shortcut|keybind/i, section: "keyboard" },
  { match: /model|llm|nvidia|ollama|nemotron|glm|qwen|gpt/i, section: "models" },
  { match: /preview|browser preview|hot reload|device/i, section: "preview" },
  { match: /template|scaffold|starter/i, section: "templates" },
  { match: /icon|icon library|lucide|ui librar|tailwind|shadcn/i, section: "ui-libraries" },
  { match: /font size|font family|mono/i, section: "editor" },
  { match: /tab size|spaces|indent/i, section: "editor" },
  { match: /proxy|offline|certificate/i, section: "network" },
  { match: /deploy|hostinger/i, section: "deployment" },
  { match: /docker|container|compose/i, section: "docker" },
  { match: /cloud|vm|gpu|virtual machine/i, section: "cloud" },
  { match: /telemetry|privacy|analytics/i, section: "privacy" },
  { match: /autocomplete|agent|autonomy|tool/i, section: "ai" },
  { match: /api key|featherless/i, section: "providers" },
  { match: /update|channel|stable|beta|alpha/i, section: "updates" },
  { match: /extension|plugin|marketplace/i, section: "extensions" },
  { match: /git|commit|branch|stash/i, section: "git" },
  { match: /database|sqlite|postgres|mongo/i, section: "database" },
  { match: /test|coverage|unit/i, section: "testing" },
  { match: /debug|breakpoint|watch/i, section: "debugging" },
  { match: /accessib|screen reader|contrast|motion/i, section: "accessibility" },
  { match: /notification|notify|alert/i, section: "notifications" },
  { match: /language|runtime|python|formatter/i, section: "languages" },
  { match: /sync|backup|storage|cache/i, section: "storage" },
  { match: /account|profile|sign in|email/i, section: "account" },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline py-2.5 last:border-0">
      <div>
        <div className="text-xs text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-[11px] text-mute">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`h-5 w-9 shrink-0 rounded-full border transition-colors ${
        checked ? "border-link bg-link" : "border-hairline-strong bg-canvas-soft-2"
      }`}
    >
      <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 w-56 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function NumberField({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
      }}
      className="h-7 w-20 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring"
    />
  );
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-7 w-56 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring"
    />
  );
}

const LEVEL_LABEL: Record<string, { label: string; className: string }> = {
  beginner: { label: "Beginner", className: "bg-success/10 text-success" },
  advanced: { label: "Advanced", className: "bg-link/10 text-link" },
  expert: { label: "Expert", className: "bg-error/10 text-error" },
};

const DEFAULT_SECTION: SectionDef = SECTIONS[0] ?? { id: "workbench", label: "Workbench", icon: <Monitor className="h-3.5 w-3.5" />, blurb: "" };

export function SettingsModal({ open, onOpenChange, initialSection }: { open: boolean; onOpenChange: (open: boolean) => void; initialSection?: string }) {
  const { settings, update } = useSettings();
  const auth = useAuth();
  const workspace = useWorkspace();
  const [section, setSection] = useState("workbench");
  const [query, setQuery] = useState("");
  const [keyDraft, setKeyDraft] = useState("");
  const [info, setInfo] = useState<{ version: string; platform: string; arch: string; node: string; electron: string } | null>(null);

  // ─── Settings scope: User (instant apply) vs Project (staged, .ride/settings.json) ───
  const projectRoot = workspace.state.root;
  const [scope, setScope] = useState<"user" | "project">("user");
  const [projSettings, setProjSettings] = useState<RideSettings | null>(null);
  const [projDirty, setProjDirty] = useState(false);
  const [projBusy, setProjBusy] = useState(false);
  const [projMsg, setProjMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setKeyDraft("");
      setScope("user");
      setProjSettings(null);
      setProjDirty(false);
      return;
    }
    if (initialSection) setSection(initialSection);
    void window.ride.app.getInfo().then(setInfo);
    if (projectRoot) {
      void window.ride.settings.getWorkspace(projectRoot).then(setProjSettings).catch(() => setProjSettings(null));
    }
  }, [open, projectRoot]);

  const s = scope === "user" ? settings : projSettings;

  const patch = (group: string, key: string, value: unknown) => {
    if (!s) return;
    const g = s[group as keyof RideSettings] as Record<string, unknown>;
    const next = { [group]: { ...g, [key]: value } } as Partial<RideSettings>;
    if (scope === "user") {
      void update(next);
    } else {
      setProjSettings((cur) => (cur ? ({ ...cur, ...next } as RideSettings) : cur));
      setProjDirty(true);
    }
  };

  const saveProjectScope = async () => {
    if (!projectRoot || !projSettings) return;
    setProjBusy(true);
    setProjMsg(null);
    try {
      setProjSettings(await window.ride.settings.setWorkspace(projectRoot, projSettings));
      setProjDirty(false);
      setProjMsg({ kind: "ok", text: "Workspace settings saved to .ride/settings.json." });
    } catch (e) {
      setProjMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setProjBusy(false);
    }
  };

  const cancelProjectScope = () => {
    if (!projectRoot) return;
    void window.ride.settings.getWorkspace(projectRoot).then(setProjSettings).catch(() => undefined);
    setProjDirty(false);
    setProjMsg(null);
  };

  const resetProjectScope = async () => {
    if (!projectRoot) return;
    setProjBusy(true);
    setProjMsg(null);
    try {
      setProjSettings(await window.ride.settings.resetWorkspace(projectRoot));
      setProjDirty(false);
      setProjMsg({ kind: "ok", text: "Project settings reset — defaults from your user scope apply." });
    } catch (e) {
      setProjMsg({ kind: "err", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setProjBusy(false);
    }
  };

  const exportSettings = async () => {
    try {
      const json = await window.ride.settings.export();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ride-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[settings] export failed", e);
    }
  };

  const importSettings = async (text: string) => {
    try {
      await window.ride.settings.import(text);
    } catch (e) {
      console.error("[settings] import failed", e);
      window.alert(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const resetUserSettings = () => {
    if (window.confirm("Reset ALL settings to factory defaults? Recent projects and session history are kept.")) {
      void window.ride.settings.resetAll().catch((e) => console.error("[settings] reset failed", e));
    }
  };

  const btnCls2 =
    "flex h-7 items-center gap-1.5 rounded-sm border border-hairline bg-canvas px-2.5 text-xs text-body transition-colors hover:text-ink ride-focus-ring disabled:opacity-40";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    const alias = NL_ALIASES.find((a) => a.match.test(query));
    const scored = SECTIONS.map((sec) => {
      let score = 0;
      const haystack = [sec.label, sec.blurb, sec.keywords ?? "", ...(sec.fields ?? []).map((f) => `${f.label} ${"hint" in f ? (f.hint ?? "") : ""} ${"keywords" in f ? (f.keywords ?? "") : ""}`)]
        .join(" ")
        .toLowerCase();
      for (const word of q.split(/\s+/)) if (word.length > 1 && haystack.includes(word)) score += 1;
      if (alias?.section === sec.id) score += 10;
      return { sec, score };
    });
    return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).map((x) => x.sec);
  }, [query]);

  const activeSection = useMemo(() => visible.find((v) => v.id === section) ?? visible[0], [visible, section]);
  const showAliasHint = query.trim().length > 1 && NL_ALIASES.some((a) => a.match.test(query));

  if (!s) return null;

  const sec = activeSection ?? DEFAULT_SECTION;

  const renderField = (f: FieldDef) => {
    if (!sec.group) return null;
    const g = s[sec.group as keyof RideSettings] as Record<string, unknown>;
    switch (f.kind) {
      case "static":
        return (
          <div className="flex items-center gap-2 text-xs text-mute">
            <span className="font-medium text-body">{f.label}</span>
            <span>{f.value}</span>
          </div>
        );
      case "toggle":
        return <Toggle checked={Boolean(g[f.key])} onChange={(v) => patch(sec.group!, f.key, v)} />;
      case "select":
        return <Select value={String(g[f.key] ?? "")} onChange={(v) => patch(sec.group!, f.key, v)} options={f.options} />;
      case "number":
        return <NumberField value={Number(g[f.key] ?? 0)} min={f.min} max={f.max} step={f.step} onChange={(v) => patch(sec.group!, f.key, v)} />;
      case "text":
        return <TextField value={String(g[f.key] ?? "")} onChange={(v) => patch(sec.group!, f.key, v)} placeholder={f.placeholder} />;
      case "custom": {
        if (f.render === "theme") {
          return (
            <Select
              value={s.workbench.theme}
              onChange={(v) => {
                void update({ workbench: { ...s.workbench, theme: v } });
                applyRideTheme(v);
              }}
              options={listThemes().map((t) => ({ value: t.id, label: t.name }))}
            />
          );
        }
        if (f.render === "featherlessKey") {
          return (
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                placeholder={s.ai.featherlessApiKey ? "•••••••• (set)" : "fl-…"}
                className="h-7 w-56 rounded-sm border border-hairline bg-canvas px-2 text-xs text-body outline-none ride-focus-ring"
              />
              <button
                onClick={() => {
                  void patch("ai", "featherlessApiKey", keyDraft);
                  setKeyDraft("");
                }}
                disabled={!keyDraft}
                className="h-7 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40"
              >
                Save
              </button>
              {keyDraft && (
                <button onClick={() => { void patch("ai", "featherlessApiKey", ""); setKeyDraft(""); }} className="h-7 rounded-sm border border-hairline px-2.5 text-xs text-mute hover:text-error">
                  Clear
                </button>
              )}
            </div>
          );
        }
        return (
          <span className="flex items-center gap-1.5 rounded-sm border border-hairline bg-canvas-soft px-2.5 py-1 text-[11px] text-mute">
            <ChevronRight className="h-3 w-3" /> Coming soon
          </span>
        );
      }
    }
  };

  const renderStatic = () => {
    if (sec.staticKind === "keyboard") {
      return (
        <div className="flex flex-col gap-4">
          {KEYBINDING_GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-1.5 text-[11px] font-semibold text-mute uppercase">{g.group}</div>
              <div className="overflow-hidden rounded-md border border-hairline">
                {g.keys.map(([key, action], i) => (
                  <div key={key} className={`flex items-center justify-between px-3 py-1.5 text-xs ${i > 0 ? "border-t border-hairline" : ""}`}>
                    <span className="text-body">{action}</span>
                    <kbd className="rounded-sm border border-hairline bg-canvas-soft px-2 py-0.5 font-mono text-[11px] text-ink">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (sec.staticKind === "licenses") {
      return (
        <div className="flex flex-col gap-2">
          {LICENSES.map((l) => (
            <div key={l.name} className="flex items-center justify-between rounded-md border border-hairline px-3 py-2">
              <div>
                <div className="text-xs font-medium text-ink">{l.name}</div>
                <div className="text-[11px] text-mute">{l.license}</div>
              </div>
              <button onClick={() => void window.ride.app.openExternal(l.url)} className="text-[11px] text-link hover:underline">
                View license →
              </button>
            </div>
          ))}
        </div>
      );
    }
    if (sec.staticKind === "about") {
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-hairline bg-canvas-soft p-4 text-center">
            <img src={rideLogo} alt="RIDE" className="mx-auto h-12 w-12 rounded-lg ring-1 ring-hairline shadow-level-3" />
            <div className="mt-2 font-mono text-2xl font-bold text-ink">RIDE</div>
            <div className="mt-1 text-xs text-mute">AI Software Development IDE</div>
            <div className="mt-2 inline-block rounded-full border border-hairline bg-canvas px-2.5 py-0.5 font-mono text-[11px] text-body">v{info?.version ?? "0.1.0"}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Platform", info?.platform ?? "—"],
              ["Architecture", info?.arch ?? "—"],
              ["Node.js", info?.node ?? "—"],
              ["Electron", info?.electron ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-hairline px-3 py-2">
                <div className="text-[11px] text-mute">{k}</div>
                <div className="mt-0.5 font-mono text-xs text-ink">{v}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void window.ride.app.openExternal("https://opencode.ai/docs")} className="h-8 rounded-sm border border-hairline bg-canvas px-3 text-xs text-body hover:bg-canvas-soft hover:text-ink ride-focus-ring">
              Documentation
            </button>
            <button onClick={() => void window.ride.app.openExternal("https://github.com/anomalyco/opencode")} className="h-8 rounded-sm border border-hairline bg-canvas px-3 text-xs text-body hover:bg-canvas-soft hover:text-ink ride-focus-ring">
              Report an issue
            </button>
            <button onClick={() => setSection("licenses")} className="h-8 rounded-sm border border-hairline bg-canvas px-3 text-xs text-body hover:bg-canvas-soft hover:text-ink ride-focus-ring">
              Licenses
            </button>
          </div>
        </div>
      );
    }
    if (sec.staticKind === "models") {
      return <ProvidersPane initialTab="models" />;
    }
    if (sec.staticKind === "providers") {
      return <ProvidersPane initialTab="providers" />;
    }
    if (sec.staticKind === "extensions") {
      return <ExtensionsPane />;
    }
    if (sec.staticKind === "account") {
      const { user } = auth;
      return user ? <AccountPane onOpenAuth={() => undefined} /> : <AuthView />;
    }
    if (sec.staticKind === "workspace") {
      return (
        <div className="flex flex-col gap-3">
          <div className="rounded-md border border-hairline bg-canvas-soft p-3">
            <div className="text-xs font-medium text-ink">RIDE.md — project rules</div>
            <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-5 text-body">{`# Project conventions — the agent always reads this.

- Use TypeScript
- Use Tailwind + lucide-react icons
- Never modify /legacy
- Use PostgreSQL
- Always create tests
- Never use inline styles`}</pre>
          </div>
          <div className="text-[11px] leading-5 text-mute">
            Every scaffolded project ships an <span className="font-mono text-body">AGENTS.md</span> with its stack conventions, plus a{" "}
            <span className="font-mono text-body">RIDE_TEMPLATE.json</span> metadata file. Edit those instead of changing global settings for
            project-specific rules.
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex h-[78vh] w-[960px] max-w-[96vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-5">
          <div className="flex w-52 shrink-0 flex-col border-r border-hairline bg-canvas-soft">
            <div className="border-b border-hairline p-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2 text-mute" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search settings…"
                  className="h-8 w-full rounded-sm border border-hairline bg-canvas pr-2 pl-7 text-xs text-ink outline-none placeholder:text-mute ride-focus-ring"
                />
              </div>
              {showAliasHint && (
                <div className="mt-1.5 rounded-sm bg-link/10 px-2 py-1 text-[10px] text-link">
                  {NL_ALIASES.find((a) => a.match.test(query))?.hint ?? "Best match shown"}
                </div>
              )}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {visible.map((v) => {
                const level = LEVELS[v.label];
                return (
                  <button
                    key={v.id}
                    onClick={() => setSection(v.id)}
                    className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-xs transition-colors ${
                      v.id === activeSection?.id ? "bg-canvas-soft-2 font-medium text-ink" : "text-body hover:bg-canvas"
                    }`}
                  >
                    <span className={v.id === activeSection?.id ? "text-link" : "text-mute"}>{v.icon}</span>
                    <span className="min-w-0 flex-1 truncate">{v.label}</span>
                    {level && (
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] ${LEVEL_LABEL[level]!.className}`}>{LEVEL_LABEL[level]!.label}</span>
                    )}
                  </button>
                );
              })}
              {visible.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-mute">
                  No settings match “{query}”. Try “auto save”, “verilator” or “templates”.
                </div>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-hairline px-4">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="shrink-0 text-sm font-medium text-ink">Settings — {sec?.label}</h2>
                {sec?.staticKind === "account" && auth.user && (
                  <span className="rounded-full bg-success/10 px-1.5 py-0.5 text-[9px] text-success">signed in as {auth.user.displayName || auth.user.email}</span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="flex rounded-md border border-hairline bg-canvas p-0.5 text-[10px]" title={projectRoot ? "Scope controls where settings are stored" : "Open a folder to use project-scoped settings"}>
                  <button
                    onClick={() => setScope("user")}
                    className={`h-5 rounded-sm px-2 transition-colors ${scope === "user" ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"}`}
                  >
                    User
                  </button>
                  <button
                    onClick={() => projectRoot && setScope("project")}
                    disabled={!projectRoot}
                    className={`h-5 rounded-sm px-2 transition-colors disabled:opacity-40 ${scope === "project" ? "bg-canvas-soft-2 font-medium text-ink" : "text-mute hover:text-body"}`}
                  >
                    Project
                  </button>
                </div>
                <Dialog.Close className="rounded-sm p-1 text-mute hover:bg-canvas-soft hover:text-ink">
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
            </div>

            {scope === "project" && (
              <div className="shrink-0 border-b border-hairline bg-canvas-soft px-4 py-1.5 text-[10px] text-mute">
                Project scope: changes stage below and are saved to{" "}
                <span className="font-mono text-body">.ride/settings.json</span> in the open folder. API keys and
                credentials always live in the user vault.
                {projMsg && (
                  <span className={`ml-2 ${projMsg.kind === "ok" ? "text-success" : "text-error"}`}>{projMsg.text}</span>
                )}
              </div>
            )}

            {scope === "project" && (!s || !projSettings) ? (
              <div className="flex min-h-0 flex-1 items-center justify-center text-[11px] text-mute">
                {projectRoot ? "Loading project settings…" : "Open a folder to use project-scoped settings."}
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                {visible.length === 0 && query.trim() ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                    <SearchIcon className="h-5 w-5 text-mute" />
                    <p className="text-xs text-mute">No settings match “{query}”.</p>
                    <p className="text-[11px] text-mute">Try “auto save”, “verilator”, “templates” or “icon library”.</p>
                  </div>
                ) : sec?.staticKind === "account" || sec?.staticKind === "providers" || sec?.staticKind === "extensions" || sec?.staticKind === "models" ? (
                  <div className="flex h-full min-h-0 flex-col">{renderStatic()}</div>
                ) : (
                  <>
                    <p className="mb-3 text-[11px] leading-5 text-mute">{sec?.blurb}</p>
                    {sec?.staticKind ? (
                      renderStatic()
                    ) : (
                      <>
                        {(sec?.fields ?? []).map((f, i) => (
                          <Row key={"key" in f ? f.key : `${f.label}-${i}`} label={f.label} hint={"hint" in f ? f.hint : undefined}>
                            {renderField(f)}
                          </Row>
                        ))}
                        {sec?.group === "ai" && (
                          <p className="mt-3 text-[11px] text-mute">
                            Autonomy and permission prompts live in <button onClick={() => setSection("security")} className="text-link hover:underline">Security</button>. Providers, API keys and models live in{" "}
                            <button onClick={() => setSection("providers")} className="text-link hover:underline">API Providers</button>.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex h-11 shrink-0 items-center gap-2 border-t border-hairline px-4">
              {scope === "project" ? (
                <>
                  <span className="mr-auto text-[10px] text-mute">
                    {projDirty ? "Unsaved project changes…" : "Project settings are in sync."}
                  </span>
                  <button onClick={saveProjectScope} disabled={projBusy || !projDirty} className="flex h-7 items-center gap-1.5 rounded-sm bg-primary px-2.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-85 disabled:opacity-40 ride-focus-ring">
                    <Save className="h-3 w-3" /> Save project settings
                  </button>
                  <button onClick={cancelProjectScope} disabled={projBusy || !projDirty} className={btnCls2}>
                    <XCircle className="h-3 w-3" /> Discard
                  </button>
                  <button onClick={resetProjectScope} disabled={projBusy} className={btnCls2}>
                    <RotateCcw className="h-3 w-3" /> Reset project
                  </button>
                </>
              ) : (
                <>
                  <span className="mr-auto text-[10px] text-mute">User scope applies instantly and persists across restarts.</span>
                  <button onClick={exportSettings} className={btnCls2}>
                    <Download className="h-3 w-3" /> Export
                  </button>
                  <label className={btnCls2 + " cursor-pointer"}>
                    <Upload className="h-3 w-3" /> Import
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void file.text().then(importSettings).catch(() => undefined);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button onClick={resetUserSettings} className={btnCls2}>
                    <RotateCcw className="h-3 w-3" /> Reset all
                  </button>
                </>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
