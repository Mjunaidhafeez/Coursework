import { Box, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import StatCard from "../../components/StatCard";

const getCount = (res) => (res?.status === "fulfilled" ? Number(res.value?.data?.count || 0) : 0);

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    courses: 0,
    openCoursework: 0,
    pendingApprovals: 0,
    pendingGrading: 0,
    marked: 0,
  });

  const loadData = async () => {
    const [coursesRes, openCourseworkRes, pendingApprovalsRes, pendingGradingRes, markedRes] = await Promise.allSettled([
      api.get(`${ENDPOINTS.courses}?page_size=1`),
      api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=request_pending&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=file_submitted&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=marked&page_size=1`),
    ]);

    setStats({
      courses: getCount(coursesRes),
      openCoursework: getCount(openCourseworkRes),
      pendingApprovals: getCount(pendingApprovalsRes),
      pendingGrading: getCount(pendingGradingRes),
      marked: getCount(markedRes),
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    { label: "My Courses", value: stats.courses, accent: "#1d4fbf" },
    { label: "My Open Coursework", value: stats.openCoursework, accent: "#2e7d32" },
    { label: "Pending Approvals", value: stats.pendingApprovals, accent: "#ef6c00" },
    { label: "Pending Gradings (Marked)", value: `${stats.pendingGrading} (${stats.marked})`, accent: "#6a1b9a", valueFontSize: "1.2rem" },
  ];

  return (
    <Stack spacing={1.2}>
      <Paper
        sx={{
          p: 1.25,
          border: "1px solid #dbeafe",
          borderRadius: 2,
          background: "linear-gradient(130deg, #eff6ff 0%, #f8fbff 55%, #eef2ff 100%)",
        }}
      >
        <Typography className="premium-heading-soft" sx={{ fontWeight: 900, fontSize: "1.06rem" }}>Teacher Dashboard</Typography>
        <Typography variant="body2" sx={{ color: "#3e4d73" }}>
          Quick academic workflow snapshot
        </Typography>
      </Paper>
      <Box
        sx={{
          display: "grid",
          gap: 1.2,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
        }}
      >
        {statCards.map((card) => (
          <Box key={card.label}>
            <StatCard
              label={card.label}
              value={card.value}
              accent={card.accent}
              valueFontSize={card.valueFontSize}
            />
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

export default TeacherDashboard;
