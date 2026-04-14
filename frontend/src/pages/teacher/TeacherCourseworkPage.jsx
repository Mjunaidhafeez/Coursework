import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import SearchToolbar from "../../components/shared/SearchToolbar";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useUi } from "../../context/UiContext";
import { COURSEWORK_TYPE_OPTIONS, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { emptyCourseworkForm, toCourseworkEditForm, toCourseworkPayload, validateMaxMarks } from "../../utils/courseworkForm";
import { fetchFeedbackBySubmissionMap } from "../../utils/feedback";
import { formatDate, formatMarks } from "../../utils/format";
import { downloadSubmissionFile, openSubmissionFilePreview } from "../../utils/submissionFiles";
import { resolveSubmissionMembers } from "../../utils/submissionMembers";
import { getSubmissionStageMeta } from "../../utils/submissionWorkflow";

const TeacherCourseworkPage = () => {
  const navigate = useNavigate();
  const { notify } = useUi();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(emptyCourseworkForm);
  const [editingId, setEditingId] = useState(null);
  const [submissionsByCoursework, setSubmissionsByCoursework] = useState({});
  const [submissionLoadingByCoursework, setSubmissionLoadingByCoursework] = useState({});
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberDialogTitle, setMemberDialogTitle] = useState("");
  const [memberDialogItems, setMemberDialogItems] = useState([]);
  const [viewMode, setViewMode] = useState("opening");
  const [openCourseSections, setOpenCourseSections] = useState({});
  const [openCourseworkSections, setOpenCourseworkSections] = useState({});
  const [feedbackBySubmission, setFeedbackBySubmission] = useState({});
  const [feedbackDraftBySubmission, setFeedbackDraftBySubmission] = useState({});
  const [feedbackSavingBySubmission, setFeedbackSavingBySubmission] = useState({});

  const loadFeedbackMap = async () => {
    setFeedbackBySubmission(await fetchFeedbackBySubmissionMap(api, ENDPOINTS, 1000));
  };

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (courseFilter) params.append("course", courseFilter);
    if (typeFilter) params.append("coursework_type", typeFilter);
    if (submissionFilter) params.append("submission_type", submissionFilter);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    const query = params.toString();
    const [courseworkRes, coursesRes] = await Promise.all([
      api.get(`${ENDPOINTS.courseworks}${query ? `?${query}` : ""}`),
      api.get(ENDPOINTS.courses),
    ]);
    await loadFeedbackMap();
    setRows(courseworkRes.data.results || []);
    setTotal(courseworkRes.data.count || 0);
    setCourses(coursesRes.data.results || []);
  };

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1 });
  }, [courseFilter, typeFilter, submissionFilter]);

  const submit = async () => {
    const marksValidation = validateMaxMarks(form.max_marks);
    if (!marksValidation.ok) {
      notify(marksValidation.error, "error");
      return;
    }

    const payload = toCourseworkPayload({ ...form, max_marks: marksValidation.value });
    if (editingId) {
      await api.patch(`${ENDPOINTS.courseworks}${editingId}/`, payload);
      notify("Coursework updated");
    } else {
      await api.post(ENDPOINTS.courseworks, payload);
      notify("Coursework added");
    }
    setForm(emptyCourseworkForm);
    setEditingId(null);
    loadData();
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm(toCourseworkEditForm(row));
  };

  const remove = async (id) => {
    const previous = rows;
    setRows((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courseworks}${id}/`);
      notify("Coursework deleted");
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyCourseworkForm);
      }
      await loadData();
    } catch (err) {
      setRows(previous);
      notify(err?.response?.data?.detail || "Delete failed", "error");
    }
  };

  const loadCourseworkSubmissions = async (courseworkId) => {
    setSubmissionLoadingByCoursework((prev) => ({ ...prev, [courseworkId]: true }));
    try {
      const params = new URLSearchParams();
      params.append("coursework", String(courseworkId));
      params.append("page_size", "200");
      params.append("ordering", "submitted_at");
      const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
      setSubmissionsByCoursework((prev) => ({ ...prev, [courseworkId]: data.results || [] }));
    } finally {
      setSubmissionLoadingByCoursework((prev) => ({ ...prev, [courseworkId]: false }));
    }
  };

  const approveSubmission = async (courseworkId, submissionId) => {
    await api.post(`${ENDPOINTS.submissions}${submissionId}/approve/`);
    notify("Submission approved");
    await loadCourseworkSubmissions(courseworkId);
  };

  const rejectSubmission = async (courseworkId, submissionId) => {
    await api.post(`${ENDPOINTS.submissions}${submissionId}/reject/`);
    notify("Submission rejected");
    await loadCourseworkSubmissions(courseworkId);
  };

  const openSubmissionMembers = async (submission) => {
    try {
      const members = await resolveSubmissionMembers(api, ENDPOINTS, submission);
      setMemberDialogItems(members);
      setMemberDialogTitle(submission.topic || submission.group_name || "Submission Members");
      setMemberDialogOpen(true);
    } catch {
      notify("Could not load submission members", "error");
    }
  };

  const openFilePreview = (submission) => openSubmissionFilePreview(submission, notify);
  const downloadFile = (submission) => downloadSubmissionFile(submission, notify);

  const getFeedbackDraft = (submission) => {
    const saved = feedbackBySubmission[String(submission.id)];
    return feedbackDraftBySubmission[submission.id] || {
      marks: saved?.marks ?? submission.obtained_marks ?? "",
      feedback: saved?.feedback || "",
    };
  };

  const updateFeedbackDraft = (submissionId, patch) => {
    setFeedbackDraftBySubmission((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        ...patch,
      },
    }));
  };

  const saveFeedback = async (courseworkId, submission, maxMarks) => {
    if (!submission.file) {
      notify("Upload required before grading", "warning");
      return;
    }
    const draft = getFeedbackDraft(submission);
    if (draft.marks === "" || draft.marks === null || draft.marks === undefined) {
      notify("Marks are required", "error");
      return;
    }
    const numericMarks = Number(draft.marks);
    if (Number.isNaN(numericMarks)) {
      notify("Marks must be numeric", "error");
      return;
    }
    if (Number(maxMarks) && numericMarks > Number(maxMarks)) {
      notify(`Marks cannot exceed ${maxMarks}`, "error");
      return;
    }
    setFeedbackSavingBySubmission((prev) => ({ ...prev, [submission.id]: true }));
    try {
      const payload = {
        submission: submission.id,
        marks: numericMarks,
        feedback: draft.feedback || "",
      };
      const existing = feedbackBySubmission[String(submission.id)];
      if (existing?.id) {
        await api.patch(`${ENDPOINTS.feedback}${existing.id}/`, payload);
      } else {
        await api.post(ENDPOINTS.feedback, payload);
      }
      notify("Marks & feedback saved");
      await Promise.all([loadCourseworkSubmissions(courseworkId), loadFeedbackMap()]);
    } catch (err) {
      notify(err?.response?.data?.detail || "Failed to save marks/feedback", "error");
    } finally {
      setFeedbackSavingBySubmission((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  useEffect(() => {
    const missingIds = (rows || [])
      .map((item) => item.id)
      .filter((id) => !submissionsByCoursework[id] && !submissionLoadingByCoursework[id]);
    if (!missingIds.length) return;
    Promise.all(missingIds.map((id) => loadCourseworkSubmissions(id)));
  }, [rows]);

  const openingRows = useMemo(
    () => (rows || []).filter((item) => item.deadline && new Date(item.deadline) >= new Date()),
    [rows]
  );
  const closedRows = useMemo(
    () => (rows || []).filter((item) => item.deadline && new Date(item.deadline) < new Date()),
    [rows]
  );
  const groupByCourse = (items) => items.reduce((acc, item) => {
    const courseTitle = courses.find((course) => course.id === item.course)?.title || `Course ${item.course}`;
    if (!acc[courseTitle]) acc[courseTitle] = [];
    acc[courseTitle].push(item);
    return acc;
  }, {});
  const openingGrouped = useMemo(() => groupByCourse(openingRows), [openingRows, courses]);
  const closedGrouped = useMemo(() => groupByCourse(closedRows), [closedRows, courses]);
  const groupedCourseworks = viewMode === "opening" ? openingGrouped : closedGrouped;

  useEffect(() => {
    const nextCourse = {};
    const nextCoursework = {};
    [
      ["opening", Object.entries(openingGrouped)],
      ["closed", Object.entries(closedGrouped)],
    ].forEach(([section, groups]) => {
      groups.forEach(([courseTitle, items], courseIdx) => {
        nextCourse[`${section}-${courseTitle}`] = courseIdx === 0;
        items.forEach((item, cwIdx) => {
          nextCoursework[`${section}-cw-${item.id}`] = cwIdx === 0;
        });
      });
    });
    setOpenCourseSections(nextCourse);
    setOpenCourseworkSections(nextCoursework);
  }, [openingGrouped, closedGrouped]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }} alignItems={{ md: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Coursework creation is managed here. Student topic approvals and submissions are managed on the submissions page.
          </Typography>
          <Button size="small" variant="outlined" onClick={() => navigate("/teacher/submissions")}>
            Open Submissions
          </Button>
        </Stack>
        <Typography variant="h6" mb={1.2}>Coursework Management</Typography>
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
            loadData({ searchValue: search, pageValue: 1 });
          }}
          onReset={() => {
            setSearch("");
            setPage(1);
            loadData({ searchValue: "", pageValue: 1 });
          }}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 0.8 }}>
          <TextField select size="small" label="Filter by course" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All Courses</MenuItem>
            {courses.map((course) => <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All Types</MenuItem>
            {COURSEWORK_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by submission" value={submissionFilter} onChange={(e) => { setSubmissionFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All Submission Types</MenuItem>
            {SUBMISSION_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply Filters</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Typography sx={{ fontWeight: 700, mb: 0.8 }}>{editingId ? "Update Coursework" : "Add Coursework"}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0,1fr))" }, gap: 0.9 }}>
          <TextField select size="small" label="Course" value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}>
            {courses.map((course) => (
              <MenuItem key={course.id} value={course.id}>{course.title}</MenuItem>
            ))}
          </TextField>
          <TextField size="small" label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <TextField select size="small" label="Type" value={form.coursework_type} onChange={(e) => setForm((p) => ({ ...p, coursework_type: e.target.value }))}>
            {COURSEWORK_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Submission" value={form.submission_type} onChange={(e) => setForm((p) => ({ ...p, submission_type: e.target.value }))}>
            {SUBMISSION_TYPE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          {(form.submission_type === "group" || form.submission_type === "both") && (
            <TextField
              size="small"
              type="number"
              label="Max Members"
              value={form.max_group_members}
              onChange={(e) => setForm((p) => ({ ...p, max_group_members: e.target.value }))}
              inputProps={{ min: 2 }}
            />
          )}
          <FormControlLabel
            control={
              <Checkbox
                checked={Boolean(form.lock_at_due_time)}
                onChange={(e) => setForm((p) => ({ ...p, lock_at_due_time: e.target.checked }))}
              />
            }
            label="Lock submission at due time"
            sx={{ alignSelf: "center" }}
          />
          <TextField size="small" type="datetime-local" label="Deadline" value={form.deadline} onChange={(e) => setForm((p) => ({ ...p, deadline: e.target.value }))} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="number" label="Max Marks" value={form.max_marks} onChange={(e) => setForm((p) => ({ ...p, max_marks: e.target.value }))} />
          <TextField size="small" label="Description" multiline minRows={1} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} sx={{ gridColumn: { md: "span 2" } }} />
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 0.9 }}>
          <Button variant="contained" onClick={submit}>{editingId ? "Update" : "Add"}</Button>
          <Button variant="outlined" onClick={() => { setEditingId(null); setForm(emptyCourseworkForm); }}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <Button
            size="small"
            variant={viewMode === "opening" ? "contained" : "outlined"}
            color="info"
            onClick={() => setViewMode("opening")}
          >
            Open Work
          </Button>
          <Button
            size="small"
            variant={viewMode === "closed" ? "contained" : "outlined"}
            color="warning"
            onClick={() => setViewMode("closed")}
          >
            Closed / History
          </Button>
        </Stack>
        <Stack spacing={1.2}>
          {Object.entries(groupedCourseworks).map(([courseTitle, items]) => (
            <Paper key={courseTitle} variant="outlined" sx={{ p: 1.1, borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.04)" }}>
              <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
                <IconButton
                  size="small"
                  onClick={() => setOpenCourseSections((prev) => ({ ...prev, [`${viewMode}-${courseTitle}`]: !prev[`${viewMode}-${courseTitle}`] }))}
                >
                  {openCourseSections[`${viewMode}-${courseTitle}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                </IconButton>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Course: {courseTitle}
                </Typography>
              </Stack>
              <Collapse in={Boolean(openCourseSections[`${viewMode}-${courseTitle}`])} timeout="auto" unmountOnExit>
              <Stack spacing={0.9}>
                {items.map((item) => (
                  <Paper key={item.id} variant="outlined" sx={{ p: 1, borderColor: "#90caf9", bgcolor: "#fff" }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} justifyContent="space-between" alignItems={{ md: "center" }}>
                      <Stack spacing={0.1} direction="row" alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => setOpenCourseworkSections((prev) => ({ ...prev, [`${viewMode}-cw-${item.id}`]: !prev[`${viewMode}-cw-${item.id}`] }))}
                        >
                          {openCourseworkSections[`${viewMode}-cw-${item.id}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                        <Stack spacing={0.1}>
                          <Typography sx={{ fontWeight: 700 }}>Coursework: {item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.coursework_type} | {item.submission_type} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
                          </Typography>
                        </Stack>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={() => edit(item)}>Edit</Button>
                        <Button size="small" color="error" onClick={() => remove(item.id)}>Delete</Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
              </Collapse>
            </Paper>
          ))}
          {!Object.keys(groupedCourseworks).length && (
            <Typography variant="body2" color="text.secondary">
              {viewMode === "opening" ? "No open coursework found." : "No closed coursework found."}
            </Typography>
          )}
        </Stack>

        <Box sx={{ mt: 1.2 }}>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(newPage) => { setPage(newPage); loadData({ pageValue: newPage }); }}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); loadData({ pageValue: 1, pageSizeValue: newSize }); }}
          />
        </Box>
      </Paper>

      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{memberDialogTitle}</DialogTitle>
        <DialogContent dividers>
          <StudentMemberList members={memberDialogItems} />
        </DialogContent>
      </Dialog>
    </Stack>
  );
};

export default TeacherCourseworkPage;
