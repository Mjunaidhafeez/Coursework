import {
  Box,
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
import PaginationControls, { DEFAULT_PAGE_SIZE } from "../../components/PaginationControls";
import GroupCard from "../../components/shared/GroupCard";
import GroupReviewActions from "../../components/shared/GroupReviewActions";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import { GROUP_STATUS_OPTIONS } from "../../utils/groupOptions";

const TeacherGroupsPage = () => {
  const { isGlobalLoading } = useUi();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadData = async ({
    pageValue = page,
    pageSizeValue = pageSize,
    statusValue = statusFilter,
    searchValue = search,
  } = {}) => {
    const params = new URLSearchParams();
    params.append("ordering", "name");
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
    if (statusValue) params.append("status", statusValue);
    if (searchValue) params.append("search", searchValue);
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.groups}?${params.toString()}`);
      setRows(data.results || []);
      setTotal(data.count || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ pageValue: 1 });
  }, []);

  return (
    <ListingPage
      title="Class Groups"
      subtitle="Approve or reject student group requests. A student already in a group or on a pending request cannot join another."
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={() => {
            setPage(1);
            loadData({ pageValue: 1, searchValue: search });
          }}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setPage(1);
            loadData({ pageValue: 1, searchValue: "", statusValue: "" });
          }}
          filters={(
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              sx={{ minWidth: 130 }}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
                loadData({ pageValue: 1, statusValue: e.target.value });
              }}
            >
              <MenuItem value="">All</MenuItem>
              {GROUP_STATUS_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
            </TextField>
          )}
        />
      )}
    >
      <Stack direction="row" spacing={0.7} sx={{ mb: 0.8 }}>
        <Chip size="small" label={`Groups: ${total}`} variant="outlined" />
        <Chip size="small" label={`Pending: ${rows.filter((row) => row.status === "pending").length}`} color="warning" variant="outlined" />
      </Stack>
      {!rows.length && !loading ? (
        <Typography variant="body2" color="text.secondary">No groups found.</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 1.1, gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" } }}>
          {rows.map((item) => (
            <GroupCard
              key={item.id}
              group={item}
              actions={item.status === "pending" ? <GroupReviewActions group={item} onDone={() => loadData()} /> : null}
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

export default TeacherGroupsPage;
