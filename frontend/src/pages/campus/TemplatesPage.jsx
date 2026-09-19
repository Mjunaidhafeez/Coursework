import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const TemplatesPage = () => {
  const { notify } = useUi();
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", coursework_type: "", max_marks: 100 });

  const load = async () => {
    const { data } = await api.get(`${ENDPOINTS.campusTemplates}?page_size=50`);
    setRows(listRows(data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load templates", "error"));
  }, []);

  const save = async () => {
    try {
      await api.post(ENDPOINTS.campusTemplates, form);
      notify("Template saved");
      setForm({ title: "", description: "", coursework_type: "", max_marks: 100 });
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save template", "error");
    }
  };

  return (
    <ListingPage title="Assessment templates" icon={<ContentCopyRoundedIcon />} subtitle="Reuse a draft when creating new assessments">
      <Stack spacing={1.2}>
        <Stack spacing={1} sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
          <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField size="small" multiline minRows={2} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Type" value={form.coursework_type} onChange={(e) => setForm({ ...form, coursework_type: e.target.value })} />
            <TextField size="small" type="number" label="Max marks" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} />
            <Button variant="contained" onClick={save}>Save template</Button>
          </Stack>
        </Stack>
        {rows.map((item) => (
          <Stack key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
            <Typography variant="body2" color="text.secondary">{item.description} · {item.max_marks} marks</Typography>
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default TemplatesPage;
