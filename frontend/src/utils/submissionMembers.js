import { rosterMembers } from "./groupForm";

const toDialogMember = (member) => ({
  id: member.id || member.student || member.student_id,
  student_id: member.student_id || member.student || (typeof member.id === "number" ? member.id : null),
  name: member.name || member.student_name || member.student_display || member.student_username || `Student #${member.student || member.id || "-"}`,
  roll_no: member.roll_no || member.student_roll_no || "",
  avatar: member.avatar || member.student_avatar || null,
  is_lead: Boolean(member.is_lead),
});

const selfMember = (submission) =>
  submission?.student_name
    ? [
        {
          id: submission.student || "self",
          student_id: submission.student || null,
          name: submission.student_name,
          roll_no: submission.student_roll_no || "",
          avatar: submission.student_avatar || null,
        },
      ]
    : [];

export const resolveSubmissionMembers = async (api, endpoints, submission) => {
  if (!submission) return [];

  if (submission.group) {
    if ((submission.group_member_details || []).length) {
      return submission.group_member_details.map(toDialogMember);
    }
    const { data } = await api.get(`${endpoints.groups}${submission.group}/`);
    return rosterMembers(data).map(toDialogMember);
  }

  if ((submission.requested_member_details || []).length) {
    return [...selfMember(submission), ...(submission.requested_member_details || [])];
  }

  if ((submission.requested_member_names || []).length) {
    return [
      ...selfMember(submission),
      ...(submission.requested_member_names || []).map((name, idx) => ({
        id: `requested-${idx}-${name}`,
        name,
      })),
    ];
  }

  return selfMember(submission);
};

export const withMemberFileActivity = (members = [], files = [], leadId = null) => {
  const counts = new Map();
  files.forEach((file) => {
    const key = String(file.uploaded_by || "");
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return members.map((member) => {
    const id = String(member.student_id || member.id || "");
    const count = counts.get(id) || 0;
    return {
      ...member,
      is_lead: Boolean(member.is_lead) || (leadId != null && String(leadId) === id),
      activity: count ? `Submitted ${count} file${count === 1 ? "" : "s"}` : "",
    };
  });
};
