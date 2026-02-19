import React, { useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Modal,
  Stack,
  Typography,
} from "@mui/material";

import IOSSwitch from "../../../../components/IOSSwitch";

import { BROWSER_MODAL_MESSAGES } from "../constants";

function formatMembershipDate(value) {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  return parsed.toLocaleDateString();
}

export default function DashboardModals({
  browserModalOpen,
  browserModalCode,
  downloading,
  onDownloadBrowser,
  onCloseBrowserModal,
  showUpdateDialog,
  onDismissUpdateDialog,
  latestVersion,
  updateDownloading,
  updateDownloadStatus,
  updateDownloadProgress,
  isUpdateDownloading,
  onDownloadFromDialog,
  settingsOpen,
  onCloseSettings,
  startup,
  onStartupChange,
  update,
  onDownloadAndUpdate,
  user,
}) {
  const browserMessage = BROWSER_MODAL_MESSAGES[browserModalCode] ||
    BROWSER_MODAL_MESSAGES.ZIP_NOT_FOUND;
  const membershipDate = useMemo(
    () => formatMembershipDate(user?.membership_expire_time),
    [user?.membership_expire_time]
  );

  return (
    <>
      <Modal
        open={browserModalOpen}
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
          {downloading ? <LinearProgress /> : <Box sx={{ width: "100%", height: "4px" }} />}
          <Stack spacing={4} sx={{ p: 4 }}>
            <Box>
              <Stack spacing={1}>
                <Typography variant="body1" textAlign="center" color="white">
                  {browserMessage.line1}
                  <br />
                  {browserMessage.line2}
                </Typography>
              </Stack>
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
                onClick={onDownloadBrowser}
                size="large"
                sx={{ minWidth: 140 }}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                disableElevation
                disabled={downloading}
                onClick={onCloseBrowserModal}
                size="large"
                sx={{ minWidth: 140, backgroundColor: "#252731" }}
              >
                Skip
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Modal>

      <Dialog
        open={showUpdateDialog}
        onClose={onDismissUpdateDialog}
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
              Version <strong>v{latestVersion}</strong> is available to download.
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
                We recommend updating immediately to get the latest features,
                improvements, and security fixes.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          {!updateDownloading && (
            <Button
              onClick={onDismissUpdateDialog}
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
            onClick={onDownloadFromDialog}
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
            {updateDownloading || isUpdateDownloading
              ? "Downloading..."
              : "Download and update"}
          </Button>
        </DialogActions>
      </Dialog>

      <Modal
        open={settingsOpen}
        onClose={onCloseSettings}
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
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Stack>
                <Typography color="white" sx={{ fontSize: 16, lineHeight: "22px" }}>
                  Startup
                </Typography>
                <Typography color="white" sx={{ fontSize: 12, lineHeight: "16px" }}>
                  Automatically launch Kloow with windows for notifications and
                  faster access
                </Typography>
              </Stack>
              <IOSSwitch
                checked={startup}
                onChange={(event) => onStartupChange(event.target.checked)}
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
                      Update available (v{latestVersion})
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
                    onClick={onDownloadAndUpdate}
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
                    {updateDownloading || isUpdateDownloading
                      ? "Downloading..."
                      : "Download and update"}
                  </Button>
                </Stack>
              ) : (
                <Typography variant="body2" color="#888">
                  You're using the latest version.
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
                  {user?.username || "N/A"}
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
                  {user?.role || "N/A"}
                </Box>
              </Stack>
              <Typography variant="body2" color="white">
                Membership expires on: {membershipDate}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
