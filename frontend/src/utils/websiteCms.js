export const uniqueUrls = (urls = []) => {
  const seen = new Set();
  const out = [];
  urls.forEach((url) => {
    const value = String(url || "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
};

export const mergeUploadedUrls = (current = [], incoming = []) => uniqueUrls([...(current || []), ...(incoming || [])]);

export const coverAndExtras = (urls = []) => {
  const images = uniqueUrls(urls);
  return { image_url: images[0] || "", image_urls: images.slice(1), images };
};

export const uploadWebsiteFiles = async (api, endpoint, files) => {
  const list = Array.from(files || []).filter(Boolean);
  if (!list.length) return [];
  const payload = new FormData();
  list.forEach((file) => payload.append("files", file));
  const { data } = await api.post(endpoint, payload, { headers: { "Content-Type": "multipart/form-data" } });
  if (Array.isArray(data?.urls) && data.urls.length) return uniqueUrls(data.urls);
  if (data?.url) return [data.url];
  return [];
};
