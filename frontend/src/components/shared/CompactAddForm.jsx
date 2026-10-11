import { Button, Paper, Stack, Typography } from "@mui/material";

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
  <Paper variant="outlined" sx={{ p: 0.85, borderColor: "#dbeafe", bgcolor: "#f8fbff", "&:hover": { boxShadow: "0 14px 28px rgba(15, 33, 75, 0.1)" } }}>
    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.7 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.86rem", color: "#13377a" }}>{title}</Typography>
      {extra}
    </Stack>
    <Stack
      direction={layout === "stack" ? "column" : "row"}
      spacing={layout === "stack" ? 1 : 0.8}
      useFlexGap
      flexWrap={layout === "stack" ? "nowrap" : "wrap"}
      alignItems={layout === "stack" ? "stretch" : "flex-start"}
    >
      {children}
      <Stack direction="row" spacing={0.6} sx={{ alignSelf: { xs: "stretch", sm: layout === "stack" ? "flex-start" : "center" } }}>
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
