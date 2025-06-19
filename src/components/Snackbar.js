import React from "react";
import { Alert, Snackbar as MuiSnackbar } from "@mui/material";
import useSnackbar from "../hooks/useSnackbar";

const Snackbar = () => {
  const { open, message, type, closeSnackbar } = useSnackbar();
  return (
    <MuiSnackbar
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      open={open}
      autoHideDuration={4000}
      onClose={closeSnackbar}
    >
      <Alert
        variant="filled"
        severity={type}
        onClose={closeSnackbar}
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </MuiSnackbar>
  );
};

export default Snackbar;
