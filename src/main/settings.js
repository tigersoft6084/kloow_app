const fs = require("fs").promises;
const path = require("path");

function createSettingsService(app) {
  const settingsFilePath = path.join(app.getPath("userData"), "settings.json");

  async function loadSettings() {
    try {
      await fs.access(settingsFilePath);
      const fileContent = await fs.readFile(settingsFilePath, "utf-8");
      const data = JSON.parse(fileContent);
      if (typeof data.autoLaunch === "boolean") {
        return data;
      }
      return { autoLaunch: false };
    } catch (err) {
      console.error("Error reading settings:", err);
      return { autoLaunch: false };
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

  return {
    loadSettings,
    saveSettings,
    setAutoLaunch,
  };
}

function createCredentialsService(app) {
  const credentialsPath = path.join(app.getPath("userData"), "credential.json");

  async function saveCredentials(account, password) {
    const data = { log: account, pwd: password };
    await fs.writeFile(credentialsPath, JSON.stringify(data, null, 2));
  }

  async function getCredentials() {
    try {
      await fs.access(credentialsPath);
      const fileContent = await fs.readFile(credentialsPath, "utf-8");
      const data = JSON.parse(fileContent);
      return data;
    } catch (err) {
      console.error("Error reading settings:", err);
    }
    return {
      log: "",
      pwd: "",
    };
  }

  return {
    saveCredentials,
    getCredentials,
  };
}

function registerSettingsHandlers(ipcMain, settingsService, credentialsService) {
  ipcMain.handle("store-credentials", async (event, { account, password }) => {
    await credentialsService.saveCredentials(account, password);
    return { success: true };
  });

  ipcMain.handle("get-credential", async () => {
    return credentialsService.getCredentials();
  });

  ipcMain.on("set-auto-launch", async (event, enabled) => {
    const settings = await settingsService.loadSettings();
    settings.autoLaunch = enabled;
    await settingsService.saveSettings(settings);
    settingsService.setAutoLaunch(enabled);
  });

  ipcMain.handle("get-auto-launch", async () => {
    const settings = await settingsService.loadSettings();
    return settings.autoLaunch;
  });
}

module.exports = {
  createSettingsService,
  createCredentialsService,
  registerSettingsHandlers,
};
