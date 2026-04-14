import api from "../api/client";

export const toAbsoluteMediaUrl = (rawUrl) => {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const fallbackOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8000";
  const origin = new URL(api.defaults.baseURL, fallbackOrigin).origin;
  return `${origin}${String(rawUrl).startsWith("/") ? rawUrl : `/${rawUrl}`}`;
};
