import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { UiProvider } from "./context/UiContext";
import "./styles.css";

const theme = createTheme({
  shape: { borderRadius: 12 },
  palette: {
    primary: { main: "#2354c7" },
    secondary: { main: "#7c3aed" },
    background: { default: "#eef3fb", paper: "#ffffff" },
    text: { primary: "#10213f", secondary: "#4c5d7d" },
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    fontSize: 15,
    h6: { fontWeight: 800 },
    subtitle1: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background:
            "radial-gradient(circle at 12% 18%, #dbeafe 0%, transparent 30%), radial-gradient(circle at 88% 7%, #e9d5ff 0%, transparent 28%), #eef3fb",
          animation: "ambientGlow 14s ease-in-out infinite",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: "1px solid #deE8fb",
          boxShadow: "0 10px 24px rgba(15, 33, 75, 0.07)",
          backdropFilter: "blur(4px)",
          transition: "box-shadow .22s ease, transform .22s ease, border-color .22s ease",
          "&:hover": {
            boxShadow: "0 14px 28px rgba(15, 33, 75, 0.11)",
            borderColor: "#c7dafb",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: "0.95rem",
          textTransform: "none",
          borderRadius: 10,
          fontWeight: 700,
          transition: "transform .16s ease, box-shadow .2s ease, filter .2s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            filter: "brightness(1.02)",
          },
        },
        contained: {
          boxShadow: "0 8px 18px rgba(35, 84, 199, 0.22)",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: "0.98rem",
          borderRadius: 10,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          background: "#f9fbff",
          transition: "box-shadow .2s ease, border-color .2s ease, background-color .2s ease",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "#d8e4fb",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "#aac2f3",
          },
          "&.Mui-focused": {
            boxShadow: "0 0 0 3px rgba(35,84,199,.12)",
            background: "#ffffff",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: "0.95rem",
        },
        head: {
          fontWeight: 800,
          color: "#193266",
          background: "#f4f8ff",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
        },
        label: {
          fontSize: "0.82rem",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          transition: "background-color .2s ease, transform .18s ease",
          "&:hover": {
            transform: "translateX(2px)",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "background-color .2s ease, transform .16s ease",
          "&:hover": {
            transform: "translateY(-1px)",
            backgroundColor: "rgba(35,84,199,0.08)",
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: "background-color .16s ease",
          "&:hover td": {
            backgroundColor: "rgba(35,84,199,0.035)",
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <UiProvider>
            <App />
          </UiProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
