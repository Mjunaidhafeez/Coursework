import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  MenuItem,
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
import { exportTable } from "../../utils/export";
import { getRoleLetter, getUserDisplayName } from "../../utils/userDisplay";
import { PersonNameCell, PersonPhotoField } from "../../components/shared/PersonAvatar";
import SelectPlaceholder from "../../components/shared/SelectPlaceholder";
import SubjectEnrollPicker from "../../components/shared/SubjectEnrollPicker";
import { confirmDelete } from "../../utils/confirm";
import { fetchOrgCatalog } from "../campus/listRows";

const emptyForm = {
  username: "",
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  role: "student",
  password: "",
  department: "",
  school_class: "",
  section: "",
  student_id: "",
  semester: "",
  mailing_address: "",
  show_on_website: true,
  avatar: null,
  avatarUrl: "",
  enrolled_course_ids: [],
};

const UsersPage = ({ fixedRole = "", pageTitle = "User Management" }) => {
  const { notify, isGlobalLoading } = useUi();
  const location = useLocation();
  const urlRole = useMemo(() => fixedRole || new URLSearchParams(location.search).get("role") || "", [fixedRole, location.search]);

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ department: "", semester: "", school_class: "", section: "", course: "", show_on_website: "" });
  const [bulk, setBulk] = useState({ department: "", semester: "", school_class: "", section: "", show_on_website: "" });
  const selection = useRowSelection();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [form, setForm] = useState({ ...emptyForm, role: urlRole || "student" });
  const [enrollFilter, setEnrollFilter] = useState({ department: "", semester: "" });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [semesterAlert, setSemesterAlert] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState(fixedRole === "student" ? "student_id" : "first_name");
  const [sortOrder, setSortOrder] = useState("asc");
  const isStudentAdminPage = urlRole === "student";
  const isUserCenterPage = !fixedRole && !urlRole;
  const homeCourseIds = (semesterId, departmentId) =>
    courses
      .filter((course) => {
        if (semesterId && String(course.semester) !== String(semesterId)) return false;
        if (departmentId && course.department && String(course.department) !== String(departmentId)) return false;
        return Boolean(semesterId);
      })
      .map((course) => String(course.id));
  const buildUsersParams = ({
    searchValue = search,
    pageValue = page,
    pageSizeValue = pageSize,
    sortByValue = sortBy,
    sortOrderValue = sortOrder,
    filtersValue = filters,
  } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (urlRole) params.append("role", urlRole);
    Object.entries(filtersValue).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    const orderingField = sortByValue === "student_id" ? "student_profile__student_id" : sortByValue;
    params.append("ordering", sortOrderValue === "desc" ? `-${orderingField}` : orderingField);
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    return params;
  };
  const activeUsers = (payload) => (payload.results || []).filter((user) => user.is_active !== false);
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
      const rollA = String(a.student_profile?.student_id || a.username || "");
      const rollB = String(b.student_profile?.student_id || b.username || "");
      const nameA = getUserDisplayName(a);
      const nameB = getUserDisplayName(b);
      if (sortByValue === "student_id") {
        const roll = factor * rollA.localeCompare(rollB, undefined, { sensitivity: "base", numeric: true });
        if (roll) return roll;
        return factor * nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
      }
      if (sortByValue === "first_name") {
        const name = factor * nameA.localeCompare(nameB, undefined, { sensitivity: "base", numeric: true });
        if (name) return name;
        return factor * rollA.localeCompare(rollB, undefined, { sensitivity: "base", numeric: true });
      }
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
    filtersValue = filters,
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
          filtersValue,
        });
        const { data } = await api.get(usersListPath(params));
        const visibleRows = applyLocalSort(
          applyLocalSearch(activeUsers(data).filter(isVisibleInUserCenter), searchValue),
          sortByValue,
          sortOrderValue
        );
        const start = (pageValue - 1) * pageSizeValue;
        setUsers(visibleRows.slice(start, start + pageSizeValue));
        setTotal(visibleRows.length);
        return;
      }
      const params = buildUsersParams({ searchValue, pageValue, pageSizeValue, sortByValue, sortOrderValue, filtersValue });
      const { data } = await api.get(usersListPath(params));
      const rows = activeUsers(data);
      setUsers(rows);
      setTotal(data.count || rows.length);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogs = async () => {
    setCatalogLoading(true);
    try {
      const catalog = await fetchOrgCatalog(api, ENDPOINTS);
      setSemesters(catalog.semesters);
      setDepartments(catalog.departments);
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setCourses(catalog.courses);
      const missing = [
        !catalog.semesters.length ? "semesters" : "",
        !catalog.departments.length ? "departments" : "",
      ].filter(Boolean);
      setSemesterAlert(
        missing.length
          ? `No ${missing.join(" or ")} found. Add them under Admin → Semesters / Classes & Depts.`
          : ""
      );
    } catch {
      setSemesterAlert("Catalog could not be loaded. Refresh, or add Semesters and Classes & Depts first.");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadUsers({ searchValue: "", pageValue: 1 });
    loadCatalogs();
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
    if (targetForm.role === "teacher" && !String(targetForm.department).trim()) nextErrors.department = "Department is required for teacher";
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
        phone: form.phone,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
      };
      if (form.password) payload.password = form.password;
      if (form.role === "teacher") {
        payload.teacher_profile = {
          department: form.department,
          department_id: form.department || null,
          show_on_website: Boolean(form.show_on_website),
        };
      }
      if (form.role === "student") {
        payload.student_profile = {
          student_id: form.student_id,
          semester: form.semester || null,
          department: form.department || null,
          school_class: form.school_class || null,
          section: form.section || null,
          mailing_address: form.mailing_address || "",
          show_on_website: Boolean(form.show_on_website),
        };
        if (editingId || form.enrolled_course_ids.length) {
          payload.enrolled_course_ids = form.enrolled_course_ids.map(Number);
        }
      }

      const saveAvatar = async (userId) => {
        if (!(form.avatar instanceof File) || !userId) return;
        const photo = new FormData();
        photo.append("avatar", form.avatar);
        await api.patch(`${ENDPOINTS.users}${userId}/`, photo);
      };

      if (editingId) {
        setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...payload } : u)));
        await api.patch(`${ENDPOINTS.users}${editingId}/`, payload);
        await saveAvatar(editingId);
        notify("User updated");
      } else {
        const { data } = await api.post(ENDPOINTS.users, payload);
        await saveAvatar(data?.id);
        notify("User added");
      }

      setForm({ ...emptyForm, role: urlRole || "student" });
      setEnrollFilter({ department: "", semester: "" });
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
      phone: user.phone || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      role: user.role || "student",
      password: "",
      department: String(user.teacher_profile?.department_id || user.student_profile?.department || ""),
      school_class: String(user.student_profile?.school_class || ""),
      section: String(user.student_profile?.section || ""),
      student_id: user.student_profile?.student_id || "",
      semester: String(user.student_profile?.semester || ""),
      mailing_address: user.mailing_address || user.student_profile?.mailing_address || "",
      show_on_website: user.teacher_profile?.show_on_website !== false && user.student_profile?.show_on_website !== false,
      avatar: null,
      avatarUrl: user.avatar || "",
      enrolled_course_ids: (user.enrolled_course_ids || []).map(String),
    });
    setEnrollFilter({ department: "", semester: "" });
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
    const prevTotal = total;
    setUsers((curr) => curr.filter((u) => u.id !== id));
    setTotal((n) => Math.max(0, n - 1));
    try {
      await api.delete(`${ENDPOINTS.users}${id}/`);
      notify("User moved to Recycle bin");
      await loadUsers();
    } catch {
      setUsers(prev);
      setTotal(prevTotal);
      notify("Delete failed", "error");
    }
  };

  const applyFilters = (nextFilters) => {
    setFilters(nextFilters);
    setPage(1);
    loadUsers({ pageValue: 1, filtersValue: nextFilters });
  };

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: ENDPOINTS.users, ids: selection.selectedIds, label: "users" });
      if (!result.ok) return;
      notify("Selected users moved to Recycle bin");
      selection.clear();
      await loadUsers();
    } catch {
      notify("Bulk delete failed", "error");
    }
  };

  const handleBulkUpdate = async () => {
    const fields = {};
    if (bulk.department) fields.department = bulk.department;
    if (bulk.semester) fields.semester = bulk.semester;
    if (bulk.school_class) fields.school_class = bulk.school_class;
    if (bulk.section) fields.section = bulk.section;
    if (bulk.show_on_website !== "") fields.show_on_website = bulk.show_on_website === "true";
    if (!Object.keys(fields).length) {
      notify("Choose at least one bulk update field", "error");
      return;
    }
    try {
      const { data } = await postBulkUpdate(ENDPOINTS.users, selection.selectedIds, fields);
      notify(`Updated ${data.updated_count || 0} users`);
      selection.clear();
      setBulk({ department: "", semester: "", school_class: "", section: "", show_on_website: "" });
      await loadUsers();
    } catch {
      notify("Bulk update failed", "error");
    }
  };

  const getStudentExportSheet = async () => {
    const params = buildUsersParams({ pageValue: 1, pageSizeValue: 4000 });
    const { data } = await api.get(usersListPath(params));
    const people = activeUsers(data);
    const courseLabel = (id) => courses.find((course) => String(course.id) === String(id))?.code || id;
    const headers = ["Student Name", "Roll No", "Username", "Email", "Department", "Class", "Section", "Semester", "Subjects", "Website"];
    const rows = people.map((user) => [
      getUserDisplayName(user) || "-",
      user.student_profile?.student_id || "-",
      user.username || "-",
      user.email || "-",
      user.student_profile?.department_name || user.teacher_profile?.department_name || "-",
      user.student_profile?.school_class_name || "-",
      user.student_profile?.section_name || "-",
      user.student_profile?.semester_number || user.student_profile?.semester || "-",
      (user.enrolled_course_ids || []).map(courseLabel).join(", ") || "-",
      user.student_profile?.show_on_website === false ? "Hidden" : "Visible",
    ]);
    const subtitle = [
      search ? `Search: ${search}` : "",
      filters.department ? `Department filter` : "",
      filters.semester ? `Semester filter` : "",
      filters.school_class ? `Class filter` : "",
      filters.section ? `Section filter` : "",
      filters.course ? `Subject filter` : "",
      filters.show_on_website === "true" ? "Website: Visible" : filters.show_on_website === "false" ? "Website: Hidden" : "",
      `Rows: ${rows.length}`,
    ].filter(Boolean).join(" · ");
    return { headers, rows, subtitle };
  };
  const exportStudents = async (kind) => {
    try {
      const sheet = await getStudentExportSheet();
      exportTable({ kind, filePrefix: "class-students", title: "Class Students", ...sheet });
      notify(kind === "pdf" ? "Students PDF exported" : "Students CSV exported");
    } catch {
      notify(kind === "pdf" ? "Failed to export students PDF" : "Failed to export students CSV", "error");
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
    { key: "first_name", label: nameHeaderLabel },
    ...(isStudentAdminPage ? [{ key: "student_id", label: "Roll No" }] : []),
    { key: "username", label: "Username" },
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
          onClear={() => { setEditingId(null); setForm({ ...emptyForm, role: urlRole || "student" }); setEnrollFilter({ department: "", semester: "" }); setFormErrors({}); setShowValidation(false); }}
          extra={(
            <>
              <FormErrorSummary errors={showValidation ? formErrors : {}} />
              {error && <Alert severity="error">{error}</Alert>}
              {semesterAlert && (form.role === "student" || form.role === "teacher") && <Alert severity="warning">{semesterAlert}</Alert>}
            </>
          )}
        >
          <PersonPhotoField
            src={form.avatarUrl}
            file={form.avatar}
            name={`${form.first_name} ${form.last_name}`.trim() || form.username}
            onChange={(file) => updateForm((p) => ({ ...p, avatar: file }))}
          />
          <TextField required size="small" label="Username" value={form.username} error={showValidation && Boolean(formErrors.username)} helperText={showValidation ? formErrors.username || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, username: e.target.value }))} />
          <TextField required size="small" label="Email" type="email" value={form.email} error={showValidation && Boolean(formErrors.email)} helperText={showValidation ? formErrors.email || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, email: e.target.value }))} />
          <TextField size="small" label="Phone / WhatsApp" value={form.phone} helperText="Optional" sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, phone: e.target.value }))} />
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
          {(form.role === "teacher" || form.role === "student") && (
            <TextField required={form.role === "teacher"} select size="small" label="Department" value={form.department} error={showValidation && Boolean(formErrors.department)} helperText={showValidation ? formErrors.department || (catalogLoading ? "Loading…" : "") : (catalogLoading ? "Loading…" : "")} sx={compactFieldSx} onChange={(e) => updateForm((p) => {
              const department = e.target.value;
              const next = { ...p, department, school_class: "", section: "" };
              if (!editingId && p.role === "student") next.enrolled_course_ids = homeCourseIds(p.semester, department);
              return next;
            })}>
              <SelectPlaceholder items={departments} readyText="Select department" emptyText="None yet — add in Classes & Depts" />
              {departments.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </TextField>
          )}
          {form.role === "student" && (
            <>
              <TextField required size="small" label="Student ID" value={form.student_id} error={showValidation && Boolean(formErrors.student_id)} helperText={showValidation ? formErrors.student_id || "" : ""} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, student_id: e.target.value }))} />
              <TextField required select size="small" label="Semester" value={form.semester} error={showValidation && Boolean(formErrors.semester)} helperText={showValidation ? formErrors.semester || (catalogLoading ? "Loading…" : "") : (catalogLoading ? "Loading…" : "")} sx={compactFieldSx} onChange={(e) => updateForm((p) => {
                const semester = e.target.value;
                const next = { ...p, semester };
                if (!editingId) next.enrolled_course_ids = homeCourseIds(semester, p.department);
                return next;
              })}>
                <SelectPlaceholder items={semesters} readyText="Select semester" emptyText="None yet — add in Semesters" />
                {semesters.map((semester) => <MenuItem key={semester.id} value={String(semester.id)}>{semester.number}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Class" value={form.school_class} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, school_class: e.target.value, section: "" }))}>
                <SelectPlaceholder items={classes} readyText="Select class" emptyText="None yet — add in Classes & Depts" />
                {classes.filter((item) => !form.department || String(item.department || "") === String(form.department)).map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Section" value={form.section} sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, section: e.target.value }))}>
                <SelectPlaceholder items={sections} readyText="Select section" emptyText="None yet — add in Classes & Depts" />
                {sections.filter((item) => !form.school_class || String(item.school_class) === String(form.school_class)).map((item) => (
                  <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                ))}
              </TextField>
              <TextField size="small" label="Mailing address" value={form.mailing_address} helperText="Optional" sx={compactFieldSx} onChange={(e) => updateForm((p) => ({ ...p, mailing_address: e.target.value }))} />
              <SubjectEnrollPicker
                courses={courses}
                departments={departments}
                semesters={semesters}
                selectedIds={form.enrolled_course_ids}
                onChange={(ids) => updateForm((p) => ({ ...p, enrolled_course_ids: ids }))}
                filter={enrollFilter}
                onFilterChange={setEnrollFilter}
              />
            </>
          )}
          {(form.role === "teacher" || form.role === "student") && (
            <FormControlLabel
              sx={{ ml: 0.4 }}
              control={<Checkbox size="small" checked={Boolean(form.show_on_website)} onChange={(e) => updateForm((p) => ({ ...p, show_on_website: e.target.checked }))} />}
              label="Show on website"
            />
          )}
        </CompactAddForm>
      )}
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
            loadUsers({ searchValue: search, pageValue: 1, filtersValue: filters });
          }}
          onReset={() => {
            const cleared = { department: "", semester: "", school_class: "", section: "", course: "", show_on_website: "" };
            setSearch("");
            setFilters(cleared);
            setPage(1);
            loadUsers({ searchValue: "", pageValue: 1, filtersValue: cleared });
          }}
          filters={(
            <>
              <TextField size="small" select label="Department" value={filters.department} sx={{ minWidth: 140 }} onChange={(e) => applyFilters({ ...filters, department: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {departments.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
              </TextField>
              {isStudentAdminPage || urlRole === "teacher" ? (
                <TextField size="small" select label="Semester" value={filters.semester} sx={{ minWidth: 120 }} onChange={(e) => applyFilters({ ...filters, semester: e.target.value })}>
                  <MenuItem value="">All</MenuItem>
                  {semesters.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.number}</MenuItem>)}
                </TextField>
              ) : null}
              {isStudentAdminPage ? (
                <>
                  <TextField size="small" select label="Class" value={filters.school_class} sx={{ minWidth: 120 }} onChange={(e) => applyFilters({ ...filters, school_class: e.target.value, section: "" })}>
                    <MenuItem value="">All</MenuItem>
                    {classes.filter((item) => !filters.department || String(item.department || "") === String(filters.department)).map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" select label="Section" value={filters.section} sx={{ minWidth: 110 }} onChange={(e) => applyFilters({ ...filters, section: e.target.value })}>
                    <MenuItem value="">All</MenuItem>
                    {sections.filter((item) => !filters.school_class || String(item.school_class) === String(filters.school_class)).map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                </>
              ) : null}
              <TextField size="small" select label="Subject" value={filters.course} sx={{ minWidth: 160 }} onChange={(e) => applyFilters({ ...filters, course: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {courses.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.code}</MenuItem>)}
              </TextField>
              <TextField size="small" select label="Website" value={filters.show_on_website} sx={{ minWidth: 120 }} onChange={(e) => applyFilters({ ...filters, show_on_website: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="true">Visible</MenuItem>
                <MenuItem value="false">Hidden</MenuItem>
              </TextField>
            </>
          )}
          actions={isStudentAdminPage ? (
            <>
              <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={() => exportStudents("csv")}>CSV</Button>
              <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={() => exportStudents("pdf")}>PDF</Button>
            </>
          ) : null}
        />
      )}
    >
        <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
          {urlRole === "student" ? (
            <Chip size="small" label={`Students: ${total}`} color="info" variant="outlined" />
          ) : urlRole === "teacher" ? (
            <Chip size="small" label={`Teachers: ${total}`} color="success" variant="outlined" />
          ) : urlRole === "super_admin" ? (
            <Chip size="small" label={`Admins: ${total}`} variant="outlined" />
          ) : (
            <Chip size="small" label={`Total: ${total}`} variant="outlined" />
          )}
        </Stack>
        <BulkActionBar
          count={selection.count}
          onClear={selection.clear}
          onDelete={handleBulkDelete}
          deleteLabel="Delete selected"
          updateSlot={urlRole === "student" || urlRole === "teacher" ? (
            <>
              <TextField size="small" select label="Department" value={bulk.department} sx={{ minWidth: 130 }} onChange={(e) => setBulk((prev) => ({ ...prev, department: e.target.value }))}>
                <MenuItem value="">Keep</MenuItem>
                {departments.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
              </TextField>
              {urlRole === "student" ? (
                <>
                  <TextField size="small" select label="Semester" value={bulk.semester} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, semester: e.target.value }))}>
                    <MenuItem value="">Keep</MenuItem>
                    {semesters.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.number}</MenuItem>)}
                  </TextField>
                  <TextField size="small" select label="Class" value={bulk.school_class} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, school_class: e.target.value, section: "" }))}>
                    <MenuItem value="">Keep</MenuItem>
                    {classes.filter((item) => !bulk.department || String(item.department || "") === String(bulk.department)).map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                  <TextField size="small" select label="Section" value={bulk.section} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, section: e.target.value }))}>
                    <MenuItem value="">Keep</MenuItem>
                    {sections.filter((item) => !bulk.school_class || String(item.school_class) === String(bulk.school_class)).map((item) => (
                      <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
                    ))}
                  </TextField>
                </>
              ) : null}
              <TextField size="small" select label="Website" value={bulk.show_on_website} sx={{ minWidth: 110 }} onChange={(e) => setBulk((prev) => ({ ...prev, show_on_website: e.target.value }))}>
                <MenuItem value="">Keep</MenuItem>
                <MenuItem value="true">Show</MenuItem>
                <MenuItem value="false">Hide</MenuItem>
              </TextField>
              <Button size="small" variant="contained" onClick={handleBulkUpdate}>Update selected</Button>
            </>
          ) : null}
        />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox size="small" checked={selection.allChecked(users.map((user) => user.id))} onChange={() => selection.toggleAll(users.map((user) => user.id))} />
              </TableCell>
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
              <TableCell>Department</TableCell>
              {isStudentAdminPage ? <TableCell>Class</TableCell> : null}
              {isStudentAdminPage ? <TableCell>Section</TableCell> : null}
              {isStudentAdminPage ? <TableCell>Semester</TableCell> : null}
              {isStudentAdminPage ? <TableCell>Subjects</TableCell> : null}
              <TableCell>Website</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell padding="checkbox">
                  <Checkbox size="small" checked={selection.isSelected(user.id)} onChange={() => selection.toggle(user.id)} />
                </TableCell>
                <TableCell>
                  <PersonNameCell person={user} />
                </TableCell>
                {isStudentAdminPage ? <TableCell>{user.student_profile?.student_id || "-"}</TableCell> : null}
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{getRoleLetter(user.role)}</TableCell>
                <TableCell>{user.student_profile?.department_name || user.teacher_profile?.department_name || user.teacher_profile?.department || "-"}</TableCell>
                {isStudentAdminPage ? <TableCell>{user.student_profile?.school_class_name || "-"}</TableCell> : null}
                {isStudentAdminPage ? <TableCell>{user.student_profile?.section_name || "-"}</TableCell> : null}
                {isStudentAdminPage ? <TableCell>{user.student_profile?.semester_number || "-"}</TableCell> : null}
                {isStudentAdminPage ? (
                  <TableCell>{(user.enrolled_course_ids || []).length ? `${user.enrolled_course_ids.length} enrolled` : "-"}</TableCell>
                ) : null}
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
                <TableCell colSpan={10}>
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
