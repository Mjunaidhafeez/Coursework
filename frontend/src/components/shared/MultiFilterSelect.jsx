import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from "@mui/material";

export const normalizeMultiFilter = (current, nextValue) => {
  const next = typeof nextValue === "string" ? nextValue.split(",") : nextValue;
  if (!current.length) return next.filter((value) => value && value !== "all");
  if (next.includes("all")) return [];
  return next.filter((value) => value && value !== "all");
};

const MultiFilterSelect = ({ label, value = [], options = [], onChange, minWidth = 188 }) => (
  <FormControl size="small" sx={{ minWidth, maxWidth: { xs: "100%", md: 280 } }}>
    <InputLabel>{label}</InputLabel>
    <Select
      multiple
      label={label}
      value={value.length ? value : ["all"]}
      onChange={(event) => onChange(normalizeMultiFilter(value, event.target.value))}
      renderValue={() => {
        if (!value.length) return `All ${label.toLowerCase()}`;
        const labels = options.filter((option) => value.includes(option.value)).map((option) => option.label);
        if (!labels.length) return `All ${label.toLowerCase()}`;
        return labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
      }}
      MenuProps={{ PaperProps: { sx: { maxHeight: 360 } } }}
    >
      <MenuItem value="all">
        <Checkbox size="small" checked={!value.length} />
        <ListItemText primary={`All ${label.toLowerCase()}`} />
      </MenuItem>
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          <Checkbox size="small" checked={value.includes(option.value)} />
          <ListItemText primary={option.label} />
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);

export default MultiFilterSelect;
