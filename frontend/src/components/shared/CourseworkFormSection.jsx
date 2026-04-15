import { Box, Button, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";

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

  return (
    <Paper sx={{ p: 1.5 }}>
      <Typography sx={{ fontWeight: 700, mb: 0.8 }}>{editingId ? "Update Assessment" : "Add Assessment"}</Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(4, minmax(0,1fr))" }, gap: 0.9 }}>
        <TextField
          required
          select
          size="small"
          label="Course"
          value={form.course}
          error={Boolean(formErrors.course)}
          helperText={formErrors.course || ""}
          onChange={(e) => {
            const value = e.target.value;
            setForm((p) => ({ ...p, course: value }));
            clearFieldErrorIfValid("course", Boolean(value));
          }}
        >
          {courses.map((course) => (
            <MenuItem key={course.id} value={course.id}>
              {course.title}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          required
          size="small"
          label="Title"
          value={form.title}
          error={Boolean(formErrors.title)}
          helperText={formErrors.title || ""}
          onChange={(e) => {
            const value = e.target.value;
            setForm((p) => ({ ...p, title: value }));
            clearFieldErrorIfValid("title", Boolean(String(value || "").trim()));
          }}
        />

        <TextField
          size="small"
          label="Type"
          value={form.coursework_type}
          onChange={(e) => setForm((p) => ({ ...p, coursework_type: e.target.value }))}
          helperText="Select from suggestions or type new assessment type"
          inputProps={{ list: datalistId }}
        />
        <datalist id={datalistId}>
          {courseworkTypeOptions.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>

        <TextField
          select
          size="small"
          label="Submission"
          value={form.submission_type}
          onChange={(e) => setForm((p) => ({ ...p, submission_type: e.target.value }))}
        >
          {submissionTypeOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        {(form.submission_type === "group" || form.submission_type === "both") && (
          <TextField
            required
            size="small"
            type="number"
            label="Max Members"
            value={form.max_group_members}
            error={Boolean(formErrors.max_group_members)}
            helperText={formErrors.max_group_members || ""}
            onChange={(e) => setForm((p) => ({ ...p, max_group_members: e.target.value }))}
            inputProps={{ min: 2 }}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              sx={toggleSx}
              checked={Boolean(form.lock_at_due_time)}
              onChange={(e) => setForm((p) => ({ ...p, lock_at_due_time: e.target.checked }))}
            />
          }
          label="Lock submission at due time"
          sx={{ alignSelf: "center" }}
        />

        <FormControlLabel
          control={
            <Switch
              sx={toggleSx}
              checked={Boolean(form.approval_required)}
              onChange={(e) => setForm((p) => ({ ...p, approval_required: e.target.checked }))}
            />
          }
          label="Approval Required"
          sx={{ alignSelf: "center" }}
        />

        <FormControlLabel
          control={
            <Switch
              sx={toggleSx}
              checked={Boolean(form.topic_duplication_allowed)}
              onChange={(e) => setForm((p) => ({ ...p, topic_duplication_allowed: e.target.checked }))}
            />
          }
          label="Topic Duplication Allowed"
          sx={{ alignSelf: "center" }}
        />

        <FormControlLabel
          control={
            <Switch
              sx={toggleSx}
              checked={Boolean(form.auto_approve_all_students)}
              onChange={(e) => setForm((p) => ({ ...p, auto_approve_all_students: e.target.checked }))}
            />
          }
          label="Auto-approve all enrolled students"
          sx={{ alignSelf: "center" }}
        />

        <TextField
          required
          size="small"
          type="datetime-local"
          label="Deadline"
          value={form.deadline}
          error={Boolean(formErrors.deadline)}
          helperText={formErrors.deadline || ""}
          onChange={(e) => {
            const value = e.target.value;
            setForm((p) => ({ ...p, deadline: value }));
            clearFieldErrorIfValid("deadline", Boolean(value));
          }}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          size="small"
          type="number"
          label="Max Marks"
          value={form.max_marks}
          onChange={(e) => setForm((p) => ({ ...p, max_marks: e.target.value }))}
        />

        <TextField
          size="small"
          label="Description"
          multiline
          minRows={1}
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          sx={{ gridColumn: { md: "span 2" } }}
        />
      </Box>

      <Stack direction="row" spacing={1} sx={{ mt: 0.9 }}>
        <Button variant="contained" onClick={onSubmit}>
          {editingId ? "Update" : "Add"}
        </Button>
        <Button variant="outlined" onClick={onClear}>
          Clear
        </Button>
      </Stack>
    </Paper>
  );
};

export default CourseworkFormSection;
