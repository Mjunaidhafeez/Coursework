import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

import api from "../../api/client";
import AssessmentRequestFields from "../../components/shared/AssessmentRequestFields";
import CompactTabs from "../../components/shared/CompactTabs";
import ListingPage from "../../components/shared/ListingPage";
import SearchToolbar from "../../components/shared/SearchToolbar";
import StudentMemberList from "../../components/shared/StudentMemberList";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import { extractApiErrorMessage } from "../../utils/apiErrors";
import { COURSEWORK_TYPE_OPTIONS, SUBMISSION_TYPE_OPTIONS } from "../../utils/courseworkOptions";
import { shouldAllotTopics } from "../../utils/courseworkForm";
import { formatDate, formatMarks } from "../../utils/format";
import { openSubmissionFilePreview } from "../../utils/submissionFiles";
import { shallowEqualObjects } from "../../utils/object";
import { resolveSubmissionMembers, withMemberFileActivity } from "../../utils/submissionMembers";
import MultiFilePicker from "../../components/shared/MultiFilePicker";
import { getSubmissionStageMeta, studentNextStep } from "../../utils/submissionWorkflow";
import { oversizedFileNames } from "../../utils/uploadLimits";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";

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
  const [renamingFile, setRenamingFile] = useState(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
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
      const isMine = String(submission.student) === String(user?.id);
      const prevMine = String(prev.student) === String(user?.id);
      if (isMine && !prevMine) {
        map[key] = submission;
        return;
      }
      if (prevMine && !isMine) return;
      const prevTs = new Date(prev.updated_at || prev.submitted_at || prev.created_at || 0).getTime();
      const currTs = new Date(submission.updated_at || submission.submitted_at || submission.created_at || 0).getTime();
      if (currTs >= prevTs) {
        map[key] = submission;
      }
    });
    return map;
  }, [submissions, user?.id]);
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
  const assessmentMetaLine = (coursework) => {
    const type = COURSEWORK_TYPE_OPTIONS.find((option) => option.value === coursework.coursework_type)?.label
      || coursework.coursework_type
      || "Assessment";
    const mode = SUBMISSION_TYPE_OPTIONS.find((option) => option.value === coursework.submission_type)?.label
      || coursework.submission_type
      || "Individual";
    const teachers = (coursework.teacher_names || []).join(", ") || "—";
    return `${type} · ${mode} · Due ${formatDate(coursework.deadline)} · ${teachers}`;
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
    const tooBig = oversizedFileNames(files);
    if (tooBig.length) {
      notify(`${tooBig.join(", ")} is larger than 25 MB`, "error");
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

  const renameSubmissionFile = async () => {
    if (!renamingFile?.submission?.id || !renamingFile?.fileItem?.id) return;
    const nextTitle = renameTitle.trim();
    if (!nextTitle) {
      notify("File name is required", "error");
      return;
    }
    setRenameSaving(true);
    try {
      await api.post(`${ENDPOINTS.submissions}${renamingFile.submission.id}/rename_file/`, {
        file_id: renamingFile.fileItem.id,
        title: nextTitle,
      });
      notify("File name updated");
      setRenamingFile(null);
      await loadData();
    } catch (err) {
      notify(extractApiErrorMessage(err), "error");
    } finally {
      setRenameSaving(false);
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
    <>
    <ListingPage
      title="Submit Work"
      tabs={(
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <CompactTabs
            value={viewMode}
            onChange={setViewMode}
            tabs={[
              { value: "opening", label: `Open (${openingRows.length})` },
              { value: "closed", label: `Closed (${closedRows.length})` },
            ]}
          />
          {message && <Alert severity="success">{message}</Alert>}
        </Stack>
      )}
      filters={(
        <SearchToolbar
          label="Search"
          search={search}
          onSearchChange={setSearch}
          live
          onReset={() => {
            setSearch("");
            setSemesterFilter("");
            setCourseFilter("");
            setTeacherFilter("");
            setCourseworkTypeFilter("");
            setSubmissionModeFilter("");
          }}
          filters={(
            <>
              <FormControl size="small" sx={{ minWidth: 120 }}>
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
              <FormControl size="small" sx={{ minWidth: 150 }}>
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
              <FormControl size="small" sx={{ minWidth: 140 }}>
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
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="coursework-type-filter-label">Type</InputLabel>
                <Select
                  labelId="coursework-type-filter-label"
                  label="Type"
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
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel id="submission-mode-filter-label">Mode</InputLabel>
                <Select
                  labelId="submission-mode-filter-label"
                  label="Mode"
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
            </>
          )}
        />
      )}
    >
        <Box>
          <Alert severity="info" sx={{ mb: 1.2, py: 0.4 }}>
            1. Open an assessment · 2. Send a topic request or wait for allotment · 3. After approval, upload files · 4. See marks in Course Result
          </Alert>
          {(() => {
            const section = viewMode === "opening"
              ? { key: "opening", title: "Open assessments", grouped: openingGrouped, tone: "#f8fbff", border: "#dbeafe" }
              : { key: "closed", title: "Closed assessments", grouped: closedGrouped, tone: "#fff8f0", border: "#ffe0b2" };
            const isClosedView = section.key === "closed";
            return (
              <Box sx={{ p: 1.2, bgcolor: section.tone, border: "1px solid", borderColor: section.border, borderRadius: 2, maxHeight: "70vh", overflowY: "auto" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.2 }}>{section.title}</Typography>
                <Stack spacing={1.4}>
                  {section.grouped.map(([courseTitle, items]) => {
                    const courseKey = `${section.key}-${courseTitle}`;
                    return (
                      <Box key={`${section.title}-${courseTitle}`} sx={{ p: 1.1, borderRadius: 1.5, bgcolor: "#fff", border: "1px solid #dbeafe" }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "#13377a" }}>{courseTitle}</Typography>
                          <IconButton size="small" onClick={() => toggleCourseSection(courseKey)}>
                            {openCourseSections[courseKey] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                          </IconButton>
                        </Stack>
                        <Collapse in={Boolean(openCourseSections[courseKey])} timeout="auto" unmountOnExit>
                          <Stack spacing={1} sx={{ mt: 1 }}>
                            {items.map((coursework) => {
                              const submission = submissionByCoursework[String(coursework.id)];
                              const request = getRequestState(coursework.id);
                              const additionalLimit = maxAdditionalAllowed(coursework);
                              const canUpload = submission ? canUploadForSubmission(submission) : false;
                              const blockedIdsForCoursework = blockedMemberIdsByCoursework[String(coursework.id)] || new Set();
                              const blockedStudentsForCoursework = selectableStudents.filter((student) =>
                                blockedIdsForCoursework.has(Number(student.id))
                              );
                              const selfOption = user
                                ? {
                                    id: Number(user.id),
                                    full_name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Me",
                                    username: user.username || "me",
                                    student_id: "You (pre-selected)",
                                    __self: true,
                                  }
                                : null;
                              const memberOptions = selfOption ? [selfOption, ...selectableStudents] : selectableStudents;
                              const stage = submission ? getSubmissionStageMeta(submission) : null;
                              const requestFields = (
                                <AssessmentRequestFields
                                  courseworkId={coursework.id}
                                  topic={request.topic}
                                  onTopicChange={(topic) => updateRequestState(coursework.id, { topic })}
                                  allowsGroup={allowsGroup(coursework)}
                                  groups={groups}
                                  selectedGroup={request.selectedGroup}
                                  onGroupChange={(selectedGroup) => updateRequestState(coursework.id, { selectedGroup, newMemberIds: [] })}
                                  memberOptions={memberOptions}
                                  selectedMemberIds={request.newMemberIds || []}
                                  onMembersChange={(newMemberIds) => updateRequestState(coursework.id, { newMemberIds })}
                                  blockedIds={blockedIdsForCoursework}
                                  blockedStudents={blockedStudentsForCoursework}
                                  additionalLimit={additionalLimit}
                                  selfOption={selfOption}
                                  notify={notify}
                                />
                              );
                              return (
                                <Box key={coursework.id} sx={{ p: 1.2, borderRadius: 1.5, border: "1px solid #e2e8f0", bgcolor: "#fcfdff" }}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                    <Button
                                      size="small"
                                      variant="text"
                                      onClick={() => toggleCourseworkSection(coursework, submission)}
                                      sx={{ textTransform: "none", fontWeight: 800, p: 0, color: "#16356f" }}
                                    >
                                      {coursework.title}
                                    </Button>
                                    <Chip
                                      size="small"
                                      label={stage?.label || (shouldAllotTopics(coursework) ? "Waiting" : "Send request")}
                                      sx={{
                                        height: 22,
                                        fontWeight: 700,
                                        bgcolor: stage?.bgcolor || "#e2e8f0",
                                        color: stage?.color || "#334155",
                                      }}
                                    />
                                    <IconButton size="small" onClick={() => toggleCourseworkSection(coursework, submission)}>
                                      {openCourseworkSections[String(coursework.id)] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                                    </IconButton>
                                  </Stack>
                                  <Collapse in={Boolean(openCourseworkSections[String(coursework.id)])} timeout="auto" unmountOnExit>
                                    <Stack spacing={1.2} sx={{ mt: 1 }}>
                                      <Typography variant="caption" color="text.secondary">
                                        {assessmentMetaLine(coursework)}
                                        {shouldAllotTopics(coursework) ? " · Teacher allots the topic" : ""}
                                      </Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 700, color: "#1d4ed8" }}>
                                        {studentNextStep(submission, {
                                          teacherAllots: shouldAllotTopics(coursework),
                                          dueLocked: isSubmissionDueLocked(coursework),
                                        })}
                                      </Typography>
                                      {coursework.sample_file_url ? (
                                        <Button
                                          size="small"
                                          variant="text"
                                          href={toAbsoluteMediaUrl(coursework.sample_file_url)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          sx={{ alignSelf: "flex-start", px: 0, textTransform: "none" }}
                                        >
                                          {coursework.sample_file_name ? `Sample: ${coursework.sample_file_name}` : "View sample file"}
                                        </Button>
                                      ) : null}
                                      {!submission && isClosedView ? (
                                        <Typography variant="body2" color="text.secondary">
                                          Deadline passed. No request was sent for this assessment.
                                        </Typography>
                                      ) : !submission && shouldAllotTopics(coursework) ? (
                                        <Box sx={{ p: 1.1, borderRadius: 1.2, bgcolor: "#f8fbff", border: "1px solid #dbeafe" }}>
                                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                                            Waiting for your teacher to allot a topic
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            {coursework.topic_source === "teacher_group"
                                              ? "Your teacher will give each group a topic. After that you can upload your work here."
                                              : "Your teacher will give each student a topic. After that you can upload your work here."}
                                          </Typography>
                                        </Box>
                                      ) : !submission ? (
                                        <Box sx={{ p: 1.2, borderRadius: 1.2, bgcolor: "#f8fbff", border: "1px solid #dbeafe" }}>
                                          <Typography variant="body2" sx={{ fontWeight: 800, mb: 1 }}>Send request</Typography>
                                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                            Add the topic{allowsGroup(coursework) ? ", then pick a group or members" : ""}. You are included by default
                                            {coursework.max_group_members ? ` · max ${coursework.max_group_members} members` : ""}.
                                          </Typography>
                                          {requestFields}
                                          <Button variant="contained" sx={{ mt: 1.1 }} onClick={() => handleSendRequest(coursework)}>
                                            Send request
                                          </Button>
                                        </Box>
                                      ) : (
                                        <Stack spacing={1.2}>
                                          <Box sx={{ p: 1.2, borderRadius: 1.2, bgcolor: "#f7fbf8", border: "1px solid #cfe8d8" }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800, mb: 0.6 }}>Submission</Typography>
                                            <Typography variant="body2"><strong>Topic:</strong> {submission.topic || "—"}</Typography>
                                            <Typography variant="body2" sx={{ mt: 0.3 }}>
                                              <strong>Status:</strong> {stage?.label || "Waiting"}
                                              {" · "}
                                              {hasUploadedFiles(submission) ? "File sent" : "No file yet"}
                                              {" · "}
                                              {submission.is_marked
                                                ? `Marked ${formatMarks(submission.obtained_marks)}/${formatMarks(coursework?.max_marks)}`
                                                : "Not marked"}
                                            </Typography>
                                            {submission.last_file_updated_at ? (
                                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.4 }}>
                                                Last file update {formatDate(submission.last_file_updated_at)}
                                                {submission.last_file_updated_by_name ? ` by ${submission.last_file_updated_by_name}` : ""}
                                              </Typography>
                                            ) : null}
                                            <Box sx={{ mt: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>Members</Typography>
                                              {membersLoadingBySubmission[submission.id] ? (
                                                <Typography variant="body2" color="text.secondary">Loading members...</Typography>
                                              ) : (
                                                <StudentMemberList
                                                  members={withMemberFileActivity(
                                                    membersBySubmission[submission.id] || [],
                                                    submission.submitted_files || [],
                                                    submission.student
                                                  )}
                                                  compact
                                                />
                                              )}
                                            </Box>
                                            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
                                              {!submission.is_marked && !shouldAllotTopics(coursework) ? (
                                                <Button
                                                  size="small"
                                                  variant={editingRequestByCoursework[String(coursework.id)] ? "contained" : "outlined"}
                                                  onClick={() => {
                                                    const key = String(coursework.id);
                                                    const nextOpen = !editingRequestByCoursework[key];
                                                    if (nextOpen) {
                                                      updateRequestState(coursework.id, buildRequestStateFromSubmission(submission));
                                                    }
                                                    setEditingRequestByCoursework((prev) => ({ ...prev, [key]: nextOpen }));
                                                  }}
                                                >
                                                  {editingRequestByCoursework[String(coursework.id)] ? "Close edit" : "Edit request"}
                                                </Button>
                                              ) : null}
                                              {(submission.approval_status === "pending" || submission.approval_status === "rejected") ? (
                                                <Button size="small" color="error" onClick={() => remove(submission.id)}>
                                                  Delete request
                                                </Button>
                                              ) : null}
                                            </Stack>
                                            <Collapse in={Boolean(editingRequestByCoursework[String(coursework.id)])} timeout="auto" unmountOnExit>
                                              <Box sx={{ mt: 1 }}>
                                                {requestFields}
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  sx={{ mt: 1 }}
                                                  onClick={() => handleUpdateRequest(coursework, submission)}
                                                >
                                                  Save request
                                                </Button>
                                              </Box>
                                            </Collapse>
                                          </Box>
                                          <Box sx={{ p: 1.2, borderRadius: 1.2, border: "1px dashed #93c5fd", bgcolor: "#f8fbff" }}>
                                            <Typography variant="body2" sx={{ fontWeight: 800 }}>Upload work</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                              Select multiple PDF, DOCX, ZIP or PPTX files at once. Max 25 MB each.
                                            </Typography>
                                            {canUpload ? (
                                              <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ sm: "center" }} useFlexGap flexWrap="wrap">
                                                <MultiFilePicker
                                                  accept=".pdf,.docx,.zip,.pptx"
                                                  files={rowFiles[submission.id] || []}
                                                  onChange={(files) => {
                                                    const tooBig = oversizedFileNames(files);
                                                    if (tooBig.length) {
                                                      notify(`${tooBig.join(", ")} is larger than 25 MB`, "error");
                                                      return;
                                                    }
                                                    setRowFiles((prev) => ({ ...prev, [submission.id]: files }));
                                                  }}
                                                />
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  disabled={!rowFiles[submission.id]?.length || rowUploading[submission.id]}
                                                  onClick={() => uploadSingleRow(submission)}
                                                >
                                                  {rowUploading[submission.id] ? "Uploading..." : "Upload"}
                                                </Button>
                                              </Stack>
                                            ) : (
                                              <Typography variant="body2" color="text.secondary">
                                                {isSubmissionDueLocked(coursework)
                                                  ? "Upload is locked because the due time has passed."
                                                  : stage?.key === "rejected"
                                                    ? "This request was rejected. Edit it and send again."
                                                    : stage?.key === "pending"
                                                      ? "Waiting for teacher approval. Upload opens after approval."
                                                      : "Upload opens after the teacher approves this request."}
                                              </Typography>
                                            )}
                                            <Stack spacing={0.6} sx={{ mt: 1 }}>
                                              <Typography variant="body2" sx={{ fontWeight: 700 }}>Files</Typography>
                                              {getSubmissionFiles(submission).length ? (
                                                getSubmissionFiles(submission).map((fileItem) => {
                                                  const deleteKey = `${submission.id}-${fileItem.id}`;
                                                  return (
                                                    <Stack
                                                      key={fileItem.id}
                                                      direction={{ xs: "column", sm: "row" }}
                                                      spacing={0.8}
                                                      alignItems={{ sm: "center" }}
                                                    >
                                                      <Typography variant="body2" sx={{ flex: 1 }}>
                                                        {fileItem.file_name || `File #${fileItem.id}`}
                                                        {fileItem.uploaded_by_name ? (
                                                          <Typography component="span" variant="caption" color="text.secondary">
                                                            {` · ${fileItem.uploaded_by_name}`}
                                                          </Typography>
                                                        ) : null}
                                                      </Typography>
                                                      <Button
                                                        size="small"
                                                        disabled={!canUpload || fileItem.is_legacy}
                                                        onClick={() => {
                                                          setRenamingFile({ submission, fileItem });
                                                          setRenameTitle(fileItem.title || fileItem.file_name || "");
                                                        }}
                                                      >
                                                        Rename
                                                      </Button>
                                                      <Button
                                                        size="small"
                                                        onClick={() => openSubmissionFilePreview(submission, notify, fileItem)}
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
                                                <Typography variant="caption" color="text.secondary">No files uploaded yet.</Typography>
                                              )}
                                            </Stack>
                                          </Box>
                                        </Stack>
                                      )}
                                    </Stack>
                                  </Collapse>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Collapse>
                      </Box>
                    );
                  })}
                  {!section.grouped.length && (
                    <Typography variant="body2" color="text.secondary">No assessment found.</Typography>
                  )}
                </Stack>
              </Box>
            );
          })()}
        </Box>
    </ListingPage>
    <Dialog open={Boolean(renamingFile)} onClose={() => setRenamingFile(null)} maxWidth="xs" fullWidth>
      <DialogTitle>Edit file name</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label="File name"
          value={renameTitle}
          onChange={(e) => setRenameTitle(e.target.value)}
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setRenamingFile(null)} disabled={renameSaving}>Cancel</Button>
        <Button variant="contained" onClick={renameSubmissionFile} disabled={renameSaving}>
          {renameSaving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default SubmitWorkPage;
