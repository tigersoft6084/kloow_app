const { contextBridge, ipcRenderer } = require("electron");
const { session } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setCookie: async (cookie) => {
    await session.defaultSession.cookies.set(cookie);
  },
  getCookies: async (options) => {
    return await session.defaultSession.cookies.get(options);
  },
  clearCookies: async (options) => {
    await session.defaultSession.clearStorageData(options);
  },
  // Expose update status and version APIs
  setTitle: (title) => ipcRenderer.send("set-title", title),
  onUpdateStatus: (callback) => ipcRenderer.on("update-status", callback),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppName: () => ipcRenderer.invoke("get-app-name"),
  restartAndUpdate: () => ipcRenderer.send("restart-and-update"),
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
});
