// project import
import React from "react";
import { HashRouter as Router } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";

import "./assets/css/index.css";
import "./assets/css/simplebar.css";

import { AuthProvider } from "./contexts/AuthContext";
import { SnackbarProvider } from "./contexts/SnackbarContext";
import theme from "./theme";
//Admin
import ProjectRoutes from "./route";
import Layout from "./layout";

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <SnackbarProvider>
          <AuthProvider>
            <Layout>
              <ProjectRoutes />
            </Layout>
          </AuthProvider>
        </SnackbarProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
