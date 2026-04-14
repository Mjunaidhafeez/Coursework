import { Box, Grid2 as Grid, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import StudentMemberList from "../../components/shared/StudentMemberList";

const StudentDashboard = () => {
  const [stats, setStats] = useState({ courses: 0, openWork: 0, pendingApprovals: 0, myGroups: 0 });
  const [courseworks, setCourseworks] = useState([]);
  const [myGroups, setMyGroups] = useState([]);

  useEffect(() => {
    const load = async () => {
      const [coursesRes, submissionsRes, openCourseworkRes, groupsRes, membershipsRes] = await Promise.allSettled([
        api.get(`${ENDPOINTS.courses}?page_size=300`),
        api.get(`${ENDPOINTS.submissions}?page_size=500&ordering=submitted_at`),
        api.get(`${ENDPOINTS.courseworks}?deadline_state=open&page_size=300&ordering=deadline`),
        api.get(`${ENDPOINTS.groups}?status=approved&page_size=500&ordering=name`),
        api.get(`${ENDPOINTS.groupMembers}?accepted=true&page_size=500`),
      ]);

      const getRows = (res) => (res.status === "fulfilled" ? res.value.data.results || [] : []);
      const submissions = getRows(submissionsRes);
      const openCourseworks = getRows(openCourseworkRes);
      const courseRows = getRows(coursesRes);

      const latestSubmissionByCourseworkId = new Map();
      submissions.forEach((submission) => {
        const key = String(submission.coursework);
        if (!key || key === "undefined") return;
        const currTs = new Date(submission.submitted_at || submission.created_at || 0).getTime();
        const prev = latestSubmissionByCourseworkId.get(key);
        const prevTs = new Date(prev?.submitted_at || prev?.created_at || 0).getTime();
        if (!prev || currTs >= prevTs) latestSubmissionByCourseworkId.set(key, submission);
      });

      const effectiveOpenCourseworks = openCourseworks.filter((item) => {
        const latestSubmission = latestSubmissionByCourseworkId.get(String(item.id));
        return !latestSubmission?.is_marked;
      });
      setCourseworks(effectiveOpenCourseworks);
      const allGroups = getRows(groupsRes);
      const membershipRows = getRows(membershipsRes);
      const myGroupIdSet = new Set(membershipRows.map((row) => row.group));
      const myGroupRows = allGroups.filter((group) => myGroupIdSet.has(group.id));
      setMyGroups(myGroupRows);

      const pendingApprovals = submissions.filter(
        (item) => String(item.approval_status || "").toLowerCase() === "pending"
      ).length;
      setStats({
        courses: courseRows.length,
        openWork: effectiveOpenCourseworks.length,
        pendingApprovals,
        myGroups: myGroupRows.length,
      });
    };

    load();
  }, []);

  const latestOpenCoursework = useMemo(() => {
    return courseworks.slice(0, 6);
  }, [courseworks]);
  const summaryCards = [
    { label: "My Groups", value: stats.myGroups, accent: "linear-gradient(135deg, #0ea5e9, #2563eb)" },
    { label: "My Courses", value: stats.courses, accent: "linear-gradient(135deg, #22c55e, #15803d)" },
    { label: "My Open Work", value: stats.openWork, accent: "linear-gradient(135deg, #f59e0b, #d97706)" },
    { label: "My Pending Approvals", value: stats.pendingApprovals, accent: "linear-gradient(135deg, #a855f7, #7e22ce)" },
  ];

  return (
    <Stack spacing={1.2}>
      <Typography className="premium-heading-soft" sx={{ fontWeight: 900, fontSize: "1.04rem" }}>
        Student Dashboard
      </Typography>
      <Grid container spacing={1.2}>
        {summaryCards.map((item) => (
          <Grid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Paper
              sx={{
                p: 1.2,
                borderRadius: 2,
                color: "#fff",
                background: item.accent,
                boxShadow: "0 10px 22px rgba(15, 23, 42, 0.15)",
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700 }}>
                {item.label}
              </Typography>
              <Typography sx={{ mt: 0.3, fontSize: "1.4rem", fontWeight: 900, lineHeight: 1.1 }}>
                {item.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={1.2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 1.2, borderRadius: 2, border: "1px solid #dbeafe", bgcolor: "#f8fbff", minHeight: 210 }}>
            <Typography className="premium-heading-soft" sx={{ fontWeight: 800, mb: 0.9 }}>My Groups</Typography>
            <Stack spacing={0.7}>
              {myGroups.length ? (
                myGroups.map((group) => (
                  <Paper key={group.id} variant="outlined" sx={{ p: 0.8, borderColor: "#bfdbfe", borderRadius: 1.3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                      {group.name}
                    </Typography>
                    <StudentMemberList members={group.members || []} compact />
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No group assigned yet.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 1.2, borderRadius: 2, border: "1px solid #ede9fe", bgcolor: "#faf9ff", minHeight: 210 }}>
            <Typography className="premium-heading-soft" sx={{ fontWeight: 800, mb: 0.9 }}>My Open Work</Typography>
            <Stack spacing={0.7}>
              {latestOpenCoursework.length ? (
                latestOpenCoursework.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      px: 1,
                      py: 0.8,
                      border: "1px solid #e9d5ff",
                      borderRadius: 1.2,
                      bgcolor: "#fff",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.title}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No open coursework found.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
};

export default StudentDashboard;
