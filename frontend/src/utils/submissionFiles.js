import { toAbsoluteMediaUrl } from "./mediaUrl";

export const openSubmissionFilePreview = (submission, notify) => {
  const fileUrl = toAbsoluteMediaUrl(submission?.file);
  if (!fileUrl) {
    notify?.("No file uploaded yet", "warning");
    return;
  }
  window.open(fileUrl, "_blank", "noopener,noreferrer");
};

export const downloadSubmissionFile = (submission, notify) => {
  const fileUrl = toAbsoluteMediaUrl(submission?.file);
  if (!fileUrl) {
    notify?.("No file uploaded yet", "warning");
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = fileUrl;
  anchor.download = String(fileUrl).split("/").pop() || `submission-${submission?.id || "file"}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};
