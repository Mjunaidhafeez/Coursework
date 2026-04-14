import { Alert, Snackbar } from "@mui/material";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const UiContext = createContext(null);

export const UiProvider = ({ children }) => {
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const notify = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const closeToast = () => setToast((prev) => ({ ...prev, open: false }));

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <UiContext.Provider value={value}>
      {children}
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
