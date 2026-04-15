import { Box, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import DashboardFrame from "../../components/shared/DashboardFrame";
import DashboardMetricGrid from "../../components/shared/DashboardMetricGrid";
import OpeningAssessmentsCard from "../../components/shared/OpeningAssessmentsCard";

const getCount = (res) => (res?.status === "fulfilled" ? Number(res.value?.data?.count || 0) : 0);

const TeacherDashboard = () => {
  const [stats, setStats] = useState({
    courses: 0,
    openCoursework: 0,
    pendingApprovals: 0,
    pendingGrading: 0,
    marked: 0,
  });
  const [openingAssessments, setOpeningAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  const loadData = async () => {
    const [coursesRes, openCourseworkRes, pendingApprovalsRes, pendingGradingRes, markedRes, openingListRes] = await Promise.allSettled([
      api.get(`${ENDPOINTS.courses}?page_size=1`),
      api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=request_pending&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=file_submitted&page_size=1`),
      api.get(`${ENDPOINTS.submissions}?workflow_state=marked&page_size=1`),
      api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=8&ordering=deadline`),
    ]);

    setStats({
      courses: getCount(coursesRes),
      openCoursework: getCount(openCourseworkRes),
      pendingApprovals: getCount(pendingApprovalsRes),
      pendingGrading: getCount(pendingGradingRes),
      marked: getCount(markedRes),
    });
    if (openingListRes.status === "fulfilled") {
      setOpeningAssessments(openingListRes.value?.data?.results || []);
    } else {
      setOpeningAssessments([]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const statCards = [
    { label: "My Courses", value: stats.courses, accent: "#1d4fbf" },
    { label: "My Open Assessment", value: stats.openCoursework, accent: "#2e7d32" },
    { label: "Pending Approvals", value: stats.pendingApprovals, accent: "#ef6c00" },
    { label: "Pending Gradings (Marked)", value: `${stats.pendingGrading} (${stats.marked})`, accent: "#6a1b9a", valueFontSize: "1.2rem" },
  ];

  return (
    <Stack spacing={1.2}>
      <DashboardFrame
        title="Teacher Dashboard"
        subtitle="Teaching pipeline summary and deadlines"
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "workflow", label: "Workflow" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "overview" && (
        <Stack spacing={1.2}>
          <DashboardMetricGrid metrics={statCards} />
          <OpeningAssessmentsCard
            items={openingAssessments}
            title="Opening Assessment Deadlines"
            emptyText="No opening assessment found."
          />
        </Stack>
      )}

      {activeTab === "workflow" && (
        <Box sx={{ display: "grid", gap: 1.2, gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" } }}>
          <Paper sx={{ p: 1.1, border: "1px solid #ffe0b2", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Pending Topic Approvals</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.35rem", color: "#ef6c00" }}>{stats.pendingApprovals}</Typography>
          </Paper>
          <Paper sx={{ p: 1.1, border: "1px solid #e1bee7", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Files Waiting For Grading</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.35rem", color: "#8e24aa" }}>{stats.pendingGrading}</Typography>
          </Paper>
          <Paper sx={{ p: 1.1, border: "1px solid #c8e6c9", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Marked Records</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.35rem", color: "#2e7d32" }}>{stats.marked}</Typography>
          </Paper>
        </Box>
      )}
    </Stack>
  );
};

export default TeacherDashboard;
