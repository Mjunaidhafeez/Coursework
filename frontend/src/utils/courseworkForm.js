import { normalizeCourseworkType } from "./courseworkOptions";

export const emptyCourseworkForm = {
  course: "",
  title: "",
  description: "",
  coursework_type: "assignment",
  submission_type: "individual",
  max_group_members: "",
  lock_at_due_time: true,
  approval_required: false,
  topic_duplication_allowed: false,
  auto_approve_all_students: false,
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

export const validateCourseworkForm = (form) => {
  const errors = {};
  const course = String(form?.course || "").trim();
  const title = String(form?.title || "").trim();
  const deadline = String(form?.deadline || "").trim();
  const submissionType = String(form?.submission_type || "");
  const maxGroupMembersRaw = String(form?.max_group_members ?? "").trim();

  if (!course) {
    errors.course = "Course is required";
  }
  if (!title) {
    errors.title = "Title is required";
  }
  if (!deadline) {
    errors.deadline = "Deadline is required";
  }
  if (submissionType === "group" || submissionType === "both") {
    if (!maxGroupMembersRaw) {
      errors.max_group_members = "Max members is required for group/both submission type.";
    } else {
      const parsed = Number(maxGroupMembersRaw);
      if (Number.isNaN(parsed) || parsed < 2) {
        errors.max_group_members = "Max members should be at least 2.";
      }
    }
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
};

export const toCourseworkPayload = (form) => ({
  ...form,
  title: String(form.title || "").trim(),
  description: String(form.description || "").trim(),
  coursework_type: normalizeCourseworkType(form.coursework_type),
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
  approval_required: Boolean(row.approval_required),
  topic_duplication_allowed: Boolean(row.topic_duplication_allowed),
  auto_approve_all_students: Boolean(row.auto_approve_all_students),
  deadline: row.deadline ? row.deadline.slice(0, 16) : "",
  max_marks: row.max_marks,
});
