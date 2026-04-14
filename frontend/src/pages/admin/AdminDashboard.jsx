import { Box, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import StatCard from "../../components/StatCard";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ students: 0, openCoursework: 0, pendingApprovals: 0, courses: 0, groups: 0 });

  useEffect(() => {
    const load = async () => {
      const [studentsRes, coursesRes, openCourseworksRes, pendingApprovalsRes, allGroupsRes] = await Promise.all([
        api.get(`${ENDPOINTS.users}?role=student&page_size=1`),
        api.get(ENDPOINTS.courses),
        api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=1`),
        api.get(`${ENDPOINTS.submissions}?workflow_state=request_pending&page_size=1`),
        api.get(`${ENDPOINTS.groups}?page_size=1`),
      ]);
      const students = studentsRes.data.count || 0;

      setStats({
        students,
        openCoursework: openCourseworksRes.data.count || 0,
        pendingApprovals: pendingApprovalsRes.data.count || 0,
        courses: coursesRes.data.count || 0,
        groups: allGroupsRes.data.count || 0,
      });
    };

    load();
  }, []);

  return (
    <Stack spacing={1.5}>
      <Typography className="premium-heading-soft" sx={{ fontWeight: 800, fontSize: "1rem" }}>Admin Dashboard</Typography>

      <Box
        sx={{
          display: "grid",
          gap: 1.3,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
        }}
      >
        <Box>
          <StatCard label="Total Students" value={stats.students} accent="#1d4fbf" />
        </Box>
        <Box>
          <StatCard label="Open Coursework" value={stats.openCoursework} accent="#2e7d32" />
        </Box>
        <Box>
          <StatCard label="Pending Approvals" value={stats.pendingApprovals} accent="#ef6c00" />
        </Box>
        <Box>
          <StatCard label="Active Courses" value={stats.courses} accent="#c62828" />
        </Box>
        <Box>
          <StatCard label="Total Groups" value={stats.groups} accent="#1565c0" />
        </Box>
      </Box>
    </Stack>
  );
};

export default AdminDashboard;
