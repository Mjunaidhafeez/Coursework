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
import { useRef, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { confirmDelete } from "../../utils/confirm";
import { displayFileName, fileExtensionFrom, IMAGE_EXT, OFFICE_EXT, previewFromBlob, titleFromFileName, WORD_EXT } from "../../utils/filePreview";
import { oversizedFileNames } from "../../utils/uploadLimits";
import FilePreviewDialog from "./FilePreviewDialog";

const fetchStudyFileBlob = async (courseId, fileId, mode) => {
  const { data } = await api.get(`${ENDPOINTS.courses}${courseId}/study-files/${fileId}/${mode}/`, {
    responseType: "blob",
  });
  return data;
};

export const CourseStudyFilesDialog = ({ open, course, canManage = false, onClose, onChanged }) => {
  const { notify } = useUi();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [opening, setOpening] = useState(false);
  const [preview, setPreview] = useState(null);
  const files = course?.study_files || [];

  const openStudyFile = async (item) => {
    if (!course?.id || !item?.id) return;
    const ext = fileExtensionFrom(item);
    setOpening(true);
    try {
      if (IMAGE_EXT.includes(ext) || ext === "pdf") {
        const blob = await fetchStudyFileBlob(course.id, item.id, "view");
        setPreview(previewFromBlob(blob, item.title || displayFileName(item), ext === "pdf" ? "pdf" : "image"));
        return;
      }
      if (WORD_EXT.includes(ext)) {
        const blob = await fetchStudyFileBlob(course.id, item.id, "view");
        setPreview(previewFromBlob(blob, item.title || displayFileName(item), "word"));
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
    payload.append("title", title.trim() || titleFromFileName(file.name));
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
    setSaving(true);
    try {
      await api.post(`${ENDPOINTS.courses}${course.id}/study-files/${renaming.id}/rename/`, { title: nextTitle });
      notify("File name updated");
      setRenaming(null);
      onChanged?.();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setSaving(false);
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
          <Button onClick={() => setRenaming(null)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={renameFile} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
      <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />
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
