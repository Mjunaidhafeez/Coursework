import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { renderAsync } from "docx-preview";
import { useEffect, useRef, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { confirmDelete } from "../../utils/confirm";
import { oversizedFileNames } from "../../utils/uploadLimits";

const IMAGE_EXT = ["png", "jpg", "jpeg"];
const WORD_EXT = ["docx"];
const OFFICE_EXT = ["doc", "ppt", "pptx", "xls", "xlsx"];

const fileExtension = (file) =>
  String(file?.file_name || file?.title || file?.file || "")
    .split("?")[0]
    .split(".")
    .pop()
    .toLowerCase();

const displayFileName = (file) => {
  const raw = String(file?.file_name || file?.title || "Study file");
  return raw.split("/").pop() || raw;
};

const fetchStudyFileBlob = async (courseId, fileId, mode) => {
  const { data } = await api.get(`${ENDPOINTS.courses}${courseId}/study-files/${fileId}/${mode}/`, {
    responseType: "blob",
  });
  return data;
};

export const CourseStudyFilesDialog = ({ open, course, canManage = false, onClose, onChanged }) => {
  const { notify } = useUi();
  const fileInputRef = useRef(null);
  const wordHostRef = useRef(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [opening, setOpening] = useState(false);
  const [preview, setPreview] = useState(null);
  const files = course?.study_files || [];

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  useEffect(() => {
    if (preview?.kind !== "word" || !preview.blob || !wordHostRef.current) return;
    wordHostRef.current.innerHTML = "";
    renderAsync(preview.blob, wordHostRef.current, undefined, { inWrapper: true, breakPages: true }).catch(() => {
      notify("Could not preview this Word file. Use Download.", "warning");
    });
  }, [preview, notify]);

  const openStudyFile = async (item) => {
    if (!course?.id || !item?.id) return;
    const ext = fileExtension(item);
    setOpening(true);
    try {
      if (preview?.url) URL.revokeObjectURL(preview.url);
      if (IMAGE_EXT.includes(ext) || ext === "pdf") {
        const blob = await fetchStudyFileBlob(course.id, item.id, "view");
        setPreview({
          url: URL.createObjectURL(blob),
          title: item.title || displayFileName(item),
          kind: ext === "pdf" ? "pdf" : "image",
        });
        return;
      }
      if (WORD_EXT.includes(ext)) {
        const blob = await fetchStudyFileBlob(course.id, item.id, "view");
        setPreview({
          blob,
          title: item.title || displayFileName(item),
          kind: "word",
        });
        return;
      }
      if (OFFICE_EXT.includes(ext)) {
        const { data } = await api.get(`${ENDPOINTS.courses}${course.id}/study-files/${item.id}/preview-link/`);
        setPreview({
          url: data.viewer_url,
          title: item.title || displayFileName(item),
          kind: "office",
        });
        return;
      }
      notify("This file type cannot be previewed. Use Download.", "info");
    } catch {
      notify("Could not open file preview", "error");
    } finally {
      setOpening(false);
    }
  };

  const downloadStudyFile = async (item) => {
    if (!course?.id || !item?.id) return;
    try {
      const blob = await fetchStudyFileBlob(course.id, item.id, "download");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = displayFileName(item);
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      notify("Could not download file", "error");
    }
  };

  const resetUpload = () => {
    setTitle("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!course?.id) return;
    if (!file) {
      notify("Choose a study file to upload", "warning");
      return;
    }
    if (oversizedFileNames([file]).length) {
      notify("File is larger than 25 MB", "error");
      return;
    }
    const payload = new FormData();
    payload.append("file", file);
    payload.append("title", title.trim() || file.name.replace(/\.[^.]+$/, ""));
    setSaving(true);
    try {
      await api.post(`${ENDPOINTS.courses}${course.id}/study-files/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notify("Study file uploaded");
      resetUpload();
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.detail || "Upload failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const renameFile = async () => {
    if (!course?.id || !renaming?.id) return;
    const nextTitle = renameTitle.trim();
    if (!nextTitle) {
      notify("File name is required", "warning");
      return;
    }
    try {
      await api.patch(`${ENDPOINTS.courses}${course.id}/study-files/${renaming.id}/`, { title: nextTitle });
      notify("File name updated");
      setRenaming(null);
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.detail || "Rename failed", "error");
    }
  };

  const removeFile = async (studyFile) => {
    if (!course?.id || !studyFile?.id) return;
    if (!confirmDelete("study file")) return;
    try {
      await api.delete(`${ENDPOINTS.courses}${course.id}/study-files/${studyFile.id}/`);
      notify("Study file removed");
      onChanged?.();
    } catch (err) {
      notify(err?.response?.data?.detail || "Delete failed", "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{course ? `Study files for ${course.code}` : "Study files"}</DialogTitle>
      <DialogContent dividers>
        {canManage ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              label="Display name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ minWidth: 180, flex: 1 }}
            />
            <Button size="small" variant="outlined" component="label">
              {file ? file.name : "Choose file"}
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const next = e.target.files?.[0] || null;
                  if (next && oversizedFileNames([next]).length) {
                    notify("File is larger than 25 MB", "error");
                    e.target.value = "";
                    setFile(null);
                    return;
                  }
                  setFile(next);
                }}
              />
            </Button>
            <Button size="small" variant="contained" disabled={saving} onClick={upload}>
              {saving ? "Uploading..." : "Add file"}
            </Button>
            <Typography variant="caption" color="text.secondary">Max 25 MB</Typography>
          </Stack>
        ) : null}
        {files.length ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>File</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((item) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ fontWeight: 700 }}>{item.title || displayFileName(item)}</TableCell>
                  <TableCell>{displayFileName(item)}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.4} justifyContent="flex-end">
                      <IconButton size="small" title="View" disabled={opening} onClick={() => openStudyFile(item)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Download" onClick={() => downloadStudyFile(item)}>
                        <DownloadRoundedIcon fontSize="small" />
                      </IconButton>
                      {canManage ? (
                        <>
                          <IconButton
                            size="small"
                            title="Rename"
                            onClick={() => {
                              setRenaming(item);
                              setRenameTitle(item.title || displayFileName(item));
                            }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                          <Button size="small" color="error" onClick={() => removeFile(item)}>
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {canManage ? "No study files yet. Add a named file for students." : "No study files uploaded for this course."}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
      <Dialog open={Boolean(renaming)} onClose={() => setRenaming(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit file name</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Display name"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenaming(null)}>Cancel</Button>
          <Button variant="contained" onClick={renameFile}>Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{preview?.title || "File preview"}</DialogTitle>
        <DialogContent dividers sx={{ minHeight: "70vh", p: 0, bgcolor: preview?.kind === "word" ? "#fff" : "#0f172a" }}>
          {preview?.kind === "image" ? (
            <Box sx={{ p: 2, textAlign: "center" }}>
              <Box component="img" src={preview.url} alt={preview.title} sx={{ maxWidth: "100%", maxHeight: "72vh" }} />
            </Box>
          ) : null}
          {preview?.kind === "word" ? (
            <Box ref={wordHostRef} sx={{ p: 2, bgcolor: "#fff", minHeight: "70vh", overflow: "auto" }} />
          ) : null}
          {preview?.kind === "pdf" || preview?.kind === "office" ? (
            <Box
              component="iframe"
              title={preview?.title || "preview"}
              src={preview?.url}
              sx={{ width: "100%", height: "72vh", border: 0, bgcolor: "#fff" }}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreview(null)}>Close preview</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export const CourseStudyFilesCell = ({ course, canManage = false, onChanged }) => {
  const [open, setOpen] = useState(false);
  const files = course?.study_files || [];
  const count = course?.study_file_count ?? files.length;

  return (
    <Box>
      <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap">
        {count ? (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`${count} file${count === 1 ? "" : "s"}`}
            onClick={() => setOpen(true)}
            sx={{ fontWeight: 700, cursor: "pointer" }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">No files</Typography>
        )}
        {canManage || count ? (
          <Button size="small" onClick={() => setOpen(true)}>
            {canManage ? "Manage" : "View"}
          </Button>
        ) : null}
      </Stack>
      <CourseStudyFilesDialog
        open={open}
        course={course}
        canManage={canManage}
        onClose={() => setOpen(false)}
        onChanged={onChanged}
      />
    </Box>
  );
};

export default CourseStudyFilesCell;
