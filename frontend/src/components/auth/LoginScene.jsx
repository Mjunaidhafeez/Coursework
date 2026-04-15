import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import { Avatar, Box, Stack, Typography } from "@mui/material";

const orbConfig = [
  { top: 80, left: 120, size: 220, color: "rgba(130, 170, 255, 0.22)", blur: 8, duration: "6s" },
  { bottom: 80, right: 120, size: 180, color: "rgba(78, 126, 255, 0.28)", blur: 6, duration: "5s" },
  { top: "40%", left: "46%", size: 120, color: "rgba(52, 105, 255, 0.16)", blur: 4, duration: "7s" },
];

const LoginScene = () => (
  <>
    {orbConfig.map((orb, idx) => (
      <Box
        key={`${orb.size}-${idx}`}
        sx={{
          position: "absolute",
          top: orb.top,
          left: orb.left,
          right: orb.right,
          bottom: orb.bottom,
          width: orb.size,
          height: orb.size,
          borderRadius: "50%",
          bgcolor: orb.color,
          filter: `blur(${orb.blur}px)`,
          animation: `floatY ${orb.duration} ease-in-out infinite`,
        }}
      />
    ))}

    <Stack
      sx={{
        width: { xs: "0%", md: "52%" },
        display: { xs: "none", md: "flex" },
        justifyContent: "center",
        px: 6,
        py: 6,
        position: "relative",
        zIndex: 1,
      }}
      spacing={3}
    >
      <Avatar
        sx={{
          width: 74,
          height: 74,
          bgcolor: "#2f63d9",
          boxShadow: "0 10px 20px rgba(47, 99, 217, 0.42)",
          animation: "floatY 4.5s ease-in-out infinite",
        }}
      >
        <SchoolRoundedIcon />
      </Avatar>

      <Typography sx={{ color: "white", fontSize: "2rem", fontWeight: 800, lineHeight: 1.15 }}>
        Manage Student Assesement Tracking
        <br />
        with Confidence
      </Typography>

      <Typography sx={{ color: "rgba(233, 240, 255, 0.88)", maxWidth: 460 }}>
        Unified submission, grading, and progress tracking portal for students, teachers, and administrators.
      </Typography>

    </Stack>
  </>
);

export default LoginScene;
