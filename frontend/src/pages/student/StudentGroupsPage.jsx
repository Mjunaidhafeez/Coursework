import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import ModuleHero from "../../components/shared/ModuleHero";
import SearchToolbar from "../../components/shared/SearchToolbar";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";

const StudentGroupsPage = () => {
  const { notify } = useUi();
  const [allGroups, setAllGroups] = useState([]);
  const [myGroupIds, setMyGroupIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, membersRes] = await Promise.all([
        api.get(`${ENDPOINTS.groups}?status=approved&page_size=300&ordering=name`),
        api.get(`${ENDPOINTS.groupMembers}?accepted=true&page_size=500`),
      ]);
      const groups = groupsRes.data.results || [];
      const memberRows = membersRes.data.results || [];
      setAllGroups(groups);
      setMyGroupIds(new Set(memberRows.map((item) => item.group)));
    } catch {
      notify("Failed to load groups", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allGroups;
    return allGroups.filter((group) => {
      const inName = String(group.name || "").toLowerCase().includes(q);
      const inMembers = (group.members || []).some((member) =>
        String(member.student_name || "").toLowerCase().includes(q)
      );
      return inName || inMembers;
    });
  }, [allGroups, search]);

  const pagedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  const myGroups = useMemo(
    () => allGroups.filter((group) => myGroupIds.has(group.id)),
    [allGroups, myGroupIds]
  );

  return (
    <Stack spacing={2}>
      <ModuleHero
        title="Groups Directory"
        subtitle="Browse all approved class groups and quickly identify your own group."
      >
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
          }}
          onReset={() => {
            setSearch("");
            setPage(1);
          }}
        />
      </ModuleHero>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1.2 }}>
          <Chip label={`All Groups: ${filteredGroups.length}`} color="info" variant="outlined" />
          <Chip label={`My Groups: ${myGroups.length}`} color="success" variant="outlined" />
        </Stack>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>All Approved Groups</Typography>
        {!pagedGroups.length && !loading ? (
          <Typography variant="body2" color="text.secondary">No groups found for current search.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            {pagedGroups.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", borderRadius: 1.5, bgcolor: "#fafcff" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.7 }}>
                  <Typography sx={{ fontWeight: 800 }}>{item.name}</Typography>
                  <Chip
                    size="small"
                    label={myGroupIds.has(item.id) ? "My Group" : "Available"}
                    color={myGroupIds.has(item.id) ? "success" : "default"}
                    variant="outlined"
                  />
                </Stack>
                <StudentMemberList members={item.members || []} compact />
              </Paper>
            ))}
          </Box>
        )}
        {loading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

        <Box sx={{ mt: 1.5 }}>
          <PaginationControls
            page={page}
            pageSize={pageSize}
            total={filteredGroups.length}
            onPageChange={(newPage) => setPage(newPage)}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default StudentGroupsPage;
