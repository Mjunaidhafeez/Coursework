import { Box, Button, Checkbox, Chip, Paper, Stack, Typography } from "@mui/material";

import { humanizeCourseworkType } from "../../utils/courseworkOptions";
import { shouldAllotTopics, TOPIC_SOURCE_TEACHER_GROUP } from "../../utils/courseworkForm";
import { formatDate } from "../../utils/format";
import { toAbsoluteMediaUrl } from "../../utils/mediaUrl";

const modeLabel = {
  individual: "Individual",
  group: "Group",
  both: "Individual or group",
};

const AssessmentList = ({ grouped = [], emptyText = "No assessments found.", onEdit, onDelete, onAllot, isSelected, onToggle }) => {
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
                      {item.max_marks != null && item.max_marks !== "" ? (
                        <Chip size="small" variant="outlined" label={`${item.max_marks} marks`} />
                      ) : null}
                      <Chip size="small" variant="outlined" label={`Due ${formatDate(item.deadline)}`} />
                      {shouldAllotTopics(item) ? (
                        <Chip
                          size="small"
                          color="info"
                          variant="outlined"
                          label={item.topic_source === TOPIC_SOURCE_TEACHER_GROUP ? "Teacher allots per group" : "Teacher allots per student"}
                        />
                      ) : (
                        <>
                          <Chip
                            size="small"
                            color={item.approval_required ? "warning" : "default"}
                            variant="outlined"
                            label={item.approval_required ? "Topic approval" : "No topic approval"}
                          />
                          {item.auto_approve_all_students ? <Chip size="small" color="success" variant="outlined" label="Auto-approve" /> : null}
                          {item.topic_duplication_allowed ? <Chip size="small" variant="outlined" label="Same topic OK" /> : null}
                        </>
                      )}
                      {item.lock_at_due_time ? <Chip size="small" variant="outlined" label="Locks at due" /> : null}
                      {item.sample_file_url ? (
                        <Chip
                          size="small"
                          clickable
                          component="a"
                          href={toAbsoluteMediaUrl(item.sample_file_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="success"
                          variant="outlined"
                          label={item.sample_file_name ? `Sample: ${item.sample_file_name}` : "Sample file"}
                        />
                      ) : null}
                    </Stack>
                  </Box>
                  <Stack direction="row" spacing={0.8} alignItems="center">
                    {onToggle ? (
                      <Checkbox size="small" checked={Boolean(isSelected?.(item.id))} onChange={() => onToggle(item.id)} />
                    ) : null}
                    {onAllot && shouldAllotTopics(item) ? (
                      <Button size="small" variant="contained" onClick={() => onAllot(item)}>
                        Allot topics
                      </Button>
                    ) : null}
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
