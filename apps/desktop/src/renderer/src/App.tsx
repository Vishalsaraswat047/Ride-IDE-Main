import { useEffect, useState } from "react";
import { CommandBar, type CommandItem } from "@ride/ui";
import { Hash, Search, Settings2, TerminalSquare } from "lucide-react";
import { commands } from "@ride/ide-core";
import { listThemes } from "@ride/theme";
import type { RideSettings } from "@ride/contracts";
import { workspace, openFileInWorkspace, newFileAndLoad, openWorkspaceAndLoad, saveActiveFileAs, useDeps, useModels, useWorkspace, useSettings } from "./lib/hooks";
import { IDELayout } from "./layout/IDELayout";
import { PermissionGate } from "./components/PermissionGate";
import { SettingsModal } from "./components/SettingsModal";
import { SaveTemplateModal } from "./components/SaveTemplateModal";
import { UpdateBanner } from "./components/UpdateBanner";
import { applyRideTheme, initMonacoThemes } from "./lib/theme";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export default function App() {
  useWorkspace();
  const { models, selected, refresh, select } = useModels();
  const deps = useDeps();
  const { settings, update } = useSettings();
  const [, force] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<string | null>(null);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);

  useEffect(() => {
    void initMonacoThemes();
  }, []);

  useEffect(() => {
    if (!settings) return;
    const zoom = (settings.appearance.zoom / 100) * (settings.appearance.uiScale / 100);
    document.documentElement.style.zoom = zoom.toFixed(3);
  }, [settings?.appearance.zoom, settings?.appearance.uiScale]);

  useEffect(() => {
    if (!settings) return;
    const { restoreLastWorkspace, lastWorkspace } = { restoreLastWorkspace: settings.workbench.restoreLastWorkspace, lastWorkspace: settings.lastWorkspace };
    if (!restoreLastWorkspace || !lastWorkspace || workspace.state.root) return;
    void window.ride.workspace.open(lastWorkspace).then(async (r) => {
      workspace.setWorkspace(r);
      await window.ride.workspace.listFiles().then((tree) => workspace.setTree(tree));
    }).catch(() => { /* folder gone — start screen handles it */ });
  }, [settings?.workbench.restoreLastWorkspace, workspace.state.root]);

  useEffect(() => {
    applyRideTheme(settings?.workbench.theme ?? "ride-dark");
    if (!settings) return;
    for (const t of listThemes()) {
      commands.register({
        id: `theme:${t.id}`,
        title: `Theme: ${t.name}`,
        category: "settings",
        description: "Switch the IDE appearance",
        run: () => { applyRideTheme(t.id); void update({ workbench: { ...settings.workbench, theme: t.id } }); },
      });
    }
    commands.register({
      id: "open-settings",
      title: "Open settings",
      category: "settings",
      keybinding: "Ctrl+,",
      description: "Workbench, editor, AI, privacy",
      run: () => setSettingsOpen(true),
    });
  }, [settings?.workbench.theme, settingsOpen]);

  useEffect(() => {
    const sub = workspace.subscribe(() => force((n) => n + 1));
    const onOpenDeployment = () => {
      void window.dispatchEvent(new CustomEvent("ride:open-ship", {
        detail: { projectRoot: workspace.state.root ?? "", projectName: workspace.state.name ?? "RIDE" }
      }));
    };
    window.addEventListener("ride:open-deployment", onOpenDeployment);
    commands.register({ id: "save", title: "Save file", category: "file", keybinding: "Ctrl+S", description: "Save the active tab", run: () => { if (!workspace.activeTab) return; void saveActiveFileAs(workspace); } });
    commands.register({ id: "open-project", title: "Open folder…", category: "file", keybinding: "Ctrl+O", description: "Choose a project directory", run: () => void window.ride.workspace.openProjectDialog() });
    commands.register({ id: "reload-active-file", title: "Reload active file", category: "file", keybinding: "Ctrl+B", description: "Discard local edits and re-read from disk", run: () => { if (!workspace.activeTab) return; void openFileInWorkspace(workspace, workspace.activeTab.path); } });
    commands.register({ id: "focus-terminal", title: "Focus terminal", category: "view", keybinding: "Ctrl+`", description: "Show the terminal panel", run: () => {} });
    commands.register({ id: "show-agent", title: "Show agent panel", category: "view", description: "Open the AI agent", run: () => {} });
    commands.register({ id: "open-templates", title: "Open Template Studio", category: "view", keybinding: "Ctrl+Shift+T", description: "Browse, preview or scaffold a starter template", run: () => { void window.dispatchEvent(new CustomEvent("ride:open-templates")); } });
    commands.register({ id: "show-preview", title: "Show browser preview", category: "view", description: "Open the live preview", run: () => {} });
    commands.register({ id: "show-plugins", title: "Open Marketplace", category: "view", keybinding: "Ctrl+Shift+P", description: "Browse, buy and sell templates on the RIDE Marketplace", run: () => { void window.dispatchEvent(new CustomEvent("ride:open-marketplace")); } });
    commands.register({ id: "show-dashboard", title: "Open My Dashboard", category: "view", keybinding: "Ctrl+Shift+D", description: "Live websites, deployments and domains after shipping", run: () => { void window.dispatchEvent(new CustomEvent("ride:open-dashboard")); } });
    commands.register({ id: "save-project-as-template", title: "Save project as template…", category: "file", description: "Add the current workspace to the Template Studio", run: () => { if (!workspace.state.root) return; setSaveTemplateOpen(true); } });
    commands.register({ id: "refresh-models", title: "Refresh models", category: "ai", description: `remote ${models.length} · ollama ${deps.ollama ? "✓" : "✗"}`, run: () => void refresh() });
    const onKey = (e: KeyboardEvent) => { const cmd = commands.match(e); if (cmd && !e.repeat) { e.preventDefault(); void cmd.run(); } };
    window.addEventListener("keydown", onKey);
    return () => { sub(); window.removeEventListener("keydown", onKey); window.removeEventListener("ride:open-deployment", onOpenDeployment); };
  }, []);

  const commandItems: CommandItem[] = [
    ...commands.toPaletteItems().map((c) => ({ id: c.id, label: c.label, description: c.description, shortcut: c.shortcut, icon: c.category === "file" ? <Search className="h-3.5 w-3.5" /> : c.category === "view" ? <TerminalSquare className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />, onSelect: () => void commands.execute(c.id) })),
    ...workspace.tabs.map((t) => ({ id: `open-${t.id}`, label: `Back to ${t.name}`, description: t.path, onSelect: () => workspace.setActive(t.id) })),
  ];

  return (
    <div className="ride-app">
      <IDELayout
        onOpenSettings={() => { setSettingsSection(null); setSettingsOpen(true); }}
        onOpenAccount={() => { setSettingsSection("account"); setSettingsOpen(true); }}
        onDeploy={() => void window.dispatchEvent(new CustomEvent("ride:open-deployment"))}
        onDashboard={() => void window.dispatchEvent(new CustomEvent("ride:open-dashboard"))}
      />
      <CommandBar open={commandOpen} onOpenChange={setCommandOpen} items={commandItems} placeholder="Type a command or file…" />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} initialSection={settingsSection ?? undefined} />
      <SaveTemplateModal open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen} />
      <PermissionGate />
      <UpdateBanner />
    </div>
  );
}