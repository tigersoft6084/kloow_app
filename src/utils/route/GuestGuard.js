import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// project import
import useAuth from "../../hooks/useAuth";

// ==============================|| GUEST GUARD ||============================== //

const GuestGuard = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/main/dashboard", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  return children;
};

export default GuestGuard;
