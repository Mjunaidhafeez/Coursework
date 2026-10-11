import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import { Button, Checkbox, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import BulkActionBar from "../../components/shared/BulkActionBar";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";
import { postBulkUpdate, runBulkDelete } from "../../utils/bulkApi";
import { confirmDelete } from "../../utils/confirm";
import { listRows } from "./listRows";

const emptyForm = { kind: "notice", title: "", body: "", starts_at: "", ends_at: "", audience: "all", course: "" };

const CalendarNoticesPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const canWrite = ["super_admin", "teacher"].includes(user?.role);
  const [rows, setRows] = useState([]);
  const [courses, setCourses] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ kind: "", audience: "", course: "" });
  const [bulk, setBulk] = useState({ kind: "", audience: "" });
  const selection = useRowSelection();

  const load = async ({ searchValue = search, kind = filters.kind, audience = filters.audience, course = filters.course } = {}) => {
    const params = new URLSearchParams({ page_size: "50", ordering: "-starts_at" });
    if (searchValue) params.append("search", searchValue);
    if (kind) params.append("kind", kind);
    if (audience) params.append("audience", audience);
    if (course) params.append("course", course);
    const [noticesRes, coursesRes] = await Promise.all([
      api.get(`${ENDPOINTS.campusNotices}?${params.toString()}`),
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

  const remove = async (id) => {
    if (!confirmDelete("notice")) return;
    try {
      await api.delete(`${ENDPOINTS.campusNotices}${id}/`);
      notify("Notice deleted");
      selection.clear();
      load();
    } catch {
      notify("Delete failed", "error");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: ENDPOINTS.campusNotices, ids: selection.selectedIds, label: "notices" });
      if (!result.ok) return;
      notify("Selected notices deleted");
      selection.clear();
      load();
    } catch {
      notify("Bulk delete failed", "error");
    }
  };

  const handleBulkUpdate = async () => {
    const fields = {};
    if (bulk.kind) fields.kind = bulk.kind;
    if (bulk.audience) fields.audience = bulk.audience;
    if (!Object.keys(fields).length) {
      notify("Choose a type or audience to update", "error");
      return;
    }
    try {
      const { data } = await postBulkUpdate(ENDPOINTS.campusNotices, selection.selectedIds, fields);
      notify(`Updated ${data.updated_count || 0} notices`);
      selection.clear();
      setBulk({ kind: "", audience: "" });
      load();
    } catch {
      notify("Bulk update failed", "error");
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
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => load().catch(() => notify("Could not load calendar", "error"))}
          onReset={() => {
            setSearch("");
            setFilters({ kind: "", audience: "", course: "" });
            load({ searchValue: "", kind: "", audience: "", course: "" }).catch(() => notify("Could not load calendar", "error"));
          }}
          filters={(
            <>
              <TextField size="small" select label="Type" value={filters.kind} sx={{ minWidth: 120 }} onChange={(e) => setFilters((prev) => ({ ...prev, kind: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="notice">Notice</MenuItem>
                <MenuItem value="event">Event</MenuItem>
              </TextField>
              <TextField size="small" select label="Audience" value={filters.audience} sx={{ minWidth: 130 }} onChange={(e) => setFilters((prev) => ({ ...prev, audience: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="all">Everyone</MenuItem>
                <MenuItem value="students">Students</MenuItem>
                <MenuItem value="teachers">Teachers</MenuItem>
              </TextField>
              <TextField size="small" select label="Course" value={filters.course} sx={{ minWidth: 160 }} onChange={(e) => setFilters((prev) => ({ ...prev, course: e.target.value }))}>
                <MenuItem value="">All</MenuItem>
                {courses.map((course) => <MenuItem key={course.id} value={course.id}>{course.code}</MenuItem>)}
              </TextField>
            </>
          )}
        />
        {canWrite ? (
          <BulkActionBar
            count={selection.count}
            onClear={selection.clear}
            onDelete={handleBulkDelete}
            updateSlot={(
              <>
                <TextField size="small" select label="Type" value={bulk.kind} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, kind: e.target.value }))}>
                  <MenuItem value="">Keep</MenuItem>
                  <MenuItem value="notice">Notice</MenuItem>
                  <MenuItem value="event">Event</MenuItem>
                </TextField>
                <TextField size="small" select label="Audience" value={bulk.audience} sx={{ minWidth: 120 }} onChange={(e) => setBulk((prev) => ({ ...prev, audience: e.target.value }))}>
                  <MenuItem value="">Keep</MenuItem>
                  <MenuItem value="all">Everyone</MenuItem>
                  <MenuItem value="students">Students</MenuItem>
                  <MenuItem value="teachers">Teachers</MenuItem>
                </TextField>
                <Button size="small" variant="contained" onClick={handleBulkUpdate}>Update selected</Button>
              </>
            )}
          />
        ) : null}
        <Stack spacing={0.8}>
          {rows.length ? rows.map((item) => (
            <Stack key={item.id} direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="space-between" sx={{ p: 1, border: "1px solid #e2e8f0", borderRadius: 1.5, bgcolor: "#fff" }}>
              <Stack direction="row" spacing={0.7} alignItems="flex-start">
                {canWrite ? <Checkbox size="small" checked={selection.isSelected(item.id)} onChange={() => selection.toggle(item.id)} /> : null}
                <div>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <Typography sx={{ fontWeight: 800 }}>{item.title}</Typography>
                    <Chip size="small" label={item.kind} />
                    <Chip size="small" variant="outlined" label={item.audience} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{item.body}</Typography>
                </div>
              </Stack>
              <Stack spacing={0.5} alignItems={{ sm: "flex-end" }}>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                  {item.starts_at ? new Date(item.starts_at).toLocaleString() : ""}
                </Typography>
                {canWrite ? <Button size="small" color="error" onClick={() => remove(item.id)}>Delete</Button> : null}
              </Stack>
            </Stack>
          )) : <Typography color="text.secondary">No notices yet.</Typography>}
        </Stack>
      </Stack>
    </ListingPage>
  );
};

export default CalendarNoticesPage;
