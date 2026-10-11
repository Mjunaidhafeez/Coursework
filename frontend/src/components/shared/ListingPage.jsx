import { Box, Paper, Stack } from "@mui/material";

const ListingPage = ({
  actions = null,
  addForm = null,
  tabs = null,
  filters = null,
  toolbar = null,
  footer = null,
  fill = false,
  addFormMaxHeight = { xs: "28vh", md: "32vh" },
  children,
}) => (
  <Stack
    spacing={0.55}
    sx={{
      flex: 1,
      height: fill ? "100%" : { xs: "auto", md: "100%" },
      minHeight: 0,
      overflow: fill ? "hidden" : { xs: "visible", md: "hidden" },
    }}
  >
    {addForm ? (
      <Box
        id="assessment-create-form"
        sx={{
          flex: "0 1 auto",
          maxHeight: addFormMaxHeight,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {addForm}
      </Box>
    ) : null}

    <Paper
      variant="outlined"
      sx={{
        p: 0.65,
        borderColor: "#dbeafe",
        bgcolor: "#fff",
        flex: fill ? "1 1 0" : { xs: "none", md: 1 },
        minHeight: fill ? 0 : { xs: 220, md: 0 },
        display: "flex",
        flexDirection: "column",
        overflow: fill ? "hidden" : { xs: "visible", md: "hidden" },
      }}
    >
      {actions || tabs ? (
        <Stack direction="row" spacing={0.6} alignItems="center" justifyContent="space-between" sx={{ flexShrink: 0, mb: 0.5 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>{tabs}</Box>
          {actions}
        </Stack>
      ) : null}
      {filters ? <Box sx={{ flexShrink: 0, mb: 0.55 }}>{filters}</Box> : null}
      {toolbar ? (
        <Box sx={{ flexShrink: 0, mb: 0.55, maxHeight: { xs: "22vh", md: "24vh" }, overflow: "auto" }}>
          {toolbar}
        </Box>
      ) : null}
      <Box
        className="listing-scroll"
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: fill ? "hidden" : "auto",
          display: "flex",
          flexDirection: "column",
          "& thead th": {
            position: "sticky",
            top: "var(--listing-pin-top, 0px)",
            zIndex: 3,
            bgcolor: "#f7faff",
            boxShadow: "inset 0 -1px 0 #e6eefc",
          },
          "& .listing-pagination": {
            position: "sticky",
            bottom: 0,
            zIndex: 3,
            bgcolor: "#fff",
            pt: 0.7,
            mt: 0.7,
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
