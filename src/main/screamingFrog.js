const path = require("path");
const os = require("os");
const fs = require("fs").promises;
const fsNP = require("fs");
const { execSync } = require("child_process");
const sudo = require("sudo-prompt");
const { SHA1 } = require("crypto-js");
const { download } = require("electron-dl");
const { BrowserWindow } = require("electron");

function safeExec(cmd) {
  try {
    return execSync(cmd, { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function exists(filePath) {
  return fsNP.existsSync(filePath);
}

function getVersions() {
  const platform = os.platform();

  const result = {
    os: platform,
    seoSpider: null,
    logAnalyser: null,
  };

  if (platform === "win32") {
    const getWinVersion = (name) => {
      const cmd =
        `powershell "(Get-ChildItem HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall, ` +
        `HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall | Get-ItemProperty | ` +
        `Where-Object { $_.DisplayName -like '${name}*' }).DisplayVersion"`;
      return safeExec(cmd) || null;
    };

    result.seoSpider = getWinVersion("Screaming Frog SEO Spider");
    result.logAnalyser = getWinVersion("Screaming Frog Log File Analyser");
    return result;
  }

  if (platform === "darwin") {
    const getMacVersion = (appName) => {
      const plist = `/Applications/${appName}.app/Contents/Info.plist`;
      if (!exists(plist)) {
        return null;
      }
      const cmd = `defaults read "${plist}" CFBundleShortVersionString`;
      return safeExec(cmd) || null;
    };

    result.seoSpider = getMacVersion("Screaming Frog SEO Spider");
    result.logAnalyser = getMacVersion("Screaming Frog Log File Analyser");
    return result;
  }

  if (platform === "linux") {
    const getDebVersion = (pkg) => {
      const cmd = `dpkg -s ${pkg} 2>/dev/null | grep '^Version:' | awk '{print $2}'`;
      return safeExec(cmd);
    };

    let seo = getDebVersion("screamingfrogseospider");
    let log = getDebVersion("screamingfroglogfileanalyser");

    if (!seo) {
      seo = safeExec('rpm -q --qf "%{VERSION}" screamingfrogseospider 2>/dev/null');
    }
    if (!log) {
      log = safeExec('rpm -q --qf "%{VERSION}" screamingfroglogfileanalyser 2>/dev/null');
    }

    if (!seo && exists("/opt/screamingfrog-seo-spider/ScreamingFrogSEOSpider")) {
      seo = safeExec("/opt/screamingfrog-seo-spider/ScreamingFrogSEOSpider --version");
    }
    if (
      !log &&
      exists("/opt/screamingfrog-log-file-analyser/ScreamingFrogLogFileAnalyser")
    ) {
      log = safeExec(
        "/opt/screamingfrog-log-file-analyser/ScreamingFrogLogFileAnalyser --version"
      );
    }

    result.seoSpider = seo || null;
    result.logAnalyser = log || null;
    return result;
  }

  return {
    os: platform,
    seoSpider: null,
    logAnalyser: null,
    error: "Your operating system is not supported.",
  };
}

async function safeReplace(oldPath, newPath) {
  if (process.platform === "linux" || process.platform === "darwin") {
    const cmds = [
      `chflags -R nouchg "${oldPath}" 2>/dev/null || true`,
      `xattr -c "${oldPath}" 2>/dev/null || true`,
      `xattr -c "${newPath}" 2>/dev/null || true`,
      `cp -f "${newPath}" "${oldPath}"`,
      `chmod 644 "${oldPath}" 2>/dev/null || true`,
    ];
    const command = cmds.join(" && ");
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
  }

  try {
    await new Promise((resolve, reject) => {
      sudo.exec(`copy /Y "${newPath}" "${oldPath}"`, { name: "Kloow" }, (error, stdout) => {
        if (error) {
          console.error("Error:", error);
          reject(error);
        } else {
          console.log("Output:", stdout);
          resolve(stdout);
        }
      });
    });
    return true;
  } catch (error) {
    console.error("safeReplace windows/batch failed:", error);
    return false;
  }
}

function findSEOSpiderJar() {
  const p = process.platform;

  if (p === "win32") {
    const dirs = [
      "C:\\Program Files\\Screaming Frog SEO Spider",
      "C:\\Program Files (x86)\\Screaming Frog SEO Spider",
    ];
    for (const d of dirs) {
      const jar = path.join(d, "ScreamingFrogSEOSpider.jar");
      if (exists(jar)) {
        return jar;
      }
    }
  }

  if (p === "darwin") {
    const jar = "/Applications/Screaming Frog SEO Spider.app/Contents/Java/ScreamingFrogSEOSpider.jar";
    if (exists(jar)) {
      return jar;
    }
  }

  if (p === "linux") {
    const candidates = [
      "/usr/share/screamingfrogseospider/ScreamingFrogSEOSpider.jar",
      "/opt/ScreamingFrogSEOSpider/ScreamingFrogSEOSpider.jar",
    ];
    for (const jar of candidates) {
      if (exists(jar)) {
        return jar;
      }
    }
  }

  return null;
}

function findLogAnalyserJar() {
  const p = process.platform;

  if (p === "win32") {
    const dirs = [
      "C:\\Program Files\\Screaming Frog Log File Analyser",
      "C:\\Program Files (x86)\\Screaming Frog Log File Analyser",
    ];
    for (const d of dirs) {
      const jar = path.join(d, "ScreamingFrogLogFileAnalyser.jar");
      if (exists(jar)) {
        return jar;
      }
    }
  }

  if (p === "darwin") {
    const jar =
      "/Applications/Screaming Frog Log File Analyser.app/Contents/Java/ScreamingFrogLogFileAnalyser.jar";
    if (exists(jar)) {
      return jar;
    }
  }

  if (p === "linux") {
    const candidates = [
      "/usr/share/screamingfroglogfileanalyser/ScreamingFrogLogFileAnalyser.jar",
      "/opt/ScreamingFrogLogFileAnalyser/ScreamingFrogLogFileAnalyser.jar",
    ];
    for (const jar of candidates) {
      if (exists(jar)) {
        return jar;
      }
    }
  }

  return null;
}

async function replaceJar(mainWindow, name, findJarFn, downloadURL, state) {
  const jarPath = findJarFn();
  if (!jarPath) {
    console.log(`${name} not installed.`);
    return false;
  }

  const tmpDest = path.join(os.tmpdir(), `${name}-update.jar`);
  state.isDownloading = true;

  await download(mainWindow, downloadURL, {
    directory: os.tmpdir(),
    filename: `${name}-update.jar`,
    overwrite: true,
  });

  state.isDownloading = false;
  return safeReplace(jarPath, tmpDest);
}

async function writeScreamingFrogLicense(app, usernameLine, licenseKeyLine, name) {
  try {
    const home =
      app && typeof app.getPath === "function" ? app.getPath("home") : os.homedir();
    const sfDirName = {
      sfss: ".ScreamingFrogSEOSpider",
      sfla: ".ScreamingFrogLogfileAnalyser",
    }[name];

    const dir = path.join(home, sfDirName);
    const filePath = path.join(dir, "licence.txt");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, `${usernameLine}\n${licenseKeyLine}`, { mode: 0o600 });
    return true;
  } catch (err) {
    console.error("Failed to create", err);
    return false;
  }
}

function createLicense(app, name) {
  const baseString = {
    sfss: [..."F2sM2kCet8vxNtC0Pupk- 41a5paIIpF8zbm_8"].reverse().join(""),
    sfla: [..."q-GN-Xjz mtV2PEKnU8SzblaS0REq4Xzu9iJbm"].reverse().join(""),
  }[name];

  const deltaDays = {
    sfss: 365 + 15,
    sfla: 365 + 16,
  }[name];

  const now = new Date();
  now.setHours(20, 0, 0, 0);
  const future = new Date(now.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  const timestamp = Math.floor(future.getTime() / 1000);
  const username = "Marketing_Hub_Enterprise";
  const sha1 = SHA1(`${username}${timestamp}${baseString}`).toString();
  const licenseKey =
    `${sha1.substring(0, 10).toUpperCase()}-` +
    `${timestamp}-` +
    `${sha1.slice(-10).toUpperCase()}`;

  return writeScreamingFrogLicense(app, username, licenseKey, name);
}

function createScreamingFrogService({ app, state }) {
  async function activateSeoSpider() {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      let platform = process.platform;
      if (platform === "darwin") {
        platform = `darwin${process.arch}`;
      }
      const downloadURL = {
        win32: "https://www.kloow.com/download-sfss?os=windows",
        linux: "https://www.kloow.com/download-sfss?os=linux",
        darwinx64: "https://www.kloow.com/download-sfss?os=mac_intel",
        darwinarm64: "https://www.kloow.com/download-sfss?os=mac_arm",
      }[platform];
      return replaceJar(mainWindow, "ScreamingFrogSEOSpider", findSEOSpiderJar, downloadURL, state);
    } catch (error) {
      console.log("Failed to download SEO Spider activate file:", error);
      return false;
    }
  }

  async function activateLogAnalyser() {
    try {
      const mainWindow = BrowserWindow.getAllWindows()[0];
      let platform = process.platform;
      if (platform === "darwin") {
        platform = `darwin${process.arch}`;
      }
      const downloadURL = {
        win32: "https://www.kloow.com/download-sfla?os=windows",
        linux: "https://www.kloow.com/download-sfla?os=linux",
        darwinx64: "https://www.kloow.com/download-sfla?os=mac_intel",
        darwinarm64: "https://www.kloow.com/download-sfla?os=mac_arm",
      }[platform];
      return replaceJar(
        mainWindow,
        "ScreamingFrogLogFileAnalyser",
        findLogAnalyserJar,
        downloadURL,
        state
      );
    } catch (error) {
      console.log("Failed to download Log File Analyser activate file:", error);
      return false;
    }
  }

  function registerHandlers(ipcMain) {
    ipcMain.handle("get-sf-version", async () => {
      return getVersions();
    });

    ipcMain.handle("activate-sf-seo-spider", activateSeoSpider);
    ipcMain.handle("activate-sf-log-file-analyser", activateLogAnalyser);

    ipcMain.handle("license-sfss", async () => createLicense(app, "sfss"));
    ipcMain.handle("license-sfla", async () => createLicense(app, "sfla"));
  }

  return {
    registerHandlers,
  };
}

module.exports = {
  createScreamingFrogService,
};
