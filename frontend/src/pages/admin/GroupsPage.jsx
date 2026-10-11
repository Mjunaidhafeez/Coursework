import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import BulkActionBar from "../../components/shared/BulkActionBar";
import GroupCard from "../../components/shared/GroupCard";
import GroupComposer from "../../components/shared/GroupComposer";
import GroupReviewActions from "../../components/shared/GroupReviewActions";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import useRowSelection from "../../hooks/useRowSelection";
import { postBulkUpdate, runBulkDelete } from "../../utils/bulkApi";
import { confirmDelete } from "../../utils/confirm";
import { uniqueCourseSemesters } from "../../utils/courseworkOptions";
import { downloadCsvFile, printTablePdf } from "../../utils/export";
import { occupancyFromGroups } from "../../utils/groupForm";
import { GROUP_STATUS_OPTIONS } from "../../utils/groupOptions";
import { describeGroupScope } from "../../utils/groupScopeOptions";
import { fetchOrgCatalog } from "../campus/listRows";

const GroupsPage = () => {
  const { notify, isGlobalLoading } = useUi();
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [bulkStatus, setBulkStatus] = useState("");
  const selection = useRowSelection();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingGroup, setEditingGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assignedGroupByStudentId, setAssignedGroupByStudentId] = useState({});

  const buildGroupsParams = ({
    searchValue = search,
    pageValue = page,
    pageSizeValue = pageSize,
    statusValue = statusFilter,
    courseValue = courseFilter,
    semesterValue = semesterFilter,
  } = {}) => {
    const params = new URLSearchParams();
    if (searchValue) params.append("search", searchValue);
    if (statusValue) params.append("status", statusValue);
    if (courseValue) params.append("course", courseValue);
    if (semesterValue) params.append("semester", semesterValue);
    params.append("ordering", "name");
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    return params;
  };

  const loadAssignedGroupMap = async (ignoreGroupId = editingGroup?.id) => {
    const { data } = await api.get(`${ENDPOINTS.groups}?page_size=4000&ordering=name`);
    setAssignedGroupByStudentId(occupancyFromGroups(data.results || [], ignoreGroupId));
  };

  const loadData = async ({
    searchValue = search,
    pageValue = page,
    pageSizeValue = pageSize,
    statusValue = statusFilter,
    courseValue = courseFilter,
    semesterValue = semesterFilter,
  } = {}) => {
    const params = buildGroupsParams({ searchValue, pageValue, pageSizeValue, statusValue, courseValue, semesterValue });
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.groups}?${params.toString()}`);
      setGroups(data.results || []);
      setTotal(data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await Promise.all([loadData(), loadAssignedGroupMap(editingGroup?.id)]);
  };

  useEffect(() => {
    loadData({ searchValue: "", pageValue: 1 });
    fetchOrgCatalog(api, ENDPOINTS).then((catalog) => setCourses(catalog.courses));
    loadAssignedGroupMap();
  }, []);

  const remove = async (id) => {
    if (!confirmDelete("group")) return;
    const prev = groups;
    setGroups((curr) => curr.filter((group) => group.id !== id));
    try {
      await api.delete(`${ENDPOINTS.groups}${id}/`);
      notify("Group deleted");
      await refresh();
    } catch {
      setGroups(prev);
      notify("Delete failed", "error");
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkDelete({ endpoint: ENDPOINTS.groups, ids: selection.selectedIds, label: "groups" });
      if (!result.ok) return;
      notify("Selected groups deleted");
      selection.clear();
      await refresh();
    } catch {
      notify("Bulk delete failed", "error");
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus) {
      notify("Choose a status to update", "error");
      return;
    }
    try {
      const { data } = await postBulkUpdate(ENDPOINTS.groups, selection.selectedIds, { status: bulkStatus });
      notify(`Updated ${data.updated_count || 0} groups`);
      selection.clear();
      setBulkStatus("");
      await refresh();
    } catch {
      notify("Bulk update failed", "error");
    }
  };

  const getGroupExportRows = async () => {
    const params = buildGroupsParams({ pageValue: 1, pageSizeValue: 4000 });
    const { data } = await api.get(`${ENDPOINTS.groups}?${params.toString()}`);
    return (data.results || []).map((group) => [
      group.name || "-",
      describeGroupScope(group),
      group.status || "-",
      (group.members || [])
        .map((member) => `${member.student_name || member.name || "-"} | ${member.student_roll_no || member.roll_no || "-"}`)
        .join("\n"),
    ]);
  };

  const exportGroupsCsv = async () => {
    try {
      downloadCsvFile({
        filePrefix: "class-groups",
        headers: ["Group Name", "Group For", "Status", "Group Members (Name | Roll No)"],
        rows: await getGroupExportRows(),
      });
      notify("Groups CSV exported");
    } catch {
      notify("Failed to export groups CSV", "error");
    }
  };

  const exportGroupsPdf = async () => {
    try {
      printTablePdf({
        title: "Class Groups",
        headers: ["Group Name", "Group For", "Status", "Group Members (Name | Roll No)"],
        rows: await getGroupExportRows(),
      });
      notify("Groups PDF exported");
    } catch {
      notify("Failed to export groups PDF", "error");
    }
  };

  return (
    <ListingPage
      title="Group Management & Approvals"
      subtitle="Create a group for a course or class, or approve student requests. A student already in a group or on a pending request cannot join another."
      addFormMaxHeight={{ xs: "70vh", md: "62vh" }}
      addForm={(
        <GroupComposer
          mode="manage"
          editingGroup={editingGroup}
          assignedGroupByStudentId={assignedGroupByStudentId}
          onSaved={async () => {
            setEditingGroup(null);
            await refresh();
          }}
          onCleared={() => {
            setEditingGroup(null);
            loadAssignedGroupMap();
          }}
        />
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
            setStatusFilter("");
            setCourseFilter("");
            setSemesterFilter("");
            setPage(1);
            loadData({ searchValue: "", pageValue: 1, statusValue: "", courseValue: "", semesterValue: "" });
          }}
          filters={(
            <>
              <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); loadData({ pageValue: 1, statusValue: e.target.value }); }} sx={{ minWidth: 130 }}>
                <MenuItem value="">All</MenuItem>
                {GROUP_STATUS_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Semester" value={semesterFilter} onChange={(e) => { setSemesterFilter(e.target.value); setPage(1); loadData({ pageValue: 1, semesterValue: e.target.value }); }} sx={{ minWidth: 120 }}>
                <MenuItem value="">All</MenuItem>
                {uniqueCourseSemesters(courses).map((item) => <MenuItem key={item.id} value={item.id}>{item.number}</MenuItem>)}
              </TextField>
              <TextField select size="small" label="Course" value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setPage(1); loadData({ pageValue: 1, courseValue: e.target.value }); }} sx={{ minWidth: 160 }}>
                <MenuItem value="">All Courses</MenuItem>
                {courses.map((course) => <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>)}
              </TextField>
            </>
          )}
          actions={(
            <>
              <Button size="small" variant="outlined" onClick={() => loadData({ pageValue: 1 })}>Apply</Button>
              <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportGroupsCsv}>CSV</Button>
              <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportGroupsPdf}>PDF</Button>
            </>
          )}
        />
      )}
    >
      <BulkActionBar
        count={selection.count}
        onClear={selection.clear}
        onDelete={handleBulkDelete}
        updateSlot={(
          <>
            <TextField size="small" select label="Status" value={bulkStatus} sx={{ minWidth: 130 }} onChange={(e) => setBulkStatus(e.target.value)}>
              <MenuItem value="">Keep</MenuItem>
              {GROUP_STATUS_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
            <Button size="small" variant="contained" onClick={handleBulkUpdate}>Update selected</Button>
          </>
        )}
      />
      <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
        <Chip size="small" label={`Total: ${total}`} variant="outlined" />
        <Chip size="small" label={`Pending: ${groups.filter((group) => group.status === "pending").length}`} color="warning" variant="outlined" />
        <Chip size="small" label={`Approved: ${groups.filter((group) => group.status === "approved").length}`} color="success" variant="outlined" />
      </Stack>
      {!groups.length && !loading ? (
        <Typography variant="body2" color="text.secondary">No groups found for current filters.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              leading={<Checkbox size="small" checked={selection.isSelected(group.id)} onChange={() => selection.toggle(group.id)} />}
              actions={(
                <>
                  <GroupReviewActions group={group} onDone={refresh} />
                  <Button size="small" onClick={() => { setEditingGroup(group); loadAssignedGroupMap(group.id); }}>Edit</Button>
                  <Button size="small" color="error" onClick={() => remove(group.id)}>Delete</Button>
                </>
              )}
            />
          ))}
        </Box>
      )}
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

export default GroupsPage;
