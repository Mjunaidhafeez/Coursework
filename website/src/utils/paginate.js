export const PAGE_SIZE = 24;

export const pageCountFor = (total, pageSize = PAGE_SIZE) => Math.max(1, Math.ceil((total || 0) / pageSize));

export const slicePage = (items = [], page = 1, pageSize = PAGE_SIZE) => {
  const pages = pageCountFor(items.length, pageSize);
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
};
