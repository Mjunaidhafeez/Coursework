export const resolveSubmissionMembers = async (api, endpoints, submission) => {
  if (!submission) return [];

  if ((submission.requested_member_details || []).length) {
    const firstMember = submission.student_name
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
    return [...firstMember, ...(submission.requested_member_details || [])];
  }

  if ((submission.requested_member_names || []).length) {
    return [
      ...(submission.student_name
        ? [
            {
              id: submission.student || "self",
              student_id: submission.student || null,
              name: submission.student_name,
              roll_no: submission.student_roll_no || "",
              avatar: submission.student_avatar || null,
            },
          ]
        : []),
      ...(submission.requested_member_names || []).map((name, idx) => ({
        id: `requested-${idx}-${name}`,
        name,
      })),
    ];
  }

  if (submission.group) {
    const { data } = await api.get(`${endpoints.groups}${submission.group}/`);
    return (data.members || []).map((member) => ({
      id: member.id || member.student,
      student_id: member.student || null,
      name: member.student_name || member.student_display || member.student_username || `Student #${member.student || "-"}`,
      roll_no: member.student_roll_no || "",
      avatar: member.student_avatar || null,
    }));
  }

  if (submission.student_name) {
    return [
      {
        id: submission.student || "self",
        student_id: submission.student || null,
        name: submission.student_name,
        roll_no: submission.student_roll_no || "",
        avatar: submission.student_avatar || null,
      },
    ];
  }

  return [];
};
