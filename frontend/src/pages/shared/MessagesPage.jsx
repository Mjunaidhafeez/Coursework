import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/client";
import ListingPage from "../../components/shared/ListingPage";
import { COMMS, formatWhen, formatWhenShort, initialsFrom } from "../../components/shared/commsUi";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const MessagesPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const role = user?.role;
  const isAdmin = role === "super_admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [inboxQuery, setInboxQuery] = useState("");
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
  const threadScrollRef = useRef(null);
  const activeIdRef = useRef(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const active = useMemo(
    () => conversations.find((item) => String(item.id) === String(activeId)) || null,
    [conversations, activeId]
  );

  const visibleConversations = useMemo(() => {
    const query = inboxQuery.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const last = String(item.last_message || "").toLowerCase();
      return title.includes(query) || last.includes(query);
    });
  }, [conversations, inboxQuery]);

  const loadConversations = async ({ keepId, selectFirst = false } = {}) => {
    const { data } = await api.get(ENDPOINTS.conversations, { skipGlobalLoader: true });
    const rows = data.results || [];
    setConversations(rows);
    const preferred = keepId !== undefined ? keepId : activeIdRef.current;
    if (preferred && rows.some((item) => String(item.id) === String(preferred))) {
      if (String(activeIdRef.current) !== String(preferred)) setActiveId(preferred);
      return;
    }
    if (selectFirst && !activeIdRef.current && rows[0]) {
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

  const openConversation = (id) => {
    setActiveId(id);
    setMobileThreadOpen(true);
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
        await loadConversations({
          keepId: null,
          selectFirst: window.matchMedia("(min-width: 900px)").matches,
        });
      } finally {
        if (alive) setLoading(false);
      }
    };
    boot();
    const timer = window.setInterval(() => loadConversations(), 12000);
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
    const box = threadScrollRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [messages.length, activeId]);

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
      setMobileThreadOpen(true);
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
      setMobileThreadOpen(true);
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
  const showInbox = isDesktop || !mobileThreadOpen;
  const showThread = isDesktop || mobileThreadOpen;

  return (
    <ListingPage
      fill
      title="Messages"
      subtitle="Stay in the selected chat. Inbox will not jump back while you type."
      icon={<ChatBubbleOutlineRoundedIcon />}
      actions={(
        <Button
          size="small"
          variant="contained"
          startIcon={<ChatBubbleOutlineRoundedIcon />}
          onClick={() => setComposeOpen(true)}
          sx={{ whiteSpace: "nowrap" }}
        >
          New
        </Button>
      )}
    >
      <Stack direction="row" spacing={1} sx={{ flex: 1, minHeight: 0, height: "100%" }}>
        <Box
          sx={{
            width: { xs: "100%", md: 300 },
            display: showInbox ? "flex" : "none",
            flexDirection: "column",
            border: `1px solid ${COMMS.line}`,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fff",
            minHeight: 0,
          }}
        >
          <Box sx={{ px: 1.2, py: 0.9, bgcolor: COMMS.navy, color: "#fff" }}>
            <Typography sx={{ fontWeight: 800, fontSize: 13 }}>Inbox</Typography>
          </Box>
          <Box sx={{ px: 1, py: 0.8, borderBottom: `1px solid ${COMMS.line}` }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search chats"
              value={inboxQuery}
              onChange={(e) => setInboxQuery(e.target.value)}
              sx={{ "& .MuiInputBase-root": { fontSize: 13, height: 36 } }}
            />
          </Box>
          <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
            {visibleConversations.map((item) => {
              const selected = String(item.id) === String(activeId);
              return (
                <Box
                  key={item.id}
                  onClick={() => openConversation(item.id)}
                  sx={{
                    px: 1.1,
                    py: 0.95,
                    cursor: "pointer",
                    bgcolor: selected ? "#e8f0ff" : "transparent",
                    borderBottom: `1px solid ${COMMS.wash}`,
                    "&:hover": { bgcolor: selected ? "#e8f0ff" : COMMS.wash },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 34, height: 34, bgcolor: selected ? COMMS.chat : "#94a3b8", fontSize: 13, fontWeight: 800 }}>
                      {initialsFrom(item.title)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.6}>
                        <Typography noWrap sx={{ fontWeight: item.unread_count ? 800 : 650, color: COMMS.navy, fontSize: 13.5 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ fontSize: 10, color: COMMS.muted, flexShrink: 0 }}>
                          {formatWhenShort(item.last_message_at)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.6}>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {item.last_message || "No messages yet"}
                        </Typography>
                        {item.unread_count ? <Chip size="small" color="error" label={item.unread_count} sx={{ height: 18, "& .MuiChip-label": { px: 0.6, fontSize: 10 } }} /> : null}
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
            {!visibleConversations.length && !loading && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                {conversations.length ? "No chat matches this search." : "No conversations yet. Start with New."}
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: showThread ? "flex" : "none",
            flexDirection: "column",
            border: `1px solid ${COMMS.line}`,
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fff",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.8} sx={{ px: 1.2, py: 0.85, bgcolor: COMMS.navy, color: "#fff" }}>
            {!isDesktop ? (
              <IconButton size="small" onClick={() => setMobileThreadOpen(false)} sx={{ color: "#fff" }}>
                <ArrowBackRoundedIcon fontSize="small" />
              </IconButton>
            ) : null}
            <Avatar sx={{ width: 30, height: 30, bgcolor: "#3b82f6", fontSize: 12, fontWeight: 800 }}>
              {initialsFrom(active?.title || "Chat")}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>{active?.title || "Select a conversation"}</Typography>
              {active?.member_count > 2 ? (
                <Typography sx={{ fontSize: 11, opacity: 0.8 }}>{active.member_count} people</Typography>
              ) : null}
            </Box>
          </Stack>
          <Box ref={threadScrollRef} sx={{ flex: 1, p: 1.3, overflow: "auto", minHeight: 0, bgcolor: COMMS.wash }}>
            {messages.map((item) => {
              const mine = item.sender?.id === user?.id;
              const fromWhatsapp = item.source === "whatsapp";
              return (
                <Box key={item.id} sx={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", mb: 1 }}>
                  <Box
                    sx={{
                      maxWidth: "78%",
                      bgcolor: mine ? COMMS.navy : "#fff",
                      color: mine ? "#fff" : "#1e293b",
                      border: mine ? 0 : `1px solid ${COMMS.line}`,
                      borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      px: 1.2,
                      py: 0.75,
                    }}
                  >
                    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.25 }}>
                      <Typography sx={{ fontSize: 11, opacity: 0.8 }}>
                        {item.sender?.name} · {item.sender?.role_label}
                      </Typography>
                      {fromWhatsapp ? (
                        <Chip
                          size="small"
                          icon={<WhatsAppIcon sx={{ fontSize: "12px !important" }} />}
                          label="WhatsApp"
                          sx={{ height: 18, bgcolor: mine ? "rgba(255,255,255,0.14)" : "#ecfdf5", color: mine ? "#fff" : COMMS.whatsapp, "& .MuiChip-label": { px: 0.5, fontSize: 10 } }}
                        />
                      ) : null}
                    </Stack>
                    <Typography sx={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{item.body}</Typography>
                    <Typography sx={{ fontSize: 10, opacity: 0.7, mt: 0.35, textAlign: "right" }}>{formatWhen(item.created_at)}</Typography>
                  </Box>
                </Box>
              );
            })}
            {!messages.length && active ? (
              <Typography variant="body2" color="text.secondary">No messages in this thread yet.</Typography>
            ) : null}
            {!active ? (
              <Typography variant="body2" color="text.secondary">Choose a chat from inbox to start typing.</Typography>
            ) : null}
          </Box>
          <Stack direction="row" spacing={0.8} alignItems="flex-end" sx={{ p: 1, borderTop: `1px solid ${COMMS.line}`, bgcolor: "#fff" }}>
            <TextField
              size="small"
              fullWidth
              multiline
              maxRows={4}
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      color="primary"
                      disabled={!active || !draft.trim() || sending}
                      onClick={sendReply}
                      sx={{ bgcolor: !active || !draft.trim() ? "transparent" : "#e8f0ff" }}
                    >
                      <SendRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Box>
      </Stack>
      {loading && !isGlobalLoading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} fullWidth maxWidth="sm" scroll="paper" sx={{ "& .MuiDialog-paper": { m: { xs: 1, sm: 2 }, width: { xs: "calc(100% - 16px)", sm: "auto" } } }}>
        <DialogTitle sx={{ pb: 1 }}>New message</DialogTitle>
        <DialogContent>
          <Stack spacing={1.2} sx={{ mt: 0.5 }}>
            <Alert severity="info" sx={{ py: 0.6 }}>
              {isAdmin
                ? "Message one person, a semester, all students, or all teachers."
                : isTeacher
                  ? "Message your course students, a semester group, or an administrator."
                  : "Message your course teachers or an administrator."}
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
          <Button variant="contained" startIcon={<SendRoundedIcon />} disabled={sending} onClick={startConversation}>Send</Button>
        </DialogActions>
      </Dialog>
    </ListingPage>
  );
};

export default MessagesPage;
