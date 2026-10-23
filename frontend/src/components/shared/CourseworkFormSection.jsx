import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import { Button, Chip, IconButton, MenuItem, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { useState } from "react";

import { useUi } from "../../context/UiContext";
import { applyTopicSource, topicSourceOptionsFor, TOPIC_SOURCE_STUDENT, TOPIC_SOURCE_TEACHER_GROUP } from "../../utils/courseworkForm";
import { humanizeCourseworkType, normalizeCourseworkType } from "../../utils/courseworkOptions";
import { buildFilePreview, titleFromFileName } from "../../utils/filePreview";
import { oversizedFileNames } from "../../utils/uploadLimits";
import FilePreviewDialog from "./FilePreviewDialog";
import { compactFieldSx, compactToggleGroupSx, formActionButtonSx, ruleToggleSx } from "./listingStyles";

const RULE_COLORS = {
  lock: "#c2410c",
  approval: "#1d4ed8",
  duplicate: "#0f766e",
  auto: "#7c3aed",
};

const CourseworkFormSection = ({
  form,
  formErrors,
  editingId,
  courses,
  courseworkTypeOptions,
  submissionTypeOptions,
  datalistId,
  onSubmit,
  onClear,
  setForm,
  setFormErrors,
}) => {
  const { notify } = useUi();
  const [preview, setPreview] = useState(null);

  const clearFieldErrorIfValid = (field, isValid) => {
    if (!formErrors[field]) return;
    if (!isValid) return;
    setFormErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const showGroupSize = form.submission_type === "group" || form.submission_type === "both";
  const studentsChooseTopic = (form.topic_source || TOPIC_SOURCE_STUDENT) === TOPIC_SOURCE_STUDENT;
  const topicOptions = topicSourceOptionsFor(form.submission_type);
  const selectedType = normalizeCourseworkType(form.coursework_type) || "assignment";
  const sampleName = form.sample_file_title || form.sample_file?.name || form.sample_file_name || "";
  const hasSample = Boolean(form.sample_file instanceof File || form.sample_file_url || form.sample_file_name);
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

  const toggleRule = (field) => {
    setForm((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const pickSample = (file) => {
    if (!file) return;
    if (oversizedFileNames([file]).length) {
      notify("File is larger than 25 MB", "error");
      return;
    }
    setForm((prev) => ({
      ...prev,
      sample_file: file,
      sample_file_name: file.name,
      sample_file_title: prev.sample_file_title || titleFromFileName(file.name),
    }));
  };

  const openSample = async () => {
    try {
      const result = await buildFilePreview({
        file: form.sample_file instanceof File ? form.sample_file : null,
        url: form.sample_file_url,
        name: form.sample_file?.name || form.sample_file_name,
        title: sampleName,
      });
      if (result.message) notify(result.message, "info");
      if (result.openUrl) window.open(result.openUrl, "_blank", "noopener,noreferrer");
      if (result.preview) setPreview(result.preview);
    } catch {
      notify("Could not open file preview", "error");
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 0.85, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
      <Stack spacing={0.9}>
        <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField
            required
            select
            size="small"
            label="Course / subject"
            value={form.course === "" || form.course == null ? "" : String(form.course)}
            error={Boolean(formErrors.course)}
            helperText={formErrors.course || undefined}
            sx={compactFieldSx}
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
            sx={compactFieldSx}
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
            sx={compactFieldSx}
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
            sx={compactFieldSx}
          />
          <TextField
            size="small"
            type="number"
            label="Max marks"
            value={form.max_marks}
            error={Boolean(formErrors.max_marks)}
            helperText={formErrors.max_marks || undefined}
            onChange={(e) => {
              const value = e.target.value;
              setForm((p) => ({ ...p, max_marks: value }));
              clearFieldErrorIfValid("max_marks", !String(value || "").trim() || Number(value) > 0);
            }}
            inputProps={{ min: 1 }}
            sx={compactFieldSx}
          />
          <TextField
            size="small"
            label="Description"
            placeholder="Optional instructions"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            sx={compactFieldSx}
          />
          {showGroupSize && (
            <TextField
              size="small"
              type="number"
              label="Max members"
              value={form.max_group_members}
              error={Boolean(formErrors.max_group_members)}
              helperText={formErrors.max_group_members || undefined}
              onChange={(e) => setForm((p) => ({ ...p, max_group_members: e.target.value }))}
              inputProps={{ min: 2 }}
              sx={compactFieldSx}
            />
          )}
          <TextField
            select
            size="small"
            label="Who sets the topic?"
            value={form.topic_source || TOPIC_SOURCE_STUDENT}
            error={Boolean(formErrors.topic_source)}
            helperText={formErrors.topic_source || undefined}
            sx={compactFieldSx}
            onChange={(e) => {
              const value = e.target.value;
              setForm((p) => applyTopicSource(p, value));
              clearFieldErrorIfValid("topic_source", Boolean(value));
            }}
          >
            {topicOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {studentsChooseTopic
            ? "Students send a topic request. Use Topic approval to review it, or Auto-approve all to skip waiting."
            : "You will allot topics after saving. Students skip the request step and upload once the topic is given."}
        </Typography>
        <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            label="Sample name"
            placeholder="Display name"
            value={form.sample_file_title || ""}
            onChange={(e) => setForm((p) => ({ ...p, sample_file_title: e.target.value }))}
            sx={compactFieldSx}
          />
          <Button size="small" variant="outlined" component="label" sx={formActionButtonSx}>
            {hasSample ? "Change file" : "Choose file"}
            <input
              hidden
              type="file"
              accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
              onChange={(e) => {
                pickSample(e.target.files?.[0] || null);
                e.target.value = "";
              }}
            />
          </Button>
          {sampleName ? (
            <Chip size="small" label={sampleName} sx={{ maxWidth: 200, height: 28, fontWeight: 700, bgcolor: "#fff" }} />
          ) : null}
          <IconButton size="small" title="View sample" disabled={!hasSample} onClick={openSample} sx={{ border: "1px solid #c5d4e8", bgcolor: "#fff" }}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={form.submission_type}
            onChange={(_, value) => {
              if (!value) return;
              setForm((p) => ({
                ...p,
                submission_type: value,
                topic_source:
                  value === "individual" && p.topic_source === TOPIC_SOURCE_TEACHER_GROUP
                    ? TOPIC_SOURCE_STUDENT
                    : p.topic_source,
              }));
            }}
            sx={compactToggleGroupSx}
          >
            {submissionTypeOptions.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButton
            size="small"
            value="lock"
            selected={Boolean(form.lock_at_due_time)}
            onChange={() => toggleRule("lock_at_due_time")}
            sx={ruleToggleSx(RULE_COLORS.lock)}
          >
            Lock after deadline
          </ToggleButton>
          {studentsChooseTopic ? (
            <>
              <ToggleButton
                size="small"
                value="approval"
                selected={Boolean(form.approval_required)}
                onChange={() => toggleRule("approval_required")}
                sx={ruleToggleSx(RULE_COLORS.approval)}
              >
                Topic approval
              </ToggleButton>
              <ToggleButton
                size="small"
                value="duplicate"
                selected={Boolean(form.topic_duplication_allowed)}
                onChange={() => toggleRule("topic_duplication_allowed")}
                sx={ruleToggleSx(RULE_COLORS.duplicate)}
              >
                Same topic OK
              </ToggleButton>
              <ToggleButton
                size="small"
                value="auto"
                selected={Boolean(form.auto_approve_all_students)}
                onChange={() => toggleRule("auto_approve_all_students")}
                sx={ruleToggleSx(RULE_COLORS.auto)}
              >
                Auto-approve all
              </ToggleButton>
            </>
          ) : null}
          {datalistId ? <datalist id={datalistId} /> : null}
          <Stack direction="row" spacing={0.7} sx={{ ml: { sm: "auto" } }}>
            <Button size="small" variant="contained" onClick={onSubmit} sx={formActionButtonSx}>
              {editingId ? "Update" : "Add"}
            </Button>
            <Button size="small" variant="outlined" onClick={onClear} sx={formActionButtonSx}>
              Clear
            </Button>
          </Stack>
        </Stack>
      </Stack>
      <FilePreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </Paper>
  );
};

export default CourseworkFormSection;
