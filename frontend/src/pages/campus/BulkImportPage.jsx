import FileUploadRoundedIcon from "@mui/icons-material/FileUploadRounded";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";

const BulkImportPage = () => {
  const { notify } = useUi();
  const [kind, setKind] = useState("students");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const upload = async () => {
    if (!file) {
      notify("Choose a CSV file", "error");
      return;
    }
    const payload = new FormData();
    payload.append("file", file);
    payload.append("kind", kind);
    try {
      const { data } = await api.post(ENDPOINTS.campusImport, payload, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
      notify(`Imported ${data.created} rows`);
    } catch (err) {
      notify(err?.response?.data?.detail || "Import failed", "error");
    }
  };

  return (
    <ListingPage title="Bulk import" icon={<FileUploadRoundedIcon />} subtitle="CSV for students, teachers, or enrollments">
      <Stack spacing={1.2}>
        <Alert severity="info">
          Students columns: username, first_name, last_name, email, phone, password, student_id, semester, course.
          Teachers: username, first_name, last_name, email, phone, department, password.
          Enrollments: username, course.
        </Alert>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField size="small" select label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="students">Students</MenuItem>
            <MenuItem value="teachers">Teachers</MenuItem>
            <MenuItem value="enrollments">Enrollments</MenuItem>
          </TextField>
          <Button variant="outlined" component="label">
            Choose CSV
            <input hidden type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          <Button variant="contained" onClick={upload}>Import</Button>
        </Stack>
        {file ? <Typography variant="body2">{file.name}</Typography> : null}
        {result ? <Typography variant="body2">Created {result.created}, skipped {result.skipped}, errors {result.errors?.length || 0}</Typography> : null}
      </Stack>
    </ListingPage>
  );
};

export default BulkImportPage;
