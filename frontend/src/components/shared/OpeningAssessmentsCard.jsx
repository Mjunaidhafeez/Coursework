import { Box, Chip, Paper, Stack, Typography } from "@mui/material";

import { formatDate } from "../../utils/format";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TWO_DAYS_MS = 2 * ONE_DAY_MS;

const getUrgencyMeta = (deadline) => {
  const dueAt = new Date(deadline).getTime();
  if (Number.isNaN(dueAt)) {
    return {
      label: "Unknown",
      color: "#455a64",
      border: "#cfd8dc",
      background: "#f8fafc",
    };
  }

  const diff = dueAt - Date.now();
  if (diff <= ONE_DAY_MS) {
    return {
      label: "Urgent (24h)",
      color: "#c62828",
      border: "#ffcdd2",
      background: "#fff5f5",
    };
  }
  if (diff <= TWO_DAYS_MS) {
    return {
      label: "Due Soon (2d)",
      color: "#ed6c02",
      border: "#ffe0b2",
      background: "#fffaf2",
    };
  }
  return {
    label: "On Track",
    color: "#2e7d32",
    border: "#c8e6c9",
    background: "#f5fff7",
  };
};

const OpeningAssessmentsCard = ({ items = [], title = "Opening Assessment Deadlines", emptyText = "No opening assessment found." }) => {
  return (
    <Paper sx={{ p: 1.2, borderRadius: 2, border: "1px solid #dbeafe", bgcolor: "#f8fbff" }}>
      <Typography className="premium-heading-soft" sx={{ fontWeight: 800, mb: 0.9 }}>
        {title}
      </Typography>
      <Stack spacing={0.75}>
        {items.length ? (
          items.map((item) => {
            const urgency = getUrgencyMeta(item.deadline);
            return (
              <Box
                key={item.id}
                sx={{
                  px: 1,
                  py: 0.85,
                  borderRadius: 1.2,
                  border: `1px solid ${urgency.border}`,
                  bgcolor: urgency.background,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.8}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#5b6785" }} noWrap>
                      {item.course_title || "-"}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.6} alignItems="center" sx={{ flexShrink: 0 }}>
                    <Chip
                      size="small"
                      label={formatDate(item.deadline)}
                      sx={{ bgcolor: "#fff", border: "1px solid #dbe7fb", fontWeight: 700 }}
                    />
                    <Chip
                      size="small"
                      label={urgency.label}
                      sx={{ color: urgency.color, borderColor: urgency.border, bgcolor: "#fff", fontWeight: 700 }}
                      variant="outlined"
                    />
                  </Stack>
                </Stack>
              </Box>
            );
          })
        ) : (
          <Typography variant="body2" color="text.secondary">
            {emptyText}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
};

export default OpeningAssessmentsCard;
