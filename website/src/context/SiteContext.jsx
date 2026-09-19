import { createContext, useContext, useEffect, useState } from "react";

import api from "../api";

const SiteContext = createContext(null);

const FALLBACK = {
  site_name: "University",
  tagline: "",
  primary_color: "#102a5c",
  accent_color: "#c9a227",
  logo_url: "",
  hero_image_url: "",
  show_login_button: true,
  login_path: "/login",
  login_label: "Student / Staff Login",
  footer_text: "",
  phone: "",
  email: "",
  address: "",
  facebook: "",
  twitter: "",
  instagram: "",
  youtube: "",
  nav: [
    { label: "Home", path: "/" },
    { label: "About", path: "/about" },
    { label: "VC Message", path: "/vc" },
    { label: "Programs", path: "/programs" },
    { label: "Admissions", path: "/admissions" },
    { label: "Announcements", path: "/announcements" },
    { label: "Gallery", path: "/gallery" },
    { label: "Downloads", path: "/downloads" },
  ],
  pages: {},
  announcements: [],
  gallery: [],
  downloads: [],
};

export const SiteProvider = ({ children }) => {
  const [site, setSite] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/website/public/")
      .then((res) => setSite({ ...FALLBACK, ...res.data }))
      .catch(() => setSite(FALLBACK))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--site-primary", site.primary_color || "#102a5c");
    document.documentElement.style.setProperty("--site-accent", site.accent_color || "#c9a227");
    document.title = site.site_name || "University";
  }, [site]);

  return <SiteContext.Provider value={{ site, loading }}>{children}</SiteContext.Provider>;
};

export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
};
