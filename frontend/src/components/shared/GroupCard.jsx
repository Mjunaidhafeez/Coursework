import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { describeGroupScope } from "../../utils/groupScopeOptions";
import { getGroupStatusColor } from "../../utils/groupOptions";
import StudentMemberList from "./StudentMemberList";

const GroupCard = ({ group, leading = null, badge = null, actions = null, showStatus = true }) => (
  <Paper variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", borderRadius: 1.5, bgcolor: "#fafcff" }}>
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 0.7 }} spacing={1}>
      <Stack direction="row" spacing={0.5} alignItems="flex-start" minWidth={0}>
        {leading}
        <Box minWidth={0}>
          <Typography sx={{ fontWeight: 800 }}>{group.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {describeGroupScope(group)}
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={0.5} alignItems="center">
        {showStatus ? (
          <Chip
            size="small"
            label={group.status || "pending"}
            color={getGroupStatusColor(group.status)}
            variant="outlined"
          />
        ) : null}
        {badge}
      </Stack>
    </Stack>
    <StudentMemberList members={group.members || []} compact />
    {actions ? (
      <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 0.8 }}>
        {actions}
      </Stack>
    ) : null}
  </Paper>
);

export default GroupCard;
