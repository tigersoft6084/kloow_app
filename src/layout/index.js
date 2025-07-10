import React, { useState, useEffect } from "react";
import { Box, Button, Stack, Typography, Modal } from "@mui/material";
import Snackbar from "../components/Snackbar";
import SimpleBarScroll from "../components/SimpleBar";

const Layout = ({ children }) => {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check for updates on mount
    // window.electronAPI.checkForUpdates();

    window.electronAPI.onUpdateStatus((_, response) => {
      switch (response.status) {
        case "error":
        case "update-downloaded":
          setOpen(true);
          setStatus(response.status);
          setMessage(response.message);
          break;
        case "check-for-updates":
        default:
          setOpen(false);
          setStatus("");
          setMessage("");
          break;
      }
    });
  }, []);

  const handleRestart = () => {
    window.electronAPI.restartAndUpdate();
  };

  const handleClose = () => setOpen(false);

  return (
    <Stack>
      <Stack
        alignItems="center"
        justifyContent="center"
        sx={{ width: "100vw", height: "100vh" }}
      >
        <Box sx={{ p: 3 }}>{children}</Box>
      </Stack>
      <Snackbar />
      <Modal
        open={open}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
      >
        <Box className="modal" sx={{ width: "70%", maxWidth: 700 }}>
          <Stack spacing={3}>
            <SimpleBarScroll
              sx={{
                maxHeight: `calc(100vh - 240px)`,
                overflowX: "hidden",
                "& .simplebar-content": {
                  display: "flex",
                  flexDirection: "column",
                },
              }}
            >
              <Box>
                {status === "update-downloaded" ? (
                  <Stack spacing={1}>
                    <Typography variant="body1">
                      A new version has been downloaded. Please restart the
                      application to apply the updates.
                    </Typography>
                    <Typography variant="body2">{message}</Typography>
                  </Stack>
                ) : (
                  <Stack spacing={1}>
                    <Typography variant="body1">
                      An error occurred while checking for updates. Please try
                      again later or contact support.
                    </Typography>
                    <Typography color="error" variant="body2">
                      {message}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </SimpleBarScroll>
            <Stack
              spacing={3}
              direction="row"
              alignItems="center"
              justifyContent="center"
            >
              <Button
                variant="contained"
                disableElevation
                onClick={handleRestart}
              >
                Restart
              </Button>
              <Button variant="outlined" disableElevation onClick={handleClose}>
                {status === "update-downloaded" ? "Later" : "Close"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </Stack>
  );
};

export default Layout;
