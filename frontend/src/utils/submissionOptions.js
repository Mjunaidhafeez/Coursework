export const SUBMISSION_STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "pending", label: "Pending" },
  { value: "late", label: "Late" },
];

export const getSubmissionStatusColor = (status) => {
  if (status === "submitted") return "success";
  if (status === "late") return "warning";
  if (status === "pending") return "info";
  return "default";
};
