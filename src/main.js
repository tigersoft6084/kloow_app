require("dotenv").config();
const {
  app,
  BrowserWindow,
  Menu,
  autoUpdater,
  ipcMain,
  Tray,
  nativeImage,
  shell,
} = require("electron");
const {
  ersPlatform,
} = require("@electron-forge/publisher-electron-release-server");
const { download } = require("electron-dl");
const AdmZip = require("adm-zip");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { exec, spawn, execSync } = require("child_process");
const isDev = require("electron-is-dev");
const log = require("electron-log");
const sudo = require("sudo-prompt");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
let mainWindow = null;
let tray = null;
const browserProcesses = new Map();
let isDownloading = false; // Track download state
let isHelperDownloading = false; // Track download state

const CREDENTIALS_PATH = path.join(app.getPath("userData"), "credential.json");
const settingsFilePath = path.join(app.getPath("userData"), "settings.json");

// Platform-specific configurations
const config = {
  win32: {
    downloadUrl: "https://www.kloow.com/download",
    zipHash: "16e94c87d46680428cfaa8594cb73af526684f11087ea985334594c7eadc9f51",
    iconFile: "logo.ico",
    executableName: "chrome.exe",
    appPath: path.join(app.getPath("userData"), "Browser", app.getVersion()),
    zipPath: path.join(
      path.join(app.getPath("userData"), "Browser", app.getVersion()),
      "browser.zip"
    ),
  },
  linux: {
    downloadUrl: "https://www.kloow.com/download_linux",
    zipHash: "ff709f7e823b94ab06bdaef4686b2842ff8111d444109e06c8d93f00200c1743",
    iconFile: "logo.png",
    executableName: "chrome",
    appPath: path.join(app.getPath("userData"), "Browser", app.getVersion()),
    zipPath: path.join(
      path.join(app.getPath("userData"), "Browser", app.getVersion()),
      "browser.zip"
    ),
  },
  darwin: {
    downloadUrl: "https://www.kloow.com/download_mac",
    zipHash: "f732d25747ee51d5af8ca8c7ec30d41c10686a044414dc81af17106443ef7515", // Add appropriate hash for macOS
    iconFile: "logo.png",
    executableName: "Chromium.app/Contents/MacOS/Chromium",
    appPath: path.join(app.getPath("userData"), "Browser", app.getVersion()),
    zipPath: path.join(
      path.join(app.getPath("userData"), "Browser", app.getVersion()),
      "browser.tar.xz"
    ),
  },
};
const platformConfig = config[process.platform] || config.win32;

if (require("electron-squirrel-startup")) app.quit();

async function loadSettings() {
  try {
    await fs.access(settingsFilePath);
    const fileContent = await fs.readFile(settingsFilePath, "utf-8");
    const data = JSON.parse(fileContent);
    if (typeof data.autoLaunch === "boolean") return data;
    return { autoLaunch: false };
  } catch (err) {
    console.error("Error reading settings:", err);
    return { autoLaunch: false }; // Always return default on any error
  }
}

async function saveSettings(settings) {
  try {
    await fs.writeFile(settingsFilePath, JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error("Error saving settings:", err);
  }
}

function setAutoLaunch(enabled) {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    path: process.execPath,
  });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });

  const createWindow = () => {
    Menu.setApplicationMenu(null);
    mainWindow = new BrowserWindow({
      width: 1460,
      height: 900,
      minWidth: 1460,
      minHeight: 900,
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

    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    // if (isDev) mainWindow.webContents.openDevTools();
  };

  const createTray = () => {
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
        return;
      }
    } catch (error) {
      log.error("Error creating tray icon:", error.message);
      return;
    }
    const resizedIcon = trayIcon.resize({ width: 22, height: 22 });
    tray = new Tray(process.platform === "darwin" ? resizedIcon : trayIcon);
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

  app.whenReady().then(async () => {
    const settings = await loadSettings();
    setAutoLaunch(settings.autoLaunch);

    if (gotTheLock) {
      if (process.platform === "darwin") {
        app.dock.hide();
      }
      createWindow();
      createTray();

      const feedUrl = `${
        process.env.RELEASE_SERVER_URL
      }/update/flavor/${app.getName()}/${ersPlatform(
        process.platform,
        process.arch
      )}/${app.getVersion()}`;

      autoUpdater.setFeedURL({ url: feedUrl });
      autoUpdater.on(
        "update-downloaded",
        (event, releaseNotes, releaseName) => {
          BrowserWindow.getAllWindows().forEach((win) =>
            win.webContents.send("update-status", {
              status: "update-downloaded",
              message:
                process.platform === "win32" ? releaseNotes : releaseName,
            })
          );
        }
      );
      autoUpdater.on("error", (err) => {
        log.error("Error in auto-updater:", err);
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("update-status", {
            status: "error",
            message: err.message,
          })
        );
      });
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("window-all-closed", () => app.quit());

  async function terminateProcess(pid) {
    return new Promise((resolve, reject) => {
      const command =
        process.platform === "win32"
          ? `taskkill /PID ${pid} /F /T`
          : `kill -9 $(ps -o pid= --ppid ${pid} --forest | awk '{print $1}' ; echo ${pid})`;
      exec(command, (err) => {
        if (err) {
          log.error(
            `Error terminating process with PID ${pid}: ${err.message}`
          );
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  app.on("before-quit", async (event) => {
    if (isDownloading) {
      event.preventDefault(); // Prevent quitting if download is in progress
      log.info("Prevented app quit due to active download.");
      mainWindow.show();
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("download-status", {
          status: "error",
          message: "Cannot quit while download is in progress.",
        })
      );
      return;
    }

    if (tray) {
      tray.destroy();
      tray = null;
    }
    const terminationPromises = [];

    for (const [, process] of browserProcesses) {
      if (process && !process.killed) {
        terminationPromises.push(terminateProcess(process.pid));
      }
    }

    await Promise.all(terminationPromises);
    browserProcesses.clear();
  });

  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-app-name", () => app.getName());

  ipcMain.handle("check-cert", () => {
    if (process.platform === "linux") {
      try {
        execSync(
          `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Kloow Root CA" -i /usr/lib/kloow/resources/cert.crt`,
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return true;
      } catch (error) {
        return false;
      }
    } else if (process.platform === "darwin") {
      try {
        const output = execSync(
          `security find-certificate -a -p /Library/Keychains/System.keychain | grep "MIIBhjCCASugAwIBAgIUd+87T/bW/qcVbax2mCckSE17oPowCgYIKoZIzj0EAwIw"`,
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        if (output !== "") {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    } else {
      try {
        const output = execSync(
          "certutil -store Root 3aa5c9285c6eb3237abfcf943d9bf504019b68fb",
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        if (output.includes("3aa5c9285c6eb3237abfcf943d9bf504019b68fb")) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
  });

  ipcMain.handle("install-cert", async () => {
    if (process.platform === "linux") {
      const certPath = "/usr/lib/kloow/resources/cert.crt";
      try {
        await fs.access(certPath);
        const output = execSync(
          `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "Kloow Root CA" -i ${certPath}`,
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        return { status: true, message: output };
      } catch (error) {
        return { status: false, message: error.message };
      }
    } else if (process.platform === "darwin") {
      const certPath = "/Applications/kloow.app/Contents/Resources/cert.crt";
      try {
        await fs.access(certPath);
        const output = await new Promise((resolve, reject) => {
          sudo.exec(
            `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certPath}`,
            { name: "Kloow" },
            (error, stdout, stderr) => {
              if (error) {
                console.error("Error:", error);
                reject(error);
              } else {
                console.log("Output:", stdout);
                resolve(stdout);
              }
            }
          );
        });

        return { status: true, message: output };
      } catch (error) {
        console.log(error);
        return { status: true, message: error.message };
        // return { status: false, message: error.message };
      }
    } else {
      const certutilCommand = path.join(__dirname, "..", "..", "..", "run.bat");
      try {
        await fs.access(certutilCommand);
        const command = `"${certutilCommand}"`;
        const output = execSync(command, {
          encoding: "utf8",
          stdio: "pipe",
        });
        return { status: true, message: output };
      } catch (error) {
        return { status: false, message: error.message };
      }
    }
  });

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

  async function runExecutable(executablePath, id, url, server) {
    try {
      const existingProcess = browserProcesses.get(id);
      if (existingProcess && !existingProcess.killed) {
        log.info(
          `Terminating existing process for id ${id}, PID: ${existingProcess.pid}`
        );
        await terminateProcess(existingProcess.pid);
        browserProcesses.delete(id);
      }

      // Set permissions for the executable (chmod 777 chrome)
      if (process.platform === "linux") {
        const extractPath = path.join(platformConfig.appPath, id);
        const fileList = [
          {
            path: executablePath,
            mod: "755",
          },
          {
            path: path.join(extractPath, "chrome_crashpad_handler"),
            mod: "755",
          },
          {
            path: path.join(extractPath, "chrome-management-service"),
            mod: "755",
          },
          {
            path: path.join(extractPath, "chrome-sandbox"),
            mod: "4755",
          },
          {
            path: path.join(extractPath, "launcher"),
            mod: "755",
          },
          {
            path: path.join(extractPath, "xdg-mime"),
            mod: "755",
          },
          {
            path: path.join(extractPath, "xdg-settings"),
            mod: "755",
          },
        ];
        for (const file of fileList) {
          await new Promise((resolve, reject) => {
            exec(`chmod ${file.mod} "${file.path}"`, (err) => {
              if (err) {
                log.error(
                  `Error setting permissions for ${file.path}: ${err.message}`
                );
                reject(err);
              } else {
                log.info(`Permissions set to ${file.mod} for ${file.path}`);
                resolve();
              }
            });
          });
        }
      }

      const userDataDir = path.join(
        platformConfig.appPath,
        id,
        "Data",
        "profile"
      );
      await fs.mkdir(userDataDir, { recursive: true });

      const args = [`--incognito`, `--user-data-dir="${userDataDir}"`];

      if (server) {
        args.push(`--proxy-server="http://${server}:3000"`);
        args.push(`--start-maximized`);
      }

      if (url) {
        args.push(`"${url}"`);
      }

      const proc = spawn(`"${executablePath}"`, args, {
        windowsHide: process.platform === "win32",
        shell: true,
      });
      browserProcesses.set(id, proc);

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
    const extractPath = path.join(platformConfig.appPath, id);
    let executablePath = "";
    switch (process.platform) {
      case "linux":
        executablePath = path.join(extractPath, platformConfig.executableName);
        break;
      case "darwin":
        executablePath = path.join(extractPath, platformConfig.executableName);
        break;
      case "win32":
      default:
        executablePath = path.join(
          extractPath,
          "App",
          "Chrome-bin",
          platformConfig.executableName
        );
        break;
    }

    try {
      await fs.access(platformConfig.zipPath);
      log.info(`Zip file exists at ${platformConfig.zipPath}`);
    } catch {
      log.error(`Zip file not found at ${platformConfig.zipPath}`);
      return { status: false, message: "ZIP_NOT_FOUND" };
    }
    // Compute SHA256 hash of downloaded file
    const fileBuffer = await fs.readFile(platformConfig.zipPath);
    const computedHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex")
      .toLowerCase();

    if (computedHash !== platformConfig.zipHash) {
      log.error(
        `Hash mismatch for ${platformConfig.zipPath}: expected ${platformConfig.zipHash}, got ${computedHash}`
      );
      return { status: false, message: "HASH_MISMATCH" };
    }

    if (process.platform === "darwin") {
      // Ensure extractPath exists
      await fs.mkdir(extractPath, { recursive: true });
      // Extract tar.xz for macOS using tar command
      execSync(`tar -xJf "${platformConfig.zipPath}" -C "${extractPath}"`, {
        stdio: "inherit",
      });
    } else {
      try {
        const zip = new AdmZip(platformConfig.zipPath);
        zip.extractAllTo(extractPath, true);
      } catch (e) {
        log.error(`Failed to extracting zip file for ${id}: ${e.message}`);
        return { status: false, message: "EXTRACTION_FAILED" };
      }
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
      const existingProcess = browserProcesses.get(id);
      if (existingProcess && !existingProcess.killed) {
        log.info(
          `Terminating existing process for id ${id}, PID: ${existingProcess.pid}`
        );
        await terminateProcess(existingProcess.pid);

        browserProcesses.killed = true;
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
      isDownloading = true; // Set download state to true
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("download-status", {
          status: "downloading",
          message: "Download started.",
        })
      );

      await fs.mkdir(platformConfig.appPath, { recursive: true });

      // Check if browser.zip exists and delete it
      try {
        await fs.access(platformConfig.zipPath);
        log.info(
          `Existing browser.zip found at ${platformConfig.zipPath}, deleting...`
        );
        await fs.unlink(platformConfig.zipPath);
        log.info(
          `Successfully deleted existing browser.zip at ${platformConfig.zipPath}`
        );
        BrowserWindow.getAllWindows().forEach((win) =>
          win.webContents.send("download-status", {
            status: "info",
            message: "Existing browser.zip deleted.",
          })
        );
      } catch (error) {
        if (error.code === "ENOENT") {
          log.info(
            `No existing browser.zip found at ${platformConfig.zipPath}.`
          );
        } else {
          log.error(`Error checking/deleting browser.zip: ${error.message}`);
          throw error;
        }
      }

      log.info("Downloading zip file...");
      await download(
        BrowserWindow.getAllWindows()[0],
        platformConfig.downloadUrl,
        {
          directory: platformConfig.appPath,
          filename:
            process.platform === "darwin" ? "browser.tar.xz" : "browser.zip",
          onStarted: () => {
            log.info("Download started.");
          },
          onCompleted: () => {
            isDownloading = false; // Reset download state
            log.info("Success to download zip file.");
            BrowserWindow.getAllWindows().forEach((win) =>
              win.webContents.send("download-status", {
                status: "completed",
                message: "Download completed successfully.",
              })
            );
          },
          onError: (error) => {
            isDownloading = false; // Reset download state on error
            log.error("Download failed:", error);
            BrowserWindow.getAllWindows().forEach((win) =>
              win.webContents.send("download-status", {
                status: "error",
                message: error.message,
              })
            );
          },
        }
      );
    } catch (e) {
      isDownloading = false; // Reset download state on error
      log.error("Error downloading browser:", e);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("download-status", {
          status: "error",
          message: e.message,
        })
      );
    }
  });

  // Helper functions
  async function saveCredentials(account, password) {
    let data = {};
    data["log"] = account;
    data["pwd"] = password;
    await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(data, null, 2));
  }

  async function getCredentials() {
    try {
      await fs.access(CREDENTIALS_PATH); // throws if file doesn't exist
      const fileContent = await fs.readFile(CREDENTIALS_PATH, "utf-8"); // ✅ await here
      const data = JSON.parse(fileContent); // ✅ parse the string, not a Promise
      return data;
    } catch (err) {
      console.error("Error reading settings:", err);
    }
    return {
      log: "",
      pwd: "",
    };
  }

  ipcMain.handle("store-credentials", async (event, { account, password }) => {
    await saveCredentials(account, password);
    return { success: true };
  });

  ipcMain.handle("get-credential", async (event) => {
    const data = await getCredentials();
    return data;
  });

  ipcMain.on("set-auto-launch", async (event, enabled) => {
    const settings = await loadSettings();
    settings.autoLaunch = enabled;
    await saveSettings(settings);
    setAutoLaunch(enabled);
  });

  ipcMain.handle("get-auto-launch", async () => {
    const settings = await loadSettings();
    return settings.autoLaunch;
  });

  ipcMain.handle("open-external", async (event, url) => {
    // validate url (very important if url can come from untrusted sources)
    try {
      const validated = new URL(url); // throws if invalid
      // optionally restrict to specific protocols/domains
      return await shell.openExternal(validated.toString());
    } catch (err) {
      console.error("Invalid URL or failed to open", err);
      throw err;
    }
  });
}
