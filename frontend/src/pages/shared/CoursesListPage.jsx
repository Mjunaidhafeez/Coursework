import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { ENDPOINTS } from "../../api/endpoints";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";

const CoursesListPage = ({ title, enableSemesterFilter = false }) => {
  const [semesterFilter, setSemesterFilter] = useState("my");
  const [semesters, setSemesters] = useState([]);

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (enableSemesterFilter) {
      if (semesterFilter === "all") params.append("all_semesters", "1");
      else if (semesterFilter !== "my") params.append("semester", semesterFilter);
    }
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.courses}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, runSearch, resetSearch, changePage, changePageSize } =
    usePaginatedQuery({ queryFn, dependencies: enableSemesterFilter ? [semesterFilter] : [] });

  useEffect(() => {
    if (!enableSemesterFilter) return;
    const loadSemesters = async () => {
      const params = new URLSearchParams();
      params.append("ordering", "number");
      params.append("page_size", "100");
      const { data } = await api.get(`${ENDPOINTS.semesters}?${params.toString()}`);
      setSemesters(data.results || []);
    };
    loadSemesters();
  }, [enableSemesterFilter]);

  const semesterLabel = useMemo(() => rows[0]?.semester_name || "", [rows]);

  return (
    <ListingPage
      title={title}
      tabs={enableSemesterFilter && semesterLabel ? <Chip size="small" label={`My Semester: ${semesterLabel}`} color="info" variant="outlined" /> : null}
      filters={(
        <SearchToolbar
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={resetSearch}
          filters={enableSemesterFilter ? (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel id="student-courses-semester-filter">Semester</InputLabel>
              <Select
                labelId="student-courses-semester-filter"
                label="Semester"
                value={semesterFilter}
                onChange={(e) => setSemesterFilter(e.target.value)}
              >
                <MenuItem value="my">My Semester</MenuItem>
                <MenuItem value="all">All Semesters</MenuItem>
                {semesters.map((semester) => (
                  <MenuItem key={semester.id} value={String(semester.id)}>
                    Semester {semester.number}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
        />
      )}
    >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Semester</TableCell>
              <TableCell>Teachers</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.semester_name || `Semester ${item.semester_number}`}</TableCell>
                <TableCell>{(item.teacher_names || []).join(", ") || "-"}</TableCell>
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
    </ListingPage>
  );
};

export default CoursesListPage;
