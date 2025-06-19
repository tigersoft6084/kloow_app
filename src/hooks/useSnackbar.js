import { useContext } from "react";

// snackbar provider
import SnackbarContext from "../contexts/SnackbarContext";

const useSnackbar = () => {
  const context = useContext(SnackbarContext);

  if (!context) throw new Error("context must be use inside provider");

  return context;
};

export default useSnackbar;
