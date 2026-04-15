import { Box, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import DashboardFrame from "../../components/shared/DashboardFrame";
import DashboardMetricGrid from "../../components/shared/DashboardMetricGrid";
import OpeningAssessmentsCard from "../../components/shared/OpeningAssessmentsCard";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, openCoursework: 0, pendingApprovals: 0, courses: 0, groups: 0 });
  const [openingAssessments, setOpeningAssessments] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      const [studentsRes, coursesRes, openCourseworksRes, pendingApprovalsRes, allGroupsRes, openingListRes] = await Promise.all([
        api.get(`${ENDPOINTS.users}?role=student&page_size=1`),
        api.get(ENDPOINTS.courses),
        api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=1`),
        api.get(`${ENDPOINTS.submissions}?workflow_state=request_pending&page_size=1`),
        api.get(`${ENDPOINTS.groups}?page_size=1`),
        api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=8&ordering=deadline`),
      ]);
      const students = studentsRes.data.count || 0;

      setStats({
        students,
        openCoursework: openCourseworksRes.data.count || 0,
        pendingApprovals: pendingApprovalsRes.data.count || 0,
        courses: coursesRes.data.count || 0,
        groups: allGroupsRes.data.count || 0,
      });
      setOpeningAssessments(openingListRes.data.results || []);
    };

    load();
  }, []);

  const metrics = [
    { label: "Total Students", value: stats.students, accent: "#1d4fbf" },
    { label: "Open Assessment", value: stats.openCoursework, accent: "#2e7d32" },
    { label: "Pending Approvals", value: stats.pendingApprovals, accent: "#ef6c00" },
    { label: "Active Courses", value: stats.courses, accent: "#c62828" },
    { label: "Total Groups", value: stats.groups, accent: "#1565c0" },
  ];

  return (
    <Stack spacing={1.2}>
      <DashboardFrame
        title="Admin Dashboard"
        subtitle="Real-time academic operations overview"
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "workflow", label: "Workflow" },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {activeTab === "overview" && (
        <Stack spacing={1.2}>
          <DashboardMetricGrid
            metrics={metrics}
            columns={{ xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(5, minmax(0, 1fr))" }}
          />
          <Paper sx={{ p: 1.1, border: "1px solid #dbeafe", borderRadius: 2, bgcolor: "#f8fbff" }}>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>System Snapshot</Typography>
            <Typography variant="body2" color="text.secondary">
              All core modules are connected. Prioritize pending approvals and upcoming deadlines for smooth operations.
            </Typography>
          </Paper>
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
            <Typography variant="caption" color="text.secondary">Pending Reviews</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.45rem", color: "#ef6c00" }}>{stats.pendingApprovals}</Typography>
          </Paper>
          <Paper sx={{ p: 1.1, border: "1px solid #c8e6c9", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Open Assessments</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.45rem", color: "#2e7d32" }}>{stats.openCoursework}</Typography>
          </Paper>
          <Paper sx={{ p: 1.1, border: "1px solid #bbdefb", borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary">Active Academic Scope</Typography>
            <Typography sx={{ fontWeight: 900, fontSize: "1.45rem", color: "#1565c0" }}>
              {stats.courses + stats.groups}
            </Typography>
          </Paper>
        </Box>
      )}
    </Stack>
  );
};

export default AdminDashboard;
