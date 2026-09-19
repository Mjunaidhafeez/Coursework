import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import { Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { listRows } from "./listRows";

const AttendancePage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isStudent = user?.role === "student";
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ course: "", session_date: "", topic: "" });
  const [marks, setMarks] = useState({});

  const load = async () => {
    const [coursesRes, sessionsRes, summaryRes] = await Promise.all([
      api.get(`${ENDPOINTS.courses}?page_size=200`),
      api.get(`${ENDPOINTS.campusAttendance}?page_size=40`),
      api.get(`${ENDPOINTS.campusAttendance}summary/`),
    ]);
    setCourses(listRows(coursesRes.data));
    setSessions(listRows(sessionsRes.data));
    setSummary(summaryRes.data);
  };

  useEffect(() => {
    load().catch(() => notify("Could not load attendance", "error"));
  }, []);

  const loadStudents = async (courseId) => {
    if (!courseId) return;
    const { data } = await api.get(`${ENDPOINTS.enrollments}?course=${courseId}&page_size=300`);
    const rows = listRows(data);
    setStudents(rows);
    const next = {};
    rows.forEach((row) => {
      next[row.student] = "present";
    });
    setMarks(next);
  };

  const createSession = async () => {
    try {
      const { data } = await api.post(ENDPOINTS.campusAttendance, form);
      const records = Object.entries(marks).map(([student, status]) => ({ student, status }));
      await api.post(`${ENDPOINTS.campusAttendance}${data.id}/mark/`, { records });
      notify("Attendance saved");
      load();
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save attendance", "error");
    }
  };

  return (
    <ListingPage title="Attendance" icon={<FactCheckRoundedIcon />} subtitle={isStudent ? "Your attendance summary" : "Mark a session by course and date"}>
      <Stack spacing={1.2}>
        {summary && isStudent ? (
          <Stack direction="row" spacing={2} sx={{ p: 1.2, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <Typography sx={{ fontWeight: 800 }}>{summary.percent}%</Typography>
            <Typography variant="body2" color="text.secondary">{summary.present} present · {summary.late} late · {summary.total} sessions</Typography>
          </Stack>
        ) : null}
        {!isStudent ? (
          <Stack spacing={1} sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField size="small" select label="Course" value={form.course} onChange={(e) => { setForm({ ...form, course: e.target.value }); loadStudents(e.target.value); }} sx={{ minWidth: 220 }}>
                {courses.map((course) => <MenuItem key={course.id} value={course.id}>{course.code}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} />
              <TextField size="small" label="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              <Button variant="contained" onClick={createSession}>Save session</Button>
            </Stack>
            {students.map((row) => (
              <Stack key={row.id} direction="row" spacing={1} alignItems="center">
                <Typography sx={{ minWidth: 180, fontWeight: 600 }}>{row.student_name || row.student}</Typography>
                <TextField size="small" select value={marks[row.student] || "present"} onChange={(e) => setMarks((prev) => ({ ...prev, [row.student]: e.target.value }))} sx={{ width: 140 }}>
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                </TextField>
              </Stack>
            ))}
          </Stack>
        ) : null}
        <Stack spacing={0.7}>
          {sessions.map((item) => (
            <Stack key={item.id} sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>{item.course_code} · {item.session_date}</Typography>
              <Typography variant="body2" color="text.secondary">{item.topic || "Session"} · {item.records?.length || 0} marked</Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </ListingPage>
  );
};

export default AttendancePage;
