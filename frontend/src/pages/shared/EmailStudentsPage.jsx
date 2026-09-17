import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const roleLabel = (role) => {
  if (role === "super_admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  return "Portal user";
};

const EmailStudentsPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [sender, setSender] = useState({
    name: user?.full_name || user?.username || "",
    email: user?.email || "",
    role: user?.role || "",
  });
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const loadFilters = async () => {
    const [courseRes, semesterRes] = await Promise.all([
      api.get(`${ENDPOINTS.courses}?page_size=300`),
      api.get(`${ENDPOINTS.semesters}?ordering=number&page_size=100`),
    ]);
    setCourses(courseRes.data.results || []);
    setSemesters(semesterRes.data.results || []);
  };

  const loadRecipients = async ({ searchValue = search } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (courseId) params.append("course", String(courseId));
    if (semesterId) params.append("semester", String(semesterId));
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.emailRecipients}?${params.toString()}`);
      setStudents(data.results || []);
      if (data.sender) setSender(data.sender);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [courseId, semesterId]);

  const selectedStudents = useMemo(
    () => students.filter((item) => selectedIds[item.id]),
    [students, selectedIds]
  );
  const allChecked = students.length > 0 && students.every((item) => selectedIds[item.id]);
  const someChecked = selectedStudents.length > 0 && !allChecked;
  const senderEmail = sender.email || user?.email || "";
  const canSend = Boolean(senderEmail && subject.trim() && message.trim() && !sending);

  const toggleAll = () => {
    const nextOn = !allChecked;
    const next = {};
    if (nextOn) {
      students.forEach((item) => {
        next[item.id] = true;
      });
    }
    setSelectedIds(next);
  };

  const sendEmail = async (mode) => {
    if (!senderEmail) {
      notify("Add your email address first. Mail is sent from your portal email.", "error");
      return;
    }
    if (!subject.trim() || !message.trim()) {
      notify("Subject and message are required.", "warning");
      return;
    }
    const payload = {
      subject: subject.trim(),
      message: message.trim(),
      mode,
      course: courseId || null,
      semester: semesterId || null,
      search,
    };
    if (mode === "selected") {
      payload.student_ids = selectedStudents.map((item) => item.id);
      if (!payload.student_ids.length) {
        notify("Select at least one student, or use Send to all.", "warning");
        return;
      }
    }
    const count = mode === "all" ? students.length : selectedStudents.length;
    if (!window.confirm(`Send this email from ${senderEmail} to ${count} student(s)?`)) {
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.sendEmail, payload);
      notify(data.detail || `Sent ${data.sent_count} email(s)`);
      if (data.skipped_count) {
        notify(`${data.skipped_count} student(s) skipped because they have no email.`, "warning");
      }
      if (data.failed_count) {
        notify(data.detail || `${data.failed_count} email(s) failed. Check SMTP settings.`, "error");
      }
      setSelectedIds({});
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not send email", "error");
    } finally {
      setSending(false);
    }
  };

  const previewName = selectedStudents[0]?.name || students[0]?.name || "Student Name";

  return (
    <ListingPage
      title="Email Students"
      subtitle="Compose once. The email is sent from your portal email address to selected or all students in this list."
      filters={(
        <SearchToolbar
          label="Search name, roll or email"
          search={search}
          onSearchChange={setSearch}
          onSearch={() => loadRecipients({ searchValue: search })}
          onReset={() => {
            setSearch("");
            setCourseId("");
            setSemesterId("");
            loadRecipients({ searchValue: "" });
          }}
          filters={(
            <>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Course</InputLabel>
                <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <MenuItem value="">All courses</MenuItem>
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={String(course.id)}>
                      {course.code} — {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Semester</InputLabel>
                <Select label="Semester" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                  <MenuItem value="">All semesters</MenuItem>
                  {semesters.map((semester) => (
                    <MenuItem key={semester.id} value={String(semester.id)}>
                      Semester {semester.number}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        />
      )}
    >
      <Stack spacing={1.2}>
        {!senderEmail ? (
          <Alert severity="error">Your account has no email. Add it first — students will receive mail from that address.</Alert>
        ) : (
          <Alert severity="info">
            Sending as <strong>{sender.name || user?.full_name}</strong> ({roleLabel(sender.role || user?.role)}) from <strong>{senderEmail}</strong>.
            First delivery can land in Spam — ask students to open it, tap <strong>Not spam</strong>, and save the sender.
          </Alert>
        )}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: "#13377a", mb: 1 }}>Compose</Typography>
            <TextField
              size="small"
              fullWidth
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              sx={{ mb: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={8}
              label="Message"
              placeholder="Write the notice, deadline reminder, or announcement..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.1 }}>
              <Button
                variant="contained"
                disabled={!canSend || !selectedStudents.length}
                onClick={() => sendEmail("selected")}
              >
                {sending ? "Sending..." : `Send to selected (${selectedStudents.length})`}
              </Button>
              <Button
                variant="outlined"
                disabled={!canSend || !students.length}
                onClick={() => sendEmail("all")}
              >
                {`Send to all (${students.length})`}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, border: "1px solid #dbeafe", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ bgcolor: "#102a5c", color: "#fff", px: 2, py: 1.4 }}>
              <Typography sx={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>
                Superior University Lahore
              </Typography>
              <Typography sx={{ fontWeight: 800 }}>MBA Coursework Portal</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: "#102a5c", mb: 1 }}>{subject || "Subject will appear here"}</Typography>
              <Box sx={{ bgcolor: "#f8fbff", border: "1px solid #e2e8f0", borderRadius: 1, p: 1, mb: 1.2, fontSize: 13 }}>
                <div><strong>From:</strong> {sender.name || user?.full_name} ({roleLabel(sender.role || user?.role)})</div>
                <div><strong>Email:</strong> {senderEmail || "-"}</div>
                <div><strong>To:</strong> {previewName}</div>
              </Box>
              <Typography sx={{ mb: 1 }}>Dear {previewName},</Typography>
              <Typography sx={{ whiteSpace: "pre-wrap", color: "#1e293b", minHeight: 72 }}>
                {message || "Your message will appear in this university template."}
              </Typography>
              <Typography sx={{ mt: 2 }}>
                Regards,<br />
                <strong>{sender.name || user?.full_name}</strong><br />
                {roleLabel(sender.role || user?.role)}<br />
                {senderEmail}
              </Typography>
            </Box>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ pt: 0.4 }}>
          <Chip size="small" variant="outlined" label={`${students.length} students`} />
          <Chip size="small" color="success" variant="outlined" label={`${students.filter((item) => item.has_email).length} with email`} />
          <Chip size="small" color="warning" variant="outlined" label={`${students.filter((item) => !item.has_email).length} missing email`} />
        </Stack>

        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Roll no</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Semester</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((item) => (
                <TableRow key={item.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={!!selectedIds[item.id]}
                      onChange={() => setSelectedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                  <TableCell>{item.roll_no || "-"}</TableCell>
                  <TableCell>
                    {item.has_email ? item.email : <Typography variant="caption" color="error">No email</Typography>}
                  </TableCell>
                  <TableCell>{item.semester ? `Semester ${item.semester}` : "-"}</TableCell>
                </TableRow>
              ))}
              {!students.length && !loading && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">No students match these filters.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {loading && !isGlobalLoading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}
      </Stack>
    </ListingPage>
  );
};

export default EmailStudentsPage;
