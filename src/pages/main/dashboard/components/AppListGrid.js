import React from "react";
import {
  Box,
  Button,
  CardMedia,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FavoriteOutlinedIcon from "@mui/icons-material/FavoriteOutlined";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import UpgradeOutlinedIcon from "@mui/icons-material/UpgradeOutlined";

import LogoWithTitle from "../../../../assets/images/logo_title.png";

import { getThumbImg, isServerSelected } from "../helpers";

export default function AppListGrid({
  apps,
  runningStatus,
  tryRunningStatus,
  serverHealth,
  serverSelection,
  onRun,
  onStop,
  onToggleFavorite,
  getStatusForApp,
  statusColor,
  serverMenuAnchor,
  serverMenuAppId,
  onOpenServerMenu,
  onCloseServerMenu,
  onSelectServer,
  onOpenUpgrade,
}) {
  return (
    <Grid container spacing={3}>
      {apps.map((app) => (
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
                image={getThumbImg(app, LogoWithTitle)}
                alt="App"
                sx={{
                  width: "100%",
                  height: 196,
                  objectFit: "contain",
                  borderRadius: "16px",
                }}
              />
              <Box sx={{ position: "absolute", top: 10, left: 10 }}>
                <IconButton
                  onClick={() => onToggleFavorite(app?.id)}
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
                  <FavoriteOutlinedIcon
                    sx={{
                      color: app.isFavorite ? "red" : "#aaa",
                      fontSize: 18,
                    }}
                  />
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
              <Box sx={{ height: 4 }} />
              {app.isAllowed ? (
                <Box sx={{ display: "flex", alignItems: "center", width: "100%", flexDirection: "column" }}>
                  <Box sx={{ width: "100%", display: "flex", justifyContent: "flex-end", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: statusColor(getStatusForApp(app.id)),
                        }}
                      />
                      <Typography variant="caption" color="white">
                        {getStatusForApp(app.id)}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                    {runningStatus[app.id] ? (
                      <Button
                        fullWidth
                        disableElevation
                        variant="contained"
                        onClick={() => onStop(app.id)}
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
                          onClick={() =>
                            onRun(
                              app.id,
                              app.initUrl,
                              serverSelection[app.id] ?? app.servers?.[0],
                              app.extensionId ?? null
                            )
                          }
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
                              onClick={(event) => onOpenServerMenu(event, app.id)}
                              sx={{
                                ml: 1,
                                color: "white",
                                background: "#1976d2",
                                borderRadius: "8px",
                                width: 44,
                                height: 36,
                                p: 0,
                              }}
                            >
                              <ExpandMoreIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                            <Menu
                              anchorEl={serverMenuAnchor}
                              open={Boolean(serverMenuAnchor) && serverMenuAppId === app.id}
                              onClose={onCloseServerMenu}
                              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                              transformOrigin={{ vertical: "top", horizontal: "right" }}
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
                              {(app.servers || []).map((server, idx) => {
                                const label = `${app.title} - ${idx + 1}`;
                                const selectedServer = serverSelection[app.id];
                                const selected = isServerSelected(selectedServer, server, label);

                                return (
                                  <MenuItem
                                    key={`srv_${app.id}_${idx}`}
                                    onClick={() => onSelectServer(app.id, server)}
                                    sx={{ background: "inherit", "&:hover": { backgroundColor: "#1976d2" } }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      sx={{ width: "100%" }}
                                    >
                                      <Typography variant="body2" sx={{ color: "white" }}>
                                        {label}
                                      </Typography>
                                      {selected && <CheckIcon sx={{ fontSize: 16, color: "white" }} />}
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
                  onClick={() => onOpenUpgrade(app.domain)}
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

      {apps.length === 0 && (
        <Grid size={{ xs: 12 }}>
          <Typography color="white">Nothing to show</Typography>
        </Grid>
      )}
    </Grid>
  );
}
