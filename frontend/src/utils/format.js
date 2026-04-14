export const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatMarks = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return Number.isInteger(numericValue) ? String(numericValue) : String(numericValue);
};
