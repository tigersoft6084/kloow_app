import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { APP_LIST_WITH_PROXY, SEARCH_APPLICATION } from "../reducers/actions";
import MainReducer, { initialState } from "../reducers/main";
import useAuth from "../hooks/useAuth";

const MainContext = createContext(null);

export const MainProvider = ({ children }) => {
  const { axiosServices } = useAuth();

  const [state, dispatch] = useReducer(MainReducer, initialState);

  const getLatestInfo = async () => {
    try {
      const response = await axiosServices.get(`https://www.kloow.com/download/latest.json`);
      return response.data;
    } catch (error) {
      return null;
    }
  };

  const getAppList = async () => {
    try {
      const response = await axiosServices.get("/app_list");
      dispatch({
        type: APP_LIST_WITH_PROXY,
        payload: { appList: response.data.appList },
      });
      return response.data.appList;
    } catch (error) {
      return [];
    }
  };

  const frogStatus = async () => {
    try {
      const response = await axiosServices.get("/frog_status");
      return response.data.frog;
    } catch (error) {
      return false;
    }
  }

  const checkHealth = async (serverSelection) => {
    try {
      const response = await axiosServices.post('/check-seocromom-health', { serverSelection });
      return response.data.healthStatuses;
    } catch (error) {
      return null;
    }
  }

  const setSearchPattern = (searchPattern) => {
    dispatch({
      type: SEARCH_APPLICATION,
      payload: { searchPattern },
    });
  };

  const setLog = async (id) => {
    try {
      const response = await axiosServices.post("/logs", { id });
      dispatch({
        type: APP_LIST_WITH_PROXY,
        payload: { appList: response.data.appList },
      });
    } catch (error) {
      return {
        status: false,
        message: error.response?.data?.message || error.message,
      };
    }
  };

  const setFavorite = async (id) => {
    try {
      const response = await axiosServices.post("/favorites", { id });
      dispatch({
        type: APP_LIST_WITH_PROXY,
        payload: { appList: response.data.appList },
      });
    } catch (error) {
      return {
        status: false,
        message: error.response?.data?.message || error.message,
      };
    }
  };

  return (
    <MainContext.Provider
      value={{
        ...state,
        getLatestInfo,
        checkHealth,
        frogStatus,
        getAppList,
        setSearchPattern,
        setLog,
        setFavorite,
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
