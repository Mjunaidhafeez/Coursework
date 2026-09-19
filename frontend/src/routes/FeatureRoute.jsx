import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { usePortalSettings } from "../context/PortalSettingsContext";
import { ROLE_HOME_ROUTE } from "../utils/roleConfig";

const FeatureRoute = ({ feature, children }) => {
  const { user } = useAuth();
  const { isModuleOn, loading } = usePortalSettings();
  if (!loading && !isModuleOn(user?.role, feature)) {
    return <Navigate to={ROLE_HOME_ROUTE[user?.role] || "/login"} replace />;
  }
  return children || <Outlet />;
};

export default FeatureRoute;
