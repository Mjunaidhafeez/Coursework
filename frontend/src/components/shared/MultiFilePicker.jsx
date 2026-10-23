import { Button } from "@mui/material";

const MultiFilePicker = ({
  accept,
  files = [],
  onChange,
  label = "Choose files",
  disabled = false,
}) => (
  <Button size="small" variant="outlined" component="label" disabled={disabled}>
    {files.length ? `${files.length} file(s) selected` : label}
    <input
      hidden
      type="file"
      accept={accept}
      multiple
      disabled={disabled}
      onChange={(e) => {
        onChange(Array.from(e.target.files || []));
        e.target.value = "";
      }}
    />
  </Button>
);

export default MultiFilePicker;
