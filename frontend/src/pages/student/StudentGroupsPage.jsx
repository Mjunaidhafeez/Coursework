import {
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import PaginationControls from "../../components/PaginationControls";
import GroupCard from "../../components/shared/GroupCard";
import GroupComposer from "../../components/shared/GroupComposer";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { findStudentGroupLock, occupancyFromGroups } from "../../utils/groupForm";

const StudentGroupsPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const [allGroups, setAllGroups] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.groups}?page_size=400&ordering=name`);
      setAllGroups(data.results || []);
    } catch {
      notify("Failed to load groups", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const myLock = useMemo(() => findStudentGroupLock(allGroups, user?.id), [allGroups, user?.id]);
  const canEditRequest = Boolean(myLock && myLock.status === "pending" && Number(myLock.creator) === Number(user?.id));
  const blockedReason = myLock && !canEditRequest
    ? myLock.status === "pending"
      ? `You are already on the pending request "${myLock.name}". You cannot join or request another group until it is approved or rejected.`
      : `You are already in "${myLock.name}". A student can belong to only one class group.`
    : "";

  const approvedGroups = useMemo(
    () => allGroups.filter((group) => group.status === "approved"),
    [allGroups]
  );
  const myRequests = useMemo(
    () => allGroups.filter((group) => Number(group.creator) === Number(user?.id) && group.status !== "approved"),
    [allGroups, user?.id]
  );
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return approvedGroups;
    return approvedGroups.filter((group) => {
      const inName = String(group.name || "").toLowerCase().includes(q);
      const inMembers = (group.members || []).some((member) =>
        String(member.student_name || "").toLowerCase().includes(q)
      );
      return inName || inMembers;
    });
  }, [approvedGroups, search]);

  const pagedGroups = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, page, pageSize]);

  const myApproved = useMemo(
    () => approvedGroups.filter((group) => Number(group.creator) === Number(user?.id) || (group.members || []).some((member) => Number(member.student) === Number(user?.id))),
    [approvedGroups, user?.id]
  );

  return (
    <ListingPage
      title="Groups"
      subtitle="Request a group with classmates from your own semester, class and section. Admin or a teacher will approve or reject it."
      addForm={(
        <GroupComposer
          mode="request"
          currentUserId={user?.id}
          lockedProfile={user?.student_profile}
          editingGroup={canEditRequest ? myLock : null}
          assignedGroupByStudentId={occupancyFromGroups(allGroups, canEditRequest ? myLock?.id : null)}
          blockedReason={blockedReason}
          onSaved={loadData}
          onCleared={loadData}
        />
      )}
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => setPage(1)}
          onReset={() => {
            setSearch("");
            setPage(1);
          }}
        />
      )}
    >
      <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
        <Chip size="small" label={`Approved: ${filteredGroups.length}`} color="info" variant="outlined" />
        <Chip size="small" label={`My group: ${myApproved.length}`} color="success" variant="outlined" />
        <Chip size="small" label={`My requests: ${myRequests.length}`} color="warning" variant="outlined" />
      </Stack>
      {myRequests.length ? (
        <>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>My requests</Typography>
          <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, mb: 1.5 }}>
            {myRequests.map((item) => <GroupCard key={item.id} group={item} />)}
          </Box>
        </>
      ) : null}
      <Typography sx={{ fontWeight: 700, mb: 1 }}>Approved groups</Typography>
      {!pagedGroups.length && !loading ? (
        <Typography variant="body2" color="text.secondary">No groups found for current search.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
          {pagedGroups.map((item) => (
            <GroupCard
              key={item.id}
              group={item}
              showStatus={false}
              badge={(
                <Chip
                  size="small"
                  label={myApproved.some((group) => group.id === item.id) ? "My Group" : "Available"}
                  color={myApproved.some((group) => group.id === item.id) ? "success" : "default"}
                  variant="outlined"
                />
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
          total={filteredGroups.length}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }}
        />
      </Box>
    </ListingPage>
  );
};

export default StudentGroupsPage;
