import { Box, Paper, Stack, Typography } from "@mui/material";

const ListingPage = ({
  title,
  subtitle = null,
  actions = null,
  addForm = null,
  tabs = null,
  filters = null,
  toolbar = null,
  footer = null,
  children,
}) => (
  <Stack
    spacing={0.9}
    sx={{
      flex: 1,
      height: { xs: "auto", md: "100%" },
      minHeight: 0,
      overflow: { xs: "visible", md: "hidden" },
    }}
  >
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1}
      alignItems={{ xs: "stretch", sm: "flex-start" }}
      justifyContent="space-between"
      sx={{ flexShrink: 0 }}
    >
      <Box>
        <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", color: "#13377a", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="body2" sx={{ color: "#4b5d7a", mt: 0.35, maxWidth: 720, display: { xs: "none", md: "block" } }}>
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      {actions}
    </Stack>
    {addForm ? (
      <Box
        id="assessment-create-form"
        sx={{ flexShrink: 0, maxHeight: { xs: "34vh", md: "38vh" }, overflow: "auto" }}
      >
        {addForm}
      </Box>
    ) : null}
    {tabs ? <Box sx={{ flexShrink: 0 }}>{tabs}</Box> : null}
    {filters ? <Box sx={{ flexShrink: 0, overflowX: "auto" }}>{filters}</Box> : null}
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 0.8, md: 1 },
        borderColor: "#dbeafe",
        bgcolor: "#fff",
        flex: { xs: "none", md: 1 },
        minHeight: { xs: "auto", md: 0 },
        display: "flex",
        flexDirection: "column",
        overflow: { xs: "visible", md: "hidden" },
      }}
    >
      {toolbar ? (
        <Box sx={{ flexShrink: 0, mb: 1, maxHeight: { xs: "32vh", md: "36vh" }, overflow: "auto" }}>
          {toolbar}
        </Box>
      ) : null}
      <Box
        className="listing-scroll"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          "& thead th": {
            position: "sticky",
            top: 0,
            zIndex: 3,
            bgcolor: "#f7faff",
            boxShadow: "inset 0 -1px 0 #e6eefc",
          },
          "& .listing-pagination": {
            position: "sticky",
            bottom: 0,
            zIndex: 3,
            bgcolor: "#fff",
            pt: 1,
            mt: 1,
            borderTop: "1px solid #e8eef8",
          },
        }}
      >
        {children}
      </Box>
      {footer}
    </Paper>
  </Stack>
);

export default ListingPage;
