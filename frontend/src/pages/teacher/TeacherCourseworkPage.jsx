import {
  Box,
  Button,
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
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import PaginationControls from "../../components/PaginationControls";
import CourseworkFormSection from "../../components/shared/CourseworkFormSection";
import ModuleHero from "../../components/shared/ModuleHero";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import { buildCourseworkTypeOptions, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { confirmDelete } from "../../utils/confirm";
import {
  emptyCourseworkForm,
  toCourseworkEditForm,
  toCourseworkPayload,
  validateCourseworkForm,
  validateMaxMarks,
} from "../../utils/courseworkForm";
import { formatDate } from "../../utils/format";

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
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("opening");
  const [openCourseSections, setOpenCourseSections] = useState({});
  const [openCourseworkSections, setOpenCourseworkSections] = useState({});
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
    const query = params.toString();
    const [courseworkRes, coursesRes] = await Promise.allSettled([
      api.get(`${ENDPOINTS.courseworks}${query ? `?${query}` : ""}`),
      api.get(ENDPOINTS.courses),
    ]);

    if (coursesRes.status === "fulfilled") {
      const payload = coursesRes.value?.data;
      setCourses(Array.isArray(payload) ? payload : payload?.results || []);
    } else {
      setCourses([]);
      notify("Courses could not be loaded", "error");
    }

    if (courseworkRes.status === "fulfilled") {
      const payload = courseworkRes.value?.data;
      setRows(payload?.results || []);
      setTotal(payload?.count || 0);
    } else {
      setRows([]);
      setTotal(0);
      notify(
        courseworkRes.reason?.response?.data?.detail || "Assessment list could not be loaded. Please run backend migrations.",
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
    setForm(emptyCourseworkForm);
    setEditingId(null);
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
    const previous = rows;
    setRows((prev) => prev.filter((item) => item.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courseworks}${id}/`);
      notify("Assessment deleted");
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
  const courseworkTypeOptions = useMemo(
    () => buildCourseworkTypeOptions(rows.map((item) => item.coursework_type)),
    [rows]
  );

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
      <ModuleHero
        title="Assessment Management"
        subtitle="Assessment creation is managed here. Student topic approvals and submissions are managed on the submissions page."
        actions={(
          <Button size="small" variant="outlined" onClick={() => navigate("/teacher/submissions")}>
            Open Submissions
          </Button>
        )}
      >
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
            {courseworkTypeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by submission" value={submissionFilter} onChange={(e) => { setSubmissionFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All Submission Types</MenuItem>
            {SUBMISSION_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply Filters</Button>
        </Stack>
      </ModuleHero>

      <CourseworkFormSection
        form={form}
        formErrors={formErrors}
        editingId={editingId}
        courses={courses}
        courseworkTypeOptions={courseworkTypeOptions}
        submissionTypeOptions={SUBMISSION_TYPE_OPTIONS}
        toggleSx={toggleSx}
        datalistId="teacher-coursework-type-options"
        onSubmit={submit}
        onClear={() => {
          setEditingId(null);
          setForm(emptyCourseworkForm);
          setFormErrors({});
        }}
        setForm={setForm}
        setFormErrors={setFormErrors}
      />

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
                          <Typography sx={{ fontWeight: 700 }}>Assessment: {item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.coursework_type} | {item.submission_type} | Approval: {item.approval_required ? "Required" : "Auto"} | Topic Dup: {item.topic_duplication_allowed ? "Allowed" : "Not Allowed"} | Auto-Approve All: {item.auto_approve_all_students ? "On" : "Off"} | Max Members: {item.max_group_members ?? "-"} | Max Marks: {item.max_marks ?? "-"} | Deadline: {formatDate(item.deadline)}
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
              {viewMode === "opening" ? "No open assessment found." : "No closed assessment found."}
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

    </Stack>
  );
};

export default TeacherCourseworkPage;
