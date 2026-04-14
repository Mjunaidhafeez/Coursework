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
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { COURSEWORK_TYPE_OPTIONS, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { emptyCourseworkForm, toCourseworkEditForm, toCourseworkPayload, validateMaxMarks } from "../../utils/courseworkForm";
import { fetchFeedbackBySubmissionMap } from "../../utils/feedback";
import { formatDate, formatMarks } from "../../utils/format";
import { downloadSubmissionFile, openSubmissionFilePreview } from "../../utils/submissionFiles";
import { resolveSubmissionMembers } from "../../utils/submissionMembers";
import { getSubmissionStageMeta } from "../../utils/submissionWorkflow";
import { confirmDelete } from "../../utils/confirm";

const CourseworkPage = () => {
  const navigate = useNavigate();
  const { notify } = useUi();
  const [courseworks, setCourseworks] = useState([]);
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
  const [openCourseSections, setOpenCourseSections] = useState({});
  const [openCourseworkSections, setOpenCourseworkSections] = useState({});
  const [viewMode, setViewMode] = useState("opening");
  const [feedbackBySubmission, setFeedbackBySubmission] = useState({});
  const [feedbackDraftBySubmission, setFeedbackDraftBySubmission] = useState({});
  const [feedbackSavingBySubmission, setFeedbackSavingBySubmission] = useState({});

  const loadFeedbackMap = async () => {
    setFeedbackBySubmission(await fetchFeedbackBySubmissionMap(api, ENDPOINTS, 2000));
  };

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (courseFilter) params.append("course", courseFilter);
    if (typeFilter) params.append("coursework_type", typeFilter);
    if (submissionFilter) params.append("submission_type", submissionFilter);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));

    const [cwRes, coursesRes] = await Promise.all([api.get(`${ENDPOINTS.courseworks}?${params.toString()}`), api.get(ENDPOINTS.courses)]);
    await loadFeedbackMap();
    setCourseworks(cwRes.data.results || []);
    setTotal(cwRes.data.count || 0);
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
    setEditingId(null);
    setForm(emptyCourseworkForm);
    loadData();
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm(toCourseworkEditForm(row));
  };

  const remove = async (id) => {
    if (!confirmDelete("coursework")) {
      return;
    }
    const prev = courseworks;
    setCourseworks((curr) => curr.filter((c) => c.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courseworks}${id}/`);
      notify("Coursework deleted");
      loadData();
    } catch {
      setCourseworks(prev);
      notify("Delete failed", "error");
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
    const missingIds = (courseworks || [])
      .map((item) => item.id)
      .filter((id) => !submissionsByCoursework[id] && !submissionLoadingByCoursework[id]);
    if (!missingIds.length) return;
    Promise.all(missingIds.map((id) => loadCourseworkSubmissions(id)));
  }, [courseworks]);

  const groupByCourse = (items) => {
    const grouped = {};
    (items || []).forEach((item) => {
      const courseTitle = courses.find((course) => course.id === item.course)?.title || `Course ${item.course}`;
      if (!grouped[courseTitle]) grouped[courseTitle] = [];
      grouped[courseTitle].push(item);
    });
    return Object.entries(grouped);
  };

  const openingCourseworks = useMemo(
    () => (courseworks || []).filter((item) => item.deadline && new Date(item.deadline) >= new Date()),
    [courseworks]
  );
  const closedCourseworks = useMemo(
    () => (courseworks || []).filter((item) => item.deadline && new Date(item.deadline) < new Date()),
    [courseworks]
  );
  const openingGrouped = useMemo(() => groupByCourse(openingCourseworks), [openingCourseworks, courses]);
  const closedGrouped = useMemo(() => groupByCourse(closedCourseworks), [closedCourseworks, courses]);
  const openingCount = openingCourseworks.length;
  const closedCount = closedCourseworks.length;

  useEffect(() => {
    const next = {};
    openingGrouped.forEach(([courseTitle], idx) => {
      next[`opening-${courseTitle}`] = idx === 0;
    });
    closedGrouped.forEach(([courseTitle], idx) => {
      next[`closed-${courseTitle}`] = idx === 0;
    });
    setOpenCourseSections(next);
  }, [openingGrouped, closedGrouped]);

  useEffect(() => {
    const next = {};
    openingGrouped.forEach(([, items]) => {
      items.forEach((item, idx) => {
        next[`opening-cw-${item.id}`] = idx === 0;
      });
    });
    closedGrouped.forEach(([, items]) => {
      items.forEach((item, idx) => {
        next[`closed-cw-${item.id}`] = idx === 0;
      });
    });
    setOpenCourseworkSections(next);
  }, [openingGrouped, closedGrouped]);

  const toggleCourseSection = (sectionKey) => {
    setOpenCourseSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const toggleCourseworkSection = (sectionKey) => {
    setOpenCourseworkSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 1 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }} alignItems={{ md: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Coursework creation and editing is managed here. Student topic approvals are available on the dedicated approvals page.
          </Typography>
          <Button size="small" variant="outlined" onClick={() => navigate("/admin/coursework-approvals")}>
            Open Coursework Approvals
          </Button>
        </Stack>
        <Typography variant="h6" mb={0.8}>Coursework Management</Typography>
        <Stack direction="row" spacing={0.8} sx={{ mb: 0.8 }}>
          <Chip size="small" color="success" variant="outlined" label={`Opening: ${openingCount}`} />
          <Chip size="small" color="warning" variant="outlined" label={`Closed: ${closedCount}`} />
          <Chip size="small" variant="outlined" label={`Total: ${total}`} />
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} sx={{ mb: 0.6 }}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flex: 1, minWidth: 240 }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              setPage(1);
              loadData({ searchValue: search, pageValue: 1 });
            }}
          >
            Search
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              setSearch("");
              setPage(1);
              loadData({ searchValue: "", pageValue: 1 });
            }}
          >
            Reset
          </Button>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} sx={{ mt: 0.6 }}>
          <TextField select size="small" label="Filter by course" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
            <MenuItem value="">All Courses</MenuItem>
            {courses.map((course) => <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by type" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">All Types</MenuItem>
            {COURSEWORK_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by submission" value={submissionFilter} onChange={(e) => { setSubmissionFilter(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
            <MenuItem value="">All Submission Types</MenuItem>
            {SUBMISSION_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button size="small" variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply Filters</Button>
        </Stack>
        <Typography sx={{ fontWeight: 700, mt: 0.9, mb: 0.6 }}>{editingId ? "Update Coursework" : "Add Coursework"}</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0,1fr))" }, gap: 0.7 }}>
          <TextField select size="small" label="Course" value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))}>
            {courses.map((course) => <MenuItem key={course.id} value={course.id}>{course.title}</MenuItem>)}
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
        <Stack direction="row" spacing={0.8} sx={{ mt: 0.7, mb: 0 }}>
          <Button size="small" variant="contained" onClick={submit}>{editingId ? "Update" : "Add"}</Button>
          <Button size="small" variant="outlined" onClick={() => { setEditingId(null); setForm(emptyCourseworkForm); }}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 1 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1.2 }}>
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
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1 }}>
          {viewMode === "opening" && (
          <Paper variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", bgcolor: "#f8fbff", maxHeight: "60vh", overflowY: "auto" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Opening Coursework</Typography>
            <Stack spacing={1}>
              {openingGrouped.map(([courseTitle, items]) => (
                <Paper key={`opening-${courseTitle}`} variant="outlined" sx={{ p: 0.9, borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.04)" }}>
                  <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
                    <IconButton size="small" onClick={() => toggleCourseSection(`opening-${courseTitle}`)}>
                      {openCourseSections[`opening-${courseTitle}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Course: {courseTitle}
                    </Typography>
                  </Stack>
                  <Collapse in={Boolean(openCourseSections[`opening-${courseTitle}`])} timeout="auto" unmountOnExit>
                    <Stack spacing={0.9}>
                      {items.map((item) => (
                        <Paper key={item.id} variant="outlined" sx={{ p: 0.9, borderColor: "#90caf9", bgcolor: "#ffffff" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                          <Stack spacing={0.2} direction="row" alignItems="center">
                            <IconButton size="small" onClick={() => toggleCourseworkSection(`opening-cw-${item.id}`)}>
                              {openCourseworkSections[`opening-cw-${item.id}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                            </IconButton>
                            <Stack spacing={0.2}>
                            <Typography sx={{ fontWeight: 700 }}>
                              Coursework: {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.coursework_type} | {item.submission_type} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
                            </Typography>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={0.6}>
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
              {!openingGrouped.length && (
                <Typography variant="body2" color="text.secondary">No opening coursework found.</Typography>
              )}
            </Stack>
          </Paper>
          )}

          {viewMode === "closed" && (
          <Paper variant="outlined" sx={{ p: 1, borderColor: "#ffe0b2", bgcolor: "#fff8f0", maxHeight: "60vh", overflowY: "auto" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Closed Coursework</Typography>
            <Stack spacing={1}>
              {closedGrouped.map(([courseTitle, items]) => (
                <Paper key={`closed-${courseTitle}`} variant="outlined" sx={{ p: 0.9, borderColor: "warning.main", bgcolor: "rgba(245, 124, 0, 0.04)" }}>
                  <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
                    <IconButton size="small" onClick={() => toggleCourseSection(`closed-${courseTitle}`)}>
                      {openCourseSections[`closed-${courseTitle}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      Course: {courseTitle}
                    </Typography>
                  </Stack>
                  <Collapse in={Boolean(openCourseSections[`closed-${courseTitle}`])} timeout="auto" unmountOnExit>
                    <Stack spacing={0.9}>
                      {items.map((item) => (
                        <Paper key={item.id} variant="outlined" sx={{ p: 0.9, borderColor: "#ffcc80", bgcolor: "#ffffff" }}>
                        <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }}>
                          <Stack spacing={0.2} direction="row" alignItems="center">
                            <IconButton size="small" onClick={() => toggleCourseworkSection(`closed-cw-${item.id}`)}>
                              {openCourseworkSections[`closed-cw-${item.id}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                            </IconButton>
                            <Stack spacing={0.2}>
                            <Typography sx={{ fontWeight: 700 }}>
                              Coursework: {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.coursework_type} | {item.submission_type} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
                            </Typography>
                            </Stack>
                          </Stack>
                          <Stack direction="row" spacing={0.6}>
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
              {!closedGrouped.length && (
                <Typography variant="body2" color="text.secondary">No closed coursework found.</Typography>
              )}
            </Stack>
          </Paper>
          )}
        </Box>

        <Box sx={{ mt: 1.5 }}>
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

export default CourseworkPage;
