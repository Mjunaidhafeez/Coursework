import { Button, CircularProgress, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import CourseResultMatrix from "../../components/shared/CourseResultMatrix";
import { useAuth } from "../../context/AuthContext";
import { ENDPOINTS } from "../../api/endpoints";
import { buildFeedbackBySubmissionMap } from "../../utils/feedback";

const getRows = (res) => (res?.status === "fulfilled" ? res.value?.data?.results || [] : []);

const GradesPage = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseworks, setCourseworks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [feedbackBySubmissionId, setFeedbackBySubmissionId] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [semRes, courseRes, cwRes, subRes, feedbackRes] = await Promise.allSettled([
        api.get(`${ENDPOINTS.semesters}?page_size=100`),
        api.get(`${ENDPOINTS.courses}?page_size=300`),
        api.get(`${ENDPOINTS.courseworks}?page_size=500`),
        api.get(`${ENDPOINTS.submissions}?page_size=800&ordering=submitted_at`),
        api.get(`${ENDPOINTS.feedback}?page_size=3000`),
      ]);

      const semesterRows = getRows(semRes);
      const courseRows = getRows(courseRes);
      const courseworkRows = getRows(cwRes);
      const submissionRows = getRows(subRes);
      const feedbackRows = getRows(feedbackRes); // Student may get 403; keep graceful fallback.
      const markedRows = submissionRows.filter((item) => item.is_marked);

      setSemesters(semesterRows);
      setCourses(courseRows);
      setCourseworks(courseworkRows);
      setSubmissions(markedRows);
      setFeedbackBySubmissionId(buildFeedbackBySubmissionMap(feedbackRows));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCourses = useMemo(
    () => courses.filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter)),
    [courses, semesterFilter]
  );
  const studentEnrollments = useMemo(() => {
    const studentId = user?.id || "me";
    const fullName =
      user?.full_name ||
      `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
      submissions[0]?.student_name ||
      user?.username ||
      "Student";
    const rollNo =
      submissions.find((item) => item.student_roll_no)?.student_roll_no ||
      user?.username ||
      "-";
    const uniqueCourseIds = new Set();
    const rows = [];
    submissions.forEach((submission) => {
      const coursework = courseworks.find((cw) => String(cw.id) === String(submission.coursework));
      if (!coursework) return;
      if (uniqueCourseIds.has(String(coursework.course))) return;
      uniqueCourseIds.add(String(coursework.course));
      rows.push({
        course: coursework.course,
        student: studentId,
        student_name: fullName,
        student_roll_no: rollNo,
      });
    });
    return rows;
  }, [user, submissions, courseworks]);

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>Course Result</Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
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
            {filteredCourses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            variant="text"
            sx={{ alignSelf: "center" }}
            onClick={() => {
              setSearch("");
              setSemesterFilter("");
              setCourseFilter("");
            }}
          >
            Reset
          </Button>
        </Stack>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 3 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <CourseResultMatrix
            submissions={submissions}
            courseworks={courseworks}
            courses={courses}
            semesters={semesters}
            enrollments={studentEnrollments}
            feedbackBySubmissionId={feedbackBySubmissionId}
            search={search}
            semesterFilter={semesterFilter}
            courseFilter={courseFilter}
            exportFilePrefix="student-course-result"
            emptyText="No result found for current filters."
          />
        )}
      </Paper>
    </Stack>
  );
};

export default GradesPage;
