import { getUserDisplayName } from "./userDisplay";

export const emptyGroupForm = {
  name: "",
  scope: "course",
  course: "",
  coursework: "",
  member_ids: [],
  lead_id: "",
};

export const emptyStudentFilters = {
  semester: "",
  department: "",
  school_class: "",
  section: "",
};

const localeSort = { numeric: true, sensitivity: "base" };

const personRoll = (row) =>
  String(row?.student_id || row?.student_roll_no || row?.roll_no || row?.rollNo || row?.username || "").trim();

const personName = (row) =>
  String(
    row?.full_name
    || row?.student_name
    || row?.name
    || `${row?.first_name || ""} ${row?.last_name || ""}`.trim()
    || row?.username
    || ""
  ).trim();

export const sortStudentsByRollOrUsername = (students = []) =>
  [...students].sort((a, b) => {
    const roll = personRoll(a).localeCompare(personRoll(b), undefined, localeSort);
    if (roll) return roll;
    return personName(a).localeCompare(personName(b), undefined, localeSort);
  });

const orgIdOrNull = (value) => (value ? value : null);

export const orgFiltersFromGroup = (group = {}) => ({
  semester: group.semester ? String(group.semester) : "",
  department: group.department ? String(group.department) : "",
  school_class: group.school_class ? String(group.school_class) : "",
  section: group.section ? String(group.section) : "",
});

export const toGroupPayload = (form, filters = {}) => {
  const scope = form.scope || "global";
  const org = { ...emptyStudentFilters, ...filters };
  return {
    name: (form.name || "").trim(),
    scope,
    course: scope === "global" ? null : form.course || null,
    coursework: scope === "coursework" ? form.coursework || null : null,
    semester: orgIdOrNull(org.semester),
    department: orgIdOrNull(org.department),
    school_class: orgIdOrNull(org.school_class),
    section: orgIdOrNull(org.section),
    member_ids: (form.member_ids || []).map(Number),
    lead_id: form.lead_id ? Number(form.lead_id) : null,
  };
};

export const leadIdFromGroup = (group) => {
  const lead = (group.members || []).find((member) => member.is_lead);
  if (lead?.student) return String(lead.student);
  if (group.lead_id) return String(group.lead_id);
  return "";
};

export const toGroupEditForm = (group) => ({
  name: group.name || "",
  scope: group.scope || "global",
  course: group.course || "",
  coursework: group.coursework || "",
  member_ids: (group.members || []).map((member) => member.student),
  lead_id: leadIdFromGroup(group) || (group.members?.[0]?.student ? String(group.members[0].student) : ""),
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

export const studentNameRollLabel = (student) => {
  const name = getUserDisplayName(student) || `#${student.id}`;
  const roll = student.student_id || student.username || "No roll no";
  return `${name} · ${roll}`;
};

export const rollSuffix = (student) => {
  const roll = String(student?.student_id || student?.username || "");
  const digits = roll.replace(/\D/g, "");
  if (digits.length >= 2) return digits.slice(-2);
  return roll.slice(-2);
};

export const studentShortLabel = (student) => {
  const name = getUserDisplayName(student) || `#${student?.id}`;
  const first = String(name).trim().split(/\s+/)[0] || name;
  const suffix = rollSuffix(student);
  return suffix ? `${first} ${suffix}` : first;
};

export const filtersFromProfile = (profile) => ({
  semester: profile?.semester ? String(profile.semester) : "",
  department: profile?.department ? String(profile.department) : "",
  school_class: profile?.school_class ? String(profile.school_class) : "",
  section: profile?.section ? String(profile.section) : "",
});

export const isRejectedMember = (member) =>
  String(member?.invitation_status || "").toLowerCase() === "rejected";

export const rosterMembers = (group) =>
  (group?.members || []).filter((member) => !isRejectedMember(member));

export const occupancyFromGroups = (groups = [], ignoreGroupId = null) => {
  const map = {};
  groups.forEach((group) => {
    if (!["pending", "approved"].includes(String(group.status || "").toLowerCase())) return;
    if (ignoreGroupId && Number(group.id) === Number(ignoreGroupId)) return;
    rosterMembers(group).forEach((member) => {
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
    return rosterMembers(group).some((member) => Number(member.student) === Number(userId));
  });

export const postGroupDecision = (api, endpoints, id, decision) => api.post(`${endpoints.groups}${id}/${decision}/`);
