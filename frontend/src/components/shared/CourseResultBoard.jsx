import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { Button, Chip, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { useMemo } from "react";

import { formatMarks } from "../../utils/format";
import { csvSafe, downloadTextFile, fileSafe } from "../../utils/export";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const percent = (obtained, max) => {
  const o = toNumber(obtained);
  const m = toNumber(max);
  if (o === null || m === null || m <= 0) return "-";
  return `${((o / m) * 100).toFixed(1)}%`;
};

const humanTitle = (value) =>
  String(value || "course result")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const CourseResultBoard = ({
  submissions = [],
  courseworks = [],
  courses = [],
  semesters = [],
  feedbackBySubmissionId = {},
  showStudentColumn = false,
  search = "",
  semesterFilter = "",
  courseFilter = "",
  emptyText = "No result found.",
  exportFilePrefix = "course-result",
}) => {
  const grouped = useMemo(() => {
    const courseworkById = {};
    courseworks.forEach((cw) => {
      courseworkById[String(cw.id)] = cw;
    });

    const courseById = {};
    courses.forEach((course) => {
      courseById[String(course.id)] = course;
    });

    const semesterById = {};
    semesters.forEach((semester) => {
      semesterById[String(semester.id)] = semester;
    });

    const normalizedQuery = String(search || "").trim().toLowerCase();
    const semestersMap = new Map();

    submissions.forEach((submission) => {
      const feedback = feedbackBySubmissionId[String(submission.id)];
      const obtained = feedback?.marks ?? submission.obtained_marks ?? null;
      if (obtained === null || obtained === undefined || obtained === "") return;

      const coursework = courseworkById[String(submission.coursework)];
      if (!coursework) return;
      const course = courseById[String(coursework.course)];
      if (!course) return;

      if (semesterFilter && String(course.semester) !== String(semesterFilter)) return;
      if (courseFilter && String(course.id) !== String(courseFilter)) return;

      const studentLabel = submission.group_name || submission.student_name || submission.student || "-";
      const studentName = submission.student_name || submission.submitted_by_name || studentLabel;
      const rollNo = submission.student_roll_no || "-";
      const feedbackText = feedback?.feedback || "";
      const courseworkTitle = coursework.title || submission.coursework_title || `Coursework #${submission.coursework}`;
      const courseTitle = course.title || `Course ${course.id}`;
      const courseCode = course.code || "-";
      const teacherName = (course.teacher_names || []).join(", ") || "-";
      const semesterNumber = semesterById[String(course.semester)]?.number;
      const semesterTitle = semesterNumber ? `Semester ${semesterNumber}` : course.semester_name || "Semester";

      const haystack = `${semesterTitle} ${courseTitle} ${courseworkTitle} ${studentLabel} ${feedbackText}`.toLowerCase();
      if (normalizedQuery && !haystack.includes(normalizedQuery)) return;

      const maxMarks = coursework.max_marks;
      const obtainedNum = toNumber(obtained);
      const maxNum = toNumber(maxMarks);

      if (!semestersMap.has(semesterTitle)) {
        semestersMap.set(semesterTitle, {
          title: semesterTitle,
          totalObtained: 0,
          totalMax: 0,
          recordCount: 0,
          courses: new Map(),
        });
      }
      const semesterNode = semestersMap.get(semesterTitle);

      if (!semesterNode.courses.has(courseTitle)) {
        semesterNode.courses.set(courseTitle, {
          title: courseTitle,
          totalObtained: 0,
          totalMax: 0,
          recordCount: 0,
          courseworks: new Map(),
        });
      }
      const courseNode = semesterNode.courses.get(courseTitle);

      if (!courseNode.courseworks.has(courseworkTitle)) {
        courseNode.courseworks.set(courseworkTitle, {
          title: courseworkTitle,
          totalObtained: 0,
          totalMax: 0,
          recordCount: 0,
          rows: [],
        });
      }
      const courseworkNode = courseNode.courseworks.get(courseworkTitle);
      const participants = showStudentColumn
        ? submission.student
          ? [{ id: submission.student, studentName, rollNo, studentLabel }]
          : (submission.group_member_details || []).length
          ? (submission.group_member_details || []).map((member) => ({
              id: member.id,
              studentName: member.name || studentName,
              rollNo: member.roll_no || "-",
              studentLabel: member.name || studentLabel,
            }))
          : (submission.requested_member_details || []).length
          ? (submission.requested_member_details || []).map((member) => ({
              id: member.id,
              studentName: member.name || studentName,
              rollNo: member.roll_no || "-",
              studentLabel: member.name || studentLabel,
            }))
          : [{ id: submission.id, studentName, rollNo, studentLabel }]
        : [{ id: submission.id, studentName, rollNo, studentLabel }];

      participants.forEach((participant, idx) => {
        courseworkNode.rows.push({
          id: `${submission.id}-${participant.id || idx}`,
          submissionId: submission.id,
          semester: semesterTitle,
          studentName: participant.studentName,
          rollNo: participant.rollNo,
          courseTitle,
          courseCode,
          teacherName,
          courseworkType: coursework.coursework_type || "-",
          submissionMode: coursework.submission_type || "-",
          topic: submission.topic || "-",
          studentLabel: participant.studentLabel || studentLabel,
          obtained,
          maxMarks,
          percentage: percent(obtained, maxMarks),
          approvalStatus: submission.approval_status || "-",
          stageLabel: submission.is_marked ? "Marked" : "In Progress",
          feedbackText,
        });

        if (obtainedNum !== null && maxNum !== null) {
          courseworkNode.totalObtained += obtainedNum;
          courseworkNode.totalMax += maxNum;
          courseworkNode.recordCount += 1;
          courseNode.totalObtained += obtainedNum;
          courseNode.totalMax += maxNum;
          courseNode.recordCount += 1;
          semesterNode.totalObtained += obtainedNum;
          semesterNode.totalMax += maxNum;
          semesterNode.recordCount += 1;
        }
      });
    });

    return Array.from(semestersMap.values()).map((semesterNode) => ({
      ...semesterNode,
      courses: Array.from(semesterNode.courses.values()).map((courseNode) => ({
        ...courseNode,
        courseworks: Array.from(courseNode.courseworks.values()),
      })),
    }));
  }, [submissions, courseworks, courses, semesters, feedbackBySubmissionId, search, semesterFilter, courseFilter]);

  const avgLabel = (obtainedTotal, maxTotal, count) => {
    if (!count || count <= 0) return "- / - (-)";
    const avgObtained = obtainedTotal / count;
    const avgMax = maxTotal / count;
    return `${formatMarks(avgObtained)} / ${formatMarks(avgMax)} (${percent(avgObtained, avgMax)})`;
  };

  const exportRows = useMemo(() => {
    const rows = [];
    let serial = 1;
    grouped.forEach((semesterNode) => {
      semesterNode.courses.forEach((courseNode) => {
        courseNode.courseworks.forEach((courseworkNode) => {
          courseworkNode.rows.forEach((row) => {
            rows.push({
              serial: serial++,
              semester: row.semester || semesterNode.title,
              student: row.studentName || row.studentLabel,
              rollNo: row.rollNo || "-",
              course: row.courseTitle || courseNode.title,
              courseCode: row.courseCode || "-",
              teacherName: row.teacherName || "-",
              coursework: courseworkNode.title,
              courseworkType: row.courseworkType || "-",
              submissionMode: row.submissionMode || "-",
              topic: row.topic || "-",
              obtained: formatMarks(row.obtained),
              max: formatMarks(row.maxMarks),
              percentage: row.percentage || percent(row.obtained, row.maxMarks),
              stage: row.stageLabel || "-",
              approvalStatus: row.approvalStatus || "-",
              feedback: row.feedbackText || "-",
            });
          });
        });
      });
    });
    return rows;
  }, [grouped]);

  const exportExcel = () => {
    const header = [
      "Sr #",
      "Semester",
      "Student Name",
      "Roll No",
      "Course Name",
      "Course Code",
      "Teacher Name",
      "Coursework",
      "Coursework Type",
      "Submission Mode",
      "Topic",
      "Obtained Marks",
      "Max Marks",
      "Percentage",
      "Stage",
      "Approval Status",
      "Feedback",
    ];
    const lines = [
      header.map(csvSafe).join(","),
      ...exportRows.map((row) =>
        [
          row.serial,
          row.semester,
          row.student,
          row.rollNo,
          row.course,
          row.courseCode,
          row.teacherName,
          row.coursework,
          row.courseworkType,
          row.submissionMode,
          row.topic,
          row.obtained,
          row.max,
          row.percentage,
          row.stage,
          row.approvalStatus,
          row.feedback,
        ]
          .map(csvSafe)
          .join(",")
      ),
    ];
    downloadTextFile(`${fileSafe(exportFilePrefix)}.csv`, lines.join("\n"), "text/csv;charset=utf-8");
  };

  const exportPdf = () => {
    const htmlRows = exportRows
      .map(
        (row) =>
          `<tr>
            <td>${row.serial}</td>
            <td>${row.semester}</td>
            <td>${row.student}</td>
            <td>${row.rollNo}</td>
            <td>${row.course}</td>
            <td>${row.courseCode}</td>
            <td>${row.teacherName}</td>
            <td>${row.coursework}</td>
            <td>${row.courseworkType}</td>
            <td>${row.submissionMode}</td>
            <td>${row.topic}</td>
            <td>${row.obtained}</td>
            <td>${row.max}</td>
            <td>${row.percentage}</td>
            <td>${row.stage}</td>
            <td>${row.approvalStatus}</td>
            <td>${row.feedback}</td>
          </tr>`
      )
      .join("");
    const pop = window.open("", "_blank", "width=1200,height=800");
    if (!pop) return;
    pop.document.write(`
      <html>
        <head>
          <title>${humanTitle(exportFilePrefix)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; }
            h2 { margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; font-size: 12px; text-align: left; }
            th { background: #eff6ff; }
          </style>
        </head>
        <body>
          <h2>${humanTitle(exportFilePrefix)}</h2>
          <table>
            <thead>
              <tr>
                <th>Sr #</th>
                <th>Semester</th>
                <th>Student Name</th>
                <th>Roll No</th>
                <th>Course Name</th>
                <th>Course Code</th>
                <th>Teacher Name</th>
                <th>Coursework</th>
                <th>Coursework Type</th>
                <th>Submission Mode</th>
                <th>Topic</th>
                <th>Obtained Marks</th>
                <th>Max Marks</th>
                <th>Percentage</th>
                <th>Stage</th>
                <th>Approval Status</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>${htmlRows}</tbody>
          </table>
        </body>
      </html>
    `);
    pop.document.close();
    pop.focus();
    pop.print();
  };

  if (!grouped.length) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
        <Typography variant="body2" color="text.secondary">{emptyText}</Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={1.2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="flex-end">
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadRoundedIcon fontSize="small" />}
          onClick={exportExcel}
        >
          Export Excel
        </Button>
        <Button
          size="small"
          variant="contained"
          color="secondary"
          startIcon={<PictureAsPdfRoundedIcon fontSize="small" />}
          onClick={exportPdf}
        >
          Export PDF
        </Button>
      </Stack>
      {grouped.map((semesterNode) => (
        <Paper key={semesterNode.title} variant="outlined" sx={{ p: 1.1, borderColor: "#bfdbfe", bgcolor: "#f8fbff" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography sx={{ fontWeight: 800 }}>{semesterNode.title}</Typography>
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Semester Avg: ${avgLabel(semesterNode.totalObtained, semesterNode.totalMax, semesterNode.recordCount)} | Records: ${semesterNode.recordCount || 0}`}
            />
          </Stack>

          <Stack spacing={1}>
            {semesterNode.courses.map((courseNode) => (
              <Paper key={`${semesterNode.title}-${courseNode.title}`} variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", bgcolor: "#fff" }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 0.8 }}>
                  <Typography sx={{ fontWeight: 700 }}>{courseNode.title}</Typography>
                  <Chip
                    size="small"
                    color="info"
                    variant="outlined"
                    label={`Course Avg: ${avgLabel(courseNode.totalObtained, courseNode.totalMax, courseNode.recordCount)} | Records: ${courseNode.recordCount || 0}`}
                  />
                </Stack>

                <Stack spacing={0.8}>
                  {courseNode.courseworks.map((courseworkNode) => (
                    <Paper key={`${courseNode.title}-${courseworkNode.title}`} variant="outlined" sx={{ p: 0.8, borderColor: "#e5e7eb", bgcolor: "#fafcff" }}>
                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{courseworkNode.title}</Typography>
                        <Chip
                          size="small"
                          color="success"
                          variant="outlined"
                          label={`Coursework Avg: ${avgLabel(courseworkNode.totalObtained, courseworkNode.totalMax, courseworkNode.recordCount)} | Records: ${courseworkNode.recordCount || 0}`}
                        />
                      </Stack>

                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {showStudentColumn && <TableCell>Student / Group</TableCell>}
                            <TableCell>Obtained</TableCell>
                            <TableCell>Max</TableCell>
                            <TableCell>Percentage</TableCell>
                            <TableCell>Feedback</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {courseworkNode.rows.map((row) => (
                            <TableRow key={row.id}>
                              {showStudentColumn && <TableCell>{row.studentLabel}</TableCell>}
                              <TableCell>{formatMarks(row.obtained)}</TableCell>
                              <TableCell>{formatMarks(row.maxMarks)}</TableCell>
                              <TableCell>{percent(row.obtained, row.maxMarks)}</TableCell>
                              <TableCell>{row.feedbackText || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};

export default CourseResultBoard;
