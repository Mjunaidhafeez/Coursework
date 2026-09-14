import { FormControlLabel, MenuItem, Switch, TextField } from "@mui/material";

import CompactAddForm from "./CompactAddForm";
import { compactFieldSx } from "./listingStyles";

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
    <CompactAddForm
      title={editingId ? "Update Assessment" : "Add Assessment"}
      submitLabel={editingId ? "Update" : "Add"}
      onSubmit={onSubmit}
      onClear={onClear}
    >
      <TextField
        required
        select
        size="small"
        label="Course"
        value={form.course}
        error={Boolean(formErrors.course)}
        helperText={formErrors.course || ""}
        sx={compactFieldSx}
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
        sx={compactFieldSx}
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
        inputProps={{ list: datalistId }}
        sx={compactFieldSx}
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
        sx={compactFieldSx}
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
          sx={{ ...compactFieldSx, maxWidth: { sm: 140 } }}
        />
      )}
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
        sx={compactFieldSx}
      />
      <TextField
        size="small"
        type="number"
        label="Max Marks"
        value={form.max_marks}
        onChange={(e) => setForm((p) => ({ ...p, max_marks: e.target.value }))}
        sx={{ ...compactFieldSx, maxWidth: { sm: 130 } }}
      />
      <TextField
        size="small"
        label="Description"
        value={form.description}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        sx={compactFieldSx}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            sx={toggleSx}
            checked={Boolean(form.lock_at_due_time)}
            onChange={(e) => setForm((p) => ({ ...p, lock_at_due_time: e.target.checked }))}
          />
        }
        label="Lock at due"
        sx={{ mr: 0.5, ml: 0.2, "& .MuiFormControlLabel-label": { fontSize: "0.78rem" } }}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            sx={toggleSx}
            checked={Boolean(form.approval_required)}
            onChange={(e) => setForm((p) => ({ ...p, approval_required: e.target.checked }))}
          />
        }
        label="Approval"
        sx={{ mr: 0.5, "& .MuiFormControlLabel-label": { fontSize: "0.78rem" } }}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            sx={toggleSx}
            checked={Boolean(form.topic_duplication_allowed)}
            onChange={(e) => setForm((p) => ({ ...p, topic_duplication_allowed: e.target.checked }))}
          />
        }
        label="Topic dup"
        sx={{ mr: 0.5, "& .MuiFormControlLabel-label": { fontSize: "0.78rem" } }}
      />
      <FormControlLabel
        control={
          <Switch
            size="small"
            sx={toggleSx}
            checked={Boolean(form.auto_approve_all_students)}
            onChange={(e) => setForm((p) => ({ ...p, auto_approve_all_students: e.target.checked }))}
          />
        }
        label="Auto-approve"
        sx={{ mr: 0.5, "& .MuiFormControlLabel-label": { fontSize: "0.78rem" } }}
      />
    </CompactAddForm>
  );
};

export default CourseworkFormSection;
