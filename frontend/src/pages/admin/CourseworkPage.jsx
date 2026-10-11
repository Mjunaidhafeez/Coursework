import { Box, Button, Chip, Stack } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../api/client";
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
import { ENDPOINTS } from "../../api/endpoints";
import useRowSelection from "../../hooks/useRowSelection";
import useTopicAllot from "../../hooks/useTopicAllot";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { runBulkDelete } from "../../utils/bulkApi";
import { buildCourseworkTypeOptions, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import {
  emptyCourseworkForm,
  toCourseworkEditForm,
  toCourseworkPayload,
  validateCourseworkForm,
  validateMaxMarks,
} from "../../utils/courseworkForm";
import { confirmDelete } from "../../utils/confirm";

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

    const payload = toCourseworkPayload({ ...form, max_marks: marksValidation.value });
    try {
      const { data } = editingId
        ? await api.patch(`${ENDPOINTS.courseworks}${editingId}/`, payload)
        : await api.post(ENDPOINTS.courseworks, payload);
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
    setEditingId(null);
    setForm(emptyCourseworkForm);
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

  const groupByCourse = (items) => {
    const grouped = {};
    (items || []).forEach((item) => {
      const courseTitle = courses.find((course) => course.id === item.course)?.title || `Course ${item.course}`;
      if (!grouped[courseTitle]) grouped[courseTitle] = [];
      grouped[courseTitle].push(item);
    });
    return grouped;
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

  return (
    <ListingPage
      title="Assessment Management"
      subtitle="Assignment, project, presentation, quiz, exam, or certification — individual, group, or both."
      actions={(
        <Button size="small" variant="outlined" onClick={() => navigate("/admin/coursework-approvals")}>
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
              { value: "opening", label: `Open (${openingCount})` },
              { value: "closed", label: `Closed (${closedCount})` },
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
      <Box sx={{ mt: 1.5 }}>
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

export default CourseworkPage;
