require("dotenv").config();
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const log = require("electron-log");
const packageJson = require("../package.json");

const state = require("./main/state");
const { sanitizeAppName, getPlatformConfig } = require("./main/config");
const { createMainWindow, createTray, focusMainWindow } = require("./main/window");
const {
  createSettingsService,
  createCredentialsService,
  registerSettingsHandlers,
} = require("./main/settings");
const { registerCertificateHandlers } = require("./main/certificates");
const { createBrowserService } = require("./main/browser");
const { createScreamingFrogService } = require("./main/screamingFrog");
const { createUpdatesService } = require("./main/updates");

const sanitizedAppName = sanitizeAppName(packageJson.productName);
app.setAppUserModelId(`com.${sanitizedAppName}.app`);

const platformConfig = getPlatformConfig(app);
const settingsService = createSettingsService(app);
const credentialsService = createCredentialsService(app);
const browserService = createBrowserService({ platformConfig, state, log });
const updatesService = createUpdatesService({ app, log });
const screamingFrogService = createScreamingFrogService({ app, state });

function getWindowEntries() {
  return {
    preloadEntry: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    mainEntry: MAIN_WINDOW_WEBPACK_ENTRY,
  };
}

function ensureMainWindow() {
  if (!state.mainWindow || state.mainWindow.isDestroyed()) {
    state.mainWindow = createMainWindow(app, log, getWindowEntries());
  }
  return state.mainWindow;
}

function broadcastDownloadStatus(payload) {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send("download-status", payload);
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    focusMainWindow(state.mainWindow);
  });

  app.whenReady().then(async () => {
    const settings = await settingsService.loadSettings();
    settingsService.setAutoLaunch(settings.autoLaunch);

    if (process.platform === "darwin") {
      app.dock.hide();
    }

    ensureMainWindow();
    state.tray = createTray(app, state, platformConfig, log);
    updatesService.setupAutoUpdater();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      ensureMainWindow();
    }
  });

  app.on("window-all-closed", () => app.quit());

  app.on("before-quit", async (event) => {
    if (browserService.isDownloadInProgress()) {
      event.preventDefault();
      log.info("Prevented app quit due to active download.");
      if (state.mainWindow && !state.mainWindow.isDestroyed()) {
        state.mainWindow.show();
      }
      broadcastDownloadStatus({
        status: "error",
        message: "Please wait for the download to finish before closing the app.",
      });
      return;
    }

    if (state.tray) {
      state.tray.destroy();
      state.tray = null;
    }

    await browserService.stopAllBrowsers();
  });

  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-app-name", () => app.getName());

  ipcMain.on("set-title", (event, title) => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.setTitle(`${app.getName()} ${app.getVersion()} - ${title}`);
    }
  });

  ipcMain.handle("open-external", async (event, url) => {
    try {
      const validated = new URL(url);
      return await shell.openExternal(validated.toString());
    } catch (err) {
      console.error("Invalid URL or failed to open", err);
      throw err;
    }
  });

  registerSettingsHandlers(ipcMain, settingsService, credentialsService);
  registerCertificateHandlers(ipcMain);
  browserService.registerHandlers(ipcMain);
  screamingFrogService.registerHandlers(ipcMain);
  updatesService.registerHandlers(ipcMain);
}
