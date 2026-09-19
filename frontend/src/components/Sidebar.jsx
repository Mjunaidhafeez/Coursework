import AssessmentIcon from "@mui/icons-material/Assessment";
import BookIcon from "@mui/icons-material/Book";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import GradingIcon from "@mui/icons-material/Grading";
import HomeIcon from "@mui/icons-material/Home";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import SchoolIcon from "@mui/icons-material/School";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { NavLink } from "react-router-dom";

import { usePortalSettings } from "../context/PortalSettingsContext";
import { visibleNavItems } from "../utils/roleConfig";

const getIcon = (key, label) => {
  const value = `${key || ""} ${label || ""}`.toLowerCase();
  if (value.includes("setting")) return <SettingsRoundedIcon fontSize="small" />;
  if (value.includes("dashboard")) return <DashboardIcon fontSize="small" />;
  if (value.includes("submit") || value.includes("workflow")) return <UploadFileIcon fontSize="small" />;
  if (value.includes("user") || value.includes("teacher") || value.includes("student") || value.includes("super")) return <SchoolIcon fontSize="small" />;
  if (value.includes("course")) return <BookIcon fontSize="small" />;
  if (value.includes("group")) return <GroupsIcon fontSize="small" />;
  if (value.includes("email") || value.includes("mail")) return <MailOutlineRoundedIcon fontSize="small" />;
  if (value.includes("whatsapp")) return <WhatsAppIcon fontSize="small" />;
  if (value.includes("message")) return <ChatBubbleOutlineRoundedIcon fontSize="small" />;
  if (value.includes("grad") || value.includes("result")) return <GradingIcon fontSize="small" />;
  if (value.includes("assessment") || value.includes("approval")) return <HomeIcon fontSize="small" />;
  return <AssessmentIcon fontSize="small" />;
};

const Sidebar = ({ role, onNavigate }) => {
  const { settings, isModuleOn, labelFor } = usePortalSettings();
  const items = visibleNavItems(role, isModuleOn, labelFor);
  const brand = settings.sidebar_title || settings.app_name || "Portal";

  return (
    <Box
      sx={{
        width: { xs: 250, md: 230 },
        maxWidth: "100%",
        background: "linear-gradient(180deg, var(--portal-sidebar-from) 0%, var(--portal-sidebar-to) 100%)",
        backdropFilter: "blur(6px)",
        color: "white",
        height: "100%",
        overflow: "auto",
        p: 1.4,
        borderRight: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <StackBrand logo={settings.logo_url} brand={brand} />
      <List>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            onClick={onNavigate}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              py: 0.55,
              color: "#d9e4ff",
              "&.active": {
                bgcolor: "rgba(255,255,255,0.14)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.28)",
              },
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "rgba(255,255,255,0.12)",
                transform: "translateX(2px)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "inherit", minWidth: 34 }}>{getIcon(item.key, item.label)}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

const StackBrand = ({ logo, brand }) => (
  <Box sx={{ mb: 1.6 }}>
    {logo ? (
      <Box component="img" src={logo} alt={brand} sx={{ height: 34, maxWidth: "100%", objectFit: "contain", mb: 0.8, display: "block" }} />
    ) : null}
    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.25 }}>
      {brand}
    </Typography>
  </Box>
);

export default Sidebar;
