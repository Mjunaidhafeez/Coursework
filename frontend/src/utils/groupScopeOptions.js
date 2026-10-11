export const GROUP_SCOPE_OPTIONS = [
  { value: "global", label: "Overall class group" },
  { value: "course", label: "This course" },
  { value: "coursework", label: "This assessment" },
];

export const describeGroupScope = (group = {}) => {
  const org = [
    group.semester_number ? `Sem ${group.semester_number}` : group.course_semester ? `Sem ${group.course_semester}` : "",
    group.department_name || group.course_department || "",
    group.school_class_name || "",
    group.section_name || "",
  ].filter(Boolean);
  if (group.coursework_title) {
    return [group.coursework_title, group.course_title, ...org].filter(Boolean).join(" · ");
  }
  if (group.course_title) {
    return [group.course_title, ...org].filter(Boolean).join(" · ");
  }
  return org.join(" · ") || "Overall class group";
};
