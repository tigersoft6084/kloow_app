const fs = require("fs");
const path = require("path");
const semver = require("semver");
const { autoUpdater } = require("electron-updater");
const { broadcast } = require("./shared/broadcast");

const DEFAULT_WINDOWS_UPDATE_PATH = "/kloow-version-manager/windows/";
const DEFAULT_UPDATE_BASE_URL = "https://www.kloow.com/kloow-version-manager/windows/";
const FALLBACK_UPDATER_CONFIG_NAME = "app-update.yml";
const FALLBACK_UPDATER_CACHE_DIR = "kloow-updater-cache";

function normalizeFeedUrl(value = "") {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.endsWith("/")) {
    return trimmed;
  }
  return `${trimmed}/`;
}

function normalizePathname(pathname = "/") {
  if (!pathname) {
    return "/";
  }
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}

function normalizeEnvUrl(value = "") {
  const normalized = normalizeFeedUrl(value);
  if (!normalized) {
    return null;
  }

  if (normalized.includes("your-domain")) {
    return null;
  }

  return normalized;
}

function toAbsoluteFeedUrl(value = "", fallbackPath = "/") {
  const normalized = normalizeFeedUrl(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    const currentPath = normalizePathname(parsed.pathname);
    const expectedPath = normalizePathname(fallbackPath);
    const shouldAppendDefaultPath = currentPath === "/";

    parsed.pathname = shouldAppendDefaultPath ? expectedPath : currentPath;
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return normalized;
  }
}

function resolveFeedUrl() {
  // UPDATE_BASE_URL should point to a folder that contains latest.yml and installer artifacts.
  // If only RELEASE_SERVER_URL is provided, default to the version manager path.
  const explicitFeedUrl = normalizeEnvUrl(process.env.UPDATE_BASE_URL || "");
  if (explicitFeedUrl) {
    return toAbsoluteFeedUrl(explicitFeedUrl, DEFAULT_WINDOWS_UPDATE_PATH);
  }

  const releaseServerUrl = normalizeEnvUrl(process.env.RELEASE_SERVER_URL || "");
  if (releaseServerUrl) {
    return toAbsoluteFeedUrl(releaseServerUrl, DEFAULT_WINDOWS_UPDATE_PATH);
  }
  return toAbsoluteFeedUrl(DEFAULT_UPDATE_BASE_URL, DEFAULT_WINDOWS_UPDATE_PATH);
}

function buildFallbackUpdaterConfig(feedUrl) {
  return [
    "provider: generic",
    `url: ${JSON.stringify(feedUrl)}`,
    "channel: latest",
    `updaterCacheDirName: ${JSON.stringify(FALLBACK_UPDATER_CACHE_DIR)}`,
    "",
  ].join("\n");
}

function ensureUpdaterConfigFile(app, feedUrl, log) {
  if (!feedUrl) {
    return null;
  }

  try {
    const userDataPath = app.getPath("userData");
    const configPath = path.join(userDataPath, FALLBACK_UPDATER_CONFIG_NAME);
    const configContent = buildFallbackUpdaterConfig(feedUrl);
    fs.writeFileSync(configPath, configContent, "utf8");
    return configPath;
  } catch (error) {
    log.warn(`Unable to create fallback updater config file: ${error.message}`);
    return null;
  }
}

function createUpdatesService({ app, log }) {
  let updateCheckInterval = null;
  let updaterInitialized = false;

  function emitUpdateDownloadStatus(payload) {
    broadcast("update-download-status", payload);
  }

  function setupAutoUpdater() {
    if (updaterInitialized) {
      return;
    }
    updaterInitialized = true;

    const feedUrl = resolveFeedUrl();

    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    if (!app.isPackaged) {
      log.info("Auto-updater is disabled in development mode.");
      return;
    }

    if (feedUrl) {
      const fallbackConfigPath = ensureUpdaterConfigFile(app, feedUrl, log);
      if (fallbackConfigPath) {
        autoUpdater.updateConfigPath = fallbackConfigPath;
        log.info(`Auto-updater config path configured: ${fallbackConfigPath}`);
      }

      autoUpdater.setFeedURL({
        provider: "generic",
        url: feedUrl,
      });
      log.info(`Auto-updater feed URL configured: ${feedUrl}`);
    } else {
      log.warn(
        "Auto-updater feed URL is missing. Set UPDATE_BASE_URL (or RELEASE_SERVER_URL) to enable updates."
      );
    }

    autoUpdater.on("checking-for-update", () => {
      broadcast("update-status", {
        status: "check-for-updates",
        message: "Checking for updates.",
      });
    });

    autoUpdater.on("update-available", (info) => {
      broadcast("update-status", {
        status: "update-available",
        message: info?.version ? `Update v${info.version} is available.` : "Update is available.",
      });
      emitUpdateDownloadStatus({
        status: "idle",
        message: "Update is available. Click download to start.",
        percent: 0,
      });
    });

    autoUpdater.on("update-not-available", () => {
      broadcast("update-status", {
        status: "update-not-available",
        message: "You are using the latest version.",
      });
      emitUpdateDownloadStatus({
        status: "idle",
        message: "No update available.",
        percent: 0,
      });
    });

    autoUpdater.on("download-progress", (progress) => {
      emitUpdateDownloadStatus({
        status: "downloading",
        message: `Downloading update: ${Math.round(progress.percent || 0)}%`,
        percent: Math.round(progress.percent || 0),
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      const versionLabel = info?.version ? `v${info.version}` : "latest version";
      emitUpdateDownloadStatus({
        status: "completed",
        message: "Update downloaded successfully. Restart the app to install.",
        percent: 100,
      });

      broadcast("update-status", {
        status: "update-downloaded",
        message: `${versionLabel} downloaded successfully.`,
      });
    });

    autoUpdater.on("error", (err) => {
      log.error("Error in auto-updater:", err);
      emitUpdateDownloadStatus({
        status: "error",
        message: err.message,
      });
      broadcast("update-status", {
        status: "error",
        message: err.message,
      });
    });
  }

  async function checkUpdate(event, remote = {}) {
    const localVersion = app.getVersion();
    const platform = process.platform;

    try {
      if (semver.valid(remote.version) && semver.gt(remote.version, localVersion)) {
        return {
          updateAvailable: true,
          latestVersion: remote.version,
          downloadUrl: remote.downloadUrls?.[platform] || null,
        };
      }
      return { updateAvailable: false };
    } catch (error) {
      log.error("Error checking for updates:", error);
      return {
        updateAvailable: false,
        error: error.message,
      };
    }
  }

  async function downloadAndUpdate() {
    try {
      setupAutoUpdater();

      if (!app.isPackaged) {
        return {
          status: false,
          message: "Auto-update is available only in packaged builds.",
        };
      }

      emitUpdateDownloadStatus({
        status: "downloading",
        message: "Checking for updates...",
        percent: 0,
      });

      const updateCheckResult = await autoUpdater.checkForUpdates();
      if (!updateCheckResult?.updateInfo?.version) {
        emitUpdateDownloadStatus({
          status: "idle",
          message: "No update available.",
          percent: 0,
        });
        return { status: false, message: "No update available." };
      }

      await autoUpdater.downloadUpdate();
      return { status: true, message: "Update downloaded successfully." };
    } catch (e) {
      log.error("Error starting update download:", e);
      emitUpdateDownloadStatus({
        status: "error",
        message: e.message,
      });
      return { status: false, message: e.message };
    }
  }

  function schedulePeriodicChecks() {
    if (updateCheckInterval) {
      clearInterval(updateCheckInterval);
    }

    updateCheckInterval = setInterval(() => {
      try {
        autoUpdater.checkForUpdates();
      } catch (error) {
        log.error("Scheduled update check failed:", error);
      }
    }, 10 * 60 * 1000);
  }

  function registerHandlers(ipcMain) {
    ipcMain.on("check-for-updates", () => {
      setupAutoUpdater();

      if (!app.isPackaged) {
        broadcast("update-status", {
          status: "check-for-updates",
          message: "Auto-update is disabled in development mode.",
        });
        return;
      }

      try {
        autoUpdater.checkForUpdates();
        schedulePeriodicChecks();
      } catch (error) {
        log.error("Error checking for updates:", error);
        broadcast("update-status", {
          status: "error",
          message: error.message,
        });
      }
    });

    ipcMain.on("restart-and-update", () => {
      app.isQuitting = true;
      autoUpdater.quitAndInstall(false, true);
    });

    ipcMain.on("close-app", () => {
      app.isQuitting = true;
      app.quit();
    });

    ipcMain.handle("check-update", checkUpdate);
    ipcMain.handle("download-and-update", downloadAndUpdate);
  }

  return {
    setupAutoUpdater,
    registerHandlers,
  };
}

module.exports = {
  createUpdatesService,
};
