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
  live = false,
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
    {!live && onSearch ? <Button size="small" variant="outlined" onClick={onSearch}>Search</Button> : null}
    <Button size="small" variant="text" onClick={onReset}>Reset</Button>
    {actions}
  </Stack>
);

export default SearchToolbar;
