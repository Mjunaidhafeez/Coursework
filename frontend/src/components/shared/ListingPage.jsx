import { Box, Paper, Stack, Typography } from "@mui/material";

const ListingPage = ({
  title,
  subtitle = null,
  icon = null,
  actions = null,
  addForm = null,
  tabs = null,
  filters = null,
  toolbar = null,
  footer = null,
  fill = false,
  children,
}) => (
  <Stack
    spacing={0.9}
    sx={{
      flex: 1,
      height: fill ? "100%" : { xs: "auto", md: "100%" },
      minHeight: 0,
      overflow: fill ? "hidden" : { xs: "visible", md: "hidden" },
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="space-between"
      sx={{ flexShrink: 0 }}
    >
      <Stack direction="row" spacing={1} alignItems="center" minWidth={0}>
        {icon ? (
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.4,
              display: "grid",
              placeItems: "center",
              bgcolor: "#e8effc",
              color: "var(--portal-ink)",
              flexShrink: 0,
              "& svg": { fontSize: 18 },
            }}
          >
            {icon}
          </Box>
        ) : null}
        <Box minWidth={0}>
          <Typography sx={{ fontWeight: 800, fontSize: "1.02rem", color: "var(--portal-ink)", lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: "#4b5d7a", mt: 0.2, maxWidth: 720, display: { xs: "none", md: "block" } }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
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
        flex: fill ? 1 : { xs: "none", md: 1 },
        minHeight: fill ? 0 : { xs: "auto", md: 0 },
        display: "flex",
        flexDirection: "column",
        overflow: fill ? "hidden" : { xs: "visible", md: "hidden" },
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
          overflow: fill ? "hidden" : "auto",
          display: fill ? "flex" : "block",
          flexDirection: fill ? "column" : undefined,
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
