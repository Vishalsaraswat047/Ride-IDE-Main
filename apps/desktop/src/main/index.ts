import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { registerWorkspaceHandlers } from "./handlers/workspace";
import { registerTemplateHandlers } from "./handlers/templates";
import { registerGitHandlers } from "./handlers/git";
import { registerTerminalHandlers } from "./handlers/terminal";
import { registerAgentHandlers } from "./handlers/agent";
import { registerArtifactHandlers } from "./handlers/artifacts";
import { registerEditorHandlers } from "./handlers/editor";
import { registerAppHandlers } from "./handlers/app";
import { registerSettingsHandlers } from "./handlers/settings";
import { registerPreviewHandlers } from "./handlers/preview";
import { registerAuthHandlers } from "./handlers/auth";
import { registerHostingerHandlers } from "./handlers/hostinger";
import { registerProviderHandlers } from "./handlers/providers";
import { registerLocalAiHandlers } from "./handlers/localAi";
import { registerExtensionHandlers } from "./handlers/extensions";
import { registerPluginHandlers } from "./handlers/plugins";
import { pluginService } from "./services/plugins";
import { registerTaskHandlers } from "./handlers/tasks";
import { registerMcpHandlers } from "./handlers/mcp";
import { registerShareHandlers } from "./handlers/share";
import { registerGalaxyHandlers } from "./handlers/galaxy";
import { registerShipHandlers } from "./handlers/ship";
import { initAutoUpdater, cleanup } from "./updater";
import { WorkspaceManager } from "./services/workspace";
import { settingsManager } from "./services/settings";
import { schedulerService } from "./services/scheduler";
import { authService } from "./services/auth";

const ICON_PATH = join(__dirname, "../../resources/icon.png");

// Associate the running app with its installed identity so Windows shows the
// RIDE logo in the taskbar (and for notifications) instead of a generic icon.
app.setAppUserModelId("com.ride.app");

// The GPU process can crash on some Windows graphics stacks (drivers, remote
// desktops, VMs), taking the whole app down. Force software rendering so RIDE
// stays stable everywhere.
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let dashboardWindow: BrowserWindow | null = null;

export const workspaceManager = new WorkspaceManager();

function createDashboardWindow(): void {
  if (dashboardWindow && !dashboardWindow.isDestroyed()) {
    dashboardWindow.focus();
    return;
  }
  dashboardWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 760,
    minHeight: 560,
    show: false,
    title: "RIDE — My Dashboard",
    backgroundColor: "#171717",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay:
      process.platform === "win32"
        ? { color: "#1d1d1d", symbolColor: "#a1a1a1", height: 40 }
        : undefined,
    icon: ICON_PATH,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  dashboardWindow.on("ready-to-show", () => dashboardWindow?.show());

  dashboardWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  dashboardWindow.webContents.on("will-navigate", (e) => e.preventDefault());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void dashboardWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#dashboard`);
  } else {
    void dashboardWindow.loadFile(join(__dirname, "../renderer/index.html"), { hash: "dashboard" });
  }

  dashboardWindow.on("closed", () => {
    dashboardWindow = null;
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: "RIDE",
    backgroundColor: "#171717",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    titleBarOverlay:
      process.platform === "win32"
        ? { color: "#1d1d1d", symbolColor: "#a1a1a1", height: 40 }
        : undefined,
    icon: ICON_PATH,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (e) => e.preventDefault());

  if (process.env["ELECTRON_RENDERER_URL"]) {
    void mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  initAutoUpdater(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await settingsManager.init();
  await schedulerService.init();
  await pluginService.init();
  await authService.loadPersistedProviderConfigs();
  await authService.loadPersistedSession();
  registerAppHandlers();
  registerSettingsHandlers();
  registerAuthHandlers();
  registerHostingerHandlers();
  registerProviderHandlers();
  registerLocalAiHandlers();
  registerExtensionHandlers();
  registerPluginHandlers();
  registerWorkspaceHandlers(workspaceManager);
  registerTemplateHandlers(workspaceManager);
  registerEditorHandlers(workspaceManager);
  registerGitHandlers(workspaceManager);
  registerTerminalHandlers(workspaceManager);
  registerAgentHandlers(workspaceManager);
  registerArtifactHandlers();
  registerTaskHandlers();
  registerMcpHandlers();
  registerShareHandlers();
  registerGalaxyHandlers();
  registerShipHandlers();
  registerPreviewHandlers(workspaceManager);
  ipcMain.handle("dashboard:open", () => {
    createDashboardWindow();
    return { ok: true };
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  cleanup();
});

export function sendToRenderer(channel: string, payload: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}
