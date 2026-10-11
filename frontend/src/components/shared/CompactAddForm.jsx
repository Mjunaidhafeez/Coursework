import { Button, Paper, Stack } from "@mui/material";

import { compactFieldSx } from "./listingStyles";

const CompactAddForm = ({
  children,
  onSubmit,
  onClear,
  submitLabel = "Add",
  clearLabel = "Clear",
  extra = null,
  layout = "row",
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 0.55,
      borderColor: "#dbeafe",
      bgcolor: "#f8fbff",
    }}
  >
    {extra}
    <Stack
      direction={layout === "stack" ? "column" : "row"}
      spacing={0.55}
      useFlexGap
      flexWrap="wrap"
      alignItems={layout === "stack" ? "stretch" : "center"}
      sx={{
        "& .MuiTextField-root": compactFieldSx,
        "& .group-member-picker": { width: "100%", flex: "1 1 100%", minWidth: 220 },
        "& .group-member-picker .MuiTextField-root": { maxWidth: "none", flex: "1 1 100%", minWidth: 220 },
      }}
    >
      {children}
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Button size="small" variant="contained" onClick={onSubmit}>
          {submitLabel}
        </Button>
        <Button size="small" variant="outlined" onClick={onClear}>
          {clearLabel}
        </Button>
      </Stack>
    </Stack>
  </Paper>
);

export default CompactAddForm;
