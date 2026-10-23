import { hasSubmissionFile } from "./submissionFiles";

export const STUDENT_STATUS_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "pending", label: "Request for approval" },
  { value: "approved", label: "Approved" },
  { value: "file_submitted", label: "File sent" },
  { value: "marked", label: "Marked" },
  { value: "rejected", label: "Rejected" },
];

export const STATUS_CHIP = {
  waiting: { label: "Waiting", bgcolor: "#e2e8f0", color: "#334155" },
  pending: { label: "Request for approval", bgcolor: "#ffedd5", color: "#9a3412" },
  approved: { label: "Approved", bgcolor: "#dbeafe", color: "#1d4ed8" },
  file_submitted: { label: "File sent", bgcolor: "#e9d5ff", color: "#6b21a8" },
  marked: { label: "Marked", bgcolor: "#dcfce7", color: "#15803d" },
  rejected: { label: "Rejected", bgcolor: "#fee2e2", color: "#b91c1c" },
};

const hasSentApprovalRequest = (row) => {
  if (!row || row.is_topic_not_submitted) return false;
  const id = row.submission_id || row.id;
  if (!id || String(row.id || "").startsWith("missing-")) return false;
  const approval = String(row.approval_status || "pending").toLowerCase();
  return approval === "pending" || approval === "request_pending";
};

export const getStudentStatus = (row) => {
  if (!row || row.is_topic_not_submitted) return "waiting";
  if (row.is_marked) return "marked";
  if (String(row.approval_status || "").toLowerCase() === "rejected") return "rejected";
  if (String(row.approval_status || "").toLowerCase() === "approved") {
    return hasSubmissionFile(row) || row.file ? "file_submitted" : "approved";
  }
  return hasSentApprovalRequest(row) ? "pending" : "waiting";
};

export const studentStatusLabel = (rowOrKey) => {
  const key = typeof rowOrKey === "string" ? rowOrKey : getStudentStatus(rowOrKey);
  return STATUS_CHIP[key]?.label || "Waiting";
};

export const getSubmissionStageMeta = (submission) => {
  const key = getStudentStatus(submission);
  const chip = STATUS_CHIP[key] || STATUS_CHIP.waiting;
  return { key, label: chip.label, bgcolor: chip.bgcolor, color: chip.color };
};

export const studentNextStep = (submission, { teacherAllots = false, dueLocked = false } = {}) => {
  if (!submission) {
    if (teacherAllots) return "Wait for your teacher to allot a topic. Then upload your work here.";
    return "Send a topic request to start. After approval you can upload files.";
  }
  const key = getStudentStatus(submission);
  if (key === "pending") return "Request sent. Wait for the teacher to approve it.";
  if (key === "rejected") return "Request was rejected. Edit the topic and send it again.";
  if (key === "approved") return dueLocked ? "Approved, but upload is locked after the deadline." : "Approved. Upload your file now.";
  if (key === "file_submitted") return "File sent. The teacher will mark it.";
  if (key === "marked") return "Marked. Open Course Result to see marks.";
  return "Waiting to start.";
};
