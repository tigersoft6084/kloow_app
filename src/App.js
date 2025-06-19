// project import
import React from "react";
import { HashRouter as Router } from "react-router-dom";

import "./assets/css/index.css";
import "./assets/css/simplebar.css";

import { AuthProvider } from "./contexts/AuthContext";
import { SnackbarProvider } from "./contexts/SnackbarContext";
//Admin
import ProjectRoutes from "./route";
import Layout from "./layout";

const App = () => {
  return (
    <Router>
      <SnackbarProvider>
        <AuthProvider>
          <Layout>
            <ProjectRoutes />
          </Layout>
        </AuthProvider>
      </SnackbarProvider>
    </Router>
  );
};

export default App;
