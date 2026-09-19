import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import { Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const AppealsPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isStudent = user?.role === "student";
  const [rows, setRows] = useState([]);
  const [works, setWorks] = useState([]);
  const [form, setForm] = useState({ coursework: "", kind: "extension", reason: "", extra_days: 2 });

  const load = async () => {
    const [appealsRes, worksRes] = await Promise.all([
      api.get(`${ENDPOINTS.campusAppeals}?page_size=50`),
      api.get(`${ENDPOINTS.courseworks}?page_size=100`),
    ]);
    setRows(listRows(appealsRes.data));
    setWorks(listRows(worksRes.data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load appeals", "error"));
  }, []);

  const submit = async () => {
    try {
      await api.post(ENDPOINTS.campusAppeals, form);
      notify("Appeal submitted");
      setForm({ ...form, reason: "" });
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not submit appeal", "error");
    }
  };

  const decide = async (id, status) => {
    try {
      await api.post(`${ENDPOINTS.campusAppeals}${id}/decide/`, { status, extra_days: form.extra_days });
      notify(`Appeal ${status}`);
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not update appeal", "error");
    }
  };

  return (
    <ListingPage title="Appeals" icon={<GavelRoundedIcon />} subtitle="Request a remark or deadline extension">
      <Stack spacing={1.2}>
        {isStudent ? (
          <Stack spacing={1} sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField size="small" select label="Assessment" value={form.coursework} onChange={(e) => setForm({ ...form, coursework: e.target.value })} sx={{ minWidth: 220 }}>
                {works.map((item) => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
              </TextField>
              <TextField size="small" select label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} sx={{ minWidth: 180 }}>
                <MenuItem value="extension">Deadline extension</MenuItem>
                <MenuItem value="remark">Remark request</MenuItem>
              </TextField>
              <TextField size="small" type="number" label="Extra days" value={form.extra_days} onChange={(e) => setForm({ ...form, extra_days: e.target.value })} sx={{ width: 120 }} />
            </Stack>
            <TextField size="small" multiline minRows={2} label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
            <Button variant="contained" onClick={submit} sx={{ alignSelf: "flex-start" }}>Submit appeal</Button>
          </Stack>
        ) : null}
        {rows.map((item) => (
          <Stack key={item.id} direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
            <div>
              <Typography sx={{ fontWeight: 800 }}>{item.coursework_title} · {item.kind}</Typography>
              <Typography variant="body2">{item.reason}</Typography>
              <Typography variant="caption" color="text.secondary">{item.student_name}</Typography>
            </div>
            <Stack direction="row" spacing={0.7} alignItems="center">
              <Chip size="small" label={item.status} color={item.status === "approved" ? "success" : item.status === "rejected" ? "error" : "warning"} />
              {!isStudent && item.status === "pending" ? (
                <>
                  <Button size="small" onClick={() => decide(item.id, "approved")}>Approve</Button>
                  <Button size="small" color="error" onClick={() => decide(item.id, "rejected")}>Reject</Button>
                </>
              ) : null}
            </Stack>
          </Stack>
        ))}
      </Stack>
    </ListingPage>
  );
};

export default AppealsPage;
