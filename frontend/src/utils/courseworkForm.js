export const emptyCourseworkForm = {
  course: "",
  title: "",
  description: "",
  coursework_type: "assignment",
  submission_type: "individual",
  max_group_members: "",
  lock_at_due_time: false,
  deadline: "",
  max_marks: "",
};

export const validateMaxMarks = (rawValue) => {
  const maxMarksValue = String(rawValue ?? "").trim();
  if (!maxMarksValue) {
    return { ok: false, error: "Max Marks is required", value: null };
  }
  const numericMaxMarks = Number(maxMarksValue);
  if (Number.isNaN(numericMaxMarks) || numericMaxMarks <= 0) {
    return { ok: false, error: "Max Marks must be a positive number", value: null };
  }
  return { ok: true, error: "", value: numericMaxMarks };
};

export const toCourseworkPayload = (form) => ({
  ...form,
  course: Number(form.course),
  max_marks: Number(form.max_marks),
  max_group_members:
    form.submission_type === "group" || form.submission_type === "both"
      ? Number(form.max_group_members)
      : null,
  deadline: new Date(form.deadline).toISOString(),
});

export const toCourseworkEditForm = (row) => ({
  course: row.course,
  title: row.title,
  description: row.description,
  coursework_type: row.coursework_type,
  submission_type: row.submission_type,
  max_group_members: row.max_group_members || "",
  lock_at_due_time: Boolean(row.lock_at_due_time),
  deadline: row.deadline ? row.deadline.slice(0, 16) : "",
  max_marks: row.max_marks,
});
