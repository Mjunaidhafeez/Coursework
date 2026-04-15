import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Fragment, useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import api from "../../api/client";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { COURSEWORK_TYPE_OPTIONS, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { formatDate, formatMarks } from "../../utils/format";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";
import { shallowEqualObjects } from "../../utils/object";
import { resolveSubmissionMembers } from "../../utils/submissionMembers";
import { getSubmissionStageMeta } from "../../utils/submissionWorkflow";

const SubmitWorkPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseworks, setCourseworks] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("opening");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [courseFilter, setCourseFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [courseworkTypeFilter, setCourseworkTypeFilter] = useState("");
  const [submissionModeFilter, setSubmissionModeFilter] = useState("");
  const [openCourseSections, setOpenCourseSections] = useState({});
  const [openCourseworkSections, setOpenCourseworkSections] = useState({});
  const [requestByCoursework, setRequestByCoursework] = useState({});
  const [editingRequestByCoursework, setEditingRequestByCoursework] = useState({});
  const [rowFiles, setRowFiles] = useState({});
  const [rowUploading, setRowUploading] = useState({});
  const [rowFileDeleting, setRowFileDeleting] = useState({});
  const [membersBySubmission, setMembersBySubmission] = useState({});
  const [membersLoadingBySubmission, setMembersLoadingBySubmission] = useState({});
  const [message, setMessage] = useState("");

  const courseworkById = useMemo(() => {
    const map = {};
    courseworks.forEach((item) => {
      map[String(item.id)] = item;
    });
    return map;
  }, [courseworks]);
  const courseById = useMemo(() => {
    const map = {};
    courses.forEach((course) => {
      map[String(course.id)] = course;
    });
    return map;
  }, [courses]);
  const teacherOptions = useMemo(() => {
    const map = new Map();
    courses.forEach((course) => {
      const teacherIds = course.teachers || [];
      const teacherNames = course.teacher_names || [];
      teacherIds.forEach((teacherId, idx) => {
        if (!map.has(String(teacherId))) {
          map.set(String(teacherId), teacherNames[idx] || `Teacher ${teacherId}`);
        }
      });
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [courses]);
  const submissionByCoursework = useMemo(() => {
    const map = {};
    submissions.forEach((submission) => {
      const key = String(submission.coursework);
      const prev = map[key];
      if (!prev) {
        map[key] = submission;
        return;
      }
      const prevTs = new Date(prev.updated_at || prev.submitted_at || prev.created_at || 0).getTime();
      const currTs = new Date(submission.updated_at || submission.submitted_at || submission.created_at || 0).getTime();
      if (currTs >= prevTs) {
        map[key] = submission;
      }
    });
    return map;
  }, [submissions]);
  const blockedMemberIdsByCoursework = useMemo(() => {
    const map = {};
    const addParticipant = (courseworkId, participantId) => {
      const normalized = Number(participantId);
      if (!normalized) return;
      const key = String(courseworkId);
      if (!map[key]) map[key] = new Set();
      map[key].add(normalized);
    };

    submissions.forEach((submission) => {
      const courseworkId = submission?.coursework;
      if (!courseworkId) return;
      addParticipant(courseworkId, submission.student);
      (submission.requested_member_ids || []).forEach((id) => addParticipant(courseworkId, id));
      (submission.group_member_ids || []).forEach((id) => addParticipant(courseworkId, id));
    });

    return map;
  }, [submissions]);
  const isCourseworkMarked = (courseworkId) => Boolean(submissionByCoursework[String(courseworkId)]?.is_marked);
  const sortedStudents = useMemo(
    () =>
      [...students].sort((a, b) =>
        String(a.student_id || a.username || "").localeCompare(String(b.student_id || b.username || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [students]
  );
  const selectableStudents = useMemo(
    () => sortedStudents.filter((student) => String(student.id) !== String(user?.id)),
    [sortedStudents, user?.id]
  );
  const filteredCourseworks = useMemo(() => {
    if (!search.trim()) return courseworks;
    const q = search.trim().toLowerCase();
    return courseworks.filter((item) => {
      const title = String(item.title || "").toLowerCase();
      const course = String(item.course_title || "").toLowerCase();
      const type = String(item.coursework_type || "").toLowerCase();
      return title.includes(q) || course.includes(q) || type.includes(q);
    });
  }, [courseworks, search]);
  const finalFilteredCourseworks = useMemo(
    () =>
      filteredCourseworks.filter((item) => {
        const course = courseById[String(item.course)];
        if (semesterFilter && String(course?.semester || "") !== String(semesterFilter)) return false;
        if (courseFilter && String(item.course) !== String(courseFilter)) return false;
        if (teacherFilter && !(course?.teachers || []).map(String).includes(String(teacherFilter))) return false;
        if (courseworkTypeFilter && String(item.coursework_type) !== String(courseworkTypeFilter)) return false;
        if (submissionModeFilter && String(item.submission_type) !== String(submissionModeFilter)) return false;
        return true;
      }),
    [filteredCourseworks, courseById, semesterFilter, courseFilter, teacherFilter, courseworkTypeFilter, submissionModeFilter]
  );
  const openingRows = useMemo(
    () => {
      const nowTs = Date.now();
      return finalFilteredCourseworks.filter((item) => {
        if (isCourseworkMarked(item.id)) return false;
        return new Date(item.deadline).getTime() >= nowTs;
      });
    },
    [finalFilteredCourseworks, submissionByCoursework]
  );
  const closedRows = useMemo(
    () => {
      const nowTs = Date.now();
      return finalFilteredCourseworks.filter((item) => {
        if (isCourseworkMarked(item.id)) return true;
        return new Date(item.deadline).getTime() < nowTs;
      });
    },
    [finalFilteredCourseworks, submissionByCoursework]
  );
  const openingGrouped = useMemo(() => {
    const grouped = {};
    openingRows.forEach((item) => {
      const key = item.course_title || "Unknown Course";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return Object.entries(grouped);
  }, [openingRows]);
  const closedGrouped = useMemo(() => {
    const grouped = {};
    closedRows.forEach((item) => {
      const key = item.course_title || "Unknown Course";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return Object.entries(grouped);
  }, [closedRows]);

  const loadData = async () => {
    const [semestersRes, coursesRes, courseworksRes, submissionsRes, groupsRes, studentsRes] = await Promise.all([
      api.get(`${ENDPOINTS.semesters}?page_size=100`),
      api.get(`${ENDPOINTS.courses}?page_size=300`),
      api.get(`${ENDPOINTS.courseworks}?page_size=300`),
      api.get(`${ENDPOINTS.submissions}?page_size=300&ordering=submitted_at`),
      api.get(`${ENDPOINTS.groups}?page_size=300&ordering=name&include_coursework_groups=true`),
      api.get(`${ENDPOINTS.groups}eligible_students/?scope=global`),
    ]);

    setSemesters(semestersRes.data.results || []);
    setCourses(coursesRes.data.results || []);
    setCourseworks(courseworksRes.data.results || []);
    const visibleGroups = (groupsRes.data.results || []).filter((group) =>
      (group.members || []).some(
        (member) =>
          Number(member.student) === Number(user?.id) &&
          (member.accepted || member.invitation_status === "accepted")
      )
    );
    setGroups(visibleGroups);
    setStudents(studentsRes.data || []);
    setSubmissions(submissionsRes.data.results || []);
  };

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    const next = {};
    openingGrouped.forEach(([courseTitle], idx) => {
      next[`opening-${courseTitle}`] = idx === 0;
    });
    closedGrouped.forEach(([courseTitle], idx) => {
      next[`closed-${courseTitle}`] = idx === 0;
    });
    setOpenCourseSections((prev) => (shallowEqualObjects(prev, next) ? prev : next));
  }, [openingGrouped, closedGrouped]);
  useEffect(() => {
    const next = {};
    openingRows.forEach((item, idx) => {
      next[String(item.id)] = idx === 0;
    });
    closedRows.forEach((item, idx) => {
      next[String(item.id)] = idx === 0;
    });
    setOpenCourseworkSections((prev) => (shallowEqualObjects(prev, next) ? prev : next));
  }, [openingRows, closedRows]);

  const isSubmissionDueLocked = (coursework) => {
    return Boolean(coursework?.lock_at_due_time && coursework?.deadline && new Date(coursework.deadline) < new Date());
  };
  const canUploadForSubmission = (submission) => {
    const coursework = courseworkById[String(submission.coursework)];
    return submission.approval_status === "approved" && !submission.is_marked && !isSubmissionDueLocked(coursework);
  };
  const getSubmissionFiles = (submission) => {
    const files = submission?.submitted_files || [];
    if (files.length) return files;
    if (submission?.file) {
      return [{ id: `legacy-${submission.id}`, file: submission.file, file_name: "Uploaded file", is_legacy: true }];
    }
    return [];
  };
  const hasUploadedFiles = (submission) => Boolean(getSubmissionFiles(submission).length || submission?.file);
  const allowsGroup = (coursework) =>
    coursework?.submission_type === "group" || coursework?.submission_type === "both";
  const requiresGroup = (coursework) => coursework?.submission_type === "group";
  const maxAdditionalAllowed = (coursework) => {
    const maxMembers = coursework?.max_group_members;
    if (!maxMembers) return null;
    return Math.max(maxMembers - 1, 0);
  };
  const getRequestState = (courseworkId) => requestByCoursework[String(courseworkId)] || { topic: "", selectedGroup: "", newMemberIds: [] };
  const updateRequestState = (courseworkId, patch) => {
    setRequestByCoursework((prev) => ({
      ...prev,
      [String(courseworkId)]: {
        ...getRequestState(courseworkId),
        ...patch,
      },
    }));
  };
  const buildRequestStateFromSubmission = (submission) => ({
    topic: submission?.topic || "",
    selectedGroup: submission?.group ? String(submission.group) : "",
    newMemberIds: submission?.group
      ? []
      : (submission?.requested_member_ids || []).filter((id) => String(id) !== String(user?.id)).map(Number),
  });
  const hasParticipantConflict = ({ courseworkId, participantIds, excludeSubmissionId = null }) =>
    submissions.some((submission) => {
      if (Number(submission.coursework) !== Number(courseworkId)) return false;
      if (excludeSubmissionId && Number(submission.id) === Number(excludeSubmissionId)) return false;
      const existingIds = new Set();
      if (submission.student) existingIds.add(Number(submission.student));
      (submission.requested_member_ids || []).forEach((id) => existingIds.add(Number(id)));
      (submission.group_member_ids || []).forEach((id) => existingIds.add(Number(id)));
      for (const id of participantIds) {
        if (existingIds.has(Number(id))) return true;
      }
      return false;
    });
  const getCourseworkTypeChipColor = (type) => {
    const value = String(type || "").toLowerCase();
    if (value === "assignment") return "primary";
    if (value === "quiz") return "secondary";
    if (value === "exam") return "error";
    if (value === "presentation") return "info";
    if (value === "project") return "success";
    return "default";
  };
  const getSubmissionModeChipColor = (mode) => {
    const value = String(mode || "").toLowerCase();
    if (value === "individual") return "default";
    if (value === "group") return "warning";
    if (value === "both") return "secondary";
    return "default";
  };

  const uploadSingleRow = async (submission, { showSuccess = true, reloadAfter = true } = {}) => {
    const files = rowFiles[submission.id] || [];
    const coursework = courseworkById[String(submission.coursework)];
    if (!files.length) {
      notify(`Choose file(s) first for "${submission.coursework_title || submission.coursework}"`, "error");
      return false;
    }
    if (!canUploadForSubmission(submission)) {
      notify("This row cannot be uploaded in current state", "error");
      return false;
    }
    const payload = new FormData();
    files.forEach((fileItem) => payload.append("files", fileItem));

    setRowUploading((prev) => ({ ...prev, [submission.id]: true }));
    try {
      await api.post(`${ENDPOINTS.submissions}${submission.id}/upload_files/`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (showSuccess) notify("Files uploaded");
      if (showSuccess) setMessage(`Uploaded ${files.length} file(s) for "${submission.coursework_title || submission.coursework}".`);
      setRowFiles((prev) => ({ ...prev, [submission.id]: [] }));
      if (reloadAfter) await loadData();
      return true;
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
      return false;
    } finally {
      setRowUploading((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  const deleteSubmissionFile = async (submission, fileId) => {
    const key = `${submission.id}-${fileId}`;
    setRowFileDeleting((prev) => ({ ...prev, [key]: true }));
    try {
      await api.post(`${ENDPOINTS.submissions}${submission.id}/delete_file/`, { file_id: fileId });
      notify("File deleted");
      await loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setRowFileDeleting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const fetchSubmissionMembers = async (submission) => {
    setMembersLoadingBySubmission((prev) => ({ ...prev, [submission.id]: true }));
    try {
      const members = await resolveSubmissionMembers(api, ENDPOINTS, submission);
      setMembersBySubmission((prev) => ({ ...prev, [submission.id]: members }));
    } catch {
      notify("Could not load members", "error");
    } finally {
      setMembersLoadingBySubmission((prev) => ({ ...prev, [submission.id]: false }));
    }
  };

  useEffect(() => {
    const rowsToCheck = viewMode === "opening" ? openingRows : closedRows;
    const pendingLoads = [];

    rowsToCheck.forEach((coursework) => {
      const courseworkKey = String(coursework.id);
      if (!openCourseworkSections[courseworkKey]) return;

      const submission = submissionByCoursework[courseworkKey];
      if (!submission) return;

      if (membersBySubmission[submission.id] || membersLoadingBySubmission[submission.id]) return;
      pendingLoads.push(fetchSubmissionMembers(submission));
    });

    if (pendingLoads.length) {
      Promise.allSettled(pendingLoads);
    }
  }, [
    viewMode,
    openingRows,
    closedRows,
    openCourseworkSections,
    submissionByCoursework,
    membersBySubmission,
    membersLoadingBySubmission,
  ]);

  const toggleCourseSection = (courseKey) => {
    setOpenCourseSections((prev) => ({ ...prev, [courseKey]: !prev[courseKey] }));
  };
  const toggleCourseworkSection = async (coursework, submission) => {
    const key = String(coursework.id);
    const next = !openCourseworkSections[key];
    setOpenCourseworkSections((prev) => ({ ...prev, [key]: next }));
    if (next && submission && !requestByCoursework[key]) {
      updateRequestState(coursework.id, buildRequestStateFromSubmission(submission));
    }
    if (next && submission && !membersBySubmission[submission.id]) {
      await fetchSubmissionMembers(submission);
    }
  };
  const handleSendRequest = async (coursework) => {
    const existing = submissionByCoursework[String(coursework.id)];
    if (existing) {
      notify("Request already exists for this assessment", "error");
      return;
    }
    const row = getRequestState(coursework.id);
    const topic = String(row.topic || "").trim();
    const selectedGroup = row.selectedGroup ? Number(row.selectedGroup) : null;
    const newMemberIds = (row.newMemberIds || []).map(Number);
    if (!topic) {
      notify("Topic is required", "error");
      return;
    }
    if (requiresGroup(coursework) && !selectedGroup && !newMemberIds.length) {
      notify("Select existing group or choose members", "error");
      return;
    }
    const payload = {
      coursework: coursework.id,
      topic,
      group: selectedGroup,
      member_ids: selectedGroup ? [] : newMemberIds,
    };

    const participantIds = new Set();
    if (selectedGroup) {
      const selectedGroupRow = groups.find((group) => Number(group.id) === Number(selectedGroup));
      (selectedGroupRow?.members || []).forEach((member) => {
        if (member.accepted === false) return;
        if (member.student) participantIds.add(Number(member.student));
      });
    } else {
      participantIds.add(Number(user?.id));
      newMemberIds.forEach((id) => participantIds.add(Number(id)));
    }
    const conflictingParticipantIds = new Set();
    if (hasParticipantConflict({ courseworkId: coursework.id, participantIds })) {
      submissions.forEach((submission) => {
        if (Number(submission.coursework) !== Number(coursework.id)) return;
        const existingIds = new Set();
        if (submission.student) existingIds.add(Number(submission.student));
        (submission.requested_member_ids || []).forEach((id) => existingIds.add(Number(id)));
        (submission.group_member_ids || []).forEach((id) => existingIds.add(Number(id)));
        for (const id of participantIds) {
          if (existingIds.has(Number(id))) conflictingParticipantIds.add(Number(id));
        }
      });
      const conflictNames = Array.from(conflictingParticipantIds)
        .map((id) => {
          if (Number(id) === Number(user?.id)) {
            return "You";
          }
          const student = sortedStudents.find((item) => Number(item.id) === Number(id));
          return student?.full_name || student?.username || `Student #${id}`;
        })
        .filter(Boolean);
      const preview = conflictNames.slice(0, 3).join(", ");
      const suffix = conflictNames.length > 3 ? " and others" : "";
      notify(
        `${preview}${suffix} already have a request in this assessment. Please choose different member(s).`,
        "error"
      );
      return;
    }

    try {
      await api.post(ENDPOINTS.submissions, payload);
      notify("Request sent successfully");
      setRequestByCoursework((prev) => ({ ...prev, [String(coursework.id)]: { topic: "", selectedGroup: "", newMemberIds: [] } }));
      await loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const handleUpdateRequest = async (coursework, submission) => {
    const row = getRequestState(coursework.id);
    const topic = String(row.topic || "").trim();
    const selectedGroup = row.selectedGroup ? Number(row.selectedGroup) : null;
    const newMemberIds = (row.newMemberIds || []).map(Number);

    if (!topic) {
      notify("Topic is required", "error");
      return;
    }
    if (requiresGroup(coursework) && !selectedGroup && !newMemberIds.length) {
      notify("Select existing group or choose members", "error");
      return;
    }

    const participantIds = new Set();
    if (selectedGroup) {
      const selectedGroupRow = groups.find((group) => Number(group.id) === Number(selectedGroup));
      (selectedGroupRow?.members || []).forEach((member) => {
        if (member.accepted === false) return;
        if (member.student) participantIds.add(Number(member.student));
      });
    } else {
      participantIds.add(Number(user?.id));
      newMemberIds.forEach((id) => participantIds.add(Number(id)));
    }

    if (hasParticipantConflict({ courseworkId: coursework.id, participantIds, excludeSubmissionId: submission.id })) {
      notify("One or more selected participants already have a request in this assessment.", "error");
      return;
    }

    try {
      await api.patch(`${ENDPOINTS.submissions}${submission.id}/`, {
        topic,
        group: selectedGroup,
        member_ids: selectedGroup ? [] : newMemberIds,
      });
      notify(
        coursework.approval_required
          ? "Request updated. Status moved to pending approval."
          : "Request updated and remains approved."
      );
      setEditingRequestByCoursework((prev) => ({ ...prev, [String(coursework.id)]: false }));
      await loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const remove = async (id) => {
    const prev = submissions;
    setSubmissions((curr) => curr.filter((s) => s.id !== id));
    try {
      await api.delete(`${ENDPOINTS.submissions}${id}/`);
      notify("Submission deleted");
      loadData();
    } catch {
      setSubmissions(prev);
      notify("Delete failed", "error");
    }
  };

  return (
    <Stack spacing={2}>
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={1.2}>Submit Work</Typography>
        {message && <Alert severity="success">{message}</Alert>}
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} flexWrap="wrap">
          <TextField
            size="small"
            label="Search assessment/course/type"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 260 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="semester-filter-label">Semester</InputLabel>
            <Select
              labelId="semester-filter-label"
              label="Semester"
              value={semesterFilter}
              onChange={(e) => {
                setSemesterFilter(e.target.value);
                setCourseFilter("");
                setTeacherFilter("");
              }}
            >
              <MenuItem value="">All</MenuItem>
              {semesters.map((semester) => (
                <MenuItem key={semester.id} value={String(semester.id)}>
                  Semester {semester.number}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="course-filter-label">Course</InputLabel>
            <Select
              labelId="course-filter-label"
              label="Course"
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {courses
                .filter((course) => !semesterFilter || String(course.semester) === String(semesterFilter))
                .map((course) => (
                  <MenuItem key={course.id} value={String(course.id)}>
                    {course.title}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="teacher-filter-label">Teacher</InputLabel>
            <Select
              labelId="teacher-filter-label"
              label="Teacher"
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {teacherOptions.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="coursework-type-filter-label">Assessment Type</InputLabel>
            <Select
              labelId="coursework-type-filter-label"
              label="Assessment Type"
              value={courseworkTypeFilter}
              onChange={(e) => setCourseworkTypeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {COURSEWORK_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="submission-mode-filter-label">Submission Mode</InputLabel>
            <Select
              labelId="submission-mode-filter-label"
              label="Submission Mode"
              value={submissionModeFilter}
              onChange={(e) => setSubmissionModeFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              {SUBMISSION_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="text"
            onClick={() => {
              setSearch("");
              setSemesterFilter("");
              setCourseFilter("");
              setTeacherFilter("");
              setCourseworkTypeFilter("");
              setSubmissionModeFilter("");
            }}
          >
            Reset Filters
          </Button>
        </Stack>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mt: 1 }}>
          <Button
            variant={viewMode === "opening" ? "contained" : "outlined"}
            color="info"
            onClick={() => setViewMode("opening")}
          >
            Open Assessment
          </Button>
          <Button
            variant={viewMode === "closed" ? "contained" : "outlined"}
            color="warning"
            onClick={() => setViewMode("closed")}
          >
            Closed / History
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 1.5 }}>
          <Chip size="small" color="info" label={`Opening: ${openingRows.length}`} />
          <Chip size="small" color="warning" label={`Closed: ${closedRows.length}`} />
        </Stack>
        <Box>
          {(() => {
            const section = viewMode === "opening"
              ? { key: "opening", title: "Open Assessment", grouped: openingGrouped, tone: "#f8fbff", border: "#dbeafe" }
              : { key: "closed", title: "Closed Assessment", grouped: closedGrouped, tone: "#fff8f0", border: "#ffe0b2" };
            const isClosedView = section.key === "closed";
            return (
              <Paper variant="outlined" sx={{ p: 1, bgcolor: section.tone, borderColor: section.border, maxHeight: "70vh", overflowY: "auto" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>{section.title}</Typography>
                <Stack spacing={1}>
                  {section.grouped.map(([courseTitle, items]) => {
                    const courseKey = `${section.key}-${courseTitle}`;
                    return (
                      <Paper key={`${section.title}-${courseTitle}`} variant="outlined" sx={{ p: 0.9, borderColor: "primary.main", bgcolor: "#fff" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{courseTitle}</Typography>
                      <IconButton size="small" onClick={() => toggleCourseSection(courseKey)}>
                        {openCourseSections[courseKey] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                      </IconButton>
                    </Stack>
                    <Collapse in={Boolean(openCourseSections[courseKey])} timeout="auto" unmountOnExit>
                      <Stack spacing={0.9} sx={{ mt: 0.8 }}>
                        {items.map((coursework) => {
                          const submission = submissionByCoursework[String(coursework.id)];
                          const request = getRequestState(coursework.id);
                          const additionalLimit = maxAdditionalAllowed(coursework);
                          const canUpload = submission ? canUploadForSubmission(submission) : false;
                          const selectedGroupObj = groups.find(
                            (group) => String(group.id) === String(request.selectedGroup || "")
                          );
                          const selectedMemberCount = request.selectedGroup
                            ? (selectedGroupObj?.members || []).filter((member) => member.accepted !== false).length
                            : 1 + (request.newMemberIds || []).length;
                          const blockedIdsForCoursework = blockedMemberIdsByCoursework[String(coursework.id)] || new Set();
                          const blockedStudentsForCoursework = selectableStudents.filter((student) =>
                            blockedIdsForCoursework.has(Number(student.id))
                          );
                          const selfOption = user
                            ? {
                                id: Number(user.id),
                                full_name:
                                  `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Me",
                                username: user.username || "me",
                                student_id: "You (pre-selected)",
                                __self: true,
                              }
                            : null;
                          const memberOptions = selfOption
                            ? [selfOption, ...selectableStudents]
                            : selectableStudents;
                          return (
                            <Paper key={coursework.id} variant="outlined" sx={{ p: 0.9, borderColor: "#cbd5e1" }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => toggleCourseworkSection(coursework, submission)}
                                  sx={{ textTransform: "none", fontWeight: 700, p: 0 }}
                                >
                                  {coursework.title}
                                </Button>
                                <IconButton size="small" onClick={() => toggleCourseworkSection(coursework, submission)}>
                                  {openCourseworkSections[String(coursework.id)] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                </IconButton>
                              </Stack>
                              <Collapse in={Boolean(openCourseworkSections[String(coursework.id)])} timeout="auto" unmountOnExit>
                                <Stack spacing={1} sx={{ mt: 0.9 }}>
                                  <Stack direction={{ xs: "column", md: "row" }} spacing={0.8}>
                                    <Chip
                                      size="small"
                                      color={getCourseworkTypeChipColor(coursework.coursework_type)}
                                      label={`Assessment Type: ${coursework.coursework_type || "-"}`}
                                    />
                                    <Chip
                                      size="small"
                                      color={getSubmissionModeChipColor(coursework.submission_type)}
                                      label={`Submission Mode: ${coursework.submission_type || "-"}`}
                                    />
                                    <Chip size="small" color={isClosedView ? "warning" : "info"} label={`Deadline: ${formatDate(coursework.deadline)}`} />
                                    <Chip size="small" label={`Teachers: ${(coursework.teacher_names || []).join(", ") || "-"}`} />
                                  </Stack>
                                  {!submission && isClosedView ? (
                                    <Paper variant="outlined" sx={{ p: 1, borderColor: "#ffe0b2", bgcolor: "#fff8f0" }}>
                                      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }}>
                                        <Chip size="small" color="warning" label="Closed" />
                                        <Typography variant="body2" color="text.secondary">
                                          Deadline passed. No request/submission was created for this assessment.
                                        </Typography>
                                      </Stack>
                                    </Paper>
                                  ) : !submission ? (
                                    <Paper variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.7 }}>Step 1: Send Request (Topic + Members/Group)</Typography>
                                      <Stack spacing={0.9}>
                                        <TextField
                                          size="small"
                                          label="Topic"
                                          value={request.topic}
                                          onChange={(e) => updateRequestState(coursework.id, { topic: e.target.value })}
                                        />
                                        {allowsGroup(coursework) && (
                                          <Fragment>
                                            <FormControl size="small">
                                              <InputLabel id={`existing-group-${coursework.id}`}>Existing Group</InputLabel>
                                              <Select
                                                labelId={`existing-group-${coursework.id}`}
                                                label="Existing Group"
                                                value={request.selectedGroup}
                                                onChange={(e) => updateRequestState(coursework.id, { selectedGroup: e.target.value, newMemberIds: [] })}
                                              >
                                                <MenuItem value="">
                                                  <em>Select Group</em>
                                                </MenuItem>
                                                {groups.map((group) => (
                                                  <MenuItem key={group.id} value={String(group.id)}>{group.name}</MenuItem>
                                                ))}
                                              </Select>
                                            </FormControl>
                                            {!request.selectedGroup && (
                                              <Autocomplete
                                                multiple
                                                size="small"
                                                options={memberOptions}
                                                value={selectableStudents.filter((student) =>
                                                  request.newMemberIds.includes(student.id)
                                                )}
                                                disableCloseOnSelect
                                                fullWidth
                                                getOptionLabel={(option) =>
                                                  option.full_name || option.username || String(option.id)
                                                }
                                                getOptionDisabled={(option) =>
                                                  Boolean(option.__self) ||
                                                  Boolean(blockedMemberIdsByCoursework[String(coursework.id)]?.has(Number(option.id)))
                                                }
                                                isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                                onChange={(_, selectedOptions) => {
                                                  const next = selectedOptions
                                                    .filter((option) => !option.__self)
                                                    .map((option) => Number(option.id));
                                                  if (additionalLimit !== null && next.length > additionalLimit) {
                                                    notify(`Only ${additionalLimit} additional member(s) allowed`, "warning");
                                                    return;
                                                  }
                                                  updateRequestState(coursework.id, { newMemberIds: next });
                                                }}
                                                ListboxProps={{ style: { maxHeight: 250 } }}
                                                renderTags={(value, getTagProps) => {
                                                  const tags = [];
                                                  if (selfOption) {
                                                    tags.push(
                                                      <Chip
                                                        key="self-preselected"
                                                        size="small"
                                                        color="info"
                                                        variant="outlined"
                                                        label={selfOption.full_name}
                                                        disabled
                                                      />
                                                    );
                                                  }
                                                  value.forEach((option, index) => {
                                                    tags.push(
                                                      <Chip
                                                        {...getTagProps({ index })}
                                                        key={option.id}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                        label={option.full_name || option.username}
                                                      />
                                                    );
                                                  });
                                                  return tags;
                                                }}
                                                renderOption={(props, option, { selected }) => {
                                                  const isSelfOption = Boolean(option.__self);
                                                  const alreadySent = Boolean(
                                                    blockedMemberIdsByCoursework[String(coursework.id)]?.has(Number(option.id))
                                                  );
                                                  return (
                                                    <li
                                                      {...props}
                                                      style={{
                                                        ...props.style,
                                                        backgroundColor: (selected || isSelfOption) ? "rgba(25, 118, 210, 0.10)" : props.style?.backgroundColor,
                                                        borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                                                      }}
                                                    >
                                                      <Checkbox
                                                        size="small"
                                                        checked={isSelfOption ? true : selected}
                                                        disabled={alreadySent || isSelfOption}
                                                        sx={{ mr: 0.6, p: 0.3 }}
                                                      />
                                                      <Box sx={{ py: 0.25 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: (selected || isSelfOption) ? 700 : 600 }}>
                                                          {option.full_name || option.username}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                          {isSelfOption
                                                            ? "You (pre-selected)"
                                                            : alreadySent
                                                            ? "Already sent"
                                                            : (option.student_id || option.username)}
                                                        </Typography>
                                                      </Box>
                                                    </li>
                                                  );
                                                }}
                                                renderInput={(params) => (
                                                  <TextField
                                                    {...params}
                                                    label="New Members"
                                                    placeholder="Search and select members"
                                                    helperText={`Selected: ${request.newMemberIds.length}${additionalLimit !== null ? ` / ${additionalLimit}` : ""}`}
                                                  />
                                                )}
                                                sx={{
                                                  "& .MuiOutlinedInput-root": {
                                                    minHeight: 44,
                                                    alignItems: "flex-start",
                                                  },
                                                  "& .MuiAutocomplete-tag": {
                                                    mt: 0.35,
                                                    mb: 0.1,
                                                  },
                                                }}
                                              />
                                            )}
                                            {!request.selectedGroup && blockedStudentsForCoursework.length > 0 && (
                                              <Alert severity="warning">
                                                {blockedStudentsForCoursework.length} student(s) already have a request in this assessment and are disabled in the list.
                                              </Alert>
                                            )}
                                            <Alert severity="info">
                                              You are included by default. Max members: {coursework.max_group_members || "N/A"}.
                                              {additionalLimit !== null ? ` You can pick ${additionalLimit} additional member(s).` : ""}
                                            </Alert>
                                          </Fragment>
                                        )}
                                        <Button variant="contained" onClick={() => handleSendRequest(coursework)}>
                                          Send Request
                                        </Button>
                                      </Stack>
                                    </Paper>
                                  ) : (
                                    <Paper variant="outlined" sx={{ p: 1, borderColor: "#cfe8d8", bgcolor: "#f7fbf8" }}>
                                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.7 }}>Current Submission Status</Typography>
                                      <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} alignItems={{ md: "center" }}>
                                        <Chip size="small" color={getSubmissionStageMeta(submission).color} label={getSubmissionStageMeta(submission).label} />
                                        <Chip size="small" label={`Approval: ${submission.approval_status || "pending"}`} />
                                        <Chip size="small" label={`File: ${hasUploadedFiles(submission) ? "Uploaded" : "Not Uploaded"}`} />
                                        <Chip
                                          size="small"
                                          label={
                                            submission.is_marked
                                              ? `Marked (${formatMarks(submission.obtained_marks)}/${formatMarks(coursework?.max_marks)})`
                                              : "Not Marked"
                                          }
                                        />
                                        <Chip size="small" color="secondary" label={`Submitted By: ${submission.submitted_by_name || "-"}`} />
                                        <Chip
                                          size="small"
                                          color="secondary"
                                          variant="outlined"
                                          label={`Last File Updated By: ${submission.last_file_updated_by_name || "-"}`}
                                        />
                                        <Chip
                                          size="small"
                                          variant="outlined"
                                          label={`Last File Updated: ${submission.last_file_updated_at ? formatDate(submission.last_file_updated_at) : "-"}`}
                                        />
                                      </Stack>
                                      <Stack spacing={0.8} sx={{ mt: 1 }}>
                                        <Typography variant="body2"><strong>Topic:</strong> {submission.topic || "-"}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>Members</Typography>
                                        {membersLoadingBySubmission[submission.id] ? (
                                          <Typography variant="body2" color="text.secondary">Loading members...</Typography>
                                        ) : (
                                          <StudentMemberList members={membersBySubmission[submission.id] || []} compact />
                                        )}
                                      </Stack>
                                      {!submission.is_marked && (
                                        <Paper variant="outlined" sx={{ mt: 1, p: 1, borderColor: "#bfdbfe", bgcolor: "#f8fbff" }}>
                                          <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} alignItems={{ md: "center" }} sx={{ mb: 0.8 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                                              Edit Topic / Group Request
                                            </Typography>
                                            <Button
                                              size="small"
                                              variant={editingRequestByCoursework[String(coursework.id)] ? "contained" : "outlined"}
                                              onClick={() => {
                                                const key = String(coursework.id);
                                                const nextOpen = !editingRequestByCoursework[key];
                                                if (nextOpen) {
                                                  updateRequestState(coursework.id, buildRequestStateFromSubmission(submission));
                                                }
                                                setEditingRequestByCoursework((prev) => ({
                                                  ...prev,
                                                  [key]: nextOpen,
                                                }));
                                              }}
                                            >
                                              {editingRequestByCoursework[String(coursework.id)] ? "Close Edit" : "Edit Request"}
                                            </Button>
                                          </Stack>
                                          <Collapse in={Boolean(editingRequestByCoursework[String(coursework.id)])} timeout="auto" unmountOnExit>
                                            <Stack spacing={0.9}>
                                              <Stack direction={{ xs: "column", md: "row" }} spacing={0.7}>
                                                <Chip
                                                  size="small"
                                                  color="info"
                                                  variant="outlined"
                                                  label={`Topic: ${String(request.topic || "").trim() || "-"}`}
                                                />
                                                <Chip
                                                  size="small"
                                                  color={request.selectedGroup ? "primary" : "default"}
                                                  variant="outlined"
                                                  label={`Group: ${request.selectedGroup ? (selectedGroupObj?.name || "Selected Group") : "Not selected"}`}
                                                />
                                                <Chip
                                                  size="small"
                                                  color="secondary"
                                                  variant="outlined"
                                                  label={`Members: ${selectedMemberCount}`}
                                                />
                                              </Stack>
                                              <TextField
                                                size="small"
                                                label="Topic"
                                                value={request.topic}
                                                onChange={(e) => updateRequestState(coursework.id, { topic: e.target.value })}
                                              />
                                              {allowsGroup(coursework) && (
                                                <FormControl size="small">
                                                  <InputLabel id={`edit-existing-group-${coursework.id}`}>Existing Group</InputLabel>
                                                  <Select
                                                    labelId={`edit-existing-group-${coursework.id}`}
                                                    label="Existing Group"
                                                    value={request.selectedGroup}
                                                    onChange={(e) =>
                                                      updateRequestState(coursework.id, { selectedGroup: e.target.value, newMemberIds: [] })
                                                    }
                                                  >
                                                    <MenuItem value="">
                                                      <em>Select Group</em>
                                                    </MenuItem>
                                                    {groups.map((group) => (
                                                      <MenuItem key={group.id} value={String(group.id)}>{group.name}</MenuItem>
                                                    ))}
                                                  </Select>
                                                </FormControl>
                                              )}
                                              {!request.selectedGroup && allowsGroup(coursework) && (
                                                <Autocomplete
                                                  multiple
                                                  size="small"
                                                  options={selectableStudents}
                                                  value={selectableStudents.filter((student) => request.newMemberIds.includes(student.id))}
                                                  disableCloseOnSelect
                                                  fullWidth
                                                  getOptionLabel={(option) => option.full_name || option.username || String(option.id)}
                                                  isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
                                                  onChange={(_, selectedOptions) => {
                                                    const next = selectedOptions.map((option) => Number(option.id));
                                                    if (additionalLimit !== null && next.length > additionalLimit) {
                                                      notify(`Only ${additionalLimit} additional member(s) allowed`, "warning");
                                                      return;
                                                    }
                                                    updateRequestState(coursework.id, { newMemberIds: next });
                                                  }}
                                                  ListboxProps={{ style: { maxHeight: 250 } }}
                                                  renderInput={(params) => (
                                                    <TextField {...params} label="New Members" placeholder="Search and select members" />
                                                  )}
                                                />
                                              )}
                                              <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => handleUpdateRequest(coursework, submission)}
                                              >
                                                Save Request Changes
                                              </Button>
                                            </Stack>
                                          </Collapse>
                                        </Paper>
                                      )}
                                      <Stack direction={{ xs: "column", md: "row" }} spacing={0.8} sx={{ mt: 1 }}>
                                        {canUpload ? (
                                          <Fragment>
                                            <TextField
                                              type="file"
                                              size="small"
                                              inputProps={{ accept: ".pdf,.docx,.zip,.pptx", multiple: true }}
                                              onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                setRowFiles((prev) => ({ ...prev, [submission.id]: files }));
                                              }}
                                            />
                                            <Button
                                              size="small"
                                              variant="contained"
                                              disabled={!rowFiles[submission.id]?.length || rowUploading[submission.id]}
                                              onClick={() => uploadSingleRow(submission)}
                                            >
                                              {rowUploading[submission.id] ? "Uploading..." : "Upload Files"}
                                            </Button>
                                            {!!rowFiles[submission.id]?.length && (
                                              <Chip size="small" variant="outlined" label={`Selected: ${rowFiles[submission.id].length}`} />
                                            )}
                                          </Fragment>
                                        ) : (
                                          <Chip
                                            size="small"
                                            variant="outlined"
                                            label={isSubmissionDueLocked(coursework) ? "Due-time locked" : "Upload unavailable"}
                                          />
                                        )}
                                        {(submission.approval_status === "pending" || submission.approval_status === "rejected") && (
                                          <Button size="small" color="error" onClick={() => remove(submission.id)}>
                                            Delete Request
                                          </Button>
                                        )}
                                      </Stack>
                                      <Stack spacing={0.6} sx={{ mt: 0.8 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                          Uploaded Files
                                        </Typography>
                                        {getSubmissionFiles(submission).length ? (
                                          getSubmissionFiles(submission).map((fileItem) => {
                                            const fileUrl = toAbsoluteMediaUrl(fileItem.file);
                                            const deleteKey = `${submission.id}-${fileItem.id}`;
                                            return (
                                              <Stack
                                                key={fileItem.id}
                                                direction={{ xs: "column", md: "row" }}
                                                spacing={0.8}
                                                alignItems={{ md: "center" }}
                                              >
                                                <Typography variant="caption" sx={{ flex: 1 }}>
                                                  {fileItem.file_name || `File #${fileItem.id}`}
                                                </Typography>
                                                <Button
                                                  size="small"
                                                  onClick={() => fileUrl && window.open(fileUrl, "_blank", "noopener,noreferrer")}
                                                  disabled={!fileUrl}
                                                >
                                                  Preview
                                                </Button>
                                                <Button
                                                  size="small"
                                                  color="error"
                                                  disabled={!canUpload || fileItem.is_legacy || rowFileDeleting[deleteKey]}
                                                  onClick={() => !fileItem.is_legacy && deleteSubmissionFile(submission, fileItem.id)}
                                                >
                                                  {fileItem.is_legacy ? "Delete N/A" : rowFileDeleting[deleteKey] ? "Deleting..." : "Delete"}
                                                </Button>
                                              </Stack>
                                            );
                                          })
                                        ) : (
                                          <Typography variant="caption" color="text.secondary">
                                            No uploaded files yet.
                                          </Typography>
                                        )}
                                      </Stack>
                                    </Paper>
                                  )}
                                </Stack>
                              </Collapse>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Collapse>
                  </Paper>
                    );
                  })}
                  {!section.grouped.length && (
                    <Typography variant="body2" color="text.secondary">No assessment found.</Typography>
                  )}
                </Stack>
              </Paper>
            );
          })()}
        </Box>
      </Paper>
    </Stack>
  );
};

export default SubmitWorkPage;
