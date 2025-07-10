require("dotenv").config();
const {
  app,
  BrowserWindow,
  Menu,
  autoUpdater,
  ipcMain,
  Tray,
  nativeImage,
  session,
} = require("electron");
const {
  ersPlatform,
} = require("@electron-forge/publisher-electron-release-server");
const { download } = require("electron-dl");
const AdmZip = require("adm-zip");
const fs = require("fs").promises;
const path = require("path");
const { exec, spawn } = require("child_process");

const isDev = require("electron-is-dev");
const log = require("electron-log");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
let mainWindow = null;
let tray = null;
const browserProcesses = new Map();

const downloadUrl = "http://46.62.137.213:5000/download";
const appPath = path.join(app.getPath("userData"), "Browser", app.getVersion());
const zipPath = path.join(appPath, "browser.zip");
// const executableName = "GoogleChromePortable.exe";
// const executablePath = path.join(extractPath, executableName);

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

  mainWindow.on("close", (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // if (isDev) mainWindow.webContents.openDevTools();
};

const createTray = () => {
  const iconFile = process.platform === "win32" ? "logo.ico" : "logo.png";
  const trayIconPath = path.join(__dirname, "assets", "images", iconFile);
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(trayIconPath);
    if (trayIcon.isEmpty()) {
      log.error("Tray icon is empty or could not be loaded:", trayIconPath);
      return;
    }
  } catch (error) {
    log.error("Error creating tray icon:", error.message);
    return;
  }

  tray = new Tray(trayIcon);
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
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
    }
  });
};

function parseSetCookieHeader(header, url) {
  if (!header || typeof header !== "string") {
    return null;
  }
  const cookie = {};
  const parts = header
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part);
  const [name, ...valueParts] = parts[0].split("=");
  cookie.name = name.trim();
  cookie.value = valueParts.join("=").trim() || "";
  cookie.url = url;
  try {
    cookie.domain = new URL(url).hostname;
    if (cookie.domain.startsWith(".")) {
      cookie.domain = cookie.domain.slice(1);
    }
  } catch (e) {
    cookie.domain = "maserver.click";
  }
  cookie.path =
    parts
      .find((part) => part.toLowerCase().startsWith("path="))
      ?.split("=")[1]
      ?.trim() || "/";
  cookie.secure = parts.some((part) => part.toLowerCase() === "secure");
  cookie.httpOnly = parts.some((part) => part.toLowerCase() === "httponly");
  const sameSitePart = parts.find((part) =>
    part.toLowerCase().startsWith("samesite=")
  );
  if (sameSitePart) {
    const sameSiteValue = sameSitePart.split("=")[1]?.toLowerCase();
    cookie.sameSite =
      sameSiteValue === "lax"
        ? "lax"
        : sameSiteValue === "strict"
        ? "strict"
        : "no_restriction";
  } else {
    cookie.sameSite = "no_restriction";
  }
  const maxAge = parts
    .find((part) => part.toLowerCase().startsWith("max-age="))
    ?.split("=")[1]
    ?.trim();
  const expires = parts
    .find((part) => part.toLowerCase().startsWith("expires="))
    ?.split("=")[1]
    ?.trim();
  if (maxAge) {
    const maxAgeNum = parseInt(maxAge, 10);
    if (!isNaN(maxAgeNum)) {
      cookie.expiry = Math.floor(Date.now() / 1000) + maxAgeNum;
    }
  } else if (expires) {
    try {
      const expiryDate = new Date(expires);
      if (!isNaN(expiryDate.getTime())) {
        cookie.expiry = Math.floor(expiryDate.getTime() / 1000);
      }
    } catch (e) {
      cookie.expiry = null;
    }
  }
  return cookie;
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  const feedUrl = `${
    process.env.RELEASE_SERVER_URL
  }/update/flavor/${app.getName()}/${ersPlatform(
    process.platform,
    process.arch
  )}/${app.getVersion()}`;
  autoUpdater.setFeedURL({ url: feedUrl });
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
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["https://maserver.click/*"] },
    async (details, callback) => {
      const setCookieHeaders =
        details.responseHeaders["set-cookie"] ||
        details.responseHeaders["Set-Cookie"] ||
        [];
      for (const header of setCookieHeaders) {
        try {
          const cookie = parseSetCookieHeader(header, "https://maserver.click");
          if (cookie) {
            await session.defaultSession.cookies.set(cookie);
          }
        } catch (error) {
          continue;
        }
      }
      if ([301, 302, 303, 307, 308].includes(details.statusCode)) {
        const redirectURL =
          details.responseHeaders["location"] ||
          details.responseHeaders["Location"];
        if (redirectURL) {
          callback({ responseHeaders: details.responseHeaders, redirectURL });
        } else {
          callback({ responseHeaders: details.responseHeaders });
        }
      } else {
        callback({ responseHeaders: details.responseHeaders });
      }
    }
  );
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
  if (tray) {
    tray.destroy();
    tray = null;
  }
  for (const [, process] of browserProcesses) {
    if (process && !process.killed) {
      exec(`taskkill /PID ${process.pid} /F /T`, (err) => {
        if (err) {
          log.error(
            `Error in before-quit for PID ${process.pid}: ${err.message}`
          );
        }
      });
    }
  }
  browserProcesses.clear();
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

ipcMain.handle("set-cookie", async (event, cookie) => {
  try {
    await session.defaultSession.cookies.set(cookie);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-cookies", async (event, options) => {
  try {
    const cookies = await session.defaultSession.cookies.get(options);
    return cookies;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("clear-cookies", async (event, options) => {
  try {
    await session.defaultSession.clearStorageData(options);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

async function runExecutable(executablePath, id, url, server) {
  console.log(server);
  try {
    const existingProcess = browserProcesses.get(id);
    if (existingProcess && !existingProcess.killed) {
      log.info(
        `Terminating existing process for id ${id}, PID: ${existingProcess.pid}`
      );
      await new Promise((resolve, reject) => {
        exec(`taskkill /PID ${existingProcess.pid} /F /T`, (err) => {
          if (err) {
            log.error(
              `Error terminating existing process for id ${id}: ${err.message}`
            );
            reject(err);
          } else {
            resolve();
          }
        });
      });
      browserProcesses.delete(id);
    }
    const userDataDir = path.join(appPath, id, "Data", "profile");
    const args = [`--user-data-dir=${userDataDir}`];
    if (server) {
      args.push(`--proxy-server="http://${server}:3000"`);
    }
    if (url) {
      args.push(`"${url}"`); // Add the URL as a command-line argument
    }
    const proc = spawn(executablePath, args, {
      windowsHide: true,
      shell: true,
    });
    browserProcesses.set(id, proc);
    log.info(
      `Executable started for id ${id}, PID: ${proc.pid}, userDataDir: ${userDataDir}`
    );

    proc.on("spawn", () => {
      log.info(`Process spawned successfully for id ${id}, PID: ${proc.pid}`);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("browser-status", { id, running: true })
      );
    });

    proc.on("exit", (code, signal) => {
      log.info(
        `Browser process for id ${id} exited with code ${code}, signal: ${signal}`
      );
      browserProcesses.delete(id);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("browser-status", { id, running: false })
      );
    });

    proc.on("error", (err) => {
      log.error(`Browser process error for id ${id}: ${err.message}`);
      browserProcesses.delete(id);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("browser-status", { id, running: false })
      );
    });
  } catch (error) {
    log.error(`Error running executable for id ${id}: ${error.message}`);
    browserProcesses.delete(id);
    BrowserWindow.getAllWindows().forEach((win) =>
      win.webContents.send("browser-status", { id, running: false })
    );
    throw error;
  }
}

ipcMain.handle("run-browser", async (event, id, url, server) => {
  const extractPath = path.join(appPath, id);
  const executableName = "chrome.exe";
  const executablePath = path.join(
    extractPath,
    "App",
    "Chrome-bin",
    executableName
  );
  try {
    await fs.access(zipPath);
    log.info(`Zip file exists at ${zipPath}`);
  } catch {
    log.error(`Zip file not found at ${zipPath}`);
    return { status: false, message: "ZIP_NOT_FOUND" };
  }
  try {
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);
  } catch (e) {
    log.error(`Failed to extracting zip file for ${id}: ${e.message}`);
  }
  try {
    await fs.access(executablePath);
    await runExecutable(executablePath, id, url, server);
    return { status: true, message: "" };
  } catch (e) {
    log.error(`run-browser failed for id ${id}: ${e.message}`);
    return { status: false, message: e.message };
  }
});

ipcMain.handle("stop-browser", async (event, id) => {
  try {
    const proc = browserProcesses.get(id);
    if (proc && !proc.killed) {
      log.info(
        `Attempting to stop browser process for id ${id}, PID: ${proc.pid}`
      );
      await new Promise((resolve, reject) => {
        exec(`taskkill /PID ${proc.pid} /F /T`, (err) => {
          if (err) {
            log.error(`taskkill failed for PID ${proc.pid}: ${err.message}`);
            reject(err);
          } else {
            log.info(`taskkill succeeded for PID ${proc.pid}`);
            resolve();
          }
        });
      });
      proc.killed = true;
      browserProcesses.delete(id);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("browser-status", { id, running: false })
      );
      return { status: true, message: `Browser stopped for id ${id}` };
    }
    log.warn(`No browser process running for id ${id}`);
    return {
      status: false,
      message: `No browser process running for id ${id}`,
    };
  } catch (e) {
    log.error(`Error stopping browser for id ${id}: ${e.message}`);
    return { status: false, message: e.message };
  }
});

ipcMain.handle("download-browser", async () => {
  try {
    await fs.mkdir(appPath, { recursive: true });
    log.info("Downloading zip file...");
    await download(BrowserWindow.getAllWindows()[0], downloadUrl, {
      directory: appPath,
      filename: "browser.zip",
    });
    log.info("Success to download zip file.");
    // log.info("Unzipping file...");
    // const zip = new AdmZip(zipPath);
    // zip.extractAllTo(extractPath, true);
    // try {
    //   await fs.unlink(zipPath);
    //   log.info("Deleted zip file:", zipPath);
    // } catch (error) {
    //   log.error("Error deleting zip file:", error);
    // }
    return { status: true, message: "" };
  } catch (e) {
    log.error("Error downloading browser:", e);
    return { status: false, message: e.message };
  }
});
