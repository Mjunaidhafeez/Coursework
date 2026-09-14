import { CircularProgress, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import CourseResultMatrix from "../../components/shared/CourseResultMatrix";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { fetchAllPages } from "../../utils/fetchAllPages";
import { buildFeedbackBySubmissionMap } from "../../utils/feedback";

const GradingPage = () => {
  const { isGlobalLoading } = useUi();
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
      const loaderConfig = { skipGlobalLoader: true };
      const [semestersRows, coursesRows, courseworksRows, submissionsRows, feedbackRows, enrollmentsRows] = await Promise.all([
        fetchAllPages(api, ENDPOINTS.semesters, { page_size: 100 }, loaderConfig),
        fetchAllPages(api, ENDPOINTS.courses, { page_size: 300 }, loaderConfig),
        fetchAllPages(api, ENDPOINTS.courseworks, { page_size: 500 }, loaderConfig),
        fetchAllPages(api, ENDPOINTS.submissions, { page_size: 500, workflow_state: "marked", ordering: "submitted_at" }, loaderConfig),
        fetchAllPages(api, ENDPOINTS.feedback, { page_size: 500 }, loaderConfig),
        fetchAllPages(api, ENDPOINTS.enrollments, { page_size: 500 }, loaderConfig),
      ]);
      setSemesters(semestersRows);
      setCourses(coursesRows);
      setCourseworks(courseworksRows);
      setResultSubmissions(submissionsRows.filter((item) => item.is_marked));
      setResultFeedbackBySubmissionId(buildFeedbackBySubmissionMap(feedbackRows));
      setEnrollments(enrollmentsRows);
    } finally {
      setResultLoading(false);
    }
  };

  useEffect(() => {
    loadResultData();
  }, []);

  return (
    <ListingPage
      title="Course Result"
      filters={(
        <SearchToolbar
          search={resultSearch}
          onSearchChange={setResultSearch}
          onSearch={() => {}}
          onReset={() => {
            setResultSearch("");
            setSemesterFilter("");
            setCourseFilter("");
          }}
          filters={(
            <>
              <TextField
                select
                size="small"
                label="Semester"
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setCourseFilter("");
                }}
                sx={{ minWidth: 140 }}
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
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All</MenuItem>
                {courses
                  .filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter))
                  .map((course) => (
                    <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>
                  ))}
              </TextField>
            </>
          )}
        />
      )}
    >
          {resultLoading && !isGlobalLoading ? (
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
    </ListingPage>
  );
};

export default GradingPage;
