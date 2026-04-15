import {
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/client";
import PaginationControls from "../../components/PaginationControls";
import ModuleHero from "../../components/shared/ModuleHero";
import SearchToolbar from "../../components/shared/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useUi } from "../../context/UiContext";
import { ENDPOINTS } from "../../api/endpoints";
import usePaginatedQuery from "../../hooks/usePaginatedQuery";
import { fetchFeedbackBySubmissionMap } from "../../utils/feedback";
import { formatDate, formatMarks } from "../../utils/format";
import { shallowEqualObjects } from "../../utils/object";
import { downloadSubmissionFile, openSubmissionFilePreview } from "../../utils/submissionFiles";
import { resolveSubmissionMembers } from "../../utils/submissionMembers";
import { getSubmissionStageMeta } from "../../utils/submissionWorkflow";
import { getSubmissionStatusColor, SUBMISSION_STATUS_OPTIONS } from "../../utils/submissionOptions";
import { csvSafe, downloadTextFile, fileSafe } from "../../utils/export";
import { confirmDelete } from "../../utils/confirm";

const WORKFLOW_FILTER_OPTIONS = [
  { value: "", label: "All Workflow States" },
  { value: "topic_not_submitted", label: "Not Submitted" },
  { value: "request_pending", label: "Request Pending" },
  { value: "request_rejected", label: "Request Rejected" },
  { value: "ready_for_upload", label: "Ready For Upload" },
  { value: "file_submitted", label: "File Submitted" },
  { value: "marked", label: "Marked" },
];

const SubmissionsPage = () => {
  const { user } = useAuth();
  const { notify } = useUi();
  const isAdminApprovalsView = user?.role === "super_admin";
  const [statusFilter, setStatusFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("request_pending");
  const [courseworksMeta, setCourseworksMeta] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [groupsById, setGroupsById] = useState({});
  const [submissionIndexRows, setSubmissionIndexRows] = useState([]);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [memberDialogTitle, setMemberDialogTitle] = useState("");
  const [memberDialogItems, setMemberDialogItems] = useState([]);
  const [memberDialogCourseworkId, setMemberDialogCourseworkId] = useState("");
  const [feedbackBySubmission, setFeedbackBySubmission] = useState({});
  const [feedbackDraftBySubmission, setFeedbackDraftBySubmission] = useState({});
  const [feedbackSavingBySubmission, setFeedbackSavingBySubmission] = useState({});
  const [openCourses, setOpenCourses] = useState({});
  const [openCourseworks, setOpenCourseworks] = useState({});
  const [openGroupRows, setOpenGroupRows] = useState({});
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState({});
  const [bulkMarks, setBulkMarks] = useState("");
  const [bulkFeedback, setBulkFeedback] = useState("");
  const [bulkSavingMarks, setBulkSavingMarks] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const bulkApproveLockRef = useRef(false);
  const bulkSaveLockRef = useRef(false);
  const bulkDeleteLockRef = useRef(false);
  const resultsSectionRef = useRef(null);
  const hasMountedRef = useRef(false);
  const [workflowCounts, setWorkflowCounts] = useState({
    request_pending: 0,
    ready_for_upload: 0,
    file_submitted: 0,
    marked: 0,
    request_rejected: 0,
  });

  const queryFn = async ({ search, page, pageSize }) => {
    const params = new URLSearchParams();
    params.append("ordering", "submitted_at");
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);
    if (workflowFilter && workflowFilter !== "topic_not_submitted") params.append("workflow_state", workflowFilter);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
    return data;
  };

  const { rows, total, search, setSearch, page, pageSize, loading, runSearch, resetSearch, changePage, changePageSize, setRows, loadData } =
    usePaginatedQuery({ queryFn, dependencies: [statusFilter, workflowFilter] });

  const courseworkById = useMemo(() => {
    const map = {};
    courseworksMeta.forEach((item) => {
      map[String(item.id)] = item;
    });
    return map;
  }, [courseworksMeta]);

  const loadFeedbackMap = async () => {
    setFeedbackBySubmission(await fetchFeedbackBySubmissionMap(api, ENDPOINTS, 2000));
  };

  const loadWorkflowCounts = async () => {
    const states = ["request_pending", "ready_for_upload", "file_submitted", "marked", "request_rejected"];
    const results = await Promise.all(
      states.map(async (state) => {
        const params = new URLSearchParams();
        params.append("workflow_state", state);
        if (statusFilter) params.append("status", statusFilter);
        params.append("page", "1");
        params.append("page_size", "1");
        const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
        return { state, count: data.count || 0 };
      })
    );
    const next = {
      request_pending: 0,
      ready_for_upload: 0,
      file_submitted: 0,
      marked: 0,
      request_rejected: 0,
    };
    results.forEach(({ state, count }) => {
      next[state] = count;
    });
    setWorkflowCounts(next);
  };

  const loadSubmissionIndexRows = async () => {
    const params = new URLSearchParams();
    params.append("ordering", "submitted_at");
    if (statusFilter) params.append("status", statusFilter);
    params.append("page", "1");
    params.append("page_size", "3000");
    const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
    setSubmissionIndexRows(data.results || []);
  };

  useEffect(() => {
    const loadMeta = async () => {
      const [cwRes, courseRes, groupsRes] = await Promise.all([
        api.get(`${ENDPOINTS.courseworks}?page_size=300`),
        api.get(`${ENDPOINTS.courses}?page_size=300`),
        api.get(`${ENDPOINTS.groups}?page_size=2000&ordering=name`),
      ]);
      setCourseworksMeta(cwRes.data.results || []);
      setCourses(courseRes.data.results || []);
      const groupMap = {};
      (groupsRes.data.results || []).forEach((group) => {
        groupMap[String(group.id)] = group;
      });
      setGroupsById(groupMap);
      const enrollmentsRes = await api.get(`${ENDPOINTS.enrollments}?page_size=2000`);
      setEnrollments(enrollmentsRes.data.results || []);
      await Promise.all([loadFeedbackMap(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    };
    loadMeta();
  }, [statusFilter]);

  const remove = async (id) => {
    if (isAdminApprovalsView && !confirmDelete("record")) {
      return;
    }
    const prev = rows;
    setRows((curr) => curr.filter((row) => row.id !== id));
    try {
      await api.delete(`${ENDPOINTS.submissions}${id}/`);
      notify("Submission deleted");
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      setRows(prev);
      notify("Delete failed", "error");
    }
  };

  const getPrimarySubmissionId = (submission) => submission?.submission_id || submission?.id;

  const resolveActionScope = (submission) => (submission?.group && !submission?.is_topic_not_submitted ? "group" : "single");
  const resolveRowSaveScope = (submission) => {
    const isGroupRow = Boolean(submission?.group) && !submission?.force_individual_row;
    const isCollaborativeRequestRow =
      !submission?.group &&
      !submission?.force_individual_row &&
      (
        (submission?.requested_member_ids || []).length > 0 ||
        (submission?.requested_member_details || []).length > 0 ||
        (submission?.requested_member_names || []).length > 0
      );
    return workflowFilter === "marked" ? "single" : (isGroupRow || isCollaborativeRequestRow ? "group" : "single");
  };
  const canApproveSubmission = (submission) =>
    !submission?.is_topic_not_submitted && !submission?.is_marked && submission?.approval_status !== "approved";
  const canBulkMarkSubmission = (submission) =>
    !submission?.is_topic_not_submitted &&
    String(submission?.approval_status || "").toLowerCase() === "approved" &&
    Boolean(getPrimarySubmissionId(submission));
  const canBulkDeleteSubmission = (submission) =>
    isAdminApprovalsView &&
    !submission?.is_topic_not_submitted &&
    ["ready_for_upload", "file_submitted", "marked"].includes(workflowFilter) &&
    Boolean(getPrimarySubmissionId(submission));
  const canSelectSubmission = (submission) =>
    canApproveSubmission(submission) || canBulkMarkSubmission(submission) || canBulkDeleteSubmission(submission);

  const approve = async (submission) => {
    const submissionId = getPrimarySubmissionId(submission);
    if (!submissionId || submission?.is_topic_not_submitted) {
      notify("No submission request exists for this row yet.", "warning");
      return;
    }
    const scope = resolveActionScope(submission);
    try {
      await api.post(`${ENDPOINTS.submissions}${submissionId}/approve/`, null, { params: { scope } });
      notify(scope === "group" ? "Group submissions approved" : "Submission approved");
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      notify("Approve failed", "error");
    }
  };

  const reject = async (submission) => {
    const submissionId = getPrimarySubmissionId(submission);
    if (!submissionId || submission?.is_topic_not_submitted) {
      notify("No submission request exists for this row yet.", "warning");
      return;
    }
    const scope = resolveActionScope(submission);
    try {
      await api.post(`${ENDPOINTS.submissions}${submissionId}/reject/`, null, { params: { scope } });
      notify(scope === "group" ? "Group submissions rejected" : "Submission rejected");
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      notify("Reject failed", "error");
    }
  };

  const toggleSelectSubmission = (submission) => {
    const submissionId = getPrimarySubmissionId(submission);
    if (!submissionId || !canSelectSubmission(submission)) return;
    const key = String(submissionId);
    setSelectedSubmissionIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openSubmissionMembers = async (submission, options = {}) => {
    try {
      if (options.singleOnly) {
        setMemberDialogItems([
          {
            id: submission?.student || submission?.id || "self",
            student_id: submission?.student || null,
            name: submission?.student_name || submission?.group_name || submission?.submitted_by_name || "-",
            roll_no: submission?.student_roll_no || "-",
            linked_submission: submission,
          },
        ]);
        setMemberDialogCourseworkId(submission?.coursework || "");
        setMemberDialogTitle(submission?.student_name || submission?.group_name || "Submission Member");
        setMemberDialogOpen(true);
        return;
      }
      const members = await resolveSubmissionMembers(api, ENDPOINTS, submission);
      const params = new URLSearchParams();
      if (submission?.coursework) params.append("coursework", String(submission.coursework));
      if (submission?.group) params.append("group", String(submission.group));
      params.append("page_size", "500");
      const relatedRows = submission?.coursework
        ? ((await api.get(`${ENDPOINTS.submissions}?${params.toString()}`)).data?.results || [])
        : [];
      const relatedByStudent = new Map(
        relatedRows
          .filter((row) => row?.student)
          .map((row) => [String(row.student), row])
      );
      const enriched = members.map((member, idx) => {
        const studentId =
          member?.student_id ??
          member?.student ??
          (typeof member?.id === "number" ? member.id : null);
        const directLinkedSubmission =
          studentId !== null && studentId !== undefined ? relatedByStudent.get(String(studentId)) : null;
        const linkedSubmission = directLinkedSubmission || submission;
        return {
          ...member,
          student_id: studentId,
          linked_submission: linkedSubmission
            ? { ...linkedSubmission, coursework: submission?.coursework, group: submission?.group || linkedSubmission?.group }
            : null,
        };
      });

      setMemberDialogItems(enriched);
      setMemberDialogCourseworkId(submission?.coursework || "");
      setMemberDialogTitle(submission.topic || submission.group_name || "Submission Members");
      setMemberDialogOpen(true);
    } catch {
      notify("Could not load submission members", "error");
    }
  };
  const closeMemberDialog = () => {
    setMemberDialogOpen(false);
  };
  const handleMemberDialogClose = (_event, reason) => {
    if (reason === "backdropClick" || reason === "escapeKeyDown") return;
    closeMemberDialog();
  };

  const openFilePreview = (submission) => openSubmissionFilePreview(submission, notify);
  const downloadFile = (submission) => downloadSubmissionFile(submission, notify);
  const normalizeMarksValue = (value) => {
    if (value === "" || value === null || value === undefined) return "";
    const numeric = Number(value);
    if (!Number.isNaN(numeric) && Number.isFinite(numeric)) {
      return String(Math.trunc(numeric));
    }
    const cleaned = String(value).replace(/[^\d]/g, "");
    return cleaned;
  };

  const getFeedbackDraft = (submission, draftKeyOverride) => {
    const submissionKey = String(getPrimarySubmissionId(submission));
    const draftKey = String(draftKeyOverride ?? submissionKey);
    const saved = feedbackBySubmission[submissionKey];
    return feedbackDraftBySubmission[draftKey] || {
      marks: normalizeMarksValue(saved?.marks ?? submission.obtained_marks ?? ""),
      feedback: saved?.feedback || "",
    };
  };

  const updateFeedbackDraft = (submissionId, patch) => {
    setFeedbackDraftBySubmission((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        ...patch,
      },
    }));
  };

  const saveFeedback = async (submission, scopeOverride, options = {}) => {
    const submissionId = getPrimarySubmissionId(submission);
    const targetStudentId = options?.targetStudentId || null;
    const shouldNotify = options?.shouldNotify !== false;
    const shouldReload = options?.shouldReload !== false;
    if (submission?.is_topic_not_submitted || !submissionId) {
      if (shouldNotify) notify("Student has not created a submission request yet", "warning");
      return false;
    }
    const draft = options?.draft || getFeedbackDraft(submission, options?.draftKey);
    if (draft.marks === "" || draft.marks === null || draft.marks === undefined) {
      if (shouldNotify) notify("Marks are required", "error");
      return false;
    }
    const numericMarks = Math.trunc(Number(draft.marks));
    if (Number.isNaN(numericMarks)) {
      if (shouldNotify) notify("Marks must be numeric", "error");
      return false;
    }
    const maxMarks = courseworkById[String(submission.coursework)]?.max_marks;
    if (Number(maxMarks) && numericMarks > Number(maxMarks)) {
      if (shouldNotify) notify(`Marks cannot exceed ${maxMarks}`, "error");
      return false;
    }
    const draftKey = String(options?.savingKey || submissionId);
    setFeedbackSavingBySubmission((prev) => ({ ...prev, [draftKey]: true }));
    try {
      let targetSubmissionIds = [submissionId];
      const marksScope = scopeOverride || (submission.group ? "group" : "single");
      if (submission.group && marksScope === "group") {
        const params = new URLSearchParams();
        params.append("coursework", String(submission.coursework));
        params.append("group", String(submission.group));
        params.append("page_size", "500");
        const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
        targetSubmissionIds = (data.results || []).map((item) => item.id);
      }

      for (const targetId of targetSubmissionIds) {
        const payload = {
          submission: targetId,
          marks: numericMarks,
          feedback: draft.feedback || "",
        };
        const requestParams = { scope: marksScope };
        if (targetStudentId) {
          requestParams.target_student_id = targetStudentId;
        }
        if (targetStudentId && marksScope === "single") {
          await api.post(ENDPOINTS.feedback, payload, { params: requestParams });
          continue;
        }
        const canReuseExisting =
          !targetStudentId ||
          marksScope === "group" ||
          String(submission?.student || "") === String(targetStudentId);
        const existing = canReuseExisting ? feedbackBySubmission[String(targetId)] : null;
        if (existing?.id) {
          await api.patch(`${ENDPOINTS.feedback}${existing.id}/`, payload, { params: requestParams });
        } else {
          await api.post(ENDPOINTS.feedback, payload, { params: requestParams });
        }
      }
      if (shouldNotify) {
        if (submission.group && marksScope === "group") {
          notify("Group marks & feedback saved for all members");
        } else {
          notify("Marks & feedback saved");
        }
      }
      if (shouldReload) {
        await Promise.all([loadFeedbackMap(), loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
      }
      return true;
    } catch (err) {
      if (shouldNotify) {
        notify(err?.response?.data?.detail || "Failed to save marks/feedback", "error");
      }
      return false;
    } finally {
      setFeedbackSavingBySubmission((prev) => ({ ...prev, [draftKey]: false }));
    }
  };
  const handleMarksDraftChange = (submission, value, draftKeyOverride) => {
    const submissionId = getPrimarySubmissionId(submission);
    if (!submissionId && !draftKeyOverride) return;
    const normalized = normalizeMarksValue(value);
    updateFeedbackDraft(String(draftKeyOverride ?? submissionId), { marks: normalized });
  };

  const pendingNoRequestEntries = useMemo(() => {
    const shouldShow = workflowFilter === "" || workflowFilter === "request_pending" || workflowFilter === "topic_not_submitted";
    if (!shouldShow) return [];

    const entries = [];
    courseworksMeta.forEach((coursework) => {
      const courseEnrollments = enrollments.filter((enrollment) => String(enrollment.course) === String(coursework.course));
      if (!courseEnrollments.length) return;
      const submittedStudentIds = new Set();
      submissionIndexRows
        .filter((row) => String(row.coursework) === String(coursework.id))
        .forEach((row) => {
          if (row.student) submittedStudentIds.add(String(row.student));
          (row.requested_member_ids || []).forEach((memberId) => {
            if (memberId) submittedStudentIds.add(String(memberId));
          });
          (row.group_member_ids || []).forEach((memberId) => {
            if (memberId) submittedStudentIds.add(String(memberId));
          });
          const group = groupsById[String(row.group)];
          (group?.members || []).forEach((member) => {
            if (member?.student && member.accepted !== false) {
              submittedStudentIds.add(String(member.student));
            }
          });
        });
      const courseTitle = coursework.course_title || courses.find((course) => String(course.id) === String(coursework.course))?.title || "-";
      const courseObj = courses.find((course) => String(course.id) === String(coursework.course));
      courseEnrollments.forEach((enrollment) => {
        if (submittedStudentIds.has(String(enrollment.student))) return;
        entries.push({
          courseworkId: coursework.id,
          courseId: coursework.course,
          courseworkTitle: coursework.title || coursework.coursework_title || `Assessment #${coursework.id}`,
          courseTitle,
          semesterTitle: courseObj?.semester_name || "Semester",
          studentName: enrollment.student_name || `Student #${enrollment.student}`,
          rollNo: enrollment.student_roll_no || "-",
        });
      });
    });
    return entries.sort((a, b) =>
      String(a.rollNo || "").localeCompare(String(b.rollNo || ""), undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }, [workflowFilter, courseworksMeta, enrollments, submissionIndexRows, groupsById, courses]);

  const displayRows = useMemo(() => {
    if (workflowFilter === "topic_not_submitted") {
      return pendingNoRequestEntries.map((entry) => ({
        id: `missing-${entry.courseworkId}-${entry.rollNo}-${entry.studentName}`,
        submission_id: null,
        coursework: entry.courseworkId,
        coursework_title: entry.courseworkTitle,
        topic: "",
        student_name: entry.studentName,
        student_roll_no: entry.rollNo || "-",
        group_name: "",
        approval_status: "pending",
        status: "not_submitted",
        submitted_at: null,
        file: null,
        is_marked: false,
        is_topic_not_submitted: true,
      }));
    }
    if (workflowFilter === "marked") {
      const seen = new Set();
      return rows
        .filter((row) => {
          const key = String(row?.id || "");
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((row) => ({
          ...row,
          submission_id: row.id,
          force_individual_row: true,
        }));
    }
    const nonGroupRows = rows.filter((row) => !row.group).map((row) => ({ ...row, submission_id: row.id }));
    const groupedRowsMap = new Map();
    rows
      .filter((row) => !!row.group)
      .forEach((row) => {
        const key = `${row.coursework}-${row.group}`;
        if (!groupedRowsMap.has(key)) groupedRowsMap.set(key, []);
        groupedRowsMap.get(key).push(row);
      });

    const representativeGroupRows = [];
    groupedRowsMap.forEach((groupRows) => {
      const representative = [...groupRows].sort(
        (a, b) => new Date(b.submitted_at || b.created_at || 0).getTime() - new Date(a.submitted_at || a.created_at || 0).getTime()
      )[0];
      representativeGroupRows.push({
        ...representative,
        submission_id: representative.id,
        group_member_rows: groupRows.map((row) => ({ ...row, submission_id: row.id })),
      });
    });

    return [...nonGroupRows, ...representativeGroupRows];
  }, [workflowFilter, rows, pendingNoRequestEntries, groupsById, enrollments]);

  const groupedByCourseAndCoursework = useMemo(() => {
    const courseworkById = {};
    courseworksMeta.forEach((cw) => {
      courseworkById[cw.id] = cw;
    });
    const courseById = {};
    courses.forEach((course) => {
      courseById[course.id] = course;
    });

    const grouped = {};
    displayRows.forEach((row) => {
      const cw = courseworkById[row.coursework];
      const courseTitle = cw ? (courseById[cw.course]?.title || `Course ${cw.course}`) : "Unmapped Course";
      const courseworkTitle = row.coursework_title || cw?.title || `Assessment #${row.coursework}`;
      if (!grouped[courseTitle]) grouped[courseTitle] = {};
      if (!grouped[courseTitle][courseworkTitle]) grouped[courseTitle][courseworkTitle] = [];
      grouped[courseTitle][courseworkTitle].push(row);
    });
    return grouped;
  }, [displayRows, courseworksMeta, courses]);
  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((course) => {
      map[String(course.id)] = course.title || `Course ${course.id}`;
    });
    return map;
  }, [courses]);
  const courseTeacherById = useMemo(() => {
    const map = {};
    courses.forEach((course) => {
      map[String(course.id)] = (course.teacher_names || []).join(", ") || "-";
    });
    return map;
  }, [courses]);
  const exportSections = useMemo(() => {
    const sections = new Map();
    displayRows.forEach((item) => {
      const coursework = courseworkById[String(item.coursework)];
      const courseId = String(coursework?.course || "");
      const courseTitle = courseNameById[courseId] || "-";
      const teacherName = courseTeacherById[courseId] || "-";
      const courseworkTitle = item.coursework_title || coursework?.title || `Assessment #${item.coursework}`;
      const stageLabel = item.is_topic_not_submitted ? "Not submitted" : getSubmissionStageMeta(item).label;
      const feedbackText = item.is_topic_not_submitted
        ? "Awaiting"
        : feedbackBySubmission[String(getPrimarySubmissionId(item))]?.feedback || "-";
      if (!sections.has(courseTitle)) {
        sections.set(courseTitle, {
          courseTitle,
          teacherName,
          courseworks: new Map(),
        });
      }
      const courseNode = sections.get(courseTitle);
      if (!courseNode.courseworks.has(courseworkTitle)) {
        courseNode.courseworks.set(courseworkTitle, []);
      }
      courseNode.courseworks.get(courseworkTitle).push({
        studentOrGroup: item.group_name || item.student_name || "-",
        rollNo: item.student_roll_no || "-",
        status: stageLabel,
        approval: item.approval_status || "pending",
        submissionStatus: item.status || (item.is_topic_not_submitted ? "not_submitted" : "-"),
        submittedAt: item.submitted_at ? formatDate(item.submitted_at) : "-",
        feedback: feedbackText,
      });
    });
    return Array.from(sections.values()).map((courseNode) => ({
      ...courseNode,
      courseworks: Array.from(courseNode.courseworks.entries()).map(([courseworkTitle, rows]) => ({
        courseworkTitle,
        rows,
      })),
    }));
  }, [displayRows, courseworkById, courseNameById, courseTeacherById, feedbackBySubmission]);
  const selectableRows = useMemo(() => displayRows.filter(canSelectSubmission), [displayRows, workflowFilter, isAdminApprovalsView]);
  const selectableIds = useMemo(
    () =>
      selectableRows
        .map((row) => String(getPrimarySubmissionId(row)))
        .filter((id) => Boolean(id)),
    [selectableRows]
  );
  const selectedCount = useMemo(
    () => selectableIds.filter((id) => selectedSubmissionIds[id]).length,
    [selectableIds, selectedSubmissionIds]
  );
  const selectedRows = useMemo(
    () => selectableRows.filter((row) => selectedSubmissionIds[String(getPrimarySubmissionId(row))]),
    [selectableRows, selectedSubmissionIds]
  );
  const selectedApproveRows = useMemo(() => selectedRows.filter(canApproveSubmission), [selectedRows]);
  const selectedMarkRows = useMemo(() => selectedRows.filter(canBulkMarkSubmission), [selectedRows]);
  const selectedDeleteRows = useMemo(() => selectedRows.filter(canBulkDeleteSubmission), [selectedRows]);
  const allSelectableChecked = selectableIds.length > 0 && selectedCount === selectableIds.length;

  const toggleSelectAllVisible = () => {
    if (!selectableIds.length) return;
    setSelectedSubmissionIds((prev) => {
      const next = { ...prev };
      const shouldSelectAll = !allSelectableChecked;
      selectableIds.forEach((id) => {
        next[id] = shouldSelectAll;
      });
      return next;
    });
  };

  const bulkApproveSelected = async () => {
    if (bulkApproveLockRef.current) return;
    const targets = selectedApproveRows;
    if (!targets.length) {
      notify("Please select at least one submission", "warning");
      return;
    }
    bulkApproveLockRef.current = true;
    try {
      const payload = {
        items: targets.map((item) => ({
          id: getPrimarySubmissionId(item),
          scope: resolveActionScope(item),
        })),
      };
      const { data } = await api.post(`${ENDPOINTS.submissions}bulk_approve/`, payload);
      const approved = Number(data?.updated_count || 0);
      const failed = Number(data?.error_count || 0);
      notify(
        failed ? `${approved} approved, ${failed} failed` : `${approved} submission(s) approved`,
        failed ? "warning" : "success"
      );
      setSelectedSubmissionIds({});
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      notify("Bulk approve failed", "error");
    } finally {
      bulkApproveLockRef.current = false;
    }
  };
  const bulkSaveSelectedMarks = async () => {
    if (bulkSaveLockRef.current) return;
    if (!selectedMarkRows.length) {
      notify("Select approved rows for bulk marks save", "warning");
      return;
    }
    const normalizedBulkMarks = normalizeMarksValue(bulkMarks);
    if (!normalizedBulkMarks) {
      notify("Bulk marks are required", "error");
      return;
    }
    bulkSaveLockRef.current = true;
    setBulkSavingMarks(true);
    try {
      const payload = {
        items: selectedMarkRows.map((row) => ({
          submission: getPrimarySubmissionId(row),
          scope: resolveRowSaveScope(row),
          target_student_id: row.force_individual_row ? row.student : null,
          marks: Number(normalizedBulkMarks),
          feedback: bulkFeedback || "",
        })),
      };
      const { data } = await api.post(`${ENDPOINTS.feedback}bulk_upsert/`, payload);
      const successCount = Number(data?.updated_count || 0);
      const failedCount = Number(data?.error_count || 0);
      if (!successCount) {
        notify("No rows were saved", "warning");
        return;
      }
      notify(
        failedCount
          ? `Bulk marks saved for ${successCount}, failed ${failedCount}`
          : `Bulk marks saved for ${successCount} record(s)`,
        failedCount ? "warning" : "success"
      );
      await Promise.all([loadData(), loadWorkflowCounts()]);
    } catch {
      notify("Bulk marks save failed", "error");
    } finally {
      setBulkSavingMarks(false);
      bulkSaveLockRef.current = false;
    }
  };
  const bulkDeleteSelected = async () => {
    if (bulkDeleteLockRef.current) return;
    if (!selectedDeleteRows.length) {
      notify("Select rows from approved/submitted/marked to bulk delete", "warning");
      return;
    }
    if (!confirmDelete("selected records")) {
      return;
    }
    bulkDeleteLockRef.current = true;
    setBulkDeleting(true);
    try {
      const ids = selectedDeleteRows.map((row) => getPrimarySubmissionId(row)).filter(Boolean);
      const { data } = await api.post(`${ENDPOINTS.submissions}bulk_delete/`, { ids });
      const deletedCount = Number(data?.deleted_count || 0);
      notify(`${deletedCount} record(s) deleted`);
      setSelectedSubmissionIds({});
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      notify("Bulk delete failed", "error");
    } finally {
      setBulkDeleting(false);
      bulkDeleteLockRef.current = false;
    }
  };
  const exportExcel = () => {
    const header = ["Student/Group", "Roll No", "Status", "Approval", "Submission Status", "Submitted At", "Feedback"];
    const lines = [];
    exportSections.forEach((section) => {
      lines.push([`Course: ${section.courseTitle}`, `Course Teacher: ${section.teacherName}`].map(csvSafe).join(","));
      section.courseworks.forEach((courseworkNode) => {
        lines.push([`Assessment: ${courseworkNode.courseworkTitle}`].map(csvSafe).join(","));
        lines.push(header.map(csvSafe).join(","));
        courseworkNode.rows.forEach((row) => {
          lines.push(
            [row.studentOrGroup, row.rollNo, row.status, row.approval, row.submissionStatus, row.submittedAt, row.feedback]
              .map(csvSafe)
              .join(",")
          );
        });
        lines.push("");
      });
      lines.push("");
    });
    downloadTextFile(
      `${fileSafe(isAdminApprovalsView ? "admin-assessment-approvals" : "teacher-assessment-approvals")}.csv`,
      lines.join("\n"),
      "text/csv;charset=utf-8"
    );
  };
  const exportPdf = () => {
    const sectionBlocks = exportSections
      .map((section) => {
        const courseworkBlocks = section.courseworks
          .map((courseworkNode) => {
            const rowsHtml = courseworkNode.rows
              .map(
                (row) => `<tr>
                  <td>${row.studentOrGroup}</td>
                  <td>${row.rollNo}</td>
                  <td>${row.status}</td>
                  <td>${row.approval}</td>
                  <td>${row.submissionStatus}</td>
                  <td>${row.submittedAt}</td>
                  <td>${row.feedback}</td>
                </tr>`
              )
              .join("");
            return `
              <div class="coursework-title">Assessment: ${courseworkNode.courseworkTitle}</div>
              <table>
                <thead>
                  <tr>
                    <th>Student/Group</th>
                    <th>Roll No</th>
                    <th>Status</th>
                    <th>Approval</th>
                    <th>Submission Status</th>
                    <th>Submitted At</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            `;
          })
          .join("");
        return `
          <div class="course-header">
            <strong>Course:</strong> ${section.courseTitle}
            <span class="teacher-tag"><strong>Course Teacher:</strong> ${section.teacherName}</span>
          </div>
          ${courseworkBlocks}
        `;
      })
      .join("");
    const pop = window.open("", "_blank", "width=1300,height=850");
    if (!pop) return;
    pop.document.write(`
      <html>
        <head>
          <title>Assessment Approvals</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 14px; }
            .course-header { margin: 12px 0 6px; padding: 8px; background: #eff6ff; border: 1px solid #cfe0fb; border-radius: 8px; }
            .teacher-tag { margin-left: 14px; color: #1e3a8a; }
            .coursework-title { margin: 8px 0 4px; font-weight: 700; color: #10213f; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px; text-align: left; }
            th { background: #eff6ff; }
          </style>
        </head>
        <body>
          <h2>Assessment Approvals</h2>
          ${sectionBlocks}
        </body>
      </html>
    `);
    pop.document.close();
    pop.focus();
    pop.print();
  };

  const workflowBadgeItems = useMemo(
    () => [
      {
        value: "topic_not_submitted",
        label: isAdminApprovalsView ? `Not Submitted: ${pendingNoRequestEntries.length}` : "Not Submitted",
        color: "warning",
      },
      {
        value: "request_pending",
        label: `Pending Approvals: ${workflowCounts.request_pending}`,
        color: "warning",
      },
      {
        value: "ready_for_upload",
        label: `Approved Topic: ${workflowCounts.ready_for_upload}`,
        color: "info",
      },
      {
        value: "file_submitted",
        label: `File Submitted: ${workflowCounts.file_submitted}`,
        color: "secondary",
      },
      {
        value: "marked",
        label: `Marked: ${workflowCounts.marked}`,
        color: "success",
      },
      {
        value: "request_rejected",
        label: `Rejected: ${workflowCounts.request_rejected}`,
        color: "error",
      },
    ],
    [pendingNoRequestEntries.length, workflowCounts]
  );

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [workflowFilter]);

  useEffect(() => {
    const courseKeys = Object.keys(groupedByCourseAndCoursework);
    const nextCourseState = {};
    courseKeys.forEach((key, idx) => {
      nextCourseState[key] = idx === 0;
    });
    setOpenCourses((prev) => (shallowEqualObjects(prev, nextCourseState) ? prev : nextCourseState));

    const nextCourseworkState = {};
    courseKeys.forEach((courseKey, courseIdx) => {
      const courseworkKeys = Object.keys(groupedByCourseAndCoursework[courseKey] || {});
      courseworkKeys.forEach((cwKey, cwIdx) => {
        nextCourseworkState[`${courseKey}__${cwKey}`] = courseIdx === 0 && cwIdx === 0;
      });
    });
    setOpenCourseworks((prev) => (shallowEqualObjects(prev, nextCourseworkState) ? prev : nextCourseworkState));
  }, [groupedByCourseAndCoursework]);

  useEffect(() => {
    setSelectedSubmissionIds((prev) => {
      const next = {};
      selectableIds.forEach((id) => {
        if (prev[id]) next[id] = true;
      });
      return shallowEqualObjects(prev, next) ? prev : next;
    });
  }, [selectableIds]);

  return (
    <Stack spacing={2}>
      <ModuleHero
        title={isAdminApprovalsView ? "Assessment Approvals" : "Submissions"}
        subtitle={
          isAdminApprovalsView
            ? "Review and approve student topics/submissions across courses."
            : "Review and approve student topics/submissions for your courses."
        }
      >
        <SearchToolbar
          label={isAdminApprovalsView ? "Search topic/student/group/course" : "Search"}
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={resetSearch}
        />
        <FormControl size="small" sx={{ minWidth: 180, mt: 0.8 }}>
          <InputLabel id="teacher-submission-status-filter">
            {isAdminApprovalsView ? "Submission Status" : "Status"}
          </InputLabel>
          <Select
            labelId="teacher-submission-status-filter"
            value={statusFilter}
            label={isAdminApprovalsView ? "Submission Status" : "Status"}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">All</MenuItem>
            {SUBMISSION_STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220, mt: 0.8, ml: { md: 1 } }}>
          <InputLabel id="teacher-workflow-filter">Workflow</InputLabel>
          <Select
            labelId="teacher-workflow-filter"
            value={workflowFilter}
            label="Workflow"
            onChange={(e) => setWorkflowFilter(e.target.value)}
          >
            {WORKFLOW_FILTER_OPTIONS.map((option) => (
              <MenuItem key={option.value || "all"} value={option.value}>{option.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </ModuleHero>

      <Paper sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Checkbox
              size="small"
              checked={allSelectableChecked}
              indeterminate={selectedCount > 0 && !allSelectableChecked}
              onChange={toggleSelectAllVisible}
            />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Select All Visible
            </Typography>
            <Chip size="small" color="primary" variant="outlined" label={`Selected: ${selectedCount}`} />
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ sm: "center" }}>
            <TextField
              size="small"
              type="number"
              label="Bulk Marks"
              value={bulkMarks}
              onChange={(e) => setBulkMarks(normalizeMarksValue(e.target.value))}
              inputProps={{ min: 0, step: 1 }}
              sx={{ width: 120 }}
            />
            <TextField
              size="small"
              label="Bulk Feedback (optional)"
              value={bulkFeedback}
              onChange={(e) => setBulkFeedback(e.target.value)}
              sx={{ width: 220 }}
            />
            <Button size="small" variant="contained" color="success" disabled={!selectedApproveRows.length} onClick={bulkApproveSelected}>
              Bulk Approve
            </Button>
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={!selectedMarkRows.length || bulkSavingMarks}
              onClick={bulkSaveSelectedMarks}
            >
              {bulkSavingMarks ? "Saving..." : "Bulk Save Marks"}
            </Button>
            {isAdminApprovalsView && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={!selectedDeleteRows.length || bulkDeleting}
                onClick={bulkDeleteSelected}
              >
                {bulkDeleting ? "Deleting..." : "Bulk Delete"}
              </Button>
            )}
          </Stack>
        </Stack>
        {isAdminApprovalsView && (
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportExcel}>
              Export Excel
            </Button>
            <Button size="small" variant="contained" color="secondary" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportPdf}>
              Export PDF
            </Button>
          </Stack>
        )}
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap" }}>
          <Chip label={`Total: ${total}`} variant="outlined" />
          <Chip label={`Late: ${rows.filter((row) => row.status === "late").length}`} color="warning" variant="outlined" />
          <Chip label={`Submitted: ${rows.filter((row) => row.status === "submitted").length}`} color="success" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mb: 1.2, flexWrap: "wrap" }}>
          {workflowBadgeItems.map((badge) => (
            <Chip
              key={badge.value}
              clickable
              color={workflowFilter === badge.value ? badge.color : "default"}
              variant={workflowFilter === badge.value ? "filled" : "outlined"}
              onClick={() => setWorkflowFilter(badge.value)}
              label={badge.label}
            />
          ))}
          <Chip
            clickable
            variant={workflowFilter === "" ? "filled" : "outlined"}
            color={workflowFilter === "" ? "primary" : "default"}
            onClick={() => setWorkflowFilter("")}
            label="Clear Workflow Filter"
          />
        </Stack>
        {!displayRows.length && !loading && (
          <Typography variant="body2" color="text.secondary">No submissions found for current filter/search.</Typography>
        )}
        <Stack spacing={1.2} ref={resultsSectionRef}>
          {Object.entries(groupedByCourseAndCoursework).map(([courseTitle, courseworkGroup]) => (
            <Paper key={courseTitle} variant="outlined" sx={{ p: 1.1, borderColor: "primary.main", bgcolor: "rgba(25, 118, 210, 0.04)" }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  Course: {courseTitle}
                </Typography>
                <IconButton size="small" onClick={() => setOpenCourses((prev) => ({ ...prev, [courseTitle]: !prev[courseTitle] }))}>
                  {openCourses[courseTitle] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                </IconButton>
              </Stack>
              <Collapse in={!!openCourses[courseTitle]}>
                <Stack spacing={0.9}>
                  {Object.entries(courseworkGroup).map(([courseworkTitle, items]) => {
                    const courseworkKey = `${courseTitle}__${courseworkTitle}`;
                    const topicNotSubmittedCount = items.filter((item) => item.is_topic_not_submitted).length;
                    return (
                    <Paper key={courseworkTitle} variant="outlined" sx={{ p: 1, borderColor: "#90caf9", bgcolor: "#fff" }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography sx={{ fontWeight: 700 }}>
                            Assessment: {courseworkTitle}
                          </Typography>
                          {topicNotSubmittedCount > 0 && (
                            <Chip size="small" color="warning" variant="outlined" label={`Not Submitted: ${topicNotSubmittedCount}`} />
                          )}
                        </Stack>
                        <IconButton size="small" onClick={() => setOpenCourseworks((prev) => ({ ...prev, [courseworkKey]: !prev[courseworkKey] }))}>
                          {openCourseworks[courseworkKey] ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                        </IconButton>
                      </Stack>
                      <Collapse in={!!openCourseworks[courseworkKey]}>
                        <Box sx={{ p: 0.9, borderRadius: 1, border: "1px solid #dbeafe", bgcolor: "#f8fbff" }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.7, fontWeight: 700 }}>
                        Student Submissions
                      </Typography>
                      <Box
                        sx={{
                          maxHeight: items.length > 4 ? 420 : "unset",
                          overflowY: items.length > 4 ? "auto" : "visible",
                          borderRadius: 1.2,
                          border: "1px solid #e6eefc",
                          bgcolor: "#fff",
                        }}
                      >
                      <Table
                        size="small"
                        stickyHeader
                        sx={{
                          "& th, & td": { py: 0.75, verticalAlign: "top" },
                          "& tbody tr:nth-of-type(even)": { bgcolor: "#fbfdff" },
                          "& tbody tr:hover": { bgcolor: "#f3f8ff" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            {workflowFilter === "topic_not_submitted" ? (
                              <>
                                <TableCell>Name</TableCell>
                                <TableCell>Roll No</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Feedbk</TableCell>
                              </>
                            ) : (
                              <>
                                <TableCell>Select</TableCell>
                                <TableCell>Student/Group</TableCell>
                                <TableCell>Members</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Approval</TableCell>
                                <TableCell>File</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </>
                            )}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, idx) => {
                            const primarySubmissionId = getPrimarySubmissionId(item);
                            const isGroupRow = Boolean(item.group) && !item.force_individual_row;
                            const isCollaborativeRequestRow =
                              !item.group &&
                              !item.force_individual_row &&
                              (
                                (item.requested_member_ids || []).length > 0 ||
                                (item.requested_member_details || []).length > 0 ||
                                (item.requested_member_names || []).length > 0
                              );
                            const rowSaveScope = resolveRowSaveScope(item);
                            const canShowMarkingControls =
                              !item.is_topic_not_submitted &&
                              String(item.approval_status || "").toLowerCase() === "approved";
                            const canShowDeleteAction =
                              isAdminApprovalsView ||
                              !["ready_for_upload", "file_submitted", "marked"].includes(workflowFilter);
                            const rowDraftKey =
                              item.force_individual_row && item.synthetic_member_row
                                ? String(item.id || `row-${item.coursework}-${item.student || idx}`)
                                : String(primarySubmissionId || item.id || idx);
                            const groupMembers = (groupsById[String(item.group)]?.members || []).filter((member) => member.accepted !== false);
                            const groupMemberRows = item.group_member_rows || [];
                            const groupOpen = !!openGroupRows[String(primarySubmissionId)];
                            const listColSpan = workflowFilter === "topic_not_submitted" ? 4 : 7;
                            const recordLabel = item.group_name || item.student_name || item.student || "-";
                            const recordBg = idx % 2 === 0 ? "#f8fbff" : "#ffffff";

                            return (
                              <Fragment key={item.id}>
                                {workflowFilter !== "topic_not_submitted" && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={listColSpan}
                                      sx={{
                                        py: 0.45,
                                        px: 0.9,
                                        bgcolor: recordBg,
                                        borderTop: "2px solid #dbeafe",
                                        borderBottom: "1px dashed #dbeafe",
                                      }}
                                    >
                                      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                                        <Box
                                          sx={{
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr)) auto" },
                                            gap: 0.7,
                                            alignItems: "center",
                                            flex: 1,
                                            minWidth: 0,
                                          }}
                                        >
                                          <Chip size="small" color="primary" variant="outlined" label={`Record #${idx + 1}`} sx={{ width: "100%" }} />
                                          <Chip
                                            size="small"
                                            color="default"
                                            variant="outlined"
                                            label={`Topic: ${item.topic || "-"}`}
                                            sx={{ width: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                                          />
                                          <Chip
                                            size="small"
                                            color="info"
                                            variant="outlined"
                                            label={`Submitted By: ${recordLabel}`}
                                            sx={{ width: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }}
                                          />
                                          <Chip
                                            size="small"
                                            color="secondary"
                                            variant="outlined"
                                            label={`Date: ${item.submitted_at ? formatDate(item.submitted_at) : "-"}`}
                                          />
                                        </Box>
                                        {canShowMarkingControls && (
                                          <Stack direction="row" spacing={0.6} alignItems="center" sx={{ ml: "auto", mr: 1.8 }}>
                                            <Chip
                                              size="small"
                                              color="primary"
                                              variant="outlined"
                                              label={`Total/Given: ${formatMarks(courseworkById[String(item.coursework)]?.max_marks)}/${formatMarks(
                                                feedbackBySubmission[String(primarySubmissionId)]?.marks ?? item.obtained_marks ?? "-"
                                              )}`}
                                            />
                                            <TextField
                                              size="small"
                                              type="number"
                                              label="Marks"
                                              value={getFeedbackDraft(item, rowDraftKey).marks}
                                              onChange={(e) => handleMarksDraftChange(item, e.target.value, rowDraftKey)}
                                              inputProps={{ min: 0, max: courseworkById[String(item.coursework)]?.max_marks || undefined, step: 1 }}
                                              sx={{ width: 110, "& .MuiInputBase-root": { height: 30 } }}
                                            />
                                            <Button
                                              size="small"
                                              variant="contained"
                                              disabled={feedbackSavingBySubmission[rowDraftKey]}
                                              onClick={() =>
                                                saveFeedback(item, rowSaveScope, {
                                                  targetStudentId: item.force_individual_row ? item.student : null,
                                                  draftKey: rowDraftKey,
                                                  savingKey: rowDraftKey,
                                                })
                                              }
                                            >
                                              {feedbackSavingBySubmission[rowDraftKey] ? "Saving..." : "Save"}
                                            </Button>
                                          </Stack>
                                        )}
                                      </Stack>
                                    </TableCell>
                                  </TableRow>
                                )}
                                <TableRow>
                                  {workflowFilter === "topic_not_submitted" ? (
                                    <>
                                      <TableCell>{item.student_name || item.group_name || "-"}</TableCell>
                                      <TableCell>{item.student_roll_no || "-"}</TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Chip size="small" color="warning" label="Not submitted" />
                                        ) : (
                                          <Chip size="small" color={getSubmissionStageMeta(item).color} label={getSubmissionStageMeta(item).label} />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Chip size="small" color="info" variant="outlined" label="Awaiting" />
                                        ) : (
                                          <Stack spacing={0.6} sx={{ minWidth: 230 }}>
                                            <Chip
                                              size="small"
                                              color="primary"
                                              variant="outlined"
                                              label={`Total/Given: ${formatMarks(courseworkById[String(item.coursework)]?.max_marks)}/${formatMarks(
                                                feedbackBySubmission[String(primarySubmissionId)]?.marks ?? item.obtained_marks ?? "-"
                                              )}`}
                                            />
                                            <TextField
                                              size="small"
                                              type="number"
                                              label="Marks"
                                              value={getFeedbackDraft(item, rowDraftKey).marks}
                                              onChange={(e) => handleMarksDraftChange(item, e.target.value, rowDraftKey)}
                                              inputProps={{ min: 0, max: courseworkById[String(item.coursework)]?.max_marks || undefined, step: 1 }}
                                            />
                                            <TextField
                                              size="small"
                                              label="Feedback"
                                              value={getFeedbackDraft(item).feedback}
                                              onChange={(e) => updateFeedbackDraft(primarySubmissionId, { feedback: e.target.value })}
                                            />
                                            <Button
                                              size="small"
                                              variant="contained"
                                              disabled={feedbackSavingBySubmission[rowDraftKey]}
                                              onClick={() =>
                                                saveFeedback(item, "single", {
                                                  targetStudentId: item.force_individual_row ? item.student : null,
                                                  draftKey: rowDraftKey,
                                                  savingKey: rowDraftKey,
                                                })
                                              }
                                            >
                                              {feedbackSavingBySubmission[rowDraftKey] ? "Saving..." : "Save"}
                                            </Button>
                                          </Stack>
                                        )}
                                      </TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell>
                                        <Checkbox
                                          size="small"
                                          disabled={!canSelectSubmission(item)}
                                          checked={!!selectedSubmissionIds[String(primarySubmissionId)]}
                                          onChange={() => toggleSelectSubmission(item)}
                                        />
                                      </TableCell>
                                      <TableCell>{item.force_individual_row ? (item.student_name || item.group_name || item.student || "-") : (item.group_name || item.student_name || item.student || "-")}</TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Button size="small" disabled>View</Button>
                                        ) : isGroupRow ? (
                                          <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() =>
                                              setOpenGroupRows((prev) => ({
                                                ...prev,
                                                [String(primarySubmissionId)]: !prev[String(primarySubmissionId)],
                                              }))
                                            }
                                          >
                                            {groupOpen ? "Hide Members" : "Members"}
                                          </Button>
                                        ) : (
                                          <Button
                                            size="small"
                                            onClick={() =>
                                              openSubmissionMembers(item, {
                                                singleOnly: !!item.force_individual_row && workflowFilter === "marked",
                                              })
                                            }
                                          >
                                            View
                                          </Button>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Chip size="small" color="warning" label="Not submitted" />
                                        ) : (
                                          <Chip size="small" color={getSubmissionStageMeta(item).color} label={getSubmissionStageMeta(item).label} />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Chip size="small" variant="outlined" color="warning" label="pending" />
                                        ) : (
                                          <Chip
                                            size="small"
                                            label={item.approval_status || "pending"}
                                            color={item.approval_status === "approved" ? "success" : item.approval_status === "rejected" ? "error" : "warning"}
                                          />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Chip size="small" variant="outlined" color="warning" label="not_submitted" />
                                        ) : (
                                          <Chip label={item.status} size="small" color={getSubmissionStatusColor(item.status)} />
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        {item.is_topic_not_submitted ? (
                                          <Typography variant="caption" color="text.secondary">No file</Typography>
                                        ) : (
                                          <Stack direction="row" spacing={0.6} alignItems="center">
                                            <Chip
                                              size="small"
                                              color={item.file ? "success" : "default"}
                                              variant="outlined"
                                              label={item.file ? "Uploaded" : "Pending"}
                                            />
                                            <IconButton size="small" disabled={!item.file} onClick={() => openFilePreview(item)}>
                                              <VisibilityOutlinedIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" disabled={!item.file} onClick={() => downloadFile(item)}>
                                              <DownloadRoundedIcon fontSize="small" />
                                            </IconButton>
                                          </Stack>
                                        )}
                                      </TableCell>
                                      <TableCell align="right">
                                        {item.is_topic_not_submitted ? (
                                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Button size="small" color="success" disabled>Approve</Button>
                                            <Button size="small" color="warning" disabled>Reject</Button>
                                            <Button size="small" color="error" disabled>Delete</Button>
                                          </Stack>
                                        ) : (
                                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            {!item.is_marked && item.approval_status !== "approved" && (
                                              <Button size="small" color="success" onClick={() => approve(item)}>
                                                Approve
                                              </Button>
                                            )}
                                            {!item.is_marked && item.approval_status !== "rejected" && (
                                              <Button size="small" color="warning" onClick={() => reject(item)}>
                                                Reject
                                              </Button>
                                            )}
                                            {canShowDeleteAction && (
                                              <Button size="small" color="error" onClick={() => remove(primarySubmissionId)}>Delete</Button>
                                            )}
                                          </Stack>
                                        )}
                                      </TableCell>
                                    </>
                                  )}
                                </TableRow>

                                {workflowFilter !== "topic_not_submitted" && isGroupRow && (
                                  <TableRow>
                                    <TableCell sx={{ p: 0 }} colSpan={7}>
                                      <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                                        <Box sx={{ m: 1, p: 1, border: "1px solid #dbeafe", borderRadius: 1.2, bgcolor: "#f8fbff" }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
                                            Group Members (Individual Marks)
                                          </Typography>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Roll No</TableCell>
                                                {canShowMarkingControls && (
                                                  <>
                                                    <TableCell>Given Marks</TableCell>
                                                    <TableCell>Marks</TableCell>
                                                    <TableCell>Feedback</TableCell>
                                                    <TableCell align="right">Action</TableCell>
                                                  </>
                                                )}
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {(groupMembers.length ? groupMembers : groupMemberRows).map((member, idx) => {
                                                const memberStudentId = String(member.student || member.id || "");
                                                const memberSubmission =
                                                  groupMemberRows.find((row) => String(row.student || "") === memberStudentId) ||
                                                  groupMemberRows[idx] ||
                                                  item;
                                                const memberSubmissionId = getPrimarySubmissionId(memberSubmission);
                                                const givenMarks = feedbackBySubmission[String(memberSubmissionId)]?.marks ?? memberSubmission?.obtained_marks ?? "-";
                                                const memberName =
                                                  member.student_name ||
                                                  member.student_display ||
                                                  member.student_username ||
                                                  memberSubmission?.student_name ||
                                                  "-";
                                                const memberRollNo = member.student_roll_no || memberSubmission?.student_roll_no || "-";

                                                return (
                                                  <TableRow key={`${primarySubmissionId}-member-${memberStudentId || idx}`}>
                                                    <TableCell>{memberName}</TableCell>
                                                    <TableCell>{memberRollNo}</TableCell>
                                                    {canShowMarkingControls && (
                                                      <>
                                                        <TableCell>{formatMarks(givenMarks)}</TableCell>
                                                        <TableCell sx={{ minWidth: 120 }}>
                                                          <TextField
                                                            size="small"
                                                            type="number"
                                                            value={getFeedbackDraft(memberSubmission).marks}
                                                            onChange={(e) => handleMarksDraftChange(memberSubmission, e.target.value)}
                                                            inputProps={{ min: 0, max: courseworkById[String(item.coursework)]?.max_marks || undefined, step: 1 }}
                                                          />
                                                        </TableCell>
                                                        <TableCell sx={{ minWidth: 180 }}>
                                                          <TextField
                                                            size="small"
                                                            value={getFeedbackDraft(memberSubmission).feedback}
                                                            onChange={(e) => updateFeedbackDraft(memberSubmissionId, { feedback: e.target.value })}
                                                          />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                          <Button
                                                            size="small"
                                                            variant="outlined"
                                                            disabled={feedbackSavingBySubmission[memberSubmissionId]}
                                                            onClick={() => saveFeedback(memberSubmission, "single")}
                                                          >
                                                            {feedbackSavingBySubmission[memberSubmissionId] ? "Saving..." : "Save Individual"}
                                                          </Button>
                                                        </TableCell>
                                                      </>
                                                    )}
                                                  </TableRow>
                                                );
                                              })}
                                            </TableBody>
                                          </Table>
                                        </Box>
                                      </Collapse>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                      </Box>
                    </Box>
                      </Collapse>
                    </Paper>
                    );
                  })}
                </Stack>
              </Collapse>
            </Paper>
            ))}
        </Stack>
        {loading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}

        <PaginationControls page={page} pageSize={pageSize} total={total} onPageChange={changePage} onPageSizeChange={changePageSize} />
      </Paper>

      <Dialog
        open={memberDialogOpen}
        onClose={handleMemberDialogClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>{memberDialogTitle}</DialogTitle>
        <DialogContent dividers sx={{ p: 0, maxHeight: "72vh" }}>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 220 }}>Name</TableCell>
                  <TableCell sx={{ minWidth: 130 }}>Roll No</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Current Marks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {memberDialogItems.map((member, idx) => {
                  const memberSubmission = member.linked_submission;
                  const memberSubmissionId = getPrimarySubmissionId(memberSubmission);
                  const maxMarks = courseworkById[String(memberSubmission?.coursework || memberDialogCourseworkId)]?.max_marks;
                  const givenMarks = memberSubmissionId
                    ? feedbackBySubmission[String(memberSubmissionId)]?.marks ?? memberSubmission?.obtained_marks ?? "-"
                    : "-";
                  return (
                    <TableRow key={`${member.id || member.student_id || idx}-dialog`}>
                      <TableCell>{member.name || "-"}</TableCell>
                      <TableCell>{member.roll_no || "-"}</TableCell>
                      <TableCell>
                        {memberSubmission ? (
                          <Chip
                            size="small"
                            color="primary"
                            variant="outlined"
                            label={`Total/Given: ${formatMarks(maxMarks)}/${formatMarks(givenMarks)}`}
                          />
                        ) : (
                          <Chip size="small" variant="outlined" color="warning" label="No submission record" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeMemberDialog}>Close</Button>
        </DialogActions>
      </Dialog>

    </Stack>
  );
};

export default SubmissionsPage;
