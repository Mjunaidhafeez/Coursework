import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import AuthCard from "../../components/auth/AuthCard";
import LoginScene from "../../components/auth/LoginScene";
import { useAuth } from "../../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        background: "radial-gradient(circle at 10% 20%, #3157c2 0%, #152347 48%, #0e1a39 100%)",
        overflow: "hidden",
        position: "relative",
        "@keyframes floatY": {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
          "100%": { transform: "translateY(0px)" },
        },
        "@keyframes popIn": {
          "0%": { opacity: 0, transform: "translateY(16px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "@keyframes spinSlow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "@keyframes pulseGlow": {
          "0%": { opacity: 0.45, transform: "scale(1)" },
          "50%": { opacity: 0.9, transform: "scale(1.07)" },
          "100%": { opacity: 0.45, transform: "scale(1)" },
        },
      }}
    >
      <LoginScene />
      <AuthCard>
        <Typography variant="h5" fontWeight={700} mb={2} className="premium-heading">
          Student Assesement Tracking Login
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Sign in with your role-based account.
        </Typography>
        <form onSubmit={onSubmit}>
          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Username"
              value={form.username}
              onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
              required
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((prev) => !prev)}>
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
                textTransform: "none",
                fontWeight: 700,
                background: "linear-gradient(90deg, #1f49b7 0%, #2f63d9 100%)",
                transition: "all 0.22s ease",
                "&:hover": {
                  background: "linear-gradient(90deg, #1a3e99 0%, #2958c5 100%)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </Button>
          </Stack>
        </form>
      </AuthCard>
    </Box>
  );
};

export default LoginPage;
