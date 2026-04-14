import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Box,
  Button,
  Chip,
  Checkbox,
  CircularProgress,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import FormErrorSummary from "../../components/shared/FormErrorSummary";
import SearchToolbar from "../../components/shared/SearchToolbar";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import {
  emptyGroupForm,
  fetchGlobalEligibleStudents,
  sortStudentsByRollOrUsername,
  toGroupEditForm,
  toGroupPayload,
} from "../../utils/groupForm";
import { GROUP_STATUS_OPTIONS } from "../../utils/groupOptions";
import { downloadCsvFile, printTablePdf } from "../../utils/export";
import { getUserDisplayName } from "../../utils/userDisplay";
import { confirmDelete } from "../../utils/confirm";

const GroupsPage = () => {
  const { notify } = useUi();
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [form, setForm] = useState(emptyGroupForm);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const sortedStudents = useMemo(() => sortStudentsByRollOrUsername(students), [students]);
  const buildGroupsParams = ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (statusFilter) params.append("status", statusFilter);
    if (courseFilter) params.append("course", courseFilter);
    params.append("ordering", "name");
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    return params;
  };

  const loadData = async ({ searchValue = search, pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = buildGroupsParams({ searchValue, pageValue, pageSizeValue });
    setLoading(true);
    try {
      const [groupsRes, coursesRes] = await Promise.all([
        api.get(`${ENDPOINTS.groups}?${params.toString()}`),
        api.get(ENDPOINTS.courses),
      ]);

      setGroups(groupsRes.data.results || []);
      setTotal(groupsRes.data.count || 0);
      setCourses(coursesRes.data.results || []);
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleStudents = async () => {
    setStudents(await fetchGlobalEligibleStudents(api, ENDPOINTS));
  };

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1 });
    loadEligibleStudents();
  }, []);

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Group name is required";
    if (!form.member_ids.length) nextErrors.member_ids = "Select at least one student";
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
      notify("Please fill mandatory group fields", "error");
      return;
    }
    try {
      const payload = toGroupPayload(form);
      if (editingId) {
        await api.patch(`${ENDPOINTS.groups}${editingId}/`, payload);
        notify("Group updated");
      } else {
        await api.post(ENDPOINTS.groups, payload);
        notify("Group added");
      }
      setEditingId(null);
      setForm(emptyGroupForm);
      setFormErrors({});
      loadData();
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, ...extractFieldErrors(err.response?.data) }));
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const edit = (item) => {
    setEditingId(item.id);
    setForm(toGroupEditForm(item));
    setFormErrors({});
    loadEligibleStudents();
  };

  const approve = async (id) => {
    try {
      await api.post(`${ENDPOINTS.groups}${id}/approve/`);
      notify("Group request approved");
      loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`${ENDPOINTS.groups}${id}/reject/`);
      notify("Group request rejected");
      loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const remove = async (id) => {
    if (!confirmDelete("group")) {
      return;
    }
    const prev = groups;
    setGroups((curr) => curr.filter((g) => g.id !== id));
    try {
      await api.delete(`${ENDPOINTS.groups}${id}/`);
      notify("Group deleted");
      loadData();
    } catch {
      setGroups(prev);
      notify("Delete failed", "error");
    }
  };
  const getGroupExportRows = async () => {
    const params = buildGroupsParams({ pageValue: 1, pageSizeValue: 4000 });
    const { data } = await api.get(`${ENDPOINTS.groups}?${params.toString()}`);
    return (data.results || []).map((group) => [
      group.name || "-",
      group.status || "-",
      (group.members || [])
        .map((member) => `${member.student_name || member.name || "-"} | ${member.student_roll_no || member.roll_no || "-"}`)
        .join("\n"),
    ]);
  };
  const exportGroupsCsv = async () => {
    try {
      const rows = await getGroupExportRows();
      downloadCsvFile({
        filePrefix: "class-groups",
        headers: ["Group Name", "Status", "Group Members (Name | Roll No)"],
        rows,
      });
      notify("Groups CSV exported");
    } catch {
      notify("Failed to export groups CSV", "error");
    }
  };
  const exportGroupsPdf = async () => {
    try {
      const rows = await getGroupExportRows();
      printTablePdf({
        title: "Class Groups",
        headers: ["Group Name", "Status", "Group Members (Name | Roll No)"],
        rows,
      });
      notify("Groups PDF exported");
    } catch {
      notify("Failed to export groups PDF", "error");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Group Management & Approvals</Typography>
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
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.2} sx={{ mt: 1.2 }}>
          <TextField select size="small" label="Filter by status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All</MenuItem>
            {GROUP_STATUS_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Filter by course" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); }}>
            <MenuItem value="">All Courses</MenuItem>
            {courses.map((course) => <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>)}
          </TextField>
          <Button variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply Filters</Button>
          <Button variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportGroupsCsv}>
            Export CSV
          </Button>
          <Button variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportGroupsPdf}>
            Export PDF
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1.2 }}>{editingId ? "Update Group" : "Add Group"}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
          Fields marked with * are mandatory.
        </Typography>
        <FormErrorSummary errors={formErrors} />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 1.2 }}>
          <TextField required size="small" label="Group Name" value={form.name} error={Boolean(formErrors.name)} helperText={formErrors.name || ""} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <TextField
            select
            size="small"
            label="Members"
            SelectProps={{
              multiple: true,
              MenuProps: {
                PaperProps: {
                  sx: { maxHeight: 320, borderRadius: 2, mt: 0.6 },
                },
              },
              renderValue: (selected) =>
                selected
                  .map((id) => getUserDisplayName(sortedStudents.find((student) => student.id === id), { includeUsername: true }) || id)
                  .join(", "),
            }}
            value={form.member_ids}
            error={Boolean(formErrors.member_ids)}
            helperText={formErrors.member_ids || ""}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 1.5,
                bgcolor: "#f8fbff",
              },
            }}
            onChange={(e) => setForm((p) => ({ ...p, member_ids: e.target.value }))}
          >
            {sortedStudents.map((student) => (
              <MenuItem key={student.id} value={student.id}>
                <Checkbox checked={form.member_ids.includes(student.id)} />
                <ListItemText primary={getUserDisplayName(student, { includeUsername: true })} secondary={student.student_id || student.username} />
              </MenuItem>
            ))}
          </TextField>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mt: 1.2 }}>
          <Button variant="contained" onClick={submit}>{editingId ? "Update" : "Add"}</Button>
          <Button variant="outlined" onClick={() => { setEditingId(null); setForm(emptyGroupForm); setFormErrors({}); }}>Clear</Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <Chip label={`Total: ${total}`} variant="outlined" />
          <Chip label={`Pending: ${groups.filter((g) => g.status === "pending").length}`} color="warning" variant="outlined" />
          <Chip label={`Approved: ${groups.filter((g) => g.status === "approved").length}`} color="success" variant="outlined" />
        </Stack>
        {!groups.length && !loading ? (
          <Typography variant="body2" color="text.secondary">No groups found for current filters.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            {groups.map((group) => (
              <Paper key={group.id} variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", borderRadius: 1.5, bgcolor: "#fafcff" }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.7 }}>
                  <Typography sx={{ fontWeight: 800 }}>{group.name}</Typography>
                  <Chip
                    size="small"
                    label={group.status || "pending"}
                    color={group.status === "approved" ? "success" : group.status === "rejected" ? "error" : "warning"}
                    variant="outlined"
                  />
                </Stack>
                <StudentMemberList members={group.members || []} compact />
                <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 0.8 }}>
                  {group.status === "pending" && (
                    <>
                      <Button size="small" color="success" onClick={() => approve(group.id)}>Approve</Button>
                      <Button size="small" color="warning" onClick={() => reject(group.id)}>Reject</Button>
                    </>
                  )}
                  <Button size="small" onClick={() => edit(group)}>Edit</Button>
                  <Button size="small" color="error" onClick={() => remove(group.id)}>Delete</Button>
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
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

export default GroupsPage;
