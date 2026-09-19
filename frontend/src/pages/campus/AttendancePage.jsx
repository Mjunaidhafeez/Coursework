import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { downloadCsvFile, printTablePdf } from "../../utils/export";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";
import { listRows } from "./listRows";

const STATUSES = [
  { key: "present", label: "Present", color: "#15803d", bg: "#dcfce7", border: "#86efac" },
  { key: "leave", label: "Leave", color: "#b45309", bg: "#fef3c7", border: "#fcd34d" },
  { key: "absent", label: "Absent", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" },
  { key: "late", label: "Late", color: "#475569", bg: "#e2e8f0", border: "#94a3b8" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((item) => [item.key, item]));

const todayIso = () => new Date().toISOString().slice(0, 10);

const toIso = (value) => {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfWeek = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toIso(date);
};

const endOfWeek = (isoDate) => {
  const start = new Date(`${startOfWeek(isoDate)}T00:00:00`);
  start.setDate(start.getDate() + 6);
  return toIso(start);
};

const monthValue = (isoDate) => String(isoDate || todayIso()).slice(0, 7);

const sortStudents = (rows) =>
  [...rows].sort((a, b) => {
    const roll = String(a.student_roll_no || a.roll_no || "").localeCompare(String(b.student_roll_no || b.roll_no || ""), undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (roll) return roll;
    return String(a.student_name || a.name || "").localeCompare(String(b.student_name || b.name || ""), undefined, { sensitivity: "base" });
  });

const statusChip = (status) => {
  const meta = STATUS_MAP[status] || STATUS_MAP.present;
  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{
        height: 22,
        fontWeight: 700,
        fontSize: "0.68rem",
        bgcolor: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
      }}
    />
  );
};

const AttendancePage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isStudent = user?.role === "student";
  const canMark = user?.role === "teacher" || user?.role === "super_admin";

  const [tab, setTab] = useState(isStudent ? "record" : "mark");
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState({ course: "", session_date: todayIso(), topic: "" });
  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [period, setPeriod] = useState("week");
  const [anchorDate, setAnchorDate] = useState(todayIso());
  const [rangeFrom, setRangeFrom] = useState(startOfWeek(todayIso()));
  const [rangeTo, setRangeTo] = useState(endOfWeek(todayIso()));
  const [report, setReport] = useState(null);
  const [summary, setSummary] = useState(null);
  const [studentDialog, setStudentDialog] = useState(null);

  const selectedCourse = courses.find((item) => String(item.id) === String(form.course));

  const reportQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (form.course) params.set("course", form.course);
    if (period === "week") {
      params.set("period", "week");
      params.set("date", anchorDate);
    } else if (period === "month") {
      params.set("period", "month");
      params.set("date", `${monthValue(anchorDate)}-01`);
    } else {
      params.set("period", "range");
      params.set("from", rangeFrom);
      params.set("to", rangeTo);
    }
    return params.toString();
  }, [form.course, period, anchorDate, rangeFrom, rangeTo]);

  const loadCourses = async () => {
    const { data } = await api.get(`${ENDPOINTS.courses}?page_size=200`);
    setCourses(listRows(data));
  };

  const loadSummary = async () => {
    const { data } = await api.get(`${ENDPOINTS.campusAttendance}summary/`);
    setSummary(data);
  };

  const loadReport = async () => {
    const { data } = await api.get(`${ENDPOINTS.campusAttendance}report/?${reportQuery}`);
    setReport(data);
  };

  useEffect(() => {
    Promise.all([loadCourses(), isStudent ? loadSummary() : Promise.resolve()]).catch(() => {
      notify("Could not load attendance", "error");
    });
  }, []);

  useEffect(() => {
    if (tab === "mark" || !form.course && !isStudent) return;
    if (tab === "record" || tab === "report") {
      loadReport().catch(() => notify("Could not load attendance report", "error"));
    }
  }, [tab, reportQuery]);

  const applyRoster = (rows, session) => {
    const sorted = sortStudents(rows);
    setStudents(sorted);
    const nextMarks = {};
    const nextRemarks = {};
    sorted.forEach((row) => {
      const rec = session?.records?.find((item) => String(item.student) === String(row.student));
      nextMarks[row.student] = rec?.status || "present";
      nextRemarks[row.student] = rec?.remark || "";
    });
    setMarks(nextMarks);
    setRemarks(nextRemarks);
    setActiveSession(session || null);
    if (session?.topic && !form.topic) {
      setForm((prev) => ({ ...prev, topic: session.topic }));
    }
  };

  const loadRoster = async (courseId, sessionDate, topicOverride) => {
    if (!courseId || !sessionDate) {
      setStudents([]);
      setActiveSession(null);
      return;
    }
    setLoadingRoster(true);
    try {
      const [enrollRes, sessionRes] = await Promise.all([
        api.get(`${ENDPOINTS.enrollments}?course=${courseId}&page_size=300`),
        api.get(`${ENDPOINTS.campusAttendance}?course=${courseId}&session_date=${sessionDate}&page_size=5`),
      ]);
      const session = listRows(sessionRes.data)[0] || null;
      applyRoster(listRows(enrollRes.data), session);
      if (session) {
        setForm((prev) => ({ ...prev, topic: topicOverride ?? session.topic ?? prev.topic }));
      }
    } catch {
      notify("Could not load class roster", "error");
    } finally {
      setLoadingRoster(false);
    }
  };

  const changeCourse = (courseId) => {
    setForm((prev) => ({ ...prev, course: courseId }));
    if (tab === "mark") loadRoster(courseId, form.session_date);
  };

  const changeDate = (sessionDate) => {
    setForm((prev) => ({ ...prev, session_date: sessionDate }));
    if (form.course) loadRoster(form.course, sessionDate);
  };

  const setStatus = (studentId, status) => {
    setMarks((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const next = {};
    students.forEach((row) => {
      next[row.student] = status;
    });
    setMarks(next);
  };

  const saveSession = async () => {
    if (!form.course || !form.session_date) {
      notify("Select course and date first", "error");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(ENDPOINTS.campusAttendance, form);
      const records = students.map((row) => ({
        student: row.student,
        status: marks[row.student] || "present",
        remark: remarks[row.student] || "",
      }));
      const marked = await api.post(`${ENDPOINTS.campusAttendance}${data.id}/mark/`, { records });
      setActiveSession(marked.data);
      notify("Attendance saved");
      if (tab !== "mark") loadReport().catch(() => {});
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save attendance", "error");
    } finally {
      setSaving(false);
    }
  };

  const openMarkForDate = (isoDate) => {
    setTab("mark");
    setForm((prev) => ({ ...prev, session_date: isoDate }));
    if (form.course) loadRoster(form.course, isoDate);
  };

  const classTitle = selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title || ""}`.trim() : "Class";

  const downloadClassSheet = () => {
    const headers = ["Sr #", "Roll No", "Name", "Status", "Remark"];
    const rows = students.map((row, index) => [
      index + 1,
      row.student_roll_no || "",
      row.student_name || "",
      STATUS_MAP[marks[row.student]]?.label || "Present",
      remarks[row.student] || "",
    ]);
    downloadCsvFile({
      filePrefix: `attendance-${selectedCourse?.code || "class"}-${form.session_date}`,
      headers,
      rows,
    });
  };

  const printClassSheet = () => {
    printTablePdf({
      title: `Attendance · ${classTitle} · ${form.session_date}${form.topic ? ` · ${form.topic}` : ""}`,
      headers: ["Sr #", "Roll No", "Name", "Status", "Remark"],
      rows: students.map((row, index) => [
        index + 1,
        row.student_roll_no || "",
        row.student_name || "",
        STATUS_MAP[marks[row.student]]?.label || "Present",
        remarks[row.student] || "",
      ]),
    });
  };

  const reportRows = report?.students || [];
  const reportSessions = report?.sessions || [];

  const downloadClassReport = () => {
    const dateHeaders = reportSessions.map((item) => item.session_date);
    const headers = ["Sr #", "Roll No", "Name", "Present", "Leave", "Absent", "Late", "%", ...dateHeaders];
    const rows = reportRows.map((row, index) => [
      index + 1,
      row.roll_no || "",
      row.name || "",
      row.present,
      row.leave,
      row.absent,
      row.late,
      `${row.percent}%`,
      ...reportSessions.map((item) => STATUS_MAP[row.days?.[item.session_date]?.status]?.label || "-"),
    ]);
    downloadCsvFile({
      filePrefix: `attendance-${report?.course_code || "class"}-${report?.from}-${report?.to}`,
      headers,
      rows,
    });
  };

  const printClassReport = () => {
    const dateHeaders = reportSessions.map((item) => item.session_date);
    printTablePdf({
      title: `Attendance report · ${report?.course_code || classTitle} · ${report?.from} to ${report?.to}`,
      headers: ["Sr #", "Roll No", "Name", "P", "Lv", "A", "Lt", "%", ...dateHeaders],
      rows: reportRows.map((row, index) => [
        index + 1,
        row.roll_no || "",
        row.name || "",
        row.present,
        row.leave,
        row.absent,
        row.late,
        `${row.percent}%`,
        ...reportSessions.map((item) => STATUS_MAP[row.days?.[item.session_date]?.status]?.label || "-"),
      ]),
    });
  };

  const studentRecordRows = (student) => {
    const days = Object.entries(student?.days || {}).sort(([a], [b]) => a.localeCompare(b));
    return days.map(([date, item]) => [
      date,
      item.course_code || report?.course_code || "",
      item.status,
      item.topic || "",
      item.remark || "",
    ]);
  };

  const downloadStudentRecord = (student) => {
    const rows = studentRecordRows(student).map((row) => [row[0], row[1], STATUS_MAP[row[2]]?.label || row[2], row[3], row[4]]);
    downloadCsvFile({
      filePrefix: `attendance-${student.roll_no || student.name}-${report?.from || "record"}`,
      headers: ["Date", "Course", "Status", "Topic", "Remark"],
      rows,
    });
  };

  const printStudentRecord = (student) => {
    const rows = studentRecordRows(student).map((row) => [row[0], row[1], STATUS_MAP[row[2]]?.label || row[2], row[3], row[4]]);
    printTablePdf({
      title: `Attendance · ${student.name} (${student.roll_no || "-"}) · ${student.percent}%`,
      headers: ["Date", "Course", "Status", "Topic", "Remark"],
      rows,
    });
  };

  const studentSelf = reportRows[0] || null;

  const toolbar = !isStudent ? (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
        <TextField size="small" select label="Course" value={form.course} onChange={(e) => changeCourse(e.target.value)} sx={{ minWidth: 240 }}>
          {courses.map((course) => (
            <MenuItem key={course.id} value={course.id}>
              {course.code} — {course.title}
            </MenuItem>
          ))}
        </TextField>
        {tab === "mark" ? (
          <>
            <TextField size="small" type="date" label="Date" InputLabelProps={{ shrink: true }} value={form.session_date} onChange={(e) => changeDate(e.target.value)} />
            <TextField size="small" label="Topic / lecture" value={form.topic} onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))} sx={{ minWidth: 200, flex: 1 }} />
            <Button variant="contained" onClick={saveSession} disabled={saving || !students.length}>
              {saving ? "Saving..." : activeSession ? "Update attendance" : "Save attendance"}
            </Button>
          </>
        ) : (
          <>
            <TextField size="small" select label="View" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="week">Weekly</MenuItem>
              <MenuItem value="month">Monthly</MenuItem>
              <MenuItem value="range">Date range</MenuItem>
            </TextField>
            {period === "month" ? (
              <TextField size="small" type="month" label="Month" InputLabelProps={{ shrink: true }} value={monthValue(anchorDate)} onChange={(e) => setAnchorDate(`${e.target.value}-01`)} />
            ) : period === "week" ? (
              <TextField size="small" type="date" label="Week of" InputLabelProps={{ shrink: true }} value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
            ) : (
              <>
                <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
                <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
              </>
            )}
          </>
        )}
      </Stack>
      <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
        {STATUSES.map((item) => (
          <Chip key={item.key} size="small" label={item.label} sx={{ bgcolor: item.bg, color: item.color, border: `1px solid ${item.border}`, fontWeight: 700 }} />
        ))}
        {report && tab === "report" ? (
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {report.from} → {report.to} · {report.sessions?.length || 0} sessions · leave is excused and excluded from %
          </Typography>
        ) : null}
      </Stack>
    </Stack>
  ) : (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
      <TextField size="small" select label="Course" value={form.course} onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))} sx={{ minWidth: 220 }}>
        <MenuItem value="">All courses</MenuItem>
        {courses.map((course) => (
          <MenuItem key={course.id} value={course.id}>
            {course.code} — {course.title}
          </MenuItem>
        ))}
      </TextField>
      <TextField size="small" select label="View" value={period} onChange={(e) => setPeriod(e.target.value)} sx={{ minWidth: 140 }}>
        <MenuItem value="week">Weekly</MenuItem>
        <MenuItem value="month">Monthly</MenuItem>
        <MenuItem value="range">Date range</MenuItem>
      </TextField>
      {period === "month" ? (
        <TextField size="small" type="month" label="Month" InputLabelProps={{ shrink: true }} value={monthValue(anchorDate)} onChange={(e) => setAnchorDate(`${e.target.value}-01`)} />
      ) : period === "week" ? (
        <TextField size="small" type="date" label="Week of" InputLabelProps={{ shrink: true }} value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
      ) : (
        <>
          <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
          <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
        </>
      )}
    </Stack>
  );

  const markTable = (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {loadingRoster ? "Loading roster..." : `${students.length} students · default Present · click another column to change`}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {STATUSES.map((item) => (
          <Button key={item.key} size="small" variant="outlined" onClick={() => markAll(item.key)} sx={{ color: item.color, borderColor: item.border, bgcolor: item.bg, textTransform: "none", fontWeight: 700 }}>
            All {item.label}
          </Button>
        ))}
        <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={downloadClassSheet} disabled={!students.length}>
          CSV
        </Button>
        <Button size="small" startIcon={<PictureAsPdfRoundedIcon />} onClick={printClassSheet} disabled={!students.length}>
          PDF
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 48, fontWeight: 800 }}>Sr #</TableCell>
              <TableCell sx={{ width: 56, fontWeight: 800 }}>Photo</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Roll No</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
              {STATUSES.map((item) => (
                <TableCell key={item.key} align="center" sx={{ fontWeight: 800, color: item.color, bgcolor: item.bg, minWidth: 78 }}>
                  {item.label}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 800, minWidth: 180 }}>Remarks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map((row, index) => {
              const status = marks[row.student] || "present";
              return (
                <TableRow key={row.id || row.student} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Avatar src={toAbsoluteMediaUrl(row.student_avatar)} sx={{ width: 32, height: 32, bgcolor: "#1d4fbf", fontSize: "0.78rem" }}>
                      {(row.student_name || "S").slice(0, 1).toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.student_roll_no || "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.student_name || row.student}</TableCell>
                  {STATUSES.map((item) => (
                    <TableCell key={item.key} align="center" sx={{ bgcolor: status === item.key ? item.bg : "transparent" }}>
                      <Checkbox
                        checked={status === item.key}
                        onChange={() => setStatus(row.student, item.key)}
                        sx={{
                          color: item.border,
                          "&.Mui-checked": { color: item.color },
                        }}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Optional remark"
                      value={remarks[row.student] || ""}
                      onChange={(e) => setRemarks((prev) => ({ ...prev, [row.student]: e.target.value }))}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {!students.length ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary">
                    Select a course to load the class. Every student starts as Present.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  const reportTable = (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {report ? `${reportRows.length} students · ${reportSessions.length} sessions` : "Select a course to view status and percentage."}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={downloadClassReport} disabled={!reportRows.length}>
          Class CSV
        </Button>
        <Button size="small" startIcon={<PictureAsPdfRoundedIcon />} onClick={printClassReport} disabled={!reportRows.length}>
          Class PDF
        </Button>
      </Stack>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Sr #</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Photo</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Roll No</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Name</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: "#15803d" }}>P</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: "#b45309" }}>Lv</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: "#b91c1c" }}>A</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, color: "#475569" }}>Lt</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>%</TableCell>
              {reportSessions.map((item) => (
                <TableCell
                  key={item.id}
                  align="center"
                  sx={{ fontWeight: 800, cursor: canMark ? "pointer" : "default", whiteSpace: "nowrap" }}
                  onClick={() => canMark && openMarkForDate(item.session_date)}
                >
                  {item.session_date.slice(5)}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 800 }}>Record</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportRows.map((row, index) => (
              <TableRow key={row.student_id} hover>
                <TableCell>{index + 1}</TableCell>
                <TableCell>
                  <Avatar src={toAbsoluteMediaUrl(row.avatar)} sx={{ width: 30, height: 30, bgcolor: "#1d4fbf", fontSize: "0.75rem" }}>
                    {(row.name || "S").slice(0, 1).toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.roll_no || "-"}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{row.name}</TableCell>
                <TableCell align="center">{row.present}</TableCell>
                <TableCell align="center">{row.leave}</TableCell>
                <TableCell align="center">{row.absent}</TableCell>
                <TableCell align="center">{row.late}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800, color: row.percent < 75 ? "#b91c1c" : "#15803d" }}>
                  {row.percent}%
                </TableCell>
                {reportSessions.map((item) => {
                  const day = row.days?.[item.session_date];
                  const meta = STATUS_MAP[day?.status];
                  return (
                    <TableCell key={`${row.student_id}-${item.id}`} align="center" sx={{ bgcolor: meta?.bg || "transparent" }} title={day?.remark || ""}>
                      {meta ? (
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: meta.color, mx: "auto" }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                  );
                })}
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button size="small" onClick={() => setStudentDialog(row)}>
                      View
                    </Button>
                    <Button size="small" onClick={() => downloadStudentRecord(row)}>
                      CSV
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!reportRows.length ? (
              <TableRow>
                <TableCell colSpan={10}>
                  <Typography variant="body2" color="text.secondary">
                    No attendance in this period yet.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  const studentView = (
    <Stack spacing={1.2}>
      {summary ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip label={`${summary.percent || 0}% overall`} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#15803d" }} />
          <Chip label={`${summary.present || 0} present`} />
          <Chip label={`${summary.leave || 0} leave`} />
          <Chip label={`${summary.absent || 0} absent`} />
          <Chip label={`${summary.late || 0} late`} />
          <Chip label={`${summary.total || 0} sessions`} />
        </Stack>
      ) : null}
      {studentSelf ? (
        <Stack direction="row" spacing={1}>
          <Chip label={`${studentSelf.percent}% this view`} sx={{ fontWeight: 800 }} />
          <Button size="small" startIcon={<DownloadRoundedIcon />} onClick={() => downloadStudentRecord(studentSelf)}>
            My CSV
          </Button>
          <Button size="small" startIcon={<PictureAsPdfRoundedIcon />} onClick={() => printStudentRecord(studentSelf)}>
            My PDF
          </Button>
        </Stack>
      ) : null}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Course</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Topic</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>Remark</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {studentRecordRows(studentSelf).map((row) => (
              <TableRow key={`${row[0]}-${row[1]}`}>
                <TableCell>{row[0]}</TableCell>
                <TableCell>{row[1]}</TableCell>
                <TableCell>{statusChip(row[2])}</TableCell>
                <TableCell>{row[3] || "-"}</TableCell>
                <TableCell>{row[4] || "-"}</TableCell>
              </TableRow>
            ))}
            {!studentRecordRows(studentSelf).length ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No attendance recorded in this period.</Typography>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );

  return (
    <ListingPage
      title="Attendance"
      icon={<FactCheckRoundedIcon />}
      subtitle={
        isStudent
          ? "Your weekly, monthly and date-wise attendance"
          : "Mark the class with Present, Leave, Absent or Late. Review weekly, monthly and date-wise percentages."
      }
      tabs={
        !isStudent ? (
          <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 700 } }}>
            <Tab value="mark" label="Mark attendance" />
            <Tab value="report" label="Weekly / monthly / dates" />
          </Tabs>
        ) : null
      }
      toolbar={toolbar}
    >
      {isStudent ? studentView : tab === "mark" ? markTable : reportTable}
      <Dialog open={Boolean(studentDialog)} onClose={() => setStudentDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>
          {studentDialog?.name} · {studentDialog?.roll_no || "-"} · {studentDialog?.percent}%
        </DialogTitle>
        <DialogContent>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Remark</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {studentRecordRows(studentDialog).map((row) => (
                <TableRow key={`${row[0]}-${row[2]}`}>
                  <TableCell>{row[0]}</TableCell>
                  <TableCell>{statusChip(row[2])}</TableCell>
                  <TableCell>{row[4] || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => studentDialog && downloadStudentRecord(studentDialog)}>Download CSV</Button>
          <Button onClick={() => studentDialog && printStudentRecord(studentDialog)}>Download PDF</Button>
          <Button onClick={() => setStudentDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </ListingPage>
  );
};

export default AttendancePage;
