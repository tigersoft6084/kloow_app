const path = require("path");
const { BrowserWindow, Menu, Tray, nativeImage } = require("electron");

function createMainWindow(app, log, entries) {
  Menu.setApplicationMenu(null);
  const mainWindow = new BrowserWindow({
    width: 1460,
    height: 900,
    minWidth: 1460,
    minHeight: 900,
    title: app.getName(),
    icon: "./src/assets/images/logo.png",
    webPreferences: {
      preload: entries.preloadEntry,
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // mainWindow.webContents.openDevTools();

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.webContents.on("did-finish-load", async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      `);
      log.info("Cleared localStorage keys on startup.");
    } catch (error) {
      log.error("Error clearing localStorage on startup:", error);
    }
  });

  mainWindow.loadURL(entries.mainEntry);
  return mainWindow;
}

function createTray(app, state, platformConfig, log) {
  const trayIconPath = path.join(
    __dirname,
    "assets",
    "images",
    platformConfig.iconFile
  );

  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(trayIconPath);
    if (trayIcon.isEmpty()) {
      log.error("Tray icon is empty or could not be loaded:", trayIconPath);
      return null;
    }
  } catch (error) {
    log.error("Error creating tray icon:", error.message);
    return null;
  }

  const resizedIcon = trayIcon.resize({ width: 22, height: 22 });
  const tray = new Tray(process.platform === "darwin" ? resizedIcon : trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        if (state.mainWindow && !state.mainWindow.isDestroyed()) {
          state.mainWindow.show();
        }
      },
    },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip(app.getName());
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (state.mainWindow && !state.mainWindow.isDestroyed()) {
      state.mainWindow.show();
    }
  });

  return tray;
}

function focusMainWindow(mainWindow) {
  if (!mainWindow) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }
  mainWindow.focus();
}

module.exports = {
  createMainWindow,
  createTray,
  focusMainWindow,
};
