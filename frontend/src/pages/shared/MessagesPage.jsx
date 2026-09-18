import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/client";
import ListingPage from "../../components/shared/ListingPage";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const formatWhen = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const MessagesPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const role = user?.role;
  const isAdmin = role === "super_admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [target, setTarget] = useState(isStudent ? "teacher" : "student");
  const [people, setPeople] = useState([]);
  const [personId, setPersonId] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesterId, setSemesterId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const bottomRef = useRef(null);

  const active = useMemo(
    () => conversations.find((item) => String(item.id) === String(activeId)) || null,
    [conversations, activeId]
  );

  const loadConversations = async ({ keepId = activeId } = {}) => {
    const { data } = await api.get(ENDPOINTS.conversations, { skipGlobalLoader: true });
    const rows = data.results || [];
    setConversations(rows);
    if (keepId && rows.some((item) => String(item.id) === String(keepId))) {
      setActiveId(keepId);
    } else if (!keepId && rows[0]) {
      setActiveId(rows[0].id);
    }
  };

  const loadMessages = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    const { data } = await api.get(`${ENDPOINTS.conversations}${conversationId}/messages/`, { skipGlobalLoader: true });
    setMessages(data.results || []);
    await api.post(`${ENDPOINTS.conversations}${conversationId}/read/`, {}, { skipGlobalLoader: true });
  };

  const loadPeople = async () => {
    const params = new URLSearchParams();
    if (target === "student" || target === "teacher" || target === "super_admin") {
      params.append("role", target);
    }
    if (semesterId && target === "student") params.append("semester", semesterId);
    if (courseId) params.append("course", courseId);
    const { data } = await api.get(`${ENDPOINTS.conversationRecipients}?${params.toString()}`, { skipGlobalLoader: true });
    setPeople(data.results || []);
  };

  useEffect(() => {
    let alive = true;
    const boot = async () => {
      setLoading(true);
      try {
        const [semesterRes, courseRes] = await Promise.all([
          api.get(`${ENDPOINTS.semesters}?ordering=number&page_size=100`),
          api.get(`${ENDPOINTS.courses}?page_size=300`),
        ]);
        if (!alive) return;
        setSemesters(semesterRes.data.results || []);
        setCourses(courseRes.data.results || []);
        await loadConversations({ keepId: null });
      } finally {
        if (alive) setLoading(false);
      }
    };
    boot();
    const timer = window.setInterval(() => loadConversations({ keepId: activeId }), 12000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    loadMessages(activeId);
    const timer = window.setInterval(() => loadMessages(activeId), 6000);
    return () => window.clearInterval(timer);
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!composeOpen) return;
    if (target === "student" || target === "teacher" || target === "super_admin") {
      loadPeople();
    }
  }, [composeOpen, target, semesterId, courseId]);

  const sendReply = async () => {
    if (!activeId || !draft.trim()) return;
    setSending(true);
    try {
      await api.post(`${ENDPOINTS.conversations}${activeId}/messages/`, { body: draft.trim() });
      setDraft("");
      await loadMessages(activeId);
      await loadConversations({ keepId: activeId });
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not send message", "error");
    } finally {
      setSending(false);
    }
  };

  const startConversation = async () => {
    if (!firstMessage.trim()) {
      notify("Write a message first.", "warning");
      return;
    }
    const payload = { body: firstMessage.trim() };
    if (target === "all_students" || target === "semester_students" || target === "all_teachers" || target === "course_students") {
      if (target === "semester_students" && !semesterId) {
        notify("Select a semester.", "warning");
        return;
      }
      payload.kind = "broadcast";
      payload.audience = target === "all_teachers" ? "teachers" : "students";
      if (target === "semester_students" && semesterId) payload.semester = semesterId;
      if ((target === "course_students" || target === "semester_students") && courseId) payload.course = courseId;
      if (target === "all_teachers") payload.title = "All teachers";
      if (target === "all_students") payload.title = "All students";
      if (target === "semester_students") payload.title = "Semester students";
      if (target === "course_students") payload.title = "Course students";
    } else {
      payload.kind = "direct";
      if (!personId) {
        notify("Select a person.", "warning");
        return;
      }
      payload.user_id = personId;
    }
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.conversations, payload);
      notify("Message sent");
      setComposeOpen(false);
      setFirstMessage("");
      setPersonId("");
      await loadConversations({ keepId: data.id });
      setActiveId(data.id);
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not start conversation", "error");
    } finally {
      setSending(false);
    }
  };

  const targetOptions = [
    isAdmin || isTeacher ? { id: "student", label: "One student" } : null,
    isAdmin || isStudent ? { id: "teacher", label: "One teacher" } : null,
    isStudent || isTeacher ? { id: "super_admin", label: "Administrator" } : null,
    isAdmin || isTeacher ? { id: "all_students", label: "All students" } : null,
    isAdmin || isTeacher ? { id: "semester_students", label: "Semester students" } : null,
    isTeacher ? { id: "course_students", label: "Course students" } : null,
    isAdmin ? { id: "all_teachers", label: "All teachers" } : null,
  ].filter(Boolean);

  const needsPerson = ["student", "teacher", "super_admin"].includes(target);
  const needsSemester = target === "semester_students" || (target === "student" && (isAdmin || isTeacher));
  const needsCourse = target === "course_students" || (target === "student" && isTeacher);

  return (
    <ListingPage
      title="Messages"
      subtitle="Portal-to-portal chat. Messages stay inside the portal for the people you are allowed to contact."
      actions={(
        <Button variant="contained" onClick={() => setComposeOpen(true)}>
          New message
        </Button>
      )}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} sx={{ minHeight: { xs: 280, md: 520 }, height: "100%" }}>
        <Box sx={{ width: { xs: "100%", md: 300 }, border: "1px solid #dbeafe", borderRadius: 2, overflow: "hidden", bgcolor: "#fff" }}>
          <Box sx={{ px: 1.5, py: 1, bgcolor: "#102a5c", color: "#fff" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Inbox</Typography>
          </Box>
          <Box sx={{ maxHeight: 560, overflow: "auto" }}>
            {conversations.map((item) => (
              <Box
                key={item.id}
                onClick={() => setActiveId(item.id)}
                sx={{
                  px: 1.4,
                  py: 1.1,
                  cursor: "pointer",
                  bgcolor: String(item.id) === String(activeId) ? "#e8f0ff" : "transparent",
                  borderBottom: "1px solid #eef2f7",
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: item.unread_count ? 800 : 600, color: "#102a5c", fontSize: 14 }}>
                    {item.title}
                  </Typography>
                  {item.unread_count ? <Chip size="small" color="error" label={item.unread_count} /> : null}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {item.last_message || "No messages yet"}
                </Typography>
              </Box>
            ))}
            {!conversations.length && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No conversations yet. Start with New message.
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, border: "1px solid #dbeafe", borderRadius: 2, overflow: "hidden", bgcolor: "#fff", display: "flex", flexDirection: "column" }}>
          <Box sx={{ px: 2, py: 1.2, bgcolor: "#102a5c", color: "#fff" }}>
            <Typography sx={{ fontWeight: 800 }}>{active?.title || "Select a conversation"}</Typography>
            {active?.member_count > 2 ? (
              <Typography sx={{ fontSize: 12, opacity: 0.8 }}>{active.member_count} people</Typography>
            ) : null}
          </Box>
          <Box sx={{ flex: 1, p: 1.5, overflow: "auto", minHeight: 320, bgcolor: "#f8fbff" }}>
            {messages.map((item) => {
              const mine = item.sender?.id === user?.id;
              return (
                <Box key={item.id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", mb: 1 }}>
                  <Box sx={{ maxWidth: "78%", bgcolor: mine ? "#102a5c" : "#fff", color: mine ? "#fff" : "#1e293b", border: mine ? 0 : "1px solid #dbeafe", borderRadius: 2, px: 1.2, py: 0.8 }}>
                    <Typography sx={{ fontSize: 11, opacity: 0.8, mb: 0.3 }}>
                      {item.sender?.name} · {item.sender?.role_label}
                      {item.source === "whatsapp" ? " · WhatsApp" : ""}
                    </Typography>
                    <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{item.body}</Typography>
                    <Typography sx={{ fontSize: 10, opacity: 0.7, mt: 0.4 }}>{formatWhen(item.created_at)}</Typography>
                  </Box>
                </Box>
              );
            })}
            {!messages.length && active ? (
              <Typography variant="body2" color="text.secondary">No messages in this thread yet.</Typography>
            ) : null}
            <div ref={bottomRef} />
          </Box>
          <Stack direction="row" spacing={1} sx={{ p: 1.2, borderTop: "1px solid #e2e8f0" }}>
            <TextField
              size="small"
              fullWidth
              placeholder={active ? "Write a reply..." : "Select a conversation first"}
              value={draft}
              disabled={!active || sending}
              onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendReply();
                }
              }}
            />
            <Button variant="contained" disabled={!active || !draft.trim() || sending} onClick={sendReply}>
              Send
            </Button>
          </Stack>
        </Box>
      </Stack>
      {loading && !isGlobalLoading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New message</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 0.5 }}>
            <Alert severity="info">
              {isAdmin
                ? "You can message one student, one teacher, all students, a semester, or all teachers."
                : isTeacher
                  ? "You can message your course students, a semester group from your courses, or an administrator."
                  : "You can message your course teachers or an administrator."}
            </Alert>
            <FormControl size="small" fullWidth>
              <InputLabel>Send to</InputLabel>
              <Select label="Send to" value={target} onChange={(e) => { setTarget(e.target.value); setPersonId(""); }}>
                {targetOptions.map((item) => (
                  <MenuItem key={item.id} value={item.id}>{item.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {needsSemester && (
              <FormControl size="small" fullWidth>
                <InputLabel>Semester</InputLabel>
                <Select label="Semester" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                  <MenuItem value="">{target === "semester_students" ? "Select semester" : "All semesters"}</MenuItem>
                  {semesters.map((item) => (
                    <MenuItem key={item.id} value={String(item.id)}>Semester {item.number}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {needsCourse && (
              <FormControl size="small" fullWidth>
                <InputLabel>Course</InputLabel>
                <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <MenuItem value="">All my courses</MenuItem>
                  {courses.map((item) => (
                    <MenuItem key={item.id} value={String(item.id)}>{item.code} — {item.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {needsPerson && (
              <FormControl size="small" fullWidth>
                <InputLabel>Person</InputLabel>
                <Select label="Person" value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <MenuItem value="">Select person</MenuItem>
                  {people.map((item) => (
                    <MenuItem key={item.id} value={String(item.id)}>
                      {item.name} {item.roll_no ? `(${item.roll_no})` : ""} — {item.role_label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={4}
              label="Message"
              value={firstMessage}
              onChange={(e) => setFirstMessage(e.target.value.slice(0, 4000))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={sending} onClick={startConversation}>Send</Button>
        </DialogActions>
      </Dialog>
    </ListingPage>
  );
};

export default MessagesPage;
