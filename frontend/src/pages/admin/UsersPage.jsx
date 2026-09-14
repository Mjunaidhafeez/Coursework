import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
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
  TableSortLabel,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import CompactAddForm from "../../components/shared/CompactAddForm";
import FormErrorSummary from "../../components/shared/FormErrorSummary";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { compactFieldSx } from "../../components/shared/listingStyles";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import { downloadCsvFile, printTablePdf } from "../../utils/export";
import { getUserDisplayName } from "../../utils/userDisplay";
import { confirmDelete } from "../../utils/confirm";

const emptyForm = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "student",
  password: "",
  department: "",
  student_id: "",
  semester: "",
};

const UsersPage = ({ fixedRole = "", pageTitle = "User Management" }) => {
  const { notify, isGlobalLoading } = useUi();
  const location = useLocation();
  const urlRole = useMemo(() => fixedRole || new URLSearchParams(location.search).get("role") || "", [fixedRole, location.search]);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [semesters, setSemesters] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState({ ...emptyForm, role: urlRole || "student" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [semesterAlert, setSemesterAlert] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("username");
  const [sortOrder, setSortOrder] = useState("asc");
  const isStudentAdminPage = urlRole === "student";
  const isUserCenterPage = !fixedRole && !urlRole;
  const buildUsersParams = ({
    searchValue = search,
    pageValue = page,
    pageSizeValue = pageSize,
    sortByValue = sortBy,
    sortOrderValue = sortOrder,
  } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (urlRole) params.append("role", urlRole);
    params.append("ordering", sortOrderValue === "desc" ? `-${sortByValue}` : sortByValue);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    return params;
  };
  const isVisibleInUserCenter = (user) => !["student", "teacher"].includes(String(user?.role || "").toLowerCase());
  const applyLocalSearch = (rows, searchValue) => {
    const q = String(searchValue || "").trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((user) => {
      const haystack = [
        user.username,
        user.email,
        user.first_name,
        user.last_name,
        user.full_name,
        user.role,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  };
  const applyLocalSort = (rows, sortByValue, sortOrderValue) => {
    const factor = sortOrderValue === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const aVal = String(a?.[sortByValue] ?? "").toLowerCase();
      const bVal = String(b?.[sortByValue] ?? "").toLowerCase();
      return factor * aVal.localeCompare(bVal, undefined, { sensitivity: "base", numeric: true });
    });
  };

  const loadUsers = async ({
    searchValue = search,
    pageValue = page,
    pageSizeValue = pageSize,
    sortByValue = sortBy,
    sortOrderValue = sortOrder,
  } = {}) => {
    setLoading(true);
    try {
      if (isUserCenterPage) {
        const params = buildUsersParams({
          searchValue: "",
          pageValue: 1,
          pageSizeValue: 4000,
          sortByValue,
          sortOrderValue,
        });
        const { data } = await api.get(`${ENDPOINTS.users}?${params.toString()}`);
        const visibleRows = applyLocalSort(
          applyLocalSearch((data.results || []).filter(isVisibleInUserCenter), searchValue),
          sortByValue,
          sortOrderValue
        );
        const start = (pageValue - 1) * pageSizeValue;
        setUsers(visibleRows.slice(start, start + pageSizeValue));
        setTotal(visibleRows.length);
        return;
      }
      const params = buildUsersParams({ searchValue, pageValue, pageSizeValue, sortByValue, sortOrderValue });
      const { data } = await api.get(`${ENDPOINTS.users}?${params.toString()}`);
      setUsers(data.results || []);
      setTotal(data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesters = async () => {
    const params = new URLSearchParams();
    params.append("ordering", "number");
    params.append("page_size", "100");
    const { data } = await api.get(`${ENDPOINTS.semesters}?${params.toString()}`);
    const semesterRows = data.results || [];
    setSemesters(semesterRows);
    setSemesterAlert(semesterRows.length ? "" : "No semesters found. Add semesters from Admin > Semesters.");
  };

  useEffect(() => {
    setPage(1);
    loadUsers({ searchValue: "", pageValue: 1 });
    loadSemesters();
  }, [urlRole]);

  useEffect(() => {
    setPage(1);
    loadUsers({ pageValue: 1, sortByValue: sortBy, sortOrderValue: sortOrder });
  }, [sortBy, sortOrder]);

  const buildFormErrors = (targetForm = form) => {
    const nextErrors = {};
    if (!targetForm.username.trim()) nextErrors.username = "Username is required";
    if (!targetForm.email.trim()) nextErrors.email = "Email is required";
    if (targetForm.email && !/^\S+@\S+\.\S+$/.test(targetForm.email)) nextErrors.email = "Enter a valid email address";
    if (!targetForm.first_name.trim()) nextErrors.first_name = "First name is required";
    if (!targetForm.last_name.trim()) nextErrors.last_name = "Last name is required";
    if (!targetForm.role) nextErrors.role = "Role is required";
    if (!editingId && !targetForm.password.trim()) nextErrors.password = "Password is required for new user";
    if (targetForm.role === "teacher" && !targetForm.department.trim()) nextErrors.department = "Department is required for teacher";
    if (targetForm.role === "student") {
      if (!targetForm.student_id.trim()) nextErrors.student_id = "Student ID is required";
      if (!String(targetForm.semester).trim()) nextErrors.semester = "Semester is required";
    }
    return nextErrors;
  };

  const validateForm = () => {
    const nextErrors = buildFormErrors();
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    setShowValidation(true);
    setError("");
    if (!validateForm()) {
      notify("Please fill all mandatory fields", "error");
      return;
    }
    try {
      const payload = {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      if (form.role === "teacher") payload.teacher_profile = { department: form.department };
      if (form.role === "student") payload.student_profile = { student_id: form.student_id, semester: form.semester || null };

      if (editingId) {
        setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...payload } : u)));
        await api.patch(`${ENDPOINTS.users}${editingId}/`, payload);
        notify("User updated");
      } else {
        await api.post(ENDPOINTS.users, payload);
        notify("User added");
      }

      setForm({ ...emptyForm, role: urlRole || "student" });
      setFormErrors({});
      setShowValidation(false);
      setEditingId(null);
      if (fixedRole) {
        setForm((prev) => ({ ...prev, role: fixedRole }));
      }
      await loadUsers();
    } catch (err) {
      const fieldErrors = extractFieldErrors(err.response?.data);
      const mergedErrors = { ...fieldErrors };
      const nestedStudent = err.response?.data?.errors?.student_profile;
      const nestedTeacher = err.response?.data?.errors?.teacher_profile;
      if (nestedStudent?.student_id) mergedErrors.student_id = nestedStudent.student_id?.[0] || nestedStudent.student_id;
      if (nestedStudent?.semester) mergedErrors.semester = nestedStudent.semester?.[0] || nestedStudent.semester;
      if (nestedTeacher?.department) mergedErrors.department = nestedTeacher.department?.[0] || nestedTeacher.department;
      setFormErrors((prev) => ({ ...prev, ...mergedErrors }));
      const msg = extractApiErrorMessage(err);
      setError(msg);
      notify(msg, "error");
    }
  };

  const editUser = (user) => {
    setEditingId(user.id);
    setShowValidation(false);
    setForm({
      username: user.username || "",
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role || "student",
      password: "",
      department: user.teacher_profile?.department || "",
      student_id: user.student_profile?.student_id || "",
      semester: user.student_profile?.semester || "",
    });
    setFormErrors({});
  };

  const updateForm = (updater) => {
    setForm((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (showValidation) setFormErrors(buildFormErrors(next));
      return next;
    });
  };

  const removeUser = async (id) => {
    if (!confirmDelete("user")) {
      return;
    }
    const prev = users;
    setUsers((curr) => curr.filter((u) => u.id !== id));
    try {
      await api.delete(`${ENDPOINTS.users}${id}/`);
      notify("User deleted");
      await loadUsers();
    } catch {
      setUsers(prev);
      notify("Delete failed", "error");
    }
  };
  const getStudentExportRows = async () => {
    const params = buildUsersParams({ pageValue: 1, pageSizeValue: 4000 });
    const { data } = await api.get(`${ENDPOINTS.users}?${params.toString()}`);
    return (data.results || []).map((user) => [
      user.username || "-",
      getUserDisplayName(user) || "-",
      user.email || "-",
      user.student_profile?.student_id || "-",
      user.student_profile?.semester_number || user.student_profile?.semester || "-",
      String(user.role || "").replace("_", " "),
    ]);
  };
  const exportStudentsCsv = async () => {
    try {
      const rows = await getStudentExportRows();
      downloadCsvFile({
        filePrefix: "class-students",
        headers: ["Username", "Student Name", "Email", "Roll No", "Semester", "Role"],
        rows,
      });
      notify("Students CSV exported");
    } catch {
      notify("Failed to export students CSV", "error");
    }
  };
  const exportStudentsPdf = async () => {
    try {
      const rows = await getStudentExportRows();
      printTablePdf({
        title: "Class Students",
        headers: ["Username", "Student Name", "Email", "Roll No", "Semester", "Role"],
        rows,
      });
      notify("Students PDF exported");
    } catch {
      notify("Failed to export students PDF", "error");
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortOrder("asc");
  };
  const nameHeaderLabel = urlRole === "teacher" ? "Teacher Name" : urlRole === "student" ? "Student Name" : "Full Name";
  const sortableColumns = [
    { key: "username", label: "Username" },
    { key: "first_name", label: nameHeaderLabel },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
  ];

  return (
    <ListingPage
      title={pageTitle}
      addForm={(
        <CompactAddForm
          title={editingId ? "Update User" : "Add User"}
          submitLabel={editingId ? "Update" : "Add"}
          onSubmit={submit}
          onClear={() => { setEditingId(null); setForm({ ...emptyForm, role: urlRole || "student" }); setFormErrors({}); setShowValidation(false); }}
          extra={(
            <>
              <FormErrorSummary errors={showValidation ? formErrors : {}} />
              {error && <Alert severity="error">{error}</Alert>}
              {semesterAlert && form.role === "student" && <Alert severity="warning">{semesterAlert}</Alert>}
            </>
          )}
        >
          <TextField required size="small" label="Username" value={form.username} disabled={Boolean(editingId)} error={showValidation && Boolean(formErrors.username)} helperText={editingId ? "Locked" : (showValidation ? formErrors.username || "" : "")} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, username: e.target.value }))} />
          <TextField required size="small" label="Email" type="email" value={form.email} error={showValidation && Boolean(formErrors.email)} helperText={showValidation ? formErrors.email || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, email: e.target.value }))} />
          <TextField required={!editingId} size="small" label={editingId ? "Password (optional)" : "Password"} type="password" value={form.password} error={showValidation && Boolean(formErrors.password)} helperText={showValidation ? formErrors.password || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, password: e.target.value }))} />
          <TextField required size="small" label="First Name" value={form.first_name} error={showValidation && Boolean(formErrors.first_name)} helperText={showValidation ? formErrors.first_name || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, first_name: e.target.value }))} />
          <TextField required size="small" label="Last Name" value={form.last_name} error={showValidation && Boolean(formErrors.last_name)} helperText={showValidation ? formErrors.last_name || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, last_name: e.target.value }))} />
          {!fixedRole && (
            <TextField required select size="small" label="Role" value={form.role} error={showValidation && Boolean(formErrors.role)} helperText={showValidation ? formErrors.role || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, role: e.target.value }))}>
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
              <MenuItem value="super_admin">Super Admin</MenuItem>
            </TextField>
          )}
          {form.role === "teacher" && <TextField required size="small" label="Department" value={form.department} error={showValidation && Boolean(formErrors.department)} helperText={showValidation ? formErrors.department || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, department: e.target.value }))} />}
          {form.role === "student" && (
            <>
              <TextField required size="small" label="Student ID" value={form.student_id} error={showValidation && Boolean(formErrors.student_id)} helperText={showValidation ? formErrors.student_id || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, student_id: e.target.value }))} />
              <TextField required select size="small" label="Semester" value={form.semester} error={showValidation && Boolean(formErrors.semester)} helperText={showValidation ? formErrors.semester || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, semester: e.target.value }))}>
                {semesters.map((semester) => <MenuItem key={semester.id} value={semester.id}>{semester.number}</MenuItem>)}
              </TextField>
            </>
          )}
        </CompactAddForm>
      )}
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
            loadUsers({ searchValue: search, pageValue: 1 });
          }}
          onReset={() => {
            setSearch("");
            setPage(1);
            loadUsers({ searchValue: "", pageValue: 1 });
          }}
          actions={isStudentAdminPage ? (
            <>
              <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportStudentsCsv}>CSV</Button>
              <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportStudentsPdf}>PDF</Button>
            </>
          ) : null}
        />
      )}
    >
        <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
          <Chip size="small" label={`Total: ${total}`} variant="outlined" />
          <Chip size="small" label={`Students: ${users.filter((u) => u.role === "student").length}`} color="info" variant="outlined" />
          <Chip size="small" label={`Teachers: ${users.filter((u) => u.role === "teacher").length}`} color="success" variant="outlined" />
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              {sortableColumns.map((column) => (
                <TableCell key={column.key} sortDirection={sortBy === column.key ? sortOrder : false}>
                  <TableSortLabel
                    active={sortBy === column.key}
                    direction={sortBy === column.key ? sortOrder : "asc"}
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{getUserDisplayName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{String(user.role || "").replace("_", " ")}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button size="small" onClick={() => editUser(user)}>Edit</Button>
                    <Button size="small" color="error" onClick={() => removeUser(user.id)}>Delete</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {!users.length && !loading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography variant="body2" color="text.secondary">No users found for this filter/search.</Typography>
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
            onPageChange={(newPage) => {
              setPage(newPage);
              loadUsers({ pageValue: newPage });
            }}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
              loadUsers({ pageValue: 1, pageSizeValue: newSize });
            }}
          />
        </Box>
    </ListingPage>
  );
};

export default UsersPage;
