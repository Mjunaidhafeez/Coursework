export const getSubmissionStageMeta = (submission) => {
  if (submission?.is_marked) return { label: "Marked", color: "primary" };
  if (submission?.approval_status === "rejected") return { label: "Rejected Request", color: "error" };
  if (submission?.approval_status === "pending") return { label: "Request Pending", color: "warning" };
  if (submission?.approval_status === "approved" && !submission?.file) return { label: "Ready For Upload", color: "info" };
  if (submission?.approval_status === "approved" && submission?.file) return { label: "File Submitted", color: "success" };
  return { label: "In Progress", color: "default" };
};
