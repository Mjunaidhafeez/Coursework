import { CircularProgress, Stack } from "@mui/material";
import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Stack>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
