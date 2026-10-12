import { toAbsoluteMediaUrl } from "./mediaUrl";

export const IMAGE_EXT = ["png", "jpg", "jpeg"];
export const WORD_EXT = ["docx"];
export const OFFICE_EXT = ["doc", "ppt", "pptx", "xls", "xlsx"];

export const fileExtension = (value) =>
  String(value || "")
    .split("?")[0]
    .split("/")
    .pop()
    .split(".")
    .pop()
    .toLowerCase();

export const fileExtensionFrom = (file) =>
  fileExtension(file?.file_name || file?.title || file?.file || file?.name || "");

export const displayFileName = (file) => {
  const raw = String(file?.file_name || file?.title || file?.name || "File");
  return raw.split("/").pop() || raw;
};

export const titleFromFileName = (name) => {
  const base = String(name || "").split("/").pop() || "";
  return base.includes(".") ? base.replace(/\.[^.]+$/, "") : base;
};

export const officeViewerUrl = (url) =>
  `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

export const previewKindForName = (name) => {
  const ext = fileExtension(name);
  if (IMAGE_EXT.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (WORD_EXT.includes(ext)) return "word";
  if (OFFICE_EXT.includes(ext)) return "office";
  return null;
};

export const previewFromBlob = (blob, title, kind) => {
  if (kind === "word") return { blob, title, kind };
  if (kind === "image" || kind === "pdf") {
    return { url: URL.createObjectURL(blob), title, kind, revokeOnClose: true };
  }
  return null;
};

export const previewFromUrl = (url, title, kind) => {
  if (!url || !kind) return null;
  if (kind === "office") return { url: officeViewerUrl(url), title, kind };
  if (kind === "image" || kind === "pdf") return { url, title, kind };
  return null;
};

export const buildFilePreview = async ({ file, url, name, title }) => {
  const label = title || name || file?.name || "File";
  const kind = previewKindForName(name || file?.name || url);
  if (file instanceof File) {
    if (!kind) return { message: "This file type cannot be previewed." };
    if (kind === "office") return { message: "Office preview is available after you save." };
    return { preview: previewFromBlob(file, label, kind) };
  }
  const absolute = toAbsoluteMediaUrl(url);
  if (absolute) {
    if (kind === "word") {
      const response = await fetch(absolute);
      if (!response.ok) throw new Error("Could not open file preview");
      return { preview: previewFromBlob(await response.blob(), label, "word") };
    }
    const preview = previewFromUrl(absolute, label, kind);
    if (preview) return { preview };
    return { openUrl: absolute };
  }
  return { message: "Choose a sample file first" };
};
