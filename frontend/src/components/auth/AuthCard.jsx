import { Box, Paper } from "@mui/material";

const AuthCard = ({ children, width = { xs: "92%", sm: 420, md: "34%" }, maxWidth = 460, sx = {} }) => (
  <Paper
    sx={{
      p: 4.2,
      width,
      maxWidth,
      my: "auto",
      mr: { md: 5 },
      borderRadius: 4,
      background: "rgba(255,255,255,0.93)",
      backdropFilter: "blur(10px)",
      border: "1px solid rgba(255,255,255,0.5)",
      boxShadow: "0 20px 45px rgba(7, 15, 38, 0.45)",
      animation: "popIn 450ms ease-out",
      position: "relative",
      overflow: "hidden",
      ...sx,
    }}
  >
    <Box
      sx={{
        position: "absolute",
        right: -70,
        top: -70,
        width: 180,
        height: 180,
        borderRadius: "50%",
        border: "2px solid rgba(54, 99, 224, 0.18)",
        animation: "spinSlow 18s linear infinite",
      }}
    />
    <Box
      sx={{
        position: "absolute",
        left: -25,
        top: 22,
        width: 14,
        height: 14,
        borderRadius: "50%",
        bgcolor: "#2f63d9",
        animation: "pulseGlow 2.4s ease-in-out infinite",
      }}
    />
    {children}
  </Paper>
);

export default AuthCard;
