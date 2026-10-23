export const assessmentDeadlineMs = (item) => {
  if (!item?.deadline) return null;
  const ms = new Date(item.deadline).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const isAssessmentOpen = (item, now = Date.now()) => {
  const ms = assessmentDeadlineMs(item);
  return ms == null || ms >= now;
};

export const upcomingSortKey = (item, now = Date.now()) => {
  const ms = assessmentDeadlineMs(item);
  if (ms == null) return Number.MAX_SAFE_INTEGER;
  return ms >= now ? ms : ms + 1e15;
};

export const closedSortKey = (item) => -(assessmentDeadlineMs(item) || 0);

export const sortAssessmentTitlesByWindow = (titles, courseworkGroup, courseworkById, viewMode = "opening") =>
  [...titles].sort((left, right) => {
    const leftCw = courseworkById?.[String(courseworkGroup?.[left]?.[0]?.coursework)];
    const rightCw = courseworkById?.[String(courseworkGroup?.[right]?.[0]?.coursework)];
    return viewMode === "closed"
      ? closedSortKey(leftCw) - closedSortKey(rightCw)
      : upcomingSortKey(leftCw) - upcomingSortKey(rightCw);
  });
