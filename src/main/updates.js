const os = require("os");
const path = require("path");
const { spawn, exec } = require("child_process");
const semver = require("semver");
const sudo = require("sudo-prompt");
const { download } = require("electron-dl");
const { BrowserWindow } = require("electron");
const {
  ersPlatform,
} = require("@electron-forge/publisher-electron-release-server");
const { broadcast } = require("./shared/broadcast");

function createUpdatesService({ app, autoUpdater, state, log }) {
  function setupAutoUpdater() {
    const feedUrl =
      `${process.env.RELEASE_SERVER_URL}/update/flavor/${app.getName()}/` +
      `${ersPlatform(process.platform, process.arch)}/${app.getVersion()}`;

    autoUpdater.setFeedURL({ url: feedUrl });
    autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
      broadcast("update-status", {
        status: "update-downloaded",
        message: process.platform === "win32" ? releaseNotes : releaseName,
      });
    });

    autoUpdater.on("error", (err) => {
      log.error("Error in auto-updater:", err);
      broadcast("update-status", {
        status: "error",
        message: err.message,
      });
    });
  }

  async function checkUpdate(event, remote) {
    const localVersion = app.getVersion();
    const platform = process.platform;

    try {
      if (semver.gt(remote.version, localVersion)) {
        return {
          updateAvailable: true,
          latestVersion: remote.version,
          downloadUrl: remote.downloadUrls[platform],
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

  async function downloadAndUpdate(event, downloadUrl) {
    try {
      const platform = process.platform;
      const tmpDir = os.tmpdir();

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
      const windows = BrowserWindow.getAllWindows();

      state.isDownloading = true;
      windows.forEach((win) =>
        win.webContents.send("update-download-status", {
          status: "downloading",
          message: "Update download started.",
          percent: 0,
        })
      );

      log.info("Downloading update from:", downloadUrl);

      await download(windows[0], downloadUrl, {
        directory: tmpDir,
        filename,
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
        onCompleted: () => {
          state.isDownloading = false;
          const installerPath = tmpDest;
          log.info("Update download completed:", installerPath);
          windows.forEach((win) =>
            win.webContents.send("update-download-status", {
              status: "completed",
              message: "Update downloaded successfully. Applying update...",
              percent: 100,
            })
          );

          log.info("Starting update installer for", platform, "...", installerPath);

          try {
            if (platform === "win32") {
              log.info("Launching Windows MSI installer with relaunch.");
              const installerCommand =
                `"msiexec.exe" /i "${installerPath}" /passive REBOOT=ReallySuppress ` +
                `&& timeout /t 2 /nobreak >nul ` +
                `&& start "" "${process.execPath}"`;

              const child = spawn("cmd.exe", ["/d", "/s", "/c", installerCommand], {
                detached: true,
                stdio: "ignore",
                windowsHide: true,
              });
              child.unref();
            } else if (platform === "darwin") {
              log.info("Opening macOS DMG installer");
              exec(`open "${installerPath}"`);
            } else if (platform === "linux") {
              log.info("Installing .deb package");
              try {
                const command = `dpkg -i "${installerPath}"`;
                sudo.exec(command, { name: "Kloow" }, (error, stdout) => {
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

            setTimeout(() => {
              log.info("Quitting app to apply update");
              app.isQuitting = true;
              app.quit();
            }, 1500);
          } catch (installError) {
            log.error("Error launching installer:", installError);
            state.isDownloading = false;
            windows.forEach((win) =>
              win.webContents.send("update-download-status", {
                status: "error",
                message: "Couldn't start the installer.",
              })
            );
          }
        },
        onError: (error) => {
          state.isDownloading = false;
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
      state.isDownloading = false;
      log.error("Error downloading update:", e);
      broadcast("update-download-status", {
        status: "error",
        message: e.message,
      });
    }
  }

  function registerHandlers(ipcMain) {
    ipcMain.on("check-for-updates", () => {
      if (process.argv.includes("--squirrel-firstrun")) {
        log.info("First run after install, skipping update check.");
        broadcast("update-status", {
          status: "check-for-updates",
          message: "No updates checked on first run.",
        });
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
