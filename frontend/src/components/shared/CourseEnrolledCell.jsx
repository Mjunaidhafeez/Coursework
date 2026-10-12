import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { useState } from "react";

import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useUi } from "../../context/UiContext";

const CourseEnrolledCell = ({ course }) => {
  const { notify } = useUi();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const count = course?.enrolled_count ?? rows.length;

  const openRoster = async () => {
    if (!course?.id) return;
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get(`${ENDPOINTS.courses}${course.id}/enrolled-students/`);
      setRows(Array.isArray(data) ? data : data?.results || []);
    } catch {
      notify("Could not load enrolled students", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={0.6} alignItems="center">
        <Chip
          size="small"
          variant="outlined"
          color={count ? "info" : "default"}
          label={`${count} student${count === 1 ? "" : "s"}`}
          onClick={openRoster}
          sx={{ fontWeight: 700, cursor: "pointer" }}
        />
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{course ? `Enrolled — ${course.code}` : "Enrolled students"}</DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Typography variant="body2" color="text.secondary">Loading…</Typography>
          ) : rows.length ? (
            <Stack spacing={0.7}>
              {rows.map((student) => (
                <Stack key={student.id} direction="row" spacing={1} justifyContent="space-between">
                  <Typography sx={{ fontWeight: 700 }}>{student.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[student.roll_no, student.semester_number ? `Sem ${student.semester_number}` : "", student.department_name]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">No students enrolled in this subject yet.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseEnrolledCell;
