import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";

import api from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import Sidebar from "../components/Sidebar";
import RouteFallback from "../components/shared/RouteFallback";
import { useAuth } from "../context/AuthContext";
import { useUi } from "../context/UiContext";
import { getTimeGreeting } from "../utils/greeting";
import { ROLES } from "../utils/roleConfig";

const DashboardLayout = () => {
  const { user, logout, refreshMe } = useAuth();
  const { notify } = useUi();
  const navigate = useNavigate();
  const [messageUnread, setMessageUnread] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    mailing_address: "",
    password: "",
    avatar: null,
  });
  const isStudent = user?.role === ROLES.STUDENT;
  const shownToastIdsRef = useRef(new Set());
  const headerConfig = {
    [ROLES.SUPER_ADMIN]: {
      title: "Student Assessment Submission Portal",
    },
    [ROLES.TEACHER]: {
      title: "Teacher Dashboard",
    },
    [ROLES.STUDENT]: {
      title: "Student Dashboard",
    },
  };
  const currentHeader = headerConfig[user?.role] || headerConfig[ROLES.SUPER_ADMIN];
  const greeting = getTimeGreeting();
  const GreetingIcon = greeting.Icon;
  const fullName = user?.full_name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.username || "User";
  const avatarSrc = user?.avatar
    ? `${user.avatar}${String(user.avatar).includes("?") ? "&" : "?"}v=${user?.avatar_cache_key || 1}`
    : undefined;
  const canEditNamePassword = [ROLES.STUDENT, ROLES.TEACHER].includes(user?.role);

  useEffect(() => {
    if (!user?.id) return undefined;

    let isActive = true;
    const fetchUnreadNotifications = async () => {
      try {
        const [recentRes, unreadRes, messageRes] = await Promise.all([
          api.get(`${ENDPOINTS.notifications}?page_size=8`, { skipGlobalLoader: true }),
          api.get(`${ENDPOINTS.notifications}?is_read=false&page_size=1`, { skipGlobalLoader: true }),
          api.get(ENDPOINTS.conversationUnread, { skipGlobalLoader: true }),
        ]);
        if (!isActive) return;

        const recent = recentRes.data.results || [];
        const unread = recent.filter((item) => !item.is_read);
        setNotifications(recent);
        setUnreadCount(unreadRes.data.count || unread.length);
        setMessageUnread(messageRes.data.unread_count || 0);

        unread
          .slice()
          .reverse()
          .forEach((item) => {
            if (shownToastIdsRef.current.has(item.id)) return;
            shownToastIdsRef.current.add(item.id);
            notify(item.title);
          });
      } catch {
        // Ignore transient notification polling errors to avoid noisy UX.
      }
    };

    fetchUnreadNotifications();
    const timer = setInterval(fetchUnreadNotifications, 30000);
    return () => {
      isActive = false;
      clearInterval(timer);
    };
  }, [notify, user?.id]);

  const menuOpen = Boolean(anchorEl);

  const openNotifications = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const closeNotifications = () => {
    setAnchorEl(null);
  };

  const markAllRead = async () => {
    try {
      await api.post(`${ENDPOINTS.notifications}mark_all_read/`);
      setUnreadCount(0);
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      notify("All notifications marked as read");
    } catch {
      notify("Failed to mark notifications as read", "error");
    }
  };

  const openProfile = () => {
    closeNotifications();
    setProfileForm({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      mailing_address: user?.mailing_address || user?.student_profile?.mailing_address || "",
      password: "",
      avatar: null,
    });
    setProfileOpen(true);
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setProfileSaving(false);
  };

  const saveProfile = async () => {
    const email = (profileForm.email || "").trim();
    if (!email) {
      notify("Email is required", "error");
      return;
    }
    const payload = new FormData();
    payload.append("email", email);
    payload.append("phone", profileForm.phone || "");
    if (isStudent) payload.append("mailing_address", profileForm.mailing_address || "");
    if (canEditNamePassword) {
      payload.append("first_name", profileForm.first_name || "");
      payload.append("last_name", profileForm.last_name || "");
      if (profileForm.password) payload.append("password", profileForm.password);
    }
    if (profileForm.avatar) {
      payload.append("avatar", profileForm.avatar);
    }

    setProfileSaving(true);
    try {
      await api.patch(ENDPOINTS.auth.me, payload, { headers: { "Content-Type": "multipart/form-data" } });
      await refreshMe();
      notify("Profile updated successfully");
      closeProfile();
    } catch (error) {
      notify(error?.response?.data?.password?.[0] || "Failed to update profile", "error");
      setProfileSaving(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        overflow: "hidden",
        background: "linear-gradient(130deg, #0f1c3f 0%, #1a2f69 45%, #2354c7 100%)",
      }}
    >
      <Box
        sx={{
          width: "100vw",
          height: "100%",
          display: "flex",
          overflow: "hidden",
          bgcolor: "rgba(243, 246, 252, 0.9)",
        }}
      >
        <Sidebar role={user?.role} />
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box
            sx={{
              flexShrink: 0,
              bgcolor: "rgba(29,79,191,0.95)",
              color: "white",
              px: { xs: 1.5, md: 2.4 },
              py: 1.05,
              borderBottom: "1px solid rgba(255,255,255,0.18)",
              boxShadow: "0 10px 24px rgba(9, 24, 62, 0.24)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2 }}>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 900,
                    lineHeight: 1.1,
                    fontSize: { xs: "1.05rem", md: "1.28rem" },
                    letterSpacing: "0.01em",
                    background: "linear-gradient(92deg, #ffffff 0%, #dbeafe 45%, #93c5fd 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    textShadow: "0 0 18px rgba(147, 197, 253, 0.35)",
                    "@keyframes titleGlowPulse": {
                      "0%, 100%": { textShadow: "0 0 14px rgba(147, 197, 253, 0.25)" },
                      "50%": { textShadow: "0 0 22px rgba(147, 197, 253, 0.45)" },
                    },
                    animation: "titleGlowPulse 4s ease-in-out infinite",
                  }}
                >
                  {currentHeader.title}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Chip label={(user?.role || "").replace("_", " ")} size="small" sx={{ bgcolor: "white", color: "#1d4fbf" }} />
                <IconButton
                  onClick={() => {
                    const path = {
                      super_admin: "/admin/messages",
                      teacher: "/teacher/messages",
                      student: "/student/messages",
                    }[user?.role];
                    if (path) navigate(path);
                  }}
                  sx={{ color: "white" }}
                  title="Messages"
                >
                  <Badge badgeContent={messageUnread} color="error">
                    <ChatBubbleOutlineRoundedIcon />
                  </Badge>
                </IconButton>
                <IconButton onClick={openNotifications} sx={{ color: "white" }}>
                  <Badge badgeContent={unreadCount} color="error">
                    <NotificationsNoneRoundedIcon />
                  </Badge>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={menuOpen}
                  onClose={closeNotifications}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{ sx: { width: 360, p: 1 } }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1, pt: 0.5, pb: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
                    <Button size="small" onClick={markAllRead}>Mark all read</Button>
                  </Stack>
                  {notifications.length ? (
                    <List dense disablePadding>
                      {notifications.map((item) => (
                        <ListItem key={item.id} sx={{ alignItems: "flex-start", py: 0.9, px: 1 }}>
                          <ListItemText
                            primary={item.title}
                            secondary={item.body || ""}
                            primaryTypographyProps={{ fontWeight: item.is_read ? 500 : 700 }}
                            secondaryTypographyProps={{ sx: { color: "text.secondary", mt: 0.3 } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary", px: 1, pb: 1.2 }}>
                      No notifications yet.
                    </Typography>
                  )}
                </Menu>
                <Stack direction="row" spacing={1} alignItems="center">
                  <IconButton onClick={openProfile} sx={{ p: 0.15 }}>
                    <Avatar src={avatarSrc} sx={{ width: 34, height: 34, bgcolor: "#11357f" }}>
                      {(fullName || "U").slice(0, 1).toUpperCase()}
                    </Avatar>
                  </IconButton>
                  <Box sx={{ display: { xs: "none", md: "block" } }}>
                    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ mb: 0.15 }}>
                      <GreetingIcon sx={{ fontSize: 16, color: "#fde68a" }} />
                      <Typography sx={{ fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.02em", opacity: 0.95 }}>
                        {greeting.label}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, lineHeight: 1.15 }}>
                      Welcome {fullName}
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", opacity: 0.82 }}>@{user?.username}</Typography>
                  </Box>
                </Stack>
                <Button variant="contained" color="inherit" onClick={logout} sx={{ color: "#1d4fbf", fontWeight: 700 }}>
                  Logout
                </Button>
              </Box>
            </Box>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden", p: { xs: 1, md: 1.15 }, display: "flex" }}>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                bgcolor: "rgba(255,255,255,0.78)",
                backdropFilter: "blur(8px)",
                border: "1px solid #e4eaf9",
                p: { xs: 1, md: 1.1 },
                borderRadius: 2,
                boxShadow: "0 10px 24px rgba(11, 39, 98, 0.12)",
              }}
            >
              <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <Dialog open={profileOpen} onClose={closeProfile} maxWidth="xs" fullWidth scroll="paper">
        <DialogTitle>My Profile</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.1} sx={{ mt: 0.6 }}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar src={avatarSrc} sx={{ width: 52, height: 52 }}>
                {(fullName || "U").slice(0, 1).toUpperCase()}
              </Avatar>
              <Button variant="outlined" component="label">
                Upload Avatar
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, avatar: e.target.files?.[0] || null }))}
                />
              </Button>
            </Stack>
            <TextField size="small" label="Username" value={user?.username || ""} disabled />
            <TextField
              size="small"
              required
              type="email"
              label="Email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
            />
            <TextField
              size="small"
              label="Phone / WhatsApp"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
              helperText="Optional. Used for WhatsApp portal updates."
            />
            {isStudent ? (
              <TextField
                size="small"
                label="Mailing address"
                value={profileForm.mailing_address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, mailing_address: e.target.value }))}
                multiline
                minRows={2}
                helperText="Optional."
              />
            ) : null}
            <TextField
              size="small"
              label="First Name"
              value={profileForm.first_name}
              disabled={!canEditNamePassword}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
            />
            <TextField
              size="small"
              label="Last Name"
              value={profileForm.last_name}
              disabled={!canEditNamePassword}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
            />
            <TextField
              size="small"
              type="password"
              label="New Password"
              value={profileForm.password}
              disabled={!canEditNamePassword}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
              helperText={canEditNamePassword ? "Minimum 8 characters." : "Name/password change is enabled for student/teacher."}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeProfile}>Cancel</Button>
          <Button onClick={saveProfile} variant="contained" disabled={profileSaving}>
            {profileSaving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardLayout;
