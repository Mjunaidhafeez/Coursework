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
  fill = false,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 0.55,
      borderColor: "#dbeafe",
      bgcolor: "#f8fbff",
      height: fill ? "100%" : "auto",
      minHeight: 0,
      display: fill ? "flex" : "block",
      flexDirection: fill ? "column" : undefined,
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
        flex: fill ? 1 : undefined,
        minHeight: 0,
        "& .MuiTextField-root": compactFieldSx,
        "& .group-member-picker": {
          width: "100%",
          flex: fill ? "1 1 auto" : undefined,
          minHeight: fill ? 0 : undefined,
        },
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
