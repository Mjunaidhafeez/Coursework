import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
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
import { useEffect, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import FormErrorSummary from "../../components/shared/FormErrorSummary";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { getUserDisplayName } from "../../utils/userDisplay";
import { confirmDelete } from "../../utils/confirm";

const emptyForm = { code: "", title: "", semester: "", teachers: [] };

const CoursesPage = () => {
  const { notify } = useUi();
  const [courses, setCourses] = useState([]);
  const [total, setTotal] = useState(0);
  const [semesters, setSemesters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [semesterAlert, setSemesterAlert] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));

    setLoading(true);
    try {
      const [coursesRes, semesterRes, teacherRes] = await Promise.all([
        api.get(`${ENDPOINTS.courses}?${params.toString()}`),
        api.get(`${ENDPOINTS.semesters}?ordering=number&page_size=100`),
        api.get(`${ENDPOINTS.users}?role=teacher`),
      ]);

      setCourses(coursesRes.data.results || []);
      setTotal(coursesRes.data.count || 0);
      const semesterRows = semesterRes.data.results || [];
      setSemesters(semesterRows);
      setSemesterAlert(semesterRows.length ? "" : "No semesters found. Add semesters from Admin > Semesters.");
      setTeachers(teacherRes.data.results || []);
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
      const payload = { code: form.code, title: form.title, semester: Number(form.semester), teachers: form.teachers.map(Number) };
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
    setForm({ code: row.code, title: row.title, semester: row.semester, teachers: row.teachers || [] });
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

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Courses</Typography>
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
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.2 }}>{editingId ? "Update Course" : "Add Course"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
          Fields marked with * are mandatory.
        </Typography>
        <FormErrorSummary errors={formErrors} />
        {semesterAlert && <Alert severity="warning" sx={{ mb: 1.2 }}>{semesterAlert}</Alert>}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" }, gap: 1.2 }}>
          <TextField required size="small" label="Code" value={form.code} error={Boolean(formErrors.code)} helperText={formErrors.code || ""} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          <TextField required size="small" label="Title" value={form.title} error={Boolean(formErrors.title)} helperText={formErrors.title || ""} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <TextField required select size="small" label="Semester" value={form.semester} error={Boolean(formErrors.semester)} helperText={formErrors.semester || ""} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))}>
            {semesters.map((s) => <MenuItem key={s.id} value={s.id}>{s.number}</MenuItem>)}
          </TextField>
          <TextField required select size="small" label="Teachers" error={Boolean(formErrors.teachers)} helperText={formErrors.teachers || ""} SelectProps={{ multiple: true }} value={form.teachers} onChange={(e) => setForm((p) => ({ ...p, teachers: e.target.value }))}>
            {teachers.map((teacher) => <MenuItem key={teacher.id} value={teacher.id}>{getUserDisplayName(teacher, { includeUsername: true })}</MenuItem>)}
          </TextField>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
          <Button variant="contained" onClick={submit}>{editingId ? "Update" : "Add"}</Button>
          <Button variant="outlined" onClick={() => { setEditingId(null); setForm(emptyForm); setFormErrors({}); }}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <Chip label={`Total: ${total}`} variant="outlined" />
          <Chip label={`With Teachers: ${courses.filter((c) => (c.teachers || []).length > 0).length}`} color="success" variant="outlined" />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Teachers</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell>{course.code}</TableCell>
                <TableCell>{course.title}</TableCell>
                <TableCell>{course.semester_number}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {(course.teachers || []).map((id) => {
                      const teacher = teachers.find((t) => t.id === id);
                      return <Chip key={id} size="small" label={getUserDisplayName(teacher) || id} />;
                    })}
                  </Stack>
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
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No courses found for this filter/search.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {loading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

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

export default CoursesPage;
