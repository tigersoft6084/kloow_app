import React from "react";
import {
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  OutlinedInput,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

import ProfileIcon from "../../../../assets/icons/profile.png";
import LogoutIcon from "../../../../assets/icons/logout.png";
import SearchIcon from "../../../../assets/icons/search.png";
import SettingsIcon from "../../../../assets/icons/settings.png";
import LoginIcon from "../../../../assets/icons/login.png";
import RefreshIcon from "../../../../assets/icons/refresh.png";
import LogoWithTitle from "../../../../assets/images/logo_title.png";

import { getItemTitle } from "../helpers";

const iconButtonHoverSx = { color: "white", p: 0 };

export default function DashboardHeader({
  searchPattern,
  onSearchChange,
  onRefresh,
  update,
  profileMenuAnchor,
  profileMenuOpen,
  onOpenProfileMenu,
  onCloseProfileMenu,
  onOpenSettings,
  onLogout,
  appList,
  onRunFavorite,
  onToggleFavorite,
  addFavoriteAnchor,
  addFavoriteMenuOpen,
  onOpenAddFavoriteMenu,
  onCloseAddFavoriteMenu,
  getItemImg,
}) {
  return (
    <Stack spacing={0} sx={{ width: "100%", zIndex: 2, maxWidth: 1447, mx: "auto" }}>
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
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search applications..."
          startAdornment={
            <InputAdornment position="start">
              <img src={SearchIcon} alt="search" style={{ width: 16, height: 16 }} />
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
          <Tooltip title="Refresh apps">
            <IconButton onClick={onRefresh} sx={iconButtonHoverSx}>
              <img src={RefreshIcon} alt="refresh" style={{ width: 34, height: 34 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={update ? "Update Available" : "Account Settings"}>
            <Badge variant="dot" color="error" invisible={!update}>
              <IconButton
                onClick={onOpenProfileMenu}
                aria-controls={profileMenuOpen ? "profile-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={profileMenuOpen ? "true" : undefined}
                sx={iconButtonHoverSx}
              >
                <img src={ProfileIcon} alt="profile" style={{ width: 34, height: 34 }} />
              </IconButton>
            </Badge>
          </Tooltip>
          <Tooltip title="Log Out">
            <IconButton onClick={onLogout} sx={iconButtonHoverSx}>
              <img src={LogoutIcon} alt="logout" style={{ width: 34, height: 34 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <Menu
          id="profile-menu"
          anchorEl={profileMenuAnchor}
          open={profileMenuOpen}
          onClose={onCloseProfileMenu}
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
          <Typography sx={{ color: "white", px: 2, py: 1 }}>Profile settings</Typography>
          <MenuItem
            onClick={() => {
              onOpenSettings();
              onCloseProfileMenu();
            }}
            sx={{ color: "white", "&:hover": { backgroundColor: "#1976d2" } }}
          >
            <Badge
              variant="dot"
              color="error"
              invisible={!update}
              overlap="rectangular"
              anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <Stack direction="row" alignItems="center" spacing={1}>
                <img src={SettingsIcon} alt="settings" style={{ width: 24, height: 24 }} />
                <Typography variant="body2">Account Settings</Typography>
              </Stack>
            </Badge>
          </MenuItem>
          <MenuItem onClick={onLogout} sx={{ color: "white", "&:hover": { backgroundColor: "#1976d2" } }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <img src={LoginIcon} alt="logout" style={{ width: 24, height: 24 }} />
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
                onClick={() => onRunFavorite(app)}
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
                onClick={onOpenAddFavoriteMenu}
                sx={{
                  color: "white",
                  borderRadius: "50%",
                  backgroundColor: "rgba(51, 51, 51, 0.65)",
                  "&:hover": {
                    backgroundColor: "rgba(51, 51, 51, 0.85)",
                  },
                  width: 30,
                  height: 30,
                }}
              >
                {addFavoriteMenuOpen ? (
                  <CloseIcon sx={{ fontSize: 18 }} />
                ) : (
                  <AddIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
              <Menu
                anchorEl={addFavoriteAnchor}
                open={addFavoriteMenuOpen}
                onClose={onCloseAddFavoriteMenu}
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
                    Add a favorite
                  </Typography>
                </MenuItem>
                {appList
                  ?.filter((app) => !app?.isFavorite)
                  .map((app, idx) => (
                    <MenuItem
                      key={`add_${idx}`}
                      onClick={() => {
                        onToggleFavorite(app?.id);
                        onCloseAddFavoriteMenu();
                      }}
                      sx={{ color: "white", "&:hover": { backgroundColor: "#1976d2" } }}
                    >
                      <Box sx={{ width: 24, height: 24, mr: 1 }}>
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
  );
}
