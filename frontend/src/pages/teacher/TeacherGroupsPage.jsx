import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { ENDPOINTS } from "../../api/endpoints";

const TeacherGroupsPage = () => {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const loadData = async ({ pageValue = page, pageSizeValue = pageSize } = {}) => {
    const params = new URLSearchParams();
    params.append("ordering", "name");
    params.append("page", String(pageValue));
    params.append("page_size", String(pageSizeValue));
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
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={1.2}>Class Groups</Typography>
        {!rows.length && !loading ? (
          <Typography variant="body2" color="text.secondary">No groups found.</Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.1,
              gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" },
            }}
          >
            {rows.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{
                  p: 1,
                  borderColor: "#dbeafe",
                  borderRadius: 1.5,
                  bgcolor: "#fafcff",
                }}
              >
                <Typography sx={{ fontWeight: 800, mb: 0.6 }}>{item.name}</Typography>
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
            total={total}
            onPageChange={(newPage) => { setPage(newPage); loadData({ pageValue: newPage }); }}
            onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); loadData({ pageValue: 1, pageSizeValue: newSize }); }}
          />
        </Box>
      </Paper>
    </Stack>
  );
};

export default TeacherGroupsPage;
