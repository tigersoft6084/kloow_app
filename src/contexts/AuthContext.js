import React, { createContext } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

import axios from "axios";

import useSnackbar from "../hooks/useSnackbar";

import { sleep } from "../utils/common";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const { errorMessage, successMessage } = useSnackbar();

  const axiosServices = axios.create({
    baseURL: "https://www.kloow.com/api/v1",
    headers: {
      "Content-Type": "application/json",
    },
  });

  // Add Authorization header with access token if available
  axiosServices.interceptors.request.use((config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  });

  axiosServices.interceptors.response.use(
    (response) => response,
    async (error) => {
      let originalRequest = error.config;

      // Handle 403 Forbidden error
      if (error.response?.status === 403) {
        errorMessage(error.response.data.message);
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        navigate("/auth/login");
        return Promise.reject(error);
      }

      // Handle 401 Unauthorized error
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshResult = await refreshAccessToken();
          if (refreshResult.status) {
            localStorage.setItem("isAuthenticated", "Y");
            originalRequest.headers.Authorization = `Bearer ${localStorage.getItem(
              "accessToken"
            )}`;
            return axiosServices(originalRequest);
          } else {
            localStorage.removeItem("isAuthenticated");
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            navigate("/auth/login");
            return Promise.reject(new Error("Token refresh failed"));
          }
        } catch (refreshError) {
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          navigate("/auth/login");
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  // Updated login function to handle JWT tokens in response
  const login = async (values) => {
    try {
      const response = await axiosServices.post("/login", values);

      if (response.data.authentication_success) {
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("refreshToken", response.data.refreshToken);
        localStorage.setItem("isAuthenticated", "Y");
        localStorage.setItem("user", JSON.stringify(response.data.user));
        await window.electronAPI.credentialStore(values.log, values.pwd);
        return { status: true, message: "Login successful" };
      }

      return {
        status: false,
        message: response.data.message || "Login failed",
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        status: false,
        message: error.response?.data?.message || "Authentication failed",
      };
    }
  };

  // Updated refresh token function to handle JWT tokens in response
  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        return { status: false, message: "No refresh token available" };
      }

      const response = await axiosServices.post("/refresh-token", {
        refreshToken,
      });

      if (response.data.authentication_success) {
        localStorage.setItem("accessToken", response.data.accessToken);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        return { status: true, message: "Token refreshed successfully" };
      }

      return {
        status: false,
        message: response.data.message || "Token refresh failed",
      };
    } catch (error) {
      console.error("Token refresh error:", error);
      return {
        status: false,
        message: error.response?.data?.message || "Token refresh failed",
      };
    }
  };

  const signup = async (values) => {
    console.log(values);
    await sleep(1000);
    return { status: true, data: "" };
  };

  const forgotPassword = async (values) => {
    console.log(values);
    await sleep(1000);
    return { status: true, data: "" };
  };

  const resetPassword = async (values) => {
    console.log(values);
    await sleep(1000);
    return { status: true, data: "" };
  };

  // Updated logout function
  const logout = async () => {
    try {
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      navigate("/auth/login");
      successMessage("Successfully logged out");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        axiosServices,
        login,
        signup,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node,
};

export default AuthContext;
