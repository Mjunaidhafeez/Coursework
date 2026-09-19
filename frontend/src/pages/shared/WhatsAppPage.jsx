import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
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
import { COMMS, CommsSection } from "../../components/shared/commsUi";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const WhatsAppPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isAdmin = user?.role === "super_admin";
  const isTeacher = user?.role === "teacher";
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    enabled: false,
    phone_number_id: "",
    token: "",
    verify_token: "mba-whatsapp",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [testPhone, setTestPhone] = useState(user?.phone || "");
  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("students");
  const [courseId, setCourseId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState({});
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value || "");
      notify(`${label} copied`);
    } catch {
      notify("Could not copy. Select and copy manually.", "warning");
    }
  };

  const loadSettings = async () => {
    const { data } = await api.get(ENDPOINTS.whatsappSettings);
    setSettings(data);
    setForm({
      enabled: Boolean(data.enabled),
      phone_number_id: data.phone_number_id || "",
      token: "",
      verify_token: data.verify_token || "mba-whatsapp",
    });
  };

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
    params.append("audience", isTeacher ? "students" : audience);
    if (courseId) params.append("course", String(courseId));
    if (semesterId) params.append("semester", String(semesterId));
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.emailRecipients}?${params.toString()}`);
      setRecipients(data.results || []);
      setSelectedIds({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings().catch(() => {});
    loadFilters();
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [courseId, semesterId, audience]);

  const selectedRecipients = useMemo(
    () => recipients.filter((item) => selectedIds[item.id]),
    [recipients, selectedIds]
  );
  const allChecked = recipients.length > 0 && recipients.every((item) => selectedIds[item.id]);
  const withPhone = recipients.filter((item) => item.has_phone || item.phone).length;

  const toggleAll = () => {
    const nextOn = !allChecked;
    const next = {};
    if (nextOn) recipients.forEach((item) => { next[item.id] = true; });
    setSelectedIds(next);
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: form.enabled,
        phone_number_id: form.phone_number_id,
        verify_token: form.verify_token,
      };
      if (form.token.trim()) payload.token = form.token.trim();
      const { data } = await api.patch(ENDPOINTS.whatsappSettings, payload);
      setSettings(data);
      setForm((prev) => ({ ...prev, token: "", enabled: data.enabled, phone_number_id: data.phone_number_id, verify_token: data.verify_token }));
      notify(data.enabled ? "WhatsApp connected" : "WhatsApp settings saved (currently off)");
    } catch (err) {
      notify(err?.response?.data?.detail || "Could not save WhatsApp settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendWhatsapp = async (mode) => {
    if (!message.trim()) {
      notify("Message is required", "warning");
      return;
    }
    const payload = {
      message: message.trim(),
      mode,
      audience: isTeacher ? "students" : audience,
    };
    if (courseId) payload.course = courseId;
    if (semesterId) payload.semester = semesterId;
    if (search) payload.search = search;
    if (mode === "selected") {
      const ids = selectedRecipients.map((item) => item.id);
      if (!ids.length) {
        notify("Select at least one recipient, or send to all.", "warning");
        return;
      }
      payload.recipient_ids = ids;
    }
    const count = mode === "all" ? recipients.length : selectedRecipients.length;
    if (!window.confirm(`Send this WhatsApp to ${count} recipient(s)? People without a phone will be skipped.`)) {
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.sendWhatsapp, payload);
      notify(data.detail || `Sent ${data.sent_count}`);
      if (data.skipped_count) notify(`${data.skipped_count} skipped (no phone).`, "warning");
      if (data.failed_count) notify(data.failed?.[0]?.detail || `${data.failed_count} failed.`, "error");
      setSelectedIds({});
    } catch (err) {
      notify(err?.response?.data?.detail || "WhatsApp send failed", "error");
    } finally {
      setSending(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim() || !message.trim()) {
      notify("Enter a test phone and a message.", "warning");
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.sendWhatsapp, { message: message.trim(), test_phone: testPhone.trim() });
      notify(data.detail || "Test WhatsApp sent");
    } catch (err) {
      notify(err?.response?.data?.detail || "Test failed", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <ListingPage
      title="WhatsApp"
      icon={<WhatsAppIcon />}
      subtitle="Send portal updates on WhatsApp. Replies land in Messages."
    >
      <Stack spacing={1.2}>
      <Alert severity={settings?.enabled ? "success" : "warning"} icon={<WhatsAppIcon fontSize="inherit" />} sx={{ py: 0.6 }}>
        {settings?.enabled
          ? "WhatsApp is connected. Portal notifications and messages go to WhatsApp. Replies appear on Messages."
          : "WhatsApp is off until Admin saves Phone number ID, Access token, and turns Enable on."}
      </Alert>

      {isAdmin ? (
        <CommsSection
          icon={<SettingsRoundedIcon />}
          title="API settings"
          subtitle="Meta Cloud API · webhook · enable"
          accent={COMMS.whatsapp}
        >
          <Accordion defaultExpanded={!settings?.enabled} disableGutters elevation={0} sx={{ border: `1px solid ${COMMS.line}`, borderRadius: "8px !important", "&:before": { display: "none" } }}>
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ minHeight: 40, "& .MuiAccordionSummary-content": { my: 0.5 } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13, color: COMMS.ink }}>Configure connection</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2, fontSize: 12.5 }}>
                Meta → WhatsApp → API Setup se Phone number ID aur token copy karo. Webhook URL aur verify token yahan se paste karo, messages field subscribe karo, phir Enable on karke Save.
              </Typography>
              {settings?.webhook_url ? (
                <Alert severity={settings.enabled ? "success" : "info"} sx={{ mb: 1, py: 0.5 }}>
                  {settings.token_set ? `Token saved ${settings.token_hint}` : "Token not saved yet"}
                  {settings.subscribe_detail ? ` · ${settings.subscribe_detail}` : ""}
                </Alert>
              ) : null}
              <Alert severity={settings?.last_webhook_at ? "success" : "warning"} sx={{ mb: 1, py: 0.5 }}>
                {settings?.last_webhook_at
                  ? `Last webhook: ${settings.last_webhook_note || "received"} (${new Date(settings.last_webhook_at).toLocaleString()})`
                  : "No WhatsApp reply has reached the portal yet."}
              </Alert>
              <Stack spacing={1.1}>
                <FormControlLabel
                  control={<Switch checked={form.enabled} onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))} />}
                  label="Enable WhatsApp"
                />
                <TextField size="small" label="Phone number ID" value={form.phone_number_id} onChange={(e) => setForm((prev) => ({ ...prev, phone_number_id: e.target.value }))} />
                <TextField size="small" label="Access token" type="password" value={form.token} onChange={(e) => setForm((prev) => ({ ...prev, token: e.target.value }))} helperText="Leave blank to keep the saved token." />
                <TextField size="small" label="Webhook verify token" value={form.verify_token} onChange={(e) => setForm((prev) => ({ ...prev, verify_token: e.target.value }))} />
                <TextField size="small" label="Webhook URL" value={settings?.webhook_url || ""} InputProps={{ readOnly: true }} helperText="Paste this exact URL in Meta. Keep the trailing slash." />
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button variant="contained" disabled={saving} onClick={saveSettings}>
                    {saving ? "Saving..." : "Save settings"}
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copyText(settings?.webhook_url, "Webhook URL")}>
                    Webhook
                  </Button>
                  <Button variant="outlined" startIcon={<ContentCopyRoundedIcon />} onClick={() => copyText(form.verify_token, "Verify token")}>
                    Verify token
                  </Button>
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </CommsSection>
      ) : (
        <Alert severity="info" sx={{ py: 0.6 }}>
          Admin connects WhatsApp once. Teachers can then message selected or all students. Students and teachers need a phone with country code on their profile.
        </Alert>
      )}

      <CommsSection
        icon={<WhatsAppIcon />}
        title="Compose"
        subtitle="Test one number, or send to selected / all listed people"
        accent={COMMS.whatsapp}
      >
        <TextField
          size="small"
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          minRows={4}
          placeholder="Type the WhatsApp message"
          fullWidth
        />
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mt: 1.1 }}>
          <TextField
            size="small"
            label="Test phone"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            helperText="Country code ke sath"
            sx={{ minWidth: 180 }}
          />
          <Button variant="outlined" startIcon={<SendRoundedIcon />} disabled={sending} onClick={sendTest}>Test</Button>
          <Button variant="contained" startIcon={<SendRoundedIcon />} disabled={sending} onClick={() => sendWhatsapp("selected")}>Selected</Button>
          <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} disabled={sending} onClick={() => sendWhatsapp("all")}>All listed</Button>
        </Stack>
      </CommsSection>

      <CommsSection
        icon={<WhatsAppIcon />}
        title="Recipients"
        subtitle={`${recipients.length} listed · ${withPhone} have a phone`}
        accent={COMMS.whatsapp}
      >
      <SearchToolbar
        search={search}
        onSearchChange={setSearch}
        onSearch={() => loadRecipients()}
        onReset={() => {
          setSearch("");
          setCourseId("");
          setSemesterId("");
          setAudience("students");
        }}
        filters={(
          <>
            {!isTeacher ? (
              <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
                <InputLabel>Audience</InputLabel>
                <Select label="Audience" value={audience} onChange={(e) => setAudience(e.target.value)}>
                  <MenuItem value="students">Students</MenuItem>
                  <MenuItem value="teachers">Teachers</MenuItem>
                  <MenuItem value="both">Both</MenuItem>
                </Select>
              </FormControl>
            ) : null}
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
              <InputLabel>Course</InputLabel>
              <Select label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                <MenuItem value="">All courses</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>{course.code} — {course.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 140 } }}>
              <InputLabel>Semester</InputLabel>
              <Select label="Semester" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                <MenuItem value="">All semesters</MenuItem>
                {semesters.map((item) => (
                  <MenuItem key={item.id} value={item.id}>Semester {item.number}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      />
      {loading ? <CircularProgress size={14} sx={{ ml: 1, mb: 1 }} /> : null}
      <TableContainer sx={{ mt: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={allChecked} indeterminate={selectedRecipients.length > 0 && !allChecked} onChange={toggleAll} />
              </TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Roll / Email</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recipients.map((item) => (
              <TableRow key={item.id}>
                <TableCell padding="checkbox">
                  <Checkbox checked={Boolean(selectedIds[item.id])} onChange={() => setSelectedIds((prev) => ({ ...prev, [item.id]: !prev[item.id] }))} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                <TableCell>{item.role === "teacher" ? "Teacher" : "Student"}</TableCell>
                <TableCell>
                  {item.phone ? item.phone : <Chip size="small" label="No phone" />}
                </TableCell>
                <TableCell>{item.roll_no || item.email || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      </CommsSection>
      </Stack>
    </ListingPage>
  );
};

export default WhatsAppPage;
