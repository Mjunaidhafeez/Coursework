import api from "../api/client";
import { confirmBulkDelete } from "./confirm";

export const postBulkDelete = (endpoint, ids) => api.post(`${endpoint}bulk_delete/`, { ids });

export const postBulkUpdate = (endpoint, ids, fields) => api.post(`${endpoint}bulk_update/`, { ids, fields });

export const runBulkDelete = async ({ endpoint, ids, label = "records" }) => {
  if (!ids.length) return { ok: false };
  if (!confirmBulkDelete(ids.length, label)) return { ok: false };
  const { data } = await postBulkDelete(endpoint, ids);
  return { ok: true, data };
};
