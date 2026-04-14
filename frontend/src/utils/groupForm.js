export const emptyGroupForm = { name: "", member_ids: [] };

export const sortStudentsByRollOrUsername = (students = []) =>
  [...students].sort((a, b) => {
    const aKey = String(a.student_id || a.username || "").toUpperCase();
    const bKey = String(b.student_id || b.username || "").toUpperCase();
    return aKey.localeCompare(bKey, undefined, { numeric: true, sensitivity: "base" });
  });

export const toGroupPayload = (form) => ({
  name: form.name,
  scope: "global",
  member_ids: (form.member_ids || []).map(Number),
});

export const toGroupEditForm = (group) => ({
  name: group.name || "",
  member_ids: (group.members || []).map((member) => member.student),
});

export const fetchGlobalEligibleStudents = async (api, ENDPOINTS) => {
  const { data } = await api.get(`${ENDPOINTS.groups}eligible_students/?scope=global`);
  return data || [];
};
