export const getUserDisplayName = (user, options = {}) => {
  const { includeUsername = false } = options;
  if (!user) return "";
  const first = (user.first_name || "").trim();
  const last = (user.last_name || "").trim();
  const combined = `${first} ${last}`.trim();
  const fallbackName = (user.full_name || "").trim() || (user.student_name || "").trim();
  const username = (user.username || "").trim();

  const baseName = combined || fallbackName || username || String(user.id || "");
  if (!includeUsername || !username || baseName === username) return baseName;
  return `${baseName} (${username})`;
};
