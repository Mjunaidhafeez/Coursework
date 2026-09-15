import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

import { humanizeCourseworkType } from "../../utils/courseworkOptions";
import { formatDate } from "../../utils/format";

const modeLabel = {
  individual: "Individual",
  group: "Group",
  both: "Individual or group",
};

const AssessmentList = ({ grouped = [], emptyText = "No assessments found.", onEdit, onDelete }) => {
  const entries = Array.isArray(grouped) ? grouped : Object.entries(grouped);

  if (!entries.length) {
    return (
      <Box sx={{ py: 5, textAlign: "center" }}>
        <Typography sx={{ fontWeight: 700, color: "#13377a" }}>Nothing here yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {emptyText}
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={2.2}>
      {entries.map(([courseTitle, items]) => (
        <Box key={courseTitle}>
          <Typography sx={{ fontWeight: 800, color: "#13377a", mb: 1 }}>{courseTitle}</Typography>
          <Stack spacing={1}>
            {items.map((item) => (
              <Paper
                key={item.id}
                variant="outlined"
                sx={{ p: 1.4, borderColor: "#e6eefc", bgcolor: "#fff" }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  justifyContent="space-between"
                  alignItems={{ md: "center" }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: "#122a57" }}>{item.title}</Typography>
                    {item.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3, mb: 0.7 }}>
                        {item.description}
                      </Typography>
                    ) : (
                      <Box sx={{ mb: 0.7 }} />
                    )}
                    <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
                      <Chip size="small" label={humanizeCourseworkType(item.coursework_type) || "Assessment"} color="primary" variant="outlined" />
                      <Chip size="small" label={modeLabel[item.submission_type] || item.submission_type} />
                      {(item.submission_type === "group" || item.submission_type === "both") && item.max_group_members ? (
                        <Chip size="small" variant="outlined" label={`${item.max_group_members} members max`} />
                      ) : null}
                      <Chip size="small" variant="outlined" label={`${item.max_marks ?? "-"} marks`} />
                      <Chip size="small" variant="outlined" label={`Due ${formatDate(item.deadline)}`} />
                      <Chip
                        size="small"
                        color={item.approval_required ? "warning" : "default"}
                        variant="outlined"
                        label={item.approval_required ? "Topic approval" : "No topic approval"}
                      />
                      {item.lock_at_due_time ? <Chip size="small" variant="outlined" label="Locks at due" /> : null}
                      {item.auto_approve_all_students ? <Chip size="small" color="success" variant="outlined" label="Auto-approve" /> : null}
                      {item.topic_duplication_allowed ? <Chip size="small" variant="outlined" label="Same topic OK" /> : null}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.8}>
                    <Button size="small" variant="outlined" onClick={() => onEdit(item)}>
                      Edit
                    </Button>
                    <Button size="small" color="error" onClick={() => onDelete(item.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
};

export default AssessmentList;
