const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  setTitle: (title) => ipcRenderer.send("set-title", title),
  onUpdateStatus: (callback) => ipcRenderer.on("update-status", callback),
  onDownloadStatus: (callback) => ipcRenderer.on("download-status", callback),
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getAppName: () => ipcRenderer.invoke("get-app-name"),
  installCert: () => ipcRenderer.invoke("install-cert"),
  checkCert: () => ipcRenderer.invoke("check-cert"),
  checkCertTrusted: () => ipcRenderer.invoke("check-cert-trusted"),
  markCertTrusted: () => ipcRenderer.invoke("mark-cert-trusted"),
  restartAndUpdate: () => ipcRenderer.send("restart-and-update"),
  closeApp: () => ipcRenderer.send("close-app"),
  checkForUpdates: () => ipcRenderer.send("check-for-updates"),
  downloadBrowser: () => ipcRenderer.invoke("download-browser"),
  runBrowser: (id, url, server) =>
    ipcRenderer.invoke("run-browser", id, url, server),
  stopBrowser: (id) => ipcRenderer.invoke("stop-browser", id),
  onBrowserStatus: (callback) => ipcRenderer.on("browser-status", callback),
  credentialStore: (account, password) =>
    ipcRenderer.invoke("store-credentials", { account, password }),
  credentialGet: () => ipcRenderer.invoke("get-credential"),
  setAutoLaunch: (enabled) => ipcRenderer.send("set-auto-launch", enabled),
  getAutoLaunch: () => ipcRenderer.invoke("get-auto-launch"),
  openExternal: (url) => ipcRenderer.invoke("open-external", url),
  getSFVersions: () => ipcRenderer.invoke("get-sf-version"),
  activateSfSeoSpider: () => ipcRenderer.invoke("activate-sf-seo-spider"),
  activateSfLogAnalyser: () => ipcRenderer.invoke("activate-sf-log-file-analyser"),
  licenseSFSS: () => ipcRenderer.invoke("license-sfss"),
  licenseSFLA: () => ipcRenderer.invoke("license-sfla"),
});
