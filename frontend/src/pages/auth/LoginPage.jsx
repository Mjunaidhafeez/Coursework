import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import { useAuth } from "../../context/AuthContext";
import { usePortalSettings } from "../../context/PortalSettingsContext";
import { resolveTheme } from "../../theme/portalTheme";

const fallbackCampus = `${import.meta.env.BASE_URL}login/campus.png?v=7`;

const LoginPage = () => {
  const { login } = useAuth();
  const { settings } = usePortalSettings();
  const palette = resolveTheme(settings.theme);
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const background = settings.login_background_url || fallbackCampus;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: palette.navy,
        "@keyframes fadeUp": {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        component="img"
        src={background}
        alt=""
        sx={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 40%",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: `linear-gradient(180deg, ${palette.navy}b8 0%, ${palette.navy}61 46%, ${palette.navy}47 100%)`,
            md: `linear-gradient(105deg, ${palette.navy}c7 0%, ${palette.navy}85 34%, ${palette.navy}29 58%, ${palette.navy}14 100%)`,
          },
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          px: { xs: 2.2, md: 7 },
          py: { xs: 2.2, md: 3 },
        }}
      >
        <Box sx={{ maxWidth: 560 }}>
          {settings.logo_url ? (
            <Box component="img" src={settings.logo_url} alt={settings.app_name} sx={{ height: 42, objectFit: "contain", mb: 1.2, display: { xs: "block", md: "block" }, mx: { xs: "auto", md: 0 } }} />
          ) : null}
          <Typography
            sx={{
              color: palette.accent,
              letterSpacing: { xs: "0.1em", md: "0.16em" },
              fontWeight: 700,
              fontSize: { xs: "0.72rem", md: "0.78rem" },
              textTransform: "uppercase",
              textAlign: { xs: "center", md: "left" },
            }}
          >
            {settings.university_name}
          </Typography>
          <Box
            sx={{
              mt: 1,
              mb: 0.8,
              width: 42,
              height: 2,
              borderRadius: 99,
              background: palette.accent,
              mx: { xs: "auto", md: 0 },
            }}
          />
          {settings.footer_text ? (
            <Typography
              sx={{
                color: "rgba(255,255,255,0.86)",
                fontWeight: 500,
                fontSize: { xs: "0.78rem", md: "0.82rem" },
                letterSpacing: "0.01em",
                wordSpacing: "0.08em",
                textAlign: { xs: "center", md: "left" },
                lineHeight: 1.5,
              }}
            >
              {settings.footer_text}
            </Typography>
          ) : null}
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: { xs: "flex-start", md: "center" },
            pt: { xs: 5, md: 0 },
            pb: { xs: 4, md: 6 },
          }}
        >
          <Box sx={{ width: "100%", maxWidth: 430, animation: "fadeUp 560ms ease-out" }}>
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 800,
                fontSize: { xs: "1.85rem", md: "2.15rem" },
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                mb: 0.8,
                textAlign: { xs: "center", md: "left" },
              }}
            >
              {settings.tagline}
            </Typography>
            <Typography
              sx={{
                color: "rgba(255,255,255,0.78)",
                fontSize: "0.95rem",
                lineHeight: 1.55,
                mb: 3,
                maxWidth: 380,
                textAlign: { xs: "center", md: "left" },
                mx: { xs: "auto", md: 0 },
              }}
            >
              {settings.login_subtitle}
            </Typography>

            <Paper
              elevation={0}
              sx={{
                p: { xs: 3, sm: 3.5 },
                borderRadius: 3,
                background: "rgba(255,255,255,0.96)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "0 18px 48px rgba(6, 14, 32, 0.28)",
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: "1.2rem", color: palette.navy, letterSpacing: "-0.01em", mb: 0.4 }}>
                {settings.login_button_text || "Sign in"}
              </Typography>
              <Typography sx={{ color: "#5b6b86", fontSize: "0.86rem", mb: 2.4 }}>
                Use your portal username and password.
              </Typography>
              <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                  {error && <Alert severity="error">{error}</Alert>}
                  <TextField
                    label="Username"
                    value={form.username}
                    onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    fullWidth
                    autoComplete="username"
                  />
                  <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    fullWidth
                    autoComplete="current-password"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowPassword((prev) => !prev)} aria-label="Toggle password visibility">
                            {showPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    endIcon={<LockOpenRoundedIcon />}
                    sx={{
                      mt: 0.4,
                      py: 1.2,
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.98rem",
                      borderRadius: 2,
                      background: palette.primary,
                      boxShadow: `0 10px 20px ${palette.primary}47`,
                      "&:hover": { background: palette.navy },
                    }}
                  >
                    {loading ? "Signing in..." : (settings.login_button_text || "Sign in")}
                  </Button>
                </Stack>
              </form>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
