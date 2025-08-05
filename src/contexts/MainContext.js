import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { APP_LIST_WITH_PROXY } from "../reducers/actions";
import MainReducer, { initialState } from "../reducers/main";
import useAuth from "../hooks/useAuth";

const MainContext = createContext(null);

export const MainProvider = ({ children }) => {
  const { axiosServices } = useAuth();

  const [state, dispatch] = useReducer(MainReducer, initialState);

  const getAppList = async () => {
    try {
      const response = await axiosServices.post("/app_list", {
        rootUrl: "https://maserver.click",
      });
      dispatch({
        type: APP_LIST_WITH_PROXY,
        payload: { appList: response.data.appList },
      });
      return { status: true, message: "" };
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
