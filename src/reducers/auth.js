// action - state management
import { LOGIN, LOGOUT } from "./actions";

// initial state
export const initialState = {
  user: null,
  isLoggedIn: false,
};

const auth = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN: {
      const { user } = action.payload;
      return {
        ...state,
        user,
        isLoggedIn: true,
      };
    }
    case LOGOUT: {
      return {
        user: null,
        isLoggedIn: false,
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default auth;
