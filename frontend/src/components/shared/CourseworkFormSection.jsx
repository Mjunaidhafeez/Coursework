import { Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import { humanizeCourseworkType, normalizeCourseworkType } from "../../utils/courseworkOptions";

const fieldSx = {
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.2 },
};

const ruleSwitchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: "#1d4cb4" },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { bgcolor: "#90b4f0", opacity: 1 },
};

const CourseworkFormSection = ({
  form,
  formErrors,
  editingId,
  courses,
  courseworkTypeOptions,
  submissionTypeOptions,
  toggleSx,
  datalistId,
  onSubmit,
  onClear,
  setForm,
  setFormErrors,
}) => {
  const clearFieldErrorIfValid = (field, isValid) => {
    if (!formErrors[field]) return;
    if (!isValid) return;
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const showGroupSize = form.submission_type === "group" || form.submission_type === "both";
  const selectedType = normalizeCourseworkType(form.coursework_type) || "assignment";
  const typeOptions = (() => {
    const seen = new Set();
    const items = [];
    (courseworkTypeOptions || []).forEach((option) => {
      const value = normalizeCourseworkType(option.value) || option.value;
      if (!value || seen.has(value)) return;
      seen.add(value);
      items.push({ value, label: option.label || humanizeCourseworkType(value) });
    });
    if (selectedType && !seen.has(selectedType)) {
      items.push({ value: selectedType, label: humanizeCourseworkType(selectedType) });
    }
    return items;
  })();

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.6, md: 2 }, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
      <Stack spacing={1.8}>
        <Box>
          <Typography sx={{ fontWeight: 800, color: "#13377a", fontSize: "1rem" }}>
            {editingId ? "Update assessment" : "Create assessment"}
          </Typography>
          <Typography variant="body2" sx={{ color: "#4b5d7a", mt: 0.4 }}>
            Set the subject, how students submit, deadline, and approval rules.
          </Typography>
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#35507c", mb: 0.8 }}>
            Assessment details
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.2fr 1.2fr 0.9fr" },
              gap: 1.1,
            }}
          >
            <TextField
              required
              select
              size="small"
              label="Course / subject"
              value={form.course === "" || form.course == null ? "" : String(form.course)}
              error={Boolean(formErrors.course)}
              helperText={formErrors.course || "Which subject this work belongs to"}
              sx={fieldSx}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, course: value }));
                clearFieldErrorIfValid("course", Boolean(value));
              }}
            >
              <MenuItem value="">Select course</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={String(course.id)}>
                  {course.title}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              required
              size="small"
              label="Title"
              placeholder="e.g. Mid-term presentation"
              value={form.title}
              error={Boolean(formErrors.title)}
              helperText={formErrors.title || "Students will see this name"}
              sx={fieldSx}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, title: value }));
                clearFieldErrorIfValid("title", Boolean(String(value || "").trim()));
              }}
            />
            <TextField
              select
              size="small"
              label="Type"
              value={selectedType}
              helperText="Assignment, quiz, exam, project…"
              sx={fieldSx}
              onChange={(e) => setForm((p) => ({ ...p, coursework_type: e.target.value }))}
            >
              {typeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Description"
              placeholder="Optional instructions for students"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              sx={{ ...fieldSx, gridColumn: { md: "1 / -1" } }}
            />
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#35507c", mb: 0.8 }}>
            How students submit
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={form.submission_type}
            onChange={(_, value) => {
              if (!value) return;
              setForm((p) => ({ ...p, submission_type: value }));
            }}
            sx={{
              mb: 1,
              flexWrap: "wrap",
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 700,
                px: 1.4,
              },
            }}
          >
            {submissionTypeOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography variant="caption" sx={{ display: "block", color: "#5b6b86", mb: 1 }}>
            Individual = one student. Group = one file for the team. Both = student chooses.
          </Typography>
          {showGroupSize && (
            <TextField
              required
              size="small"
              type="number"
              label="Max group members"
              value={form.max_group_members}
              error={Boolean(formErrors.max_group_members)}
              helperText={formErrors.max_group_members || "Minimum 2 members in a group"}
              onChange={(e) => setForm((p) => ({ ...p, max_group_members: e.target.value }))}
              inputProps={{ min: 2 }}
              sx={{ ...fieldSx, maxWidth: 220 }}
            />
          )}
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#35507c", mb: 0.8 }}>
            Deadline and marks
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 1.1,
              maxWidth: 560,
            }}
          >
            <TextField
              required
              size="small"
              type="datetime-local"
              label="Deadline"
              value={form.deadline}
              error={Boolean(formErrors.deadline)}
              helperText={formErrors.deadline || "Last date and time to submit"}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, deadline: value }));
                clearFieldErrorIfValid("deadline", Boolean(value));
              }}
              InputLabelProps={{ shrink: true }}
              sx={fieldSx}
            />
            <TextField
              required
              size="small"
              type="number"
              label="Max marks"
              value={form.max_marks}
              error={Boolean(formErrors.max_marks)}
              helperText={formErrors.max_marks || "Total marks for this assessment"}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, max_marks: value }));
                clearFieldErrorIfValid("max_marks", Boolean(String(value || "").trim()));
              }}
              inputProps={{ min: 1 }}
              sx={fieldSx}
            />
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#35507c", mb: 0.8 }}>
            Rules
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 0.6,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  sx={toggleSx || ruleSwitchSx}
                  checked={Boolean(form.lock_at_due_time)}
                  onChange={(e) => setForm((p) => ({ ...p, lock_at_due_time: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.86rem", fontWeight: 700 }}>Lock after deadline</Typography>
                  <Typography variant="caption" color="text.secondary">No late file upload after due time</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  sx={toggleSx || ruleSwitchSx}
                  checked={Boolean(form.approval_required)}
                  onChange={(e) => setForm((p) => ({ ...p, approval_required: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.86rem", fontWeight: 700 }}>Topic approval required</Typography>
                  <Typography variant="caption" color="text.secondary">Teacher/admin approves topic before file upload</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  sx={toggleSx || ruleSwitchSx}
                  checked={Boolean(form.topic_duplication_allowed)}
                  onChange={(e) => setForm((p) => ({ ...p, topic_duplication_allowed: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.86rem", fontWeight: 700 }}>Same topic allowed</Typography>
                  <Typography variant="caption" color="text.secondary">More than one student/group can use the same topic</Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  sx={toggleSx || ruleSwitchSx}
                  checked={Boolean(form.auto_approve_all_students)}
                  onChange={(e) => setForm((p) => ({ ...p, auto_approve_all_students: e.target.checked }))}
                />
              }
              label={
                <Box>
                  <Typography sx={{ fontSize: "0.86rem", fontWeight: 700 }}>Auto-approve everyone</Typography>
                  <Typography variant="caption" color="text.secondary">Skip manual approval for all students</Typography>
                </Box>
              }
            />
          </Box>
        </Box>

        {datalistId ? <datalist id={datalistId} /> : null}

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={onSubmit}>
            {editingId ? "Update assessment" : "Create assessment"}
          </Button>
          <Button variant="outlined" onClick={onClear}>
            Clear
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default CourseworkFormSection;
