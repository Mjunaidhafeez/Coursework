import AssessmentIcon from "@mui/icons-material/Assessment";
import BookIcon from "@mui/icons-material/Book";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import GradingIcon from "@mui/icons-material/Grading";
import HomeIcon from "@mui/icons-material/Home";
import SchoolIcon from "@mui/icons-material/School";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

import { NAV_ITEMS } from "../utils/roleConfig";

const getIcon = (label) => {
  const value = label.toLowerCase();
  if (value.includes("dashboard")) return <DashboardIcon fontSize="small" />;
  if (value.includes("my coursework")) return <HomeIcon fontSize="small" />;
  if (value.includes("user") || value.includes("teacher") || value.includes("student")) return <SchoolIcon fontSize="small" />;
  if (value.includes("course")) return <BookIcon fontSize="small" />;
  if (value.includes("group")) return <GroupsIcon fontSize="small" />;
  if (value.includes("submit")) return <UploadFileIcon fontSize="small" />;
  if (value.includes("grad")) return <GradingIcon fontSize="small" />;
  return <AssessmentIcon fontSize="small" />;
};

const Sidebar = ({ role }) => {
  const items = NAV_ITEMS[role] || [];
  const roleTitleMap = {
    super_admin: "Admin Dashboard",
    teacher: "Teacher Dashboard",
    student: "Student Dashboard",
  };

  return (
    <Box
      sx={{
        width: 230,
        bgcolor: "rgba(10, 24, 62, 0.92)",
        background: "linear-gradient(180deg, rgba(10,24,62,0.94) 0%, rgba(17,43,104,0.9) 100%)",
        backdropFilter: "blur(6px)",
        color: "white",
        minHeight: "100vh",
        p: 1.4,
        borderRight: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 800, fontSize: "1rem" }}>
        {roleTitleMap[role] || "Dashboard"}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.7, mb: 2, display: "block" }}>
        Navigation
      </Typography>
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              py: 0.55,
              color: "#d9e4ff",
              "&.active": {
                bgcolor: "rgba(67, 123, 255, 0.22)",
                color: "white",
                border: "1px solid rgba(147, 197, 253, 0.45)",
              },
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "rgba(46, 103, 235, 0.28)",
                transform: "translateX(2px)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>{getIcon(item.label)}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
