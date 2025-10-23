// action - state management
import { APP_LIST_WITH_PROXY, SEARCH_APPLICATION } from "./actions";

// initial state
export const initialState = {
  appList: [],
  searchPattern: "",
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
    case SEARCH_APPLICATION: {
      const { searchPattern } = action.payload;
      return {
        ...state,
        searchPattern,
      };
    }
    default: {
      return { ...state };
    }
  }
};

export default main;
