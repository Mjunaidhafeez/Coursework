import AddRoundedIcon from "@mui/icons-material/AddRounded";
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
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import useRowSelection from "../../hooks/useRowSelection";
import useTopicAllot from "../../hooks/useTopicAllot";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { runBulkDelete } from "../../utils/bulkApi";
import { buildCourseworkTypeOptions, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import {
  emptyCourseworkForm,
  saveCourseworkRequest,
  toCourseworkEditForm,
  validateCourseworkForm,
  validateMaxMarks,
} from "../../utils/courseworkForm";
import { confirmDelete } from "../../utils/confirm";

const scrollToForm = () => {
  window.requestAnimationFrame(() => {
    document.getElementById("assessment-create-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
};

const AssessmentManagementPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useUi();
  const approvalsPath = user?.role === "super_admin" ? "/admin/coursework-approvals" : "/teacher/submissions";
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
  const [formOpen, setFormOpen] = useState(false);
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

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyCourseworkForm);
    setFormErrors({});
  };

  const submit = async () => {
    const formValidation = validateCourseworkForm(form);
    const marksValidation = validateMaxMarks(form.max_marks);
    const nextErrors = { ...formValidation.errors };
    if (!marksValidation.ok) nextErrors.max_marks = marksValidation.error;
    setFormErrors(nextErrors);
    if (!formValidation.ok || !marksValidation.ok) {
      notify(Object.values(nextErrors)[0] || "Please fill required fields", "error");
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
    resetForm();
    setFormOpen(false);
    loadData();
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm(toCourseworkEditForm(row));
    setFormErrors({});
    setFormOpen(true);
    scrollToForm();
  };

  const remove = async (id) => {
    if (!confirmDelete("assessment")) return;
    const prev = courseworks;
    setCourseworks((curr) => curr.filter((item) => item.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courseworks}${id}/`);
      notify("Assessment deleted");
      if (editingId === id) resetForm();
      loadData();
    } catch (err) {
      setCourseworks(prev);
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
  const courseworkTypeOptions = useMemo(
    () => buildCourseworkTypeOptions(courseworks.map((item) => item.coursework_type)),
    [courseworks]
  );

  return (
    <ListingPage
      title="Assessment Management"
      subtitle="Create the assessment, then open Approvals to review requests and files."
      actions={(
        <Stack direction="row" spacing={0.8}>
          <Button
            size="small"
            variant={formOpen ? "outlined" : "contained"}
            startIcon={formOpen ? null : <AddRoundedIcon fontSize="small" />}
            onClick={() => {
              if (formOpen && !editingId) {
                setFormOpen(false);
                return;
              }
              if (!formOpen) resetForm();
              setFormOpen(true);
              scrollToForm();
            }}
          >
            {formOpen && !editingId ? "Hide form" : editingId ? "Editing" : "New assessment"}
          </Button>
          <Button size="small" variant="outlined" onClick={() => navigate(approvalsPath)}>
            Approvals
          </Button>
        </Stack>
      )}
      addForm={
        formOpen ? (
          <CourseworkFormSection
            form={form}
            formErrors={formErrors}
            editingId={editingId}
            courses={courses}
            courseworkTypeOptions={courseworkTypeOptions}
            submissionTypeOptions={SUBMISSION_TYPE_OPTIONS}
            onSubmit={submit}
            onClear={() => {
              resetForm();
              setFormOpen(false);
            }}
            setForm={setForm}
            setFormErrors={setFormErrors}
          />
        ) : null
      }
      tabs={(
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <CompactTabs
            value={viewMode}
            onChange={setViewMode}
            tabs={[
              { value: "opening", label: `Open (${openingCourseworks.length})` },
              { value: "closed", label: `Closed (${closedCourseworks.length})` },
            ]}
          />
          <Chip size="small" label={`${total} in this filter`} variant="outlined" />
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
            ? "No open assessments in this filter. Create one, or switch to Closed."
            : "No closed assessments in this filter. Work past its deadline appears here."
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

export default AssessmentManagementPage;
