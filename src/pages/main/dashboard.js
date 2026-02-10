import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  CardMedia,
  Grid,
  Stack,
  Typography,
  Modal,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  OutlinedInput,
  Divider,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Build, FavoriteBorder, Language, Water } from "@mui/icons-material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import ScheduleIcon from "@mui/icons-material/Schedule";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import UpgradeOutlinedIcon from "@mui/icons-material/UpgradeOutlined";
import { ExpandMore, ExpandLess, Check } from "@mui/icons-material";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import ProfileIcon from "../../assets/icons/profile.png";
import LogoutIcon from "../../assets/icons/logout.png";
import SearchIcon from "../../assets/icons/search.png";
import SettingsIcon from "../../assets/icons/settings.png";
import LoginIcon from "../../assets/icons/login.png";
import RefreshIcon from "../../assets/icons/refresh.png";
import DefaultAppImage from "../../assets/images/logo.png";
import LogoWithTitle from "../../assets/images/logo_title.png";
import ScreamingFrogIcon from "../../assets/images/screaming_frog.png";
import ScreamingFrogSeoSpiderLogo from "../../assets/images/screaming_frog_seo_spider.png";
import ScreamingFrogLogAnalyserLogo from "../../assets/images/screaming_frog_log_analyser.png";

import Loader from "../../components/Loader";
import SimpleBarScroll from "../../components/SimpleBar";
import IOSSwitch from "../../components/IOSSwitch";

import useSnackbar from "../../hooks/useSnackbar";
import useMain from "../../hooks/useMain";
import useAuth from "../../hooks/useAuth";

const DownloadMessage = (
  <Typography variant="body1" textAlign="center" color="white">
    We recommend downloading updates now to
    <br /> ensure proper operation.
  </Typography>
);

const ExtractFailedMessage = (
  <Typography variant="body1" textAlign="center" color="white">
    Failed to run the browser. <br />
    Please download the browser again.
  </Typography>
);

const HashMismatchMessage = (
  <Typography variant="body1" textAlign="center" color="white">
    The browser is corrupted. <br />
    Please download the browser again.
  </Typography>
);

const Tabs = {
  Applications: 1,
  Favorites: 2,
  Recents: 3,
  "Screaming Frog": 4
};

const listItemButtonSx = {
  borderRadius: "8px",
  py: 0.1,
  px: 1,
  borderLeft: "4px solid transparent",
  "&.Mui-selected": {
    backgroundColor: "#252731",
    color: "white",
    borderLeft: "4px solid #1976d2",
  },
  "&.Mui-selected:hover": {
    backgroundColor: "#252731",
  },
  "&:hover": {
    backgroundColor: "#2C3145",
  },
  my: 0.25,
};

const listItemTextSx = {
  "& .MuiTypography-root": {
    fontSize: 14,
    color: "white",
  },
};

const listItemIconSx = { color: "white", minWidth: 32 };

const Dashboard = () => {
  const {
    getLatestInfo,
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
  const [runningStatus, setRunningStatus] = useState({}); // Map of id to boolean
  const [tryRunningStatus, setTryRunningStatus] = useState([]);
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const [message, setMessage] = useState(DownloadMessage);
  const [sortOrder, setSortOrder] = useState("none"); // none | az | za
  const [selectedTab, setSelectedTab] = useState(Tabs.Applications); // all | favorites | recents | screaming frog
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);
  const [anchorElAdd, setAnchorElAdd] = useState(null);
  const addOpen = Boolean(anchorElAdd);
  const handleOpenAdd = (e) => setAnchorElAdd(e.currentTarget);
  const handleCloseAdd = () => setAnchorElAdd(null);

  const [anchorElSort, setAnchorElSort] = useState(null);
  const sortOpen = Boolean(anchorElSort);
  const handleOpenSort = (e) => setAnchorElSort(e.currentTarget);
  const handleCloseSort = () => setAnchorElSort(null);

  const [openSetting, setOpenSetting] = useState(false);

  const [sf, setSf] = useState({
    seo_spider: null,
    log_analyser: null,
  });
  const [sfInfo, setSfInfo] = useState({
    os: "",
    seoSpider: null,
    logAnalyser: null,
    error: null,
  });

  const [isSfssDownloading, setIsSfssDownloading] = useState(false);
  const [isSflaDownloading, setIsSflaDownloading] = useState(false);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const [startup, setStartup] = useState(false);

  const [update, setUpdate] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloadProgress, setUpdateDownloadProgress] = useState(0);
  const [updateDownloadStatus, setUpdateDownloadStatus] = useState("");
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [updateNotificationShown, setUpdateNotificationShown] = useState(false);
  const [isUpdateDownloading, setIsUpdateDownloading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const getItemTitle = (item) => item.title || item.description || "";
  const getItemImg = (item) =>
    item.logoPath
      ? "https://admin.kloow.com/" + item.logoPath
      : DefaultAppImage;

  const getStatusForApp = (id) => {
    const s = appStatus?.[id];
    if (s) return s;
    const raw = serverHealth?.[id];
    if (raw === true) return "Operational";
    if (raw === false) return "Maintenance";
    return "Maintenance";
  };

  const statusColor = (status) => {
    if (!status) return "#E03E3E";
    const t = String(status).toLowerCase();
    if (t === "operational") return "#00C853"; // green
    if (t === "unstable") return "#FF9800"; // orange
    return "#E03E3E"; // maintenance red
  };

  const [serverSelection, setServerSelection] = useState({});
  const [serverHealth, setServerHealth] = useState({});
  const [appStatus, setAppStatus] = useState({}); // Map of id -> status string
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuAppId, setMenuAppId] = useState(null);

  const handleBrowserStatus = useCallback((event, { id, running }) => {
    setRunningStatus((prev) => {
      if (prev[id] === running) {
        return prev;
      }
      const newStatus = { ...prev, [id]: running };
      return newStatus;
    });
  }, []);

  useEffect(() => {
    window.electronAPI.setTitle("Dashboard");
    window.electronAPI.onBrowserStatus(handleBrowserStatus);
  }, [handleBrowserStatus]);

  useEffect(() => {
    // initial health check
    const updateHealth = async () => {
      try {
        const healthStatuses = await checkHealth(serverSelection);
        if (healthStatuses) {
          setServerHealth(healthStatuses);
          // map healthStatuses values into readable state strings
          const mapped = Object.keys(healthStatuses).reduce((acc, id) => {
            const val = healthStatuses[id];
            let statusText = "Maintenance";
            if (val === true || String(val).toLowerCase() === "operational" || String(val).toLowerCase() === "up") {
              statusText = "Operational";
            } else if (String(val).toLowerCase() === "unstable" || String(val).toLowerCase() === "slow") {
              statusText = "Unstable";
            } else {
              statusText = "Maintenance";
            }
            acc[id] = statusText;
            return acc;
          }, {});
          setAppStatus(mapped);
        }
      } catch (err) {
        // ignore
      }
    };

    updateHealth();

    // poll every 60s to get near real-time updates from admin panel
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
    frogStatus().then((status) => {
      setSf(status);
    });
  }, []);

  useEffect(() => {
    getAppList().then((appList) => {
      const initialStatus = appList.reduce((acc, app) => {
        if (app.servers) {
          setServerSelection((prev) => ({ ...prev, [app.id]: app.servers[0] }));
        }
        acc[app.id] = false;
        return acc;
      }, {});
      setRunningStatus(initialStatus);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const getSFVersion = async () => {
      const versions = await window.electronAPI.getSFVersions();
      setSfInfo(versions);
    };
    getSFVersion();
  }, []);

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const latestInfo = await getLatestInfo();
        const remote = {
          version: latestInfo.version,
          downloadUrls: {
            win32: latestInfo.downloadUrls.win32,
            darwin: latestInfo.downloadUrls.darwin,
            linux: latestInfo.downloadUrls.linux
          }
        }
        const result = await window.electronAPI.checkUpdate(remote);
        if (result.updateAvailable) {
          setUpdate(true);
          setLatestVersion(result.latestVersion);
          setDownloadUrl(result.downloadUrl);

          // Show notification and dialog only if not shown before
          if (!updateNotificationShown) {
            setShowUpdateDialog(true);
            setUpdateNotificationShown(true);
            successMessage(`Update available: v${result.latestVersion}`);
          }
        } else {
          setUpdate(false);
          setLatestVersion(null);
          setDownloadUrl(null);
        }
      } catch (error) {
        console.error("Error checking for updates - front:", error);
        // ignore errors
      }
    };
    checkForUpdates();
  }, []);

  // Listen for app update download progress
  useEffect(() => {
    const handleUpdateDownloadStatus = (data) => {
      setUpdateDownloading(data.status === "downloading");
      setUpdateDownloadProgress(data.percent || 0);
      setUpdateDownloadStatus(data.message);
    };

    window.electronAPI.onUpdateDownloadStatus(handleUpdateDownloadStatus);

    // Cleanup listener
    return () => {
      // IPC listeners don't have a built-in unsubscribe, but React will handle cleanup
    };
  }, []);

  const downloadAndUpdate = async () => {
    if (!update) return;
    try {
      setIsUpdateDownloading(true);
      await window.electronAPI.downloadAndUpdate(downloadUrl);
      successMessage(`Update to version ${latestVersion} started downloading`);
      setIsUpdateDownloading(false);
    } catch (error) {
      errorMessage(`Failed to update`);
      setIsUpdateDownloading(false);
    }
  }

  const handleDownloadFromDialog = async () => {
    await downloadAndUpdate();
    // Don't close dialog yet, let it show progress
  }

  const handleDismissUpdate = () => {
    setShowUpdateDialog(false);
  }

  // When the app regains focus, re-check Screaming Frog installation
  // but ONLY when the user is viewing the Screaming Frog tab.
  useEffect(() => {
    const onFocus = async () => {
      if (selectedTab !== Tabs["Screaming Frog"]) return;
      try {
        const versions = await window.electronAPI.getSFVersions();
        setSfInfo(versions);
        // also refresh the frogStatus flag
        frogStatus().then((status) => setSf(status));
      } catch (err) {
        // ignore errors silently
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [selectedTab, frogStatus]);

  const run = async (id, url, server, extensionId, optionalUrl) => {
    try {
      if (runningStatus[id]) {
        return;
      }
      setTryRunningStatus((prev) => [...prev, id]);
      const result = await window.electronAPI.runBrowser(id, url, server, extensionId, optionalUrl);
      if (!result.status) {
        switch (result.message) {
          case "ZIP_NOT_FOUND":
            setMessage(DownloadMessage);
            setOpen(true);
            break;
          case "EXTRACTION_FAILED":
            setMessage(ExtractFailedMessage);
            setOpen(true);
            break;
          case "HASH_MISMATCH":
            setMessage(HashMismatchMessage);
            setOpen(true);
            break;
          default:
            errorMessage(
              `Failed to run browser for id ${id}: ${result.message}`
            );
            break;
        }
      } else {
        setLog(id);
      }
      setTryRunningStatus((prev) => prev.filter((e) => e !== id));
    } catch (error) {
      errorMessage(
        `Failed to run the executable for id ${id}: ${error.message}`
      );
    }
  };

  const stop = async (id) => {
    try {
      setTryRunningStatus((prev) => [...prev, id]);
      const result = await window.electronAPI.stopBrowser(id);
      if (!result.status) {
        errorMessage(result.message);
      }
      setTryRunningStatus((prev) => prev.filter((e) => e !== id));
    } catch (error) {
      errorMessage(`Failed to stop the browser for id ${id}: ${error.message}`);
    }
  };

  const handleDownloadBrowser = async () => {
    setDownloading(true);
    await window.electronAPI.downloadBrowser();
    setOpen(false);
    setDownloading(false);
  };

  const activateSfSeoSpider = async () => {
    try {
      setIsSfssDownloading(true);
      const activated = await window.electronAPI.activateSfSeoSpider();
      if (!activated) {
        errorMessage("Failed to activate Screaming Frog SEO Spider");
        setIsSfssDownloading(false);
        return;
      }

      const licensed = await window.electronAPI.licenseSFSS();
      if (!licensed) {
        errorMessage("Failed to license Screaming Frog SEO Spider");
      } else {
        successMessage("Successfully activated Screaming Frog SEO Spider");
      }
      setIsSfssDownloading(false);
    } catch (error) {
      errorMessage(error.message);
      setIsSfssDownloading(false);
    }
  }

  const activateSfLogAnalyser = async () => {
    try {
      setIsSflaDownloading(true);
      const activated = await window.electronAPI.activateSfLogAnalyser();
      if (!activated) {
        errorMessage("Failed to activate Screaming Frog Log File Analyser");
        setIsSflaDownloading(false);
        return;
      }

      const licensed = await window.electronAPI.licenseSFLA();
      if (!licensed) {
        errorMessage("Failed to license Screaming Frog Log File Analyser");
      } else {
        successMessage("Successfully activated Screaming Frog Log File Analyser");
      }
      setIsSflaDownloading(false);
    } catch (error) {
      errorMessage(error.message);
      setIsSflaDownloading(false);
    }
  }

  const getSortedApps = () => {
    if (!Array.isArray(appList)) return [];
    if (selectedTab === Tabs.Recents) {
      return [...appList]
        .filter((app) => !!app.lastAccessed)
        .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    } else {
      if (sortOrder === "none") return appList;
      const sorted = [...appList].sort((a, b) => {
        const at = (a.title || "").toLowerCase();
        const bt = (b.title || "").toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
      return sortOrder === "az" ? sorted : sorted.reverse();
    }
  };

  const pageTitle = useMemo(() => {
    switch (selectedTab) {
      case Tabs.Applications:
        return "Application List";
      case Tabs.Favorites:
        return "Favorites";
      case Tabs.Recents:
        return "Recently Used";
      case Tabs["Screaming Frog"]:
        return "Screaming Frog";
      default:
        return "Application List";
    }
  }, [selectedTab]);

  const pageDescription = useMemo(() => {
    switch (selectedTab) {
      case Tabs.Applications:
        return "Pre-loaded, ready-to-use marketing tools for faster campaigns.";
      case Tabs.Favorites:
        return "Your most-used applications for quick access.";
      case Tabs.Recents:
        return "Applications you've launched recently.";
      case Tabs["Screaming Frog"]:
        return "The Screaming Frog SEO Spider and Log File Analyser";
      default:
        return "Pre-loaded, ready-to-use marketing tools for faster campaigns.";
    }
  }, [selectedTab]);

  return (
    <>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          background:
            "radial-gradient(30vw 30vw at 30vw 30vw, rgba(26, 66, 153, 1) 0%,  rgba(22, 23, 30, 1) 100%)",
        }}
      />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 1,
          background:
            "radial-gradient(15vw 15vw at 70vw 15vw, rgba(78, 34, 41, 1) 0%,  rgba(22, 23, 30, 1) 100%)",
          opacity: 0.5,
        }}
      />
      <Stack
        spacing={0}
        sx={{ width: "100%", zIndex: 2, maxWidth: 1447, mx: "auto" }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
          sx={{ px: 3, height: 60, color: "white" }}
        >
          <img src={LogoWithTitle} alt="logo" style={{ height: 24 }} />
          <OutlinedInput
            fullWidth
            size="small"
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            placeholder="Search applications..."
            startAdornment={
              <InputAdornment position="start">
                <img
                  src={SearchIcon}
                  alt="search"
                  style={{ width: 16, height: 16 }}
                />
              </InputAdornment>
            }
            sx={{
              color: "white",
              background: "#252731",
              borderRadius: "8px",
              height: "34px",
              "& .MuiInputBase-root": { color: "white" },
              "& .MuiInputBase-input::placeholder": {
                color: "rgba(255,255,255,1)",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#343951",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: "#343951",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#343951",
              },
              width: "476px",
              maxWidth: "100%",
            }}
          />
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Tooltip title="Reload Apps">
              <IconButton
                onClick={async () => {
                  setLoading(true);
                  const versions = await window.electronAPI.getSFVersions();
                  setSfInfo(versions);
                  frogStatus().then((status) => {
                    setSf(status);
                  });
                  await Promise.all(
                    appList.map(async (app) => {
                      if (runningStatus[app.id]) {
                        await window.electronAPI.stopBrowser(app.id);
                      }
                    })
                  );
                  getAppList().then((appList) => {
                    const initialStatus = appList.reduce((acc, app) => {
                      acc[app.id] = false;
                      return acc;
                    }, {});
                    setRunningStatus(initialStatus);
                    setLoading(false);
                  });
                }}
                sx={{ color: "white", p: 0 }}
              >
                <img
                  src={RefreshIcon}
                  alt="refresh"
                  style={{ width: 34, height: 34 }}
                />
              </IconButton>
            </Tooltip>
            <Tooltip title={update ? "Update Available" : "Account Settings"}>
              <Badge variant="dot" color="error" invisible={!update}>
                <IconButton
                  onClick={handleMenuOpen}
                  aria-controls={menuOpen ? "profile-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={menuOpen ? "true" : undefined}
                  sx={{ color: "white", p: 0 }}
                >
                  <img
                    src={ProfileIcon}
                    alt="profile"
                    style={{ width: 34, height: 34 }}
                  />
                </IconButton>
              </Badge>
            </Tooltip>
            <Tooltip title="Log Out">
              <IconButton onClick={logout} sx={{ color: "white", p: 0 }}>
                <img
                  src={LogoutIcon}
                  alt="logout"
                  style={{ width: 34, height: 34 }}
                />
              </IconButton>
            </Tooltip>
          </Stack>
          <Menu
            id="profile-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  bgcolor: "#252834",
                  color: "white",
                  border: "solid 1px #343847",
                  borderRadius: "10px",
                  mt: 1,
                  width: 234,
                },
              },
            }}
          >
            <Typography sx={{ color: "white", px: 2, py: 1 }}>
              PROFILE SETTINGS
            </Typography>
            <MenuItem
              onClick={() => {
                setOpenSetting(true);
                handleMenuClose();
              }}
              sx={{ color: 'white', '&:hover': { backgroundColor: '#1976d2' } }}
            >
              <Badge
                variant="dot"
                color="error"
                invisible={!update}
                overlap="rectangular"
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <img
                    src={SettingsIcon}
                    alt="settings"
                    style={{ width: 24, height: 24 }}
                  />
                  <Typography variant="body2">Account Settings</Typography>
                </Stack>
              </Badge>
            </MenuItem>
            <MenuItem onClick={logout} sx={{ color: 'white', '&:hover': { backgroundColor: '#1976d2' } }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <img
                  src={LoginIcon}
                  alt="logout"
                  style={{ width: 24, height: 24 }}
                />
                <Typography variant="body2">Log Out</Typography>
              </Stack>
            </MenuItem>
          </Menu>
        </Stack>
        <Stack
          direction="row"
          spacing={3}
          alignItems="center"
          sx={{ px: 3, height: 50, color: "white", bgcolor: "#252731" }}
        >
          <Typography sx={{ fontWeight: 500, color: "white", fontSize: 16 }}>
            Favorites
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            {appList
              ?.filter((app) => app?.isFavorite)
              .map((app, idx) => (
                <Box
                  key={`fav_${idx}`}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                  onClick={() => run(app.id, app.initUrl, app.servers?.[0], app.extensionId ?? null, app.optionalUrl ?? [])}
                >
                  <img
                    src={getItemImg(app)}
                    alt="fav"
                    style={{ width: 34, height: 34, objectFit: "contain" }}
                  />
                </Box>
              ))}
            {appList?.filter((app) => !app?.isFavorite).length === 0 ? null : (
              <>
                <IconButton
                  size="small"
                  onClick={handleOpenAdd}
                  sx={{
                    color: "white",
                    borderRadius: "50%",
                    backgroundColor: "rgba(51, 51, 51, 0.65)",
                    "&:hover": {
                      backgroundColor: "rgba(51, 51, 51, 0.85)", // darker on hover
                    },
                    width: 30,
                    height: 30,
                  }}
                >
                  {addOpen ? (
                    <CloseIcon sx={{ fontSize: 18 }} />
                  ) : (
                    <AddIcon sx={{ fontSize: 18 }} />
                  )}
                </IconButton>
                <Menu
                  anchorEl={anchorElAdd}
                  open={addOpen}
                  onClose={handleCloseAdd}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  slotProps={{
                    paper: {
                      sx: {
                        bgcolor: "#252834",
                        color: "white",
                        borderRadius: "8px",
                        border: "solid 1px #343847",
                        mt: 1,
                      },
                    },
                  }}
                >
                  <MenuItem sx={{ pointerEvents: "none" }}>
                    <Typography variant="body2" sx={{ color: "white" }}>
                      ADD A FAVORITE
                    </Typography>
                  </MenuItem>
                  {appList
                    ?.filter((app) => !app?.isFavorite)
                    .map((app, idx) => (
                      <MenuItem
                        key={`add_${idx}`}
                        onClick={() => {
                          setFavorite(app?.id);
                          handleCloseAdd();
                        }}
                        sx={{ color: "white", '&:hover': { backgroundColor: '#1976d2' } }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            mr: 1,
                          }}
                        >
                          <img
                            src={getItemImg(app)}
                            alt={getItemTitle(app)}
                            style={{
                              width: 24,
                              height: 24,
                              objectFit: "contain",
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: "white" }}>
                          {getItemTitle(app)}
                        </Typography>
                      </MenuItem>
                    ))}
                </Menu>
              </>
            )}
          </Stack>
        </Stack>
      </Stack>
      <Stack
        direction={"row"}
        sx={{
          height: "100vh",
          width: "100%",
          maxWidth: 1447,
          mx: "auto",
          zIndex: 2,
        }}
      >
        <Box sx={{ width: 240, height: "100vh", p: 2.5 }}>
          <List>
            {Object.keys(Tabs).map((key) => (
              <ListItem disablePadding key={key}>
                <ListItemButton
                  selected={selectedTab === Tabs[key]}
                  onClick={() => setSelectedTab(Tabs[key])}
                  sx={listItemButtonSx}
                >
                  <ListItemIcon sx={listItemIconSx}>
                    {key === "Applications" && <Language />}
                    {key === "Favorites" && <FavoriteBorder />}
                    {key === "Recents" && <ScheduleIcon />}
                    {key === "Screaming Frog" && <img src={ScreamingFrogIcon} alt="frog" style={{ width: 24, height: 24 }} />}
                  </ListItemIcon>
                  <ListItemText primary={key} sx={listItemTextSx} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ width: `calc(100% - 240px)`, flexGrow: 1, p: 0 }}>
          {loading ? (
            <Loader />
          ) : (
            <Stack
              spacing={2.5}
              sx={{ width: "100%", minHeight: `calc(100vh - 110px)` }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ height: 60, width: "100%", px: 2.5, pt: 2.5 }}
              >
                <Stack>
                  <Typography
                    variant="h5"
                    color="white"
                    sx={{ fontWeight: 500, fontSize: 20, lineHeight: "24px" }}
                  >
                    {pageTitle}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="white"
                    sx={{ fontSize: 14, lineHeight: "20px" }}
                  >
                    {pageDescription}
                  </Typography>
                </Stack>
                {selectedTab === Tabs["Screaming Frog"] ? (
                  <Stack direction="row" alignItems="center" spacing={1}>
                  </Stack>
                ) : selectedTab !== Tabs.Recents && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="white">
                      Sort by:
                    </Typography>
                    <Stack
                      direction={"row"}
                      alignItems={"center"}
                      spacing={1}
                      onClick={handleOpenSort}
                      sx={{
                        cursor: "pointer",
                        height: 30,
                        background: "#252731",
                        borderRadius: "6px",
                        px: 1,
                      }}
                    >
                      <Typography variant="body2" color="white">
                        {sortOrder === "none"
                          ? "None"
                          : sortOrder === "az"
                            ? "A-Z"
                            : "Z-A"}
                      </Typography>
                      {sortOpen ? (
                        <ExpandLess sx={{ fontSize: 18, color: "white" }} />
                      ) : (
                        <ExpandMore sx={{ fontSize: 18, color: "white" }} />
                      )}
                    </Stack>
                    <Menu
                      anchorEl={anchorElSort}
                      open={sortOpen}
                      onClose={handleCloseSort}
                      anchorOrigin={{
                        vertical: "bottom",
                        horizontal: "right",
                      }}
                      transformOrigin={{
                        vertical: "top",
                        horizontal: "right",
                      }}
                      slotProps={{
                        paper: {
                          sx: {
                            bgcolor: "#252834",
                            color: "white",
                            borderRadius: "8px",
                            border: "solid 1px #343847",
                            mt: 1,
                          },
                        },
                      }}
                    >
                      {["none", "az", "za"].map((order) => (
                        <MenuItem
                          key={order}
                          onClick={() => {
                            setSortOrder(order);
                            handleCloseSort();
                          }}
                          sx={{
                            px: 1,
                            width: 154,
                            mx: 1,
                            borderRadius: "6px",
                            background:
                              sortOrder === order
                                ? "#3B4157!important"
                                : "inherit",
                            '&:hover': { background: '#1976d2!important' }
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            justifyContent="space-between"
                            sx={{ width: "100%" }}
                          >
                            <Typography variant="body2" color="white">
                              {order === "none"
                                ? "None"
                                : order === "az"
                                  ? "Sorting A-Z"
                                  : "Sorting Z-A"}
                            </Typography>
                            <Stack
                              alignItems="center"
                              justifyContent="center"
                              sx={{
                                width: 20,
                                height: 20,
                                background: "#EFEAFB",
                                borderRadius: "6px",
                              }}
                            >
                              {sortOrder === order && (
                                <Check sx={{ fontSize: 16, color: "black" }} />
                              )}
                            </Stack>
                          </Stack>
                        </MenuItem>
                      ))}
                    </Menu>
                  </Stack>
                )}
              </Stack>
              <SimpleBarScroll
                sx={{
                  maxHeight: `calc(100vh - 210px)`,
                  "& .simplebar-content": {
                    display: "flex",
                    flexDirection: "column",
                  },
                  px: 2.5,
                }}
              >
                {selectedTab === Tabs["Screaming Frog"] ? (
                  <Grid container spacing={10}>
                    <Grid size={6}>
                      <Stack
                        spacing={2}
                        sx={{
                          width: "100%",
                          bgcolor: "#2C3145",
                          color: "white",
                          borderRadius: "20px",
                          p: 0.75,
                        }}
                      >
                        <Box sx={{ position: "relative" }}>
                          <CardMedia
                            component="img"
                            image={ScreamingFrogSeoSpiderLogo}
                            alt="App"
                            sx={{
                              width: "100%",
                              height: 320,
                              objectFit: "fill",
                              borderRadius: "16px",
                            }}
                          />
                        </Box>
                        <Stack spacing={1.5} sx={{ p: 1.25 }}>
                          <Tooltip title="Screaming Frog Seo Spider" placement="bottom">
                            <Typography
                              variant="h6"
                              component="h2"
                              sx={{
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontWeight: "bold",
                                fontSize: 20,
                                lineHeight: "24px",
                                width: "inherit",
                              }}
                            >
                              Screaming Frog Seo Spider
                            </Typography>
                          </Tooltip>
                          <Tooltip title="Screaming Frog SEO Spider is a desktop application that crawls websites to identify common technical SEO issues." placement="bottom">
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "#D9D9D9",
                              }}
                            >
                              Screaming Frog SEO Spider is a desktop application that crawls websites to identify common technical SEO issues.
                              It mimics how search engine bots crawl a site to extract data like broken links, redirects, duplicate content, and issues with page titles and meta descriptions.
                              This information is then presented in an easily digestible format, often with the option to export it to a spreadsheet for further analysis.
                            </Typography>
                          </Tooltip>
                          <Box sx={{ height: 4 }}></Box>
                          {sf.seo_spider ? (
                            <Button
                              fullWidth
                              disableElevation
                              variant="contained"
                              onClick={isSfssDownloading || isSflaDownloading ? () => { } : sfInfo.seoSpider && parseFloat(sfInfo.seoSpider) === parseFloat(sf.seo_spider) ? () => activateSfSeoSpider() : () => { }}
                              sx={{
                                fontWeight: "bold",
                                borderRadius: "8px",
                                backgroundColor: "#3A71E1",
                              }}
                              disabled={isSfssDownloading || isSflaDownloading || sfInfo.error || !sfInfo.seoSpider || parseFloat(sfInfo.seoSpider) !== parseFloat(sf.seo_spider)}
                            >
                              {isSfssDownloading ? ("Downloading...") : sfInfo.error ? ("Unsupported OS") : sfInfo.seoSpider && parseFloat(sfInfo.seoSpider) === parseFloat(sf.seo_spider) ? ("Activate") : (`Install v${sf.seo_spider} (Default Path)`)}
                            </Button>
                          ) : (
                            <Button
                              fullWidth
                              disableElevation
                              variant="contained"
                              onClick={() =>
                                window.electronAPI.openExternal(
                                  `https://${app.domain}`
                                )
                              }
                              sx={{
                                fontWeight: "bold",
                                borderRadius: "8px",
                                backgroundColor: "#c74ad3",
                              }}
                            >
                              <UpgradeOutlinedIcon />
                              UPGRADE
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Grid>
                    <Grid size={6}>
                      <Stack
                        spacing={2}
                        sx={{
                          width: "100%",
                          bgcolor: "#2C3145",
                          color: "white",
                          borderRadius: "20px",
                          p: 0.75,
                        }}
                      >
                        <Box sx={{ position: "relative" }}>
                          <CardMedia
                            component="img"
                            image={ScreamingFrogLogAnalyserLogo}
                            alt="App"
                            sx={{
                              width: "100%",
                              height: 320,
                              objectFit: "fill",
                              borderRadius: "16px",
                            }}
                          />
                        </Box>
                        <Stack spacing={1.5} sx={{ p: 1.25 }}>
                          <Tooltip title="Screaming Frog Log Analyser" placement="bottom">
                            <Typography
                              variant="h6"
                              component="h2"
                              sx={{
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontWeight: "bold",
                                fontSize: 20,
                                lineHeight: "24px",
                                width: "inherit",
                              }}
                            >
                              Screaming Frog Log Analyser
                            </Typography>
                          </Tooltip>
                          <Tooltip title="Screaming Frog Log File Analyser is a technical SEO tool for processing and analyzing website server log files to understand search engine bot behavior, improve crawl budget, and identify crawl errors." placement="bottom">
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color: "#D9D9D9",
                              }}
                            >
                              Screaming Frog Log File Analyser is a technical SEO tool for processing and analyzing website server log files
                              to understand search engine bot behavior, improve crawl budget, and identify crawl errors.
                              It allows users to upload various log file formats and then provides data on what URLs were crawled, crawl frequency, response codes, and bot activity.
                              The analysis helps with technical SEO tasks like finding broken links and slow pages.
                            </Typography>
                          </Tooltip>
                          <Box sx={{ height: 4 }}></Box>
                          {sf.log_analyser ? (
                            <Button
                              fullWidth
                              disableElevation
                              variant="contained"
                              onClick={isSflaDownloading || isSfssDownloading ? () => { } : sfInfo.logAnalyser && parseFloat(sfInfo.logAnalyser) === parseFloat(sf.log_analyser) ? () => activateSfLogAnalyser() : () => { }}
                              sx={{
                                fontWeight: "bold",
                                borderRadius: "8px",
                                backgroundColor: "#3A71E1",
                              }}
                              disabled={isSflaDownloading || isSfssDownloading || sfInfo.error || !sfInfo.logAnalyser || parseFloat(sfInfo.logAnalyser) !== parseFloat(sf.log_analyser)}
                            >
                              {isSflaDownloading ? ("Downloading...") : sfInfo.error ? ("Unsupported OS") : sfInfo.logAnalyser && parseFloat(sfInfo.logAnalyser) === parseFloat(sf.log_analyser) ? ("Activate") : (`Install v${sf.log_analyser} (Default Path)`)}
                            </Button>
                          ) : (
                            <Button
                              fullWidth
                              disableElevation
                              variant="contained"
                              onClick={() =>
                                window.electronAPI.openExternal(
                                  `https://${app.domain}`
                                )
                              }
                              sx={{
                                fontWeight: "bold",
                                borderRadius: "8px",
                                backgroundColor: "#c74ad3",
                              }}
                            >
                              <UpgradeOutlinedIcon />
                              UPGRADE
                            </Button>
                          )}
                        </Stack>
                      </Stack>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid container spacing={3}>
                    {getSortedApps()
                      .filter((app) => {
                        if (!searchPattern) return true;
                        const pattern = searchPattern.toLowerCase();
                        return (
                          (app.title || "").toLowerCase().includes(pattern) ||
                          (app.description || "").toLowerCase().includes(pattern)
                        );
                      })
                      .filter((app) => {
                        if (selectedTab === Tabs.Recents) {
                          return !!app.lastAccessed;
                        } else if (selectedTab === Tabs.Favorites) {
                          return app.isFavorite;
                        }
                        return true;
                      })
                      .map((app) => (
                        <Grid size={{ xs: 4 }} key={`app_${app.id}`}>
                          <Stack
                            spacing={2}
                            sx={{
                              width: "100%",
                              bgcolor: "#2C3145",
                              color: "white",
                              borderRadius: "20px",
                              p: 0.75,
                            }}
                          >
                            <Box sx={{ position: "relative" }}>
                              <CardMedia
                                component="img"
                                image={
                                  app.thumbPath !== ""
                                    ? "https://admin.kloow.com" + app.thumbPath
                                    : LogoWithTitle
                                }
                                alt="App"
                                sx={{
                                  width: "100%",
                                  height: 196,
                                  objectFit: "contain",
                                  borderRadius: "16px",
                                }}
                              />
                              <Box
                                sx={{ position: "absolute", top: 10, left: 10 }}
                              >
                                {/* <Box
                                sx={{ position: "absolute", top: 0, left: 0 }}
                              > */}
                                <IconButton
                                  onClick={() => setFavorite(app?.id)}
                                  sx={{
                                    backgroundColor: "white",
                                    borderRadius: "8px",
                                    width: 28,
                                    height: 28,
                                    "&:hover": {
                                      backgroundColor: "white",
                                    },
                                  }}
                                >
                                  {app.isFavorite ? (
                                    <FavoriteOutlinedIcon
                                      sx={{
                                        color: "red",
                                        fontSize: 18,
                                      }}
                                    />
                                  ) : (
                                    <FavoriteOutlinedIcon
                                      sx={{
                                        color: "#aaa",
                                        fontSize: 18,
                                      }}
                                    />
                                  )}
                                </IconButton>
                              </Box>
                            </Box>
                            <Stack spacing={1.5} sx={{ p: 1.25 }}>
                              <Tooltip title={app.title} placement="bottom">
                                <Typography
                                  variant="h6"
                                  component="h2"
                                  sx={{
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontWeight: "bold",
                                    fontSize: 20,
                                    lineHeight: "24px",
                                    width: "inherit",
                                  }}
                                >
                                  {app.title}
                                </Typography>
                              </Tooltip>
                              <Tooltip title={app.description} placement="bottom">
                                <Typography
                                  variant="body2"
                                  sx={{
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: "#D9D9D9",
                                  }}
                                >
                                  {app.description}
                                </Typography>
                              </Tooltip>
                              <Box sx={{ height: 4 }}></Box>
                              {app.isAllowed ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', flexDirection: 'column' }}>
                                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: statusColor(getStatusForApp(app.id)) }} />
                                      <Typography variant="caption" color="white">
                                        {getStatusForApp(app.id)}
                                      </Typography>
                                    </Box>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                    {runningStatus[app.id] ? (
                                      <Button
                                        fullWidth
                                        disableElevation
                                        variant="contained"
                                        onClick={() => stop(app.id)}
                                        disabled={tryRunningStatus.includes(app.id)}
                                        sx={{
                                          fontWeight: "bold",
                                          borderRadius: "8px",
                                          backgroundColor: "#E03E3E",
                                        }}
                                      >
                                        <PauseIcon sx={{ mr: 1 }} />
                                        STOP
                                      </Button>
                                    ) : (
                                      <>
                                        <Button
                                          fullWidth
                                          disableElevation
                                          variant="contained"
                                          onClick={() => run(app.id, app.initUrl, serverSelection[app.id] ?? app.servers?.[0], app.extensionId ?? null, app.optionalUrl ?? [])}
                                          disabled={tryRunningStatus.includes(app.id) || !serverHealth[app.id]}
                                          sx={{
                                            flex: 1,
                                            fontWeight: "bold",
                                            borderRadius: "8px",
                                            backgroundColor: "#3A71E1",
                                          }}
                                        >
                                          <PlayArrowIcon sx={{ mr: 1 }} />
                                          RUN
                                        </Button>
                                        {app.servers && app.servers.length > 0 && (
                                          <>
                                            <IconButton
                                              size="small"
                                              onClick={(e) => {
                                                setMenuAnchor(e.currentTarget);
                                                setMenuAppId(app.id);
                                              }}
                                              sx={{ ml: 1, color: 'white', background: '#1976d2', borderRadius: '8px', width: 44, height: 36, p: 0 }}
                                            >
                                              <ExpandMore sx={{ fontSize: 20 }} />
                                            </IconButton>
                                            <Menu
                                              anchorEl={menuAnchor}
                                              open={Boolean(menuAnchor) && menuAppId === app.id}
                                              onClose={() => {
                                                setMenuAnchor(null);
                                                setMenuAppId(null);
                                              }}
                                              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                              slotProps={{
                                                paper: {
                                                  sx: {
                                                    bgcolor: '#252834',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    border: 'solid 1px #343847',
                                                    mt: 1
                                                  }
                                                }
                                              }}
                                            >
                                              {(app.servers || []).map((srv, idx) => {
                                                const label = `${app.title} - ${idx + 1}`;
                                                const sel = serverSelection[app.id];
                                                const isSelected = sel === srv || (sel && typeof sel !== 'string' && typeof srv !== 'string' && (sel.name === srv.name || sel.host === srv.host)) || (typeof sel === 'string' && sel === label);
                                                return (
                                                  <MenuItem
                                                    key={`srv_${app.id}_${idx}`}
                                                    onClick={() => {
                                                      setServerSelection((prev) => ({ ...prev, [app.id]: srv }));
                                                      setMenuAnchor(null);
                                                      setMenuAppId(null);
                                                    }}
                                                    sx={{ background: 'inherit', '&:hover': { backgroundColor: '#1976d2' } }}
                                                  >
                                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ width: '100%' }}>
                                                      <Typography variant="body2" sx={{ color: 'white' }}>{label}</Typography>
                                                      {isSelected && <Check sx={{ fontSize: 16, color: 'white' }} />}
                                                    </Stack>
                                                  </MenuItem>
                                                );
                                              })}
                                            </Menu>
                                          </>
                                        )}
                                      </>
                                    )}
                                  </Box>
                                </Box>
                              ) : (
                                <Button
                                  fullWidth
                                  disableElevation
                                  variant="contained"
                                  onClick={() =>
                                    window.electronAPI.openExternal(
                                      `https://${app.domain}`
                                    )
                                  }
                                  sx={{
                                    fontWeight: "bold",
                                    borderRadius: "8px",
                                    backgroundColor: "#c74ad3",
                                  }}
                                >
                                  <UpgradeOutlinedIcon />
                                  UPGRADE
                                </Button>
                              )}
                            </Stack>
                          </Stack>
                        </Grid>
                      ))}
                    {getSortedApps()
                      .filter((app) => {
                        if (!searchPattern) return true;
                        const pattern = searchPattern.toLowerCase();
                        return (
                          (app.title || "").toLowerCase().includes(pattern) ||
                          (app.description || "").toLowerCase().includes(pattern)
                        );
                      })
                      .filter((app) => {
                        if (selectedTab === Tabs.Recents) {
                          return !!app.lastAccessed;
                        } else if (selectedTab === Tabs.Favorites) {
                          return app.isFavorite;
                        }
                        return true;
                      })?.length === 0 && (
                        <Grid size={{ xs: 12 }}>
                          <Typography color="white">Nothing to Show</Typography>
                        </Grid>
                      )}
                  </Grid>
                )}
              </SimpleBarScroll>
            </Stack>
          )}
        </Box>
      </Stack>
      <Modal
        open={open}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Stack
          className="modal"
          sx={{
            width: 560,
            p: 0,
            backgroundColor: "#16171E",
            border: "solid 1px #343951",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          {downloading ? (
            <LinearProgress />
          ) : (
            <Box sx={{ width: "100%", height: "4px" }} />
          )}
          <Stack spacing={4} sx={{ p: 4 }}>
            <Box>
              <Stack spacing={1}>{message}</Stack>
            </Box>
            <Stack
              spacing={3}
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                variant="contained"
                disableElevation
                disabled={downloading}
                onClick={handleDownloadBrowser}
                size="large"
                sx={{ minWidth: 140 }}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                disableElevation
                disabled={downloading}
                onClick={handleClose}
                size="large"
                sx={{ minWidth: 140, backgroundColor: "#252731" }}
              >
                Skip
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Modal>

      {/* Update Available Dialog */}
      <Dialog
        open={showUpdateDialog}
        onClose={handleDismissUpdate}
        PaperProps={{
          sx: {
            backgroundColor: "#16171E",
            color: "white",
            border: "1px solid #343951",
            borderRadius: "8px",
            minWidth: "400px",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: 18, fontWeight: 600, pb: 1 }}>
          Update Available
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="body1" color="#ccc">
              A new version <strong>v{latestVersion}</strong> is available for download.
            </Typography>
            {updateDownloading ? (
              <Stack spacing={1}>
                <Typography variant="body2" color="#888">
                  {updateDownloadStatus}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={updateDownloadProgress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#343951",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#c74ad3",
                    },
                  }}
                />
                <Typography variant="caption" color="#888">
                  {updateDownloadProgress}%
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" color="#aaa">
                We recommend updating immediately to get the latest features, improvements, and security fixes.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          {!updateDownloading && (
            <Button
              onClick={handleDismissUpdate}
              sx={{
                textTransform: "none",
                color: "#888",
                "&:hover": { color: "#aaa" },
              }}
            >
              Later
            </Button>
          )}
          <Button
            onClick={handleDownloadFromDialog}
            disabled={updateDownloading || isUpdateDownloading}
            sx={{
              textTransform: "none",
              backgroundColor: "#c74ad3",
              color: "white",
              fontWeight: 600,
              "&:hover": { backgroundColor: "#b83bc4" },
              "&:disabled": { backgroundColor: "#666", color: "#999" },
            }}
          >
            {updateDownloading || isUpdateDownloading ? "Downloading..." : "Download & Update"}
          </Button>
        </DialogActions>
      </Dialog>

      <Modal
        open={openSetting}
        onClose={() => setOpenSetting(false)}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box
          className="modal"
          sx={{
            width: "80vw",
            height: "80vh",
            backgroundColor: "#16171E",
            border: "solid 1px #343951",
            borderRadius: "8px",
          }}
        >
          <Stack spacing={3}>
            <Typography variant="h6" color="white">
              Account Settings
            </Typography>
            <Stack
              direction="row"
              alignItems={"center"}
              justifyContent={"space-between"}
              spacing={2}
            >
              <Stack>
                <Typography
                  color="white"
                  sx={{ fontSize: 16, lineHeight: "22px" }}
                >
                  Startup
                </Typography>
                <Typography
                  color="white"
                  sx={{ fontSize: 12, lineHeight: "16px" }}
                >
                  Automatically launch Kloow with windows for notifications and
                  faster access
                </Typography>
              </Stack>
              <IOSSwitch
                checked={startup}
                onChange={(e) => {
                  setStartup(e.target.checked);
                  window.electronAPI.setAutoLaunch(e.target.checked);
                }}
              />
            </Stack>
            <Divider sx={{ borderColor: "#343951" }} />
            <Stack spacing={2}>
              <Typography color="white" sx={{ fontSize: 16, lineHeight: "22px" }}>
                Application Update
              </Typography>
              {update ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="white">
                      Update available: v{latestVersion}
                    </Typography>
                    {updateDownloading && (
                      <>
                        <Typography variant="body2" color="#888" sx={{ mt: 1 }}>
                          {updateDownloadStatus}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={updateDownloadProgress}
                          sx={{ mt: 1, height: 4, borderRadius: 2 }}
                        />
                      </>
                    )}
                  </Box>
                  <Button
                    disabled={updateDownloading || isUpdateDownloading}
                    onClick={downloadAndUpdate}
                    sx={{
                      width: "100%",
                      backgroundColor: "#c74ad3",
                      color: "white",
                      textTransform: "none",
                      borderRadius: "8px",
                      fontSize: 14,
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "#b83bc4",
                      },
                      "&:disabled": {
                        backgroundColor: "#888",
                      },
                    }}
                  >
                    {updateDownloading || isUpdateDownloading ? "Downloading..." : "Download & Update"}
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="#888">
                  You are running the latest version
                </Typography>
              )}
            </Stack>
            <Divider sx={{ borderColor: "#343951" }} />
            <Typography color="white" sx={{ fontSize: 16, lineHeight: "22px" }}>
              Overview
            </Typography>
            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="body2" color="white">
                  E-mail
                </Typography>
                <Box
                  sx={{
                    borderRadius: "6px",
                    backgroundColor: "#252731",
                    border: "solid 1px #343951",
                    py: 1,
                    px: 1,
                    width: "max-content",
                    minWidth: "380px",
                    color: "white",
                  }}
                >
                  {user.username || "N/A"}
                </Box>
              </Stack>
              <Stack spacing={1}>
                <Typography variant="body2" color="white">
                  User role
                </Typography>
                <Box
                  sx={{
                    borderRadius: "20px",
                    backgroundColor: "#3A71E1",
                    border: "solid 1px #343951",
                    py: 0.5,
                    px: 2,
                    width: "max-content",
                    color: "white",
                  }}
                >
                  {user.role || "N/A"}
                </Box>
              </Stack>
              <Typography variant="body2" color="white">
                Membership expires on{" "}
                {new Date(user.membership_expire_time).toLocaleDateString() ||
                  "N/A"}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </>
  );
};

export default Dashboard;
