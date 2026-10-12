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
import CourseEnrolledCell from "../../components/shared/CourseEnrolledCell";
import CourseStudyFilesCell from "../../components/shared/CourseStudyFiles";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { ENDPOINTS } from "../../api/endpoints";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";

const CoursesListPage = ({ title, enableSemesterFilter = false }) => {
  const { user } = useAuth();
  const canManageFiles = ["teacher", "super_admin"].includes(user?.role);
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [semesters, setSemesters] = useState([]);

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (enableSemesterFilter) {
      if (semesterFilter !== "all" && semesterFilter !== "my") params.append("semester", semesterFilter);
      if (semesterFilter === "my" && user?.student_profile?.semester) params.append("semester", String(user.student_profile.semester));
    }
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.courses}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, loadData, runSearch, resetSearch, changePage, changePageSize } =
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
                <MenuItem value="all">All enrolled</MenuItem>
                <MenuItem value="my">My Semester</MenuItem>
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
              {canManageFiles ? <TableCell>Students</TableCell> : null}
              <TableCell>Files</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.code}</TableCell>
                <TableCell>{item.title}</TableCell>
                <TableCell>{item.semester_name || `Semester ${item.semester_number}`}</TableCell>
                <TableCell>{(item.teacher_names || []).join(", ") || "-"}</TableCell>
                {canManageFiles ? (
                  <TableCell>
                    <CourseEnrolledCell course={item} />
                  </TableCell>
                ) : null}
                <TableCell>
                  <CourseStudyFilesCell course={item} canManage={canManageFiles} onChanged={() => loadData()} />
                </TableCell>
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
