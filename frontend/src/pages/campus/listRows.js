export const listRows = (data) => data?.results || (Array.isArray(data) ? data : []);
