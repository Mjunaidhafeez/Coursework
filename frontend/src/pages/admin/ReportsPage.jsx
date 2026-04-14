import { Grid2 as Grid, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import CourseResultMatrix from "../../components/shared/CourseResultMatrix";
import { ENDPOINTS } from "../../api/endpoints";
import StatCard from "../../components/StatCard";
import { buildFeedbackBySubmissionMap } from "../../utils/feedback";

const ReportsPage = () => {
  const [stats, setStats] = useState({
    highestRollNos: "-",
    lowestRollNos: "-",
    totalCourses: 0,
    totalStudents: 0,
  });
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseworks, setCourseworks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [feedbackBySubmissionId, setFeedbackBySubmissionId] = useState({});
  const [enrollments, setEnrollments] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`${ENDPOINTS.submissions}?page_size=1000&ordering=submitted_at`),
      api.get(`${ENDPOINTS.feedback}?page_size=1000`),
      api.get(`${ENDPOINTS.courseworks}?page_size=500`),
      api.get(`${ENDPOINTS.courses}?page_size=300`),
      api.get(`${ENDPOINTS.semesters}?page_size=100`),
      api.get(`${ENDPOINTS.enrollments}?page_size=4000`),
    ]).then(([submissionsRes, feedbackRes, courseworksRes, coursesRes, semestersRes, enrollmentsRes]) => {
        const rows = submissionsRes.data.results || [];
        const feedbackMap = buildFeedbackBySubmissionMap(feedbackRes.data.results || []);
        const markedRows = rows.filter((item) => item.is_marked);
        const scored = markedRows
          .map((item) => {
            const feedback = feedbackMap[String(item.id)];
            const marks = Number(item.obtained_marks ?? feedback?.marks);
            return {
              name: item.student_name || item.submitted_by_name || item.group_name || "-",
              rollNo: item.student_roll_no || "-",
              marks: Number.isFinite(marks) ? marks : null,
            };
          })
          .filter((row) => row.marks !== null);

        const byRoll = new Map();
        scored.forEach((row) => {
          const rollNo = String(row.rollNo || "-");
          if (!byRoll.has(rollNo)) {
            byRoll.set(rollNo, { rollNo, total: 0, count: 0 });
          }
          const item = byRoll.get(rollNo);
          item.total += row.marks;
          item.count += 1;
        });
        const ranked = Array.from(byRoll.values()).map((item) => ({
          rollNo: item.rollNo,
          avg: item.count ? item.total / item.count : 0,
        }));
        const highest5 = [...ranked].sort((a, b) => b.avg - a.avg).slice(0, 5).map((item) => item.rollNo);
        const lowest5 = [...ranked].sort((a, b) => a.avg - b.avg).slice(0, 5).map((item) => item.rollNo);

        setStats({
          highestRollNos: highest5.length ? highest5.join(", ") : "-",
          lowestRollNos: lowest5.length ? lowest5.join(", ") : "-",
          totalCourses: (coursesRes.data.results || []).length,
          totalStudents: (enrollmentsRes.data.results || []).length,
        });
        setSubmissions(rows.filter((item) => item.is_marked));
        setCourseworks(courseworksRes.data.results || []);
        setCourses(coursesRes.data.results || []);
        setSemesters(semestersRes.data.results || []);
        setEnrollments(enrollmentsRes.data.results || []);
        setFeedbackBySubmissionId(feedbackMap);
      });
  }, []);
  const statCards = [
    { label: "Highest 5 Roll Nos", value: stats.highestRollNos, valueFontSize: "0.88rem" },
    { label: "Lowest 5 Roll Nos", value: stats.lowestRollNos, valueFontSize: "0.88rem" },
    { label: "Total Courses", value: stats.totalCourses },
    { label: "Total Students", value: stats.totalStudents },
  ];

  const filteredCourses = useMemo(
    () => courses.filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter)),
    [courses, semesterFilter]
  );

  return (
    <>
      <Grid container spacing={2}>
        {statCards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, md: 3 }}>
            <StatCard label={card.label} value={card.value} valueFontSize={card.valueFontSize} />
          </Grid>
        ))}
      </Grid>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Course Result</Typography>
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
        </Stack>
        <CourseResultMatrix
          submissions={submissions}
          courseworks={courseworks}
          courses={courses}
          semesters={semesters}
          enrollments={enrollments}
          feedbackBySubmissionId={feedbackBySubmissionId}
          search={search}
          semesterFilter={semesterFilter}
          courseFilter={courseFilter}
          exportFilePrefix="admin-course-result"
          emptyText="No compiled result found for selected filters."
        />
      </Paper>
    </>
  );
};

export default ReportsPage;
