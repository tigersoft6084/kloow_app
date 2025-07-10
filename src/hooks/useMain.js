import { useContext } from "react";

// Main provider
import MainContext from "../contexts/MainContext";

const useMain = () => {
  const context = useContext(MainContext);

  if (!context) throw new Error("context must be use inside provider");

  return context;
};

export default useMain;
