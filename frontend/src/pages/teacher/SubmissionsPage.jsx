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
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import api from "../../api/client";
import ListingPage from "../../components/shared/ListingPage";
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
import { csvSafe, downloadTextFile, fileSafe } from "../../utils/export";
import { confirmDelete } from "../../utils/confirm";

const compareByRollNo = (a, b) => {
  const rollA = String(a.student_roll_no || a.rollNo || "").trim();
  const rollB = String(b.student_roll_no || b.rollNo || "").trim();
  if (rollA && rollB) {
    return rollA.localeCompare(rollB, undefined, { numeric: true, sensitivity: "base" });
  }
  if (rollA) return -1;
  if (rollB) return 1;
  return String(a.student_name || a.group_name || "").localeCompare(String(b.student_name || b.group_name || ""), undefined, {
    sensitivity: "base",
  });
};

const getAssessmentDeadlineScore = (title, courseworkGroup, courseworkById) => {
  const row = courseworkGroup?.[title]?.[0];
  const cw = courseworkById?.[String(row?.coursework)];
  const deadline = cw?.deadline ? new Date(cw.deadline).getTime() : NaN;
  if (!Number.isFinite(deadline)) return Number.MAX_SAFE_INTEGER;
  const now = Date.now();
  return deadline >= now ? deadline : deadline + 1e15;
};

const sortAssessmentTitlesByComing = (titles, courseworkGroup, courseworkById) =>
  [...titles].sort(
    (a, b) => getAssessmentDeadlineScore(a, courseworkGroup, courseworkById) - getAssessmentDeadlineScore(b, courseworkGroup, courseworkById)
  );

const STUDENT_STATUS_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "pending", label: "Request for approval" },
  { value: "approved", label: "Approved" },
  { value: "file_submitted", label: "Files submitted" },
  { value: "marked", label: "Marked" },
  { value: "rejected", label: "Rejected" },
];

const hasSentApprovalRequest = (row) => {
  if (!row || row.is_topic_not_submitted) return false;
  const id = row.submission_id || row.id;
  if (!id || String(row.id || "").startsWith("missing-")) return false;
  const approval = String(row.approval_status || "pending").toLowerCase();
  return approval === "pending" || approval === "request_pending";
};

const getStudentStatus = (row) => {
  if (row?.is_topic_not_submitted) return "waiting";
  if (row?.is_marked) return "marked";
  if (String(row?.approval_status || "").toLowerCase() === "rejected") return "rejected";
  if (String(row?.approval_status || "").toLowerCase() === "approved") {
    return row?.file ? "file_submitted" : "approved";
  }
  return hasSentApprovalRequest(row) ? "pending" : "waiting";
};

const rowMatchesStudentStatuses = (row, statuses = []) => {
  if (!statuses.length) return true;
  return statuses.includes(getStudentStatus(row));
};

const normalizeMultiFilter = (current, nextValue) => {
  const next = typeof nextValue === "string" ? nextValue.split(",") : nextValue;
  if (!current.length) return next.filter((value) => value && value !== "all");
  if (next.includes("all")) return [];
  return next.filter((value) => value && value !== "all");
};

const MultiFilterSelect = ({ label, value = [], options = [], onChange, minWidth = 188 }) => (
  <FormControl size="small" sx={{ minWidth, maxWidth: { xs: "100%", md: 280 } }}>
    <InputLabel>{label}</InputLabel>
    <Select
      multiple
      label={label}
      value={value.length ? value : ["all"]}
      onChange={(event) => onChange(normalizeMultiFilter(value, event.target.value))}
      renderValue={() => {
        if (!value.length) return `All ${label.toLowerCase()}`;
        const labels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
        if (!labels.length) return `All ${label.toLowerCase()}`;
        return labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
      }}
      MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
    >
      <MenuItem value="all">
        <Checkbox size="small" checked={!value.length} />
        <ListItemText primary={`All ${label.toLowerCase()}`} />
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <Checkbox size="small" checked={value.includes(option.value)} />
          <ListItemText primary={option.label} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

const rowMatchesSearch = (row, searchValue) => {
  const query = String(searchValue || "").trim().toLowerCase();
  if (!query) return true;
  return [row.student_name, row.group_name, row.topic, row.student_roll_no, row.coursework_title]
    .some((value) => String(value || "").toLowerCase().includes(query));
};

const toWaitingDisplayRow = (entry) => ({
  id: `missing-${entry.courseworkId}-${entry.rollNo}-${entry.studentName}`,
  submission_id: null,
  coursework: entry.courseworkId,
  coursework_title: entry.courseworkTitle,
  topic: "",
  student: entry.studentId,
  student_name: entry.studentName,
  student_roll_no: entry.rollNo || "-",
  group_name: "",
  approval_status: "pending",
  status: "not_submitted",
  submitted_at: null,
  file: null,
  is_marked: false,
  is_topic_not_submitted: true,
  course: entry.courseId,
  course_title: entry.courseTitle,
});

const buildSubmissionDisplayRows = (sourceRows = []) => {
  const nonGroupRows = sourceRows.filter((row) => !row.group).map((row) => ({ ...row, submission_id: row.id }));
  const groupedRowsMap = new Map();
  sourceRows
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
      group_member_rows: groupRows.map((row) => ({ ...row, submission_id: row.id })).sort(compareByRollNo),
    });
  });

  return [...nonGroupRows, ...representativeGroupRows].sort(compareByRollNo);
};

const groupRowsByCourseAndCoursework = (rows, courseworksMeta, courses) => {
  const courseworkById = {};
  courseworksMeta.forEach((cw) => {
    courseworkById[cw.id] = cw;
  });
  const courseById = {};
  courses.forEach((course) => {
    courseById[course.id] = course;
  });

  const grouped = {};
  rows.forEach((row) => {
    const cw = courseworkById[row.coursework];
    const courseTitle = cw ? (courseById[cw.course]?.title || `Course ${cw.course}`) : "Unmapped Course";
    const courseworkTitle = row.coursework_title || cw?.title || `Assessment #${row.coursework}`;
    if (!grouped[courseTitle]) grouped[courseTitle] = {};
    if (!grouped[courseTitle][courseworkTitle]) grouped[courseTitle][courseworkTitle] = [];
    grouped[courseTitle][courseworkTitle].push(row);
  });
  Object.keys(grouped).forEach((courseTitle) => {
    Object.keys(grouped[courseTitle]).forEach((courseworkTitle) => {
      grouped[courseTitle][courseworkTitle].sort(compareByRollNo);
    });
  });
  return grouped;
};

const SubmissionsPage = () => {
  const { user } = useAuth();
  const { notify, isGlobalLoading } = useUi();
  const isAdminApprovalsView = user?.role === "super_admin";
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState([]);
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);
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
  const [bulkRejecting, setBulkRejecting] = useState(false);
  const [savingAllMarks, setSavingAllMarks] = useState(false);
  const bulkApproveLockRef = useRef(false);
  const bulkSaveLockRef = useRef(false);
  const bulkDeleteLockRef = useRef(false);
  const bulkRejectLockRef = useRef(false);
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
    params.append("ordering", "student__username");
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
    return data;
  };

  const { rows, search, setSearch, loading, runSearch, resetSearch, setRows, loadData } =
    usePaginatedQuery({ queryFn, dependencies: [statusFilter] });

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
    params.append("ordering", "student__username");
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
  const hasPersistedSubmission = (submission) => {
    if (!submission || submission.is_topic_not_submitted) return false;
    const id = getPrimarySubmissionId(submission);
    if (!id) return false;
    return !String(submission.id || "").startsWith("missing-");
  };
  const getRowSelectKey = (submission, idx = 0) =>
    String(getPrimarySubmissionId(submission) || submission?.id || `row-${submission?.coursework}-${submission?.student || idx}`);

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
    return selectedStatusFilters.length === 1 && selectedStatusFilters[0] === "marked"
      ? "single"
      : (isGroupRow || isCollaborativeRequestRow ? "group" : "single");
  };
  const canApproveSubmission = (submission) =>
    !submission?.is_topic_not_submitted && !submission?.is_marked && submission?.approval_status !== "approved";
  const canRejectSubmission = (submission) =>
    !submission?.is_topic_not_submitted &&
    !submission?.is_marked &&
    submission?.approval_status !== "approved" &&
    submission?.approval_status !== "rejected";
  const canBulkMarkSubmission = (submission) =>
    !submission?.is_topic_not_submitted &&
    String(submission?.approval_status || "").toLowerCase() === "approved" &&
    Boolean(getPrimarySubmissionId(submission));
  const canBulkDeleteSubmission = (submission) => isAdminApprovalsView && hasPersistedSubmission(submission);
  const canShowRowDelete = (submission) =>
    hasPersistedSubmission(submission) && (
      isAdminApprovalsView ||
      !["approved", "file_submitted", "marked"].includes(selectedStatusFilters[0])
    );

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

  const toggleSelectSubmission = (submission, idx = 0) => {
    const key = getRowSelectKey(submission, idx);
    setSelectedSubmissionIds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleSelectAllItems = (items = []) => {
    if (!items.length) return;
    const keys = items.map((item, idx) => getRowSelectKey(item, idx));
    const allOn = keys.every((key) => selectedSubmissionIds[key]);
    setSelectedSubmissionIds((prev) => {
      const next = { ...prev };
      keys.forEach((key) => {
        next[key] = !allOn;
      });
      return next;
    });
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

  const getRowDraftKey = (item, idx) =>
    item.force_individual_row && item.synthetic_member_row
      ? String(item.id || `row-${item.coursework}-${item.student || idx}`)
      : String(getPrimarySubmissionId(item) || item.id || idx);

  const saveAllDraftMarks = async (items) => {
    const markable = items.filter(
      (item) =>
        !item.is_topic_not_submitted &&
        String(item.approval_status || "").toLowerCase() === "approved" &&
        Boolean(getPrimarySubmissionId(item))
    );
    if (!markable.length) {
      notify("Approve the topic first, then enter marks.", "warning");
      return;
    }
    setSavingAllMarks(true);
    let ok = 0;
    let fail = 0;
    try {
      for (let idx = 0; idx < items.length; idx += 1) {
        const item = items[idx];
        if (!markable.includes(item)) continue;
        const draftKey = getRowDraftKey(item, idx);
        const draft = getFeedbackDraft(item, draftKey);
        if (draft.marks === "" || draft.marks === null || draft.marks === undefined) continue;
        const groupMemberRows = item.group_member_rows || [];
        if (groupMemberRows.length > 1) {
          let savedMember = false;
          for (const memberRow of groupMemberRows) {
            const memberDraft = getFeedbackDraft(memberRow);
            if (memberDraft.marks === "" || memberDraft.marks === null || memberDraft.marks === undefined) continue;
            const success = await saveFeedback(memberRow, "single", { shouldNotify: false, shouldReload: false });
            if (success) {
              ok += 1;
              savedMember = true;
            } else {
              fail += 1;
            }
          }
          if (savedMember) continue;
        }
        const success = await saveFeedback(item, resolveRowSaveScope(item), {
          shouldNotify: false,
          shouldReload: false,
          targetStudentId: item.force_individual_row ? item.student : null,
          draftKey,
          savingKey: draftKey,
        });
        if (success) ok += 1;
        else fail += 1;
      }
      if (!ok && !fail) {
        notify("Enter marks first, then click Save marks.", "warning");
        return;
      }
      await Promise.all([loadFeedbackMap(), loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
      notify(fail ? `${ok} saved, ${fail} failed` : `Marks saved for ${ok} student(s)`, fail ? "warning" : "success");
    } finally {
      setSavingAllMarks(false);
    }
  };

  const allPendingNoRequestEntries = useMemo(() => {
    const entries = [];
    courseworksMeta.forEach((coursework) => {
      const deadline = coursework.deadline ? new Date(coursework.deadline).getTime() : NaN;
      if (Number.isFinite(deadline) && deadline < Date.now()) return;
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
          studentId: enrollment.student,
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
  }, [courseworksMeta, enrollments, submissionIndexRows, groupsById, courses]);

  const rosterRows = useMemo(() => {
    const submissionRows = buildSubmissionDisplayRows(submissionIndexRows);
    const waitingRows = allPendingNoRequestEntries.map(toWaitingDisplayRow);
    return [...submissionRows, ...waitingRows].sort(compareByRollNo);
  }, [submissionIndexRows, allPendingNoRequestEntries]);

  const getRowCourseId = (row) =>
    String(row?.course || courseworkById[String(row?.coursework)]?.course || "");

  const courseFilterOptions = useMemo(() => {
    const ids = new Set(courseworksMeta.map((item) => String(item.course)));
    const counts = {};
    rosterRows.forEach((row) => {
      const courseId = getRowCourseId(row);
      counts[courseId] = (counts[courseId] || 0) + 1;
    });
    return courses
      .filter((course) => ids.has(String(course.id)))
      .slice()
      .sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" }))
      .map((course) => ({
        value: String(course.id),
        label: `${course.title || `Course ${course.id}`} (${counts[String(course.id)] || 0})`,
      }));
  }, [courses, courseworksMeta, rosterRows, courseworkById]);

  const assessmentFilterOptions = useMemo(() => {
    const courseSet = new Set(selectedCourseIds);
    const showCoursePrefix = selectedCourseIds.length !== 1;
    return courseworksMeta
      .filter((item) => !courseSet.size || courseSet.has(String(item.course)))
      .slice()
      .sort((a, b) => {
        const group = { [a.title]: [{ coursework: a.id }], [b.title]: [{ coursework: b.id }] };
        return getAssessmentDeadlineScore(a.title, group, { [String(a.id)]: a, [String(b.id)]: b })
          - getAssessmentDeadlineScore(b.title, group, { [String(a.id)]: a, [String(b.id)]: b });
      })
      .map((item) => {
        const courseTitle = courses.find((course) => String(course.id) === String(item.course))?.title;
        const count = rosterRows.filter((row) => String(row.coursework) === String(item.id)).length;
        const title = item.title || `Assessment #${item.id}`;
        const base = showCoursePrefix && courseTitle ? `${courseTitle} · ${title}` : title;
        return { value: String(item.id), label: `${base} (${count})` };
      });
  }, [courseworksMeta, courses, selectedCourseIds, rosterRows]);

  const scopedRosterRows = useMemo(() => {
    return rosterRows.filter((row) => {
      const courseId = getRowCourseId(row);
      const assessmentId = String(row.coursework || "");
      if (selectedCourseIds.length && !selectedCourseIds.includes(courseId)) return false;
      if (selectedAssessmentIds.length && !selectedAssessmentIds.includes(assessmentId)) return false;
      return true;
    });
  }, [rosterRows, selectedCourseIds, selectedAssessmentIds, courseworkById]);

  const displayRows = useMemo(
    () => scopedRosterRows.filter((row) => rowMatchesSearch(row, search) && rowMatchesStudentStatuses(row, selectedStatusFilters)),
    [scopedRosterRows, search, selectedStatusFilters]
  );

  const groupedByCourseAndCoursework = useMemo(
    () => groupRowsByCourseAndCoursework(displayRows, courseworksMeta, courses),
    [displayRows, courseworksMeta, courses]
  );

  const visibleGrouped = groupedByCourseAndCoursework;

  const statusFilterOptions = useMemo(() => {
    const counts = Object.fromEntries(STUDENT_STATUS_OPTIONS.map((option) => [option.value, 0]));
    scopedRosterRows.filter((row) => rowMatchesSearch(row, search)).forEach((row) => {
      const key = getStudentStatus(row);
      if (counts[key] != null) counts[key] += 1;
    });
    return STUDENT_STATUS_OPTIONS.map((option) => ({
      ...option,
      label: `${option.label} (${counts[option.value] || 0})`,
    }));
  }, [scopedRosterRows, search]);

  useEffect(() => {
    const allowed = new Set(assessmentFilterOptions.map((option) => option.value));
    setSelectedAssessmentIds((prev) => {
      const next = prev.filter((id) => allowed.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [assessmentFilterOptions]);

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
  const selectedRows = useMemo(
    () => displayRows.filter((row, idx) => selectedSubmissionIds[getRowSelectKey(row, idx)]),
    [displayRows, selectedSubmissionIds]
  );
  const selectedApproveRows = useMemo(() => selectedRows.filter(canApproveSubmission), [selectedRows]);
  const selectedMarkRows = useMemo(() => selectedRows.filter(canBulkMarkSubmission), [selectedRows]);
  const selectedDeleteRows = useMemo(() => selectedRows.filter(canBulkDeleteSubmission), [selectedRows]);
  const visibleSelectKeys = useMemo(
    () => displayRows.map((row, idx) => getRowSelectKey(row, idx)),
    [displayRows]
  );

  const bulkApproveSelected = async (rowList) => {
    if (bulkApproveLockRef.current) return;
    const targets = (rowList || selectedApproveRows).filter(canApproveSubmission);
    if (!targets.length) {
      notify("Select students who still need topic approval", "warning");
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
  const bulkRejectSelected = async (rowList) => {
    if (bulkRejectLockRef.current) return;
    const targets = (rowList || []).filter(canRejectSubmission);
    if (!targets.length) {
      notify("Select students whose topic still needs a decision", "warning");
      return;
    }
    bulkRejectLockRef.current = true;
    setBulkRejecting(true);
    try {
      let updated = 0;
      let failed = 0;
      await Promise.all(targets.map(async (item) => {
        const submissionId = getPrimarySubmissionId(item);
        if (!submissionId) {
          failed += 1;
          return;
        }
        try {
          await api.post(`${ENDPOINTS.submissions}${submissionId}/reject/`, null, {
            params: { scope: resolveActionScope(item) },
          });
          updated += 1;
        } catch {
          failed += 1;
        }
      }));
      notify(
        failed ? `${updated} rejected, ${failed} failed` : `${updated} topic request(s) rejected`,
        failed ? "warning" : "success"
      );
      setSelectedSubmissionIds({});
      await Promise.all([loadData(), loadWorkflowCounts(), loadSubmissionIndexRows()]);
    } catch {
      notify("Bulk reject failed", "error");
    } finally {
      setBulkRejecting(false);
      bulkRejectLockRef.current = false;
    }
  };
  const bulkSaveSelectedMarks = async (rowList) => {
    if (bulkSaveLockRef.current) return;
    const markRows = (rowList || selectedMarkRows).filter(canBulkMarkSubmission);
    if (!markRows.length) {
      notify("Select approved students to give the same marks", "warning");
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
        items: markRows.map((row) => ({
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
  const applyBulkMarksToAssessment = async (items) => {
    if (bulkSaveLockRef.current) return;
    const targets = (items || []).filter(canBulkMarkSubmission);
    if (!targets.length) {
      notify("Approve the topic first, then enter marks.", "warning");
      return;
    }
    const normalizedBulkMarks = normalizeMarksValue(bulkMarks);
    if (!normalizedBulkMarks) {
      notify("Enter marks to apply to all students", "error");
      return;
    }
    bulkSaveLockRef.current = true;
    setBulkSavingMarks(true);
    try {
      const payload = {
        items: targets.map((row) => ({
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
          : `Marks applied to ${successCount} student(s)`,
        failedCount ? "warning" : "success"
      );
      await Promise.all([loadFeedbackMap(), loadData(), loadWorkflowCounts()]);
    } catch {
      notify("Bulk marks save failed", "error");
    } finally {
      setBulkSavingMarks(false);
      bulkSaveLockRef.current = false;
    }
  };
  const bulkDeleteSelected = async (rowList) => {
    if (bulkDeleteLockRef.current) return;
    const deleteRows = (rowList || selectedDeleteRows).filter(canBulkDeleteSubmission);
    if (!deleteRows.length) {
      notify("Select submitted records to delete", "warning");
      return;
    }
    if (!confirmDelete("selected records")) {
      return;
    }
    bulkDeleteLockRef.current = true;
    setBulkDeleting(true);
    try {
      const ids = deleteRows.map((row) => getPrimarySubmissionId(row)).filter(Boolean);
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

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    resultsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedCourseIds, selectedAssessmentIds, selectedStatusFilters]);

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
      visibleSelectKeys.forEach((id) => {
        if (prev[id]) next[id] = true;
      });
      return shallowEqualObjects(prev, next) ? prev : next;
    });
  }, [visibleSelectKeys]);

  const courseSections = Object.entries(visibleGrouped).map(([courseTitle, courseworkGroup]) => {
    const assessmentTitles = sortAssessmentTitlesByComing(Object.keys(courseworkGroup), courseworkGroup, courseworkById);
    const items = assessmentTitles.flatMap((title) => courseworkGroup[title] || []).sort(compareByRollNo);
    const selectedItems = items.filter((item, idx) => selectedSubmissionIds[getRowSelectKey(item, idx)]);
    const tableAllChecked = items.length > 0 && items.every((item, idx) => selectedSubmissionIds[getRowSelectKey(item, idx)]);
    const listCanApprove = items.some(canApproveSubmission);
    const listCanReject = items.some(canRejectSubmission);
    const listCanMark = items.some(canBulkMarkSubmission);
    const listCanDelete = items.some(canBulkDeleteSubmission);
    const allWaiting = items.length > 0 && items.every((item) => item.is_topic_not_submitted);
    return {
      courseTitle,
      courseworkGroup,
      assessmentTitles,
      showAssessmentCol: assessmentTitles.length > 1,
      items,
      selectedItems,
      selectedApprove: selectedItems.filter(canApproveSubmission),
      selectedReject: selectedItems.filter(canRejectSubmission),
      selectedMark: selectedItems.filter(canBulkMarkSubmission),
      selectedDelete: selectedItems.filter(canBulkDeleteSubmission),
      tableAllChecked,
      tableSomeChecked: selectedItems.length > 0 && !tableAllChecked,
      listCanApprove,
      listCanReject,
      listCanMark,
      listCanDelete,
      allWaiting,
      showSelect: listCanApprove || listCanReject || listCanMark || listCanDelete,
      showFileCol: items.some((item) => !item.is_topic_not_submitted),
      showMarksCol: items.some((item) => canBulkMarkSubmission(item) || item.is_marked),
      showActionCol: items.some((item) => canApproveSubmission(item) || canRejectSubmission(item) || canShowRowDelete(item)),
    };
  });

  return (
    <Box sx={{ flex: 1, minHeight: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <ListingPage
      title="Assessment Approvals"
      subtitle="Filter students by course, assessment, and status. All is selected by default."
      actions={isAdminApprovalsView ? (
        <Stack direction="row" spacing={0.8}>
          <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportExcel}>CSV</Button>
          <Button size="small" variant="outlined" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportPdf}>PDF</Button>
        </Stack>
      ) : null}
      filters={(
        <SearchToolbar
          label="Search student, topic or group"
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={() => {
            setSelectedCourseIds([]);
            setSelectedAssessmentIds([]);
            setSelectedStatusFilters([]);
            resetSearch();
          }}
          filters={(
            <>
              <MultiFilterSelect
                label="Course"
                value={selectedCourseIds}
                options={courseFilterOptions}
                onChange={setSelectedCourseIds}
              />
              <MultiFilterSelect
                label="Assessment"
                value={selectedAssessmentIds}
                options={assessmentFilterOptions}
                onChange={setSelectedAssessmentIds}
                minWidth={220}
              />
              <MultiFilterSelect
                label="Student status"
                value={selectedStatusFilters}
                options={statusFilterOptions}
                onChange={setSelectedStatusFilters}
                minWidth={200}
              />
            </>
          )}
        />
      )}
      toolbar={courseSections.length ? (
        <Stack spacing={1.2} ref={resultsSectionRef}>
          {courseSections.map((section) => (
            <Box key={section.courseTitle}>
              <Typography sx={{ fontWeight: 800, color: "#13377a", mb: 1 }}>
                {section.courseTitle}
                <Typography component="span" sx={{ ml: 1, fontWeight: 600, color: "#5b6f91", fontSize: "0.82rem" }}>
                  {section.assessmentTitles.length === 1
                    ? section.assessmentTitles[0]
                    : `${section.assessmentTitles.length} assessments`}
                  {` · ${section.items.length} students`}
                </Typography>
              </Typography>
              <Box
                sx={{
                  p: 1.1,
                  borderRadius: 1.5,
                  bgcolor: section.allWaiting ? "#f8fafc" : "#f3f7ff",
                  border: "1px solid",
                  borderColor: section.allWaiting ? "#e2e8f0" : "#dbeafe",
                }}
              >
                <Stack
                  direction={{ xs: "column", lg: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ lg: "center" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: "#16356f" }}>
                      {section.showSelect
                        ? `${section.selectedItems.length} selected of ${section.items.length} students`
                        : `${section.items.length} student${section.items.length === 1 ? "" : "s"}`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#5b6f91", display: "block", mt: 0.2 }}>
                      {section.allWaiting
                        ? "Waiting for topic. Approve, marks, and delete unlock after a student submits."
                        : section.listCanApprove && !section.listCanMark
                          ? "Request for approval: approve or reject the selected students."
                          : section.listCanMark && !section.listCanApprove
                            ? "Approved work can take marks. Type in the table or give the same marks to selected students."
                            : "Only actions that match the selected students are shown."}
                    </Typography>
                  </Box>
                  {section.showSelect ? (
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="center" justifyContent="flex-end">
                      {section.listCanMark ? (
                        <>
                          <TextField
                            size="small"
                            type="number"
                            label="Marks"
                            value={bulkMarks}
                            onChange={(e) => setBulkMarks(normalizeMarksValue(e.target.value))}
                            inputProps={{ min: 0, step: 1 }}
                            sx={{ width: 88 }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            disabled={bulkSavingMarks || !section.selectedMark.length}
                            onClick={() => bulkSaveSelectedMarks(section.selectedMark)}
                          >
                            {bulkSavingMarks ? "Saving..." : `Give to selected${section.selectedMark.length ? ` (${section.selectedMark.length})` : ""}`}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={bulkSavingMarks || !section.items.filter(canBulkMarkSubmission).length}
                            onClick={() => applyBulkMarksToAssessment(section.items)}
                          >
                            {`Give to all approved (${section.items.filter(canBulkMarkSubmission).length})`}
                          </Button>
                          <Button
                            size="small"
                            variant="text"
                            disabled={savingAllMarks || !section.items.filter(canBulkMarkSubmission).length}
                            onClick={() => saveAllDraftMarks(section.items)}
                          >
                            {savingAllMarks ? "Saving..." : "Save typed marks"}
                          </Button>
                        </>
                      ) : null}
                      {section.listCanApprove ? (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={!section.selectedApprove.length}
                          onClick={() => bulkApproveSelected(section.selectedApprove)}
                        >
                          {`Approve${section.selectedApprove.length ? ` (${section.selectedApprove.length})` : ""}`}
                        </Button>
                      ) : null}
                      {section.listCanReject ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!section.selectedReject.length || bulkRejecting}
                          onClick={() => bulkRejectSelected(section.selectedReject)}
                        >
                          {bulkRejecting ? "Rejecting..." : `Reject${section.selectedReject.length ? ` (${section.selectedReject.length})` : ""}`}
                        </Button>
                      ) : null}
                      {section.listCanDelete ? (
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          disabled={!section.selectedDelete.length || bulkDeleting}
                          onClick={() => bulkDeleteSelected(section.selectedDelete)}
                        >
                          {bulkDeleting ? "Deleting..." : `Delete${section.selectedDelete.length ? ` (${section.selectedDelete.length})` : ""}`}
                        </Button>
                      ) : null}
                    </Stack>
                  ) : null}
                </Stack>
              </Box>
            </Box>
          ))}
        </Stack>
      ) : null}
      footer={displayRows.length ? (
        <Typography variant="body2" color="text.secondary" sx={{ pt: 0.8 }}>
          {displayRows.length} student{displayRows.length === 1 ? "" : "s"} in this view
        </Typography>
      ) : null}
    >
        {!courseSections.length && !loading && (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, color: "#13377a" }}>No students match these filters</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Change course, assessment, or student status, or reset to All.
            </Typography>
          </Box>
        )}
        <Stack spacing={2}>
          {courseSections.map((section) => {
            const {
              courseTitle,
              items,
              tableAllChecked,
              tableSomeChecked,
              showSelect,
              showAssessmentCol,
              showFileCol,
              showMarksCol,
              showActionCol,
            } = section;
            const tableColSpan =
              (showSelect ? 1 : 0) + 2 + (showAssessmentCol ? 1 : 0) + (showFileCol ? 1 : 0) + (showMarksCol ? 1 : 0) + (showActionCol ? 1 : 0);
            return (
            <Box key={courseTitle}>
                      <TableContainer sx={{ overflowX: "auto" }}>
                      <Table
                        size="small"
                        stickyHeader
                        sx={{
                          minWidth: showActionCol || showMarksCol ? 720 : 520,
                          "& th": { py: 0.9, fontWeight: 700, color: "#35507c", bgcolor: "#f7faff" },
                          "& td": { py: 1, verticalAlign: "middle" },
                          "& tbody tr:nth-of-type(even)": { bgcolor: "#fbfdff" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            {showSelect ? (
                              <TableCell padding="checkbox">
                                <Checkbox
                                  size="small"
                                  checked={tableAllChecked}
                                  indeterminate={tableSomeChecked}
                                  onChange={() => toggleSelectAllItems(items)}
                                />
                              </TableCell>
                            ) : null}
                            <TableCell>Student / Group</TableCell>
                            {showAssessmentCol ? <TableCell>Assessment</TableCell> : null}
                            <TableCell>Status</TableCell>
                            {showFileCol ? <TableCell>File</TableCell> : null}
                            {showMarksCol ? <TableCell>Marks</TableCell> : null}
                            {showActionCol ? <TableCell align="right">Action</TableCell> : null}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {items.map((item, idx) => {
                            const primarySubmissionId = getPrimarySubmissionId(item);
                            const isGroupRow = Boolean(item.group) && !item.force_individual_row;
                            const groupMembers = (groupsById[String(item.group)]?.members || []).filter((member) => member.accepted !== false);
                            const groupMemberRows = item.group_member_rows || [];
                            const canViewMembers =
                              !item.is_topic_not_submitted &&
                              (
                                Boolean(item.group) ||
                                (item.requested_member_ids || []).length > 0 ||
                                (item.requested_member_details || []).length > 0 ||
                                (item.requested_member_names || []).length > 0
                              );
                            const memberHintCount =
                              (item.requested_member_details || []).length ||
                              (item.requested_member_ids || []).length ||
                              (item.requested_member_names || []).length ||
                              groupMembers.length ||
                              groupMemberRows.length;
                            const canShowMarkingControls =
                              !item.is_topic_not_submitted &&
                              String(item.approval_status || "").toLowerCase() === "approved";
                            const canShowDeleteAction = canShowRowDelete(item);
                            const rowDraftKey =
                              item.force_individual_row && item.synthetic_member_row
                                ? String(item.id || `row-${item.coursework}-${item.student || idx}`)
                                : String(primarySubmissionId || item.id || idx);
                            const groupOpen = !!openGroupRows[String(primarySubmissionId)];
                            const senderName = item.student_name || item.submitted_by_name || item.student || "-";
                            const studentLabel = item.force_individual_row
                              ? senderName
                              : (item.group_name || senderName);
                            const maxMarks = courseworkById[String(item.coursework)]?.max_marks;
                            const givenMarks = feedbackBySubmission[String(primarySubmissionId)]?.marks ?? item.obtained_marks ?? "-";
                            const simpleStatus = item.is_topic_not_submitted
                              ? { label: "Waiting", color: "warning" }
                              : item.is_marked
                                ? { label: "Marked", color: "success" }
                                : item.approval_status === "rejected"
                                  ? { label: "Rejected", color: "error" }
                                  : item.approval_status === "approved"
                                    ? { label: item.file ? "Submitted" : "Approved", color: item.file ? "info" : "success" }
                                    : { label: "Request for approval", color: "warning" };

                            return (
                              <Fragment key={item.id}>
                                <TableRow>
                                  {showSelect ? (
                                    <TableCell padding="checkbox">
                                      <Checkbox
                                        size="small"
                                        checked={!!selectedSubmissionIds[getRowSelectKey(item, idx)]}
                                        onChange={() => toggleSelectSubmission(item, idx)}
                                      />
                                    </TableCell>
                                  ) : null}
                                  <TableCell>
                                    <Typography
                                      sx={{
                                        fontWeight: 700,
                                        lineHeight: 1.3,
                                        cursor: canViewMembers ? "pointer" : "default",
                                        color: canViewMembers ? "#1d4fbf" : "inherit",
                                      }}
                                      onClick={canViewMembers ? () => openSubmissionMembers(item) : undefined}
                                    >
                                      {studentLabel}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {item.topic ? item.topic : "No topic"}
                                      {canViewMembers ? ` · Sent by ${senderName}` : ""}
                                      {item.student_roll_no ? ` · ${item.student_roll_no}` : ""}
                                      {item.submitted_at ? ` · ${formatDate(item.submitted_at)}` : ""}
                                    </Typography>
                                    {canViewMembers && (
                                      <Button
                                        size="small"
                                        sx={{ px: 0, minWidth: 0, mt: 0.2 }}
                                        onClick={() => openSubmissionMembers(item)}
                                      >
                                        {memberHintCount ? `View members (${memberHintCount})` : "View members"}
                                      </Button>
                                    )}
                                  </TableCell>
                                  {showAssessmentCol ? (
                                    <TableCell>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#35507c" }}>
                                        {item.coursework_title || courseworkById[String(item.coursework)]?.title || "—"}
                                      </Typography>
                                    </TableCell>
                                  ) : null}
                                  <TableCell>
                                    <Chip size="small" color={simpleStatus.color} label={simpleStatus.label} />
                                  </TableCell>
                                  {showFileCol ? (
                                  <TableCell>
                                    {item.file ? (
                                      <Stack direction="row" spacing={0.3}>
                                        <IconButton size="small" onClick={() => openFilePreview(item)}>
                                          <VisibilityOutlinedIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => downloadFile(item)}>
                                          <DownloadRoundedIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                    ) : (
                                      <Typography variant="caption" color="text.secondary">—</Typography>
                                    )}
                                  </TableCell>
                                  ) : null}
                                  {showMarksCol ? (
                                  <TableCell>
                                    {canShowMarkingControls ? (
                                      <TextField
                                        size="small"
                                        type="number"
                                        placeholder={maxMarks ? ` / ${formatMarks(maxMarks)}` : "Marks"}
                                        value={getFeedbackDraft(item, rowDraftKey).marks}
                                        onChange={(e) => handleMarksDraftChange(item, e.target.value, rowDraftKey)}
                                        inputProps={{ min: 0, max: maxMarks || undefined, step: 1 }}
                                        sx={{ width: 88 }}
                                      />
                                    ) : (
                                      <Typography variant="body2" color="text.secondary">
                                        {item.is_marked ? formatMarks(givenMarks) : "—"}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  ) : null}
                                  {showActionCol ? (
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                                      {canApproveSubmission(item) ? (
                                        <Button size="small" color="success" variant="contained" onClick={() => approve(item)}>
                                          Approve
                                        </Button>
                                      ) : null}
                                      {canRejectSubmission(item) ? (
                                        <Button size="small" color="inherit" onClick={() => reject(item)}>
                                          Reject
                                        </Button>
                                      ) : null}
                                      {canShowDeleteAction && primarySubmissionId ? (
                                        <Button size="small" color="error" onClick={() => remove(primarySubmissionId)}>
                                          Delete
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  </TableCell>
                                  ) : null}
                                </TableRow>

                                {isGroupRow && (
                                  <TableRow>
                                    <TableCell sx={{ p: 0 }} colSpan={tableColSpan}>
                                      <Collapse in={groupOpen} timeout="auto" unmountOnExit>
                                        <Box sx={{ m: 1, p: 1, border: "1px solid #e6eefc", borderRadius: 1.2, bgcolor: "#f8fbff" }}>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.8 }}>
                                            Group members
                                          </Typography>
                                          <Table size="small">
                                            <TableHead>
                                              <TableRow>
                                                <TableCell>Name</TableCell>
                                                <TableCell>Roll No</TableCell>
                                                {canShowMarkingControls && <TableCell>Marks</TableCell>}
                                              </TableRow>
                                            </TableHead>
                                            <TableBody>
                                              {(groupMembers.length ? groupMembers : groupMemberRows)
                                                .slice()
                                                .sort(compareByRollNo)
                                                .map((member, memberIdx) => {
                                                const memberStudentId = String(member.student || member.id || "");
                                                const memberSubmission =
                                                  groupMemberRows.find((row) => String(row.student || "") === memberStudentId) ||
                                                  groupMemberRows[memberIdx] ||
                                                  item;
                                                const memberSubmissionId = getPrimarySubmissionId(memberSubmission);
                                                const memberName =
                                                  member.student_name ||
                                                  member.student_display ||
                                                  member.student_username ||
                                                  memberSubmission?.student_name ||
                                                  "-";
                                                const memberRollNo = member.student_roll_no || memberSubmission?.student_roll_no || "-";

                                                return (
                                                  <TableRow key={`${primarySubmissionId}-member-${memberStudentId || memberIdx}`}>
                                                    <TableCell>{memberName}</TableCell>
                                                    <TableCell>{memberRollNo}</TableCell>
                                                    {canShowMarkingControls && (
                                                      <TableCell sx={{ minWidth: 110 }}>
                                                        <TextField
                                                          size="small"
                                                          type="number"
                                                          value={getFeedbackDraft(memberSubmission).marks}
                                                          onChange={(e) => handleMarksDraftChange(memberSubmission, e.target.value)}
                                                          inputProps={{ min: 0, max: maxMarks || undefined, step: 1 }}
                                                        />
                                                      </TableCell>
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
                      </TableContainer>
            </Box>
            );
          })}
        </Stack>
        {loading && !isGlobalLoading && <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>}
    </ListingPage>

      <Dialog
        open={memberDialogOpen}
        onClose={handleMemberDialogClose}
        maxWidth="md"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle>{memberDialogTitle || "Group members"}</DialogTitle>
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

    </Box>
  );
};

export default SubmissionsPage;
