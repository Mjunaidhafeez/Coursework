import { Autocomplete, Chip, TextField } from "@mui/material";

import { studentNameRollLabel, sortStudentsByRollOrUsername } from "../../utils/groupForm";

const GroupMemberPicker = ({
  students = [],
  knownStudents = {},
  memberIds = [],
  onChange,
  assignedGroupByStudentId = {},
  editingId = null,
  error = "",
  loading = false,
  emptyHint = "No students match these filters.",
  lockedIds = [],
}) => {
  const lockedSet = new Set((lockedIds || []).map(Number));
  const visible = sortStudentsByRollOrUsername(students);
  const selectedSet = new Set((memberIds || []).map(Number));

  const resolve = (id) =>
    knownStudents[Number(id)]
    || visible.find((student) => Number(student.id) === Number(id))
    || { id, full_name: `#${id}` };

  const byId = new Map(visible.map((student) => [Number(student.id), student]));
  (memberIds || []).forEach((id) => {
    if (!byId.has(Number(id))) byId.set(Number(id), resolve(id));
  });
  const options = sortStudentsByRollOrUsername([...byId.values()]);
  const selected = (memberIds || []).map(resolve);

  const isLockedMember = (studentId) => lockedSet.has(Number(studentId));
  const isBlocked = (studentId) => {
    if (isLockedMember(studentId)) return false;
    const linked = assignedGroupByStudentId[Number(studentId)];
    return Boolean(linked) && (!editingId || Number(linked.groupId) !== Number(editingId));
  };

  const busyLabel = (student) => {
    const linked = assignedGroupByStudentId[Number(student.id)];
    if (!linked) return "";
    return linked.status === "pending" ? `Pending: ${linked.groupName}` : `In ${linked.groupName}`;
  };

  return (
    <Autocomplete
      className="group-member-picker"
      multiple
      size="small"
      options={options}
      value={selected}
      loading={loading}
      disableCloseOnSelect
      getOptionLabel={studentNameRollLabel}
      isOptionEqualToValue={(option, value) => Number(option.id) === Number(value.id)}
      getOptionDisabled={(student) => isBlocked(student.id) && !selectedSet.has(Number(student.id))}
      filterOptions={(opts, { inputValue }) => {
        const query = inputValue.trim().toLowerCase();
        if (!query) return opts;
        return opts.filter((student) => studentNameRollLabel(student).toLowerCase().includes(query));
      }}
      onChange={(_, next) => {
        const keptLocked = (memberIds || []).filter((id) => isLockedMember(id));
        const picked = next
          .map((student) => Number(student.id))
          .filter((id) => !isBlocked(id) || selectedSet.has(id));
        onChange([...new Set([...keptLocked, ...picked])]);
      }}
      ListboxProps={{ style: { maxHeight: 220 } }}
      renderTags={(value, getTagProps) =>
        value.map((student, index) => {
          const tagProps = getTagProps({ index });
          const locked = isLockedMember(student.id);
          return (
            <Chip
              {...tagProps}
              key={student.id}
              size="small"
              label={studentNameRollLabel(student)}
              disabled={locked}
              onDelete={locked ? undefined : tagProps.onDelete}
            />
          );
        })
      }
      renderOption={(props, student) => {
        const { key, ...optionProps } = props;
        const blocked = isBlocked(student.id);
        const busy = blocked ? busyLabel(student) : "";
        return (
          <li key={key} {...optionProps}>
            {studentNameRollLabel(student)}
            {busy ? ` — ${busy}` : ""}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          size="small"
          label="Students"
          error={Boolean(error)}
          helperText={error || (loading ? "Loading students…" : !options.length ? emptyHint : `${memberIds.length} selected`)}
        />
      )}
    />
  );
};

export default GroupMemberPicker;
