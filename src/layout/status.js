import React from "react";
import { Stack, Typography, Box, useTheme } from "@mui/material";
const NetworkStatus = () => {
  const theme = useTheme();
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Typography variant="body2">Network Connection</Typography>
      <Box
        sx={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: navigator.onLine
            ? theme.palette.primary.main
            : theme.palette.error.main,
        }}
      />
    </Stack>
  );
};

export default NetworkStatus;
