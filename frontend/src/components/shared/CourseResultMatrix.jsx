import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { Button, Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { formatMarks } from "../../utils/format";
import { shallowEqualObjects } from "../../utils/object";
import { exportTable } from "../../utils/export";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const CourseResultMatrix = ({
  submissions = [],
  feedbackBySubmissionId = {},
  semesters = [],
  courses = [],
  courseworks = [],
  enrollments = [],
  semesterFilter = "",
  courseFilter = "",
  search = "",
  emptyText = "No result found.",
  exportFilePrefix = "course-result-matrix",
}) => {
  const [openSemesters, setOpenSemesters] = useState({});
  const [openCourses, setOpenCourses] = useState({});
  const [sortBy, setSortBy] = useState("rollNo");
  const [sortDir, setSortDir] = useState("asc");

  const semesterById = useMemo(() => {
    const map = new Map();
    (semesters || []).forEach((semester) => {
      map.set(String(semester.id), `Semester ${semester.number}`);
    });
    return map;
  }, [semesters]);

  const sortedRows = (rows) => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortBy === "studentName") {
        return factor * String(a.studentName || "").localeCompare(String(b.studentName || ""), undefined, { sensitivity: "base" });
      }
      if (sortBy === "totalObtained") {
        return factor * ((a.totalObtained || 0) - (b.totalObtained || 0));
      }
      if (sortBy === "totalMax") {
        return factor * ((a.totalMax || 0) - (b.totalMax || 0));
      }
      return factor * String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, { numeric: true, sensitivity: "base" });
    });
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(field);
    setSortDir("asc");
  };

  const sortLabel = (field, label) => `${label}${sortBy === field ? (sortDir === "asc" ? " ▲" : " ▼") : ""}`;

  const content = useMemo(() => {
    const normalizedSearch = String(search || "").trim().toLowerCase();
    const courseworksByCourse = new Map();
    courseworks.forEach((cw) => {
      const key = String(cw.course);
      if (!courseworksByCourse.has(key)) courseworksByCourse.set(key, []);
      courseworksByCourse.get(key).push(cw);
    });

    const latestSubmissionByParticipantKey = new Map();
    submissions.forEach((submission) => {
      if (!submission?.coursework) return;
      const cw = courseworks.find((item) => String(item.id) === String(submission.coursework));
      if (!cw) return;
      const participantIds = new Set();
      if (submission.student) {
        participantIds.add(String(submission.student));
      } else {
        (submission.requested_member_ids || []).forEach((id) => participantIds.add(String(id)));
        (submission.group_member_ids || []).forEach((id) => participantIds.add(String(id)));
      }
      if (!participantIds.size) return;
      const currTs = new Date(submission.submitted_at || submission.created_at || 0).getTime();
      participantIds.forEach((participantId) => {
        const key = `${cw.course}-${participantId}-${submission.coursework}`;
        const prev = latestSubmissionByParticipantKey.get(key);
        const prevTs = new Date(prev?.submitted_at || prev?.created_at || 0).getTime();
        if (!prev || currTs >= prevTs) latestSubmissionByParticipantKey.set(key, submission);
      });
    });

    const enrollmentByKey = new Map();
    (enrollments || []).forEach((enrollment) => {
      if (!enrollment?.course || enrollment.student == null) return;
      enrollmentByKey.set(`${enrollment.course}-${enrollment.student}`, enrollment);
    });

    submissions.forEach((submission) => {
      const cw = courseworks.find((item) => String(item.id) === String(submission.coursework));
      if (!cw) return;
      const participants = [];
      if (submission.student) {
        participants.push({
          student: submission.student,
          student_name: submission.student_name || submission.submitted_by_name,
          student_roll_no: submission.student_roll_no || "",
        });
      }
      const memberDetails = submission.group_member_details || submission.requested_member_details || [];
      memberDetails.forEach((member) => {
        const studentId = member.id || member.student;
        if (!studentId) return;
        participants.push({
          student: studentId,
          student_name: member.name || member.student_name,
          student_roll_no: member.roll_no || member.student_roll_no || "",
        });
      });
      participants.forEach((participant) => {
        const key = `${cw.course}-${participant.student}`;
        if (enrollmentByKey.has(key)) return;
        enrollmentByKey.set(key, {
          course: cw.course,
          student: participant.student,
          student_name: participant.student_name,
          student_roll_no: participant.student_roll_no,
        });
      });
    });

    const allEnrollments = Array.from(enrollmentByKey.values());

    const visibleCourses = courses
      .filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter))
      .filter((course) => !courseFilter || String(course.id) === String(courseFilter))
      .map((course) => {
        const cws = [...(courseworksByCourse.get(String(course.id)) || [])].sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
        );
        if (!cws.length) return null;

        const studentRows = allEnrollments
          .filter((enrollment) => String(enrollment.course) === String(course.id))
          .map((enrollment) => {
            const studentName = enrollment.student_name || `Student #${enrollment.student}`;
            const rollNo = enrollment.student_roll_no || "-";
            const cells = cws.map((cw) => {
              const key = `${course.id}-${enrollment.student}-${cw.id}`;
              const submission = latestSubmissionByParticipantKey.get(key);
              const feedback = submission ? feedbackBySubmissionId[String(submission.id)] : null;
              const obtainedRaw = feedback?.marks ?? submission?.obtained_marks ?? null;
              const obtained = toNumber(obtainedRaw);
              const maxMarks = toNumber(cw.max_marks);
              return {
                courseworkId: cw.id,
                obtained,
                maxMarks,
                label: obtained === null || maxMarks === null ? "-" : `${formatMarks(obtained)}/${formatMarks(maxMarks)}`,
              };
            });

            const totalObtained = cells.reduce((sum, cell) => sum + (cell.obtained || 0), 0);
            const totalMax = cells.reduce((sum, cell) => sum + (cell.maxMarks || 0), 0);
            return {
              studentId: enrollment.student,
              studentName,
              rollNo,
              cells,
              totalObtained,
              totalMax,
            };
          })
          .filter((row) => {
            if (!normalizedSearch) return true;
            const rowText = `${row.studentName} ${row.rollNo}`.toLowerCase();
            return rowText.includes(normalizedSearch);
          });

        if (!studentRows.length) return null;

        return {
          id: course.id,
          title: course.title || `Course ${course.id}`,
          semesterId: course.semester,
          semesterTitle: semesterById.get(String(course.semester)) || course.semester_name || "Semester",
          teachers: (course.teacher_names || []).join(", ") || "-",
          courseworks: cws,
          rows: studentRows,
        };
      })
      .filter(Boolean);

    const semesterMap = new Map();
    visibleCourses.forEach((course) => {
      const semTitle = course.semesterTitle;
      if (!semesterMap.has(semTitle)) semesterMap.set(semTitle, { title: semTitle, courses: [] });
      semesterMap.get(semTitle).courses.push(course);
    });
    return Array.from(semesterMap.values());
  }, [submissions, feedbackBySubmissionId, courses, courseworks, enrollments, semesterFilter, courseFilter, search, semesterById]);

  useEffect(() => {
    const nextSemesters = {};
    const nextCourses = {};
    content.forEach((semesterNode, semIdx) => {
      nextSemesters[semesterNode.title] = semIdx === 0;
      semesterNode.courses.forEach((courseNode, courseIdx) => {
        nextCourses[`${semesterNode.title}__${courseNode.id}`] = semIdx === 0 && courseIdx === 0;
      });
    });
    setOpenSemesters((prev) => (shallowEqualObjects(prev, nextSemesters) ? prev : nextSemesters));
    setOpenCourses((prev) => (shallowEqualObjects(prev, nextCourses) ? prev : nextCourses));
  }, [content]);

  const exportRows = useMemo(() => {
    const rows = [];
    content.forEach((semesterNode) => {
      semesterNode.courses.forEach((courseNode) => {
        sortedRows(courseNode.rows).forEach((row) => {
          const courseworkMarks = {};
          courseNode.courseworks.forEach((cw, idx) => {
            courseworkMarks[cw.title] = row.cells[idx]?.label || "-";
          });
          rows.push({
            semester: semesterNode.title,
            course: courseNode.title,
            teacher: courseNode.teachers,
            studentName: row.studentName,
            rollNo: row.rollNo,
            courseworkMarks,
            totalObtained: formatMarks(row.totalObtained),
            totalMax: formatMarks(row.totalMax),
          });
        });
      });
    });
    return rows;
  }, [content, sortBy, sortDir]);

  const exportMeta = useMemo(() => {
    const semestersSet = new Set();
    const coursesSet = new Set();
    const teachersSet = new Set();
    content.forEach((semesterNode) => {
      semestersSet.add(semesterNode.title);
      semesterNode.courses.forEach((courseNode) => {
        coursesSet.add(courseNode.title);
        if (courseNode.teachers) teachersSet.add(courseNode.teachers);
      });
    });
    return {
      semesters: Array.from(semestersSet),
      courses: Array.from(coursesSet),
      teachers: Array.from(teachersSet),
    };
  }, [content]);

  const exportHeaders = useMemo(() => {
    const dynamic = new Set();
    content.forEach((semesterNode) => {
      semesterNode.courses.forEach((courseNode) => {
        courseNode.courseworks.forEach((cw) => dynamic.add(cw.title));
      });
    });
    return ["Student Name", "Roll No", ...Array.from(dynamic), "Total Obtained", "Total Marks"];
  }, [content]);

  const resultSheet = useMemo(() => {
    const headers = exportHeaders;
    const rows = exportRows.map((row) => [
      row.studentName,
      row.rollNo,
      ...headers.slice(2, -2).map((header) => row.courseworkMarks[header] || "-"),
      row.totalObtained,
      row.totalMax,
    ]);
    const subtitle = [
      `Semester: ${exportMeta.semesters.join(", ") || "-"}`,
      `Course: ${exportMeta.courses.join(", ") || "-"}`,
      `Teacher: ${exportMeta.teachers.join(", ") || "-"}`,
      search ? `Search: ${search}` : "",
      semesterFilter ? "Semester filter on" : "",
      courseFilter ? "Course filter on" : "",
      `Rows: ${rows.length}`,
    ].filter(Boolean).join(" · ");
    return { headers, rows, subtitle };
  }, [exportHeaders, exportRows, exportMeta, search, semesterFilter, courseFilter]);

  const exportResults = (kind) => {
    exportTable({
      kind,
      filePrefix: exportFilePrefix,
      title: "Course Result",
      subtitle: resultSheet.subtitle,
      headers: resultSheet.headers,
      rows: resultSheet.rows,
    });
  };

  if (!content.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
        <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" spacing={0.8} justifyContent="flex-end" sx={{ mb: 0.4 }}>
        <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={() => exportResults("csv")}>
          CSV
        </Button>
        <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={() => exportResults("pdf")}>
          PDF
        </Button>
      </Stack>
      {content.map((semesterNode) => (
        <Paper key={semesterNode.title} variant="outlined" sx={{ p: 1.2, borderColor: "#93c5fd", bgcolor: "#f8fbff" }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.7 }}>
            <Typography sx={{ fontWeight: 800 }}>{semesterNode.title}</Typography>
            <IconButton size="small" onClick={() => setOpenSemesters((prev) => ({ ...prev, [semesterNode.title]: !prev[semesterNode.title] }))}>
              {openSemesters[semesterNode.title] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
            </IconButton>
          </Stack>

          <Collapse in={!!openSemesters[semesterNode.title]}>
            <Stack spacing={1}>
              {semesterNode.courses.map((course) => (
                <Paper key={course.id} variant="outlined" sx={{ p: 1, borderColor: "#bfdbfe", bgcolor: "#fff" }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.7 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                      <Typography sx={{ fontWeight: 800 }}>Course Name: {course.title}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700 }}>
                        Course Teacher: {course.teachers}
                      </Typography>
                      <Chip size="small" variant="outlined" label={`Students: ${course.rows.length}`} />
                    </Stack>
                    <IconButton size="small" onClick={() => setOpenCourses((prev) => ({ ...prev, [`${semesterNode.title}__${course.id}`]: !prev[`${semesterNode.title}__${course.id}`] }))}>
                      {openCourses[`${semesterNode.title}__${course.id}`] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                  </Stack>

                  <Collapse in={!!openCourses[`${semesterNode.title}__${course.id}`]}>
                    <TableContainer sx={{ overflowX: "auto" }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ cursor: "pointer" }} onClick={() => toggleSort("studentName")}>{sortLabel("studentName", "Name of Student")}</TableCell>
                          <TableCell sx={{ cursor: "pointer" }} onClick={() => toggleSort("rollNo")}>{sortLabel("rollNo", "Roll No")}</TableCell>
                          {course.courseworks.map((cw) => (
                            <TableCell key={`cw-${course.id}-${cw.id}`}>{cw.title}</TableCell>
                          ))}
                          <TableCell sx={{ cursor: "pointer" }} onClick={() => toggleSort("totalObtained")}>{sortLabel("totalObtained", "Total Obtained")}</TableCell>
                          <TableCell sx={{ cursor: "pointer" }} onClick={() => toggleSort("totalMax")}>{sortLabel("totalMax", "Total Marks")}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sortedRows(course.rows).map((row) => (
                          <TableRow key={`${course.id}-${row.studentId}`}>
                            <TableCell>{row.studentName}</TableCell>
                            <TableCell>{row.rollNo}</TableCell>
                            {row.cells.map((cell) => (
                              <TableCell key={`cell-${row.studentId}-${cell.courseworkId}`}>{cell.label}</TableCell>
                            ))}
                            <TableCell>{formatMarks(row.totalObtained)}</TableCell>
                            <TableCell>{formatMarks(row.totalMax)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </TableContainer>
                  </Collapse>
                </Paper>
              ))}
            </Stack>
          </Collapse>
        </Paper>
      ))}
    </Stack>
  );
};

export default CourseResultMatrix;

