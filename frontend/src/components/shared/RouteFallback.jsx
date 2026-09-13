import { Box } from "@mui/material";
import { useEffect } from "react";

import { useUi } from "../../context/UiContext";

const RouteFallback = () => {
  const { startLoading, stopLoading } = useUi();

  useEffect(() => {
    startLoading();
    return () => stopLoading();
  }, [startLoading, stopLoading]);

  return <Box sx={{ minHeight: 280 }} />;
};

export default RouteFallback;
