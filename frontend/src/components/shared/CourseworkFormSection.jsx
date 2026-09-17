import { Button, Checkbox, FormControlLabel, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

import { humanizeCourseworkType, normalizeCourseworkType } from "../../utils/courseworkOptions";

const fieldSx = {
  minWidth: { xs: "100%", sm: 150 },
  flex: { xs: "1 1 100%", sm: "0 1 168px" },
  "& .MuiFormHelperText-root": { mx: 0.2, mt: 0.15, minHeight: 0 },
};

const ruleCheckboxSx = {
  py: 0,
  "&.Mui-checked": { color: "#1d4cb4" },
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
    <Paper variant="outlined" sx={{ p: 1, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
      <Stack spacing={0.85}>
        <Typography sx={{ fontWeight: 800, color: "#13377a", fontSize: "0.92rem" }}>
          {editingId ? "Update assessment" : "Create assessment"}
        </Typography>

        <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="flex-start">
          <TextField
            required
            select
            size="small"
            label="Course / subject"
            value={form.course === "" || form.course == null ? "" : String(form.course)}
            error={Boolean(formErrors.course)}
            helperText={formErrors.course || undefined}
            sx={{ ...fieldSx, flex: { sm: "1 1 200px" }, minWidth: { sm: 200 } }}
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
            helperText={formErrors.title || undefined}
            sx={{ ...fieldSx, flex: { sm: "1 1 200px" }, minWidth: { sm: 200 } }}
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
            required
            size="small"
            type="datetime-local"
            label="Deadline"
            value={form.deadline}
            error={Boolean(formErrors.deadline)}
            helperText={formErrors.deadline || undefined}
            onChange={(e) => {
              const value = e.target.value;
              setForm((p) => ({ ...p, deadline: value }));
              clearFieldErrorIfValid("deadline", Boolean(value));
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ ...fieldSx, minWidth: { sm: 210 }, flex: { sm: "0 1 210px" } }}
          />
          <TextField
            required
            size="small"
            type="number"
            label="Max marks"
            value={form.max_marks}
            error={Boolean(formErrors.max_marks)}
            helperText={formErrors.max_marks || undefined}
            onChange={(e) => {
              const value = e.target.value;
              setForm((p) => ({ ...p, max_marks: value }));
              clearFieldErrorIfValid("max_marks", Boolean(String(value || "").trim()));
            }}
            inputProps={{ min: 1 }}
            sx={{ ...fieldSx, minWidth: { sm: 110 }, flex: { sm: "0 1 110px" } }}
          />
          <TextField
            size="small"
            label="Description"
            placeholder="Optional instructions"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            sx={{ ...fieldSx, flex: { sm: "1 1 240px" }, minWidth: { sm: 220 } }}
          />
        </Stack>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
          <Typography sx={{ fontWeight: 700, fontSize: "0.78rem", color: "#35507c" }}>
            Submit as
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
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 700,
                px: 1.2,
                py: 0.2,
              },
            }}
          >
            {submissionTypeOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {showGroupSize && (
            <TextField
              required
              size="small"
              type="number"
              label="Max members"
              value={form.max_group_members}
              error={Boolean(formErrors.max_group_members)}
              helperText={formErrors.max_group_members || ""}
              onChange={(e) => setForm((p) => ({ ...p, max_group_members: e.target.value }))}
              inputProps={{ min: 2 }}
              sx={{ width: 130 }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" alignItems="center">
          <FormControlLabel
            sx={{ mr: 1.2 }}
            control={
              <Checkbox
                size="small"
                sx={ruleCheckboxSx}
                checked={Boolean(form.lock_at_due_time)}
                onChange={(e) => setForm((p) => ({ ...p, lock_at_due_time: e.target.checked }))}
              />
            }
            label={<Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>Lock after deadline</Typography>}
          />
          <FormControlLabel
            sx={{ mr: 1.2 }}
            control={
              <Checkbox
                size="small"
                sx={ruleCheckboxSx}
                checked={Boolean(form.approval_required)}
                onChange={(e) => setForm((p) => ({ ...p, approval_required: e.target.checked }))}
              />
            }
            label={<Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>Topic approval</Typography>}
          />
          <FormControlLabel
            sx={{ mr: 1.2 }}
            control={
              <Checkbox
                size="small"
                sx={ruleCheckboxSx}
                checked={Boolean(form.topic_duplication_allowed)}
                onChange={(e) => setForm((p) => ({ ...p, topic_duplication_allowed: e.target.checked }))}
              />
            }
            label={<Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>Same topic OK</Typography>}
          />
          <FormControlLabel
            sx={{ mr: 1.2 }}
            control={
              <Checkbox
                size="small"
                sx={ruleCheckboxSx}
                checked={Boolean(form.auto_approve_all_students)}
                onChange={(e) => setForm((p) => ({ ...p, auto_approve_all_students: e.target.checked }))}
              />
            }
            label={<Typography sx={{ fontSize: "0.8rem", fontWeight: 600 }}>Auto-approve all</Typography>}
          />
        </Stack>

        {datalistId ? <datalist id={datalistId} /> : null}

        <Stack direction="row" spacing={0.8}>
          <Button size="small" variant="contained" onClick={onSubmit}>
            {editingId ? "Update assessment" : "Create assessment"}
          </Button>
          <Button size="small" variant="outlined" onClick={onClear}>
            Clear
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
};

export default CourseworkFormSection;
