export const THEME_PRESETS = {
  navy: {
    id: "navy",
    label: "Navy",
    hint: "Current university blue",
    primary: "#2354c7",
    secondary: "#7c3aed",
    navy: "#102a5c",
    ink: "#13377a",
    header: "#1d4fbf",
    sidebarFrom: "#0a183e",
    sidebarTo: "#112b68",
    accent: "#e8c77a",
    bg: "#eef3fb",
  },
  emerald: {
    id: "emerald",
    label: "Emerald",
    hint: "Calm green campus",
    primary: "#0f766e",
    secondary: "#059669",
    navy: "#064e3b",
    ink: "#065f46",
    header: "#0f766e",
    sidebarFrom: "#022c22",
    sidebarTo: "#115e59",
    accent: "#fbbf24",
    bg: "#f0fdf8",
  },
  royal: {
    id: "royal",
    label: "Royal",
    hint: "Purple academic",
    primary: "#6d28d9",
    secondary: "#db2777",
    navy: "#3b0764",
    ink: "#5b21b6",
    header: "#6d28d9",
    sidebarFrom: "#2e1065",
    sidebarTo: "#6d28d9",
    accent: "#f9a8d4",
    bg: "#f5f3ff",
  },
  slate: {
    id: "slate",
    label: "Slate",
    hint: "Modern grey ERP",
    primary: "#334155",
    secondary: "#0ea5e9",
    navy: "#0f172a",
    ink: "#1e293b",
    header: "#334155",
    sidebarFrom: "#020617",
    sidebarTo: "#334155",
    accent: "#38bdf8",
    bg: "#f1f5f9",
  },
};

export const resolveTheme = (themeId) => THEME_PRESETS[themeId] || THEME_PRESETS.navy;

export const applyPortalCssVars = (branding) => {
  const palette = resolveTheme(branding?.theme);
  const root = document.documentElement;
  const vars = {
    "--portal-primary": palette.primary,
    "--portal-secondary": palette.secondary,
    "--portal-navy": palette.navy,
    "--portal-ink": palette.ink,
    "--portal-header": palette.header,
    "--portal-sidebar-from": palette.sidebarFrom,
    "--portal-sidebar-to": palette.sidebarTo,
    "--portal-accent": palette.accent,
    "--portal-bg": palette.bg,
  };
  Object.entries(vars).forEach(([key, value]) => root.style.setProperty(key, value));
  document.title = `${branding?.tagline || palette.label} | ${branding?.university_name || ""}`.replace(/\s+\|\s+$/, "");
};

export const buildMuiThemeOptions = (branding) => {
  const palette = resolveTheme(branding?.theme);
  return {
    shape: { borderRadius: 12 },
    palette: {
      primary: { main: palette.primary },
      secondary: { main: palette.secondary },
      background: { default: palette.bg, paper: "#ffffff" },
      text: { primary: palette.navy, secondary: "#4c5d7d" },
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
            background: `radial-gradient(circle at 12% 18%, ${palette.primary}22 0%, transparent 30%), radial-gradient(circle at 88% 7%, ${palette.secondary}22 0%, transparent 28%), ${palette.bg}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 14,
            border: "1px solid #deE8fb",
            boxShadow: "0 10px 24px rgba(15, 33, 75, 0.07)",
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
          },
          contained: {
            boxShadow: `0 8px 18px ${palette.primary}38`,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 800,
            color: palette.ink,
            background: "#f4f8ff",
          },
        },
      },
    },
  };
};
