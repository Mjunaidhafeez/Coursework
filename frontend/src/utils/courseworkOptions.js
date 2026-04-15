export const normalizeCourseworkType = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const COURSEWORK_TYPE_OPTIONS = [
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "presentation", label: "Presentation" },
  { value: "project", label: "Project" },
  { value: "certification", label: "Certification" },
];

export const SUBMISSION_TYPE_OPTIONS = [
  { value: "individual", label: "Individual" },
  { value: "group", label: "Group" },
  { value: "both", label: "Both (Student Choice)" },
];

export const humanizeCourseworkType = (value) => {
  const normalized = normalizeCourseworkType(value);
  if (!normalized) return "";
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
};

export const buildCourseworkTypeOptions = (extraValues = []) => {
  const map = new Map();
  COURSEWORK_TYPE_OPTIONS.forEach((item) => map.set(normalizeCourseworkType(item.value), item.label));
  (extraValues || []).forEach((value) => {
    const normalized = normalizeCourseworkType(value);
    if (!normalized || map.has(normalized)) return;
    map.set(normalized, humanizeCourseworkType(normalized));
  });
  return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
};
