import { Box, Paper, Stack, Typography } from "@mui/material";

const ListingPage = ({
  title,
  subtitle = null,
  actions = null,
  addForm = null,
  tabs = null,
  filters = null,
  children,
}) => (
  <Stack spacing={0.9} sx={{ minHeight: "calc(100vh - 128px)" }}>
    <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", color: "#13377a", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: "#4b5d7a", mt: 0.35, maxWidth: 720 }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions}
    </Stack>
    {addForm ? <Box id="assessment-create-form">{addForm}</Box> : null}
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
