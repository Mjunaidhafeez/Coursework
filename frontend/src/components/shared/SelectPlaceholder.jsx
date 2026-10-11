import { MenuItem } from "@mui/material";

const SelectPlaceholder = ({ items = [], readyText = "Select", emptyText = "Nothing added yet" }) => (
  <MenuItem value="">{items.length ? readyText : emptyText}</MenuItem>
);

export default SelectPlaceholder;
