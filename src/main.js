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
const fsNP = require("fs");
const path = require("path");
const { exec, spawn, execSync } = require("child_process");
const log = require("electron-log");
const sudo = require("sudo-prompt");
const os = require("os");
const { SHA1 } = require("crypto-js");
const semver = require("semver");
const packageJson = require("../package.json");
const fp = require("find-process");
const find = typeof fp === "function" ? fp : fp.default;
// Sanitize productName for NuGet package ID and executable name
const sanitizedAppName = packageJson.productName
  .replace(/\s+/g, "")
  .toLowerCase();


app.setAppUserModelId(`com.${sanitizedAppName}.app`);
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
let mainWindow = null;
let tray = null;
const browserProcesses = new Map();
let isDownloading = false; // Track download state

const CREDENTIALS_PATH = path.join(app.getPath("userData"), "credential.json");
const settingsFilePath = path.join(app.getPath("userData"), "settings.json");

const MANIFEST_JSON = {
  "manifest_version": 3,
  "name": "Global Header Injector",
  "version": "1.0.0",
  "permissions": ["declarativeNetRequest"],
  "host_permissions": ["<all_urls>"],
  "declarative_net_request": {
    "rule_resources": [
      { "id": "ruleset_1", "enabled": true, "path": "rules.json" }
    ]
  }
}

const RULES_JSON = [
  {
    "id": 1,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        {
          "header": "Seocromom-Authorization",
          "operation": "set",
          "value": ""
        }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": [
        "main_frame",
        "sub_frame",
        "stylesheet",
        "script",
        "image",
        "font",
        "object",
        "xmlhttprequest",
        "ping",
        "csp_report",
        "media",
        "websocket",
        "webtransport",
        "webbundle",
        "other"
      ]
    }
  }
]

// Platform-specific configurations
const config = {
  win32: {
    downloadUrl: "https://www.kloow.com/download",
    zipHash: "16e94c87d46680428cfaa8594cb73af526684f11087ea985334594c7eadc9f51",
    iconFile: "logo.ico",
    executableName: "GoogleChromePortable.exe",
    appPath: path.join(app.getPath("userData"), "Browser", app.getVersion()),
    zipPath: path.join(
      path.join(app.getPath("userData"), "Browser", app.getVersion()),
      "browser.zip"
    ),
  },
  linux: {
    downloadUrl: "https://www.kloow.com/download_linux",
    zipHash: "eff97e60595176b7403373df14a046da60ffed3950196ba57479a9c20a87a7b5",
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

      const feedUrl = `${process.env.RELEASE_SERVER_URL
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
          message: "Please wait for the download to finish before closing the app.",
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
          `security find-certificate -a -p /Library/Keychains/System.keychain | grep "MIIFYTCCA0mgAwIBAgIUHc92kSgRc8s69CqCPcHaweNZEwgwDQYJKoZIhvcNAQEL"`,
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
          "certutil -store Root 75358677431cebdf2a7f3b23dd765305f7037a1d",
          {
            encoding: "utf8",
            stdio: "pipe",
          }
        );
        if (output.includes("75358677431cebdf2a7f3b23dd765305f7037a1d")) {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
  });

  ipcMain.handle("check-cert-trusted", () => {
    if (process.platform === "darwin") {
      console.log("Checking if Kloow Root CA is trusted...");
      try {
        const checkTrustStatus = execSync(
          `security verify-cert -c /Applications/Kloow.app/Contents/Resources/cert.crt`,
          { encoding: "utf8", stdio: "pipe" }
        );
        console.log("Trust status output:", checkTrustStatus);
        if (!checkTrustStatus || checkTrustStatus.indexOf("certificate verification successful") === -1) {
          console.log("Certificate is not trusted.");
          return false;
        }
      } catch (err) {
        console.error("Error checking trust status:", err);
        // ignore dialog errors and continue to certificate check
        return false;
      }
    }
    console.log("Certificate is trusted.");
    return true;
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
            (error, stdout) => {
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

  ipcMain.handle("mark-cert-trusted", async () => {
    execSync('open -a "Keychain Access"', { stdio: "ignore" });
    return { status: true, message: "Keychain Access opened." };
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

  ipcMain.on("restart-and-update", () => {
    app.isQuitting = true;
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.on("close-app", () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.on("set-title", (event, title) =>
    mainWindow.setTitle(`${app.getName()} ${app.getVersion()} - ${title}`)
  );

  async function runExecutable(executablePath, id, url, server, extensionPath) {
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
          // {
          //   path: path.join(extractPath, "chrome-management-service"),
          //   mod: "755",
          // },
          {
            path: path.join(extractPath, "chrome_sandbox"),
            mod: "4755",
          },
          // {
          //   path: path.join(extractPath, "launcher"),
          //   mod: "755",
          // },
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

      const args = [
        // `--incognito`,
        `--user-data-dir="${userDataDir}"`
      ];

      if (extensionPath) {
        args.push(`--disable-extensions-except="${extensionPath}"`);
        args.push(`--load-extension="${extensionPath}"`);
      }

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

  // Download CRX via Google's update service (unofficial but common pattern). :contentReference[oaicite:5]{index=5}
  async function downloadCrx(destPath, extensionId) {
    const url =
      "https://clients2.google.com/service/update2/crx" +
      `?response=redirect&prodversion=137.0.0.0` +
      "&acceptformat=crx2,crx3" +
      `&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) throw new Error(`CRX download failed: ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buf);
  }

  function crxToZipBuffer(crxBuf) {
    // CRX2/CRX3 header stripping → ZIP payload.
    // CRX header starts with "Cr24". :contentReference[oaicite:6]{index=6}
    if (crxBuf.slice(0, 4).toString("ascii") !== "Cr24") {
      throw new Error("Not a CRX file (missing Cr24 magic)");
    }
    const version = crxBuf.readUInt32LE(4);

    if (version === 2) {
      // [magic(4)][ver(4)][pubKeyLen(4)][sigLen(4)] then pubKey+sig then zip
      const pubKeyLen = crxBuf.readUInt32LE(8);
      const sigLen = crxBuf.readUInt32LE(12);
      const zipStart = 16 + pubKeyLen + sigLen;
      return crxBuf.slice(zipStart);
    }

    if (version === 3) {
      // [magic(4)][ver(4)][headerSize(4)] then header then zip
      const headerSize = crxBuf.readUInt32LE(8);
      const zipStart = 12 + headerSize;
      return crxBuf.slice(zipStart);
    }

    throw new Error(`Unsupported CRX version: ${version}`);
  }

  async function downloadExtension(extensionId) {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "kloow-ext-"));
    const crxPath = path.join(workDir, "kloow-ext.crx");
    const zipPath = path.join(workDir, "kloow-ext.zip");
    const extensionPath = path.join(workDir, extensionId);

    await downloadCrx(crxPath, extensionId);

    const crxBuf = await fs.readFile(crxPath);
    const zipBuf = crxToZipBuffer(crxBuf);
    await fs.writeFile(zipPath, zipBuf);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extensionPath, true);

    return extensionPath;
  }

  async function makeDNR(authToken) {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "kloow-dnr-"));
    const manifestPath = path.join(workDir, "manifest.json");
    const rulesPath = path.join(workDir, "rules.json");
    const manifest = JSON.stringify(MANIFEST_JSON, null, 2);
    let realRulesJson = RULES_JSON;
    realRulesJson[0].action.requestHeaders[0].value = authToken;
    const rules = JSON.stringify(realRulesJson, null, 2);

    await fs.writeFile(manifestPath, manifest);
    await fs.writeFile(rulesPath, rules);

    return workDir;
  }

  ipcMain.handle("run-browser", async (event, id, url, server, extensionId) => {
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
          // "App",
          // "Chrome-bin",
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
        if (["EBUSY", "EPERM", "EACCES"].includes(e.code)) {
          try {
            const chromeProcesses = await find("name", "chrome", true);
            let killed = 0;
            for (const p of chromeProcesses) {
              const cmd = (p.cmd || "").toLowerCase();
              if (cmd.includes(extractPath.toLowerCase())) {
                process.kill(p.pid);
                killed++;
              }
            }

            const portableChromeProcesses = await find("name", "GoogleChromePortable", true);
            for (const p of portableChromeProcesses) {
              const cmd = (p.cmd || "").toLowerCase();
              if (cmd.includes(extractPath.toLowerCase())) {
                process.kill(p.pid);
                killed++;
              }
            }

            console.info(`Killed ${killed} processes`);

            const zip = new AdmZip(platformConfig.zipPath);
            zip.extractAllTo(extractPath, true);
          } catch (error) {
            log.error(`Failed to extracting zip file for ${id}: ${error.message}`);
            return { status: false, message: "EXTRACTION_FAILED" };
          }
        } else {
          log.error(`Failed to extracting zip file for ${id}: ${e.message}`);
          return { status: false, message: "EXTRACTION_FAILED" };
        }
      }
    }

    let extensionPath = extensionId ? await downloadExtension(extensionId) : null;
    const authToken = url ? url.split("?")[1] : "";
    if (authToken) {
      const dnrPath = await makeDNR(authToken);
      if (extensionPath) {
        extensionPath = `${extensionPath},${dnrPath}`;
      } else {
        extensionPath = dnrPath;
      }
    }

    try {
      await fs.access(executablePath);
      await runExecutable(executablePath, id, url, server, extensionPath);
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
                message: "Download complete.",
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

  ipcMain.handle("get-credential", async () => {
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

  function safeExec(cmd) {
    try {
      return execSync(cmd, { encoding: "utf-8" }).trim();
    } catch {
      return null;
    }
  }

  function exists(path) {
    return fsNP.existsSync(path);
  }

  function getVersions() {
    const platform = os.platform();

    const result = {
      os: platform,
      seoSpider: null,
      logAnalyser: null
    };

    // -----------------------------------------
    // WINDOWS
    // -----------------------------------------
    if (platform === "win32") {
      const getWinVersion = (name) => {
        const cmd = `powershell "(Get-ChildItem HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall, HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall | Get-ItemProperty | Where-Object { $_.DisplayName -like '${name}*' }).DisplayVersion"`;
        return safeExec(cmd) || null;
      };

      result.seoSpider = getWinVersion("Screaming Frog SEO Spider");
      result.logAnalyser = getWinVersion("Screaming Frog Log File Analyser");
      return result;
    }

    // -----------------------------------------
    // macOS (Intel + Apple Silicon)
    // -----------------------------------------
    if (platform === "darwin") {
      const getMacVersion = (appName) => {
        const plist = `/Applications/${appName}.app/Contents/Info.plist`;
        if (!exists(plist)) return null;

        const cmd = `defaults read "${plist}" CFBundleShortVersionString`;
        return safeExec(cmd) || null;
      };

      result.seoSpider = getMacVersion("Screaming Frog SEO Spider");
      result.logAnalyser = getMacVersion("Screaming Frog Log File Analyser");

      return result;
    }

    // -----------------------------------------
    // LINUX (Ubuntu/Debian + Fedora/RHEL)
    // -----------------------------------------
    if (platform === "linux") {
      // -------------------------
      // Ubuntu / Debian (dpkg)
      // -------------------------
      const getDebVersion = (pkg) => {
        const cmd = `dpkg -s ${pkg} 2>/dev/null | grep '^Version:' | awk '{print $2}'`;
        return safeExec(cmd);
      };

      let seo = getDebVersion("screamingfrogseospider");
      let log = getDebVersion("screamingfroglogfileanalyser");

      // -------------------------
      // Fedora / RHEL / CentOS (rpm)
      // -------------------------
      if (!seo) {
        seo = safeExec(`rpm -q --qf "%{VERSION}" screamingfrogseospider 2>/dev/null`);
      }
      if (!log) {
        log = safeExec(`rpm -q --qf "%{VERSION}" screamingfroglogfileanalyser 2>/dev/null`);
      }

      // -------------------------
      // Fallback: Manual /opt installation (tar.gz)
      // -------------------------
      if (!seo && exists("/opt/screamingfrog-seo-spider/ScreamingFrogSEOSpider")) {
        seo = safeExec("/opt/screamingfrog-seo-spider/ScreamingFrogSEOSpider --version");
      }
      if (!log && exists("/opt/screamingfrog-log-file-analyser/ScreamingFrogLogFileAnalyser")) {
        log = safeExec("/opt/screamingfrog-log-file-analyser/ScreamingFrogLogFileAnalyser --version");
      }

      result.seoSpider = seo || null;
      result.logAnalyser = log || null;

      return result;
    }

    // -----------------------------------------
    // Unsupported platform
    // -----------------------------------------
    return {
      os: platform,
      seoSpider: null,
      logAnalyser: null,
      error: "Your operating system is not supported."
    };
  }

  ipcMain.handle("get-sf-version", async () => {
    const versionInfo = getVersions();
    return versionInfo;
  });

  async function safeReplace(oldPath, newPath) {
    // Use sudo-based copy on POSIX systems, with extra steps on macOS to clear flags/xattrs
    if (process.platform === "linux" || process.platform === "darwin") {
      // Build a robust command sequence:
      // - clear immutable flag (chflags nouchg) if present
      // - clear extended attributes (xattr -c) to avoid quarantine issues on macOS
      // - copy the file, force overwrite
      // - ensure reasonable permissions
      const cmds = [
        `chflags -R nouchg "${oldPath}" 2>/dev/null || true`,
        `xattr -c "${oldPath}" 2>/dev/null || true`,
        `xattr -c "${newPath}" 2>/dev/null || true`,
        `cp -f "${newPath}" "${oldPath}"`,
        `chmod 644 "${oldPath}" 2>/dev/null || true`
      ];
      const command = cmds.join(" && ");
      console.log(command);
      try {
        await new Promise((resolve, reject) => {
          sudo.exec(command, { name: "Kloow" }, (error, stdout) => {
            if (error) {
              console.error("safeReplace error:", error);
              reject(error);
            } else {
              resolve(stdout);
            }
          });
        });

        return true;
      } catch (error) {
        console.error("safeReplace primary copy failed, attempting fallback:", error);

        // Fallback: try using 'install' which may behave better for atomic replace
        try {
          const fallbackCmd = `install -m 644 "${newPath}" "${oldPath}"`;
          await new Promise((resolve, reject) => {
            sudo.exec(fallbackCmd, { name: "Kloow" }, (err, stdout) => {
              if (err) {
                console.error("safeReplace fallback error:", err);
                reject(err);
              } else {
                resolve(stdout);
              }
            });
          });
          return true;
        } catch (fallbackErr) {
          console.error("safeReplace fallback also failed:", fallbackErr);
          return false;
        }
      }
    } else {
      // const certutilCommand = path.join(__dirname, "..", "..", "..", "sf.bat");
      try {
        // await fs.access(certutilCommand);
        // const command = `"${certutilCommand}" "${oldPath}" "${newPath}"`;
        // const _ = execSync(command, {
        //   encoding: "utf8",
        //   stdio: "pipe",
        // });
        const _ = await new Promise((resolve, reject) => {
          sudo.exec(
            `copy /Y "${newPath}" "${oldPath}"`,
            { name: "Kloow" },
            (error, stdout) => {
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

        return true;
      } catch (error) {
        console.error("safeReplace windows/batch failed:", error);
        return false;
      }
    }
  }

  function findSEOSpiderJar() {
    const p = process.platform;

    if (p === "win32") {
      const dirs = [
        "C:\\Program Files\\Screaming Frog SEO Spider",
        "C:\\Program Files (x86)\\Screaming Frog SEO Spider"
      ];
      for (const d of dirs) {
        const jar = path.join(d, "ScreamingFrogSEOSpider.jar");
        if (exists(jar)) return jar;
      }
    }

    if (p === "darwin") {
      const jar = "/Applications/Screaming Frog SEO Spider.app/Contents/Java/ScreamingFrogSEOSpider.jar";
      if (exists(jar)) return jar;
    }

    if (p === "linux") {
      const candidates = [
        "/usr/share/screamingfrogseospider/ScreamingFrogSEOSpider.jar",
        "/opt/ScreamingFrogSEOSpider/ScreamingFrogSEOSpider.jar"
      ];
      for (const jar of candidates) if (exists(jar)) return jar;
    }

    return null;
  }

  function findLogAnalyserJar() {
    const p = process.platform;

    if (p === "win32") {
      const dirs = [
        "C:\\Program Files\\Screaming Frog Log File Analyser",
        "C:\\Program Files (x86)\\Screaming Frog Log File Analyser"
      ];
      for (const d of dirs) {
        const jar = path.join(d, "ScreamingFrogLogFileAnalyser.jar");
        if (exists(jar)) return jar;
      }
    }

    if (p === "darwin") {
      const jar = "/Applications/Screaming Frog Log File Analyser.app/Contents/Java/ScreamingFrogLogFileAnalyser.jar";
      if (exists(jar)) return jar;
    }

    if (p === "linux") {
      const candidates = [
        "/usr/share/screamingfroglogfileanalyser/ScreamingFrogLogFileAnalyser.jar",
        "/opt/ScreamingFrogLogFileAnalyser/ScreamingFrogLogFileAnalyser.jar"
      ];
      for (const jar of candidates) if (exists(jar)) return jar;
    }

    return null;
  }

  // ---------------- MAIN UPDATE FUNCTION ----------------
  async function replaceJar(mainWindow, name, findJarFn, downloadURL) {
    console.log(`\n🔍 Locating ${name}...`);

    const jarPath = findJarFn();
    if (!jarPath) {
      console.log(`❌ ${name} not installed.`);
      return false;
    }

    console.log("📍 JAR found at:", jarPath);

    // download to temporary file
    const tmpDest = path.join(os.tmpdir(), `${name}-update.jar`);

    console.log("⬇️ Downloading updated JAR from:", downloadURL);

    isDownloading = true;
    const dl = await download(mainWindow, downloadURL, {
      directory: os.tmpdir(),
      filename: `${name}-update.jar`,
      overwrite: true
    });

    console.log("📁 Downloaded to:", dl.getSavePath());
    isDownloading = false;

    console.log("🔁 Replacing file...");
    const replaced = await safeReplace(jarPath, tmpDest);

    if (replaced) {
      console.log(`✅ ${name} successfully updated!`);
    }

    return replaced;
  }

  ipcMain.handle("activate-sf-seo-spider", async () => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      let os = process.platform;
      if (os === "darwin") {
        os = `darwin${process.arch}`;
      }
      const downloadURL = {
        "win32": "https://www.kloow.com/download-sfss?os=windows",
        "linux": "https://www.kloow.com/download-sfss?os=linux",
        "darwinx64": "https://www.kloow.com/download-sfss?os=mac_intel",
        "darwinarm64": "https://www.kloow.com/download-sfss?os=mac_arm"
      }[os];
      return await replaceJar(mainWindow, "ScreamingFrogSEOSpider", findSEOSpiderJar, downloadURL);
    } catch (error) {
      console.log("Failed to download SEO Spider activate file:", error);
      return false;
    }
  });

  ipcMain.handle("activate-sf-log-file-analyser", async () => {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      let os = process.platform;
      if (os === "darwin") {
        os = `darwin${process.arch}`;
      }
      const downloadURL = {
        "win32": "https://www.kloow.com/download-sfla?os=windows",
        "linux": "https://www.kloow.com/download-sfla?os=linux",
        "darwinx64": "https://www.kloow.com/download-sfla?os=mac_intel",
        "darwinarm64": "https://www.kloow.com/download-sfla?os=mac_arm"
      }[os];
      return await replaceJar(mainWindow, "ScreamingFrogLogFileAnalyser", findLogAnalyserJar, downloadURL);
    } catch (error) {
      console.log("Failed to download Log File Analyser activate file:", error);
      return false;
    }
  });

  async function writeScreamingFrogLicense(usernameLine, licenseKeyLine, name) {
    try {
      // prefer app.getPath('home') (Electron aware) but fallback to os.homedir()
      const home = (app && typeof app.getPath === 'function') ? app.getPath('home') : os.homedir();

      // directory name required by user
      const sfDirName = {
        "sfss": ".ScreamingFrogSEOSpider",
        "sfla": ".ScreamingFrogLogfileAnalyser"
      }[name];
      const dir = path.join(home, sfDirName);

      // choose filename (you can change to e.g. 'license' if needed)
      const filename = 'licence.txt';
      const filePath = path.join(dir, filename);

      // make sure directory exists
      await fs.mkdir(dir, { recursive: true });

      // prepare contents exactly as requested: username\nlicense_key (no extra trailing newline)
      const content = `${usernameLine}\n${licenseKeyLine}`;

      // write file -- set mode 0600 on POSIX to restrict access (Windows ignores mode)
      await fs.writeFile(filePath, content, { mode: 0o600 });

      return true;
    } catch (err) {
      console.error(`Failed to create`, err);
      return false;
    }
  }

  function licenseSF(name) {
    const base_string = {
      "sfss": [..."F2sM2kCet8vxNtC0Pupk- 41a5paIIpF8zbm_8"].reverse().join(""),
      "sfla": [..."q-GN-Xjz mtV2PEKnU8SzblaS0REq4Xzu9iJbm"].reverse().join("")
    }[name];

    const delta_days = {
      "sfss": 365 + 15,
      "sfla": 365 + 16
    }[name];
    const now = new Date();
    now.setHours(20, 0, 0, 0);

    const future = new Date(now.getTime() + delta_days * 24 * 60 * 60 * 1000);
    const timestamp = Math.floor(future.getTime() / 1000);

    const username = "Marketing_Hub_Enterprise";

    const sha1 = SHA1(`${username}${timestamp}${base_string}`).toString();
    const license_key = `${sha1.substring(0, 10).toUpperCase()}-${timestamp}-${sha1.slice(-10).toUpperCase()}`;
    return writeScreamingFrogLicense(username, license_key, name);
  }

  ipcMain.handle("license-sfss", async () => {
    return licenseSF("sfss");
  });

  ipcMain.handle("license-sfla", async () => {
    return licenseSF("sfla");
  });

  ipcMain.handle("check-update", async (event, remote) => {
    const localVersion = app.getVersion();
    const platform = process.platform;

    try {
      if (semver.gt(remote.version, localVersion)) {
        // For macOS, use architecture-specific URL (darwin-x64 or darwin-arm64)
        const downloadUrl = remote.downloadUrls[platform];

        return {
          updateAvailable: true,
          latestVersion: remote.version,
          downloadUrl: downloadUrl
        };
      } else {
        return {
          updateAvailable: false,
        };
      }
    } catch (error) {
      log.error("Error checking for updates:", error);
      return {
        updateAvailable: false,
        error: error.message,
      };
    }
  });

  ipcMain.handle("download-and-update", async (event, downloadUrl) => {
    try {
      const platform = process.platform;
      const tmpDir = require("os").tmpdir();

      // Determine file extension based on platform
      let ext = "";
      let filename = "";
      if (platform === "win32") {
        ext = ".msi";
        filename = `kloow-update-${Date.now()}${ext}`;
      } else if (platform === "darwin") {
        ext = ".dmg";
        filename = `kloow-update-${Date.now()}${ext}`;
      } else if (platform === "linux") {
        ext = ".deb";
        filename = `kloow-update-${Date.now()}${ext}`;
      }

      const tmpDest = path.join(tmpDir, filename);

      isDownloading = true;
      const windows = BrowserWindow.getAllWindows();

      // Notify all windows that download is starting
      windows.forEach((win) =>
        win.webContents.send("update-download-status", {
          status: "downloading",
          message: "Update download started.",
          percent: 0,
        })
      );

      log.info("⬇️ Downloading update from:", downloadUrl);

      await download(windows[0], downloadUrl, {
        directory: tmpDir,
        filename: filename,
        overwrite: true,
        onStarted: () => {
          log.info("Update download started.");
        },
        onProgress: (percent) => {
          windows.forEach((win) =>
            win.webContents.send("update-download-status", {
              status: "downloading",
              message: `Downloading update: ${Math.round(percent * 100)}%`,
              percent: Math.round(percent * 100),
            })
          );
        },
        onCompleted: (file) => {
          isDownloading = false;
          const installerPath = tmpDest;
          log.info("Update download completed:", installerPath);
          windows.forEach((win) =>
            win.webContents.send("update-download-status", {
              status: "completed",
              message: "Update downloaded successfully. Applying update...",
              percent: 100,
            })
          );

          // Install the update based on platform
          log.info("Starting update installer for", platform, "...", installerPath);

          try {
            if (platform === "win32") {
              // Windows: install update, then relaunch app after installer exits.
              log.info("Launching Windows MSI installer with relaunch.");
              const installerCommand =
                `"msiexec.exe" /i "${installerPath}" /passive REBOOT=ReallySuppress ` +
                `&& timeout /t 2 /nobreak >nul ` +
                `&& start "" "${process.execPath}"`;

              const child = spawn(
                "cmd.exe",
                ["/d", "/s", "/c", installerCommand],
                {
                  detached: true,
                  stdio: "ignore",
                  windowsHide: true,
                }
              );

              child.unref();
            } else if (platform === "darwin") {
              // macOS: open the DMG file (mounts it and shows Finder)
              log.info("Opening macOS DMG installer");
              exec(`open "${installerPath}"`);
            } else if (platform === "linux") {
              log.info("Installing .deb package");
              try {
                const command = `dpkg -i "${installerPath}"`;

                // install .deb via apt (non-interactive)
                sudo.exec(command, { name: "Kloow" }, (error, stdout, stderr) => {
                  if (error) {
                    log.error("Install failed:", error);
                    return;
                  }
                  log.info("Install output:", stdout);
                });

                log.info("Installation complete");
              } catch (err) {
                log.error("Failed to install deb:", err);
              }
            }

            // Quit the app after a short delay to allow installer to start
            setTimeout(() => {
              log.info("Quitting app to apply update");
              app.isQuitting = true;
              app.quit();
            }, 1500);
          } catch (installError) {
            log.error("Error launching installer:", installError);
            isDownloading = false;
            windows.forEach((win) =>
              win.webContents.send("update-download-status", {
                status: "error",
                message: "Couldn't start the installer.",
              })
            );
          }
        },
        onError: (error) => {
          isDownloading = false;
          log.error("Download error:", error.message);
          windows.forEach((win) =>
            win.webContents.send("update-download-status", {
              status: "error",
              message: "Download failed. Please try again.",
            })
          );
        },
      });
    } catch (e) {
      isDownloading = false;
      log.error("Error downloading update:", e);
      BrowserWindow.getAllWindows().forEach((win) =>
        win.webContents.send("update-download-status", {
          status: "error",
          message: e.message,
        })
      );
    }
  });
}
