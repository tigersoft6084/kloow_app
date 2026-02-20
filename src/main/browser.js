const { BrowserWindow } = require("electron");
const { download } = require("electron-dl");
const AdmZip = require("adm-zip");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const { exec, spawn, execSync } = require("child_process");
const os = require("os");
const fp = require("find-process");
const find = typeof fp === "function" ? fp : fp.default;

const {
  buildDnrManifest,
  buildDnrRules,
  buildBrowserGuardManifest,
  buildBrowserGuardRules,
  buildBrowserGuardContentScript,
  buildBrowserGuardBackgroundScript,
} = require("./config");
const { broadcast } = require("./shared/broadcast");

async function terminateProcess(pid, log) {
  return new Promise((resolve, reject) => {
    const command =
      process.platform === "win32"
        ? `taskkill /PID ${pid} /F /T`
        : `kill -9 $(ps -o pid= --ppid ${pid} --forest | awk '{print $1}' ; echo ${pid})`;
    exec(command, (err) => {
      if (err) {
        log.error(`Error terminating process with PID ${pid}: ${err.message}`);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function createBrowserService({ platformConfig, state, log }) {
  function dedupeTempDirs(tempDirs = []) {
    return Array.from(new Set(tempDirs.filter(Boolean)));
  }

  async function cleanupTempDirs(tempDirs, id) {
    for (const tempDir of dedupeTempDirs(tempDirs)) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
        log.info(`Removed temp directory for id ${id}: ${tempDir}`);
      } catch (error) {
        log.warn(`Failed to remove temp directory for id ${id}: ${tempDir} (${error.message})`);
      }
    }
  }

  async function cleanupProcessTempDirs(proc, id) {
    if (!proc || proc.kloowTempDirsCleaned) {
      return;
    }
    proc.kloowTempDirsCleaned = true;
    await cleanupTempDirs(proc.kloowTempDirs || [], id);
    proc.kloowTempDirs = [];
  }

  async function runExecutable(executablePath, id, url, server, extensionPath, tempDirs = []) {
    let proc = null;
    try {
      const existingProcess = state.browserProcesses.get(id);
      if (existingProcess && !existingProcess.killed) {
        log.info(`Terminating existing process for id ${id}, PID: ${existingProcess.pid}`);
        await terminateProcess(existingProcess.pid, log);
        await cleanupProcessTempDirs(existingProcess, id);
        state.browserProcesses.delete(id);
      }

      if (process.platform === "linux") {
        const extractPath = path.join(platformConfig.appPath, id);
        const fileList = [
          { path: executablePath, mod: "755" },
          { path: path.join(extractPath, "chrome_crashpad_handler"), mod: "755" },
          { path: path.join(extractPath, "chrome_sandbox"), mod: "4755" },
          { path: path.join(extractPath, "xdg-mime"), mod: "755" },
          { path: path.join(extractPath, "xdg-settings"), mod: "755" },
        ];
        for (const file of fileList) {
          await new Promise((resolve, reject) => {
            exec(`chmod ${file.mod} "${file.path}"`, (err) => {
              if (err) {
                log.error(`Error setting permissions for ${file.path}: ${err.message}`);
                reject(err);
              } else {
                log.info(`Permissions set to ${file.mod} for ${file.path}`);
                resolve();
              }
            });
          });
        }
      }

      const userDataDir = path.join(platformConfig.appPath, id, "Data", "profile");
      await fs.mkdir(userDataDir, { recursive: true });

      const args = [`--user-data-dir="${userDataDir}"`, "--no-default-browser-check"];

      if (extensionPath) {
        args.push(`--disable-extensions-except="${extensionPath}"`);
        args.push(`--load-extension="${extensionPath}"`);
      }

      if (server) {
        args.push(`--proxy-server="http://${server}:3000"`);
        args.push("--start-maximized");
      }

      if (url) {
        args.push(`"${url}"`);
      }

      proc = spawn(`"${executablePath}"`, args, {
        windowsHide: process.platform === "win32",
        shell: true,
      });
      proc.kloowTempDirs = dedupeTempDirs(tempDirs);
      proc.kloowTempDirsCleaned = false;
      state.browserProcesses.set(id, proc);

      proc.on("spawn", () => {
        log.info(`Process spawned successfully for id ${id}, PID: ${proc.pid}`);
        broadcast("browser-status", { id, running: true });
      });

      proc.on("exit", (code, signal) => {
        log.info(`Browser process for id ${id} exited with code ${code}, signal: ${signal}`);
        if (state.browserProcesses.get(id) === proc) {
          state.browserProcesses.delete(id);
          broadcast("browser-status", { id, running: false });
        }
        void cleanupProcessTempDirs(proc, id);
      });

      proc.on("error", (err) => {
        log.error(`Browser process error for id ${id}: ${err.message}`);
        if (state.browserProcesses.get(id) === proc) {
          state.browserProcesses.delete(id);
          broadcast("browser-status", { id, running: false });
        }
        void cleanupProcessTempDirs(proc, id);
      });
    } catch (error) {
      log.error(`Error running executable for id ${id}: ${error.message}`);
      if (proc) {
        await cleanupProcessTempDirs(proc, id);
        if (state.browserProcesses.get(id) === proc) {
          state.browserProcesses.delete(id);
        }
      } else {
        await cleanupTempDirs(tempDirs, id);
      }
      broadcast("browser-status", { id, running: false });
      throw error;
    }
  }

  async function downloadCrx(destPath, extensionId) {
    const url =
      "https://clients2.google.com/service/update2/crx" +
      "?response=redirect&prodversion=137.0.0.0" +
      "&acceptformat=crx2,crx3" +
      `&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;

    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      throw new Error(`CRX download failed: ${res.status} ${res.statusText}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destPath, buf);
  }

  function crxToZipBuffer(crxBuf) {
    if (crxBuf.slice(0, 4).toString("ascii") !== "Cr24") {
      throw new Error("Not a CRX file (missing Cr24 magic)");
    }
    const version = crxBuf.readUInt32LE(4);

    if (version === 2) {
      const pubKeyLen = crxBuf.readUInt32LE(8);
      const sigLen = crxBuf.readUInt32LE(12);
      const zipStart = 16 + pubKeyLen + sigLen;
      return crxBuf.slice(zipStart);
    }

    if (version === 3) {
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

  async function makeDnr(authToken) {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "kloow-dnr-"));
    const manifestPath = path.join(workDir, "manifest.json");
    const rulesPath = path.join(workDir, "rules.json");
    const manifest = JSON.stringify(buildDnrManifest(), null, 2);
    const rules = JSON.stringify(buildDnrRules(authToken), null, 2);

    await fs.writeFile(manifestPath, manifest);
    await fs.writeFile(rulesPath, rules);

    return workDir;
  }

  async function makeBrowserGuardExtension() {
    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "kloow-guard-"));
    const extensionPath = path.join(workDir, "kloow-browser-guard");
    const manifestPath = path.join(extensionPath, "manifest.json");
    const rulesPath = path.join(extensionPath, "internal-rules.json");
    const contentScriptPath = path.join(extensionPath, "content.js");
    const backgroundScriptPath = path.join(extensionPath, "background.js");

    const manifest = JSON.stringify(buildBrowserGuardManifest(), null, 2);
    const rules = JSON.stringify(buildBrowserGuardRules(), null, 2);
    const contentScript = buildBrowserGuardContentScript();
    const backgroundScript = buildBrowserGuardBackgroundScript();

    await fs.mkdir(extensionPath, { recursive: true });
    await Promise.all([
      fs.writeFile(manifestPath, manifest),
      fs.writeFile(rulesPath, rules),
      fs.writeFile(contentScriptPath, contentScript),
      fs.writeFile(backgroundScriptPath, backgroundScript),
    ]);

    return { extensionPath, tempDir: workDir };
  }

  function getExecutablePath(id) {
    const extractPath = path.join(platformConfig.appPath, id);
    switch (process.platform) {
      case "linux":
      case "darwin":
        return path.join(extractPath, platformConfig.executableName);
      case "win32":
      default:
        return path.join(extractPath, platformConfig.executableName);
    }
  }

  async function runBrowser(event, id, url, server, extensionId) {
    const extractPath = path.join(platformConfig.appPath, id);
    const executablePath = getExecutablePath(id);

    try {
      await fs.access(platformConfig.zipPath);
      log.info(`Zip file exists at ${platformConfig.zipPath}`);
    } catch {
      log.error(`Zip file not found at ${platformConfig.zipPath}`);
      return { status: false, message: "ZIP_NOT_FOUND" };
    }

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
      await fs.mkdir(extractPath, { recursive: true });
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

            const portableChromeProcesses = await find(
              "name",
              "GoogleChromePortable",
              true
            );
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

    const authToken = url ? url.split("?")[1] : "";
    const tempDirs = [];
    const extensionPaths = [];

    try {
      const browserGuard = await makeBrowserGuardExtension();
      tempDirs.push(browserGuard.tempDir);
      extensionPaths.push(browserGuard.extensionPath);

      if (extensionId) {
        const downloadedExtensionPath = await downloadExtension(extensionId);
        tempDirs.push(path.dirname(downloadedExtensionPath));
        extensionPaths.push(downloadedExtensionPath);
      }
      if (authToken) {
        const dnrPath = await makeDnr(authToken);
        tempDirs.push(dnrPath);
        extensionPaths.push(dnrPath);
      }

      await fs.access(executablePath);
      const extensionPath = extensionPaths.length > 0 ? extensionPaths.join(",") : null;
      await runExecutable(executablePath, id, url, server, extensionPath, tempDirs);
      return { status: true, message: "" };
    } catch (e) {
      await cleanupTempDirs(tempDirs, id);
      log.error(`run-browser failed for id ${id}: ${e.message}`);
      return { status: false, message: e.message };
    }
  }

  async function stopBrowser(event, id) {
    try {
      const existingProcess = state.browserProcesses.get(id);
      if (existingProcess && !existingProcess.killed) {
        log.info(`Terminating existing process for id ${id}, PID: ${existingProcess.pid}`);
        await terminateProcess(existingProcess.pid, log);
        await cleanupProcessTempDirs(existingProcess, id);
        if (state.browserProcesses.get(id) === existingProcess) {
          state.browserProcesses.delete(id);
        }
        broadcast("browser-status", { id, running: false });
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
  }

  async function downloadBrowser() {
    try {
      state.isDownloading = true;
      broadcast("download-status", {
        status: "downloading",
        message: "Download started.",
      });

      await fs.mkdir(platformConfig.appPath, { recursive: true });

      try {
        await fs.access(platformConfig.zipPath);
        log.info(`Existing browser.zip found at ${platformConfig.zipPath}, deleting...`);
        await fs.unlink(platformConfig.zipPath);
        log.info(`Successfully deleted existing browser.zip at ${platformConfig.zipPath}`);
        broadcast("download-status", {
          status: "info",
          message: "Existing browser.zip deleted.",
        });
      } catch (error) {
        if (error.code === "ENOENT") {
          log.info(`No existing browser.zip found at ${platformConfig.zipPath}.`);
        } else {
          log.error(`Error checking/deleting browser.zip: ${error.message}`);
          throw error;
        }
      }

      log.info("Downloading zip file...");
      await download(BrowserWindow.getAllWindows()[0], platformConfig.downloadUrl, {
        directory: platformConfig.appPath,
        filename: process.platform === "darwin" ? "browser.tar.xz" : "browser.zip",
        onStarted: () => {
          log.info("Download started.");
        },
        onCompleted: () => {
          state.isDownloading = false;
          log.info("Success to download zip file.");
          broadcast("download-status", {
            status: "completed",
            message: "Download complete.",
          });
        },
        onError: (error) => {
          state.isDownloading = false;
          log.error("Download failed:", error);
          broadcast("download-status", {
            status: "error",
            message: error.message,
          });
        },
      });
    } catch (e) {
      state.isDownloading = false;
      log.error("Error downloading browser:", e);
      broadcast("download-status", {
        status: "error",
        message: e.message,
      });
    }
  }

  async function stopAllBrowsers() {
    const stopTasks = [];
    for (const [id, browserProcess] of state.browserProcesses) {
      stopTasks.push(
        (async () => {
          if (browserProcess && !browserProcess.killed) {
            try {
              await terminateProcess(browserProcess.pid, log);
            } catch (error) {
              log.error(`Error terminating process for id ${id}: ${error.message}`);
            }
          }
          await cleanupProcessTempDirs(browserProcess, id);
        })()
      );
    }
    await Promise.all(stopTasks);
    state.browserProcesses.clear();
  }

  function registerHandlers(ipcMain) {
    ipcMain.handle("run-browser", runBrowser);
    ipcMain.handle("stop-browser", stopBrowser);
    ipcMain.handle("download-browser", downloadBrowser);
  }

  return {
    registerHandlers,
    stopAllBrowsers,
    isDownloadInProgress: () => state.isDownloading,
  };
}

module.exports = {
  createBrowserService,
};
