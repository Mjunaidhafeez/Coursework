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
  addFormMaxHeight = { xs: "28vh", md: "30vh" },
  children,
}) => (
  <Stack
    spacing={0.75}
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
            <Typography variant="body2" sx={{ color: "#4b5d7a", mt: 0.15, maxWidth: 720, display: { xs: "none", md: "block" } }}>
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
        sx={{ flex: "0 1 auto", maxHeight: addFormMaxHeight, minHeight: 0, overflow: "auto" }}
      >
        {addForm}
      </Box>
    ) : null}

    <Paper
      variant="outlined"
      sx={{
        p: { xs: 0.75, md: 1 },
        borderColor: "#dbeafe",
        bgcolor: "#fff",
        transition: "box-shadow 200ms ease",
        "&:hover": { boxShadow: "0 16px 32px rgba(15, 33, 75, 0.08)" },
        flex: fill ? 1 : { xs: "none", md: 1 },
        minHeight: fill ? 0 : { xs: 240, md: 0 },
        display: "flex",
        flexDirection: "column",
        overflow: fill ? "hidden" : { xs: "visible", md: "hidden" },
      }}
    >
      {tabs ? <Box sx={{ flexShrink: 0, mb: filters || toolbar ? 0.7 : 0.4 }}>{tabs}</Box> : null}
      {filters ? <Box sx={{ flexShrink: 0, mb: 0.8, overflowX: "auto" }}>{filters}</Box> : null}
      {toolbar ? (
        <Box sx={{ flexShrink: 0, mb: 0.8, maxHeight: { xs: "22vh", md: "24vh" }, overflow: "auto" }}>
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
