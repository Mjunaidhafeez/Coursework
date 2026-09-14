import LockOpenRoundedIcon from "@mui/icons-material/LockOpenRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import { Alert, Box, Button, IconButton, InputAdornment, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

import { useAuth } from "../../context/AuthContext";

const campusImage = `${import.meta.env.BASE_URL}login/campus.png`;
const classImage = `${import.meta.env.BASE_URL}login/class-group.png`;

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
        "@keyframes fadeUp": {
          from: { opacity: 0, transform: "translateY(18px)" },
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
          objectPosition: "center",
        }}
      />
      <Box
        component="img"
        src={classImage}
        alt=""
        sx={{
          position: "absolute",
          top: 0,
          right: 0,
          width: { xs: "100%", md: "58%" },
          height: "100%",
          objectFit: "cover",
          objectPosition: "center 22%",
          WebkitMaskImage: {
            xs: "linear-gradient(180deg, transparent 0%, #000 28%, #000 100%)",
            md: "linear-gradient(90deg, transparent 0%, #000 28%, #000 100%)",
          },
          maskImage: {
            xs: "linear-gradient(180deg, transparent 0%, #000 28%, #000 100%)",
            md: "linear-gradient(90deg, transparent 0%, #000 28%, #000 100%)",
          },
        }}
      />
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background: {
            xs: "linear-gradient(180deg, rgba(7,14,32,0.42) 0%, rgba(10,22,48,0.28) 45%, rgba(8,16,36,0.58) 100%)",
            md: "linear-gradient(90deg, rgba(7,14,32,0.38) 0%, rgba(10,22,48,0.22) 48%, rgba(8,16,36,0.46) 100%)",
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
          alignItems: "center",
          px: 2,
        }}
      >
        <Typography
          sx={{
            pt: { xs: 2.4, md: 3.2 },
            color: "#f3d38a",
            letterSpacing: { xs: "0.14em", md: "0.28em" },
            fontWeight: 700,
            fontSize: { xs: "0.78rem", md: "0.92rem" },
            textTransform: "uppercase",
            textAlign: "center",
            animation: "fadeUp 500ms ease-out",
          }}
        >
          Superior University Lahore
        </Typography>

        <Box
          sx={{
            flex: 1,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 3,
            gap: 2.4,
          }}
        >
          <Typography
            sx={{
              color: "#fff",
              fontWeight: 800,
              textAlign: "center",
              fontSize: { xs: "1.7rem", sm: "2.15rem", md: "2.55rem" },
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              textShadow: "0 8px 28px rgba(0,0,0,0.35)",
              animation: "fadeUp 600ms ease-out",
            }}
          >
            Student Assessment Tracking
          </Typography>

          <Paper
            elevation={0}
            sx={{
              width: "100%",
              maxWidth: 420,
              p: { xs: 3, sm: 3.6 },
              borderRadius: 3.5,
              background: "rgba(255,255,255,0.94)",
              backdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow: "0 22px 50px rgba(4, 10, 28, 0.38)",
              animation: "fadeUp 700ms ease-out",
            }}
          >
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.35rem",
                color: "#16356f",
                textAlign: "center",
                mb: 2.4,
              }}
            >
              Login Here
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
                />
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  required
                  fullWidth
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
                    mt: 0.5,
                    py: 1.15,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    background: "linear-gradient(90deg, #1d4cb4 0%, #2f63d9 100%)",
                    boxShadow: "0 10px 22px rgba(31, 76, 180, 0.32)",
                    "&:hover": {
                      background: "linear-gradient(90deg, #173f96 0%, #2756c2 100%)",
                    },
                  }}
                >
                  {loading ? "Signing in..." : "Login"}
                </Button>
              </Stack>
            </form>
          </Paper>
        </Box>

        <Typography
          sx={{
            pb: 2,
            color: "rgba(255,255,255,0.78)",
            fontSize: { xs: "0.72rem", sm: "0.8rem" },
            textAlign: "center",
            letterSpacing: "0.02em",
          }}
        >
          Developed by : Junaid Hafeez (SVL) MBA NON Business 2025-2027
        </Typography>
      </Box>
    </Box>
  );
};

export default LoginPage;
