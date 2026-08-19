import { autoUpdater, type UpdateDownloadedEvent, type UpdateCheckResult } from "electron-updater";
import { app, dialog, BrowserWindow } from "electron";
import log from "electron-log";
import { settingsManager } from "./services/settings";

autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow: BrowserWindow | null = null;
let updateCheckTimer: NodeJS.Timeout | null = null;

interface ReleaseChannelConfig {
  channel: "stable" | "beta" | "alpha";
  allowPrerelease: boolean;
}

function getReleaseChannel(): ReleaseChannelConfig {
  try {
const settings = settingsManager.get();
    const channel = (settings.updates?.channel as "stable" | "beta" | "alpha") ?? "stable";
    return {
      channel,
      allowPrerelease: channel !== "stable",
    };
  } catch {
    return { channel: "stable", allowPrerelease: false };
  }
}

function getUpdateFeedUrl(): string {
  const { channel, allowPrerelease } = getReleaseChannel();
  const owner = "Vishalsaraswat047";
  const repo = "Ride-IDE-Main";
  
  if (channel === "stable") {
    return `https://github.com/${owner}/${repo}/releases/latest`;
  }
  // For beta/alpha, we use the releases API with prerelease flag
  return `https://github.com/${owner}/${repo}/releases`;
}

export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window;

  if (process.env.NODE_ENV === "development") {
    log.info("Auto-updater disabled in development mode");
    return;
  }

  const { channel, allowPrerelease } = getReleaseChannel();
  
  // Configure update feed
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "Vishalsaraswat047",
    repo: "Ride-IDE-Main",
    channel: channel === "stable" ? "latest" : channel,
  });

  log.info(`Auto-updater initialized: channel=${channel}, allowPrerelease=${allowPrerelease}`);

  // Initial check (delayed to let app fully start)
  setTimeout(() => {
    checkForUpdates();
  }, 5000);

  // Periodic checks every 4 hours
  updateCheckTimer = setInterval(checkForUpdates, 4 * 60 * 60 * 1000);

  autoUpdater.on("checking-for-update", () => {
    log.info("Checking for updates...");
    mainWindow?.webContents.send("update:checking");
  });

  autoUpdater.on("update-available", (info) => {
    log.info("Update available:", info.version, "channel:", channel);
    mainWindow?.webContents.send("update:available", { ...info, channel });
  });

  autoUpdater.on("update-not-available", (info) => {
    log.info("No update available, current:", info.version);
    mainWindow?.webContents.send("update:not-available", info);
  });

  autoUpdater.on("error", (err) => {
    log.error("Auto-updater error:", err);
    mainWindow?.webContents.send("update:error", { 
      message: err.message, 
      code: (err as any).code 
    });
    
    // Handle specific error cases
    if ((err as any).code === "ERR_UPDATER_INVALID_RELEASE_FEED") {
      log.error("Invalid release feed - check GitHub repo configuration");
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    log.info(`Download progress: ${progress.percent}% (${progress.bytesPerSecond} bytes/s)`);
    mainWindow?.webContents.send("update:progress", progress);
  });

  autoUpdater.on("update-downloaded", (info: UpdateDownloadedEvent) => {
    log.info("Update downloaded, ready to install:", info.version);
    showUpdateReadyDialog(info);
  });
}

async function checkForUpdates(): Promise<UpdateCheckResult | null> {
  try {
    const result = await autoUpdater.checkForUpdates();
    return result;
  } catch (err) {
    log.error("Update check failed:", err);
    return null;
  }
}

function showUpdateReadyDialog(info: UpdateDownloadedEvent): void {
  if (!mainWindow) return;

  const { channel } = getReleaseChannel();
  const channelLabel = channel === "stable" ? "" : ` (${channel})`;

  dialog
    .showMessageBox(mainWindow, {
      type: "info",
      title: "Update Ready",
      message: `RIDE ${info.version}${channelLabel} downloaded.`,
      detail: "The update will be installed when you restart RIDE.",
      buttons: ["Restart Now", "Restart Later"],
      defaultId: 0,
      cancelId: 1,
    })
    .then((result) => {
      if (result.response === 0) {
        log.info("User chose to restart now");
        autoUpdater.quitAndInstall(true, true);
      } else {
        log.info("User chose to restart later");
        // Update will install on next quit
      }
    })
    .catch((err) => {
      log.error("Dialog error:", err);
      // Fallback: auto-install on quit
    });
}

export function checkForUpdatesNow(): Promise<UpdateCheckResult | null> {
  return checkForUpdates();
}

export async function setReleaseChannel(channel: "stable" | "beta" | "alpha"): Promise<void> {
  const settings = settingsManager.get();
  settings.updates.channel = channel;
  await settingsManager.set({ updates: settings.updates });
}

export function getCurrentChannel(): "stable" | "beta" | "alpha" {
  return getReleaseChannel().channel;
}

export function cleanup(): void {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
    updateCheckTimer = null;
  }
}