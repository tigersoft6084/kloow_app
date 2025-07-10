// action - state management
import { APP_LIST_WITH_PROXY } from "./actions";

// initial state
export const initialState = {
  appList: [],
};

const main = (state = initialState, action) => {
  switch (action.type) {
    case APP_LIST_WITH_PROXY: {
      const { appList } = action.payload;
      return {
        ...state,
        appList,
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default main;
