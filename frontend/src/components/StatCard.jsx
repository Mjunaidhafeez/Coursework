import { Box, Card, CardContent, Typography } from "@mui/material";

const StatCard = ({ label, value, accent = "#1d4fbf", valueFontSize = "1.75rem" }) => (
  <Card
    sx={{
      border: "1px solid #e3e9f7",
      borderRadius: 2,
      boxShadow: "0 8px 20px rgba(30, 58, 130, 0.08)",
      background: "linear-gradient(180deg, #ffffff 0%, #f7faff 100%)",
      transition: "transform 0.22s ease, box-shadow 0.22s ease",
      "&:hover": {
        transform: "translateY(-3px)",
        boxShadow: "0 14px 26px rgba(30, 58, 130, 0.16)",
      },
    }}
  >
    <CardContent sx={{ p: 1.35, "&:last-child": { pb: 1.35 } }}>
      <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600, fontSize: "0.72rem" }}>
        {label}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.6 }}>
        <Box sx={{ width: 16, height: 10, borderRadius: 0.8, bgcolor: `${accent}22`, border: `1px solid ${accent}44` }} />
        <Typography sx={{ color: accent, fontWeight: 700, fontSize: valueFontSize, lineHeight: 1.2, textAlign: "right" }}>{value}</Typography>
      </Box>
    </CardContent>
  </Card>
);

export default StatCard;
