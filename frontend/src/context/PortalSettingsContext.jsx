import { createContext, useContext, useEffect, useMemo, useState } from "react";

import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";

const PortalSettingsContext = createContext(null);

const FALLBACK = {
  app_name: "MBA Coursework Portal",
  university_name: "Superior University Lahore",
  tagline: "Student Assessment Tracking",
  login_subtitle: "Sign in to manage coursework, submissions, and results.",
  footer_text: "Developed by : Junaid Hafeez (SVL) MBA NON Business 2025-2027",
  sidebar_title: "",
  admin_header: "Student Assessment Submission Portal",
  teacher_header: "Teacher Dashboard",
  student_header: "Student Dashboard",
  login_button_text: "Sign in",
  theme: "navy",
  logo_url: "",
  login_background_url: "",
  modules: {
    teacher: {
      courses: true,
      coursework: true,
      groups: true,
      submissions: true,
      grading: true,
      email: true,
      whatsapp: true,
      messages: true,
      calendar: true,
      attendance: true,
      appeals: true,
      help: true,
      templates: true,
      comments: true,
      queue: true,
      rubric: true,
    },
    student: {
      courses: true,
      groups: true,
      grades: true,
      submit: true,
      messages: true,
      calendar: true,
      attendance: true,
      transcript: true,
      appeals: true,
      help: true,
      deadlines: true,
    },
  },
  labels: {},
  weekly_digest: false,
};

export const PortalSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  const apply = (data) => {
    setSettings({
      ...FALLBACK,
      ...data,
      modules: { ...FALLBACK.modules, ...(data?.modules || {}) },
      labels: data?.labels || {},
    });
  };

  const refresh = async () => {
    const { data } = await api.get(ENDPOINTS.portalSettingsPublic, { skipGlobalLoader: true });
    apply(data);
    return data;
  };

  useEffect(() => {
    refresh()
      .catch(() => apply(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  const isModuleOn = (role, key) => {
    if (!key || key === "dashboard" || key === "settings") return true;
    if (role === "super_admin") return true;
    const group = role === "teacher" ? settings.modules?.teacher : role === "student" ? settings.modules?.student : null;
    if (!group) return true;
    return group[key] !== false;
  };

  const labelFor = (role, key, fallback) => {
    const groupKey = role === "super_admin" ? "admin" : role;
    return settings.labels?.[groupKey]?.[key] || fallback;
  };

  const headerFor = (role) => {
    if (role === "teacher") return settings.teacher_header;
    if (role === "student") return settings.student_header;
    return settings.admin_header;
  };

  const value = useMemo(
    () => ({ settings, loading, refresh, apply, isModuleOn, labelFor, headerFor }),
    [settings, loading]
  );

  return <PortalSettingsContext.Provider value={value}>{children}</PortalSettingsContext.Provider>;
};

export const usePortalSettings = () => {
  const ctx = useContext(PortalSettingsContext);
  if (!ctx) throw new Error("usePortalSettings must be used inside PortalSettingsProvider");
  return ctx;
};
