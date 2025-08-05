import React, { useEffect, useState, useCallback } from "react";
import useMain from "../../hooks/useMain";
import Loader from "../../components/Loader";
import {
  Box,
  Button,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Typography,
  Modal,
  LinearProgress,
  IconButton,
} from "@mui/material";
import { LogoutOutlined } from "@ant-design/icons";
import useSnackbar from "../../hooks/useSnackbar";
import useAuth from "../../hooks/useAuth";

const Dashboard = () => {
  const { getAppList, appList } = useMain();
  const { errorMessage, successMessage } = useSnackbar();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [runningStatus, setRunningStatus] = useState({}); // Map of id to boolean
  const [tryRunningStatus, setTryRunningStatus] = useState([]);
  const [open, setOpen] = useState(false);

  const handleClose = () => setOpen(false);

  useEffect(() => {
    getAppList().then(() => setLoading(false));
  }, []);

  useEffect(() => {
    const initialStatus = appList.reduce((acc, app) => {
      acc[app.id] = false;
      return acc;
    }, {});
    setRunningStatus(initialStatus);
  }, [appList]);

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
    window.electronAPI.setTitle("Browser Profiles");
    window.electronAPI.onBrowserStatus(handleBrowserStatus);
  }, [handleBrowserStatus]);

  const run = async (id, url, server) => {
    try {
      if (runningStatus[id]) {
        return;
      }
      setTryRunningStatus((prev) => [...prev, id]);
      const result = await window.electronAPI.runBrowser(id, url, server);
      if (!result.status) {
        if (result.message === "ZIP_NOT_FOUND") {
          setOpen(true);
        } else {
          errorMessage(`Failed to run browser for id ${id}: ${result.message}`);
        }
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
    try {
      setDownloading(true);
      const result = await window.electronAPI.downloadBrowser();
      if (!result.status) {
        errorMessage(result.message);
      } else {
        successMessage("Success to download browser. Please try again.");
      }
    } catch (error) {
      errorMessage(
        `Failed to download or run the executable: ${error.message}`
      );
    }
    setOpen(false);
    setDownloading(false);
  };

  return (
    <>
      {loading ? (
        <Loader />
      ) : (
        <Stack
          spacing={3}
          sx={{ width: "100%", minHeight: `calc(100vh - 48px)` }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h4">Application List</Typography>
            <IconButton onClick={logout}>
              <LogoutOutlined />
            </IconButton>
          </Stack>
          <TableContainer sx={{ maxHeight: "calc(100vh - 90px)" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appList?.map((app) => (
                  <TableRow key={`app_${app.id}`}>
                    <TableCell>{app.title}</TableCell>
                    <TableCell>{app.description}</TableCell>
                    <TableCell>
                      <Button
                        disableElevation
                        variant="contained"
                        size="small"
                        onClick={() =>
                          runningStatus[app.id]
                            ? stop(app.id)
                            : run(app.id, app.initUrl, app.servers?.[0])
                        }
                        disabled={tryRunningStatus.includes(app.id)}
                        color={runningStatus[app.id] ? "error" : "primary"}
                      >
                        {runningStatus[app.id] ? "Stop" : "Run"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}
      <Modal
        open={open}
        aria-labelledby="parent-modal-title"
        aria-describedby="parent-modal-description"
        sx={{ p: 0 }}
      >
        <Stack className="modal" sx={{ width: "50%", maxWidth: 480, p: 0 }}>
          {downloading ? (
            <LinearProgress />
          ) : (
            <Box sx={{ width: "100%", height: "4px" }} />
          )}
          <Stack spacing={3} sx={{ p: 3 }}>
            <Box>
              <Stack spacing={1}>
                <Typography variant="body1">
                  We recommend downloading google chrome portable browser now to
                  ensure proper operation.
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
                onClick={handleDownloadBrowser}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                disableElevation
                disabled={downloading}
                onClick={handleClose}
              >
                Skip
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Modal>
    </>
  );
};

export default Dashboard;
