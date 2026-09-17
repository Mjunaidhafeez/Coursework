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
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { useRef, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { confirmDelete } from "../../utils/confirm";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";

const openStudyFile = (file, notify) => {
  const url = toAbsoluteMediaUrl(file?.file);
  if (!url) {
    notify?.("File is not available", "warning");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

const downloadStudyFile = (file, notify) => {
  const url = toAbsoluteMediaUrl(file?.file);
  if (!url) {
    notify?.("File is not available", "warning");
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file?.file_name || file?.title || "study-file";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const CourseStudyFilesDialog = ({ open, course, canManage = false, onClose, onChanged }) => {
  const { notify } = useUi();
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const files = course?.study_files || [];

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
      <DialogTitle>{course ? `${course.code} study files` : "Study files"}</DialogTitle>
      <DialogContent dividers>
        {canManage ? (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mb: 1.5 }}>
            <TextField
              size="small"
              label="File name"
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
                accept=".pdf,.docx,.zip,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Button size="small" variant="contained" disabled={saving} onClick={upload}>
              {saving ? "Uploading..." : "Add file"}
            </Button>
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
                  <TableCell sx={{ fontWeight: 700 }}>{item.title || item.file_name || "Study file"}</TableCell>
                  <TableCell>{item.file_name || "—"}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.4} justifyContent="flex-end">
                      <IconButton size="small" title="View" onClick={() => openStudyFile(item, notify)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" title="Download" onClick={() => downloadStudyFile(item, notify)}>
                        <DownloadRoundedIcon fontSize="small" />
                      </IconButton>
                      {canManage ? (
                        <Button size="small" color="error" onClick={() => removeFile(item)}>
                          Delete
                        </Button>
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
