import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Button, Stack, TextField } from "@mui/material";

const SearchToolbar = ({ search, onSearchChange, onSearch, onReset, label = "Search", placeholder }) => (
  <Stack direction={{ xs: "column", md: "row" }} spacing={1} sx={{ alignItems: { md: "center" } }}>
    <TextField
      size="small"
      label={label}
      placeholder={placeholder}
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      sx={{ minWidth: { xs: "100%", md: 250 } }}
    />
    <Button variant="outlined" startIcon={<SearchRoundedIcon fontSize="small" />} onClick={onSearch}>
      Search
    </Button>
    <Button variant="text" startIcon={<RefreshRoundedIcon fontSize="small" />} onClick={onReset}>
      Reset
    </Button>
  </Stack>
);

export default SearchToolbar;
