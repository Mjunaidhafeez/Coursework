import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import PaginationControls, { DEFAULT_PAGE_SIZE } from "../../components/PaginationControls";
import CompactAddForm from "../../components/shared/CompactAddForm";
import FormErrorSummary from "../../components/shared/FormErrorSummary";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { compactFieldSx } from "../../components/shared/listingStyles";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS, usersListPath } from "../../api/endpoints";
import BulkActionBar from "../../components/shared/BulkActionBar";
import useRowSelection from "../../hooks/useRowSelection";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { postBulkUpdate, runBulkDelete } from "../../utils/bulkApi";
import { getUserDisplayName } from "../../utils/userDisplay";
import SelectPlaceholder from "../../components/shared/SelectPlaceholder";
import { confirmDelete } from "../../utils/confirm";
import CourseStudyFilesCell from "../../components/shared/CourseStudyFiles";
import { fetchOrgCatalog, listRows } from "../campus/listRows";

const emptyForm = { code: "", title: "", semester: "", department: "", teachers: [] };

const CoursesPage = () => {
  const { notify, isGlobalLoading } = useUi();
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [filters, setFilters] = useState({ semester: "", department: "", teacher: "" });
  const [bulk, setBulk] = useState({ semester: "", department: "" });
  const selection = useRowSelection();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [semesterAlert, setSemesterAlert] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize, semester = filters.semester, department = filters.department, teacher = filters.teacher } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (semester) params.append("semester", semester);
    if (department) params.append("department", department);
    if (teacher) params.append("teachers", teacher);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));

    setLoading(true);
    try {
      const catalog = await fetchOrgCatalog(api, ENDPOINTS);
      setSemesters(catalog.semesters);
      setDepartments(catalog.departments);
      setSemesterAlert(catalog.semesters.length ? "" : "No semesters found. Add semesters from Admin > Semesters.");

      const [coursesRes, teacherRes] = await Promise.all([
        api.get(`${ENDPOINTS.courses}?${params.toString()}`),
        api.get(usersListPath("role=teacher&page_size=200")).catch(() => ({ data: { results: [] } })),
      ]);
      setCourses(listRows(coursesRes.data));
      setTotal(coursesRes.data.count || listRows(coursesRes.data).length);
      setTeachers(listRows(teacherRes.data));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1 });
  }, []);

  const validateForm = () => {
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Course code is required";
    if (!form.title.trim()) nextErrors.title = "Course title is required";
    if (!String(form.semester).trim()) nextErrors.semester = "Semester is required";
    if (!form.teachers.length) nextErrors.teachers = "At least one teacher is required";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
      notify("Please fill all mandatory fields", "error");
      return;
    }
    try {
      const payload = { code: form.code, title: form.title, semester: Number(form.semester), department: form.department || null, teachers: form.teachers.map(Number) };
      if (editingId) {
        setCourses((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
        await api.patch(`${ENDPOINTS.courses}${editingId}/`, payload);
        notify("Course updated");
      } else {
        await api.post(ENDPOINTS.courses, payload);
        notify("Course added");
      }
      setForm(emptyForm);
      setFormErrors({});
      setEditingId(null);
      loadData();
    } catch (err) {
      const serverErrors = extractFieldErrors(err.response?.data);
      setFormErrors((prev) => ({ ...prev, ...serverErrors }));
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const edit = (row) => {
    setEditingId(row.id);
    setForm({ code: row.code, title: row.title, semester: String(row.semester || ""), department: String(row.department || ""), teachers: row.teachers || [] });
    setFormErrors({});
  };

  const remove = async (id) => {
    if (!confirmDelete("course")) {
      return;
    }
    const prev = courses;
    setCourses((curr) => curr.filter((c) => c.id !== id));
    try {
      await api.delete(`${ENDPOINTS.courses}${id}/`);
      notify("Course deleted");
      loadData();
    } catch {
      setCourses(prev);
      notify("Delete failed", "error");
    }
  };

  const applyFilters = (next) => {
    setFilters(next);
    setPage(1);
    loadData({ pageValue: 1, semester: next.semester, department: next.department, teacher: next.teacher });
  };

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: ENDPOINTS.courses, ids: selection.selectedIds, label: "courses" });
      if (!result.ok) return;
      notify("Selected courses deleted");
      selection.clear();
      loadData();
    } catch {
      notify("Bulk delete failed", "error");
    }
  };

  const handleBulkUpdate = async () => {
    const fields = {};
    if (bulk.semester) fields.semester = bulk.semester;
    if (bulk.department) fields.department = bulk.department;
    if (!Object.keys(fields).length) {
      notify("Choose a semester or department to update", "error");
      return;
    }
    try {
      const { data } = await postBulkUpdate(ENDPOINTS.courses, selection.selectedIds, fields);
      notify(`Updated ${data.updated_count || 0} courses`);
      selection.clear();
      setBulk({ semester: "", department: "" });
      loadData();
    } catch {
      notify("Bulk update failed", "error");
    }
  };

  return (
    <ListingPage
      title="Courses"
      addForm={(
        <CompactAddForm
          title={editingId ? "Update Course" : "Add Course"}
          submitLabel={editingId ? "Update" : "Add"}
          onSubmit={submit}
          onClear={() => { setEditingId(null); setForm(emptyForm); setFormErrors({}); }}
          extra={(
            <>
              <FormErrorSummary errors={formErrors} />
              {semesterAlert && <Alert severity="warning">{semesterAlert}</Alert>}
            </>
          )}
        >
          <TextField required size="small" label="Code" value={form.code} error={Boolean(formErrors.code)} helperText={formErrors.code || ""} sx={compactFieldSx} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <TextField required size="small" label="Title" value={form.title} error={Boolean(formErrors.title)} helperText={formErrors.title || ""} sx={compactFieldSx} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <TextField required select size="small" label="Semester" value={form.semester} error={Boolean(formErrors.semester)} helperText={formErrors.semester || ""} sx={compactFieldSx} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}>
            <SelectPlaceholder items={semesters} readyText="Select semester" emptyText="None yet — add in Semesters" />
            {semesters.map((s) => <MenuItem key={s.id} value={String(s.id)}>{s.number}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Department" value={form.department} sx={compactFieldSx} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
            <SelectPlaceholder items={departments} readyText="None" emptyText="None yet — add in Classes & Depts" />
            {departments.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
          </TextField>
          <TextField required select size="small" label="Teachers" error={Boolean(formErrors.teachers)} helperText={formErrors.teachers || ""} SelectProps={{ multiple: true }} value={form.teachers} sx={compactFieldSx} onChange={(e) => setForm((p) => ({ ...p, teachers: e.target.value }))}>
            {teachers.map((teacher) => <MenuItem key={teacher.id} value={teacher.id}>{getUserDisplayName(teacher, { includeUsername: true })}</MenuItem>)}
          </TextField>
        </CompactAddForm>
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
            setFilters({ semester: "", department: "", teacher: "" });
            setPage(1);
            loadData({ searchValue: "", pageValue: 1, semester: "", department: "", teacher: "" });
          }}
          filters={(
            <>
              <TextField size="small" select label="Semester" value={filters.semester} sx={{ minWidth: 120 }} onChange={(e) => applyFilters({ ...filters, semester: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {semesters.map((item) => <MenuItem key={item.id} value={item.id}>{item.number}</MenuItem>)}
              </TextField>
              <TextField size="small" select label="Department" value={filters.department} sx={{ minWidth: 150 }} onChange={(e) => applyFilters({ ...filters, department: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </TextField>
              <TextField size="small" select label="Teacher" value={filters.teacher} sx={{ minWidth: 160 }} onChange={(e) => applyFilters({ ...filters, teacher: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {teachers.map((item) => <MenuItem key={item.id} value={item.id}>{getUserDisplayName(item)}</MenuItem>)}
              </TextField>
            </>
          )}
        />
      )}
    >
        <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
          <Chip size="small" label={`Total: ${total}`} variant="outlined" />
          <Chip size="small" label={`With Teachers: ${courses.filter((c) => (c.teachers || []).length > 0).length}`} color="success" variant="outlined" />
        </Stack>
        <BulkActionBar
          count={selection.count}
          onClear={selection.clear}
          onDelete={handleBulkDelete}
          updateSlot={(
            <>
              <TextField size="small" select label="Semester" value={bulk.semester} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, semester: e.target.value }))}>
                <MenuItem value="">Keep</MenuItem>
                {semesters.map((item) => <MenuItem key={item.id} value={item.id}>{item.number}</MenuItem>)}
              </TextField>
              <TextField size="small" select label="Department" value={bulk.department} sx={{ minWidth: 130 }} onChange={(e) => setBulk((prev) => ({ ...prev, department: e.target.value }))}>
                <MenuItem value="">Keep</MenuItem>
                {departments.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
              </TextField>
              <Button size="small" variant="contained" onClick={handleBulkUpdate}>Update selected</Button>
            </>
          )}
        />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox size="small" checked={selection.allChecked(courses.map((item) => item.id))} onChange={() => selection.toggleAll(courses.map((item) => item.id))} />
              </TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Teachers</TableCell>
              <TableCell>Files</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={selection.isSelected(course.id)} onChange={() => selection.toggle(course.id)} />
                </TableCell>
                <TableCell>{course.code}</TableCell>
                <TableCell>{course.title}</TableCell>
                <TableCell>{course.semester_number}</TableCell>
                <TableCell>{course.department_name || "-"}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(course.teachers || []).map((id) => {
                      const teacher = teachers.find((t) => t.id === id);
                      return <Chip key={id} size="small" label={getUserDisplayName(teacher) || id} />;
                    })}
                  </Stack>
                </TableCell>
                <TableCell>
                  <CourseStudyFilesCell course={course} canManage onChanged={() => loadData()} />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => edit(course)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => remove(course.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!courses.length && !loading && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography variant="body2" color="text.secondary">No courses found for this filter/search.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {loading && !isGlobalLoading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

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

export default CoursesPage;
