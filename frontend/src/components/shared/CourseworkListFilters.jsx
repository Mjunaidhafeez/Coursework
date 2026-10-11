import { MenuItem, TextField } from "@mui/material";

import { SUBMISSION_TYPE_OPTIONS, uniqueCourseSemesters } from "../../utils/courseworkOptions";

const CourseworkListFilters = ({
  courses,
  courseFilter,
  onCourse,
  typeFilter,
  onType,
  submissionFilter,
  onSubmission,
  semesterFilter,
  onSemester,
  typeOptions,
}) => (
  <>
    <TextField select size="small" label="Semester" value={semesterFilter} onChange={(e) => onSemester(e.target.value)} sx={{ minWidth: 120 }}>
      <MenuItem value="">All</MenuItem>
      {uniqueCourseSemesters(courses).map((item) => (
        <MenuItem key={item.id} value={item.id}>{item.number}</MenuItem>
      ))}
    </TextField>
    <TextField select size="small" label="Course" value={courseFilter} onChange={(e) => onCourse(e.target.value)} sx={{ minWidth: 150 }}>
      <MenuItem value="">All courses</MenuItem>
      {courses.map((course) => <MenuItem key={course.id} value={String(course.id)}>{course.title}</MenuItem>)}
    </TextField>
    <TextField select size="small" label="Type" value={typeFilter} onChange={(e) => onType(e.target.value)} sx={{ minWidth: 130 }}>
      <MenuItem value="">All types</MenuItem>
      {typeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
    <TextField select size="small" label="Submission" value={submissionFilter} onChange={(e) => onSubmission(e.target.value)} sx={{ minWidth: 140 }}>
      <MenuItem value="">All modes</MenuItem>
      {SUBMISSION_TYPE_OPTIONS.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  </>
);

export default CourseworkListFilters;
