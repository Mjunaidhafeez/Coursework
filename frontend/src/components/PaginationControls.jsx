import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";

const PaginationControls = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <Stack className="listing-pagination" direction={{ xs: "column", md: "row" }} spacing={0.8} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ mt: 0.8 }}>
      <Typography variant="body2" color="text.secondary">
        {`Page ${page} of ${totalPages} ù ${total} records`}
      </Typography>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <TextField
          size="small"
          select
          label="Page Size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          sx={{ width: 120 }}
        >
          {[5, 10, 20, 50].map((size) => (
            <MenuItem key={size} value={size}>{size}</MenuItem>
          ))}
        </TextField>
        <Button size="small" variant="outlined" disabled={!canPrev} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        <Button size="small" variant="outlined" disabled={!canNext} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </Box>
    </Stack>
  );
};

export default PaginationControls;
