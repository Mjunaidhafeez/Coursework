import { ToggleButton, ToggleButtonGroup } from "@mui/material";

const CompactTabs = ({ tabs = [], value, onChange }) => {
  if (!tabs.length) return null;
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next) => {
        if (next == null) return;
        onChange(next);
      }}
      sx={{
        width: "fit-content",
        maxWidth: "100%",
        flexWrap: "wrap",
        bgcolor: "#eef4ff",
        border: "1px solid #dbeafe",
        "& .MuiToggleButton-root": {
          px: 1.15,
          py: 0.25,
          textTransform: "none",
          fontSize: "0.78rem",
          fontWeight: 700,
          lineHeight: 1.4,
          border: "none",
          color: "#35507c",
        },
        "& .Mui-selected": {
          bgcolor: "#1d4fbf !important",
          color: "#fff !important",
        },
      }}
    >
      {tabs.map((tab) => (
        <ToggleButton key={tab.value} value={tab.value}>
          {tab.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
};

export default CompactTabs;
