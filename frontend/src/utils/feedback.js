import { fetchAllPages } from "./fetchAllPages";

export const buildFeedbackBySubmissionMap = (rows = []) => {
  const map = {};
  rows.forEach((item) => {
    map[String(item.submission)] = item;
  });
  return map;
};

export const fetchFeedbackBySubmissionMap = async (api, ENDPOINTS, pageSize = 500) => {
  const rows = await fetchAllPages(api, ENDPOINTS.feedback, { page_size: pageSize }, { skipGlobalLoader: true });
  return buildFeedbackBySubmissionMap(rows);
};
