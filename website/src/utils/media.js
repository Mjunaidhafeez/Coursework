export const itemImages = (item) => {
  const urls = [];
  const push = (url) => {
    const value = String(url || "").trim();
    if (value && !urls.includes(value)) urls.push(value);
  };
  (item?.images || []).forEach(push);
  push(item?.image_url);
  (item?.image_urls || []).forEach(push);
  return urls;
};
