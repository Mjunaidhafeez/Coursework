import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { Button, Stack, TextField } from "@mui/material";

import { filterBarSx } from "./listingStyles";

const SearchToolbar = ({
  search,
  onSearchChange,
  onSearch,
  onReset,
  label = "Search",
  placeholder,
  filters = null,
  actions = null,
}) => (
  <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap" sx={filterBarSx}>
    <TextField
      size="small"
      label={label}
      placeholder={placeholder}
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSearch?.();
      }}
    />
    {filters}
    <Button size="small" variant="outlined" startIcon={<SearchRoundedIcon fontSize="small" />} onClick={onSearch}>
      Search
    </Button>
    <Button size="small" variant="text" startIcon={<RefreshRoundedIcon fontSize="small" />} onClick={onReset}>
      Reset
    </Button>
    {actions}
  </Stack>
);

export default SearchToolbar;
