import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// project import
import useAuth from "../../hooks/useAuth";

// ==============================|| AUTH GUARD ||============================== //

const AuthGuard = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/auth/login", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return children;
};

export default AuthGuard;
