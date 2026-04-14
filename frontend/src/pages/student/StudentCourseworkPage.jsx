import { Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { ENDPOINTS } from "../../api/endpoints";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";
import { formatDate } from "../../utils/format";

const StudentCourseworkPage = () => {
  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.courseworks}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, runSearch, resetSearch, changePage, changePageSize } =
    usePaginatedQuery({ queryFn });

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Coursework</Typography>
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={resetSearch}
        />
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Submission</TableCell>
              <TableCell>Max Marks</TableCell>
              <TableCell>Deadline</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.coursework_type}</TableCell>
                <TableCell>
                  <Chip size="small" label={item.submission_type} color={item.submission_type === "group" ? "secondary" : "primary"} />
                </TableCell>
                <TableCell>{item.max_marks ?? "-"}</TableCell>
                <TableCell>{formatDate(item.deadline)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <PaginationControls
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
        />
      </Paper>
    </Stack>
  );
};

export default StudentCourseworkPage;
