import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import { useAuth } from "../../context/AuthContext";

const campusImage = `${import.meta.env.BASE_URL}login/campus.png?v=7`;
const developedBy = "Developed by : Junaid Hafeez (SVL) MBA NON Business 2025-2027";

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
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0b1524",
        "@keyframes fadeUp": {
          from: { opacity: 0, transform: "translateY(14px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        component="img"
        src={campusImage}
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
            xs: "linear-gradient(180deg, rgba(8,16,30,0.72) 0%, rgba(8,16,30,0.38) 46%, rgba(8,16,30,0.28) 100%)",
            md: "linear-gradient(105deg, rgba(8,16,30,0.78) 0%, rgba(8,16,30,0.52) 34%, rgba(8,16,30,0.16) 58%, rgba(8,16,30,0.08) 100%)",
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
          <Typography
            sx={{
              color: "#e8c77a",
              letterSpacing: { xs: "0.1em", md: "0.16em" },
              fontWeight: 700,
              fontSize: { xs: "0.72rem", md: "0.78rem" },
              textTransform: "uppercase",
              textAlign: { xs: "center", md: "left" },
            }}
          >
            Superior University Lahore
          </Typography>
          <Box
            sx={{
              mt: 1,
              mb: 0.8,
              width: 42,
              height: 2,
              borderRadius: 99,
              background: "#e8c77a",
              mx: { xs: "auto", md: 0 },
            }}
          />
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
            {developedBy}
          </Typography>
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
          <Box
            sx={{
              width: "100%",
              maxWidth: 430,
              animation: "fadeUp 560ms ease-out",
            }}
          >
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
              Student Assessment Tracking
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
              Sign in to manage coursework, submissions, and results.
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
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  color: "#122a57",
                  letterSpacing: "-0.01em",
                  mb: 0.4,
                }}
              >
                Sign in
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
                      background: "#1d4cb4",
                      boxShadow: "0 10px 20px rgba(29, 76, 180, 0.28)",
                      "&:hover": {
                        background: "#173f96",
                      },
                    }}
                  >
                    {loading ? "Signing in..." : "Sign in"}
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
