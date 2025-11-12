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
} from "@mui/material";
import { FavoriteBorder, Language } from "@mui/icons-material";
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
import LogoWithTitle from "../../assets/images/logo_title.png";

import Loader from "../../components/Loader";
import SimpleBarScroll from "../../components/SimpleBar";
import IOSSwitch from "../../components/IOSSwitch";

import useSnackbar from "../../hooks/useSnackbar";
import useMain from "../../hooks/useMain";
import useAuth from "../../hooks/useAuth";

import DefaultAppIcon from "../../assets/images/logo_title.png";
import DefaultAppImage from "../../assets/images/logo.png";

import SettingsIcon from "../../assets/icons/settings.png";
import LoginIcon from "../../assets/icons/login.png";
import RefreshIcon from "../../assets/icons/refresh.png";

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
    getAppList,
    appList,
    searchPattern,
    setLog,
    setSearchPattern,
    setFavorite,
  } = useMain();
  const { logout } = useAuth();

  const { errorMessage } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [runningStatus, setRunningStatus] = useState({}); // Map of id to boolean
  const [tryRunningStatus, setTryRunningStatus] = useState([]);
  const [open, setOpen] = useState(false);
  const handleClose = () => setOpen(false);

  const [message, setMessage] = useState(DownloadMessage);
  const [sortOrder, setSortOrder] = useState("none"); // none | az | za
  const [selectedTab, setSelectedTab] = useState(Tabs.Applications); // all | favorites | recents
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

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const [startup, setStartup] = useState(false);

  const user = JSON.parse(localStorage.getItem("user")) || {};
  const getItemTitle = (item) => item.title || item.description || "";
  const getItemImg = (item) =>
    item.logoPath
      ? "https://admin.kloow.com/" + item.logoPath
      : DefaultAppImage;

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
    const getAutoLaunch = async () => {
      const autoLaunch = await window.electronAPI.getAutoLaunch();
      setStartup(autoLaunch);
    };
    getAutoLaunch();
  }, []);

  useEffect(() => {
    getAppList().then((appList) => {
      const initialStatus = appList.reduce((acc, app) => {
        acc[app.id] = false;
        return acc;
      }, {});
      setRunningStatus(initialStatus);
      setLoading(false);
    });
  }, []);

  const run = async (id, url, server) => {
    try {
      if (runningStatus[id]) {
        return;
      }
      setTryRunningStatus((prev) => [...prev, id]);
      const result = await window.electronAPI.runBrowser(id, url, server);
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
                <img src={SearchIcon} style={{ width: 16, height: 16 }} />
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
            <IconButton
              onClick={async () => {
                setLoading(true);
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
              <img src={RefreshIcon} style={{ width: 34, height: 34 }} />
            </IconButton>
            <IconButton
              onClick={handleMenuOpen}
              aria-controls={menuOpen ? "profile-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuOpen ? "true" : undefined}
              sx={{ color: "white", p: 0 }}
            >
              <img src={ProfileIcon} style={{ width: 34, height: 34 }} />
            </IconButton>
            <IconButton onClick={logout} sx={{ color: "white", p: 0 }}>
              <img src={LogoutIcon} style={{ width: 34, height: 34 }} />
            </IconButton>
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
              sx={{ color: "white" }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <img src={SettingsIcon} style={{ width: 24, height: 24 }} />
                <Typography variant="body2">Account Settings</Typography>
              </Stack>
            </MenuItem>
            <MenuItem onClick={logout} sx={{ color: "white" }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <img src={LoginIcon} style={{ width: 24, height: 24 }} />
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
                  onClick={() => run(app.id, app.initUrl, app.servers?.[0])}
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
                        sx={{ color: "white" }}
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
                  </ListItemIcon>
                  <ListItemText primary={key} sx={listItemTextSx} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ width: "max-content", flexGrow: 1, p: 0 }}>
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
                {selectedTab !== Tabs.Recents && (
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
                              {" "}
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
                      <Grid key={`app_${app.id}`}>
                        <Stack
                          spacing={2}
                          sx={{
                            width: 372,
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
                                  : DefaultAppIcon
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
                              <Button
                                fullWidth
                                disableElevation
                                variant="contained"
                                onClick={() =>
                                  runningStatus[app.id]
                                    ? stop(app.id)
                                    : run(app.id, app.initUrl, app.servers?.[0])
                                }
                                disabled={tryRunningStatus.includes(app.id)}
                                sx={{
                                  fontWeight: "bold",
                                  borderRadius: "8px",
                                  backgroundColor: runningStatus[app.id]
                                    ? "#E03E3E"
                                    : "#3A71E1",
                                }}
                              >
                                {runningStatus[app.id] ? (
                                  <>
                                    <PauseIcon sx={{ mr: 1 }} />
                                    STOP
                                  </>
                                ) : (
                                  <>
                                    <PlayArrowIcon sx={{ mr: 1 }} />
                                    RUN
                                  </>
                                )}
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
                    <Grid item>
                      <Typography color="white">Nothing to Show</Typography>
                    </Grid>
                  )}
                </Grid>
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
