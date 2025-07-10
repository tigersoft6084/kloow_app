import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import { APP_LIST_WITH_PROXY } from "../reducers/actions";
import MainReducer, { initialState } from "../reducers/main";

const MainContext = createContext(null);

export const MainProvider = ({ children }) => {
  const [state, dispatch] = useReducer(MainReducer, initialState);

  const getAppList = async () => {
    try {
      // Retrieve cookies for the WordPress site
      const cookies = await window.electronAPI.getCookies({
        domain: "maserver.click",
      });

      // Find the wordpress_logged_in_... cookie
      const wpCookie = cookies.find((cookie) =>
        cookie.name.startsWith("wordpress_logged_in_")
      );
      const wordpressCookies = wpCookie
        ? `${wpCookie.name}=${wpCookie.value}`
        : "";
      const wpnonceCookie = cookies.find((cookie) =>
        cookie.name.startsWith("wpnonce")
      );

      if (!wordpressCookies) {
        return { success: false, error: "Authentication cookie not found" };
      }
      const response = await axios.post(
        "https://herzliyaserver.click/api/apps/get-apps",
        {
          rootUrl: "https://maserver.click",
          wordpressCookies: decodeURI(wordpressCookies),
          nonce: wpnonceCookie.value,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      dispatch({
        type: APP_LIST_WITH_PROXY,
        payload: { appList: response.data.appList },
      });
      return { status: true, message: "" };
    } catch (error) {
      return { status: false, message: error.message };
    }
  };

  return (
    <MainContext.Provider
      value={{
        ...state,
        getAppList,
      }}
    >
      {children}
    </MainContext.Provider>
  );
};

MainProvider.propTypes = {
  children: PropTypes.node,
};

export default MainContext;
