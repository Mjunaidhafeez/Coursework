import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { sortStudentsByRollOrUsername } from "../../utils/groupForm";
import PersonAvatar from "./PersonAvatar";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";

const normalizeMember = (member) => {
  if (typeof member === "string") {
    return { key: member, name: member, rollNo: "", avatar: null };
  }
  const name =
    member?.name ||
    member?.student_name ||
    member?.full_name ||
    member?.student_display ||
    member?.student_username ||
    `Student #${member?.student || "-"}`;
  const rollNo = member?.rollNo || member?.roll_no || member?.student_roll_no || member?.student_id || "";
  const avatar = toAbsoluteMediaUrl(member?.avatar || member?.student_avatar || null);
  const key = member?.id || member?.student || `${name}-${rollNo}`;
  return {
    key,
    name,
    rollNo,
    avatar,
    isLead: Boolean(member?.is_lead),
    activity: member?.activity || "",
  };
};

const StudentMemberList = ({ members = [], emptyText = "No members found.", compact = false }) => {
  const ordered = sortStudentsByRollOrUsername(members);
  if (!ordered.length) {
    return <Typography variant="body2" color="text.secondary">{emptyText}</Typography>;
  }

  return (
    <Stack spacing={compact ? 0.45 : 0.6}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(160px, 2fr) minmax(90px, 1fr)",
          gap: 0.6,
          px: compact ? 0.4 : 0.8,
          py: compact ? 0.25 : 0.45,
          borderRadius: 1,
          bgcolor: "#eff6ff",
          border: "1px solid #dbeafe",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#1e3a8a", fontSize: compact ? "0.62rem" : undefined }}>
          Name
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#1e3a8a", fontSize: compact ? "0.62rem" : undefined }}>
          Roll No
        </Typography>
      </Box>
      {ordered.map((member, idx) => {
        const item = normalizeMember(member);
        return (
          <Paper
            key={`${item.key}-${idx}`}
            variant="outlined"
            sx={{ px: compact ? 0.5 : 0.8, py: compact ? 0.45 : 0.7, borderColor: "#dbeafe", bgcolor: "#ffffff" }}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(90px, 1fr)", gap: 0.6, alignItems: "center" }}>
              <Stack direction="row" spacing={0.7} alignItems="center" minWidth={0}>
                <PersonAvatar person={item} src={item.avatar} name={item.name} size={compact ? 20 : 26} />
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: compact ? "0.68rem" : "0.8rem" }}>
                  {item.name}
                </Typography>
                {item.isLead ? <Chip size="small" color="primary" variant="outlined" label="Lead" sx={{ height: 18, fontSize: "0.62rem" }} /> : null}
                {item.activity ? (
                  <Chip size="small" color="success" variant="outlined" label={item.activity} sx={{ height: 18, fontSize: "0.62rem" }} />
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: compact ? "0.65rem" : undefined }}>
                {item.rollNo || "-"}
              </Typography>
            </Box>
          </Paper>
        );
      })}
    </Stack>
  );
};

export default StudentMemberList;
