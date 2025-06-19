import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { HIDE_SNACKBAR, SHOW_SNACKBAR } from "../reducers/actions";
import snackbarReducer, { initialState } from "../reducers/snackbar";

import { SnackbarType } from "../utils/constants";

const SnackbarContext = createContext(null);

export const SnackbarProvider = ({ children }) => {
  const [state, dispatch] = useReducer(snackbarReducer, initialState);

  const closeSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    dispatch({ type: HIDE_SNACKBAR });
  };

  const openSnackbar = (type, message) => {
    dispatch({ type: SHOW_SNACKBAR, payload: { message, type } });
  };

  const successMessage = (message) => {
    openSnackbar(SnackbarType.Success, message);
  };

  const errorMessage = (message) => {
    openSnackbar(SnackbarType.Error, message);
  };

  return (
    <SnackbarContext.Provider
      value={{
        ...state,
        closeSnackbar,
        successMessage,
        errorMessage,
      }}
    >
      {children}
    </SnackbarContext.Provider>
  );
};

SnackbarProvider.propTypes = {
  children: PropTypes.node,
};

export default SnackbarContext;
