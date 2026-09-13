export const fetchAllPages = async (api, path, params = {}, config = {}) => {
  const pageSize = Number(params.page_size) || 500;
  const rows = [];
  let page = 1;

  while (true) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      search.append(key, String(value));
    });
    search.set("page", String(page));
    search.set("page_size", String(pageSize));
    const { data } = await api.get(`${path}?${search.toString()}`, config);
    const batch = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
    rows.push(...batch);
    if (!data?.next || !batch.length) break;
    page += 1;
  }

  return rows;
};
