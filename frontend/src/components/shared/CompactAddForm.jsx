import { Button, Paper, Stack, Typography } from "@mui/material";

const CompactAddForm = ({
  title,
  children,
  onSubmit,
  onClear,
  submitLabel = "Add",
  clearLabel = "Clear",
  extra = null,
}) => (
  <Paper variant="outlined" sx={{ p: 0.85, borderColor: "#dbeafe", bgcolor: "#f8fbff" }}>
    <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.7 }}>
      <Typography sx={{ fontWeight: 800, fontSize: "0.86rem", color: "#13377a" }}>{title}</Typography>
      {extra}
    </Stack>
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" alignItems="flex-start">
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
