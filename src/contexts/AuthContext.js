import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { LOGIN, LOGOUT } from "../reducers/actions";
import authReducer, { initialState } from "../reducers/auth";

import { sleep } from "../utils/common";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const extractErrorMessage = (htmlString) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, "text/html");
    const contentDiv = doc.querySelector(
      ".wc-block-components-notice-banner__content"
    );
    return contentDiv ? contentDiv.textContent.trim() : null;
  };

  const getLoginNonce = async () => {
    try {
      const response = await fetch("https://maserver.click/my-account-2/");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const htmlContent = await response.text();
      const regex = /id="woocommerce-login-nonce"[^>]*value="([^"]+)"/;
      const match = htmlContent.match(regex);
      if (match && match[1]) {
        return match[1];
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };
  // Function to extract _wpnonce from HTML using regex
  const extractWpNonce = (html) => {
    try {
      // Regex to match the logout link and capture _wpnonce
      const regex = /wp\.apiFetch\.createNonceMiddleware\s*\(\s*"([^"]+)"\s*\)/;
      const match = html.match(regex);

      if (match && match[1]) {
        return match[1]; // Captured _wpnonce value
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const login = async (values) => {
    try {
      const urlEncodedData = Object.entries(values)
        .map(
          ([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(value.toString())}`
        )
        .join("&");

      let response = await fetch("https://maserver.click/my-account-2", {
        method: "POST",
        body: urlEncodedData,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        credentials: "include",
      });

      const responseBody = await response.text();

      if (response.redirected) {
        const wpnonce = extractWpNonce(responseBody);
        if (wpnonce) {
          await window.electronAPI.setCookie({
            name: "wpnonce",
            value: wpnonce,
            url: "https://maserver.click",
          });
        }
        dispatch({ type: LOGIN, payload: { user: values.username } });
        return { status: true, message: "" };
      } else {
        return { status: false, message: extractErrorMessage(responseBody) };
      }
    } catch (error) {
      return { status: false, message: `${error.name}: ${error.message}` };
    }
  };

  const signup = async (values) => {
    await sleep(1000);
    return { status: true, data: "" };
  };

  const forgotPassword = async (values) => {
    await sleep(1000);
    return { status: true, data: "" };
  };

  const resetPassword = async (values) => {
    await sleep(1000);
    return { status: true, data: "" };
  };

  const logout = async () => {
    dispatch({ type: LOGOUT });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        getLoginNonce,
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
