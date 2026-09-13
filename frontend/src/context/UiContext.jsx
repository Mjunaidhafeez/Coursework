import { Alert, Box, LinearProgress, Snackbar } from "@mui/material";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { subscribeApiPendingRequests } from "../api/client";

const UiContext = createContext(null);

export const UiProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  const [apiPendingCount, setApiPendingCount] = useState(0);
  const [manualPendingCount, setManualPendingCount] = useState(0);
  const [showBar, setShowBar] = useState(false);

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
    let timer;
    if (isGlobalLoading) {
      timer = setTimeout(() => setShowBar(true), 90);
    } else {
      timer = setTimeout(() => setShowBar(false), 220);
    }
    return () => clearTimeout(timer);
  }, [isGlobalLoading]);

  const value = useMemo(
    () => ({ notify, startLoading, stopLoading, isGlobalLoading }),
    [notify, startLoading, stopLoading, isGlobalLoading]
  );

  return (
    <UiContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.modal - 1,
          pointerEvents: "none",
          opacity: showBar ? 1 : 0,
          transition: "opacity 220ms ease",
        }}
      >
        <LinearProgress
          sx={{
            height: 3,
            backgroundColor: "rgba(255,255,255,0.18)",
            "& .MuiLinearProgress-bar": {
              background: "linear-gradient(90deg, #93c5fd 0%, #60a5fa 50%, #3b82f6 100%)",
            },
          }}
        />
      </Box>
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
