import {
  Box,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import CourseResultMatrix from "../../components/shared/CourseResultMatrix";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { ENDPOINTS } from "../../api/endpoints";

const GradingPage = () => {
  const [resultSubmissions, setResultSubmissions] = useState([]);
  const [resultFeedbackBySubmissionId, setResultFeedbackBySubmissionId] = useState({});
  const [courses, setCourses] = useState([]);
  const [courseworks, setCourseworks] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [resultSearch, setResultSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [resultLoading, setResultLoading] = useState(false);

  const loadResultData = async () => {
    setResultLoading(true);
    try {
      const [semRes, courseRes, cwRes, subRes, feedbackRes, enrollmentsRes] = await Promise.all([
        api.get(`${ENDPOINTS.semesters}?page_size=100`),
        api.get(`${ENDPOINTS.courses}?page_size=300`),
        api.get(`${ENDPOINTS.courseworks}?page_size=500`),
        api.get(`${ENDPOINTS.submissions}?page_size=1000&ordering=submitted_at`),
        api.get(`${ENDPOINTS.feedback}?page_size=3000`),
        api.get(`${ENDPOINTS.enrollments}?page_size=4000`),
      ]);
      const feedbackMap = (feedbackRes.data.results || []).reduce((acc, item) => {
        acc[String(item.submission)] = item;
        return acc;
      }, {});
      setSemesters(semRes.data.results || []);
      setCourses(courseRes.data.results || []);
      setCourseworks(cwRes.data.results || []);
      setResultSubmissions((subRes.data.results || []).filter((item) => item.is_marked));
      setResultFeedbackBySubmissionId(feedbackMap);
      setEnrollments(enrollmentsRes.data.results || []);
    } finally {
      setResultLoading(false);
    }
  };

  useEffect(() => {
    loadResultData();
  }, []);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Course Result</Typography>
        <SearchToolbar
          search={resultSearch}
          onSearchChange={setResultSearch}
          onSearch={() => {}}
          onReset={() => {
            setResultSearch("");
            setSemesterFilter("");
            setCourseFilter("");
          }}
        />
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
          <TextField
            select
            size="small"
            label="Semester"
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setCourseFilter("");
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {semesters.map((semester) => (
              <MenuItem key={semester.id} value={String(semester.id)}>Semester {semester.number}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Course"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All</MenuItem>
            {courses
              .filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter))
              .map((course) => (
                <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>
              ))}
          </TextField>
        </Stack>
        <Box sx={{ mt: 1.4 }}>
          {resultLoading ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={26} />
            </Stack>
          ) : (
            <CourseResultMatrix
              submissions={resultSubmissions}
              courseworks={courseworks}
              courses={courses}
              semesters={semesters}
              enrollments={enrollments}
              feedbackBySubmissionId={resultFeedbackBySubmissionId}
              search={resultSearch}
              semesterFilter={semesterFilter}
              courseFilter={courseFilter}
              exportFilePrefix="teacher-course-result"
              emptyText="No result records found for selected filters."
            />
          )}
        </Box>
      </Paper>
    </Stack>
  );
};

export default GradingPage;
