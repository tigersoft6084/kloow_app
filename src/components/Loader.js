import React from "react";
// material-ui
import { styled } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";

// loader style
const LoaderWrapper = styled("div")(({ theme }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 2001,
  width: "100%",
  height: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.15)",
  "& > * + *": {
    marginTop: theme.spacing(2),
  },
}));

const Loader = () => (
  <LoaderWrapper>
    <CircularProgress color="primary" />
  </LoaderWrapper>
);

export default Loader;
