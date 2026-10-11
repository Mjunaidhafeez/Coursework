export const GROUP_SCOPE_OPTIONS = [
  { value: "global", label: "Overall class group" },
  { value: "course", label: "This course" },
  { value: "coursework", label: "This assessment" },
];

export const describeGroupScope = (group = {}) => {
  if (group.coursework_title) {
    return [group.coursework_title, group.course_title, group.course_semester ? `Sem ${group.course_semester}` : ""]
      .filter(Boolean)
      .join(" · ");
  }
  if (group.course_title) {
    return [group.course_title, group.course_semester ? `Sem ${group.course_semester}` : "", group.course_department || ""]
      .filter(Boolean)
      .join(" · ");
  }
  return "Overall class group";
};
