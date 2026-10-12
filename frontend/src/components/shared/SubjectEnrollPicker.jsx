import { Autocomplete, Chip, MenuItem, TextField } from "@mui/material";

import { compactFieldSx } from "./listingStyles";
import SelectPlaceholder from "./SelectPlaceholder";

const courseLabel = (course) =>
  [course.code, course.title, course.semester_name || (course.semester_number ? `Sem ${course.semester_number}` : "")]
    .filter(Boolean)
    .join(" · ");

const SubjectEnrollPicker = ({
  courses = [],
  departments = [],
  semesters = [],
  selectedIds = [],
  onChange,
  filter,
  onFilterChange,
}) => {
  const selectedSet = new Set((selectedIds || []).map(String));
  const visible = (courses || []).filter((course) => {
    if (filter?.department && String(course.department || "") !== String(filter.department)) return false;
    if (filter?.semester && String(course.semester || "") !== String(filter.semester)) return false;
    return true;
  });
  const byId = new Map(visible.map((course) => [String(course.id), course]));
  (courses || []).forEach((course) => {
    if (selectedSet.has(String(course.id))) byId.set(String(course.id), course);
  });
  const selected = (selectedIds || []).map((id) => byId.get(String(id))).filter(Boolean);

  return (
    <>
      <TextField
        select
        size="small"
        label="Enroll department"
        value={filter?.department || ""}
        sx={compactFieldSx}
        onChange={(e) => onFilterChange({ ...filter, department: e.target.value })}
      >
        <SelectPlaceholder items={departments} readyText="All departments" emptyText="None yet" />
        {departments.map((item) => (
          <MenuItem key={item.id} value={String(item.id)}>{item.name}</MenuItem>
        ))}
      </TextField>
      <TextField
        select
        size="small"
        label="Enroll semester"
        value={filter?.semester || ""}
        sx={compactFieldSx}
        onChange={(e) => onFilterChange({ ...filter, semester: e.target.value })}
      >
        <SelectPlaceholder items={semesters} readyText="All semesters" emptyText="None yet" />
        {semesters.map((item) => (
          <MenuItem key={item.id} value={String(item.id)}>{item.number}</MenuItem>
        ))}
      </TextField>
      <Autocomplete
        multiple
        size="small"
        options={visible}
        value={selected}
        disableCloseOnSelect
        getOptionLabel={courseLabel}
        isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
        onChange={(_, next) => onChange(next.map((course) => String(course.id)))}
        renderTags={(value, getTagProps) =>
          value.map((course, index) => {
            const tagProps = getTagProps({ index });
            return <Chip {...tagProps} key={course.id} size="small" label={course.code || course.title} />;
          })
        }
        renderInput={(params) => (
          <TextField {...params} size="small" label="Enroll subjects" helperText="Optional — any semester or department" />
        )}
        sx={{ ...compactFieldSx, minWidth: { sm: 260 }, maxWidth: { sm: 360 }, flex: { sm: "1 1 260px" } }}
      />
    </>
  );
};

export default SubjectEnrollPicker;
