import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import { Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const emptyForm = { kind: "notice", title: "", body: "", starts_at: "", ends_at: "", audience: "all", course: "" };

const CalendarNoticesPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const canWrite = ["super_admin", "teacher"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const [noticesRes, coursesRes] = await Promise.all([
      api.get(`${ENDPOINTS.campusNotices}?page_size=50&ordering=-starts_at`),
      api.get(`${ENDPOINTS.courses}?page_size=200`),
    ]);
    setRows(listRows(noticesRes.data));
    setCourses(listRows(coursesRes.data));
  };

  useEffect(() => {
    load().catch(() => notify("Could not load calendar", "error"));
  }, []);

  const save = async () => {
    if (!form.title || !form.starts_at) {
      notify("Title and start date are required", "error");
      return;
    }
    try {
      await api.post(ENDPOINTS.campusNotices, {
        ...form,
        course: form.course || null,
        ends_at: form.ends_at || null,
      });
      setForm(emptyForm);
      notify("Notice published");
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save notice", "error");
    }
  };

  return (
    <ListingPage
      title="Calendar & notices"
      icon={<EventNoteRoundedIcon />}
      subtitle="Events and notices for the campus. New items notify the chosen audience."
    >
      <Stack spacing={1.2}>
        {canWrite ? (
          <Stack spacing={1} sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <Typography sx={{ fontWeight: 800 }}>Publish</Typography>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField size="small" select label="Type" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} sx={{ minWidth: 140 }}>
                <MenuItem value="notice">Notice</MenuItem>
                <MenuItem value="event">Calendar event</MenuItem>
              </TextField>
              <TextField size="small" select label="Audience" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} sx={{ minWidth: 140 }}>
                <MenuItem value="all">Everyone</MenuItem>
                <MenuItem value="students">Students</MenuItem>
                <MenuItem value="teachers">Teachers</MenuItem>
              </TextField>
              <TextField size="small" select label="Course (optional)" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} sx={{ minWidth: 180 }}>
                <MenuItem value="">All courses</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>{course.code} — {course.title}</MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <TextField size="small" multiline minRows={2} label="Details" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField size="small" type="datetime-local" label="Starts" InputLabelProps={{ shrink: true }} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              <TextField size="small" type="datetime-local" label="Ends" InputLabelProps={{ shrink: true }} value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              <Button variant="contained" onClick={save}>Publish</Button>
            </Stack>
          </Stack>
        ) : null}
        <Stack spacing={0.8}>
          {rows.length ? rows.map((item) => (
            <Stack key={item.id} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5, bgcolor: "#fff" }}>
              <div>
                <Stack direction="row" spacing={0.7} alignItems="center">
                  <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                  <Chip size="small" label={item.kind} />
                  <Chip size="small" variant="outlined" label={item.audience} />
                </Stack>
                <Typography variant="body2" color="text.secondary">{item.body}</Typography>
              </div>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                {item.starts_at ? new Date(item.starts_at).toLocaleString() : ""}
              </Typography>
            </Stack>
          )) : <Typography color="text.secondary">No notices yet.</Typography>}
        </Stack>
      </Stack>
    </ListingPage>
  );
};

export default CalendarNoticesPage;
