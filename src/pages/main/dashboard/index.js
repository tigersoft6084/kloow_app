import React from "react";
import {
  Box,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import LanguageIcon from "@mui/icons-material/Language";
import ScheduleIcon from "@mui/icons-material/Schedule";

import Loader from "../../../components/Loader";
import SimpleBarScroll from "../../../components/SimpleBar";
import ScreamingFrogIcon from "../../../assets/images/screaming_frog.png";

import AppListGrid from "./components/AppListGrid";
import DashboardHeader from "./components/DashboardHeader";
import DashboardModals from "./components/DashboardModals";
import ScreamingFrogGrid from "./components/ScreamingFrogGrid";
import {
  listItemButtonSx,
  listItemIconSx,
  listItemTextSx,
  SORT_ORDERS,
  Tabs,
} from "./constants";
import { getItemImg } from "./helpers";
import useDashboardController from "./hooks/useDashboardController";

function getSortLabel(sortOrder) {
  if (sortOrder === "none") return "Default";
  if (sortOrder === "az") return "A-Z";
  return "Z-A";
}

function getSortMenuLabel(sortOrder) {
  if (sortOrder === "none") return "Default";
  if (sortOrder === "az") return "A to Z";
  return "Z to A";
}

function renderTabIcon(key) {
  if (key === "Applications") return <LanguageIcon />;
  if (key === "Favorites") return <FavoriteBorderIcon />;
  if (key === "Recents") return <ScheduleIcon />;
  if (key === "Screaming Frog") {
    return <img src={ScreamingFrogIcon} alt="frog" style={{ width: 24, height: 24 }} />;
  }
  return null;
}

export default function Dashboard() {
  const {
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
    pageTitle,
    pageDescription,
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
  } = useDashboardController();

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

      <DashboardHeader
        searchPattern={searchPattern}
        onSearchChange={setSearchPattern}
        onRefresh={refreshApps}
        update={update}
        profileMenuAnchor={profileMenuAnchor}
        profileMenuOpen={profileMenuOpen}
        onOpenProfileMenu={openProfileMenu}
        onCloseProfileMenu={closeProfileMenu}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={logout}
        appList={appList}
        onRunFavorite={(app) =>
          run(app.id, app.initUrl, app.servers?.[0], app.extensionId ?? null)
        }
        onToggleFavorite={setFavorite}
        addFavoriteAnchor={addFavoriteAnchor}
        addFavoriteMenuOpen={addFavoriteMenuOpen}
        onOpenAddFavoriteMenu={openAddFavoriteMenu}
        onCloseAddFavoriteMenu={closeAddFavoriteMenu}
        getItemImg={getItemImg}
      />

      <Stack
        direction="row"
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
                  <ListItemIcon sx={listItemIconSx}>{renderTabIcon(key)}</ListItemIcon>
                  <ListItemText primary={key} sx={listItemTextSx} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ width: "calc(100% - 240px)", flexGrow: 1, p: 0 }}>
          {loading ? (
            <Loader />
          ) : (
            <Stack spacing={2.5} sx={{ width: "100%", minHeight: "calc(100vh - 110px)" }}>
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

                {selectedTab === Tabs["Screaming Frog"] ? null : selectedTab !== Tabs.Recents && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="body2" color="white">
                      Sort by:
                    </Typography>
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      onClick={openSortMenu}
                      sx={{
                        cursor: "pointer",
                        height: 30,
                        background: "#252731",
                        borderRadius: "6px",
                        px: 1,
                      }}
                    >
                      <Typography variant="body2" color="white">
                        {getSortLabel(sortOrder)}
                      </Typography>
                      {sortMenuOpen ? (
                        <ExpandLessIcon sx={{ fontSize: 18, color: "white" }} />
                      ) : (
                        <ExpandMoreIcon sx={{ fontSize: 18, color: "white" }} />
                      )}
                    </Stack>
                    <Menu
                      anchorEl={sortMenuAnchor}
                      open={sortMenuOpen}
                      onClose={closeSortMenu}
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
                      {SORT_ORDERS.map((order) => (
                        <MenuItem
                          key={order}
                          onClick={() => {
                            setSortOrder(order);
                            closeSortMenu();
                          }}
                          sx={{
                            px: 1,
                            width: 154,
                            mx: 1,
                            borderRadius: "6px",
                            background: sortOrder === order ? "#3B4157!important" : "inherit",
                            "&:hover": { background: "#1976d2!important" },
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
                              {getSortMenuLabel(order)}
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
                                <CheckIcon sx={{ fontSize: 16, color: "black" }} />
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
                  maxHeight: "calc(100vh - 210px)",
                  "& .simplebar-content": {
                    display: "flex",
                    flexDirection: "column",
                  },
                  px: 2.5,
                }}
              >
                {selectedTab === Tabs["Screaming Frog"] ? (
                  <ScreamingFrogGrid
                    sf={sf}
                    sfInfo={sfInfo}
                    isSfssDownloading={isSfssDownloading}
                    isSflaDownloading={isSflaDownloading}
                    onActivateSfSeoSpider={activateSfSeoSpider}
                    onActivateSfLogAnalyser={activateSfLogAnalyser}
                    onUpgrade={() => openUpgradePage()}
                  />
                ) : (
                  <AppListGrid
                    apps={filteredApps}
                    runningStatus={runningStatus}
                    tryRunningStatus={tryRunningStatus}
                    serverHealth={serverHealth}
                    serverSelection={serverSelection}
                    onRun={run}
                    onStop={stop}
                    onToggleFavorite={setFavorite}
                    getStatusForApp={getStatusForApp}
                    statusColor={statusColor}
                    serverMenuAnchor={serverMenuAnchor}
                    serverMenuAppId={serverMenuAppId}
                    onOpenServerMenu={openServerMenu}
                    onCloseServerMenu={closeServerMenu}
                    onSelectServer={selectServer}
                    onOpenUpgrade={openUpgradePage}
                  />
                )}
              </SimpleBarScroll>
            </Stack>
          )}
        </Box>
      </Stack>

      <DashboardModals
        browserModalOpen={browserModalOpen}
        browserModalCode={browserModalCode}
        downloading={downloading}
        onDownloadBrowser={downloadBrowser}
        onCloseBrowserModal={closeBrowserModal}
        showUpdateDialog={showUpdateDialog}
        onDismissUpdateDialog={dismissUpdateDialog}
        latestVersion={latestVersion}
        updateDownloading={updateDownloading}
        updateDownloadStatus={updateDownloadStatus}
        updateDownloadProgress={updateDownloadProgress}
        isUpdateDownloading={isUpdateDownloading}
        onDownloadFromDialog={handleDownloadFromDialog}
        settingsOpen={settingsOpen}
        onCloseSettings={() => setSettingsOpen(false)}
        startup={startup}
        onStartupChange={handleStartupChange}
        update={update}
        onDownloadAndUpdate={downloadAndUpdate}
        user={user}
      />
    </>
  );
}
