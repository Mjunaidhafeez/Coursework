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
  IconButton,
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
import CompactTabs from "../../components/shared/CompactTabs";
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

const rowMatchesWorkflowState = (row, filter) => {
  if (!filter) return true;
  if (filter === "topic_not_submitted") return Boolean(row.is_topic_not_submitted);
  if (filter === "request_pending") {
    return !row.is_topic_not_submitted && !row.is_marked && row.approval_status !== "approved" && row.approval_status !== "rejected";
  }
  if (filter === "ready_for_upload") {
    return !row.is_topic_not_submitted && String(row.approval_status || "").toLowerCase() === "approved" && !row.file && !row.is_marked;
  }
  if (filter === "file_submitted") {
    return !row.is_topic_not_submitted && Boolean(row.file) && !row.is_marked;
  }
  if (filter === "marked") return Boolean(row.is_marked);
  return true;
};

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
  const [workflowFilter, setWorkflowFilter] = useState("");
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
  const [savingAllMarks, setSavingAllMarks] = useState(false);
  const [selectedCourseworkByCourse, setSelectedCourseworkByCourse] = useState({});
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
    params.append("ordering", "student__username");
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);
    if (workflowFilter && workflowFilter !== "topic_not_submitted") params.append("workflow_state", workflowFilter);
    params.append("page", String(page));
    params.append("page_size", String(pageSize));
    const { data } = await api.get(`${ENDPOINTS.submissions}?${params.toString()}`);
    return data;
  };

  const { rows, search, setSearch, loading, runSearch, resetSearch, setRows, loadData } =
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

  const groupedByCourseAndCoursework = useMemo(
    () => groupRowsByCourseAndCoursework(rosterRows, courseworksMeta, courses),
    [rosterRows, courseworksMeta, courses]
  );

  useEffect(() => {
    setSelectedCourseworkByCourse((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.entries(groupedByCourseAndCoursework).forEach(([courseTitle, courseworkGroup]) => {
        const titles = Object.keys(courseworkGroup);
        if (!titles.length) return;
        const comingTitle = sortAssessmentTitlesByComing(titles, courseworkGroup, courseworkById)[0];
        if (!next[courseTitle] || !courseworkGroup[next[courseTitle]]) {
          next[courseTitle] = comingTitle;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [groupedByCourseAndCoursework, courseworkById]);

  const selectedRosterRows = useMemo(() => {
    const list = [];
    Object.entries(groupedByCourseAndCoursework).forEach(([courseTitle, courseworkGroup]) => {
      const titles = Object.keys(courseworkGroup);
      if (!titles.length) return;
      const selected = selectedCourseworkByCourse[courseTitle] || sortAssessmentTitlesByComing(titles, courseworkGroup, courseworkById)[0];
      (courseworkGroup[selected] || []).forEach((row) => list.push(row));
    });
    return list;
  }, [groupedByCourseAndCoursework, selectedCourseworkByCourse, courseworkById]);

  const displayRows = useMemo(() => {
    const filtered = selectedRosterRows.filter((row) => rowMatchesWorkflowState(row, workflowFilter) && rowMatchesSearch(row, search));
    if (workflowFilter !== "marked") return filtered;
    return filtered.flatMap((row) => {
      if ((row.group_member_rows || []).length > 1) {
        return row.group_member_rows.map((member) => ({
          ...member,
          force_individual_row: true,
          submission_id: member.submission_id || member.id,
        }));
      }
      return [{ ...row, force_individual_row: true }];
    });
  }, [selectedRosterRows, workflowFilter, search]);

  const filterCounts = useMemo(() => {
    const searchable = selectedRosterRows.filter((row) => rowMatchesSearch(row, search));
    return {
      all: searchable.length,
      request_pending: searchable.filter((row) => rowMatchesWorkflowState(row, "request_pending")).length,
      topic_not_submitted: searchable.filter((row) => rowMatchesWorkflowState(row, "topic_not_submitted")).length,
      ready_for_upload: searchable.filter((row) => rowMatchesWorkflowState(row, "ready_for_upload")).length,
      file_submitted: searchable.filter((row) => rowMatchesWorkflowState(row, "file_submitted")).length,
      marked: searchable.filter((row) => rowMatchesWorkflowState(row, "marked")).length,
    };
  }, [selectedRosterRows, search]);

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
    <Stack spacing={1}>
    <ListingPage
      title={isAdminApprovalsView ? "Assessment Approvals" : "Assessment Approvals"}
      subtitle="All students of the current assessment, with status. Use the filters to see waiting, approved, submitted, or marked work."
      tabs={(
        <CompactTabs
          value={workflowFilter || "all"}
          onChange={(next) => setWorkflowFilter(next === "all" ? "" : next)}
          tabs={[
            { value: "all", label: `All (${filterCounts.all || 0})` },
            { value: "topic_not_submitted", label: `Waiting (${filterCounts.topic_not_submitted || 0})` },
            { value: "request_pending", label: `Topics (${filterCounts.request_pending || 0})` },
            { value: "ready_for_upload", label: `Approved (${filterCounts.ready_for_upload || 0})` },
            { value: "file_submitted", label: `Files (${filterCounts.file_submitted || 0})` },
            { value: "marked", label: `Marked (${filterCounts.marked || 0})` },
          ]}
        />
      )}
      filters={(
        <SearchToolbar
          label="Search name, topic or group"
          search={search}
          onSearchChange={setSearch}
          onSearch={runSearch}
          onReset={resetSearch}
          actions={isAdminApprovalsView ? (
            <>
              <Button size="small" variant="outlined" startIcon={<DownloadRoundedIcon fontSize="small" />} onClick={exportExcel}>CSV</Button>
              <Button size="small" variant="outlined" startIcon={<PictureAsPdfRoundedIcon fontSize="small" />} onClick={exportPdf}>PDF</Button>
            </>
          ) : null}
        />
      )}
    >
        {selectedCount > 0 && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
            sx={{ mb: 1.2, p: 1, borderRadius: 1.5, bgcolor: "#f3f7ff", border: "1px solid #dbeafe" }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#16356f" }}>
              {selectedCount} selected
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={0.8} alignItems={{ sm: "center" }}>
              {selectedMarkRows.length > 0 && (
                <>
                  <TextField
                    size="small"
                    type="number"
                    label="Bulk marks"
                    value={bulkMarks}
                    onChange={(e) => setBulkMarks(normalizeMarksValue(e.target.value))}
                    inputProps={{ min: 0, step: 1 }}
                    sx={{ width: 110 }}
                  />
                  <Button size="small" variant="contained" disabled={bulkSavingMarks} onClick={bulkSaveSelectedMarks}>
                    {bulkSavingMarks ? "Saving..." : "Apply to selected"}
                  </Button>
                </>
              )}
              <Button size="small" variant="contained" color="success" disabled={!selectedApproveRows.length} onClick={bulkApproveSelected}>
                Approve
              </Button>
              {isAdminApprovalsView && (
                <Button size="small" color="error" disabled={!selectedDeleteRows.length || bulkDeleting} onClick={bulkDeleteSelected}>
                  {bulkDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </Stack>
          </Stack>
        )}
        {!Object.keys(groupedByCourseAndCoursework).length && !loading && (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, color: "#13377a" }}>No students in this filter</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Switch to All to see every student, or pick another status for this assessment.
            </Typography>
          </Box>
        )}
        <Stack spacing={2} ref={resultsSectionRef}>
          {Object.entries(groupedByCourseAndCoursework).map(([courseTitle, courseworkGroup]) => {
            const assessmentTitles = sortAssessmentTitlesByComing(Object.keys(courseworkGroup), courseworkGroup, courseworkById);
            const selectedTitle = selectedCourseworkByCourse[courseTitle] || assessmentTitles[0];
            const rawItems = (courseworkGroup[selectedTitle] || []).filter(
              (row) => rowMatchesWorkflowState(row, workflowFilter) && rowMatchesSearch(row, search)
            );
            const items = workflowFilter === "marked"
              ? rawItems.flatMap((row) => {
                  if ((row.group_member_rows || []).length > 1) {
                    return row.group_member_rows.map((member) => ({
                      ...member,
                      force_individual_row: true,
                      submission_id: member.submission_id || member.id,
                    }));
                  }
                  return [{ ...row, force_individual_row: true }];
                })
              : rawItems;
            const canSaveMarks = items.some(
              (item) =>
                !item.is_topic_not_submitted &&
                String(item.approval_status || "").toLowerCase() === "approved"
            );
            return (
            <Box key={courseTitle}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 800, color: "#13377a" }}>
                  {courseTitle}
                </Typography>
                {canSaveMarks && (
                  <Stack direction="row" spacing={0.8} alignItems="center" useFlexGap flexWrap="wrap">
                    <TextField
                      size="small"
                      type="number"
                      label="Bulk marks"
                      value={bulkMarks}
                      onChange={(e) => setBulkMarks(normalizeMarksValue(e.target.value))}
                      inputProps={{ min: 0, step: 1 }}
                      sx={{ width: 110 }}
                    />
                    <Button size="small" variant="outlined" disabled={bulkSavingMarks} onClick={() => applyBulkMarksToAssessment(items)}>
                      {bulkSavingMarks ? "Saving..." : "Apply to all"}
                    </Button>
                    <Button size="small" variant="contained" disabled={savingAllMarks} onClick={() => saveAllDraftMarks(items)}>
                      {savingAllMarks ? "Saving..." : "Save marks"}
                    </Button>
                  </Stack>
                )}
              </Stack>
              {assessmentTitles.length > 1 ? (
                <Box sx={{ mb: 1.2 }}>
                  <CompactTabs
                    value={selectedTitle}
                    onChange={(next) => setSelectedCourseworkByCourse((prev) => ({ ...prev, [courseTitle]: next }))}
                    tabs={assessmentTitles.map((title) => ({
                      value: title,
                      label: `${title} (${(courseworkGroup[title] || []).filter((row) => rowMatchesWorkflowState(row, workflowFilter) && rowMatchesSearch(row, search)).length})`,
                    }))}
                  />
                </Box>
              ) : (
                <Typography sx={{ fontWeight: 700, color: "#35507c", mb: 0.8 }}>
                  {selectedTitle}
                </Typography>
              )}
                      <TableContainer sx={{ overflowX: "auto" }}>
                      <Table
                        size="small"
                        sx={{
                          minWidth: 720,
                          "& th": { py: 0.9, fontWeight: 700, color: "#35507c", bgcolor: "#f7faff" },
                          "& td": { py: 1, verticalAlign: "middle" },
                          "& tbody tr:nth-of-type(even)": { bgcolor: "#fbfdff" },
                        }}
                      >
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox">
                              <Checkbox
                                size="small"
                                checked={allSelectableChecked}
                                indeterminate={selectedCount > 0 && !allSelectableChecked}
                                onChange={toggleSelectAllVisible}
                              />
                            </TableCell>
                            <TableCell>Student / Group</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>File</TableCell>
                            <TableCell>Marks</TableCell>
                            <TableCell align="right">Action</TableCell>
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
                            const canShowDeleteAction =
                              isAdminApprovalsView ||
                              !["ready_for_upload", "file_submitted", "marked"].includes(workflowFilter);
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
                                    : { label: "Needs approval", color: "warning" };

                            return (
                              <Fragment key={item.id}>
                                <TableRow>
                                  <TableCell padding="checkbox">
                                    <Checkbox
                                      size="small"
                                      disabled={!canSelectSubmission(item)}
                                      checked={!!selectedSubmissionIds[String(primarySubmissionId)]}
                                      onChange={() => toggleSelectSubmission(item)}
                                    />
                                  </TableCell>
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
                                  <TableCell>
                                    <Chip size="small" color={simpleStatus.color} label={simpleStatus.label} />
                                  </TableCell>
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
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={0.6} justifyContent="flex-end">
                                      {!item.is_topic_not_submitted && !item.is_marked && item.approval_status !== "approved" && (
                                        <Button size="small" color="success" variant="contained" onClick={() => approve(item)}>
                                          Approve
                                        </Button>
                                      )}
                                      {!item.is_topic_not_submitted && !item.is_marked && item.approval_status !== "rejected" && item.approval_status !== "approved" && (
                                        <Button size="small" color="inherit" onClick={() => reject(item)}>
                                          Reject
                                        </Button>
                                      )}
                                      {canShowDeleteAction && primarySubmissionId && (
                                        <Button size="small" color="error" onClick={() => remove(primarySubmissionId)}>
                                          Delete
                                        </Button>
                                      )}
                                    </Stack>
                                  </TableCell>
                                </TableRow>

                                {isGroupRow && (
                                  <TableRow>
                                    <TableCell sx={{ p: 0 }} colSpan={6}>
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
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {displayRows.length} student{displayRows.length === 1 ? "" : "s"} in this view
        </Typography>
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

    </Stack>
  );
};

export default SubmissionsPage;
