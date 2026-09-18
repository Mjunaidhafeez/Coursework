import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { toAbsoluteMediaUrl } from "./mediaUrl";

export const primarySubmissionFile = (submission) => {
  const files = submission?.submitted_files || [];
  return files[files.length - 1] || null;
};

export const primarySubmissionFileUrl = (submission) => {
  const latest = primarySubmissionFile(submission);
  return toAbsoluteMediaUrl(latest?.file || latest?.file_url || submission?.file);
};

export const hasSubmissionFile = (submission) =>
  Boolean((submission?.submitted_files || []).length || submission?.file || primarySubmissionFileUrl(submission));

const openBlob = (blob, filename, download = false) => {
  const url = URL.createObjectURL(blob);
  if (download) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename || "file";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};

const fetchSubmissionFileBlob = async (submission, fileItem, mode) => {
  if (fileItem?.id && !String(fileItem.id).startsWith("legacy") && submission?.id) {
    const { data } = await api.get(`${ENDPOINTS.submissions}${submission.id}/files/${fileItem.id}/${mode}/`, {
      responseType: "blob",
    });
    return data;
  }
  const fileUrl = toAbsoluteMediaUrl(fileItem?.file || fileItem?.file_url || submission?.file);
  if (!fileUrl) return null;
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error("Could not open file");
  return response.blob();
};

export const openSubmissionFilePreview = async (submission, notify, fileItem = null) => {
  const target = fileItem || primarySubmissionFile(submission) || { file: submission?.file, file_url: submission?.file };
  try {
    const blob = await fetchSubmissionFileBlob(submission, target, "view");
    if (!blob) {
      notify?.("No file uploaded yet", "warning");
      return;
    }
    openBlob(blob, target?.file_name || target?.title || "file");
  } catch {
    notify?.("Could not open file", "error");
  }
};

export const downloadSubmissionFile = async (submission, notify, fileItem = null) => {
  const target = fileItem || primarySubmissionFile(submission) || { file: submission?.file, file_url: submission?.file };
  try {
    const blob = await fetchSubmissionFileBlob(submission, target, "download");
    if (!blob) {
      notify?.("No file uploaded yet", "warning");
      return;
    }
    openBlob(blob, target?.file_name || target?.title || "file", true);
  } catch {
    notify?.("Could not download file", "error");
  }
};
