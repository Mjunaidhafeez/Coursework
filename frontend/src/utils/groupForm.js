export const emptyGroupForm = {
  name: "",
  scope: "course",
  course: "",
  coursework: "",
  member_ids: [],
};

export const emptyStudentFilters = {
  semester: "",
  department: "",
  school_class: "",
  section: "",
  search: "",
};

export const sortStudentsByRollOrUsername = (students = []) =>
  [...students].sort((a, b) => {
    const aKey = String(a.student_id || a.username || "").toUpperCase();
    const bKey = String(b.student_id || b.username || "").toUpperCase();
    return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: "base" });
  });

export const toGroupPayload = (form) => {
  const scope = form.scope || "global";
  return {
    name: (form.name || "").trim(),
    scope,
    course: scope === "global" ? null : form.course || null,
    coursework: scope === "coursework" ? form.coursework || null : null,
    member_ids: (form.member_ids || []).map(Number),
  };
};

export const toGroupEditForm = (group) => ({
  name: group.name || "",
  scope: group.scope || "global",
  course: group.course || "",
  coursework: group.coursework || "",
  member_ids: (group.members || []).map((member) => member.student),
});

export const fetchEligibleStudents = async (api, endpoints, filters = {}) => {
  const params = new URLSearchParams();
  params.set("scope", filters.scope || "global");
  ["course", "coursework", "semester", "department", "school_class", "section", "search"].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });
  const { data } = await api.get(`${endpoints.groups}eligible_students/?${params.toString()}`);
  return data || [];
};

export const studentOrgLabel = (student) =>
  [
    student.semester_number ? `Sem ${student.semester_number}` : "",
    student.department_name || "",
    student.school_class_name || "",
    student.section_name || "",
  ]
    .filter(Boolean)
    .join(" · ");

export const filtersFromProfile = (profile) => ({
  semester: profile?.semester ? String(profile.semester) : "",
  department: profile?.department ? String(profile.department) : "",
  school_class: profile?.school_class ? String(profile.school_class) : "",
  section: profile?.section ? String(profile.section) : "",
  search: "",
});

export const occupancyFromGroups = (groups = [], ignoreGroupId = null) => {
  const map = {};
  groups.forEach((group) => {
    if (!["pending", "approved"].includes(String(group.status || "").toLowerCase())) return;
    if (ignoreGroupId && Number(group.id) === Number(ignoreGroupId)) return;
    (group.members || []).forEach((member) => {
      if (String(member.invitation_status || "").toLowerCase() === "rejected") return;
      const studentId = Number(member.student);
      if (!studentId || map[studentId]) return;
      map[studentId] = {
        groupId: Number(group.id),
        groupName: group.name || `Group #${group.id}`,
        status: group.status,
      };
    });
  });
  return map;
};

export const occupancyFromStudents = (students = []) => {
  const map = {};
  students.forEach((student) => {
    if (!student.assigned_group_id) return;
    map[Number(student.id)] = {
      groupId: Number(student.assigned_group_id),
      groupName: student.assigned_group_name,
      status: student.assigned_group_status,
    };
  });
  return map;
};

export const findStudentGroupLock = (groups, userId) =>
  (groups || []).find((group) => {
    if (!["pending", "approved"].includes(String(group.status || "").toLowerCase())) return false;
    if (Number(group.creator) === Number(userId)) return true;
    return (group.members || []).some(
      (member) =>
        Number(member.student) === Number(userId) && String(member.invitation_status || "").toLowerCase() !== "rejected"
    );
  });

export const postGroupDecision = (api, endpoints, id, decision) => api.post(`${endpoints.groups}${id}/${decision}/`);
