import React from "react";
import { Outlet, useRoutes } from "react-router-dom";

import GuestGuard from "./utils/route/GuestGuard";
import AuthGuard from "./utils/route/AuthGuard";
import { MainProvider } from "./contexts/MainContext";

import Login from "./pages/auth/login";
import Signup from "./pages/auth/signup";
import ForgotPassword from "./pages/auth/forgot";
import ResetPassword from "./pages/auth/reset";

import Dashboard from "./pages/main/dashboard";

const redirectRoutes = {
  path: "",
  element: <AuthGuard />,
};

const AuthRoutes = {
  path: "/auth",
  element: (
    <GuestGuard>
      <Outlet />
    </GuestGuard>
  ),
  children: [
    {
      path: "login",
      element: <Login />,
    },
    {
      path: "signup",
      element: <Signup />,
    },
    {
      path: "forgot",
      element: <ForgotPassword />,
    },
    {
      path: "reset",
      element: <ResetPassword />,
    },
  ],
};

const MainRoutes = {
  path: "/main",
  element: (
    <GuestGuard>
      <MainProvider>
        <Outlet />
      </MainProvider>
    </GuestGuard>
  ),
  children: [
    {
      path: "dashboard",
      element: <Dashboard />,
    },
  ],
};

const ProjectRoutes = () => {
  return useRoutes([redirectRoutes, AuthRoutes, MainRoutes]);
};
export default ProjectRoutes;
