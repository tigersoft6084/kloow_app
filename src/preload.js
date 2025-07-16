const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setCookie: (cookie) => ipcRenderer.invoke("set-cookie", cookie),
  getCookies: (options) => ipcRenderer.invoke("get-cookies", options),
  clearCookies: (options) => ipcRenderer.invoke("clear-cookies", options),
  setTitle: (title) => ipcRenderer.send("set-title", title),
  onUpdateStatus: (callback) => ipcRenderer.on("update-status", callback),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppName: () => ipcRenderer.invoke("get-app-name"),
  installCert: () => ipcRenderer.invoke("install-cert"),
  checkCert: () => ipcRenderer.invoke("check-cert"),
  restartAndUpdate: () => ipcRenderer.send("restart-and-update"),
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadBrowser: () => ipcRenderer.invoke("download-browser"),
  runBrowser: (id, url, server) =>
    ipcRenderer.invoke("run-browser", id, url, server),
  stopBrowser: (id) => ipcRenderer.invoke("stop-browser", id),
  onBrowserStatus: (callback) => ipcRenderer.on("browser-status", callback),
});
