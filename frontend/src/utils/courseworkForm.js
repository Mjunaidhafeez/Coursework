import { normalizeCourseworkType } from "./courseworkOptions";

export const TOPIC_SOURCE_STUDENT = "student";
export const TOPIC_SOURCE_TEACHER_STUDENT = "teacher_student";
export const TOPIC_SOURCE_TEACHER_GROUP = "teacher_group";

export const TOPIC_SOURCE_OPTIONS = [
  { value: TOPIC_SOURCE_STUDENT, label: "Students choose their topic" },
  { value: TOPIC_SOURCE_TEACHER_STUDENT, label: "I will allot a topic to each student" },
  { value: TOPIC_SOURCE_TEACHER_GROUP, label: "I will allot a topic to each group" },
];

export const topicSourceLabel = (value) =>
  TOPIC_SOURCE_OPTIONS.find((option) => option.value === value)?.label || TOPIC_SOURCE_OPTIONS[0].label;

export const shouldAllotTopics = (row) =>
  [TOPIC_SOURCE_TEACHER_STUDENT, TOPIC_SOURCE_TEACHER_GROUP].includes(String(row?.topic_source || ""));

export const topicSourceOptionsFor = (submissionType) =>
  TOPIC_SOURCE_OPTIONS.filter(
    (option) => option.value !== TOPIC_SOURCE_TEACHER_GROUP || submissionType === "group" || submissionType === "both"
  );

export const applyTopicSource = (prev, topicSource) => {
  const next = { ...prev, topic_source: topicSource };
  if (topicSource !== TOPIC_SOURCE_STUDENT) {
    next.approval_required = false;
    next.topic_duplication_allowed = false;
    next.auto_approve_all_students = false;
  }
  return next;
};

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
  topic_source: TOPIC_SOURCE_STUDENT,
  deadline: "",
  max_marks: "",
  sample_file: null,
  sample_file_url: "",
  sample_file_name: "",
  sample_file_title: "",
};

export const validateMaxMarks = (rawValue) => {
  const maxMarksValue = String(rawValue ?? "").trim();
  if (!maxMarksValue) {
    return { ok: true, error: "", value: null };
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
  if ((submissionType === "group" || submissionType === "both") && maxGroupMembersRaw) {
    const parsed = Number(maxGroupMembersRaw);
    if (Number.isNaN(parsed) || parsed < 2) {
      errors.max_group_members = "Max members should be at least 2.";
    }
  }
  if (String(form?.topic_source || TOPIC_SOURCE_STUDENT) === TOPIC_SOURCE_TEACHER_GROUP && submissionType === "individual") {
    errors.topic_source = "Allotting one topic per group requires Group or Both.";
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
};

export const toCourseworkPayload = (form) => {
  const { sample_file, sample_file_url, sample_file_name, ...rest } = form;
  const maxMarks = form.max_marks;
  const maxMembers = form.max_group_members;
  return {
    ...rest,
    title: String(form.title || "").trim(),
    description: String(form.description || "").trim(),
    coursework_type: normalizeCourseworkType(form.coursework_type),
    course: Number(form.course),
    sample_file_title: String(form.sample_file_title || "").trim(),
    max_marks: maxMarks === "" || maxMarks == null ? null : Number(maxMarks),
    max_group_members:
      form.submission_type === "group" || form.submission_type === "both"
        ? maxMembers === "" || maxMembers == null
          ? null
          : Number(maxMembers)
        : null,
    deadline: new Date(form.deadline).toISOString(),
  };
};

export const toCourseworkEditForm = (row) => ({
  course: row.course,
  title: row.title,
  description: row.description,
  coursework_type: normalizeCourseworkType(row.coursework_type) || "assignment",
  submission_type: row.submission_type,
  max_group_members: row.max_group_members || "",
  lock_at_due_time: Boolean(row.lock_at_due_time),
  approval_required: Boolean(row.approval_required),
  topic_duplication_allowed: Boolean(row.topic_duplication_allowed),
  auto_approve_all_students: Boolean(row.auto_approve_all_students),
  topic_source: row.topic_source || TOPIC_SOURCE_STUDENT,
  deadline: row.deadline ? row.deadline.slice(0, 16) : "",
  max_marks: row.max_marks ?? "",
  sample_file: null,
  sample_file_url: row.sample_file_url || "",
  sample_file_name: row.sample_file_name || "",
  sample_file_title: row.sample_file_title || "",
});

export const saveCourseworkRequest = async (api, endpoints, { editingId, form, maxMarks }) => {
  const sampleFile = form.sample_file instanceof File ? form.sample_file : null;
  const payload = toCourseworkPayload({ ...form, max_marks: maxMarks });
  const url = editingId ? `${endpoints.courseworks}${editingId}/` : endpoints.courseworks;
  const { data } = editingId ? await api.patch(url, payload) : await api.post(url, payload);
  if (!sampleFile) return { data };
  const body = new FormData();
  body.append("sample_file", sampleFile);
  if (form.sample_file_title) body.append("sample_file_title", form.sample_file_title);
  return api.patch(`${endpoints.courseworks}${data.id}/`, body);
};
