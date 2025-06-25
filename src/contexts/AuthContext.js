import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { LOGIN, LOGOUT } from "../reducers/actions";
import authReducer, { initialState } from "../reducers/auth";

import { sleep } from "../utils/common";
import axios from "axios";

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
        console.log("Extracted nonce value:", match[1]); // Outputs: 4d5a45443b
        return match[1];
      } else {
        console.log("Nonce value not found");
        return "4d5a45443b";
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      return "4d5a45443b";
    }
  };

  const login = async (values) => {
    try {
      const formData = new FormData();
      for (const key in values) {
        formData.append(key, values[key]);
      }

      const response = await fetch("https://maserver.click/my-account-2/", {
        method: "POST",
        body: formData,
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", // Prefer non-HTML response
        },
        redirect: "manual", // Prevent automatic redirects
      });

      const responseBody = await response.text();

      if (response.ok) {
        // Failed login: WordPress returns 200 with error message (likely HTML)
        return { status: false, message: extractErrorMessage(responseBody) };
      } else {
        // Success to login. No need to redirect.
        dispatch({ type: LOGIN, payload: { user: values.username } });
        return { status: true, message: "" };
      }
    } catch (error) {
      return { status: false, message: `${error.name}: ${error.message}` };
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
