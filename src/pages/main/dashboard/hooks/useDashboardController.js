import { useCallback, useEffect, useMemo, useState } from "react";

import useMain from "../../../../hooks/useMain";
import useAuth from "../../../../hooks/useAuth";
import useSnackbar from "../../../../hooks/useSnackbar";

import {
  BROWSER_MODAL_MESSAGES,
  DEFAULT_BROWSER_MODAL_KEY,
  PAGE_COPY,
  Tabs,
} from "../constants";
import {
  buildInitialRunningStatus,
  buildInitialServerSelection,
  filterApps,
  getStatusForApp as resolveStatusForApp,
  mapHealthStatuses,
  sortApps,
  statusColor as resolveStatusColor,
} from "../helpers";

const DEFAULT_SF = {
  seo_spider: null,
  log_analyser: null,
};

const DEFAULT_SF_INFO = {
  os: "",
  seoSpider: null,
  logAnalyser: null,
  error: null,
};

const DEFAULT_UPGRADE_URL = "https://www.kloow.com";

function safeReadUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function useDashboardController() {
  const {
    checkHealth,
    frogStatus,
    getAppList,
    appList,
    searchPattern,
    setLog,
    setSearchPattern,
    setFavorite,
  } = useMain();

  const { logout } = useAuth();
  const { successMessage, errorMessage } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [runningStatus, setRunningStatus] = useState({});
  const [tryRunningStatus, setTryRunningStatus] = useState([]);
  const [browserModalOpen, setBrowserModalOpen] = useState(false);
  const [browserModalCode, setBrowserModalCode] = useState(
    DEFAULT_BROWSER_MODAL_KEY
  );

  const [sortOrder, setSortOrder] = useState("none");
  const [selectedTab, setSelectedTab] = useState(Tabs.Applications);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [addFavoriteAnchor, setAddFavoriteAnchor] = useState(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [sf, setSf] = useState(DEFAULT_SF);
  const [sfInfo, setSfInfo] = useState(DEFAULT_SF_INFO);
  const [isSfssDownloading, setIsSfssDownloading] = useState(false);
  const [isSflaDownloading, setIsSflaDownloading] = useState(false);

  const [startup, setStartup] = useState(false);

  const [update, setUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateDownloadStatus, setUpdateDownloadStatus] = useState("");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateNotificationShown, setUpdateNotificationShown] = useState(false);
  const [isUpdateDownloading, setIsUpdateDownloading] = useState(false);

  const [serverSelection, setServerSelection] = useState({});
  const [serverHealth, setServerHealth] = useState({});
  const [appStatus, setAppStatus] = useState({});
  const [serverMenuAnchor, setServerMenuAnchor] = useState(null);
  const [serverMenuAppId, setServerMenuAppId] = useState(null);

  const profileMenuOpen = Boolean(profileMenuAnchor);
  const addFavoriteMenuOpen = Boolean(addFavoriteAnchor);
  const sortMenuOpen = Boolean(sortMenuAnchor);
  const pageCopy = PAGE_COPY[selectedTab] || PAGE_COPY[Tabs.Applications];

  const user = useMemo(() => safeReadUser(), []);

  const sortedApps = useMemo(
    () => sortApps(appList, selectedTab, sortOrder, Tabs),
    [appList, selectedTab, sortOrder]
  );
  const filteredApps = useMemo(
    () => filterApps(sortedApps, searchPattern, selectedTab, Tabs),
    [sortedApps, searchPattern, selectedTab]
  );

  const getStatusForApp = useCallback(
    (id) => resolveStatusForApp(appStatus, serverHealth, id),
    [appStatus, serverHealth]
  );
  const statusColor = useCallback((status) => resolveStatusColor(status), []);

  const openProfileMenu = useCallback(
    (event) => setProfileMenuAnchor(event.currentTarget),
    []
  );
  const closeProfileMenu = useCallback(() => setProfileMenuAnchor(null), []);
  const openAddFavoriteMenu = useCallback(
    (event) => setAddFavoriteAnchor(event.currentTarget),
    []
  );
  const closeAddFavoriteMenu = useCallback(() => setAddFavoriteAnchor(null), []);
  const openSortMenu = useCallback(
    (event) => setSortMenuAnchor(event.currentTarget),
    []
  );
  const closeSortMenu = useCallback(() => setSortMenuAnchor(null), []);
  const closeBrowserModal = useCallback(() => setBrowserModalOpen(false), []);
  const dismissUpdateDialog = useCallback(() => setShowUpdateDialog(false), []);
  const openServerMenu = useCallback((event, appId) => {
    setServerMenuAnchor(event.currentTarget);
    setServerMenuAppId(appId);
  }, []);
  const closeServerMenu = useCallback(() => {
    setServerMenuAnchor(null);
    setServerMenuAppId(null);
  }, []);

  const handleBrowserStatus = useCallback((event, payload = {}) => {
    const { id, running } = payload;
    if (typeof id === "undefined") return;

    setRunningStatus((prev) => {
      if (prev[id] === running) return prev;
      return { ...prev, [id]: running };
    });
  }, []);

  useEffect(() => {
    window.electronAPI.setTitle("Dashboard");
    window.electronAPI.onBrowserStatus(handleBrowserStatus);
  }, [handleBrowserStatus]);

  useEffect(() => {
    const updateHealth = async () => {
      try {
        const healthStatuses = await checkHealth(serverSelection);
        if (healthStatuses) {
          setServerHealth(healthStatuses);
          setAppStatus(mapHealthStatuses(healthStatuses));
        }
      } catch {
        // Ignore health polling failures.
      }
    };

    updateHealth();

    const interval = setInterval(updateHealth, 600000);
    return () => clearInterval(interval);
  }, [serverSelection]);

  useEffect(() => {
    const getAutoLaunch = async () => {
      const autoLaunch = await window.electronAPI.getAutoLaunch();
      setStartup(autoLaunch);
    };
    getAutoLaunch();
  }, []);

  useEffect(() => {
    const loadFrogStatus = async () => {
      const status = await frogStatus();
      setSf(status || DEFAULT_SF);
    };
    loadFrogStatus();
  }, []);

  useEffect(() => {
    const loadApps = async () => {
      const nextAppList = await getAppList();
      setServerSelection(buildInitialServerSelection(nextAppList));
      setRunningStatus(buildInitialRunningStatus(nextAppList));
      setLoading(false);
    };
    loadApps();
  }, []);

  useEffect(() => {
    const getSFVersion = async () => {
      const versions = await window.electronAPI.getSFVersions();
      setSfInfo(versions || DEFAULT_SF_INFO);
    };
    getSFVersion();
  }, []);

  useEffect(() => {
    const handleUpdateStatus = (_, response = {}) => {
      if (response.status === "update-available") {
        const version = response.version || null;
        setUpdate(true);
        setLatestVersion(version);
        setUpdateNotificationShown((shown) => {
          if (!shown) {
            setShowUpdateDialog(true);
            successMessage(
              version ? `Update available (v${version})` : "Update available"
            );
          }
          return true;
        });
        return;
      }

      if (response.status === "update-not-available") {
        setUpdate(false);
        setLatestVersion(null);
      }

      if (response.status === "update-downloaded") {
        setUpdate(false);
      }
    };

    window.electronAPI.onUpdateStatus(handleUpdateStatus);
    window.electronAPI.checkForUpdates();
  }, []);

  useEffect(() => {
    const handleUpdateDownloadStatus = (_, data = {}) => {
      setUpdateDownloading(data.status === "downloading");
      setUpdateDownloadProgress(data.percent || 0);
      setUpdateDownloadStatus(data.message || "");
    };

    window.electronAPI.onUpdateDownloadStatus(handleUpdateDownloadStatus);

    return () => {
      // IPC listeners don't have a built-in unsubscribe.
    };
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      if (selectedTab !== Tabs["Screaming Frog"]) return;

      try {
        const versions = await window.electronAPI.getSFVersions();
        setSfInfo(versions || DEFAULT_SF_INFO);
        const status = await frogStatus();
        setSf(status || DEFAULT_SF);
      } catch {
        // Ignore focus refresh failures.
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [selectedTab]);

  const downloadAndUpdate = useCallback(async () => {
    try {
      setIsUpdateDownloading(true);
      const result = await window.electronAPI.downloadAndUpdate();
      if (result?.status) {
        successMessage(
          latestVersion
            ? `Update to version ${latestVersion} started downloading`
            : "Update download started"
        );
        return;
      }
      errorMessage(result?.message || "No update available.");
    } catch {
      errorMessage("Update failed. Please try again.");
    } finally {
      setIsUpdateDownloading(false);
    }
  }, [errorMessage, latestVersion, successMessage]);

  const handleDownloadFromDialog = useCallback(async () => {
    await downloadAndUpdate();
  }, [downloadAndUpdate]);

  const run = useCallback(
    async (id, url, server, extensionId) => {
      try {
        if (runningStatus[id]) return;

        setTryRunningStatus((prev) => [...prev, id]);
        const result = await window.electronAPI.runBrowser(
          id,
          url,
          server,
          extensionId
        );

        if (!result.status) {
          if (BROWSER_MODAL_MESSAGES[result.message]) {
            setBrowserModalCode(result.message);
            setBrowserModalOpen(true);
          } else {
            errorMessage("Couldn't launch the browser. Please try again.");
          }
        } else {
          setLog(id);
        }
      } catch {
        errorMessage("Couldn't start the application. Please try again.");
      } finally {
        setTryRunningStatus((prev) => prev.filter((entry) => entry !== id));
      }
    },
    [errorMessage, runningStatus, setLog]
  );

  const stop = useCallback(
    async (id) => {
      try {
        setTryRunningStatus((prev) => [...prev, id]);
        const result = await window.electronAPI.stopBrowser(id);
        if (!result.status) {
          errorMessage(result.message);
        }
      } catch {
        errorMessage("Couldn't stop the browser. Please try again.");
      } finally {
        setTryRunningStatus((prev) => prev.filter((entry) => entry !== id));
      }
    },
    [errorMessage]
  );

  const downloadBrowser = useCallback(async () => {
    setDownloading(true);
    try {
      await window.electronAPI.downloadBrowser();
      setBrowserModalOpen(false);
    } finally {
      setDownloading(false);
    }
  }, []);

  const activateSfSeoSpider = useCallback(async () => {
    try {
      setIsSfssDownloading(true);
      const activated = await window.electronAPI.activateSfSeoSpider();
      if (!activated) {
        errorMessage("Couldn't activate Screaming Frog SEO Spider.");
        return;
      }

      const licensed = await window.electronAPI.licenseSFSS();
      if (!licensed) {
        errorMessage("Couldn't apply the Screaming Frog SEO Spider license.");
      } else {
        successMessage("Screaming Frog SEO Spider activated successfully.");
      }
    } catch (error) {
      errorMessage(error.message);
    } finally {
      setIsSfssDownloading(false);
    }
  }, [errorMessage, successMessage]);

  const activateSfLogAnalyser = useCallback(async () => {
    try {
      setIsSflaDownloading(true);
      const activated = await window.electronAPI.activateSfLogAnalyser();
      if (!activated) {
        errorMessage("Couldn't activate Screaming Frog Log File Analyser.");
        return;
      }

      const licensed = await window.electronAPI.licenseSFLA();
      if (!licensed) {
        errorMessage("Couldn't apply the Screaming Frog Log File Analyser license.");
      } else {
        successMessage("Screaming Frog Log File Analyser activated successfully.");
      }
    } catch (error) {
      errorMessage(error.message);
    } finally {
      setIsSflaDownloading(false);
    }
  }, [errorMessage, successMessage]);

  const refreshApps = useCallback(async () => {
    try {
      setLoading(true);

      const versions = await window.electronAPI.getSFVersions();
      setSfInfo(versions || DEFAULT_SF_INFO);

      const status = await frogStatus();
      setSf(status || DEFAULT_SF);

      await Promise.all(
        (appList || []).map(async (app) => {
          if (runningStatus[app.id]) {
            await window.electronAPI.stopBrowser(app.id);
          }
        })
      );

      const nextAppList = await getAppList();
      setRunningStatus(buildInitialRunningStatus(nextAppList));
      setServerSelection(buildInitialServerSelection(nextAppList));
    } catch {
      errorMessage("Couldn't refresh application list.");
    } finally {
      setLoading(false);
    }
  }, [appList, errorMessage, frogStatus, getAppList, runningStatus]);

  const selectServer = useCallback((appId, server) => {
    setServerSelection((prev) => ({ ...prev, [appId]: server }));
    closeServerMenu();
  }, [closeServerMenu]);

  const handleStartupChange = useCallback((enabled) => {
    setStartup(enabled);
    window.electronAPI.setAutoLaunch(enabled);
  }, []);

  const openUpgradePage = useCallback((domain) => {
    const target = domain ? `https://${domain}` : DEFAULT_UPGRADE_URL;
    return window.electronAPI.openExternal(target);
  }, []);

  return {
    appList,
    searchPattern,
    setSearchPattern,
    loading,
    downloading,
    browserModalOpen,
    browserModalCode,
    closeBrowserModal,
    downloadBrowser,
    runningStatus,
    tryRunningStatus,
    sortOrder,
    setSortOrder,
    selectedTab,
    setSelectedTab,
    pageTitle: pageCopy.title,
    pageDescription: pageCopy.description,
    profileMenuAnchor,
    profileMenuOpen,
    openProfileMenu,
    closeProfileMenu,
    addFavoriteAnchor,
    addFavoriteMenuOpen,
    openAddFavoriteMenu,
    closeAddFavoriteMenu,
    sortMenuAnchor,
    sortMenuOpen,
    openSortMenu,
    closeSortMenu,
    settingsOpen,
    setSettingsOpen,
    sf,
    sfInfo,
    isSfssDownloading,
    isSflaDownloading,
    startup,
    handleStartupChange,
    update,
    latestVersion,
    updateDownloading,
    updateDownloadProgress,
    updateDownloadStatus,
    showUpdateDialog,
    setShowUpdateDialog,
    dismissUpdateDialog,
    isUpdateDownloading,
    serverSelection,
    serverHealth,
    serverMenuAnchor,
    serverMenuAppId,
    openServerMenu,
    closeServerMenu,
    selectServer,
    filteredApps,
    refreshApps,
    run,
    stop,
    logout,
    setFavorite,
    getStatusForApp,
    statusColor,
    activateSfSeoSpider,
    activateSfLogAnalyser,
    downloadAndUpdate,
    handleDownloadFromDialog,
    openUpgradePage,
    user,
  };
}
