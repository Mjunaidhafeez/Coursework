import { Chip, Paper, Stack, Typography } from "@mui/material";

const ModuleHero = ({ title, subtitle, chips = [], actions = null, children = null }) => {
  return (
    <Paper
      sx={{
        p: 1.3,
        border: "1px solid #dbeafe",
        borderRadius: 2,
        background: "linear-gradient(130deg, #eff6ff 0%, #f8fbff 55%, #eef2ff 100%)",
      }}
    >
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ mb: 0.9 }} alignItems={{ md: "center" }}>
        <Stack spacing={0.2} sx={{ flex: 1 }}>
          <Typography className="premium-heading-soft" sx={{ fontWeight: 900, fontSize: "1.03rem" }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" sx={{ color: "#3e4d73" }}>
              {subtitle}
            </Typography>
          ) : null}
        </Stack>
        {actions}
      </Stack>

      {chips.length ? (
        <Stack direction="row" spacing={0.8} sx={{ mb: 0.8, flexWrap: "wrap" }}>
          {chips.map((chip) => (
            <Chip
              key={chip.label}
              size="small"
              label={chip.label}
              color={chip.color || "default"}
              variant={chip.variant || "outlined"}
            />
          ))}
        </Stack>
      ) : null}

      {children}
    </Paper>
  );
};

export default ModuleHero;
