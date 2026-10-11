import { Button, Paper, Stack, Typography } from "@mui/material";

import { compactFieldSx } from "./listingStyles";

const CompactAddForm = ({
  title,
  children,
  onSubmit,
  onClear,
  submitLabel = "Add",
  clearLabel = "Clear",
  extra = null,
  layout = "row",
}) => (
  <Paper variant="outlined" sx={{ p: 0.75, borderColor: "#dbeafe", bgcolor: "#f8fbff", "&:hover": { boxShadow: "0 14px 28px rgba(15, 33, 75, 0.1)" } }}>
    <Stack direction="row" spacing={0.7} alignItems="center" useFlexGap flexWrap="wrap" sx={{ mb: 0.55 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.84rem", color: "#13377a" }}>{title}</Typography>
      {extra}
    </Stack>
    <Stack
      direction={layout === "stack" ? "column" : "row"}
      spacing={layout === "stack" ? 0.7 : 0.7}
      useFlexGap
      flexWrap="wrap"
      alignItems={layout === "stack" ? "stretch" : "flex-start"}
      sx={{ "& .MuiTextField-root": compactFieldSx }}
    >
      {children}
      <Stack direction="row" spacing={0.6} sx={{ alignSelf: { xs: "stretch", sm: "center" } }}>
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
