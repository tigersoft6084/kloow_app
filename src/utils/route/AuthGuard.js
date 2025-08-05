import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ==============================|| AUTH GUARD ||============================== //

const AuthGuard = ({ children }) => {
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "Y";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/auth/login");
    } else {
      navigate("/main/dashboard");
    }
  }, [isAuthenticated, navigate]);

  return children;
};

export default AuthGuard;
