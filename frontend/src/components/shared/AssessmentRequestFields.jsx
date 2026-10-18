import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

const AssessmentRequestFields = ({
  courseworkId,
  topic,
  onTopicChange,
  allowsGroup = false,
  groups = [],
  selectedGroup = "",
  onGroupChange,
  memberOptions = [],
  selectedMemberIds = [],
  onMembersChange,
  blockedIds,
  blockedStudents = [],
  additionalLimit = null,
  selfOption = null,
  notify,
}) => {
  const blockedSet = blockedIds instanceof Set ? blockedIds : new Set((blockedIds || []).map(Number));
  const selectedMembers = memberOptions.filter(
    (option) => !option.__self && selectedMemberIds.includes(Number(option.id))
  );

  return (
    <Stack spacing={1.1}>
      <TextField
        size="small"
        fullWidth
        label="Topic"
        value={topic}
        onChange={(e) => onTopicChange(e.target.value)}
      />
      {allowsGroup ? (
        <FormControl size="small" fullWidth>
          <InputLabel id={`assessment-group-${courseworkId}`}>Existing group</InputLabel>
          <Select
            labelId={`assessment-group-${courseworkId}`}
            label="Existing group"
            value={selectedGroup}
            onChange={(e) => onGroupChange(e.target.value)}
          >
            <MenuItem value="">
              <em>No group — pick members below</em>
            </MenuItem>
            {groups.map((group) => (
              <MenuItem key={group.id} value={String(group.id)}>{group.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      ) : null}
      {allowsGroup && !selectedGroup ? (
        <Autocomplete
          multiple
          size="small"
          options={memberOptions}
          value={selectedMembers}
          disableCloseOnSelect
          fullWidth
          getOptionLabel={(option) => option.full_name || option.username || String(option.id)}
          getOptionDisabled={(option) => Boolean(option.__self) || blockedSet.has(Number(option.id))}
          isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
          onChange={(_, selectedOptions) => {
            const next = selectedOptions
              .filter((option) => !option.__self)
              .map((option) => Number(option.id));
            if (additionalLimit !== null && next.length > additionalLimit) {
              notify?.(`Only ${additionalLimit} additional member(s) allowed`, "warning");
              return;
            }
            onMembersChange(next);
          }}
          ListboxProps={{ style: { maxHeight: 250 } }}
          renderTags={(value, getTagProps) => {
            const tags = [];
            if (selfOption) {
              tags.push(
                <Chip
                  key="self-preselected"
                  size="small"
                  color="info"
                  variant="outlined"
                  label={selfOption.full_name}
                  disabled
                />
              );
            }
            value.forEach((option, index) => {
              tags.push(
                <Chip
                  {...getTagProps({ index })}
                  key={option.id}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={option.full_name || option.username}
                />
              );
            });
            return tags;
          }}
          renderOption={(props, option, { selected }) => {
            const isSelfOption = Boolean(option.__self);
            const alreadySent = blockedSet.has(Number(option.id));
            return (
              <li
                {...props}
                style={{
                  ...props.style,
                  backgroundColor: (selected || isSelfOption) ? "rgba(25, 118, 210, 0.10)" : props.style?.backgroundColor,
                  borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
                }}
              >
                <Checkbox
                  size="small"
                  checked={isSelfOption ? true : selected}
                  disabled={alreadySent || isSelfOption}
                  sx={{ mr: 0.6, p: 0.3 }}
                />
                <Box sx={{ py: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: (selected || isSelfOption) ? 700 : 600 }}>
                    {option.full_name || option.username}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isSelfOption
                      ? "You (pre-selected)"
                      : alreadySent
                      ? "Already sent"
                      : (option.student_id || option.username)}
                  </Typography>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Members"
              placeholder="Search and select members"
              helperText={`Selected: ${selectedMemberIds.length}${additionalLimit !== null ? ` / ${additionalLimit}` : ""}`}
            />
          )}
        />
      ) : null}
      {allowsGroup && !selectedGroup && blockedStudents.length > 0 ? (
        <Alert severity="warning">
          {blockedStudents.length} student(s) already have a request in this assessment.
        </Alert>
      ) : null}
    </Stack>
  );
};

export default AssessmentRequestFields;
