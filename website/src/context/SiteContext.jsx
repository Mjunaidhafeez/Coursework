import { createContext, useContext, useEffect, useState } from "react";

import api from "../api";

const SiteContext = createContext(null);

const FALLBACK = {
  site_name: "University",
  tagline: "",
  primary_color: "#102a5c",
  accent_color: "#c9a227",
  secondary_color: "#8c1d2c",
  header_color: "#0b1c40",
  footer_color: "#071428",
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
  page_flags: {},
  nav: [],
  pages: {},
  announcements: [],
  gallery: [],
  downloads: [],
  teachers: [],
  alumni: [],
  results: [],
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
    const root = document.documentElement;
    root.style.setProperty("--site-primary", site.primary_color || "#102a5c");
    root.style.setProperty("--site-accent", site.accent_color || "#c9a227");
    root.style.setProperty("--site-secondary", site.secondary_color || "#8c1d2c");
    root.style.setProperty("--site-header", site.header_color || "#0b1c40");
    root.style.setProperty("--site-footer", site.footer_color || "#071428");
    document.title = site.site_name || "University";
  }, [site]);

  return <SiteContext.Provider value={{ site, loading }}>{children}</SiteContext.Provider>;
};

export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used inside SiteProvider");
  return ctx;
};
