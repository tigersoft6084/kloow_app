import { SnackbarType } from "utils/constants";
import { SHOW_SNACKBAR, HIDE_SNACKBAR } from "./actions";

export const initialState = {
  open: false,
  message: "Something went wrong",
  type: SnackbarType.Error,
};

const snackbar = (state = initialState, action) => {
  switch (action.type) {
    case SHOW_SNACKBAR: {
      const { message, type } = action.payload;
      return {
        open: true,
        message,
        type,
      };
    }
    case HIDE_SNACKBAR: {
      return {
        ...state,
        open: false,
      };
    }
    default: {
      return { ...state };
    }
  }
};
export default snackbar;
