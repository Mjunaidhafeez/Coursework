import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { ROLE_HOME_ROUTE } from "../utils/roleConfig";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const normalizeUser = (nextUser) => {
    if (!nextUser) return null;
    let avatar = nextUser.avatar || null;
    if (avatar && !/^https?:\/\//i.test(avatar)) {
      const origin = new URL(
        api.defaults.baseURL,
        typeof window !== "undefined" ? window.location.origin : "http://localhost:8000"
      ).origin;
      avatar = `${origin}${avatar.startsWith("/") ? avatar : `/${avatar}`}`;
    }
    const fullName = nextUser.full_name || `${nextUser.first_name || ""} ${nextUser.last_name || ""}`.trim() || nextUser.username;
    return {
      ...nextUser,
      full_name: fullName,
      avatar,
      avatar_cache_key: avatar ? Date.now() : null,
    };
  };

  const [user, setUser] = useState(() => normalizeUser(JSON.parse(localStorage.getItem("auth_user") || "null")));
  const [loading, setLoading] = useState(true);

  const applyUser = (nextUser) => {
    const normalized = normalizeUser(nextUser);
    setUser(normalized);
    localStorage.setItem("auth_user", JSON.stringify(normalized));
  };

  const refreshMe = async () => {
    const { data } = await api.get(ENDPOINTS.auth.me);
    applyUser(data);
    return data;
  };

  useEffect(() => {
    const access = localStorage.getItem("access_token");
    if (!access) {
      setLoading(false);
      return;
    }
    refreshMe()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post(ENDPOINTS.auth.login, { username, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    applyUser(data.user);
    navigate(ROLE_HOME_ROUTE[data.user.role] || "/login");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    navigate("/login");
  };

  const value = useMemo(() => ({ user, loading, login, logout, refreshMe, setUser: applyUser }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
