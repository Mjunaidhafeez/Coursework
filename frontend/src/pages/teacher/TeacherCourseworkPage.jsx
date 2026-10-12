import { Box, Button, Chip, Stack } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import PaginationControls, { DEFAULT_PAGE_SIZE } from "../../components/PaginationControls";
import AssessmentList from "../../components/shared/AssessmentList";
import CompactTabs from "../../components/shared/CompactTabs";
import CourseworkFormSection from "../../components/shared/CourseworkFormSection";
import TopicAllotDialog from "../../components/shared/TopicAllotDialog";
import ListingPage from "../../components/shared/ListingPage";
import BulkActionBar from "../../components/shared/BulkActionBar";
import CourseworkListFilters from "../../components/shared/CourseworkListFilters";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";
import useTopicAllot from "../../hooks/useTopicAllot";
import { runBulkDelete } from "../../utils/bulkApi";
import { buildCourseworkTypeOptions, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { confirmDelete } from "../../utils/confirm";
import {
  emptyCourseworkForm,
  saveCourseworkRequest,
  toCourseworkEditForm,
  validateCourseworkForm,
  validateMaxMarks,
} from "../../utils/courseworkForm";

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

const scrollToForm = () => {
  window.requestAnimationFrame(() => {
    document.getElementById("assessment-create-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

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
  const [semesterFilter, setSemesterFilter] = useState("");
  const selection = useRowSelection();
  const topicAllot = useTopicAllot();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState(emptyCourseworkForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [viewMode, setViewMode] = useState("opening");

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (courseFilter) params.append("course", courseFilter);
    if (typeFilter) params.append("coursework_type", typeFilter);
    if (submissionFilter) params.append("submission_type", submissionFilter);
    if (semesterFilter) params.append("semester", semesterFilter);
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
  }, [courseFilter, typeFilter, submissionFilter, semesterFilter]);

  const submit = async () => {
    const formValidation = validateCourseworkForm(form);
    const marksValidation = validateMaxMarks(form.max_marks);
    const nextErrors = { ...formValidation.errors };
    if (!marksValidation.ok) nextErrors.max_marks = marksValidation.error;
    setFormErrors(nextErrors);
    if (!formValidation.ok || !marksValidation.ok) {
      const firstError = Object.values(nextErrors)[0] || "Please fill required fields";
      notify(firstError, "error");
      return;
    }

    try {
      const { data } = await saveCourseworkRequest(api, ENDPOINTS, {
        editingId,
        form,
        maxMarks: marksValidation.value,
      });
      notify(editingId ? "Assessment updated" : "Assessment added");
      topicAllot.openAfterSave(data);
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
    scrollToForm();
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

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: ENDPOINTS.courseworks, ids: selection.selectedIds, label: "assessments" });
      if (!result.ok) return;
      notify("Selected assessments deleted");
      selection.clear();
      loadData();
    } catch {
      notify("Bulk delete failed", "error");
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
  const courseworkTypeOptions = useMemo(
    () => buildCourseworkTypeOptions(rows.map((item) => item.coursework_type)),
    [rows]
  );

  return (
    <ListingPage
      title="Assessment Management"
      subtitle="Assignment, project, presentation, quiz, exam, or certification — individual, group, or both."
      actions={(
        <Button size="small" variant="outlined" onClick={() => navigate("/teacher/submissions")}>
          Approvals
        </Button>
      )}
      addForm={(
        <CourseworkFormSection
          form={form}
          formErrors={formErrors}
          editingId={editingId}
          courses={courses}
          courseworkTypeOptions={courseworkTypeOptions}
          submissionTypeOptions={SUBMISSION_TYPE_OPTIONS}
          toggleSx={toggleSx}
          onSubmit={submit}
          onClear={() => {
            setEditingId(null);
            setForm(emptyCourseworkForm);
            setFormErrors({});
          }}
          setForm={setForm}
          setFormErrors={setFormErrors}
        />
      )}
      tabs={(
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <CompactTabs
            value={viewMode}
            onChange={setViewMode}
            tabs={[
              { value: "opening", label: `Open (${openingRows.length})` },
              { value: "closed", label: `Closed (${closedRows.length})` },
            ]}
          />
          <Chip size="small" label={`Assessments: ${total}`} variant="outlined" />
        </Stack>
      )}
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
            loadData({ searchValue: search, pageValue: 1 });
          }}
          onReset={() => {
            setSearch("");
            setCourseFilter("");
            setTypeFilter("");
            setSubmissionFilter("");
            setSemesterFilter("");
            setPage(1);
            loadData({ searchValue: "", pageValue: 1 });
          }}
          filters={(
            <CourseworkListFilters
              courses={courses}
              courseFilter={courseFilter}
              onCourse={(value) => { setCourseFilter(value); setPage(1); }}
              typeFilter={typeFilter}
              onType={(value) => { setTypeFilter(value); setPage(1); }}
              submissionFilter={submissionFilter}
              onSubmission={(value) => { setSubmissionFilter(value); setPage(1); }}
              semesterFilter={semesterFilter}
              onSemester={(value) => { setSemesterFilter(value); setPage(1); }}
              typeOptions={courseworkTypeOptions}
            />
          )}
        />
      )}
    >
      <BulkActionBar count={selection.count} onClear={selection.clear} onDelete={handleBulkDelete} deleteLabel="Delete selected" />
      <AssessmentList
        grouped={viewMode === "opening" ? openingGrouped : closedGrouped}
        emptyText={
          viewMode === "opening"
            ? "No open assessments. Create one above — it stays here until the deadline."
            : "No closed assessments. Work past its deadline appears here."
        }
        onEdit={edit}
        onDelete={remove}
        onAllot={topicAllot.setAllotFor}
        isSelected={selection.isSelected}
        onToggle={selection.toggle}
      />
      <TopicAllotDialog
        coursework={topicAllot.allotFor}
        onClose={() => topicAllot.setAllotFor(null)}
        onSaved={() => loadData()}
      />
      <Box sx={{ mt: 1.2 }}>
        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(newPage) => { setPage(newPage); loadData({ pageValue: newPage }); }}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); loadData({ pageValue: 1, pageSizeValue: newSize }); }}
        />
      </Box>
    </ListingPage>
  );
};

export default TeacherCourseworkPage;
