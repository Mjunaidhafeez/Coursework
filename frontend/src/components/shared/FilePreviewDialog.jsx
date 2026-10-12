import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { renderAsync } from "docx-preview";
import { useEffect, useRef } from "react";

import { useUi } from "../../context/UiContext";

const FilePreviewDialog = ({ preview, onClose }) => {
  const { notify } = useUi();
  const wordHostRef = useRef(null);

  useEffect(() => {
    if (preview?.kind !== "word" || !preview.blob || !wordHostRef.current) return;
    wordHostRef.current.innerHTML = "";
    renderAsync(preview.blob, wordHostRef.current, undefined, { inWrapper: true, breakPages: true }).catch(() => {
      notify("Could not preview this Word file. Use Download.", "warning");
    });
  }, [preview, notify]);

  useEffect(
    () => () => {
      if (preview?.revokeOnClose && preview?.url) URL.revokeObjectURL(preview.url);
    },
    [preview]
  );

  return (
    <Dialog open={Boolean(preview)} onClose={onClose} maxWidth="lg" fullWidth>
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
        <Button onClick={onClose}>Close preview</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewDialog;
