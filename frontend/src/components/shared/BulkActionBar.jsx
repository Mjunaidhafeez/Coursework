import { Button, Stack, Typography } from "@mui/material";

const BulkActionBar = ({ count, onClear, onDelete, deleteLabel = "Delete selected", deleteColor = "error", updateSlot = null }) => {
  if (!count) return null;
  return (
    <Stack
      direction="row"
      spacing={0.8}
      useFlexGap
      flexWrap="wrap"
      alignItems="center"
      sx={{ mb: 1, p: 1, border: "1px solid #dbeafe", borderRadius: 1.5, bgcolor: "#f8fbff" }}
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
