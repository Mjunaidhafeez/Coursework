import RuleRoundedIcon from "@mui/icons-material/RuleRounded";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const RubricPage = () => {
  const { notify } = useUi();
  const [works, setWorks] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ coursework: "", title: "", weight: 25, max_marks: 25 });

  const load = async (coursework = form.coursework) => {
    const worksRes = await api.get(`${ENDPOINTS.courseworks}?page_size=100`);
    setWorks(listRows(worksRes.data));
    if (coursework) {
      const { data } = await api.get(`${ENDPOINTS.campusRubrics}?coursework=${coursework}&page_size=50`);
      setRows(listRows(data));
    }
  };

  useEffect(() => {
    load().catch(() => notify("Could not load rubrics", "error"));
  }, []);

  const save = async () => {
    try {
      await api.post(ENDPOINTS.campusRubrics, form);
      notify("Criteria added");
      load(form.coursework);
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save rubric", "error");
    }
  };

  return (
    <ListingPage title="Rubric" icon={<RuleRoundedIcon />} subtitle="Criteria and weights for an assessment">
      <Stack spacing={1.2}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
          <TextField size="small" select label="Assessment" value={form.coursework} onChange={(e) => { setForm({ ...form, coursework: e.target.value }); load(e.target.value); }} sx={{ minWidth: 220 }}>
            {works.map((item) => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
          </TextField>
          <TextField size="small" label="Criterion" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField size="small" type="number" label="Weight %" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} sx={{ width: 120 }} />
          <TextField size="small" type="number" label="Max marks" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: e.target.value })} sx={{ width: 130 }} />
          <Button variant="contained" onClick={save}>Add</Button>
        </Stack>
        {rows.map((item) => (
          <Typography key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            {item.title} · {item.weight}% · {item.max_marks} marks
          </Typography>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default RubricPage;
