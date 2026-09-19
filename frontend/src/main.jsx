import React, { useEffect, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline } from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { PortalSettingsProvider, usePortalSettings } from "./context/PortalSettingsContext";
import { UiProvider } from "./context/UiContext";
import { applyPortalCssVars, buildMuiThemeOptions } from "./theme/portalTheme";
import "./styles.css";

const ThemedApp = ({ children }) => {
  const { settings } = usePortalSettings();
  const theme = useMemo(() => createTheme(buildMuiThemeOptions(settings)), [settings.theme]);
  useEffect(() => {
    applyPortalCssVars(settings);
  }, [settings]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <PortalSettingsProvider>
        <ThemedApp>
          <AuthProvider>
            <UiProvider>
              <App />
            </UiProvider>
          </AuthProvider>
        </ThemedApp>
      </PortalSettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
