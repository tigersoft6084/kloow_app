import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ==============================|| GUEST GUARD ||============================== //

const GuestGuard = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "Y";

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/main/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return children;
};

export default GuestGuard;
