import { Navigate } from "react-router-dom";

import { useSite } from "../context/SiteContext";

const PageGuard = ({ pageKey, children }) => {
  const { site, loading } = useSite();
  if (loading) return null;
  if (pageKey !== "home" && site.page_flags?.[pageKey] === false) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default PageGuard;
