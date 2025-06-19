import React, { createContext, useReducer } from "react";
import PropTypes from "prop-types";

import { LOGIN, LOGOUT } from "../reducers/actions";
import authReducer, { initialState } from "../reducers/auth";

import { sleep } from "../utils/common";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = async (values) => {
    console.log(values);
    await sleep(1000);
    dispatch({ type: LOGIN, payload: { user: "ninjacoder0516@gmail.com" } });
    return { status: true, data: "" };
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
