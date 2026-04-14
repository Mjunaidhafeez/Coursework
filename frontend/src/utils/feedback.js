export const buildFeedbackBySubmissionMap = (rows = []) => {
  const map = {};
  rows.forEach((item) => {
    map[String(item.submission)] = item;
  });
  return map;
};

export const fetchFeedbackBySubmissionMap = async (api, ENDPOINTS, pageSize = 2000) => {
  const { data } = await api.get(`${ENDPOINTS.feedback}?page_size=${pageSize}`);
  return buildFeedbackBySubmissionMap(data.results || []);
};
