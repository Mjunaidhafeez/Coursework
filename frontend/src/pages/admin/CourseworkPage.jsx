import {
  Box,
  Button,
  Chip,
  Collapse,
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
import CourseworkFormSection from "../../components/shared/CourseworkFormSection";
import ModuleHero from "../../components/shared/ModuleHero";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { buildCourseworkTypeOptions, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import {
  emptyCourseworkForm,
  toCourseworkEditForm,
  toCourseworkPayload,
  validateCourseworkForm,
  validateMaxMarks,
} from "../../utils/courseworkForm";
import { formatDate } from "../../utils/format";
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
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [openCourseSections, setOpenCourseSections] = useState({});
  const [openCourseworkSections, setOpenCourseworkSections] = useState({});
  const [viewMode, setViewMode] = useState("opening");
  const toggleSx = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: "#1565c0" },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      bgcolor: "#90caf9",
      opacity: 1,
    },
    "& .MuiSwitch-track": {
      bgcolor: "#cfd8dc",
      opacity: 1,
      transition: "all 180ms ease",
    },
    "& .MuiSwitch-thumb": {
      boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
    },
  };

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (courseFilter) params.append("course", courseFilter);
    if (typeFilter) params.append("coursework_type", typeFilter);
    if (submissionFilter) params.append("submission_type", submissionFilter);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));

    const [cwRes, coursesRes] = await Promise.allSettled([
      api.get(`${ENDPOINTS.courseworks}?${params.toString()}`),
      api.get(ENDPOINTS.courses),
    ]);

    if (coursesRes.status === "fulfilled") {
      const payload = coursesRes.value?.data;
      setCourses(Array.isArray(payload) ? payload : payload?.results || []);
    } else {
      setCourses([]);
      notify("Courses could not be loaded", "error");
    }

    if (cwRes.status === "fulfilled") {
      const payload = cwRes.value?.data;
      setCourseworks(payload?.results || []);
      setTotal(payload?.count || 0);
    } else {
      setCourseworks([]);
      setTotal(0);
      notify(
        cwRes.reason?.response?.data?.detail || "Assessment list could not be loaded. Please run backend migrations.",
        "error"
      );
    }
  };

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1 });
  }, [courseFilter, typeFilter, submissionFilter]);

  const submit = async () => {
    const formValidation = validateCourseworkForm(form);
    setFormErrors(formValidation.errors);
    if (!formValidation.ok) {
      const firstError = Object.values(formValidation.errors)[0] || "Please fill required fields";
      notify(firstError, "error");
      return;
    }

    const marksValidation = validateMaxMarks(form.max_marks);
    if (!marksValidation.ok) {
      notify(marksValidation.error, "error");
      return;
    }

    const payload = toCourseworkPayload({ ...form, max_marks: marksValidation.value });
    try {
      if (editingId) {
        await api.patch(`${ENDPOINTS.courseworks}${editingId}/`, payload);
        notify("Assessment updated");
      } else {
        await api.post(ENDPOINTS.courseworks, payload);
        notify("Assessment added");
      }
    } catch (err) {
      const serverErrors = extractFieldErrors(err?.response?.data);
      if (Object.keys(serverErrors).length) {
        setFormErrors((prev) => ({ ...prev, ...serverErrors }));
      }
      notify(extractApiErrorMessage(err), "error");
      return;
    }
    setEditingId(null);
    setForm(emptyCourseworkForm);
    setFormErrors({});
    loadData();
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm(toCourseworkEditForm(row));
    setFormErrors({});
  };

  const remove = async (id) => {
    if (!confirmDelete("assessment")) {
      return;
    }
    const prev = courseworks;
    setCourseworks((curr) => curr.filter((c) => c.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courseworks}${id}/`);
      notify("Assessment deleted");
      loadData();
    } catch {
      setCourseworks(prev);
      notify("Delete failed", "error");
    }
  };

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
  const courseworkTypeOptions = useMemo(
    () => buildCourseworkTypeOptions(courseworks.map((item) => item.coursework_type)),
    [courseworks]
  );

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
      <ModuleHero
        title="Assessment Management"
        subtitle="Assessment creation and editing is managed here. Student topic approvals are available on the dedicated approvals page."
        chips={[
          { label: `Opening: ${openingCount}`, color: "success", variant: "outlined" },
          { label: `Closed: ${closedCount}`, color: "warning", variant: "outlined" },
          { label: `Total: ${total}`, variant: "outlined" },
        ]}
        actions={(
          <Button size="small" variant="outlined" onClick={() => navigate("/admin/coursework-approvals")}>
            Open Assessment Approvals
          </Button>
        )}
      >

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
            {courseworkTypeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by submission" value={submissionFilter} onChange={(e) => { setSubmissionFilter(e.target.value); setPage(1); }} sx={{ minWidth: 200 }}>
            <MenuItem value="">All Submission Types</MenuItem>
            {SUBMISSION_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button size="small" variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply Filters</Button>
        </Stack>
        <CourseworkFormSection
          form={form}
          formErrors={formErrors}
          editingId={editingId}
          courses={courses}
          courseworkTypeOptions={courseworkTypeOptions}
          submissionTypeOptions={SUBMISSION_TYPE_OPTIONS}
          toggleSx={toggleSx}
          datalistId="admin-coursework-type-options"
          onSubmit={submit}
          onClear={() => {
            setEditingId(null);
            setForm(emptyCourseworkForm);
            setFormErrors({});
          }}
          setForm={setForm}
          setFormErrors={setFormErrors}
        />
      </ModuleHero>

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
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Opening Assessment</Typography>
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
                              Assessment: {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.coursework_type} | {item.submission_type} | Approval: {item.approval_required ? "Required" : "Auto"} | Topic Dup: {item.topic_duplication_allowed ? "Allowed" : "Not Allowed"} | Auto-Approve All: {item.auto_approve_all_students ? "On" : "Off"} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
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
                <Typography variant="body2" color="text.secondary">No opening assessment found.</Typography>
              )}
            </Stack>
          </Paper>
          )}

          {viewMode === "closed" && (
          <Paper variant="outlined" sx={{ p: 1, borderColor: "#ffe0b2", bgcolor: "#fff8f0", maxHeight: "60vh", overflowY: "auto" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>Closed Assessment</Typography>
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
                              Assessment: {item.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {item.coursework_type} | {item.submission_type} | Approval: {item.approval_required ? "Required" : "Auto"} | Topic Dup: {item.topic_duplication_allowed ? "Allowed" : "Not Allowed"} | Auto-Approve All: {item.auto_approve_all_students ? "On" : "Off"} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
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
                <Typography variant="body2" color="text.secondary">No closed assessment found.</Typography>
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

    </Stack>
  );
};

export default CourseworkPage;
