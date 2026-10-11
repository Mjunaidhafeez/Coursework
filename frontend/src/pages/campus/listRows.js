export const listRows = (data) => data?.results || (Array.isArray(data) ? data : []);

export const settledRows = (result) => (result.status === "fulfilled" ? listRows(result.value?.data) : []);

export const fetchOrgCatalog = async (api, endpoints) => {
  const results = await Promise.allSettled([
    api.get(`${endpoints.semesters}?ordering=number&page_size=100`),
    api.get(`${endpoints.departments}?page_size=200`),
    api.get(`${endpoints.schoolClasses}?page_size=200`),
    api.get(`${endpoints.sections}?page_size=200`),
    api.get(`${endpoints.courses}?page_size=200`),
  ]);
  return {
    semesters: settledRows(results[0]),
    departments: settledRows(results[1]),
    classes: settledRows(results[2]),
    sections: settledRows(results[3]),
    courses: settledRows(results[4]),
  };
};
