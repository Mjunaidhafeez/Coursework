import { Box, Button, Checkbox, Chip, Stack, TextField, Typography } from "@mui/material";

import { getUserDisplayName } from "../../utils/userDisplay";
import { sortStudentsByRollOrUsername, studentOrgLabel } from "../../utils/groupForm";

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
  search = "",
  onSearchChange,
  lockedIds = [],
}) => {
  const lockedSet = new Set((lockedIds || []).map(Number));
  const visible = sortStudentsByRollOrUsername(students);
  const selectedSet = new Set((memberIds || []).map(Number));
  const visibleIds = visible.map((student) => Number(student.id));
  const hiddenSelected = (memberIds || [])
    .map((id) => knownStudents[Number(id)] || visible.find((student) => Number(student.id) === Number(id)))
    .filter((student) => student && !visibleIds.includes(Number(student.id)));

  const isLockedMember = (studentId) => lockedSet.has(Number(studentId));
  const isBlocked = (studentId) => {
    if (isLockedMember(studentId)) return false;
    const linked = assignedGroupByStudentId[Number(studentId)];
    return Boolean(linked) && (!editingId || Number(linked.groupId) !== Number(editingId));
  };

  const selectableVisible = visible.filter((student) => !isBlocked(student.id) && !isLockedMember(student.id));
  const allVisibleSelected = selectableVisible.length > 0 && selectableVisible.every((student) => selectedSet.has(Number(student.id)));

  const toggle = (studentId) => {
    const id = Number(studentId);
    if (isLockedMember(id) || isBlocked(id)) return;
    if (selectedSet.has(id)) {
      onChange(memberIds.filter((item) => Number(item) !== id));
      return;
    }
    onChange([...memberIds, id]);
  };

  const toggleVisible = () => {
    if (allVisibleSelected) {
      const drop = new Set(selectableVisible.map((student) => Number(student.id)));
      onChange(memberIds.filter((id) => !drop.has(Number(id))));
      return;
    }
    const next = new Set(memberIds.map(Number));
    selectableVisible.forEach((student) => next.add(Number(student.id)));
    onChange([...next]);
  };

  const renderRow = (student, extraLabel = "") => {
    const blocked = isBlocked(student.id);
    const locked = isLockedMember(student.id);
    const checked = selectedSet.has(Number(student.id));
    const linked = assignedGroupByStudentId[Number(student.id)];
    const busyLabel = linked?.status === "pending" ? `Pending request: ${linked.groupName}` : `Already in ${linked?.groupName}`;
    return (
      <Stack
        key={student.id}
        direction="row"
        spacing={1}
        alignItems="flex-start"
        sx={{
          px: 0.8,
          py: 0.55,
          borderBottom: "1px solid #e8eef8",
          bgcolor: checked ? "#eef5ff" : "#fff",
          opacity: blocked ? 0.62 : 1,
          cursor: blocked || locked ? "default" : "pointer",
        }}
        onClick={() => toggle(student.id)}
      >
        <Checkbox size="small" checked={checked} disabled={blocked || locked} sx={{ mt: -0.3 }} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: "#13377a" }}>
            {getUserDisplayName(student, { includeUsername: true })}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {student.student_id || student.username || "No roll no"}
            {studentOrgLabel(student) ? ` · ${studentOrgLabel(student)}` : ""}
          </Typography>
          {locked ? (
            <Typography variant="caption" color="primary">You · stays in this request</Typography>
          ) : blocked ? (
            <Typography variant="caption" color="error">{busyLabel}</Typography>
          ) : extraLabel ? (
            <Typography variant="caption" color="primary">{extraLabel}</Typography>
          ) : null}
        </Box>
      </Stack>
    );
  };

  return (
    <Box sx={{ width: "100%", minWidth: 0 }}>
      <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mb: 0.5 }}>
        <TextField
          size="small"
          label="Search name or roll no"
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          sx={{ minWidth: { xs: "47%", sm: 180 }, flex: { xs: "1 1 47%", sm: "0 0 200px" }, maxWidth: { sm: 240 } }}
        />
        <Chip size="small" color={memberIds.length ? "primary" : "default"} label={`${memberIds.length} selected`} />
        <Button size="small" variant="outlined" disabled={!selectableVisible.length} onClick={toggleVisible}>
          {allVisibleSelected ? "Clear visible" : "Select visible"}
        </Button>
      </Stack>
      {error ? <Typography variant="caption" color="error" sx={{ display: "block", mb: 0.4 }}>{error}</Typography> : null}
      <Box sx={{ maxHeight: 132, overflow: "auto", border: "1px solid #dbeafe", borderRadius: 1.2, bgcolor: "#fbfdff" }}>
        {hiddenSelected.map((student) => renderRow(student, "Selected · hidden by filters"))}
        {visible.map((student) => renderRow(student))}
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.2 }}>Loading students…</Typography>
        ) : null}
        {!loading && !visible.length && !hiddenSelected.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 1.2 }}>{emptyHint}</Typography>
        ) : null}
      </Box>
    </Box>
  );
};

export default GroupMemberPicker;
