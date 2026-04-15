import { Alert, Backdrop, CircularProgress, Snackbar, Stack, Typography } from "@mui/material";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { subscribeApiPendingRequests } from "../api/client";

const UiContext = createContext(null);

export const UiProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [apiPendingCount, setApiPendingCount] = useState(0);
  const [manualPendingCount, setManualPendingCount] = useState(0);
  const [showBackdrop, setShowBackdrop] = useState(false);

  const notify = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const startLoading = useCallback(() => {
    setManualPendingCount((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setManualPendingCount((prev) => Math.max(0, prev - 1));
  }, []);

  const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    const unsubscribe = subscribeApiPendingRequests((count) => {
      setApiPendingCount(count);
    });
    return unsubscribe;
  }, []);

  const isGlobalLoading = apiPendingCount + manualPendingCount > 0;
  useEffect(() => {
    if (!isGlobalLoading) {
      setShowBackdrop(false);
      return undefined;
    }
    // Prevent brief request flicker and reduce "double loader" feeling on quick calls.
    const timer = setTimeout(() => setShowBackdrop(true), 220);
    return () => clearTimeout(timer);
  }, [isGlobalLoading]);

  const value = useMemo(
    () => ({ notify, startLoading, stopLoading, isGlobalLoading }),
    [notify, startLoading, stopLoading, isGlobalLoading]
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      <Backdrop
        open={showBackdrop}
        sx={{
          // Keep global loader under dialogs/menus to avoid profile popup layering issues.
          zIndex: (theme) => theme.zIndex.modal - 1,
          color: "#fff",
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(16, 33, 63, 0.35)",
        }}
      >
        <Stack alignItems="center" spacing={1.2}>
          <CircularProgress color="inherit" />
          <Typography sx={{ fontWeight: 700, letterSpacing: 0.2 }}>Please wait...</Typography>
        </Stack>
      </Backdrop>
      <Snackbar open={toast.open} autoHideDuration={2600} onClose={closeToast} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeToast} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </UiContext.Provider>
  );
};

export const useUi = () => {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error("useUi must be used inside UiProvider");
  return ctx;
};
