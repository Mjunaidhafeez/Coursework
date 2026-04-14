import { Avatar, Box, Paper, Stack, Typography } from "@mui/material";

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
  return { key, name, rollNo, avatar };
};

const StudentMemberList = ({ members = [], emptyText = "No members found.", compact = false }) => {
  if (!members.length) {
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
      {members.map((member, idx) => {
        const item = normalizeMember(member);
        return (
          <Paper
            key={`${item.key}-${idx}`}
            variant="outlined"
            sx={{ px: compact ? 0.5 : 0.8, py: compact ? 0.45 : 0.7, borderColor: "#dbeafe", bgcolor: "#ffffff" }}
          >
            <Box sx={{ display: "grid", gridTemplateColumns: "minmax(160px, 2fr) minmax(90px, 1fr)", gap: 0.6, alignItems: "center" }}>
              <Stack direction="row" spacing={0.7} alignItems="center" minWidth={0}>
                <Avatar src={item.avatar} sx={{ width: compact ? 20 : 26, height: compact ? 20 : 26, bgcolor: "#1d4fbf", fontSize: compact ? "0.62rem" : "0.72rem" }}>
                  {(item.name || "S").slice(0, 1).toUpperCase()}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 700, fontSize: compact ? "0.68rem" : "0.8rem" }}>
                  {item.name}
                </Typography>
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
