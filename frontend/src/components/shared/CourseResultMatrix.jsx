import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { Button, Chip, Collapse, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import { formatMarks } from "../../utils/format";
import { shallowEqualObjects } from "../../utils/object";
import { csvSafe, downloadTextFile, fileSafe } from "../../utils/export";

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

    const visibleCourses = courses
      .filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter))
      .filter((course) => !courseFilter || String(course.id) === String(courseFilter))
      .map((course) => {
        const cws = [...(courseworksByCourse.get(String(course.id)) || [])].sort((a, b) =>
          String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
        );
        if (!cws.length) return null;

        const studentRows = (enrollments || [])
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

        if (!studentRows.length && normalizedSearch) return null;

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

  const exportExcel = () => {
    const metaRow = `Semester: ${exportMeta.semesters.join(", ") || "-"} | Course Name: ${exportMeta.courses.join(", ") || "-"} | Course Teacher: ${exportMeta.teachers.join(", ") || "-"}`;
    const lines = [
      csvSafe(metaRow),
      "",
      exportHeaders.map(csvSafe).join(","),
      ...exportRows.map((row) =>
        [
          row.studentName,
          row.rollNo,
          ...exportHeaders.slice(2, -2).map((header) => row.courseworkMarks[header] || "-"),
          row.totalObtained,
          row.totalMax,
        ]
          .map(csvSafe)
          .join(",")
      ),
    ];
    downloadTextFile(`${fileSafe(exportFilePrefix)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  };

  const exportPdf = () => {
    const headerCells = exportHeaders.map((h) => `<th>${h}</th>`).join("");
    const metaLine = `Semester: ${exportMeta.semesters.join(", ") || "-"} | Course Name: ${exportMeta.courses.join(", ") || "-"} | Course Teacher: ${exportMeta.teachers.join(", ") || "-"}`;
    const bodyRows = exportRows
      .map(
        (row) => `<tr>
      <td>${row.studentName}</td>
      <td>${row.rollNo}</td>
      ${exportHeaders.slice(2, -2).map((header) => `<td>${row.courseworkMarks[header] || "-"}</td>`).join("")}
      <td>${row.totalObtained}</td>
      <td>${row.totalMax}</td>
    </tr>`
      )
      .join("");
    const pop = window.open("", "_blank", "width=1400,height=900");
    if (!pop) return;
    pop.document.write(`
      <html>
        <head>
          <title>Course Result Matrix</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 14px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
            th { background: #eff6ff; position: sticky; top: 0; }
          </style>
        </head>
        <body>
          <h2>Course Result Matrix</h2>
          <p><strong>${metaLine}</strong></p>
          <table>
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </body>
      </html>
    `);
    pop.document.close();
    pop.focus();
    pop.print();
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
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="flex-end">
        <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportExcel}>
          Export Excel
        </Button>
        <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportPdf}>
          Export PDF
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
                    <Table size="small">
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

