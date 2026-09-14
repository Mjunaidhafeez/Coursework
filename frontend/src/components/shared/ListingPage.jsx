import { Paper, Stack, Typography } from "@mui/material";

const ListingPage = ({
  title,
  actions = null,
  addForm = null,
  tabs = null,
  filters = null,
  children,
}) => (
  <Stack spacing={0.9} sx={{ minHeight: "calc(100vh - 128px)" }}>
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", color: "#13377a", lineHeight: 1.2 }}>
        {title}
      </Typography>
      {actions}
    </Stack>
    {addForm}
    {tabs}
    {filters}
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        borderColor: "#dbeafe",
        bgcolor: "#fff",
        flex: 1,
        minHeight: 0,
      }}
    >
      {children}
    </Paper>
  </Stack>
);

export default ListingPage;
