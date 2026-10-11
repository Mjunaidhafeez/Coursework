import { Box, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";

export const DEFAULT_PAGE_SIZE = 100;
export const PAGE_SIZE_OPTIONS = [5, 100, 150, 200, 1000];

const PaginationControls = ({ page, pageSize, total, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const sizeValue = PAGE_SIZE_OPTIONS.includes(Number(pageSize)) ? Number(pageSize) : DEFAULT_PAGE_SIZE;

  return (
    <Stack
      className="listing-pagination"
      direction={{ xs: "column", sm: "row" }}
      spacing={0.6}
      alignItems={{ xs: "flex-start", sm: "center" }}
      justifyContent="space-between"
      sx={{
        mt: "auto",
        position: "sticky",
        bottom: 0,
        zIndex: 4,
        bgcolor: "#fff",
        pt: 0.7,
        pb: 0.2,
        borderTop: "1px solid #e8eef8",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Page {page} of {totalPages} ? {total} records
      </Typography>
      <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}>
        <TextField
          size="small"
          select
          label="Page size"
          value={sizeValue}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          sx={{ width: 110 }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
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
