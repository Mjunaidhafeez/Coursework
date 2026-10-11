import { Button, Stack, Typography } from "@mui/material";
import { useLayoutEffect, useRef } from "react";

const PIN_VAR = "--listing-pin-top";

const BulkActionBar = ({ count, onClear, onDelete, deleteLabel = "Delete selected", deleteColor = "error", updateSlot = null }) => {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!count || !el) return undefined;
    const scroller = el.closest(".listing-scroll");
    if (!scroller) return undefined;
    const apply = () => scroller.style.setProperty(PIN_VAR, `${el.offsetHeight}px`);
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    apply();
    return () => {
      observer.disconnect();
      if (!scroller.querySelector(".listing-bulk-bar")) scroller.style.removeProperty(PIN_VAR);
    };
  }, [count]);

  if (!count) return null;

  return (
    <Stack
      ref={ref}
      className="listing-bulk-bar"
      direction="row"
      spacing={0.8}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 5,
        mb: 1,
        p: 1,
        border: "1px solid #dbeafe",
        borderRadius: 1.5,
        bgcolor: "#f8fbff",
        boxShadow: "0 6px 12px rgba(15, 40, 90, 0.06)",
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 800 }}>{count} selected</Typography>
      <Button size="small" onClick={onClear}>Clear</Button>
      {updateSlot}
      {onDelete ? (
        <Button size="small" color={deleteColor} variant="contained" onClick={onDelete}>
          {deleteLabel}
        </Button>
      ) : null}
    </Stack>
  );
};

export default BulkActionBar;
