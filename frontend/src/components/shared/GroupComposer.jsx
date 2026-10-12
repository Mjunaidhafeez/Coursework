import { Alert, MenuItem, Stack, TextField } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";
import { extractApiErrorMessage, extractFieldErrors } from "../../utils/apiErrors";
import {
  emptyGroupForm,
  emptyStudentFilters,
  fetchEligibleStudents,
  filtersFromProfile,
  occupancyFromStudents,
  orgFiltersFromGroup,
  studentShortLabel,
  toGroupEditForm,
  toGroupPayload,
} from "../../utils/groupForm";
import { GROUP_SCOPE_OPTIONS } from "../../utils/groupScopeOptions";
import { getUserDisplayName } from "../../utils/userDisplay";
import { classesForDepartment, fetchOrgCatalog, sectionsForClass } from "../../pages/campus/listRows";
import { compactFieldSx } from "./listingStyles";
import CompactAddForm from "./CompactAddForm";
import FormErrorSummary from "./FormErrorSummary";
import GroupMemberPicker from "./GroupMemberPicker";
import SelectPlaceholder from "./SelectPlaceholder";

const GroupComposer = ({
  mode = "manage",
  editingGroup = null,
  assignedGroupByStudentId = {},
  currentUserId = null,
  lockedProfile = null,
  blockedReason = "",
  onSaved,
  onCleared,
}) => {
  const { notify } = useUi();
  const isRequest = mode === "request";
  const lockedIds = isRequest && currentUserId ? [Number(currentUserId)] : [];
  const [form, setForm] = useState(() => (
    isRequest
      ? { ...emptyGroupForm, scope: "global", member_ids: lockedIds, lead_id: lockedIds[0] ? String(lockedIds[0]) : "" }
      : emptyGroupForm
  ));
  const [formErrors, setFormErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [courseworks, setCourseworks] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [knownStudents, setKnownStudents] = useState({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentFilters, setStudentFilters] = useState(() => (
    mode === "request" ? filtersFromProfile(lockedProfile) : emptyStudentFilters
  ));
  const [occupancy, setOccupancy] = useState({});

  const editingId = editingGroup?.id || null;
  const scopeOptions = isRequest ? GROUP_SCOPE_OPTIONS.filter((item) => item.value !== "coursework") : GROUP_SCOPE_OPTIONS;
  const visibleCourses = useMemo(() => {
    if (!isRequest || !lockedProfile?.semester) return courses;
    return courses.filter((course) => String(course.semester) === String(lockedProfile.semester));
  }, [courses, isRequest, lockedProfile]);

  const classOptions = useMemo(
    () => classesForDepartment(classes, studentFilters.department),
    [classes, studentFilters.department]
  );
  const sectionOptions = useMemo(
    () => sectionsForClass(sections, studentFilters.school_class),
    [sections, studentFilters.school_class]
  );
  const assignedMap = useMemo(() => ({ ...assignedGroupByStudentId, ...occupancy }), [assignedGroupByStudentId, occupancy]);

  const canLoadStudents =
    form.scope === "global" || (form.scope === "course" && form.course) || (form.scope === "coursework" && form.coursework);

  const resetLocal = () => {
    const nextForm = isRequest
      ? { ...emptyGroupForm, scope: "global", member_ids: lockedIds, lead_id: lockedIds[0] ? String(lockedIds[0]) : "" }
      : emptyGroupForm;
    setForm(nextForm);
    setFormErrors({});
    setStudentFilters(isRequest ? filtersFromProfile(lockedProfile) : emptyStudentFilters);
    setCourseworks([]);
  };

  useEffect(() => {
    fetchOrgCatalog(api, ENDPOINTS).then((catalog) => {
      setSemesters(catalog.semesters);
      setDepartments(catalog.departments);
      setClasses(catalog.classes);
      setSections(catalog.sections);
      setCourses(catalog.courses);
    });
  }, []);

  useEffect(() => {
    if (isRequest) {
      setStudentFilters(filtersFromProfile(lockedProfile));
      setForm((prev) => {
        const member_ids = [...new Set([...(prev.member_ids || []), ...lockedIds])];
        const leadStill = member_ids.includes(Number(prev.lead_id));
        return {
          ...prev,
          scope: prev.scope === "coursework" ? "global" : prev.scope || "global",
          member_ids,
          lead_id: leadStill ? prev.lead_id : (member_ids[0] ? String(member_ids[0]) : ""),
        };
      });
    }
  }, [isRequest, lockedProfile?.semester, lockedProfile?.department, lockedProfile?.school_class, lockedProfile?.section, currentUserId]);

  useEffect(() => {
    if (!editingGroup) {
      if (!isRequest) resetLocal();
      return;
    }
    setForm(toGroupEditForm(editingGroup));
    setFormErrors({});
    const savedOrg = orgFiltersFromGroup(editingGroup);
    const course = courses.find((row) => Number(row.id) === Number(editingGroup.course));
    setStudentFilters({
      ...(isRequest ? filtersFromProfile(lockedProfile) : emptyStudentFilters),
      semester: savedOrg.semester || (course?.semester ? String(course.semester) : ""),
      department: savedOrg.department || (course?.department ? String(course.department) : ""),
      school_class: savedOrg.school_class,
      section: savedOrg.section,
    });
    (editingGroup.members || []).forEach((member) => {
      const studentId = Number(member.student);
      if (!studentId) return;
      setKnownStudents((prev) => ({
        ...prev,
        [studentId]: prev[studentId] || {
          id: studentId,
          full_name: member.student_name,
          student_id: member.student_roll_no,
        },
      }));
    });
  }, [editingGroup, courses]);

  useEffect(() => {
    if (!form.course) {
      setCourseworks([]);
      return;
    }
    api
      .get(`${ENDPOINTS.courseworks}?course=${form.course}&page_size=200`)
      .then(({ data }) => setCourseworks(data.results || []))
      .catch(() => setCourseworks([]));
  }, [form.course]);

  useEffect(() => {
    if (!canLoadStudents) {
      setStudents([]);
      return undefined;
    }
    let cancelled = false;
    setStudentsLoading(true);
    fetchEligibleStudents(api, ENDPOINTS, {
      scope: form.scope,
      course: form.course,
      coursework: form.coursework,
      semester: studentFilters.semester,
      department: studentFilters.department,
      school_class: studentFilters.school_class,
      section: studentFilters.section,
    })
      .then((rows) => {
        if (cancelled) return;
        setStudents(rows);
        setOccupancy(occupancyFromStudents(rows));
        setKnownStudents((prev) => {
          const next = { ...prev };
          rows.forEach((student) => {
            next[Number(student.id)] = student;
          });
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setStudents([]);
          notify("Could not load students", "error");
        }
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    form.scope,
    form.course,
    form.coursework,
    studentFilters.semester,
    studentFilters.department,
    studentFilters.school_class,
    studentFilters.section,
  ]);

  const validateForm = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Group name is required";
    if (form.scope === "course" && !form.course) nextErrors.course = "Choose the course this group is for";
    if (form.scope === "coursework") {
      if (!form.course) nextErrors.course = "Choose the course first";
      if (!form.coursework) nextErrors.coursework = "Choose the assessment this group is for";
    }
    const memberIds = [...new Set([...(form.member_ids || []).map(Number), ...lockedIds])];
    if (!memberIds.length) nextErrors.member_ids = "Select at least one student";
    if (isRequest && memberIds.length < 2) nextErrors.member_ids = "Select at least one classmate besides yourself";
    if (memberIds.length && !memberIds.includes(Number(form.lead_id))) {
      nextErrors.lead_id = "Choose a group lead from the selected members";
    }
    const conflictingStudent = memberIds.find((studentId) => {
      const linked = assignedMap[Number(studentId)];
      return linked && (!editingId || Number(linked.groupId) !== Number(editingId));
    });
    if (conflictingStudent) {
      const linked = assignedMap[Number(conflictingStudent)];
      const studentObj = knownStudents[Number(conflictingStudent)] || students.find((student) => Number(student.id) === Number(conflictingStudent));
      const studentLabel = getUserDisplayName(studentObj, { includeUsername: true }) || `Student #${conflictingStudent}`;
      const state = linked.status === "pending" ? "already on a pending request for" : "already in";
      nextErrors.member_ids = `${studentLabel} is ${state} "${linked.groupName}". One student can be in only one class group.`;
    }
    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validateForm()) {
      notify("Please fill mandatory group fields", "error");
      return;
    }
    try {
      const payload = toGroupPayload(
        {
          ...form,
          member_ids: [...new Set([...(form.member_ids || []).map(Number), ...lockedIds])],
        },
        studentFilters
      );
      if (editingId) {
        await api.patch(`${ENDPOINTS.groups}${editingId}/`, payload);
        notify(isRequest ? "Group request updated" : "Group updated");
      } else {
        await api.post(ENDPOINTS.groups, payload);
        notify(isRequest ? "Group request sent for approval" : "Group added");
      }
      resetLocal();
      await onSaved?.();
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, ...extractFieldErrors(err.response?.data) }));
      notify(extractApiErrorMessage(err), "error");
    }
  };

  const applyCourseContext = (courseId) => {
    const course = visibleCourses.find((item) => String(item.id) === String(courseId));
    setForm((prev) => ({ ...prev, course: courseId, coursework: "" }));
    if (isRequest || !course) return;
    setStudentFilters((prev) => ({
      ...prev,
      semester: course.semester ? String(course.semester) : prev.semester,
      department: course.department ? String(course.department) : prev.department,
    }));
  };

  if (blockedReason) {
    return <Alert severity="warning">{blockedReason}</Alert>;
  }

  return (
    <CompactAddForm
      submitLabel={editingId ? "Update" : isRequest ? "Send request" : "Add"}
      onSubmit={submit}
      onClear={() => {
        resetLocal();
        onCleared?.();
      }}
      extra={<FormErrorSummary errors={formErrors} />}
    >
      <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ width: "100%" }}>
        <TextField required size="small" label="Group Name" value={form.name} error={Boolean(formErrors.name)} helperText={formErrors.name || ""} sx={compactFieldSx} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
        <TextField
          select
          required
          size="small"
          label="This group is for"
          value={form.scope}
          sx={compactFieldSx}
          onChange={(e) => {
            const scope = e.target.value;
            setForm((prev) => ({
              ...prev,
              scope,
              course: scope === "global" ? "" : prev.course,
              coursework: scope === "coursework" ? prev.coursework : "",
            }));
          }}
        >
          {scopeOptions.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
        </TextField>
        {form.scope !== "global" ? (
          <TextField
            select
            required
            size="small"
            label="Course"
            value={String(form.course || "")}
            error={Boolean(formErrors.course)}
            helperText={formErrors.course || ""}
            sx={compactFieldSx}
            onChange={(e) => applyCourseContext(e.target.value)}
          >
            <SelectPlaceholder items={visibleCourses} readyText="Select course" emptyText="No courses yet" />
            {visibleCourses.map((course) => (
              <MenuItem key={course.id} value={String(course.id)}>
                {course.semester_number ? `Sem ${course.semester_number} · ` : ""}{course.title}
                {course.department_name ? ` · ${course.department_name}` : ""}
              </MenuItem>
            ))}
          </TextField>
        ) : null}
        {form.scope === "coursework" ? (
          <TextField
            select
            required
            size="small"
            label="Assessment"
            value={String(form.coursework || "")}
            error={Boolean(formErrors.coursework)}
            helperText={formErrors.coursework || (!form.course ? "Choose a course first" : "")}
            sx={compactFieldSx}
            onChange={(e) => setForm((prev) => ({ ...prev, coursework: e.target.value }))}
          >
            <SelectPlaceholder items={courseworks} readyText="Select assessment" emptyText="No assessments for this course" />
            {courseworks.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.title}</MenuItem>)}
          </TextField>
        ) : null}
        {isRequest ? null : (
          <>
            <TextField select size="small" label="Semester" value={studentFilters.semester} sx={compactFieldSx} onChange={(e) => setStudentFilters((prev) => ({ ...prev, semester: e.target.value }))}>
              <SelectPlaceholder items={semesters} readyText="All semesters" emptyText="No semesters yet" />
              {semesters.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.number}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Department" value={studentFilters.department} sx={compactFieldSx} onChange={(e) => setStudentFilters((prev) => ({ ...prev, department: e.target.value, school_class: "", section: "" }))}>
              <SelectPlaceholder items={departments} readyText="All departments" emptyText="No departments yet" />
              {departments.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Class" value={studentFilters.school_class} sx={compactFieldSx} onChange={(e) => setStudentFilters((prev) => ({ ...prev, school_class: e.target.value, section: "" }))}>
              <SelectPlaceholder items={classOptions} readyText="All classes" emptyText="No classes yet" />
              {classOptions.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Section" value={studentFilters.section} sx={compactFieldSx} onChange={(e) => setStudentFilters((prev) => ({ ...prev, section: e.target.value }))}>
              <SelectPlaceholder items={sectionOptions} readyText="All sections" emptyText="No sections yet" />
              {sectionOptions.map((item) => <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>)}
            </TextField>
          </>
        )}
      </Stack>
      <GroupMemberPicker
        students={students}
        knownStudents={knownStudents}
        memberIds={form.member_ids}
        onChange={(member_ids) => setForm((prev) => {
          const nextIds = [...new Set([...lockedIds, ...member_ids.map(Number)])];
          const leadStill = nextIds.includes(Number(prev.lead_id));
          return {
            ...prev,
            member_ids: nextIds,
            lead_id: leadStill ? prev.lead_id : (nextIds[0] ? String(nextIds[0]) : ""),
          };
        })}
        assignedGroupByStudentId={assignedMap}
        editingId={editingId}
        lockedIds={lockedIds}
        error={formErrors.member_ids || ""}
        loading={studentsLoading}
        emptyHint={canLoadStudents ? "No classmates match these filters." : form.scope === "coursework" ? "Choose a course and assessment to load students." : "Choose a course to load students."}
      />
      <TextField
        required
        select
        size="small"
        label="Group lead"
        value={form.lead_id ? String(form.lead_id) : ""}
        error={Boolean(formErrors.lead_id)}
        helperText={formErrors.lead_id || ""}
        sx={compactFieldSx}
        onChange={(e) => {
          const value = e.target.value;
          setForm((prev) => ({ ...prev, lead_id: value }));
          if (formErrors.lead_id) setFormErrors((prev) => ({ ...prev, lead_id: "" }));
        }}
      >
        <MenuItem value="">Select lead</MenuItem>
        {(form.member_ids || []).map((memberId) => {
          const student = knownStudents[Number(memberId)] || students.find((row) => Number(row.id) === Number(memberId)) || { id: memberId };
          return (
            <MenuItem key={memberId} value={String(memberId)}>
              {studentShortLabel(student)}
            </MenuItem>
          );
        })}
      </TextField>
    </CompactAddForm>
  );
};

export default GroupComposer;
