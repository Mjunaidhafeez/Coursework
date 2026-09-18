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
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/client";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const MAX_EMAIL_FILES = 5;
const MAX_EMAIL_FILE_BYTES = 25 * 1024 * 1024;
const MAX_EMAIL_TOTAL_BYTES = 25 * 1024 * 1024;
const EMAIL_FILE_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.txt,.csv";
const EMAIL_FILE_TYPES = new Set(EMAIL_FILE_ACCEPT.split(","));

const TEMPLATE_STORAGE_KEY = "mba-email-template";
const DEFAULT_HEADER_TOP = "Superior University Lahore";
const DEFAULT_HEADER_TITLE = "MBA Coursework Portal";

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(0.1, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const defaultFooter = (senderName) => (
  `This is a coursework notice from ${DEFAULT_HEADER_TITLE}.\nReply to this email to contact ${senderName || "the sender"}.\nhttps://mba.pythonanywhere.com`
);

const readStoredTemplate = () => {
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      headerTop: String(parsed.headerTop ?? ""),
      headerTitle: String(parsed.headerTitle ?? ""),
      footer: String(parsed.footer ?? ""),
    };
  } catch {
    return null;
  }
};

const roleLabel = (role) => {
  if (role === "super_admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  return "Portal user";
};

const recipientType = (item) => (item?.role === "teacher" ? "Teacher" : "Student");

const EmailStudentsPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const isTeacher = user?.role === "teacher";
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState(isTeacher ? "students" : "both");
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [sender, setSender] = useState({
    name: user?.full_name || user?.username || "",
    email: user?.email || "",
    role: user?.role || "",
  });
  const [files, setFiles] = useState([]);
  const [headerTop, setHeaderTop] = useState(DEFAULT_HEADER_TOP);
  const [headerTitle, setHeaderTitle] = useState(DEFAULT_HEADER_TITLE);
  const [footer, setFooter] = useState(() => defaultFooter(user?.full_name || user?.username || ""));
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const templateLoadedRef = useRef(false);

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
    if (audience) params.append("audience", audience);
    if (courseId) params.append("course", String(courseId));
    if (semesterId) params.append("semester", String(semesterId));
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.emailRecipients}?${params.toString()}`);
      setRecipients(data.results || []);
      setSelectedIds({});
      if (data.sender) setSender(data.sender);
      if (!templateLoadedRef.current) {
        const stored = readStoredTemplate();
        const apiTemplate = data.template || {};
        setHeaderTop(stored?.headerTop || apiTemplate.header_top || DEFAULT_HEADER_TOP);
        setHeaderTitle(stored?.headerTitle || apiTemplate.header_title || DEFAULT_HEADER_TITLE);
        setFooter(stored?.footer || apiTemplate.footer || defaultFooter(data.sender?.name || ""));
        templateLoadedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [courseId, semesterId, audience]);

  useEffect(() => {
    if (!templateLoadedRef.current) return;
    window.localStorage.setItem(
      TEMPLATE_STORAGE_KEY,
      JSON.stringify({ headerTop, headerTitle, footer })
    );
  }, [headerTop, headerTitle, footer]);

  const resetTemplate = () => {
    window.localStorage.removeItem(TEMPLATE_STORAGE_KEY);
    const nextFooter = defaultFooter(sender.name || user?.full_name || user?.username || "");
    setHeaderTop(DEFAULT_HEADER_TOP);
    setHeaderTitle(DEFAULT_HEADER_TITLE);
    setFooter(nextFooter);
  };

  const selectedRecipients = useMemo(
    () => recipients.filter((item) => selectedIds[item.id]),
    [recipients, selectedIds]
  );
  const allChecked = recipients.length > 0 && recipients.every((item) => selectedIds[item.id]);
  const someChecked = selectedRecipients.length > 0 && !allChecked;
  const studentCount = recipients.filter((item) => item.role !== "teacher").length;
  const teacherCount = recipients.filter((item) => item.role === "teacher").length;
  const senderEmail = sender.email || user?.email || "";
  const canSend = Boolean(senderEmail && subject.trim() && message.trim() && !sending);

  const toggleAll = () => {
    const nextOn = !allChecked;
    const next = {};
    if (nextOn) {
      recipients.forEach((item) => {
        next[item.id] = true;
      });
    }
    setSelectedIds(next);
  };

  const addFiles = (incoming) => {
    const chosen = Array.from(incoming || []);
    if (!chosen.length) return;
    const next = [...files];
    for (const file of chosen) {
      const ext = `.${(file.name.split(".").pop() || "").toLowerCase()}`;
      if (!EMAIL_FILE_TYPES.has(ext)) {
        notify(`${file.name} is not allowed. Use PDF, Word, PowerPoint, Excel, ZIP, image, TXT or CSV.`, "warning");
        continue;
      }
      if (file.size > MAX_EMAIL_FILE_BYTES) {
        notify(`${file.name} is larger than 25 MB.`, "warning");
        continue;
      }
      if (next.length >= MAX_EMAIL_FILES) {
        notify(`Attach up to ${MAX_EMAIL_FILES} files.`, "warning");
        break;
      }
      next.push(file);
    }
    const total = next.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_EMAIL_TOTAL_BYTES) {
      notify("Attachments together must stay under 25 MB.", "warning");
    } else {
      setFiles(next);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    const payload = new FormData();
    payload.append("subject", subject.trim());
    payload.append("message", message.trim());
    payload.append("mode", mode);
    payload.append("audience", audience);
    payload.append("header_top", headerTop.trim());
    payload.append("header_title", headerTitle.trim());
    payload.append("footer", footer.trim());
    if (courseId) payload.append("course", courseId);
    if (semesterId) payload.append("semester", semesterId);
    if (search) payload.append("search", search);
    if (mode === "selected") {
      const recipientIds = selectedRecipients.map((item) => item.id);
      if (!recipientIds.length) {
        notify("Select at least one recipient, or use Send to all.", "warning");
        return;
      }
      recipientIds.forEach((id) => payload.append("recipient_ids", String(id)));
    }
    files.forEach((file) => payload.append("files", file));
    const count = mode === "all" ? recipients.length : selectedRecipients.length;
    const fileNote = files.length ? ` with ${files.length} file(s)` : "";
    if (!window.confirm(`Send this email from ${senderEmail} to ${count} recipient(s)${fileNote}?`)) {
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.sendEmail, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      notify(data.detail || `Sent ${data.sent_count} email(s)`);
      if (data.skipped_count) {
        notify(`${data.skipped_count} recipient(s) skipped because they have no email.`, "warning");
      }
      if (data.failed_count) {
        notify(data.detail || `${data.failed_count} email(s) failed. Check SMTP settings.`, "error");
      }
      setSelectedIds({});
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not send email", "error");
    } finally {
      setSending(false);
    }
  };

  const previewName = selectedRecipients[0]?.name || recipients[0]?.name || "Recipient Name";

  return (
    <ListingPage
      title="Email"
      subtitle={isTeacher
        ? "Send to students or teachers of your courses. Filter by course and semester, then send to selected or all."
        : "Send to students and teachers. Filter by subject/course and semester, then send to selected or all."}
      filters={(
        <SearchToolbar
          label="Search name, roll or email"
          search={search}
          onSearchChange={setSearch}
          onSearch={() => loadRecipients({ searchValue: search })}
          onReset={() => {
            setSearch("");
            setAudience(isTeacher ? "students" : "both");
            setCourseId("");
            setSemesterId("");
            loadRecipients({ searchValue: "" });
          }}
          filters={(
            <>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Send to</InputLabel>
                <Select label="Send to" value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <MenuItem value="students">Students</MenuItem>
                  <MenuItem value="teachers">Teachers</MenuItem>
                  <MenuItem value="both">Students & teachers</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Course / subject</InputLabel>
                <Select label="Course / subject" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <MenuItem value="">All courses</MenuItem>
                  {courses.map((course) => (
                    <MenuItem key={course.id} value={String(course.id)}>
                      {course.code} — {course.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 140 }} disabled={audience === "teachers"}>
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
          <Alert severity="error">Your account has no email. Add it first — recipients will receive mail from that address.</Alert>
        ) : (
          <Alert severity="info">
            Sending as <strong>{sender.name || user?.full_name}</strong> ({roleLabel(sender.role || user?.role)}) from <strong>{senderEmail}</strong>.
            First delivery can land in Spam — ask recipients to open it, tap <strong>Not spam</strong>, and save the sender.
            {isTeacher ? " You can only email people from your own courses." : " Course filter applies to that subject's students and teachers. Semester applies to students."}
          </Alert>
        )}

        <Stack direction={{ xs: "column", lg: "row" }} spacing={1.2} alignItems="stretch">
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, color: "#13377a", mb: 1 }}>Compose</Typography>
            <Typography sx={{ fontWeight: 700, color: "#334155", mb: 0.8, fontSize: 13 }}>Template</Typography>
            <TextField
              size="small"
              fullWidth
              label="Header line"
              value={headerTop}
              onChange={(e) => setHeaderTop(e.target.value.slice(0, 120))}
              sx={{ mb: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              label="Header title"
              value={headerTitle}
              onChange={(e) => setHeaderTitle(e.target.value.slice(0, 120))}
              sx={{ mb: 1 }}
            />
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={3}
              label="Footer"
              value={footer}
              onChange={(e) => setFooter(e.target.value.slice(0, 1000))}
              sx={{ mb: 1 }}
            />
            <Button size="small" onClick={resetTemplate} sx={{ mb: 1.2 }}>
              Reset template
            </Button>
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
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 1.1 }}>
              <Button size="small" variant="outlined" component="label" disabled={sending || files.length >= MAX_EMAIL_FILES}>
                Attach files
                <input
                  ref={fileInputRef}
                  hidden
                  type="file"
                  multiple
                  accept={EMAIL_FILE_ACCEPT}
                  onChange={(e) => addFiles(e.target.files)}
                />
              </Button>
              <Typography variant="caption" color="text.secondary">
                Up to 5 files, 25 MB each, 25 MB total
              </Typography>
            </Stack>
            {files.length > 0 && (
              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.8 }}>
                {files.map((file, index) => (
                  <Chip
                    key={`${file.name}-${index}`}
                    size="small"
                    label={`${file.name} (${formatFileSize(file.size)})`}
                    onDelete={() => setFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  />
                ))}
              </Stack>
            )}
            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1.1 }}>
              <Button
                variant="contained"
                disabled={!canSend || !selectedRecipients.length}
                onClick={() => sendEmail("selected")}
              >
                {sending ? "Sending..." : `Send to selected (${selectedRecipients.length})`}
              </Button>
              <Button
                variant="outlined"
                disabled={!canSend || !recipients.length}
                onClick={() => sendEmail("all")}
              >
                {`Send to all (${recipients.length})`}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, border: "1px solid #dbeafe", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ bgcolor: "#102a5c", color: "#fff", px: 2, py: 1.4 }}>
              {headerTop.trim() && (
                <Typography sx={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>
                  {headerTop}
                </Typography>
              )}
              {headerTitle.trim() && (
                <Typography sx={{ fontWeight: 800 }}>{headerTitle}</Typography>
              )}
            </Box>
            <Box sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 800, color: "#102a5c", mb: 1 }}>{subject || "Subject will appear here"}</Typography>
              <Box sx={{ bgcolor: "#f8fbff", border: "1px solid #e2e8f0", borderRadius: 1, p: 1, mb: 1.2, fontSize: 13 }}>
                <div><strong>From:</strong> {sender.name || user?.full_name} ({roleLabel(sender.role || user?.role)})</div>
                <div><strong>Email:</strong> {senderEmail || "-"}</div>
                <div><strong>To:</strong> {previewName}</div>
                {files.length > 0 && (
                  <div><strong>Attached:</strong> {files.map((file) => file.name).join(", ")}</div>
                )}
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
              {footer.trim() && (
                <Typography sx={{ mt: 2, pt: 1.4, borderTop: "1px solid #e5e7eb", color: "#6b7280", fontSize: 12, whiteSpace: "pre-wrap" }}>
                  {footer}
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.8} sx={{ pt: 0.4 }}>
          <Chip size="small" variant="outlined" label={`${studentCount} students`} />
          <Chip size="small" variant="outlined" label={`${teacherCount} teachers`} />
          <Chip size="small" color="success" variant="outlined" label={`${recipients.filter((item) => item.has_email).length} with email`} />
          <Chip size="small" color="warning" variant="outlined" label={`${recipients.filter((item) => !item.has_email).length} missing email`} />
        </Stack>

        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={allChecked} indeterminate={someChecked} onChange={toggleAll} />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Roll / subjects</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Semester</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recipients.map((item) => (
                <TableRow key={item.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={!!selectedIds[item.id]}
                      onChange={() => setSelectedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                  <TableCell>
                    <Chip size="small" color={item.role === "teacher" ? "info" : "default"} label={recipientType(item)} />
                  </TableCell>
                  <TableCell>
                    {item.role === "teacher"
                      ? (item.courses?.length ? item.courses.join(", ") : "-")
                      : (item.roll_no || "-")}
                  </TableCell>
                  <TableCell>
                    {item.has_email ? item.email : <Typography variant="caption" color="error">No email</Typography>}
                  </TableCell>
                  <TableCell>{item.role === "teacher" ? "-" : (item.semester ? `Semester ${item.semester}` : "-")}</TableCell>
                </TableRow>
              ))}
              {!recipients.length && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary">No recipients match these filters.</Typography>
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
