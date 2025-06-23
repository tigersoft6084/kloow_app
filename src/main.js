require("dotenv").config();
const {
  app,
  BrowserWindow,
  Menu,
  autoUpdater,
  ipcMain,
  Tray,
  nativeImage,
} = require("electron");
const {
  ersPlatform,
} = require("@electron-forge/publisher-electron-release-server");
const isDev = require("electron-is-dev");
const log = require("electron-log");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
let mainWindow = null;
let tray = null;

// Handle Squirrel.Windows startup events
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: app.getName(),
    icon: "./src/assets/images/logo.png",
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Prevent the window from closing immediately
  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  if (isDev) mainWindow.webContents.openDevTools();
};

const createTray = () => {
  // Use the same icon as the app
  tray = new Tray("./src/assets/images/logo.png");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
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

  // Double-click tray icon to show the window
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
};

app.whenReady().then(() => {
  createWindow();
  createTray();
  // Configure autoUpdater for local testing
  const feedUrl = `${
    process.env.RELEASE_SERVER_URL
  }/update/flavor/${app.getName()}/${ersPlatform(
    process.platform,
    process.arch
  )}/${app.getVersion()}`;

  autoUpdater.setFeedURL({ url: feedUrl });

  // Send update events to renderer
  autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send("update-status", {
        status: "update-downloaded",
        message: process.platform === "win32" ? releaseNotes : releaseName,
      })
    );
  });

  autoUpdater.on("error", (err) => {
    log.error("Error in auto-updater:", err);
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send("update-status", {
        status: "error",
        message: err.message,
      })
    );
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

app.on("before-quit", () => {
  // Ensure tray is destroyed before quitting
  if (tray) {
    tray.destroy();
    tray = null;
  }
});

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-app-name", () => app.getName());

ipcMain.on("check-for-updates", () => {
  if (process.argv.includes("--squirrel-firstrun")) {
    log.info("First run after install, skipping update check.");
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send("update-status", {
        status: "check-for-updates",
        message: "No updates checked on first run.",
      })
    );
    return;
  }
  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), 10 * 60 * 1000);
});

ipcMain.on("restart-and-update", () => autoUpdater.quitAndInstall());

ipcMain.on("set-title", (event, title) =>
  mainWindow.setTitle(`${app.getName()} ${app.getVersion()} - ${title}`)
);
